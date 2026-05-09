import React, { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { COLOR_MAP } from "@/components/profile/ParentColorPicker";
import CustodyStatusSummary from "@/components/calendar/CustodyStatusSummary";

function normalizeDate(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);

  if (value?.toDate) {
    return format(value.toDate(), "yyyy-MM-dd");
  }

  return String(value).slice(0, 10);
}

function normalizeCustodyDay(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    ...data,
    date: normalizeDate(data.date),
    is_split: data.is_split || data.isSplit || false,
    with_whom: data.with_whom || data.withWhom || null,
    morning: data.morning || null,
    afternoon: data.afternoon || null,
  };
}

function getParentLabel(parent, dadName, momName) {
  if (parent === "dad") return dadName || "Dad";
  if (parent === "mom") return momName || "Mom";
  return "Split day";
}

function summarizeToday(todayCustody, dadName, momName) {
  if (!todayCustody) return null;

  if (todayCustody.is_split) {
    return `AM: ${getParentLabel(todayCustody.morning, dadName, momName)} / PM: ${getParentLabel(
      todayCustody.afternoon,
      dadName,
      momName
    )}`;
  }

  return getParentLabel(todayCustody.with_whom, dadName, momName);
}

function countParentDays(days, parent) {
  return days.reduce((total, day) => {
    if (!day.is_split) return total + (day.with_whom === parent ? 1 : 0);
    return total + (day.morning === parent ? 0.5 : 0) + (day.afternoon === parent ? 0.5 : 0);
  }, 0);
}

export default function CustodyStatusSummaryLoader() {
  const { user, familyId, dadName, momName, dadColor, momColor, perms } = useFamily();
  const [custodyDays, setCustodyDays] = useState([]);
  const [loading, setLoading] = useState(true);

  const canRead = perms?.calendar?.read !== false;
  const dadTheme = COLOR_MAP[dadColor] || COLOR_MAP.blue;
  const momTheme = COLOR_MAP[momColor] || COLOR_MAP.amber;

  useEffect(() => {
    let cancelled = false;

    async function loadCustodyDays() {
      if (!user || !familyId || !canRead) {
        setCustodyDays([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const q = query(collection(db, "custodyDays"), where("familyId", "==", familyId));
        const snap = await getDocs(q);
        const data = snap.docs.map(normalizeCustodyDay).sort((a, b) => (a.date || "").localeCompare(b.date || ""));

        if (!cancelled) setCustodyDays(data);
      } catch (error) {
        console.error("Error loading custody summary:", error);
        if (!cancelled) setCustodyDays([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadCustodyDays();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, familyId, canRead]);

  const summary = useMemo(() => {
    const todayKey = format(new Date(), "yyyy-MM-dd");
    const monthKey = format(new Date(), "yyyy-MM");
    const allCustodyMap = {};

    custodyDays.forEach((day) => {
      const key = normalizeDate(day.date);
      if (key) allCustodyMap[key] = day;
    });

    const todayCustody = allCustodyMap[todayKey];
    const sortedDays = [...custodyDays].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

    const nextChange = sortedDays.find((day) => {
      const dateKey = normalizeDate(day.date);
      if (!dateKey || dateKey <= todayKey) return false;

      const prevKey = format(addDays(parseISO(`${dateKey}T12:00:00`), -1), "yyyy-MM-dd");
      const previousDay = allCustodyMap[prevKey];
      if (!previousDay) return false;

      const previousParent = previousDay.is_split ? previousDay.afternoon : previousDay.with_whom;
      const nextParent = day.is_split ? day.morning : day.with_whom;

      return previousParent !== nextParent;
    });

    const currentMonthDays = sortedDays.filter((day) => normalizeDate(day.date).startsWith(monthKey));

    return {
      todayLabel: summarizeToday(todayCustody, dadName, momName),
      nextChange,
      dadDays: countParentDays(currentMonthDays, "dad"),
      momDays: countParentDays(currentMonthDays, "mom"),
    };
  }, [custodyDays, dadName, momName]);

  if (loading && custodyDays.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-3xl border border-slate-200 bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <CustodyStatusSummary
      todayLabel={summary.todayLabel}
      nextChange={summary.nextChange}
      dadDays={summary.dadDays}
      momDays={summary.momDays}
      dadName={dadName || "Dad"}
      momName={momName || "Mom"}
      dadTheme={dadTheme}
      momTheme={momTheme}
    />
  );
}
