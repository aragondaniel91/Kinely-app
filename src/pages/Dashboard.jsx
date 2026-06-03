import React, { useEffect, useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import FamilyHomeDashboard from "@/components/home/FamilyHomeDashboard";
import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { canReadModule } from "@/lib/modulePermissions";

function currentDateKey() {
  return format(new Date(), "yyyy-MM-dd");
}

function dateFromKey(dateKey) {
  return new Date(`${dateKey}T00:00:00`);
}

function normalizeDoc(docSnap) {
  return {
    id: docSnap.id,
    ...docSnap.data(),
  };
}

function normalizeDate(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);

  if (value instanceof Date) {
    return format(value, "yyyy-MM-dd");
  }

  if (value?.toDate) {
    return format(value.toDate(), "yyyy-MM-dd");
  }

  return String(value).slice(0, 10);
}

function getItemDate(item) {
  const raw =
    item?.date ||
    item?.eventDate ||
    item?.event_date ||
    item?.startDate ||
    item?.start_date ||
    item?.start ||
    item?.startTime ||
    item?.start_time ||
    item?.startsAt ||
    item?.starts_at ||
    item?.dueDate ||
    item?.due_date ||
    item?.due ||
    item?.scheduledDate ||
    item?.scheduled_date;

  if (!raw) return "";

  return normalizeDate(raw);
}

function isInDateRange(dateKey, startKey, endKey) {
  return dateKey && dateKey >= startKey && dateKey <= endKey;
}

function getActivitySortValue(activity) {
  const raw = activity.created_at || activity.createdAt || activity.updated_date || activity.updatedDate || "";
  if (typeof raw === "string") return raw;
  if (raw?.toDate) return raw.toDate().toISOString();
  return String(raw || "");
}

function getFamilyName(profile = {}) {
  return (
    profile.familyName ||
    profile.family_name ||
    profile.name ||
    profile.displayName ||
    "Family"
  );
}

function summarizeList(list) {
  const itemArrays = [
    list.items,
    list.groceryItems,
    list.grocery_items,
    list.listItems,
    list.list_items,
    list.products,
    list.entries,
  ].filter(Array.isArray);

  const flatItems = itemArrays.flat();

  const pendingItems = flatItems.filter((item) => {
    if (!item) return false;

    const status = String(item.status || "").toLowerCase();

    return (
      item.checked !== true &&
      item.done !== true &&
      item.completed !== true &&
      status !== "done" &&
      status !== "completed" &&
      status !== "archived"
    );
  });

  const explicitCount =
    list.pendingCount ??
    list.pending_count ??
    list.openCount ??
    list.open_count ??
    list.itemsCount ??
    list.items_count ??
    list.itemCount ??
    list.item_count ??
    list.count ??
    list.total ??
    list.totalItems ??
    list.total_items;

  const calculatedCount = flatItems.length ? pendingItems.length : explicitCount ?? 0;

  return {
    ...list,
    title:
      list.title ||
      list.name ||
      list.label ||
      list.listTitle ||
      list.list_title ||
      list.category ||
      "Family list",
    pendingCount: Number(calculatedCount) || 0,
  };
}

function isPendingListItem(item = {}) {
  const status = String(item.status || "").toLowerCase();

  return (
    item.checked !== true &&
    item.done !== true &&
    item.completed !== true &&
    status !== "done" &&
    status !== "completed" &&
    status !== "archived"
  );
}

function getListTitleFromItem(item = {}) {
  return (
    item.listTitle ||
    item.list_title ||
    item.listName ||
    item.list_name ||
    item.category ||
    item.group ||
    item.type ||
    "Grocery list"
  );
}

function getListKeyFromItem(item = {}) {
  return String(
    item.listId ||
      item.list_id ||
      item.familyListId ||
      item.family_list_id ||
      item.groceryListId ||
      item.grocery_list_id ||
      item.shoppingListId ||
      item.shopping_list_id ||
      getListTitleFromItem(item)
  )
    .trim()
    .toLowerCase();
}

function getListKeys(list = {}) {
  const title =
    list.title ||
    list.name ||
    list.label ||
    list.listTitle ||
    list.list_title ||
    list.category ||
    "";

  return [
    list.id,
    list.listId,
    list.list_id,
    list.familyListId,
    list.family_list_id,
    list.groceryListId,
    list.grocery_list_id,
    list.shoppingListId,
    list.shopping_list_id,
    title,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());
}

function mergeListsWithItems(familyLists = [], rawItems = []) {
  const pendingItems = rawItems.filter(isPendingListItem);
  const groupedItems = new Map();

  pendingItems.forEach((item) => {
    const key = getListKeyFromItem(item);
    const title = getListTitleFromItem(item);

    if (!groupedItems.has(key)) {
      groupedItems.set(key, {
        id: key,
        title,
        pendingCount: 0,
        source: "items",
      });
    }

    groupedItems.get(key).pendingCount += 1;
  });

  const normalizedLists = familyLists.map((list) => {
    const summary = summarizeList(list);
    const keys = getListKeys(summary);

    const matchingGroup = Array.from(groupedItems.entries()).find(([groupKey, group]) => {
      const groupTitle = String(group.title || "").trim().toLowerCase();
      return keys.includes(groupKey) || keys.includes(groupTitle);
    });

    return {
      ...summary,
      pendingCount: matchingGroup
        ? matchingGroup[1].pendingCount
        : Number(summary.pendingCount ?? 0),
    };
  });

  const existingKeys = new Set(
    normalizedLists.flatMap((list) => getListKeys(list))
  );

  groupedItems.forEach((group, key) => {
    const titleKey = String(group.title || "").trim().toLowerCase();

    if (!existingKeys.has(key) && !existingKeys.has(titleKey)) {
      normalizedLists.push(group);
    }
  });

  return normalizedLists;
}

