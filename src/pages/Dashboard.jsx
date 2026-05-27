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

function getCustodyDayOwner(day) {
  if (!day) return null;
  return day.with_whom || day.withWhom || null;
}

function isCustodySplitDay(day) {
  return Boolean(day?.is_split || day?.isSplit);
}

function getCustodyDaySegments(day) {
  if (!day) return [];

  if (isCustodySplitDay(day)) {
    return [
      { period: "AM", owner: day.morning || null },
      { period: "PM", owner: day.afternoon || null },
    ].filter((segment) => segment.owner && segment.owner !== "none");
  }

  const owner = getCustodyDayOwner(day);
  return owner && owner !== "none" ? [{ period: "All day", owner }] : [];
}

function getEndOfDayOwner(day) {
  const segments = getCustodyDaySegments(day);
  return segments.at(-1)?.owner || null;
}

function getParentForDay(day) {
  if (!day) return null;
  if (isCustodySplitDay(day)) return "split";
  return getCustodyDayOwner(day);
}

function findNextChangeFromDays(custodyDays, todayCustody) {
  if (!todayCustody) return null;

  let currentOwner = getEndOfDayOwner(todayCustody);
  if (!currentOwner) return null;

  const today = new Date();

  for (let i = 1; i <= 45; i += 1) {
    const nextDate = addDays(today, i);
    const nextKey = format(nextDate, "yyyy-MM-dd");
    const nextDay = custodyDays.find((day) => normalizeDate(day.date) === nextKey);
    const segments = getCustodyDaySegments(nextDay);

    for (const segment of segments) {
      if (segment.owner && segment.owner !== currentOwner) {
        return {
          days: i,
          with: segment.owner,
          date: nextDate,
          period: segment.period,
        };
      }

      if (segment.owner) currentOwner = segment.owner;
    }
  }

  return null;
}

function getActivitySortValue(activity) {
  const raw = activity.created_at || activity.createdAt || activity.updated_date || activity.updatedDate || "";
  if (typeof raw === "string") return raw;
  if (raw?.toDate) return raw.toDate().toISOString();
  return String(raw || "");
}

function getEventDate(event) {
  return normalizeDate(
    event.date ||
      event.startDate ||
      event.start_date ||
      event.start ||
      event.startTime ||
      event.start_time ||
      event.eventDate ||
      event.event_date
  );
}

function isInDateRange(dateKey, startKey, endKey) {
  return dateKey && dateKey >= startKey && dateKey <= endKey;
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

  const [custodyDays, setCustodyDays] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [meals, setMeals] = useState([]);
  const [upcomingMeals, setUpcomingMeals] = useState([]);
  const [groceries, setGroceries] = useState([]);
  const [activity, setActivity] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const canReadTasks = perms?.tasks?.read !== false;
  const canReadMeals = perms?.meals?.read !== false;
  const canReadGroceries =
    perms?.groceries?.read !== false && perms?.meals?.read !== false;
  const canReadCalendar = perms?.calendar?.read !== false;

  useEffect(() => {
    const loadData = async () => {
      if (!user || !familyId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const today = todayStr();
        const nextSevenDate = addDays(new Date(), 7);
        const nextSeven = format(nextSevenDate, "yyyy-MM-dd");
        const nextThreeDate = addDays(new Date(), 2);
        const nextThree = format(nextThreeDate, "yyyy-MM-dd");

        let custodyData = [];
        let taskData = [];
        let mealData = [];
        let groceryData = [];
        let activityData = [];
        let calendarData = [];

        if (canReadCalendar) {
          custodyData = await loadFamilyCollection("custodyDays", familyId);

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
              const key = `${event.id || ""}-${event.title || event.name || ""}-${getEventDate(event)}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
        }

        if (canReadTasks) {
          taskData = await loadFamilyCollection("tasks", familyId);
        }

        if (canReadMeals) {
          mealData = await loadFamilyCollection("meals", familyId);
        }

        if (canReadGroceries) {
          const groceriesPrimary = await loadFamilyCollection("groceries", familyId);
          const groceriesLists = groceriesPrimary.length
            ? groceriesPrimary
            : await loadFamilyCollection("familyLists", familyId);

          groceryData = groceriesLists;
        }

        activityData = await loadFamilyCollection("familyActivity", familyId);

        taskData.sort((a, b) => (b.created_date || b.createdDate || "").localeCompare(a.created_date || a.createdDate || ""));
        mealData.sort((a, b) => normalizeDate(a.date).localeCompare(normalizeDate(b.date)));
        groceryData.sort((a, b) => (b.created_date || b.createdDate || "").localeCompare(a.created_date || a.createdDate || ""));
        activityData.sort((a, b) => getActivitySortValue(b).localeCompare(getActivitySortValue(a)));
        calendarData.sort((a, b) => getEventDate(a).localeCompare(getEventDate(b)));

        setCustodyDays(custodyData);
        setTasks(taskData.filter((task) => (task.status || "pending") === "pending"));
        setMeals(mealData.filter((meal) => normalizeDate(meal.date) === today));
        setUpcomingMeals(mealData.filter((meal) => isInDateRange(normalizeDate(meal.date), today, nextThree)));
        setGroceries(groceryData.filter((item) => item.checked !== true && item.status !== "archived"));
        setCalendarEvents(calendarData.filter((event) => isInDateRange(getEventDate(event), today, nextSeven)).slice(0, 20));
        setActivity(activityData.slice(0, 6));
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setCustodyDays([]);
        setTasks([]);
        setMeals([]);
        setUpcomingMeals([]);
        setGroceries([]);
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

  const todayCustody = useMemo(() => {
    return custodyDays.find((day) => normalizeDate(day.date) === todayStr());
  }, [custodyDays]);

  const todayParent = getParentForDay(todayCustody);
  const isWithDad = todayParent === "dad";
  const isSplit = todayParent === "split";

  const nextChange = findNextChangeFromDays(custodyDays, todayCustody);

  const nextChangeLabel =
    nextChange?.with === "dad"
      ? dadName || "Dad"
      : nextChange?.with === "mom"
      ? momName || "Mom"
      : nextChange?.with === "split"
      ? "split day"
      : "shared day";

  const todayLabel = todayCustody
    ? isSplit
      ? "Split day"
      : isWithDad
      ? `With ${dadName || "Dad"}`
      : `With ${momName || "Mom"}`
    : "";

  return (
    <FamilyHomeDashboard
      familyName={profile?.familyName || profile?.family_name || profile?.name || "Family"}
      todayLabel={todayLabel}
      todayParent={todayParent}
      dadName={dadName}
      momName={momName}
      dadColor={dadColor}
      momColor={momColor}
      nextChange={nextChange}
      nextChangeLabel={nextChangeLabel}
      todayCustody={todayCustody}
      children={profile?.children || profile?.childProfiles || []}
      tasks={tasks}
      meals={meals}
      upcomingMeals={upcomingMeals}
      groceries={groceries}
      activity={activity}
      calendarEvents={calendarEvents}
      loading={loading}
      canReadTasks={canReadTasks}
      canReadMeals={canReadMeals}
      canReadGroceries={canReadGroceries}
      canReadCalendar={canReadCalendar}
    />
  );
}
