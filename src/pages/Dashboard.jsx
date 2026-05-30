import React, { useEffect, useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { collection, getDocs, query, where } from "firebase/firestore";

import FamilyHomeDashboard from "@/components/home/FamilyHomeDashboard";
import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

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

async function loadFamilyCollection(collectionName, familyId) {
  try {
    const snap = await getDocs(
      query(collection(db, collectionName), where("familyId", "==", familyId))
    );
    return snap.docs.map(normalizeDoc);
  } catch (error) {
    try {
      const snap = await getDocs(
        query(collection(db, collectionName), where("family_id", "==", familyId))
      );
      return snap.docs.map(normalizeDoc);
    } catch (legacyError) {
      console.warn(`Could not load ${collectionName}:`, legacyError);
      return [];
    }
  }
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

  const canReadTasks = perms?.tasks?.read !== false;
  const canReadMeals = perms?.meals?.read !== false;
  const canReadGroceries =
    perms?.groceries?.read !== false && perms?.meals?.read !== false;
  const canReadCalendar = perms?.calendar?.read !== false;

  const people = useMemo(() => familyPeople || [], [familyPeople]);

  useEffect(() => {
    const loadData = async () => {
      if (!user || !familyId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const today = todayStr();
        const nextSeven = format(addDays(new Date(), 7), "yyyy-MM-dd");

        let taskData = [];
        let mealData = [];
        let listData = [];
        let activityData = [];
        let calendarData = [];

        if (canReadTasks) {
          taskData = await loadFamilyCollection("tasks", familyId);
        }

        if (canReadMeals) {
          mealData = await loadFamilyCollection("meals", familyId);
        }

        if (canReadGroceries) {
          const familyLists = await loadFamilyCollection("familyLists", familyId);

          const itemCollections = [
            "groceries",
            "groceryItems",
            "familyListItems",
            "listItems",
            "shoppingItems",
          ];

          const itemResults = await Promise.all(
            itemCollections.map((name) => loadFamilyCollection(name, familyId))
          );

          const allListItems = itemResults.flat();

          listData = mergeListsWithItems(familyLists, allListItems);
        }

        if (canReadCalendar) {
          const calendarCollections = [
            "familyCalendarEvents",
            "familyEvents",
            "calendarEvents",
            "events",
          ];

          const calendarResults = await Promise.all(
            calendarCollections.map((name) => loadFamilyCollection(name, familyId))
          );

          const seen = new Set();
          calendarData = calendarResults
            .flat()
            .filter((event) => {
              const date = getItemDate(event);
              const key = `${event.id || ""}-${event.title || event.name || ""}-${date}`;
              if (!date || seen.has(key)) return false;
              seen.add(key);
              return true;
            })
            .filter((event) => isInDateRange(getItemDate(event), today, nextSeven));
        }

        activityData = await loadFamilyCollection("familyActivity", familyId);

        const pendingTasks = taskData.filter((task) => {
          const status = String(task.status || "pending").toLowerCase();
          return status === "pending";
        });

        const normalizedTasksToday = pendingTasks.filter((task) => getItemDate(task) === today);
        const normalizedOverdueTasks = pendingTasks.filter((task) => {
          const date = getItemDate(task);
          return date && date < today;
        });

        const normalizedMeals = mealData.filter((meal) => getItemDate(meal) === today);

        const normalizedLists = listData
          .map(summarizeList)
          .filter((list) => list.status !== "archived");

        normalizedLists.sort((a, b) => {
          const countDiff = Number(b.pendingCount ?? 0) - Number(a.pendingCount ?? 0);
          if (countDiff !== 0) return countDiff;
          return String(a.title || a.name || "").localeCompare(String(b.title || b.name || ""));
        });
        calendarData.sort((a, b) => getItemDate(a).localeCompare(getItemDate(b)));
        activityData.sort((a, b) => getActivitySortValue(b).localeCompare(getActivitySortValue(a)));

        setTasksToday(normalizedTasksToday);
        setOverdueTasks(normalizedOverdueTasks);
        setMealsToday(normalizedMeals);
        setOpenLists(normalizedLists);
        setCalendarEvents(calendarData.slice(0, 20));
        setActivity(activityData.slice(0, 6));
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setTasksToday([]);
        setOverdueTasks([]);
        setMealsToday([]);
        setOpenLists([]);
        setCalendarEvents([]);
        setActivity([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [
    user,
    familyId,
    canReadTasks,
    canReadMeals,
    canReadGroceries,
    canReadCalendar,
  ]);

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
    />
  );
}
