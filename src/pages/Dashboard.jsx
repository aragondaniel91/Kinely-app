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
  const raw = activity.created_at || activity.createdAt || activity.updated_date || "";
  if (typeof raw === "string") return raw;
  if (raw?.toDate) return raw.toDate().toISOString();
  return String(raw || "");
}

export default function Dashboard() {
  const { user, familyId, profile, dadName, momName, dadColor, momColor, perms } = useFamily();

  const [custodyDays, setCustodyDays] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [meals, setMeals] = useState([]);
  const [groceries, setGroceries] = useState([]);
  const [activity, setActivity] = useState([]);
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
        let custodyData = [];
        let taskData = [];
        let mealData = [];
        let groceryData = [];
        let activityData = [];

        if (canReadCalendar) {
          try {
            const custodyByFamily = query(
              collection(db, "custodyDays"),
              where("familyId", "==", familyId)
            );
            const snap = await getDocs(custodyByFamily);
            custodyData = snap.docs.map(normalizeDoc);
          } catch (error) {
            console.warn("Fallback custody query by family_id/userId:", error);
            try {
              const custodyByFamilyLegacy = query(
                collection(db, "custodyDays"),
                where("family_id", "==", familyId)
              );
              const snap = await getDocs(custodyByFamilyLegacy);
              custodyData = snap.docs.map(normalizeDoc);
            } catch (legacyError) {
              console.warn("Fallback custody query by userId:", legacyError);
              const custodyByUser = query(
                collection(db, "custodyDays"),
                where("userId", "==", user.uid)
              );
              const snap = await getDocs(custodyByUser);
              custodyData = snap.docs.map(normalizeDoc);
            }
          }
        }

        if (canReadTasks) {
          try {
            const taskQuery = query(
              collection(db, "tasks"),
              where("familyId", "==", familyId)
            );
            const snap = await getDocs(taskQuery);
            taskData = snap.docs.map(normalizeDoc);
          } catch (error) {
            console.warn("Fallback tasks query by family_id:", error);
            const taskQuery = query(
              collection(db, "tasks"),
              where("family_id", "==", familyId)
            );
            const snap = await getDocs(taskQuery);
            taskData = snap.docs.map(normalizeDoc);
          }
        }

        if (canReadMeals) {
          try {
            const mealQuery = query(
              collection(db, "meals"),
              where("familyId", "==", familyId)
            );
            const snap = await getDocs(mealQuery);
            mealData = snap.docs.map(normalizeDoc);
          } catch (error) {
            console.warn("Fallback meals query by family_id:", error);
            const mealQuery = query(
              collection(db, "meals"),
              where("family_id", "==", familyId)
            );
            const snap = await getDocs(mealQuery);
            mealData = snap.docs.map(normalizeDoc);
          }
        }

        if (canReadGroceries) {
          try {
            const groceryQuery = query(
              collection(db, "groceries"),
              where("familyId", "==", familyId)
            );
            const snap = await getDocs(groceryQuery);
            groceryData = snap.docs.map(normalizeDoc);
          } catch (error) {
            console.warn("Fallback groceries query by family_id:", error);
            const groceryQuery = query(
              collection(db, "groceries"),
              where("family_id", "==", familyId)
            );
            const snap = await getDocs(groceryQuery);
            groceryData = snap.docs.map(normalizeDoc);
          }
        }

        try {
          const activityQuery = query(
            collection(db, "familyActivity"),
            where("familyId", "==", familyId)
          );
          const snap = await getDocs(activityQuery);
          activityData = snap.docs.map(normalizeDoc);
        } catch (error) {
          console.warn("Fallback family activity query by family_id:", error);
          try {
            const activityQuery = query(
              collection(db, "familyActivity"),
              where("family_id", "==", familyId)
            );
            const snap = await getDocs(activityQuery);
            activityData = snap.docs.map(normalizeDoc);
          } catch (activityError) {
            console.warn("Could not load family activity:", activityError);
            activityData = [];
          }
        }

        taskData.sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""));
        mealData.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        groceryData.sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""));
        activityData.sort((a, b) => getActivitySortValue(b).localeCompare(getActivitySortValue(a)));

        setCustodyDays(custodyData);
        setTasks(taskData.filter((task) => (task.status || "pending") === "pending"));
        setMeals(mealData.filter((meal) => normalizeDate(meal.date) === today));
        setGroceries(groceryData.filter((item) => item.checked !== true));
        setActivity(activityData.slice(0, 6));
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setCustodyDays([]);
        setTasks([]);
        setMeals([]);
        setGroceries([]);
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
      ? dadName || "Papá"
      : nextChange?.with === "mom"
      ? momName || "Mamá"
      : nextChange?.with === "split"
      ? "día compartido"
      : "día compartido";

  const todayLabel = todayCustody
    ? isSplit
      ? "👨👩 Split Day"
      : isWithDad
      ? `🏠 With ${dadName || "Dad"}`
      : `💕 With ${momName || "Mom"}`
    : "No custody info";

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
      groceries={groceries}
      activity={activity}
      loading={loading}
      canReadTasks={canReadTasks}
      canReadMeals={canReadMeals}
      canReadGroceries={canReadGroceries}
      canReadCalendar={canReadCalendar}
    />
  );
}
