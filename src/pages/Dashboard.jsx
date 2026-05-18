import React, { useEffect, useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { collection, getDocs, query, where } from "firebase/firestore";

import FamilyHomeDashboard from "@/components/home/FamilyHomeDashboard";
import { COLOR_MAP } from "@/components/profile/ParentColorPicker";
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

export default function Dashboard() {
  const { user, familyId, profile, dadName, momName, dadColor, momColor, perms } =
    useFamily();

  const [custodyDays, setCustodyDays] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [meals, setMeals] = useState([]);
  const [groceries, setGroceries] = useState([]);
  const [loading, setLoading] = useState(true);

  const canReadTasks = perms?.tasks?.read !== false;
  const canReadMeals = perms?.meals?.read !== false;
  const canReadGroceries =
    perms?.groceries?.read !== false && perms?.meals?.read !== false;
  const canReadCalendar = perms?.calendar?.read !== false;

  const dadTheme = COLOR_MAP[dadColor] || COLOR_MAP.blue;
  const momTheme = COLOR_MAP[momColor] || COLOR_MAP.amber;

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

        taskData.sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""));
        mealData.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        groceryData.sort((a, b) => (b.created_date || "").localeCompare(a.created_date || ""));

        setCustodyDays(custodyData);
        setTasks(taskData.filter((task) => (task.status || "pending") === "pending"));
        setMeals(mealData.filter((meal) => normalizeDate(meal.date) === today));
        setGroceries(groceryData.filter((item) => item.checked !== true));
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setCustodyDays([]);
        setTasks([]);
        setMeals([]);
        setGroceries([]);
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

  const isWithDad =
    todayCustody?.with_whom === "dad" || todayCustody?.withWhom === "dad";
  const isSplit = todayCustody?.is_split || todayCustody?.isSplit;

  const getParentForDay = (day) => {
    if (!day) return null;
    if (day.is_split || day.isSplit) return "split";
    return day.with_whom || day.withWhom;
  };

  const getNextChange = () => {
    if (!todayCustody) return null;

    const currentParent = getParentForDay(todayCustody);
    const today = new Date();

    for (let i = 1; i <= 45; i += 1) {
      const nextDate = addDays(today, i);
      const nextKey = format(nextDate, "yyyy-MM-dd");
      const nextDay = custodyDays.find((day) => normalizeDate(day.date) === nextKey);
      const nextParent = getParentForDay(nextDay);

      if (!nextParent || nextParent === currentParent) continue;

      return {
        days: i,
        with: nextParent,
        date: nextDate,
      };
    }

    return null;
  };

  const nextChange = getNextChange();

  const nextChangeLabel =
    nextChange?.with === "dad"
      ? dadName || "Papá"
      : nextChange?.with === "mom"
      ? momName || "Mamá"
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
      todayLabel={todayLabel}
      nextChange={nextChange}
      nextChangeLabel={nextChangeLabel}
      todayCustody={todayCustody}
      children={profile?.children || profile?.childProfiles || []}
      tasks={tasks}
      meals={meals}
      groceries={groceries}
      loading={loading}
      canReadTasks={canReadTasks}
      canReadMeals={canReadMeals}
      canReadGroceries={canReadGroceries}
    />
  );
}
