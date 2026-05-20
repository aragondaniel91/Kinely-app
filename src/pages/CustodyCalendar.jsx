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
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { COLOR_MAP } from "@/components/profile/ParentColorPicker";

import CustodyDayDialog from "@/components/calendar/CustodyDayDialog";
import BulkCustodyDialog from "@/components/calendar/BulkCustodyDialog";
import DayDetailView from "@/features/custody/calendar/components/DayDetailView";
import CustodyCalendarGrid from "@/features/custody/calendar/components/CustodyCalendarGrid";
import CustodyCalendarToolbar from "@/features/custody/calendar/components/CustodyCalendarToolbar";
import CustodyBulkUndoBanner from "@/features/custody/calendar/components/CustodyBulkUndoBanner";
import CustodyCalendarSidebar from "@/features/custody/calendar/components/CustodyCalendarSidebar";
import { normalizeDate } from "@/features/custody/calendar/utils/custodyDateUtils";
import {
  normalizeCustodyDay,
  normalizeSpecialEvent,
  normalizeTravelPlan,
} from "@/features/custody/calendar/utils/custodyMappers";
import {
  buildTravelOverrideCustody,
  getCustodyParent,
  getOtherParent,
  getParentEmoji,
  getParentLabel,
} from "@/features/custody/calendar/utils/custodyCalculations";
import {
  buildBulkDayPayload,
  generateBlockStarts,
} from "@/features/custody/calendar/utils/custodyBulkUtils";

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
          const data = buildBulkDayPayload({ day, blockStart, blockEnd, payload, familyId, profile, user, bulkRunId, getOtherParent });
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

  const sortedBaseDays = [...custodyDays].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  const nextChange = sortedBaseDays.find((d) => {
    const dateKey = normalizeDate(d.date);
    if (!dateKey || dateKey <= todayKey) return false;
    const prevKey = format(addDays(parseISO(dateKey + "T12:00:00"), -1), "yyyy-MM-dd");
    const prev = allCustodyMap[prevKey];
    if (!prev) return false;
    const prevParent = prev.is_split ? prev.afternoon : prev.with_whom;
    const thisParent = d.is_split ? d.morning : d.with_whom;
    return prevParent !== thisParent;
  });

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
    <div className="flex flex-col lg:flex-row bg-[#F7F8FC]">
      <CustodyCalendarSidebar
        showFilters={showFilters}
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

      <div className="flex-1 flex flex-col min-w-0">
        <CustodyCalendarToolbar
          period={period}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
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

        <div className="p-2 lg:p-3 bg-[#F7F8FC]">
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
