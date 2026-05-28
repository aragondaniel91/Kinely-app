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
  return normalizeDate(
    item?.date ||
      item?.dueDate ||
      item?.due_date ||
      item?.due ||
      item?.scheduledDate ||
      item?.scheduled_date ||
      item?.startDate ||
      item?.start_date ||
      item?.start ||
      item?.eventDate ||
      item?.event_date
  );
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

function normalizePerson(person, fallback = {}) {
  if (!person) return null;
  if (typeof person === "string") return { name: person, ...fallback };

  return {
    ...fallback,
    ...person,
    name:
      person.name ||
      person.displayName ||
      person.fullName ||
      person.firstName ||
      person.email ||
      fallback.name,
    colorId:
      person.colorId ||
      person.color_id ||
      person.color ||
      person.familyColor ||
      person.family_color ||
      fallback.colorId,
  };
}

function firstToken(value) {
  return String(value || "").trim().toLowerCase().split(/\s+/)[0] || "";
}

function isChildPerson(person = {}) {
  const type = String(person.type || person.role || person.relationship || "").toLowerCase();
  return ["child", "kid", "son", "daughter"].includes(type);
}

function personDisplayName(person = {}) {
  return (
    person.name ||
    person.displayName ||
    person.fullName ||
    person.firstName ||
    person.email ||
    ""
  );
}

function getPersonDedupeKeys(person = {}, index = 0) {
  const name = personDisplayName(person);
  const first = firstToken(name);
  const type = String(person.type || person.role || person.relationship || "").toLowerCase();

  // Children should not be merged with parents/adults just because they share a first name.
  if (isChildPerson(person)) {
    return [
      person.id,
      person.uid,
      person.email,
      `child-${person.id || person.uid || person.email || name || index}`,
    ]
      .filter(Boolean)
      .map((value) => String(value).trim().toLowerCase());
  }

  // Adults can appear as parent + member/owner. Merge Daniel with Daniel Aragon.
  return [
    person.email,
    person.uid,
    person.userId,
    person.user_id,
    person.memberId,
    person.member_id,
    person.id,
    first ? `adult-first-${first}` : "",
    type && first ? `${type}-${first}` : "",
  ]
    .filter(Boolean)
    .map((value) => String(value).trim().toLowerCase());
}

function buildPeople({ profile, user, dadName, momName, dadColor, momColor }) {
  const children = (profile?.children || profile?.childProfiles || [])
    .map((child, index) =>
      normalizePerson(child, {
        id: child?.id || child?.uid || `child-${index}`,
        type: "child",
        role: "child",
        colorId: ["blue", "rose", "green", "violet"][index % 4],
        showOnHomeDashboard: true,
      })
    )
    .filter(Boolean);

  const parents = [
    dadName
      ? {
          id: "parent-dad",
          name: dadName,
          type: "parent",
          role: "parent",
          colorId: dadColor || "blue",
          showOnHomeDashboard: true,
        }
      : null,
    momName
      ? {
          id: "parent-mom",
          name: momName,
          type: "parent",
          role: "parent",
          colorId: momColor || "amber",
          showOnHomeDashboard: true,
        }
      : null,
  ].filter(Boolean);

  const rawMembers = [
    ...(profile?.members || []),
    ...(profile?.familyMembers || []),
    ...(profile?.caregivers || []),
  ];

  const members = rawMembers
    .map((member, index) =>
      normalizePerson(member, {
        type: "member",
        colorId: ["teal", "violet", "amber"][index % 3],
      })
    )
    .filter(Boolean);

  const currentUserName = user?.displayName || profile?.displayName || user?.email || "";
  const currentUserFirst = firstToken(currentUserName);

  const currentUserAlreadyRepresented =
    Boolean(currentUserFirst) &&
    [...parents, ...members].some((person) => {
      const candidateFirst = firstToken(
        person.name || person.displayName || person.fullName || person.email
      );

      const sameFirstName = candidateFirst && candidateFirst === currentUserFirst;
      const sameEmail = user?.email && person.email === user.email;
      const sameUid = user?.uid && (person.uid === user.uid || person.id === user.uid);

      return sameFirstName || sameEmail || sameUid;
    });

  const currentUser =
    user && !currentUserAlreadyRepresented
      ? [
          normalizePerson(
            {
              id: user.uid,
              uid: user.uid,
              email: user.email,
              name: currentUserName || "Me",
              type: "owner",
              role: "owner",
              colorId: profile?.colorId || profile?.color_id || "blue",
              showOnHomeDashboard: true,
            },
            { type: "owner", colorId: "blue" }
          ),
        ]
      : [];

  // Priority matters:
  // 1. Parents first
  // 2. Children always visible
  // 3. Members/caregivers only if they are not duplicates
  // 4. Current user only if not already represented
  const ordered = [...parents, ...children, ...members, ...currentUser];
  const seen = new Set();

  return ordered.filter((person, index) => {
    const keys = getPersonDedupeKeys(person, index);

    if (!keys.length) return true;

    const duplicate = keys.some((key) => seen.has(key));

    if (duplicate) {
      return false;
    }

    keys.forEach((key) => seen.add(key));
    return true;
  });
}

function summarizeList(list) {
  const items = Array.isArray(list.items) ? list.items : [];
  const pendingItems = items.filter((item) => item && item.checked !== true && item.done !== true && item.completed !== true);

  return {
    ...list,
    title: list.title || list.name || list.label || "Family list",
    pendingCount:
      list.pendingCount ??
      list.pending_count ??
      list.openCount ??
      list.open_count ??
      (items.length ? pendingItems.length : list.itemsCount ?? list.items_count ?? list.count ?? 0),
  };
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
  const { user, familyId, profile, dadName, momName, dadColor, momColor, perms } = useFamily();

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

  const people = useMemo(() => {
    return buildPeople({ profile, user, dadName, momName, dadColor, momColor });
  }, [profile, user, dadName, momName, dadColor, momColor]);

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
          const groceries = familyLists.length ? [] : await loadFamilyCollection("groceries", familyId);

          if (familyLists.length) {
            listData = familyLists.map(summarizeList);
          } else {
            const grouped = new Map();

            groceries
              .filter((item) => item.checked !== true && item.status !== "archived")
              .forEach((item) => {
                const title = item.listTitle || item.list_title || item.category || "Grocery list";
                const key = String(title).trim().toLowerCase();

                if (!grouped.has(key)) {
                  grouped.set(key, {
                    id: `grocery-${key}`,
                    title,
                    pendingCount: 0,
                    source: "groceries",
                  });
                }

                grouped.get(key).pendingCount += 1;
              });

            listData = Array.from(grouped.values());
          }
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

        normalizedTasksToday.sort((a, b) => getItemDate(a).localeCompare(getItemDate(b)));
        normalizedOverdueTasks.sort((a, b) => getItemDate(a).localeCompare(getItemDate(b)));
        normalizedMeals.sort((a, b) => String(a.meal_type || a.mealType || "").localeCompare(String(b.meal_type || b.mealType || "")));
        normalizedLists.sort((a, b) => Number(b.pendingCount ?? 0) - Number(a.pendingCount ?? 0));
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
