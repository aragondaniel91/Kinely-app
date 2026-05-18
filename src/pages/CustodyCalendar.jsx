import React, { useEffect, useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isToday,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  addYears,
  isSameMonth,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";

import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CalendarDays,
  Heart,
  Plus,
  CalendarRange,
  RotateCcw,
} from "lucide-react";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { COLOR_MAP } from "@/components/profile/ParentColorPicker";

import CustodyDayDialog from "@/components/calendar/CustodyDayDialog";
import BulkCustodyDialog from "@/components/calendar/BulkCustodyDialog";
import CalendarViewControls from "@/components/calendar/CalendarViewControls";
import { getCustodyEventCategory } from "@/components/calendar/CustodySpecialEventDialog";

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

function normalizeSpecialEvent(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    ...data,
    date: normalizeDate(data.date),
    title: data.title || "Special event",
    category: data.category || "other",
    startTime: data.startTime || data.start_time || "",
    endTime: data.endTime || data.end_time || "",
    location: data.location || "",
    notes: data.notes || "",
  };
}

function normalizeTravelPlan(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    ...data,
    title: data.title || "Travel / vacation",
    destination: data.destination || "",
    startDate: normalizeDate(data.startDate || data.start_date),
    endDate: normalizeDate(data.endDate || data.end_date),
    travelingParent: data.travelingParent || data.traveling_parent || "dad",
    notes: data.notes || "",
  };
}

function getParentLabel(parent, dadName, momName) {
  if (parent === "dad") return dadName || "Papá";
  if (parent === "mom") return momName || "Mamá";
  return "Compartido";
}

function getParentEmoji(parent) {
  if (parent === "dad") return "👨";
  if (parent === "mom") return "👩";
  return "👨👩";
}

function getCustodyParent(custody) {
  if (!custody) return null;
  if (custody.is_split) return "split";
  return custody.with_whom;
}

function getOtherParent(parent) {
  return parent === "dad" ? "mom" : "dad";
}

function advanceDateByUnit(date, every, unit) {
  if (unit === "day") return addDays(date, every);
  if (unit === "week") return addWeeks(date, every);
  if (unit === "month") return addMonths(date, every);
  if (unit === "year") return addYears(date, every);

  return addWeeks(date, every);
}

function generateBlockStarts(payload) {
  const baseStart = parseISO(`${payload.startDate}T12:00:00`);
  const safeEvery = Math.max(1, Number(payload.repeatEvery) || 1);

  if (!payload.repeatEnabled) return [baseStart];

  const starts = [baseStart];
  const maxByOccurrences = payload.endMode === "after" ? Math.max(1, Number(payload.occurrences) || 1) : 9999;

  if (starts.length >= maxByOccurrences) return starts;

  const untilDate =
    payload.endMode === "onDate" && payload.untilDate
      ? parseISO(`${payload.untilDate}T12:00:00`)
      : payload.endMode === "never"
      ? addMonths(baseStart, 12)
      : null;

  if (untilDate && baseStart > untilDate) return [];

  if (payload.repeatUnit === "week" && payload.repeatWeekdays?.length) {
    const cycleStartBase = startOfWeek(baseStart, { weekStartsOn: 0 });
    const selectedWeekdays = [...new Set(payload.repeatWeekdays)].sort((a, b) => a - b);
    let cycleIndex = safeEvery;

    while (starts.length < maxByOccurrences && cycleIndex < 500) {
      const cycleBase = addWeeks(cycleStartBase, cycleIndex);

      for (const weekday of selectedWeekdays) {
        const candidate = addDays(cycleBase, weekday);
        if (candidate <= baseStart) continue;
        if (untilDate && candidate > untilDate) return starts;

        starts.push(candidate);
        if (payload.endMode === "after" && starts.length >= maxByOccurrences) return starts;
      }

      cycleIndex += safeEvery;
    }

    return starts;
  }

  let current = advanceDateByUnit(baseStart, safeEvery, payload.repeatUnit);

  while (starts.length < maxByOccurrences && starts.length < 500) {
    if (untilDate && current > untilDate) break;
    starts.push(current);
    current = advanceDateByUnit(current, safeEvery, payload.repeatUnit);
  }

  return starts;
}