function mergeDocsById(...groups) {
  const map = new Map();

  groups.flat().forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });

  return Array.from(map.values());
}

function subscribeFamilyCollection(collectionName, familyId, onData, onReady) {
  const collectionQuery = query(
    collection(db, collectionName),
    where("familyId", "==", familyId)
  );

  return onSnapshot(
    collectionQuery,
    (snap) => {
      onData(snap.docs.map(normalizeDoc));
      onReady?.();
    },
    (error) => {
      console.warn(`Could not listen to ${collectionName}:`, error);
      onData([]);
      onReady?.();
    }
  );
}

export default function Dashboard() {
  const { user, familyId, profile, familyPeople, perms } = useFamily();

  const [tasksToday, setTasksToday] = useState([]);
  const [overdueTasks, setOverdueTasks] = useState([]);
  const [mealsToday, setMealsToday] = useState([]);
  const [openLists, setOpenLists] = useState([]);
  const [activity, setActivity] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [todayKey, setTodayKey] = useState(currentDateKey);
  const [liveData, setLiveData] = useState({
    tasks: [],
    meals: [],
    familyLists: [],
    groceries: [],
    familyListItems: [],
    activity: [],
    calendar: [],
  });

  const canReadTasks = canReadModule(perms, "tasks");
  const canReadMeals = canReadModule(perms, "meals");
  const canReadLists = canReadModule(perms, "lists");
  const canReadCalendar = canReadModule(perms, "calendar");
  const canReadActivity = canReadModule(perms, "home");

  const people = useMemo(() => familyPeople || [], [familyPeople]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTodayKey(currentDateKey());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user || !familyId) {
      setLiveData({
        tasks: [],
        meals: [],
        familyLists: [],
        groceries: [],
        familyListItems: [],
        activity: [],
        calendar: [],
      });
      setLoading(false);
      setLastUpdated(null);
      return undefined;
    }

    const subscriptions = [];
    const pendingKeys = new Set();

    const subscribe = (key, collectionName, enabled) => {
      setLiveData((current) => ({ ...current, [key]: [] }));

      if (!enabled) return;

      pendingKeys.add(key);
      subscriptions.push(
        subscribeFamilyCollection(
          collectionName,
          familyId,
          (items) => {
            setLiveData((current) => ({ ...current, [key]: items }));
            setLastUpdated(new Date());
          },
          () => {
            pendingKeys.delete(key);
            if (!pendingKeys.size) setLoading(false);
          }
        )
      );
    };

    setLoading(true);
    setLastUpdated(null);
    subscribe("tasks", "tasks", canReadTasks);
    subscribe("meals", "meals", canReadMeals);
    subscribe("familyLists", "familyLists", canReadLists);
    subscribe("groceries", "groceries", canReadLists);
    subscribe("familyListItems", "familyListItems", canReadLists);
    subscribe("activity", "familyActivity", canReadActivity);
    subscribe("calendar", "familyEvents", canReadCalendar);

    if (!pendingKeys.size) setLoading(false);

    return () => {
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };
  }, [
    user,
    familyId,
    canReadTasks,
    canReadMeals,
    canReadLists,
    canReadCalendar,
    canReadActivity,
  ]);

  useEffect(() => {
    const today = todayKey;
    const nextSeven = format(addDays(dateFromKey(todayKey), 7), "yyyy-MM-dd");

    const pendingTasks = liveData.tasks.filter((task) => {
      const status = String(task.status || "pending").toLowerCase();
      return status === "pending";
    });

    const normalizedTasksToday = pendingTasks.filter((task) => getItemDate(task) === today);
    const normalizedOverdueTasks = pendingTasks.filter((task) => {
      const date = getItemDate(task);
      return date && date < today;
    });

    const normalizedMeals = liveData.meals.filter((meal) => getItemDate(meal) === today);

    const listData = mergeListsWithItems(
      liveData.familyLists,
      mergeDocsById(liveData.groceries, liveData.familyListItems)
    );

    const normalizedLists = listData
      .map(summarizeList)
      .filter((list) => list.status !== "archived");

    normalizedLists.sort((a, b) => {
      const countDiff = Number(b.pendingCount ?? 0) - Number(a.pendingCount ?? 0);
      if (countDiff !== 0) return countDiff;
      return String(a.title || a.name || "").localeCompare(String(b.title || b.name || ""));
    });

    const seen = new Set();
    const calendarData = liveData.calendar
      .filter((event) => {
        const date = getItemDate(event);
        const key = `${event.id || ""}-${event.title || event.name || ""}-${date}`;
        if (!date || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .filter((event) => isInDateRange(getItemDate(event), today, nextSeven))
      .sort((a, b) => getItemDate(a).localeCompare(getItemDate(b)));

    const activityData = [...liveData.activity].sort((a, b) =>
      getActivitySortValue(b).localeCompare(getActivitySortValue(a))
    );

    setTasksToday(normalizedTasksToday);
    setOverdueTasks(normalizedOverdueTasks);
    setMealsToday(normalizedMeals);
    setOpenLists(normalizedLists);
    setCalendarEvents(calendarData.slice(0, 20));
    setActivity(activityData.slice(0, 6));
  }, [liveData, todayKey]);

  return (
    <FamilyHomeDashboard
      familyName={getFamilyName(profile)}
      people={people}
      tasksToday={tasksToday}
      overdueTasks={overdueTasks}
      mealsToday={mealsToday}
      openLists={openLists}
      activity={activity}
      calendarEvents={calendarEvents}
      loading={loading}
      lastUpdated={lastUpdated}
    />
  );
}
