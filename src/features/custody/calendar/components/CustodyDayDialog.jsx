import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarDays, Pencil, Plane, Plus, Trash2, X } from "lucide-react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import CustodySpecialEventDialog, {
  getCustodyEventCategory,
} from "@/features/custody/calendar/components/CustodySpecialEventDialog";
import CustodyTravelPlanDialog from "@/features/custody/calendar/components/CustodyTravelPlanDialog";

function normalizeDate(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return format(value, "yyyy-MM-dd");
  }

  if (value?.toDate) {
    return format(value.toDate(), "yyyy-MM-dd");
  }

  return String(value).slice(0, 10);
}

function normalizeSpecialEvent(docSnap) {
  const data = docSnap.data();
  return {
    ...data,
    id: docSnap.id,
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
    ...data,
    id: docSnap.id,
    title: data.title || "Travel / vacation",
    destination: data.destination || "",
    startDate: normalizeDate(data.startDate || data.start_date),
    endDate: normalizeDate(data.endDate || data.end_date),
    travelingParent: data.travelingParent || data.traveling_parent || "dad",
    travelStatus: data.travelStatus || data.travel_status || data.status || "approved",
    affectsCustody: data.affectsCustody ?? data.affects_custody ?? true,
    notes: data.notes || "",
  };
}

function sortSpecialEvents(events) {
  return [...events].sort((a, b) =>
    `${a.startTime || "99:99"}${a.title}`.localeCompare(`${b.startTime || "99:99"}${b.title}`)
  );
}

function sortTravelPlans(plans) {
  return [...plans].sort((a, b) =>
    `${a.startDate || "9999-99-99"}${a.title}`.localeCompare(`${b.startDate || "9999-99-99"}${b.title}`)
  );
}

function getBulkRunId(data = {}) {
  return data.bulkRunId || data.bulk_run_id || "";
}

function getFamilyId(data = {}) {
  return data.familyId || data.family_id || "";
}

function parentLabel(parent, dadLabel, momLabel) {
  return parent === "dad" ? dadLabel : momLabel;
}

function parentEmoji(parent) {
  return parent === "dad" ? "👨" : "👩";
}

function travelPlanAffectsCustody(plan) {
  if (!plan) return false;
  if (plan.affectsCustody === false || plan.affects_custody === false) return false;

  const status = plan.travelStatus || plan.travel_status || plan.status || "approved";
  return status !== "rejected" && status !== "cancelled";
}

function activityLabel(profile, user) {
  return profile?.displayName || profile?.name || profile?.firstName || user?.displayName || user?.email || "Someone";
}

function cleanAuditValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (value?.toDate) return value.toDate().toISOString();
  return value;
}

function stableAuditValue(value) {
  return JSON.stringify(value ?? "");
}

function getChangedFields(before = {}, after = {}) {
  if (!before && !after) return [];

  const keys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  return Array.from(keys).filter((key) => stableAuditValue(before?.[key]) !== stableAuditValue(after?.[key]));
}

function buildAuditMetadata({ action, entityLabel, before = null, after = null, extra = {} }) {
  const changedFields = getChangedFields(before || {}, after || {});

  return {
    ...extra,
    action,
    entityLabel,
    entity_label: entityLabel,
    before,
    after,
    changedFields,
    changed_fields: changedFields,
  };
}

function buildCustodyAuditSnapshot(data = {}, { dadLabel = "Dad", momLabel = "Mom" } = {}) {
  const isSplit = Boolean(data.is_split || data.isSplit);
  const withWhom = cleanAuditValue(data.with_whom || data.withWhom || "");
  const morning = cleanAuditValue(data.morning || "");
  const afternoon = cleanAuditValue(data.afternoon || "");
  const notes = cleanAuditValue(data.notes || "");
  const date = normalizeDate(data.date);

  return {
    date,
    type: isSplit ? "split" : "single",
    with: isSplit ? "" : withWhom,
    withLabel: isSplit || !withWhom ? "" : parentLabel(withWhom, dadLabel, momLabel),
    morning,
    morningLabel: isSplit && morning ? parentLabel(morning, dadLabel, momLabel) : "",
    afternoon,
    afternoonLabel: isSplit && afternoon ? parentLabel(afternoon, dadLabel, momLabel) : "",
    notes,
  };
}