function buildBulkDayPayload({ day, blockStart, blockEnd, payload, familyId, profile, user, bulkRunId }) {
  const dateKey = format(day, "yyyy-MM-dd");
  const blockStartKey = format(blockStart, "yyyy-MM-dd");
  const blockEndKey = format(blockEnd, "yyyy-MM-dd");
  const generatedDay = payload.generatedDayMap?.[dateKey] || null;

  let isSplit = false;
  let withWhom = generatedDay?.parent || payload.fullDaysParent;
  let morning = null;
  let afternoon = null;

  const singleDayRange = blockStartKey === blockEndKey;

  if (generatedDay?.isSplit) {
    isSplit = true;
    withWhom = null;
    morning = generatedDay.morning || null;
    afternoon = generatedDay.afternoon || null;
  } else if (singleDayRange && (payload.splitFirstDay || payload.splitLastDay)) {
    isSplit = true;
    withWhom = null;

    if (payload.splitFirstDay && payload.splitLastDay) {
      morning = payload.firstDayMorning;
      afternoon = payload.lastDayAfternoon;
    } else if (payload.splitFirstDay) {
      morning = payload.firstDayMorning;
      afternoon = getOtherParent(payload.firstDayMorning);
    } else if (payload.splitLastDay) {
      morning = getOtherParent(payload.lastDayAfternoon);
      afternoon = payload.lastDayAfternoon;
    }
  } else if (dateKey === blockStartKey && payload.splitFirstDay) {
    isSplit = true;
    withWhom = null;
    morning = payload.firstDayMorning;
    afternoon = getOtherParent(payload.firstDayMorning);
  } else if (dateKey === blockEndKey && payload.splitLastDay) {
    isSplit = true;
    withWhom = null;
    morning = getOtherParent(payload.lastDayAfternoon);
    afternoon = payload.lastDayAfternoon;
  }

  return {
    id: `${familyId}_${dateKey}`,
    date: dateKey,
    is_split: isSplit,
    isSplit,
    with_whom: isSplit ? null : withWhom,
    withWhom: isSplit ? null : withWhom,
    morning: isSplit ? morning : null,
    afternoon: isSplit ? afternoon : null,
    notes: payload.notes || "",
    familyId,
    family_id: familyId,
    familyName: profile?.family_name || profile?.familyName || "",
    userId: user.uid,
    createdBy: user.uid,
    createdByEmail: user.email || null,
    bulkRunId,
    bulk_run_id: bulkRunId,
    bulkTemplateId: payload.templateId || "custom",
    bulk_template_id: payload.templateId || "custom",
    smartPatternId: payload.smartPatternId || null,
    smart_pattern_id: payload.smartPatternId || null,
    updatedAt: serverTimestamp(),
    updated_date: new Date().toISOString(),
  };
}

function CustodyDayCard({ day, custody, canWrite, onClick, dadTheme, momTheme, dadName, momName, specialEvents = [], travelPlans = [], compact = false, inMonth = true }) {
  const today = isToday(day);
  const parent = getCustodyParent(custody);
  const splitDay = parent === "split";
  const visibleTravelPlans = travelPlans.slice(0, compact ? 1 : 2);
  const hiddenTravelCount = Math.max(0, travelPlans.length - visibleTravelPlans.length);
  const visibleEvents = specialEvents.slice(0, compact ? 2 : 3);
  const hiddenEventCount = Math.max(0, specialEvents.length - visibleEvents.length);

  const getTheme = (value) => {
    if (value === "dad") return dadTheme;
    if (value === "mom") return momTheme;
    return null;
  };

  const singleTheme = getTheme(parent);
  const morningTheme = getTheme(custody?.morning) || dadTheme;
  const afternoonTheme = getTheme(custody?.afternoon) || momTheme;

  return (
    <button
      type="button"
      disabled={!canWrite}
      onClick={onClick}
      className={cn(
        "relative rounded-xl border transition-all text-left overflow-hidden",
        compact ? "min-h-[72px] p-1.5" : "min-h-[112px] p-2",
        canWrite ? "hover:ring-2 hover:ring-primary/40 active:scale-95" : "cursor-not-allowed opacity-80",
        today && "ring-2 ring-primary ring-offset-1",
        !custody && "bg-card border-border hover:bg-muted/40",
        parent === "dad" && dadTheme.border,
        parent === "mom" && momTheme.border,
        splitDay && "border-border",
        !inMonth && "opacity-40"
      )}
    >
      {!splitDay && singleTheme && <div className={cn("absolute inset-0", singleTheme.bg)} />}

      {splitDay && (
        <>
          <div className={`absolute inset-x-0 top-0 bottom-1/2 ${morningTheme.bg}`} />
          <div className={`absolute inset-x-0 top-1/2 bottom-0 ${afternoonTheme.bg}`} />
        </>
      )}

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between gap-1">
          <span
            className={cn(
              "font-bold flex items-center justify-center rounded-full leading-none",
              compact ? "text-[10px] w-5 h-5" : "text-xs w-7 h-7",
              today ? "bg-primary text-primary-foreground" : "text-foreground bg-background/70"
            )}
          >
            {format(day, "d")}
          </span>

          {!compact && canWrite && (
            <span className="w-6 h-6 rounded-full bg-white/70 flex items-center justify-center text-muted-foreground">
              <Plus className="w-3.5 h-3.5" />
            </span>
          )}
        </div>

        {parent === "dad" && (
          <div className={cn("rounded-lg px-1.5 py-0.5 font-bold flex items-center gap-1 mt-2", compact ? "text-[9px]" : "text-xs", dadTheme.chip)}>
            <span>👨</span>
            <span className="truncate">{compact ? dadName || "Papá" : `Con ${dadName || "Papá"}`}</span>
          </div>
        )}

        {parent === "mom" && (
          <div className={cn("rounded-lg px-1.5 py-0.5 font-bold flex items-center gap-1 mt-2", compact ? "text-[9px]" : "text-xs", momTheme.chip)}>
            <span>👩</span>
            <span className="truncate">{compact ? momName || "Mamá" : `Con ${momName || "Mamá"}`}</span>
          </div>
        )}

        {splitDay && (
          <div className="space-y-1 mt-2">
            <div className={cn("rounded px-1 py-0.5 font-bold", compact ? "text-[8px]" : "text-[10px]", morningTheme.chip)}>
              AM {getParentEmoji(custody.morning)} {!compact && getParentLabel(custody.morning, dadName, momName)}
            </div>
            <div className={cn("rounded px-1 py-0.5 font-bold", compact ? "text-[8px]" : "text-[10px]", afternoonTheme.chip)}>
              PM {getParentEmoji(custody.afternoon)} {!compact && getParentLabel(custody.afternoon, dadName, momName)}
            </div>
          </div>
        )}

        {(visibleTravelPlans.length > 0 || visibleEvents.length > 0) && (
          <div className="mt-1.5 space-y-1">
            {visibleTravelPlans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50/90 px-1.5 py-0.5 font-bold text-blue-800 shadow-sm",
                  compact ? "text-[8px]" : "text-[10px]"
                )}
              >
                <span>✈️</span>
                <span className="truncate">{plan.destination || plan.title}</span>
              </div>
            ))}

            {hiddenTravelCount > 0 && (
              <div className={cn("rounded-lg border border-blue-100 bg-blue-50/90 px-1.5 py-0.5 font-bold text-blue-700 shadow-sm", compact ? "text-[8px]" : "text-[10px]")}>+{hiddenTravelCount} travel</div>
            )}

            {visibleEvents.map((event) => {
              const category = getCustodyEventCategory(event.category);

              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex items-center gap-1 rounded-lg border border-white/70 bg-white/75 px-1.5 py-0.5 font-bold shadow-sm",
                    compact ? "text-[8px]" : "text-[10px]"
                  )}
                >
                  <span>{category.icon}</span>
                  <span className="truncate">{event.startTime ? `${event.startTime} ` : ""}{event.title}</span>
                </div>
              );
            })}

            {hiddenEventCount > 0 && (
              <div className={cn("rounded-lg border border-white/70 bg-white/75 px-1.5 py-0.5 font-bold text-muted-foreground shadow-sm", compact ? "text-[8px]" : "text-[10px]")}>+{hiddenEventCount} more</div>
            )}
          </div>
        )}

        {custody?.notes && !compact && <p className="text-[10px] text-muted-foreground mt-auto truncate bg-background/70 rounded px-1">{custody.notes}</p>}
        {!custody && !compact && !visibleEvents.length && !visibleTravelPlans.length && <p className="text-[10px] text-muted-foreground mt-auto">No custody info</p>}
      </div>
    </button>
  );
}

