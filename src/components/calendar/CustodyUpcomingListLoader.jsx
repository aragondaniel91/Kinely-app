import React, { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { COLOR_MAP } from "@/components/profile/ParentColorPicker";

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
    notes: data.notes || "",
  };
}

function formatDateLabel(value) {
  if (!value) return "Not scheduled";

  try {
    return format(parseISO(`${value}T12:00:00`), "EEE, MMM d");
  } catch {
    return value;
  }
}

function parentLabel(parent, dadName, momName) {
  if (parent === "dad") return dadName || "Dad";
  if (parent === "mom") return momName || "Mom";
  return "Not scheduled";
}

function custodyLabel(day, dadName, momName) {
  if (!day) return "Not scheduled";

  if (day.is_split) {
    return `AM: ${parentLabel(day.morning, dadName, momName)} / PM: ${parentLabel(day.afternoon, dadName, momName)}`;
  }

  return `With ${parentLabel(day.with_whom, dadName, momName)}`;
}

function custodyTheme(day, dadTheme, momTheme) {
  if (!day) return null;
  if (day.with_whom === "dad") return dadTheme;
  if (day.with_whom === "mom") return momTheme;
  return null;
}

export default function CustodyUpcomingListLoader({ limit = 6 }) {
  const { user, familyId, perms, dadName, momName, dadColor, momColor } = useFamily();
  const [custodyDays, setCustodyDays] = useState([]);
  const [loading, setLoading] = useState(true);

  const canRead = perms?.calendar?.read !== false;
  const dadTheme = COLOR_MAP[dadColor] || COLOR_MAP.blue;
  const momTheme = COLOR_MAP[momColor] || COLOR_MAP.amber;

  useEffect(() => {
    let cancelled = false;

    async function loadUpcoming() {
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
        console.error("Error loading upcoming custody days:", error);
        if (!cancelled) setCustodyDays([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUpcoming();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, familyId, canRead]);

  const upcomingDays = useMemo(() => {
    const todayKey = format(new Date(), "yyyy-MM-dd");
    return custodyDays.filter((day) => normalizeDate(day.date) >= todayKey).slice(0, limit);
  }, [custodyDays, limit]);

  return (
    <Card className="rounded-3xl border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Upcoming</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">Next custody days</h3>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <CalendarDays className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {loading && custodyDays.length === 0 &&
          [0, 1, 2].map((item) => (
            <div key={item} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
          ))}

        {!loading && upcomingDays.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm font-bold text-slate-500">
            No upcoming custody days yet. Open Schedule to add days or create a range.
          </div>
        )}

        {upcomingDays.map((day) => {
          const theme = custodyTheme(day, dadTheme, momTheme);

          return (
            <div
              key={day.id || day.date}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border px-3 py-3",
                theme ? `${theme.bg} ${theme.border}` : "border-slate-200 bg-slate-50"
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-950">{formatDateLabel(day.date)}</p>
                <p className="truncate text-xs font-bold text-slate-500">{custodyLabel(day, dadName, momName)}</p>
              </div>
              {day.notes && (
                <span className="hidden max-w-[180px] truncate rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-slate-500 md:inline">
                  {day.notes}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