function buildSpecialEventAuditSnapshot(event = {}) {
  return {
    title: cleanAuditValue(event.title || "Special event"),
    date: normalizeDate(event.date),
    category: cleanAuditValue(event.category || "other"),
    startTime: cleanAuditValue(event.startTime || event.start_time || ""),
    endTime: cleanAuditValue(event.endTime || event.end_time || ""),
    location: cleanAuditValue(event.location || ""),
    notes: cleanAuditValue(event.notes || ""),
  };
}

function buildTravelAuditSnapshot(plan = {}) {
  const affectsCustody = plan.affectsCustody ?? plan.affects_custody ?? true;

  return {
    title: cleanAuditValue(plan.title || "Travel / vacation"),
    destination: cleanAuditValue(plan.destination || ""),
    startDate: normalizeDate(plan.startDate || plan.start_date),
    endDate: normalizeDate(plan.endDate || plan.end_date),
    travelingParent: cleanAuditValue(plan.travelingParent || plan.traveling_parent || ""),
    travelStatus: cleanAuditValue(plan.travelStatus || plan.travel_status || plan.status || "approved"),
    affectsCustody: Boolean(affectsCustody),
    notes: cleanAuditValue(plan.notes || ""),
  };
}

async function logFamilyActivity({ familyId, user, profile, type, title, description = "", entityType = "", entityId = "", date = "", metadata = {} }) {
  if (!familyId || !user || !type || !title) return;

  try {
    const activityId = `${familyId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await setDoc(doc(db, "familyActivity", activityId), {
      id: activityId,
      familyId,
      family_id: familyId,
      module: "custody",
      module_name: "custody",
      visibility: "parents",
      scope: "audit",
      type,
      title,
      description,
      entityType,
      entity_type: entityType,
      entityId,
      entity_id: entityId,
      date,
      metadata,
      actorId: user.uid,
      actor_id: user.uid,
      actorEmail: user.email || null,
      actor_email: user.email || null,
      actorName: activityLabel(profile, user),
      actor_name: activityLabel(profile, user),
      createdAt: serverTimestamp(),
      created_at: new Date().toISOString(),
      readBy: [],
      read_by: [],
    });
  } catch (error) {
    console.warn("Could not log family activity:", error);
  }
}

function SectionCard({ eyebrow, title, description, action, children, className = "" }) {
  return (
    <div className={`rounded-2xl border bg-white/85 p-3 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {eyebrow && (
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <p className="text-sm font-black text-slate-900">{title}</p>
          {description && <p className="text-xs font-semibold text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export default function CustodyDayDialog({
  date,
  existingData = null,
  onSave,
  onDelete,
  onClose,
  isSaving = false,
  dadLabel = "Dad",
  momLabel = "Mom",
}) {
  const { user, profile, familyId: activeFamilyId } = useFamily();

  const [isSplit, setIsSplit] = useState(
    existingData?.is_split || existingData?.isSplit || false
  );

  const [withWhom, setWithWhom] = useState(
    existingData?.with_whom || existingData?.withWhom || "dad"
  );

  const [morning, setMorning] = useState(existingData?.morning || "dad");
  const [afternoon, setAfternoon] = useState(existingData?.afternoon || "mom");
  const [notes, setNotes] = useState(existingData?.notes || "");
  const [showDeleteChoice, setShowDeleteChoice] = useState(false);
  const [deletingSeries, setDeletingSeries] = useState(false);

  const [specialEvents, setSpecialEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showSpecialEventDialog, setShowSpecialEventDialog] = useState(false);
  const [selectedSpecialEvent, setSelectedSpecialEvent] = useState(null);
  const [savingSpecialEvent, setSavingSpecialEvent] = useState(false);

  const [travelPlans, setTravelPlans] = useState([]);
  const [loadingTravelPlans, setLoadingTravelPlans] = useState(false);
  const [showTravelDialog, setShowTravelDialog] = useState(false);
  const [selectedTravelPlan, setSelectedTravelPlan] = useState(null);
  const [savingTravelPlan, setSavingTravelPlan] = useState(false);

  const dateKey = normalizeDate(date);
  const bulkRunId = getBulkRunId(existingData || {});
  const familyId = getFamilyId(existingData || {}) || activeFamilyId;
  const isBulkDay = Boolean(bulkRunId && familyId);
  const formattedDate = date instanceof Date && !Number.isNaN(date.getTime())
    ? format(date, "EEEE, MMMM d, yyyy")
    : dateKey;
  const custodySummary = isSplit
    ? `AM: ${parentLabel(morning, dadLabel, momLabel)} · PM: ${parentLabel(afternoon, dadLabel, momLabel)}`
    : `With ${parentLabel(withWhom, dadLabel, momLabel)}`;
  const travelOverridePlan = travelPlans.find(travelPlanAffectsCustody);
  const hasTravelOverride = Boolean(travelOverridePlan?.travelingParent);
  const travelOverrideParent = travelOverridePlan?.travelingParent || null;
  const travelOverrideLabel = travelOverrideParent
    ? parentLabel(travelOverrideParent, dadLabel, momLabel)
    : "";
  const baseCustodyLabel = isSplit
    ? custodySummary
    : parentLabel(withWhom, dadLabel, momLabel);
  const travelOverrideChangedParent = Boolean(
    hasTravelOverride && !isSplit && travelOverrideParent !== withWhom
  );

  const loadSpecialEvents = async () => {
    if (!familyId || !dateKey) {
      setSpecialEvents([]);
      return;
    }

    setLoadingEvents(true);

    try {
      let docs = [];

      try {
        const q = query(
          collection(db, "custodySpecialEvents"),
          where("familyId", "==", familyId),
          where("date", "==", dateKey)
        );
        const snap = await getDocs(q);
        docs = snap.docs.map(normalizeSpecialEvent);
      } catch (error) {
        console.warn("Fallback special events query by family_id:", error);

        const q = query(
          collection(db, "custodySpecialEvents"),
          where("family_id", "==", familyId),
          where("date", "==", dateKey)
        );
        const snap = await getDocs(q);
        docs = snap.docs.map(normalizeSpecialEvent);
      }

      setSpecialEvents(sortSpecialEvents(docs));
    } catch (error) {
      console.error("Error loading custody special events:", error);
      setSpecialEvents([]);
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadTravelPlans = async () => {
    if (!familyId || !dateKey) {
      setTravelPlans([]);
      return;
    }

    setLoadingTravelPlans(true);

    try {
      let docs = [];

      try {
        const q = query(collection(db, "custodyTravelPlans"), where("familyId", "==", familyId));
        const snap = await getDocs(q);
        docs = snap.docs.map(normalizeTravelPlan);
      } catch (error) {
        console.warn("Fallback travel plans query by family_id:", error);

        const q = query(collection(db, "custodyTravelPlans"), where("family_id", "==", familyId));
        const snap = await getDocs(q);
        docs = snap.docs.map(normalizeTravelPlan);
      }

      const plansForDay = docs.filter((plan) => plan.startDate <= dateKey && plan.endDate >= dateKey);
      setTravelPlans(sortTravelPlans(plansForDay));
    } catch (error) {
      console.error("Error loading custody travel plans:", error);
      setTravelPlans([]);
    } finally {
      setLoadingTravelPlans(false);
    }
  };

  useEffect(() => {
    loadSpecialEvents();
    loadTravelPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, dateKey]);

  const handleSave = async () => {
    const payload = {
      date: dateKey,
      is_split: isSplit,
      with_whom: isSplit ? null : withWhom,
      morning: isSplit ? morning : null,
      afternoon: isSplit ? afternoon : null,
      notes: notes.trim(),
    };

    const before = existingData ? buildCustodyAuditSnapshot(existingData, { dadLabel, momLabel }) : null;
    const after = buildCustodyAuditSnapshot(payload, { dadLabel, momLabel });

    await onSave(payload);
    await logFamilyActivity({
      familyId,
      user,
      profile,
      type: existingData ? "custody_day_updated" : "custody_day_created",
      title: existingData ? "Custody day updated" : "Custody day created",
      description: `${formattedDate} · ${isSplit ? custodySummary : parentLabel(withWhom, dadLabel, momLabel)}`,
      entityType: "custodyDay",
      entityId: `${familyId}_${dateKey}`,
      date: dateKey,
      metadata: buildAuditMetadata({
        action: existingData ? "updated" : "created",
        entityLabel: formattedDate,
        before,
        after,
        extra: payload,
      }),
    });
  };

  const saveSpecialEvent = async (payload) => {
    if (!user || !familyId || !dateKey) {
      alert("Could not save this event because the family context is missing. Please refresh and try again.");
      return;
    }

    setSavingSpecialEvent(true);

    try {
      const editing = Boolean(payload.id);
      const eventId = payload.id || `${familyId}_${payload.date}_${Date.now()}`;
      const { id: _ignoredPayloadId, ...safePayload } = payload;
      const data = {
        ...safePayload,
        id: eventId,
        date: normalizeDate(payload.date),
        familyId,
        family_id: familyId,
        familyName: profile?.family_name || profile?.familyName || "",
        userId: user.uid,
        createdBy: selectedSpecialEvent?.createdBy || user.uid,
        createdByEmail: selectedSpecialEvent?.createdByEmail || user.email || null,
        createdAt: selectedSpecialEvent?.createdAt || serverTimestamp(),
        created_at: selectedSpecialEvent?.created_at || new Date().toISOString(),
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
        updated_date: new Date().toISOString(),
      };

      const before = editing ? buildSpecialEventAuditSnapshot(selectedSpecialEvent) : null;
      const after = buildSpecialEventAuditSnapshot(data);

      await setDoc(doc(db, "custodySpecialEvents", eventId), data, { merge: true });
      await logFamilyActivity({
        familyId,
        user,
        profile,
        type: editing ? "special_event_updated" : "special_event_created",
        title: editing ? "Special event updated" : "Special event added",
        description: `${data.title} · ${data.date}`,
        entityType: "custodySpecialEvent",
        entityId: eventId,
        date: data.date,
        metadata: buildAuditMetadata({
          action: editing ? "updated" : "created",
          entityLabel: data.title,
          before,
          after,
          extra: {
            title: data.title,
            category: data.category,
            startTime: data.startTime,
            location: data.location,
          },
        }),
      });
      setSpecialEvents((prev) => {
        const next = editing
          ? prev.map((event) => (event.id === eventId ? { ...event, ...data } : event))
          : [...prev, data];
        return sortSpecialEvents(next.filter((event) => normalizeDate(event.date) === dateKey));
      });
      setSelectedSpecialEvent(null);
      setShowSpecialEventDialog(false);
    } catch (error) {
      console.error("Error saving custody special event:", error);
      alert(`There was an error saving this special event: ${error.message}`);
    } finally {
      setSavingSpecialEvent(false);
    }
  };

  const deleteSpecialEvent = async (event) => {
    if (!event?.id) return;

    const confirmed = window.confirm(`Delete "${event.title}" from this day?`);
    if (!confirmed) return;

    setSavingSpecialEvent(true);

    try {
      const before = buildSpecialEventAuditSnapshot(event);

      await deleteDoc(doc(db, "custodySpecialEvents", event.id));
      await logFamilyActivity({
        familyId,
        user,
        profile,
        type: "special_event_deleted",
        title: "Special event deleted",
        description: `${event.title} · ${event.date}`,
        entityType: "custodySpecialEvent",
        entityId: event.id,
        date: event.date,
        metadata: buildAuditMetadata({
          action: "deleted",
          entityLabel: event.title,
          before,
          after: null,
          extra: { title: event.title, category: event.category },
        }),
      });
      setSpecialEvents((prev) => prev.filter((item) => item.id !== event.id));
    } catch (error) {
      console.error("Error deleting custody special event:", error);
      alert(`There was an error deleting this special event: ${error.message}`);
    } finally {
      setSavingSpecialEvent(false);
    }
  };

  const saveTravelPlan = async (payload) => {
    if (!user || !familyId || !dateKey) {
      alert("Could not save this travel plan because the family context is missing. Please refresh and try again.");
      return;
    }

    setSavingTravelPlan(true);

    try {
      const editing = Boolean(payload.id);
      const travelId = payload.id || `${familyId}_travel_${payload.startDate}_${Date.now()}`;
      const { id: _ignoredPayloadId, ...safePayload } = payload;
      const data = {
        ...safePayload,
        id: travelId,
        startDate: normalizeDate(payload.startDate),
        start_date: normalizeDate(payload.startDate),
        endDate: normalizeDate(payload.endDate),
        end_date: normalizeDate(payload.endDate),
        travelingParent: payload.travelingParent,
        traveling_parent: payload.travelingParent,
        familyId,
        family_id: familyId,
        familyName: profile?.family_name || profile?.familyName || "",
        userId: user.uid,
        createdBy: selectedTravelPlan?.createdBy || user.uid,
        createdByEmail: selectedTravelPlan?.createdByEmail || user.email || null,
        createdAt: selectedTravelPlan?.createdAt || serverTimestamp(),
        created_at: selectedTravelPlan?.created_at || new Date().toISOString(),
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
        updated_date: new Date().toISOString(),
      };

      const before = editing ? buildTravelAuditSnapshot(selectedTravelPlan) : null;
      const after = buildTravelAuditSnapshot(data);

      await setDoc(doc(db, "custodyTravelPlans", travelId), data, { merge: true });
      await logFamilyActivity({
        familyId,
        user,
        profile,
        type: editing ? "travel_plan_updated" : "travel_plan_created",
        title: editing ? "Travel plan updated" : "Travel plan added",
        description: `${data.title} · ${data.startDate} → ${data.endDate}`,
        entityType: "custodyTravelPlan",
        entityId: travelId,
        date: data.startDate,
        metadata: buildAuditMetadata({
          action: editing ? "updated" : "created",
          entityLabel: data.title,
          before,
          after,
          extra: {
            title: data.title,
            destination: data.destination,
            startDate: data.startDate,
            endDate: data.endDate,
            travelingParent: data.travelingParent,
            affectsCustody: data.affectsCustody ?? true,
          },
        }),
      });
      setTravelPlans((prev) => {
        const next = editing
          ? prev.map((plan) => (plan.id === travelId ? { ...plan, ...data } : plan))
          : [...prev, data];
        return sortTravelPlans(next.filter((plan) => plan.startDate <= dateKey && plan.endDate >= dateKey));
      });
      setSelectedTravelPlan(null);
      setShowTravelDialog(false);
    } catch (error) {
      console.error("Error saving custody travel plan:", error);
      alert(`There was an error saving this travel plan: ${error.message}`);
    } finally {
      setSavingTravelPlan(false);
    }
  };

  const deleteTravelPlan = async (plan) => {
    if (!plan?.id) return;

    const confirmed = window.confirm(`Delete "${plan.title}" travel plan?`);
    if (!confirmed) return;

    setSavingTravelPlan(true);

    try {
      const before = buildTravelAuditSnapshot(plan);

      await deleteDoc(doc(db, "custodyTravelPlans", plan.id));
      await logFamilyActivity({
        familyId,
        user,
        profile,
        type: "travel_plan_deleted",
        title: "Travel plan deleted",
        description: `${plan.title} · ${plan.startDate} → ${plan.endDate}`,
        entityType: "custodyTravelPlan",
        entityId: plan.id,
        date: plan.startDate,
        metadata: buildAuditMetadata({
          action: "deleted",
          entityLabel: plan.title,
          before,
          after: null,
          extra: {
            title: plan.title,
            destination: plan.destination,
            startDate: plan.startDate,
            endDate: plan.endDate,
          },
        }),
      });
      setTravelPlans((prev) => prev.filter((item) => item.id !== plan.id));
    } catch (error) {
      console.error("Error deleting custody travel plan:", error);
      alert(`There was an error deleting this travel plan: ${error.message}`);
    } finally {
      setSavingTravelPlan(false);
    }
  };

  const deleteOnlyThisDay = async () => {
    if (!existingData) {
      onClose?.();
      return;
    }

    const confirmDelete = window.confirm("Delete custody information for this day?");
    if (!confirmDelete) return;

    const before = buildCustodyAuditSnapshot(existingData, { dadLabel, momLabel });

    await onDelete(dateKey);
    await logFamilyActivity({
      familyId,
      user,
      profile,
      type: "custody_day_deleted",
      title: "Custody day deleted",
      description: formattedDate,
      entityType: "custodyDay",
      entityId: `${familyId}_${dateKey}`,
      date: dateKey,
      metadata: buildAuditMetadata({
        action: "deleted",
        entityLabel: formattedDate,
        before,
        after: null,
      }),
    });
  };

  const deleteEntireBulkSchedule = async () => {
    if (!bulkRunId || !familyId) return;

    const confirmDelete = window.confirm(
      "Delete the entire bulk custody schedule connected to this day? This will remove all days created by the same bulk/template action."
    );

    if (!confirmDelete) return;

    setDeletingSeries(true);

    try {
      const collectionRef = collection(db, "custodyDays");
      const docsByCamel = await getDocs(
        query(collectionRef, where("familyId", "==", familyId), where("bulkRunId", "==", bulkRunId))
      );
      const docsBySnake = await getDocs(
        query(collectionRef, where("family_id", "==", familyId), where("bulk_run_id", "==", bulkRunId))
      );

      const refs = new Map();
      docsByCamel.docs.forEach((docSnap) => refs.set(docSnap.id, docSnap.ref));
      docsBySnake.docs.forEach((docSnap) => refs.set(docSnap.id, docSnap.ref));

      if (!refs.size) {
        alert("No matching bulk schedule days were found.");
        return;
      }

      await Promise.all(Array.from(refs.values()).map((ref) => deleteDoc(ref)));
      await logFamilyActivity({
        familyId,
        user,
        profile,
        type: "bulk_custody_schedule_deleted",
        title: "Bulk custody schedule deleted",
        description: `${refs.size} day(s) removed from a custody schedule`,
        entityType: "custodyBulkSchedule",
        entityId: bulkRunId,
        date: dateKey,
        metadata: buildAuditMetadata({
          action: "deleted",
          entityLabel: "Bulk custody schedule",
          before: { bulkRunId, removedCount: refs.size },
          after: null,
          extra: { removedCount: refs.size, bulkRunId },
        }),
      });

      setShowDeleteChoice(false);
      onClose?.();
      window.location.reload();
    } catch (error) {
      console.error("Error deleting bulk custody schedule:", error);
      alert(`Could not delete the bulk custody schedule: ${error.message}`);
    } finally {
      setDeletingSeries(false);
    }
  };

  const handleDelete = async () => {
    if (!existingData) {
      onClose?.();
      return;
    }

    if (isBulkDay) {
      setShowDeleteChoice(true);
      return;
    }

    await deleteOnlyThisDay();
  };

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) onClose?.();
        }}
      >
        <DialogContent className="max-w-lg rounded-[2rem] p-0 overflow-hidden">
          <DialogHeader className="border-b bg-background px-5 py-4">
            <DialogTitle className="font-heading text-xl flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" />
              Today&apos;s plan
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[72vh] space-y-4 overflow-y-auto bg-slate-50/70 px-5 py-5">
            <div className="rounded-[1.75rem] border bg-white p-4 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                {dateKey}
              </p>
              <p className="mt-1 font-heading text-xl font-black text-slate-900">
                {formattedDate}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                  {hasTravelOverride ? `Travel override: ${travelOverrideLabel}` : isSplit ? "Split custody" : custodySummary}
                </span>
                {travelPlans.length > 0 && (
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                    ✈️ {travelPlans.length} travel
                  </span>
                )}
                {specialEvents.length > 0 && (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                    ✨ {specialEvents.length} event{specialEvents.length === 1 ? "" : "s"}
                  </span>
                )}
                {notes.trim() && (
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                    📝 Note
                  </span>
                )}
              </div>
            </div>

            <SectionCard
              eyebrow="01"
              title="Custody"
              description="Who the child is with on this day."
            >
              {hasTravelOverride && (
                <div className="mb-3 rounded-2xl border border-blue-100 bg-blue-50/80 p-3">
                  <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                    Travel override active
                  </p>
                  <p className="mt-1 text-sm font-black text-blue-900">
                    {travelOverridePlan?.destination || travelOverridePlan?.title
                      ? `Changed by travel plan · ${travelOverridePlan.destination || travelOverridePlan.title}`
                      : "Changed by travel plan"}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-blue-700">
                    Base: {baseCustodyLabel} · Travel override: {travelOverrideLabel}
                  </p>
                  {!travelOverrideChangedParent && (
                    <p className="mt-1 text-xs text-blue-700">
                      This travel plan keeps custody with the same parent for this day.
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-2xl border bg-muted/30 p-3">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  {hasTravelOverride ? "Regular custody selection" : "Current selection"}
                </p>
                <p className="mt-1 text-sm font-black text-slate-900">
                  {isSplit ? custodySummary : `${parentEmoji(withWhom)} ${custodySummary}`}
                </p>
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <Label>Day Type</Label>
                  <Select
                    value={isSplit ? "split" : "single"}
                    onValueChange={(value) => setIsSplit(value === "split")}
                  >
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="single">Full day with one parent</SelectItem>
                      <SelectItem value="split">Split day / AM and PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {!isSplit && (
                  <div>
                    <Label>With</Label>
                    <Select value={withWhom} onValueChange={setWithWhom}>
                      <SelectTrigger className="mt-1 bg-white">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="dad">👨 {dadLabel}</SelectItem>
                        <SelectItem value="mom">👩 {momLabel}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {isSplit && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Morning</Label>
                      <Select value={morning} onValueChange={setMorning}>
                        <SelectTrigger className="mt-1 bg-white">
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="dad">👨 {dadLabel}</SelectItem>
                          <SelectItem value="mom">👩 {momLabel}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Afternoon</Label>
                      <Select value={afternoon} onValueChange={setAfternoon}>
                        <SelectTrigger className="mt-1 bg-white">
                          <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="dad">👨 {dadLabel}</SelectItem>
                          <SelectItem value="mom">👩 {momLabel}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="02"
              title="Travel / vacation"
              description="Trips, vacation days and travel notes."
              className="border-blue-100"
              action={(
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5 bg-white"
                  disabled={!familyId || savingTravelPlan}
                  onClick={() => {
                    setSelectedTravelPlan(null);
                    setShowTravelDialog(true);
                  }}
                >
                  <Plane className="h-3.5 w-3.5" />
                  Add
                </Button>
              )}
            >
              {loadingTravelPlans && (
                <p className="text-xs font-semibold text-muted-foreground">
                  Loading travel plans...
                </p>
              )}

              {!loadingTravelPlans && travelPlans.length === 0 && (
                <p className="rounded-xl bg-muted/40 p-3 text-xs font-semibold text-muted-foreground">
                  No travel plans for this day.
                </p>
              )}

              {!loadingTravelPlans && travelPlans.length > 0 && (
                <div className="space-y-2">
                  {travelPlans.map((plan) => (
                    <div key={plan.id} className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                      <div className="flex items-start gap-2">
                        <span className="text-lg">✈️</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black">{plan.title}</p>
                          <p className="text-xs font-semibold text-muted-foreground">
                            {[plan.destination, `${plan.startDate} → ${plan.endDate}`].filter(Boolean).join(" · ")}
                          </p>
                          <p className="text-xs font-semibold text-blue-700">
                            With {parentLabel(plan.travelingParent, dadLabel, momLabel)}
                          </p>
                          {travelPlanAffectsCustody(plan) && (
                            <p className="mt-1 rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-black text-blue-800 w-fit">
                              Affects custody count
                            </p>
                          )}
                          {plan.notes && (
                            <p className="mt-1 text-xs text-muted-foreground">{plan.notes}</p>
                          )}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full"
                            disabled={savingTravelPlan}
                            onClick={() => {
                              setSelectedTravelPlan(plan);
                              setShowTravelDialog(true);
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 rounded-full text-destructive hover:text-destructive"
                            disabled={savingTravelPlan}
                            onClick={() => deleteTravelPlan(plan)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              eyebrow="03"
              title="Special events"
              description="Games, doctor visits, school moments and family plans."
              action={(
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-1.5 bg-white"
                  disabled={!familyId || savingSpecialEvent}
                  onClick={() => {
                    setSelectedSpecialEvent(null);
                    setShowSpecialEventDialog(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              )}
            >
              {loadingEvents && (
                <p className="text-xs font-semibold text-muted-foreground">
                  Loading events...
                </p>
              )}

              {!loadingEvents && specialEvents.length === 0 && (
                <p className="rounded-xl bg-muted/40 p-3 text-xs font-semibold text-muted-foreground">
                  No special events for this day yet.
                </p>
              )}

              {!loadingEvents && specialEvents.length > 0 && (
                <div className="space-y-2">
                  {specialEvents.map((event) => {
                    const category = getCustodyEventCategory(event.category);

                    return (
                      <div key={event.id} className="rounded-xl border bg-muted/30 p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-lg">{category.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black">{event.title}</p>
                            <p className="text-xs font-semibold text-muted-foreground">
                              {[event.startTime, event.location].filter(Boolean).join(" · ") || category.label}
                            </p>
                            {event.notes && (
                              <p className="mt-1 text-xs text-muted-foreground">{event.notes}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full"
                              disabled={savingSpecialEvent}
                              onClick={() => {
                                setSelectedSpecialEvent(event);
                                setShowSpecialEventDialog(true);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-full text-destructive hover:text-destructive"
                              disabled={savingSpecialEvent}
                              onClick={() => deleteSpecialEvent(event)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            <SectionCard
              eyebrow="04"
              title="Notes"
              description="Pickup notes, reminders, or day-specific details."
            >
              <Input
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Pickup note, school note, special detail..."
                className="bg-white"
              />
            </SectionCard>

            {isBulkDay && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs font-semibold text-blue-800">
                This day is part of a bulk custody schedule/template.
              </div>
            )}
          </div>

          <DialogFooter className="border-t bg-background px-5 py-4 gap-2 sm:gap-0">
            {existingData && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSaving || deletingSeries}
                className="mr-auto gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            )}

            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>

            <Button type="button" onClick={handleSave} disabled={isSaving || deletingSeries}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showSpecialEventDialog && (
        <CustodySpecialEventDialog
          defaultDate={date}
          existingEvent={selectedSpecialEvent}
          onClose={() => {
            setSelectedSpecialEvent(null);
            setShowSpecialEventDialog(false);
          }}
          onSave={saveSpecialEvent}
          isSaving={savingSpecialEvent}
        />
      )}

      {showTravelDialog && (
        <CustodyTravelPlanDialog
          defaultDate={date}
          existingTravel={selectedTravelPlan}
          onClose={() => {
            setSelectedTravelPlan(null);
            setShowTravelDialog(false);
          }}
          onSave={saveTravelPlan}
          isSaving={savingTravelPlan}
          dadLabel={dadLabel}
          momLabel={momLabel}
        />
      )}

      <Dialog open={showDeleteChoice} onOpenChange={setShowDeleteChoice}>
        <DialogContent className="max-w-md rounded-[2rem] p-0 overflow-hidden">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="font-heading flex items-center gap-3 text-xl">
              <button
                type="button"
                onClick={() => setShowDeleteChoice(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
              Delete custody schedule
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 py-6 text-center">
            <p className="mx-auto max-w-sm text-base font-black text-slate-800">
              This day is part of a bulk custody schedule. What would you like to delete?
            </p>

            <div className="mt-6 space-y-3">
              <Button
                type="button"
                className="h-12 w-full rounded-full font-black"
                variant="destructive"
                disabled={deletingSeries}
                onClick={deleteEntireBulkSchedule}
              >
                {deletingSeries ? "Deleting..." : "Delete entire schedule"}
              </Button>

              <Button
                type="button"
                className="h-12 w-full rounded-full font-black"
                disabled={deletingSeries || isSaving}
                onClick={deleteOnlyThisDay}
              >
                Delete only this day
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full rounded-full font-bold text-slate-500"
                disabled={deletingSeries}
                onClick={() => setShowDeleteChoice(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