function DayDetailView({ day, custody, canWrite, onEdit, dadTheme, momTheme, dadName, momName }) {
  const parent = getCustodyParent(custody);
  const label = custody?.is_split
    ? `AM: ${getParentLabel(custody.morning, dadName, momName)} / PM: ${getParentLabel(custody.afternoon, dadName, momName)}`
    : parent === "dad"
    ? `Con ${dadName || "Papá"}`
    : parent === "mom"
    ? `Con ${momName || "Mamá"}`
    : "No custody info";

  const theme = parent === "dad" ? dadTheme : parent === "mom" ? momTheme : null;

  return (
    <div className="p-3 md:p-4 max-w-3xl mx-auto w-full">
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Custody Day</p>
            <h2 className="text-2xl font-bold font-heading">{format(day, "EEEE, MMMM d")}</h2>
          </div>

          {canWrite && (
            <Button onClick={() => onEdit(day)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Edit Day
            </Button>
          )}
        </div>
      </Card>

      <Card className={cn("p-5 border-2", theme ? `${theme.bg} ${theme.border}` : "bg-white border-border")}>
        <div className="flex items-start gap-4">
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", theme ? theme.bg : "bg-muted")}>
            <span className="text-3xl">{parent === "dad" ? "👨" : parent === "mom" ? "👩" : parent === "split" ? "👨👩" : "📅"}</span>
          </div>

          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className={cn("text-2xl font-black", theme ? theme.text : "text-foreground")}>{label}</p>
            {custody?.notes && <p className="text-sm text-muted-foreground mt-3">{custody.notes}</p>}
            {!custody && <p className="text-sm text-muted-foreground mt-3">Click edit to add custody information for this day.</p>}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function CustodyCalendar({ viewMode = "month", setViewMode, showFilters = true, setShowFilters }) {
  const { user, profile, familyId, perms, dadName, momName, dadColor, momColor } = useFamily();

  const [anchorDate, setAnchorDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [showSync, setShowSync] = useState(false);
  const [custodyFilter, setCustodyFilter] = useState("all");
  const [custodyDays, setCustodyDays] = useState([]);
  const [specialEvents, setSpecialEvents] = useState([]);
  const [travelPlans, setTravelPlans] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastBulkUndo, setLastBulkUndo] = useState(null);

  const canRead = perms?.calendar?.read !== false;
  const canWrite = perms?.calendar?.write !== false;

  const dadTheme = COLOR_MAP[dadColor] || COLOR_MAP.blue;
  const momTheme = COLOR_MAP[momColor] || COLOR_MAP.amber;

  const loadCustodyDays = async () => {
    if (!user || !familyId || !canRead) {
      setCustodyDays([]);
      setSpecialEvents([]);
      setTravelPlans([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let data = [];

      try {
        const q = query(collection(db, "custodyDays"), where("familyId", "==", familyId));
        const snap = await getDocs(q);
        data = snap.docs.map(normalizeCustodyDay);
      } catch (error) {
        console.warn("Fallback custody query by family_id:", error);

        try {
          const q = query(collection(db, "custodyDays"), where("family_id", "==", familyId));
          const snap = await getDocs(q);
          data = snap.docs.map(normalizeCustodyDay);
        } catch (legacyError) {
          console.warn("Fallback custody query by userId:", legacyError);
          const q = query(collection(db, "custodyDays"), where("userId", "==", user.uid));
          const snap = await getDocs(q);
          data = snap.docs.map(normalizeCustodyDay);
        }
      }

      data.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      setCustodyDays(data);

      try {
        const q = query(collection(db, "custodySpecialEvents"), where("familyId", "==", familyId));
        const snap = await getDocs(q);
        setSpecialEvents(snap.docs.map(normalizeSpecialEvent));
      } catch (eventError) {
        console.warn("Fallback special events query by family_id:", eventError);
        try {
          const q = query(collection(db, "custodySpecialEvents"), where("family_id", "==", familyId));
          const snap = await getDocs(q);
          setSpecialEvents(snap.docs.map(normalizeSpecialEvent));
        } catch (legacyEventError) {
          console.warn("Could not load custody special events:", legacyEventError);
          setSpecialEvents([]);
        }
      }

      try {
        const q = query(collection(db, "custodyTravelPlans"), where("familyId", "==", familyId));
        const snap = await getDocs(q);
        setTravelPlans(snap.docs.map(normalizeTravelPlan));
      } catch (travelError) {
        console.warn("Fallback travel plans query by family_id:", travelError);
        try {
          const q = query(collection(db, "custodyTravelPlans"), where("family_id", "==", familyId));
          const snap = await getDocs(q);
          setTravelPlans(snap.docs.map(normalizeTravelPlan));
        } catch (legacyTravelError) {
          console.warn("Could not load custody travel plans:", legacyTravelError);
          setTravelPlans([]);
        }
      }
    } catch (error) {
      console.error("Error loading custody days:", error);
      setCustodyDays([]);
      setSpecialEvents([]);
      setTravelPlans([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustodyDays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, familyId, canRead]);

  const saveCustodyDay = async (payload) => {
    if (!user || !familyId || !canWrite) return;
    setIsSaving(true);

    try {
      const dateKey = normalizeDate(payload.date);
      const docId = `${familyId}_${dateKey}`;
      const data = {
        id: docId,
        date: dateKey,
        is_split: payload.is_split || false,
        isSplit: payload.is_split || false,
        with_whom: payload.is_split ? null : payload.with_whom,
        withWhom: payload.is_split ? null : payload.with_whom,
        morning: payload.is_split ? payload.morning : null,
        afternoon: payload.is_split ? payload.afternoon : null,
        notes: payload.notes || "",
        familyId,
        family_id: familyId,
        familyName: profile?.family_name || profile?.familyName || "",
        userId: user.uid,
        createdBy: user.uid,
        createdByEmail: user.email || null,
        updatedAt: serverTimestamp(),
        updated_date: new Date().toISOString(),
      };

      await setDoc(doc(db, "custodyDays", docId), data, { merge: true });

      setCustodyDays((prev) => {
        const existing = prev.find((d) => normalizeDate(d.date) === dateKey);
        if (existing) return prev.map((d) => (normalizeDate(d.date) === dateKey ? { ...d, ...data } : d));
        return [...prev, data].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      });

      setSelectedDate(null);
      setLastBulkUndo(null);
    } catch (error) {
      console.error("Error saving custody day:", error);
      alert(`There was an error saving the custody day: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const saveBulkCustodyDays = async (payload) => {
    if (!user || !familyId || !canWrite) return;

    const baseStart = parseISO(`${payload.startDate}T12:00:00`);
    const baseEnd = parseISO(`${payload.endDate}T12:00:00`);

    if (Number.isNaN(baseStart.getTime()) || Number.isNaN(baseEnd.getTime())) {
      alert("Invalid date range.");
      return;
    }

    if (baseEnd < baseStart) {
      alert("La fecha final no puede ser menor que la inicial.");
      return;
    }

    const rangeLength = differenceInCalendarDays(baseEnd, baseStart);
    const blockStarts = generateBlockStarts(payload);

    if (!blockStarts.length) {
      alert("No se generaron ocurrencias.");
      return;
    }

    const estimatedTotalDays = payload.generatedDayMap ? Object.keys(payload.generatedDayMap).length : blockStarts.length * (rangeLength + 1);
    const confirmCreate = window.confirm(
      `Se crearán aproximadamente ${estimatedTotalDays} día(s). Esto sobrescribirá custodia en esas fechas. ¿Deseas continuar?`
    );

    if (!confirmCreate) return;

    setIsSaving(true);

    try {
      const bulkRunId = `bulk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const generatedEntries = [];
      const undoMap = new Map();

      for (const blockStart of blockStarts) {
        const blockEnd = addDays(blockStart, rangeLength);
        const blockDays = eachDayOfInterval({ start: blockStart, end: blockEnd });

        for (const day of blockDays) {
          const data = buildBulkDayPayload({ day, blockStart, blockEnd, payload, familyId, profile, user, bulkRunId });
          const ref = doc(db, "custodyDays", data.id);

          if (!undoMap.has(data.id)) {
            const beforeSnap = await getDoc(ref);
            undoMap.set(data.id, {
              id: data.id,
              date: data.date,
              before: beforeSnap.exists() ? { id: beforeSnap.id, ...beforeSnap.data(), date: normalizeDate(beforeSnap.data().date) } : null,
            });
          }

          await setDoc(ref, data, { merge: true });
          generatedEntries.push(data);
        }
      }

      setCustodyDays((prev) => {
        const map = new Map();
        prev.forEach((item) => map.set(normalizeDate(item.date), item));
        generatedEntries.forEach((item) => map.set(normalizeDate(item.date), item));
        return Array.from(map.values()).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      });

      setLastBulkUndo({
        bulkRunId,
        entries: Array.from(undoMap.values()),
        createdCount: generatedEntries.length,
        blockCount: blockStarts.length,
        createdAt: new Date().toISOString(),
      });

      setShowBulkDialog(false);
    } catch (error) {
      console.error("Error saving bulk custody days:", error);
      alert(`There was an error saving the custody range: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const undoLastBulkCreation = async () => {
    if (!lastBulkUndo || isSaving) return;

    const confirmed = window.confirm(
      `Undo the latest bulk schedule? This will restore ${lastBulkUndo.entries.length} affected day(s) to their previous state.`
    );

    if (!confirmed) return;

    setIsSaving(true);

    try {
      for (const entry of lastBulkUndo.entries) {
        const ref = doc(db, "custodyDays", entry.id);

        if (entry.before) {
          await setDoc(ref, {
            ...entry.before,
            restoredFromBulkRunId: lastBulkUndo.bulkRunId,
            restored_from_bulk_run_id: lastBulkUndo.bulkRunId,
            updatedAt: serverTimestamp(),
            updated_date: new Date().toISOString(),
          });
        } else {
          await deleteDoc(ref);
        }
      }

      setCustodyDays((prev) => {
        const map = new Map();
        prev.forEach((item) => map.set(normalizeDate(item.date), item));

        lastBulkUndo.entries.forEach((entry) => {
          if (entry.before) {
            map.set(normalizeDate(entry.before.date || entry.date), entry.before);
          } else {
            map.delete(entry.date);
          }
        });

        return Array.from(map.values()).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      });

      setLastBulkUndo(null);
    } catch (error) {
      console.error("Error undoing bulk custody creation:", error);
      alert(`Could not undo the latest bulk schedule: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCustodyDay = async (date) => {
    if (!user || !familyId || !date || !canWrite) return;
    setIsSaving(true);

    try {
      const dateKey = normalizeDate(date);
      const newDocId = `${familyId}_${dateKey}`;

      await deleteDoc(doc(db, "custodyDays", newDocId));

      try {
        const oldDocId = `${user.uid}_${dateKey}`;
        await deleteDoc(doc(db, "custodyDays", oldDocId));
      } catch (legacyError) {
        console.warn("Could not delete legacy custody doc:", legacyError);
      }

      setCustodyDays((prev) => prev.filter((d) => normalizeDate(d.date) !== dateKey));
      setSelectedDate(null);
      setLastBulkUndo(null);
    } catch (error) {
      console.error("Error deleting custody day:", error);
      alert(`There was an error deleting the custody day: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const allCustodyMap = useMemo(() => {
    const map = {};
    custodyDays.forEach((d) => {
      const key = normalizeDate(d.date);
      if (key) map[key] = d;
    });
    return map;
  }, [custodyDays]);

  const specialEventsByDate = useMemo(() => {
    const map = {};
    specialEvents.forEach((event) => {
      const key = normalizeDate(event.date);
      if (!key) return;
      if (!map[key]) map[key] = [];
      map[key].push(event);
    });

    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => `${a.startTime || "99:99"}${a.title}`.localeCompare(`${b.startTime || "99:99"}${b.title}`));
    });

    return map;
  }, [specialEvents]);

  const travelPlansByDate = useMemo(() => {
    const map = {};

    travelPlans.forEach((plan) => {
      if (!plan.startDate || !plan.endDate) return;

      const start = parseISO(`${plan.startDate}T12:00:00`);
      const end = parseISO(`${plan.endDate}T12:00:00`);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return;

      eachDayOfInterval({ start, end }).forEach((day) => {
        const key = format(day, "yyyy-MM-dd");
        if (!map[key]) map[key] = [];
        map[key].push(plan);
      });
    });

    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => `${a.startDate || "9999-99-99"}${a.title}`.localeCompare(`${b.startDate || "9999-99-99"}${b.title}`));
    });

    return map;
  }, [travelPlans]);

  const period = useMemo(() => {
    if (viewMode === "day") {
      const key = format(anchorDate, "yyyy-MM-dd");
      return { start: anchorDate, end: anchorDate, title: format(anchorDate, "MMM d, yyyy"), days: [anchorDate], startKey: key, endKey: key };
    }

    if (viewMode === "week") {
      const start = startOfWeek(anchorDate, { weekStartsOn: 0 });
      const end = endOfWeek(anchorDate, { weekStartsOn: 0 });
      const days = eachDayOfInterval({ start, end });
      return { start, end, title: `${format(start, "MMM d")} – ${format(end, "MMM d")}`, days, startKey: format(start, "yyyy-MM-dd"), endKey: format(end, "yyyy-MM-dd") };
    }

    const monthStart = startOfMonth(anchorDate);
    const monthEnd = endOfMonth(anchorDate);
    const start = startOfWeek(monthStart, { weekStartsOn: 0 });
    const end = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start, end });
    return { start, end, title: format(anchorDate, "MMMM yyyy"), days, startKey: format(start, "yyyy-MM-dd"), endKey: format(end, "yyyy-MM-dd") };
  }, [anchorDate, viewMode]);

  const custodyMatchesFilter = (custody) => {
    if (custodyFilter === "all") return true;
    if (!custody) return false;
    if (custodyFilter === "dad") return custody.is_split ? custody.morning === "dad" || custody.afternoon === "dad" : custody.with_whom === "dad";
    if (custodyFilter === "mom") return custody.is_split ? custody.morning === "mom" || custody.afternoon === "mom" : custody.with_whom === "mom";
    if (custodyFilter === "split") return custody.is_split;
    return true;
  };

  const visibleCustodyDays = custodyDays.filter((d) => {
    const dateKey = normalizeDate(d.date);
    return dateKey >= period.startKey && dateKey <= period.endKey;
  });

  const filteredVisibleCustodyDays = visibleCustodyDays.filter(custodyMatchesFilter);
  const visibleCustodyMap = {};
  filteredVisibleCustodyDays.forEach((d) => {
    const key = normalizeDate(d.date);
    if (key) visibleCustodyMap[key] = d;
  });

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayCustody = allCustodyMap[todayKey];
  const todayParent = todayCustody?.is_split ? null : todayCustody?.with_whom;
  const todayLabel = todayCustody?.is_split
    ? `AM: ${getParentLabel(todayCustody.morning, dadName, momName)} / PM: ${getParentLabel(todayCustody.afternoon, dadName, momName)}`
    : todayParent
    ? todayParent === "dad"
      ? (dadName || "PAPÁ").toUpperCase()
      : (momName || "MAMÁ").toUpperCase()
    : null;

  const sortedDays = [...custodyDays].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const nextChange = sortedDays.find((d) => {
    const dateKey = normalizeDate(d.date);
    if (!dateKey || dateKey <= todayKey) return false;
    const prevKey = format(addDays(parseISO(dateKey + "T12:00:00"), -1), "yyyy-MM-dd");
    const prev = allCustodyMap[prevKey];
    if (!prev) return false;
    const prevParent = prev.is_split ? prev.afternoon : prev.with_whom;
    const thisParent = d.is_split ? d.morning : d.with_whom;
    return prevParent !== thisParent;
  });

  const upcoming = sortedDays.filter((d) => normalizeDate(d.date) >= todayKey).slice(0, 4);

  const dadDays = filteredVisibleCustodyDays.reduce((acc, d) => {
    if (!d.is_split) return acc + (d.with_whom === "dad" ? 1 : 0);
    return acc + (d.morning === "dad" ? 0.5 : 0) + (d.afternoon === "dad" ? 0.5 : 0);
  }, 0);

  const momDays = filteredVisibleCustodyDays.reduce((acc, d) => {
    if (!d.is_split) return acc + (d.with_whom === "mom" ? 1 : 0);
    return acc + (d.morning === "mom" ? 0.5 : 0) + (d.afternoon === "mom" ? 0.5 : 0);
  }, 0);

  const custodyFilterOptions = [
    { id: "all", label: "All", icon: "👨‍👩‍👧‍👦" },
    { id: "dad", label: dadName || "Dad", icon: "👨" },
    { id: "mom", label: momName || "Mom", icon: "👩" },
    { id: "split", label: "Split", icon: "👨👩" },
  ];

  const weekLabels = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
  const selectedDateKey = selectedDate instanceof Date && !Number.isNaN(selectedDate.getTime()) ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedExistingData = selectedDateKey ? custodyDays.find((d) => normalizeDate(d.date) === selectedDateKey) : null;

  const goPrevious = () => {
    if (viewMode === "day") return setAnchorDate(addDays(anchorDate, -1));
    if (viewMode === "week") return setAnchorDate(addDays(anchorDate, -7));
    setAnchorDate(subMonths(anchorDate, 1));
  };

  const goNext = () => {
    if (viewMode === "day") return setAnchorDate(addDays(anchorDate, 1));
    if (viewMode === "week") return setAnchorDate(addDays(anchorDate, 7));
    setAnchorDate(addMonths(anchorDate, 1));
  };

  if (!canRead) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold font-heading mb-2">Calendario de Custodia</h1>
        <p className="text-muted-foreground">No tienes acceso al calendario de esta familia.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-screen bg-[#F7F8FC]">
      <aside className="w-full lg:w-56 shrink-0 bg-card border-b lg:border-b-0 lg:border-r border-border p-3 lg:p-4 flex flex-col gap-3 lg:gap-4 overflow-visible lg:overflow-y-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold font-heading text-sm leading-tight">Plan de Familia</p>
            <p className="text-xs text-muted-foreground">Custody Calendar</p>
          </div>
        </div>

        {showFilters && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">FILTERS</p>
            <div className="flex flex-wrap lg:flex-col gap-1.5">
              {custodyFilterOptions.map((option) => {
                const active = custodyFilter === option.id;
                return (
                  <button key={option.id} type="button" onClick={() => setCustodyFilter(option.id)} className={cn("rounded-full lg:rounded-xl border px-3 py-1.5 text-xs font-bold text-left transition", active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:text-foreground")}>
                    <span className="mr-1">{option.icon}</span>
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Showing {filteredVisibleCustodyDays.length} of {visibleCustodyDays.length} custody day(s)</p>
          </div>
        )}

        {loading && <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-xl p-2">Loading calendar...</div>}

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">HOY</p>
          <p className="font-bold text-base font-heading">{format(new Date(), "EEEE, d 'de' MMMM")}</p>

          {todayCustody && (
            <div className={cn("mt-2 rounded-xl p-3 flex items-center gap-2 border", todayParent === "dad" ? `${dadTheme.bg} ${dadTheme.border}` : `${momTheme.bg} ${momTheme.border}`)}>
              <span className="text-2xl">{todayParent === "dad" ? "👨" : todayParent === "mom" ? "👩" : "👨👩"}</span>
              <div>
                <p className="text-xs text-muted-foreground">Está con</p>
                <p className={cn("font-black text-sm", todayParent === "dad" ? dadTheme.text : momTheme.text)}>{todayLabel}</p>
              </div>
              <Heart className={cn("w-4 h-4 ml-auto", todayParent === "dad" ? dadTheme.text : `${momTheme.text} fill-current`)} />
            </div>
          )}

          {!todayCustody && <p className="text-xs text-muted-foreground mt-2">No hay información de custodia para hoy.</p>}
        </div>

        {nextChange && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">PRÓXIMO CAMBIO</p>
            <div className="bg-muted/40 border border-border rounded-xl p-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{format(parseISO(normalizeDate(nextChange.date) + "T12:00:00"), "d")}</span>
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">{format(parseISO(normalizeDate(nextChange.date) + "T12:00:00"), "EEE, d MMM")}</p>
                  <p className="text-xs text-muted-foreground">en {differenceInCalendarDays(parseISO(normalizeDate(nextChange.date) + "T12:00:00"), new Date())} días</p>
                </div>
              </div>
              <p className={cn("text-xs font-bold mt-1.5", nextChange.with_whom === "dad" ? dadTheme.text : momTheme.text)}>
                Con {nextChange.with_whom === "dad" ? `${dadName || "Papá"} 👨` : `${momName || "Mamá"} 👩`}
              </p>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">RESUMEN DEL PERÍODO</p>
          <div className="grid grid-cols-2 gap-2">
            <div className={`${dadTheme.bg} ${dadTheme.border} border rounded-xl p-2 text-center`}>
              <p className={`text-xs ${dadTheme.text}`}>{dadName || "Papá"}</p>
              <p className={`text-lg font-black ${dadTheme.text}`}>{dadDays}</p>
            </div>
            <div className={`${momTheme.bg} ${momTheme.border} border rounded-xl p-2 text-center`}>
              <p className={`text-xs ${momTheme.text}`}>{momName || "Mamá"}</p>
              <p className={`text-lg font-black ${momTheme.text}`}>{momDays}</p>
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">LEYENDA</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded ${dadTheme.dot} shrink-0`} /><span className="text-xs">Con {dadName || "Papá"}</span></div>
            <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded ${momTheme.dot} shrink-0`} /><span className="text-xs">Con {momName || "Mamá"}</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded overflow-hidden shrink-0 flex flex-col"><div className={`flex-1 ${dadTheme.dot}`} /><div className={`flex-1 ${momTheme.dot}`} /></div><span className="text-xs">Día compartido</span></div>
          </div>
        </div>

        {upcoming.length > 0 && (
          <div className="hidden lg:block">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">PRÓXIMOS DÍAS</p>
            <div className="space-y-1.5">
              {upcoming.map((d) => (
                <div key={d.id || d.date} className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", d.with_whom === "dad" ? dadTheme.dot : momTheme.dot)} />
                  <div>
                    <p className="text-xs font-semibold leading-tight">{format(parseISO(normalizeDate(d.date) + "T12:00:00"), "EEE, d MMM")}</p>
                    <p className={cn("text-xs", d.with_whom === "dad" ? dadTheme.text : momTheme.text)}>
                      {d.is_split ? `AM:${getParentLabel(d.morning, dadName, momName)} PM:${getParentLabel(d.afternoon, dadName, momName)}` : `Con ${getParentLabel(d.with_whom, dadName, momName)}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-card border-b border-border px-3 lg:px-4 py-3 flex items-center gap-2 lg:gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goPrevious}><ChevronLeft className="w-4 h-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goNext}><ChevronRight className="w-4 h-4" /></Button>

          <div className="flex items-center gap-2 ml-1 min-w-0">
            <CalendarDays className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <h2 className="text-base sm:text-xl font-bold font-heading truncate">{period.title}</h2>
          </div>

          <div className="ml-auto flex gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => setAnchorDate(new Date())}>Hoy</Button>
            <CalendarViewControls viewMode={viewMode} setViewMode={setViewMode} showFilters={showFilters} setShowFilters={setShowFilters} />
            {canWrite && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowBulkDialog(true)}>
                <CalendarRange className="w-3.5 h-3.5" />
                Range
              </Button>
            )}
            <Button variant="outline" size="sm" className="gap-1.5 hidden sm:flex" disabled title="Google Calendar sync will be enabled in a later step" onClick={() => setShowSync(true)}>
              <RefreshCw className="w-3.5 h-3.5" />
              Sync Google
            </Button>
          </div>
        </div>

        {lastBulkUndo && (
          <div className="border-b border-blue-100 bg-blue-50/80 px-3 py-2 lg:px-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-black text-blue-900">Bulk schedule created</p>
                <p className="text-xs font-semibold text-blue-700">
                  {lastBulkUndo.createdCount} day update(s) across {lastBulkUndo.blockCount} block(s). You can undo this latest bulk action.
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" disabled={isSaving} onClick={undoLastBulkCreation} className="w-fit gap-1.5 border-blue-200 bg-white text-blue-700 hover:bg-blue-100">
                <RotateCcw className="h-3.5 w-3.5" />
                Undo bulk
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-2 lg:p-3 bg-[#F7F8FC]">
          {viewMode === "day" && (
            <DayDetailView day={anchorDate} custody={allCustodyMap[format(anchorDate, "yyyy-MM-dd")]} canWrite={canWrite} onEdit={(day) => setSelectedDate(day)} dadTheme={dadTheme} momTheme={momTheme} dadName={dadName} momName={momName} />
          )}

          {(viewMode === "week" || viewMode === "month") && (
            <>
              <div className="grid grid-cols-7 gap-1 mb-1">
                {weekLabels.map((d) => (
                  <div key={d} className="text-center text-[10px] sm:text-xs font-bold text-gray-400 py-1 uppercase tracking-wider">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {period.days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const custody = visibleCustodyMap[key];
                  const originalCustody = visibleCustodyDays.find((item) => normalizeDate(item.date) === key);
                  const filteredOut = originalCustody && !custody;
                  const inMonth = viewMode === "month" ? isSameMonth(day, anchorDate) : true;

                  return (
                    <CustodyDayCard key={key} day={day} custody={custody} specialEvents={specialEventsByDate[key] || []} travelPlans={travelPlansByDate[key] || []} canWrite={canWrite} onClick={() => canWrite && setSelectedDate(day)} dadTheme={dadTheme} momTheme={momTheme} dadName={dadName} momName={momName} compact={viewMode === "month"} inMonth={inMonth && !filteredOut} />
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {showBulkDialog && (
        <BulkCustodyDialog defaultDate={anchorDate} onClose={() => setShowBulkDialog(false)} onSave={saveBulkCustodyDays} isSaving={isSaving} dadLabel={dadName || "Dad"} momLabel={momName || "Mom"} />
      )}

      {selectedDate instanceof Date && !Number.isNaN(selectedDate.getTime()) && (
        <CustodyDayDialog date={selectedDate} existingData={selectedExistingData} onSave={saveCustodyDay} onDelete={deleteCustodyDay} onClose={() => { setSelectedDate(null); loadCustodyDays(); }} isSaving={isSaving} />
      )}

      {showSync && null}
    </div>
  );
}
