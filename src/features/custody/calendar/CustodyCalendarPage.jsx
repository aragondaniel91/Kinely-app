import React, { useEffect, useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  addDays,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { canReadModule, canWriteModule } from "@/lib/modulePermissions";
import { getAppColor, normalizeColorId } from "@/lib/appColorUtils";
import { getCustodyScopedDocSnaps } from "@/lib/firestoreFamilyQueries";

import CustodyDayDialog from "@/features/custody/calendar/components/CustodyDayDialog";
import BulkCustodyDialog from "@/features/custody/calendar/components/BulkCustodyDialog";
import DayDetailView from "@/features/custody/calendar/components/DayDetailView";
import CustodyCalendarGrid from "@/features/custody/calendar/components/CustodyCalendarGrid";
import CustodyCalendarToolbar from "@/features/custody/calendar/components/CustodyCalendarToolbar";
import CustodyBulkUndoBanner from "@/features/custody/calendar/components/CustodyBulkUndoBanner";
import CustodyCalendarSidebar from "@/features/custody/calendar/components/CustodyCalendarSidebar";
import AppDialog from "@/components/app/AppDialog";
import { normalizeDate } from "@/features/custody/calendar/utils/custodyDateUtils";
import {
  normalizeCustodyDay,
  normalizeSpecialEvent,
  normalizeTravelPlan,
} from "@/features/custody/calendar/utils/custodyMappers";
import {
  buildTravelOverrideCustody,
  getOtherParent,
  getParentLabel,
} from "@/features/custody/calendar/utils/custodyCalculations";
import {
  buildBulkDayPayload,
  generateBlockStarts,
} from "@/features/custody/calendar/utils/custodyBulkUtils";

function getCustodyDaySegments(day) {
  if (!day) return [];

  if (day.is_split || day.isSplit) {
    return [
      { period: "AM", owner: day.morning || null, suggestedTime: "08:00" },
      { period: "PM", owner: day.afternoon || null, suggestedTime: "12:00" },
    ].filter((segment) => segment.owner && segment.owner !== "none");
  }

  const owner = day.with_whom || day.withWhom || null;
  return owner && owner !== "none"
    ? [{ period: "All day", owner, suggestedTime: "18:00" }]
    : [];
}

function getEndOfCustodyDayOwner(day) {
  const segments = getCustodyDaySegments(day);
  return segments.at(-1)?.owner || "none";
}

function findCurrentCustodyOwner(sortedDays, todayKey) {
  let owner = "none";

  sortedDays.forEach((day) => {
    const dateKey = normalizeDate(day.date);
    if (dateKey && dateKey <= todayKey) {
      owner = getEndOfCustodyDayOwner(day) || owner;
    }
  });

  return owner;
}

function findNextCustodyChange(sortedDays, todayKey) {
  let previousOwner = findCurrentCustodyOwner(sortedDays, todayKey);

  if (!previousOwner || previousOwner === "none") {
    const todayOrFuture = sortedDays.find((day) => {
      const dateKey = normalizeDate(day.date);
      return dateKey && dateKey >= todayKey && getCustodyDaySegments(day).length;
    });

    previousOwner = getEndOfCustodyDayOwner(todayOrFuture);
  }

  if (!previousOwner || previousOwner === "none") return null;

  for (const day of sortedDays) {
    const dateKey = normalizeDate(day.date);
    if (!dateKey || dateKey <= todayKey) continue;

    const segments = getCustodyDaySegments(day);

    for (const segment of segments) {
      if (segment.owner && segment.owner !== previousOwner) {
        return {
          ...day,
          date: dateKey,
          with_whom: segment.owner,
          withWhom: segment.owner,
          changeFrom: previousOwner,
          changeTo: segment.owner,
          changePeriod: segment.period,
          changeTime: segment.suggestedTime,
        };
      }

      if (segment.owner) previousOwner = segment.owner;
    }
  }

  return null;
}

function calendarParentTheme(colorId, fallback) {
  const color = getAppColor(normalizeColorId(colorId, fallback), fallback);

  return {
    bg: color.bgStrong,
    border: color.borderStrong,
    chip: color.chip,
    dot: color.dot,
    text: color.textStrong,
  };
}

export default function CustodyCalendar({ viewMode = "month", setViewMode, showFilters = true, setShowFilters }) {
  const {
    user,
    profile,
    familyId,
    actualFamilyId,
    householdFamilyId,
    custodyGroupId,
    selectedCustodyGroup,
    perms,
    dadName,
    momName,
    dadColor,
    momColor,
  } = useFamily();
  const custodyScopeId = custodyGroupId || familyId;
  const householdScopeId = householdFamilyId || actualFamilyId || (custodyGroupId ? "" : familyId);
  const custodyScopeFields = useMemo(() => ({
    familyId: householdScopeId || custodyScopeId,
    custodyGroupId: custodyScopeId,
    householdFamilyId: householdScopeId || "",
    custodyGroupName: selectedCustodyGroup?.name || "",
    module: "custody",
    visibility: "custody",
  }), [custodyScopeId, householdScopeId, selectedCustodyGroup?.name]);

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
  const [pendingBulkConfirm, setPendingBulkConfirm] = useState(null);
  const [pendingUndoConfirm, setPendingUndoConfirm] = useState(false);
  const [noticeDialog, setNoticeDialog] = useState(null);

  const canRead = canReadModule(perms, "custody");
  const canWrite = canWriteModule(perms, "custody");

  const showNotice = ({ tone = "info", title, message }) => {
    setNoticeDialog({ tone, title, message });
  };

  const dadTheme = calendarParentTheme(dadColor, "blue");
  const momTheme = calendarParentTheme(momColor, "amber");

  const loadCustodyDays = async () => {
    if (!user || !custodyScopeId || !canRead) {
      setCustodyDays([]);
      setSpecialEvents([]);
      setTravelPlans([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const custodyDayDocs = await getCustodyScopedDocSnaps("custodyDays", custodyScopeId);
      const data = custodyDayDocs.map(normalizeCustodyDay);
      data.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      setCustodyDays(data);

      try {
        const specialEventDocs = await getCustodyScopedDocSnaps("custodySpecialEvents", custodyScopeId);
        setSpecialEvents(specialEventDocs.map(normalizeSpecialEvent));
      } catch (eventError) {
        console.warn("Could not load custody special events:", eventError);
        setSpecialEvents([]);
      }

      try {
        const travelPlanDocs = await getCustodyScopedDocSnaps("custodyTravelPlans", custodyScopeId);
        setTravelPlans(travelPlanDocs.map(normalizeTravelPlan));
      } catch (travelError) {
        console.warn("Could not load custody travel plans:", travelError);
        setTravelPlans([]);
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
  }, [user?.uid, custodyScopeId, canRead]);

  const saveCustodyDay = async (payload) => {
    if (!user || !custodyScopeId || !canWrite) return;
    setIsSaving(true);

    try {
      const dateKey = normalizeDate(payload.date);
      const docId = `${custodyScopeId}_${dateKey}`;
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
        ...custodyScopeFields,
        familyName: profile?.family_name || profile?.familyName || "",
        userId: user.uid,
        createdBy: user.uid,
        createdByEmail: user.email || null,
        updatedBy: user.uid,
        updatedByEmail: user.email || null,
        updatedAt: serverTimestamp(),
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
      showNotice({
        tone: "danger",
        title: "Could not save custody day",
        message: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveBulkCustodyDays = async (payload, confirmed = false) => {
    if (!user || !custodyScopeId || !canWrite) return;

    const baseStart = parseISO(`${payload.startDate}T12:00:00`);
    const baseEnd = parseISO(`${payload.endDate}T12:00:00`);

    if (Number.isNaN(baseStart.getTime()) || Number.isNaN(baseEnd.getTime())) {
      showNotice({
        tone: "warning",
        title: "Invalid date range",
        message: "Please review the start and end dates.",
      });
      return;
    }

    if (baseEnd < baseStart) {
      showNotice({
        tone: "warning",
        title: "Invalid date range",
        message: "The end date cannot be earlier than the start date.",
      });
      return;
    }

    const rangeLength = differenceInCalendarDays(baseEnd, baseStart);
    const blockStarts = generateBlockStarts(payload);

    if (!blockStarts.length) {
      showNotice({
        tone: "warning",
        title: "No schedule generated",
        message: "No schedule occurrences were generated. Please review the selected pattern and dates.",
      });
      return;
    }

    const estimatedTotalDays = payload.generatedDayMap ? Object.keys(payload.generatedDayMap).length : blockStarts.length * (rangeLength + 1);

    if (!confirmed) {
      setPendingBulkConfirm({ payload, estimatedTotalDays });
      return;
    }

    setPendingBulkConfirm(null);
    setIsSaving(true);

    try {
      const bulkRunId = `bulk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const generatedEntries = [];
      const undoMap = new Map();

      for (const blockStart of blockStarts) {
        const blockEnd = addDays(blockStart, rangeLength);
        const blockDays = eachDayOfInterval({ start: blockStart, end: blockEnd });

        for (const day of blockDays) {
          const data = buildBulkDayPayload({
            day,
            blockStart,
            blockEnd,
            payload,
            familyId: custodyScopeFields.familyId,
            custodyScopeId,
            custodyScopeFields,
            profile,
            user,
            bulkRunId,
            getOtherParent,
          });
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
      showNotice({
        tone: "danger",
        title: "Could not save custody range",
        message: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const undoLastBulkCreation = async (confirmed = false) => {
    if (!lastBulkUndo || isSaving) return;

    if (!confirmed) {
      setPendingUndoConfirm(true);
      return;
    }

    setPendingUndoConfirm(false);
    setIsSaving(true);

    try {
      for (const entry of lastBulkUndo.entries) {
        const ref = doc(db, "custodyDays", entry.id);

        if (entry.before) {
          await setDoc(ref, {
            ...entry.before,
            restoredFromBulkRunId: lastBulkUndo.bulkRunId,
            updatedAt: serverTimestamp(),
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
      showNotice({
        tone: "danger",
        title: "Could not undo bulk schedule",
        message: error.message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCustodyDay = async (date) => {
    if (!user || !custodyScopeId || !date || !canWrite) return;
    setIsSaving(true);

    try {
      const dateKey = normalizeDate(date);
      const newDocId = `${custodyScopeId}_${dateKey}`;

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
      showNotice({
        tone: "danger",
        title: "Could not delete custody day",
        message: error.message,
      });
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

  const finalCustodyMap = useMemo(() => {
    const map = { ...allCustodyMap };

    Object.keys(travelPlansByDate).forEach((dateKey) => {
      const finalCustody = buildTravelOverrideCustody({
        dateKey,
        baseCustody: allCustodyMap[dateKey],
        travelPlansForDay: travelPlansByDate[dateKey],
      });

      if (finalCustody) map[dateKey] = finalCustody;
    });

    return map;
  }, [allCustodyMap, travelPlansByDate]);

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

  const visibleCustodyDays = Object.values(finalCustodyMap).filter((d) => {
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
  const todayCustody = finalCustodyMap[todayKey];
  const todayParent = todayCustody?.is_split ? null : todayCustody?.with_whom;
  const todayLabel = todayCustody?.is_split
    ? `AM: ${getParentLabel(todayCustody.morning, dadName, momName)} / PM: ${getParentLabel(todayCustody.afternoon, dadName, momName)}`
    : todayParent
    ? todayParent === "dad"
      ? (dadName || "PAPÁ").toUpperCase()
      : (momName || "MAMÁ").toUpperCase()
    : null;

  const sortedFinalDays = Object.values(finalCustodyMap).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const nextChange = findNextCustodyChange(sortedFinalDays, todayKey);

  const upcoming = Object.values(finalCustodyMap)
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .filter((d) => normalizeDate(d.date) >= todayKey)
    .slice(0, 4);

  const dadDays = filteredVisibleCustodyDays.reduce((acc, d) => {
    if (!d.is_split) return acc + (d.with_whom === "dad" ? 1 : 0);
    return acc + (d.morning === "dad" ? 0.5 : 0) + (d.afternoon === "dad" ? 0.5 : 0);
  }, 0);

  const momDays = filteredVisibleCustodyDays.reduce((acc, d) => {
    if (!d.is_split) return acc + (d.with_whom === "mom" ? 1 : 0);
    return acc + (d.morning === "mom" ? 0.5 : 0) + (d.afternoon === "mom" ? 0.5 : 0);
  }, 0);

  const custodyFilterOptions = [
    { id: "all", label: "All", icon: "All" },
    { id: "dad", label: dadName || "Dad", icon: "D" },
    { id: "mom", label: momName || "Mom", icon: "M" },
    { id: "split", label: "Split", icon: "S" },
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
      <CustodyCalendarSidebar
        showFilters={true}
        custodyFilterOptions={custodyFilterOptions}
        custodyFilter={custodyFilter}
        setCustodyFilter={setCustodyFilter}
        filteredVisibleCustodyDays={filteredVisibleCustodyDays}
        visibleCustodyDays={visibleCustodyDays}
        loading={loading}
        todayCustody={todayCustody}
        todayParent={todayParent}
        todayLabel={todayLabel}
        dadTheme={dadTheme}
        momTheme={momTheme}
        dadName={dadName}
        momName={momName}
        nextChange={nextChange}
        dadDays={dadDays}
        momDays={momDays}
        upcoming={upcoming}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <CustodyCalendarToolbar
          period={period}
          viewMode={viewMode}
          setViewMode={setViewMode}
          canWrite={canWrite}
          goPrevious={goPrevious}
          goNext={goNext}
          setAnchorDate={setAnchorDate}
          setShowBulkDialog={setShowBulkDialog}
          setShowSync={setShowSync}
        />

        <CustodyBulkUndoBanner
          lastBulkUndo={lastBulkUndo}
          isSaving={isSaving}
          undoLastBulkCreation={undoLastBulkCreation}
        />

        <div className="flex-1 overflow-auto p-2 lg:p-3 bg-[#F7F8FC]">
          {viewMode === "day" && (
            <DayDetailView day={anchorDate} custody={finalCustodyMap[format(anchorDate, "yyyy-MM-dd")]} canWrite={canWrite} onEdit={(day) => setSelectedDate(day)} dadTheme={dadTheme} momTheme={momTheme} dadName={dadName} momName={momName} />
          )}

          {(viewMode === "week" || viewMode === "month") && (
            <CustodyCalendarGrid
              viewMode={viewMode}
              period={period}
              weekLabels={weekLabels}
              anchorDate={anchorDate}
              visibleCustodyMap={visibleCustodyMap}
              visibleCustodyDays={visibleCustodyDays}
              specialEventsByDate={specialEventsByDate}
              travelPlansByDate={travelPlansByDate}
              canWrite={canWrite}
              setSelectedDate={setSelectedDate}
              dadTheme={dadTheme}
              momTheme={momTheme}
              dadName={dadName}
              momName={momName}
            />
          )}
        </div>
      </div>

      <AppDialog
        open={Boolean(noticeDialog)}
        tone={noticeDialog?.tone}
        title={noticeDialog?.title}
        message={noticeDialog?.message}
        confirmLabel="Got it"
        onConfirm={() => setNoticeDialog(null)}
        onCancel={() => setNoticeDialog(null)}
      />

      <AlertDialog
        open={Boolean(pendingBulkConfirm)}
        onOpenChange={(open) => {
          if (!open && !isSaving) setPendingBulkConfirm(null);
        }}
      >
        <AlertDialogContent className="rounded-[2rem] border-slate-200 bg-white p-6 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight text-slate-950">
              Create custody schedule?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-semibold leading-6 text-slate-500">
              This will create approximately {pendingBulkConfirm?.estimatedTotalDays || 0} custody day(s).
              Existing custody information for those dates may be overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel disabled={isSaving} className="rounded-2xl font-black">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving}
              onClick={(event) => {
                event.preventDefault();
                if (pendingBulkConfirm?.payload) {
                  saveBulkCustodyDays(pendingBulkConfirm.payload, true);
                }
              }}
              className="rounded-2xl bg-blue-600 font-black text-white hover:bg-blue-700"
            >
              {isSaving ? "Creating..." : "Create schedule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={pendingUndoConfirm}
        onOpenChange={(open) => {
          if (!open && !isSaving) setPendingUndoConfirm(false);
        }}
      >
        <AlertDialogContent className="rounded-[2rem] border-slate-200 bg-white p-6 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight text-slate-950">
              Undo bulk schedule?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-semibold leading-6 text-slate-500">
              This will restore {lastBulkUndo?.entries?.length || 0} affected day(s) to their previous state.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel disabled={isSaving} className="rounded-2xl font-black">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isSaving}
              onClick={(event) => {
                event.preventDefault();
                undoLastBulkCreation(true);
              }}
              className="rounded-2xl bg-blue-600 font-black text-white hover:bg-blue-700"
            >
              {isSaving ? "Restoring..." : "Undo bulk"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
