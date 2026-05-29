import React, { useEffect, useMemo, useState } from "react";
import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import {
  ArrowRightLeft,
  CalendarClock,
  Car,
  Clock3,
  MapPin,
  MessageSquareText,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import AppDialog from "@/components/app/AppDialog";
import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { getCustodyScopedDocSnaps } from "@/lib/firestoreFamilyQueries";

const emptyExchange = {
  date: "",
  time: "18:00",
  location: "Daycare pickup",
  fromParent: "dad",
  toParent: "mom",
  pickupBy: "mom",
  notes: "",
  status: "pending",
  source: "manual",
};

function normalizeDate(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value?.toDate) return value.toDate().toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function normalizeCustodyDay(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    date: normalizeDate(data.date),
    is_split: data.is_split || data.isSplit || false,
    with_whom: data.with_whom || data.withWhom || null,
    morning: data.morning || null,
    afternoon: data.afternoon || null,
  };
}

function getDaySegments(day) {
  if (!day) return [];

  if (day.is_split) {
    return [
      { period: "AM", owner: day.morning || null, suggestedTime: "08:00" },
      { period: "PM", owner: day.afternoon || null, suggestedTime: "12:00" },
    ].filter((segment) => segment.owner && segment.owner !== "none");
  }

  const owner = day.with_whom || null;
  return owner && owner !== "none" ? [{ period: "All day", owner, suggestedTime: "18:00" }] : [];
}

function getEndOfDayOwner(day) {
  const segments = getDaySegments(day);
  return segments.at(-1)?.owner || "none";
}

function findCurrentOwner(sortedDays, todayKey) {
  let owner = "none";

  sortedDays.forEach((day) => {
    const dateKey = normalizeDate(day.date);
    if (dateKey && dateKey <= todayKey) {
      owner = getEndOfDayOwner(day) || owner;
    }
  });

  return owner;
}

function findNextExchangeFromCalendar(sortedDays, todayKey) {
  let previousOwner = findCurrentOwner(sortedDays, todayKey);
  if (!previousOwner || previousOwner === "none") return null;

  for (const day of sortedDays) {
    const dateKey = normalizeDate(day.date);
    if (!dateKey || dateKey <= todayKey) continue;

    const segments = getDaySegments(day);
    for (const segment of segments) {
      if (segment.owner && segment.owner !== previousOwner) {
        return {
          date: dateKey,
          fromParent: previousOwner,
          toParent: segment.owner,
          pickupBy: segment.owner,
          time: segment.suggestedTime || "18:00",
          period: segment.period,
        };
      }

      if (segment.owner) previousOwner = segment.owner;
    }
  }

  return null;
}

function formatParent(value, dadName, momName) {
  if (value === "dad") return dadName || "Dad";
  if (value === "mom") return momName || "Mom";
  return "Shared";
}

function formatDate(value) {
  if (!value) return "Not scheduled";
  try {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    }).format(new Date(`${value}T12:00:00`));
  } catch {
    return value;
  }
}

function formatTime(value) {
  if (!value) return "Time TBD";
  const [hourRaw, minute = "00"] = value.split(":");
  const hour = Number(hourRaw);
  if (Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minute} ${suffix}`;
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function statusMeta(status) {
  if (status === "completed") {
    return {
      label: "Completed",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (status === "issue") {
    return {
      label: "Issue",
      className: "border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  return {
    label: "Pending",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  };
}

function exchangeToForm(exchange) {
  return {
    date: exchange?.date || "",
    time: exchange?.time || "18:00",
    location: exchange?.location || "Daycare pickup",
    fromParent: exchange?.fromParent || "dad",
    toParent: exchange?.toParent || "mom",
    pickupBy: exchange?.pickupBy || exchange?.toParent || "mom",
    notes: exchange?.notes || "",
    status: exchange?.status || "pending",
    source: exchange?.source || "manual",
  };
}

function normalizeExchangeDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    date: data.date || "",
    time: data.time || "18:00",
    location: data.location || "Daycare pickup",
    fromParent: data.fromParent || "dad",
    toParent: data.toParent || "mom",
    pickupBy: data.pickupBy || data.toParent || "mom",
    notes: data.notes || "",
    status: data.status || "pending",
    source: data.source || "manual",
    order: data.order ?? 999,
  };
}

function ExchangeSummaryCard({ exchange, dadName, momName, loading }) {
  return (
    <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white shadow-[0_18px_52px_rgba(15,23,42,0.08)]">
      <div className="bg-[radial-gradient(circle_at_top_left,rgba(91,141,239,0.18),transparent_36%),linear-gradient(135deg,#ffffff_0%,#eff6ff_52%,#f8f7f4_100%)] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Exchange Hub
            </div>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Next exchange
            </h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 md:text-base">
              Keep the transition calm with pickup details, handoff notes, and everything that needs to travel with the child.
            </p>
          </div>

          <div className="rounded-[1.75rem] border border-white/80 bg-white/86 p-5 shadow-[0_12px_34px_rgba(15,23,42,0.08)] backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Transition
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Car className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-black text-slate-950">
                  {loading
                    ? "Loading..."
                    : exchange
                      ? `${formatParent(exchange.fromParent, dadName, momName)} → ${formatParent(exchange.toParent, dadName, momName)}`
                      : "No exchange scheduled"}
                </p>
                <p className="text-sm font-bold text-slate-500">
                  {exchange ? `${formatDate(exchange.date)} · ${formatTime(exchange.time)}` : "Add one to get started"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SuggestedExchangeCard({ suggestion, dadName, momName, onConfirm }) {
  if (!suggestion) return null;

  return (
    <Card className="rounded-[1.8rem] border-blue-100 bg-blue-50/80 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-700 shadow-sm">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Smart suggestion</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Confirm suggested exchange</h3>
            <p className="mt-1 text-sm font-semibold leading-6 text-blue-800">
              Calendar detected {formatParent(suggestion.fromParent, dadName, momName)} → {formatParent(suggestion.toParent, dadName, momName)} on {formatDate(suggestion.date)}{suggestion.period ? ` (${suggestion.period})` : ""}. Review time, location, and notes before saving.
            </p>
          </div>
        </div>

        <Button type="button" onClick={onConfirm} className="rounded-full bg-blue-600 hover:bg-blue-700">
          Confirm details
        </Button>
      </div>
    </Card>
  );
}

function DetailCard({ icon: Icon, label, value, helper }) {
  return (
    <Card className="rounded-[1.6rem] border-white/80 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
          {helper && <p className="mt-1 text-sm font-semibold text-slate-500">{helper}</p>}
        </div>
      </div>
    </Card>
  );
}

function ExchangeRow({ exchange, dadName, momName, onCycle, onEdit, onDelete }) {
  const meta = statusMeta(exchange.status);

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <button type="button" onClick={() => onCycle(exchange.id)} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-black text-slate-950">
              {formatDate(exchange.date)} · {formatTime(exchange.time)}
            </h4>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${meta.className}`}>{meta.label}</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            {formatParent(exchange.fromParent, dadName, momName)} → {formatParent(exchange.toParent, dadName, momName)} · {exchange.location}
          </p>
          {exchange.notes && <p className="mt-2 text-sm font-semibold text-blue-700">{exchange.notes}</p>}
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(exchange)}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            aria-label="Edit exchange"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(exchange)}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
            aria-label="Delete exchange"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ExchangeModal({ open, mode, value, saving, onChange, onClose, onSubmit }) {
  if (!open) return null;

  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-4 backdrop-blur-sm md:items-center">
      <form onSubmit={onSubmit} className="w-full max-w-2xl rounded-[2rem] border border-white/80 bg-white p-5 shadow-2xl md:p-6">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Custody exchange</p>
          <h3 className="mt-1 text-2xl font-black text-slate-950">{isEdit ? "Edit exchange" : "Add exchange"}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">Set the handoff time, location, parents, and notes.</p>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">Date</span>
              <Input
                type="date"
                value={value.date}
                onChange={(event) => onChange({ ...value, date: event.target.value })}
                className="rounded-2xl border-slate-200 text-sm font-bold focus-visible:ring-blue-200"
                required
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">Time</span>
              <Input
                type="time"
                value={value.time}
                onChange={(event) => onChange({ ...value, time: event.target.value })}
                className="rounded-2xl border-slate-200 text-sm font-bold focus-visible:ring-blue-200"
                required
              />
            </label>
          </div>

          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase tracking-wide text-slate-400">Location</span>
            <Input
              value={value.location}
              onChange={(event) => onChange({ ...value, location: event.target.value })}
              placeholder="Example: Daycare pickup"
              className="rounded-2xl border-slate-200 text-sm font-bold focus-visible:ring-blue-200"
              required
            />
          </label>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">From</span>
              <Select value={value.fromParent} onValueChange={(nextValue) => onChange({ ...value, fromParent: nextValue })}>
                <SelectTrigger className="rounded-2xl border-slate-200 text-sm font-bold focus:ring-blue-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dad">Dad</SelectItem>
                  <SelectItem value="mom">Mom</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">To</span>
              <Select value={value.toParent} onValueChange={(nextValue) => onChange({ ...value, toParent: nextValue, pickupBy: nextValue })}>
                <SelectTrigger className="rounded-2xl border-slate-200 text-sm font-bold focus:ring-blue-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dad">Dad</SelectItem>
                  <SelectItem value="mom">Mom</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-1.5">
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">Status</span>
              <Select value={value.status} onValueChange={(nextValue) => onChange({ ...value, status: nextValue })}>
                <SelectTrigger className="rounded-2xl border-slate-200 text-sm font-bold focus:ring-blue-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="issue">Issue</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <label className="grid gap-1.5">
            <span className="text-xs font-black uppercase tracking-wide text-slate-400">Handoff notes</span>
            <Textarea
              value={value.notes}
              onChange={(event) => onChange({ ...value, notes: event.target.value })}
              placeholder="Example: Medicine bag and backpack included."
              className="min-h-24 rounded-2xl border-slate-200 text-sm font-bold focus-visible:ring-blue-200"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="rounded-full">Cancel</Button>
          <Button type="submit" disabled={saving} className="rounded-full bg-blue-600 hover:bg-blue-700">
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add exchange"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function ExchangeHub() {
  const {
    user,
    familyId,
    actualFamilyId,
    householdFamilyId,
    custodyGroupId,
    selectedCustodyGroup,
    dadName,
    momName,
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
  const [exchanges, setExchanges] = useState([]);
  const [custodyDays, setCustodyDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noticeDialog, setNoticeDialog] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showNotice = ({ tone = "info", title, message }) => {
    setNoticeDialog({ tone, title, message });
  };

  const askConfirm = ({ tone = "danger", title, message, confirmLabel = "Confirm", onConfirm }) => {
    setConfirmDialog({ tone, title, message, confirmLabel, onConfirm });
  };

  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [savingExchange, setSavingExchange] = useState(false);
  const [exchangeForm, setExchangeForm] = useState({ ...emptyExchange, date: getTodayKey() });
  const [editingExchange, setEditingExchange] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadExchanges() {
      if (!user || !custodyScopeId) {
        setExchanges([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const docs = await getCustodyScopedDocSnaps("custodyExchanges", custodyScopeId);
        const data = docs
          .map(normalizeExchangeDoc)
          .sort((a, b) => `${a.date || "9999-12-31"} ${a.time || "99:99"}`.localeCompare(`${b.date || "9999-12-31"} ${b.time || "99:99"}`));

        if (!cancelled) setExchanges(data);
      } catch (error) {
        console.error("Error loading custody exchanges:", error);
        if (!cancelled) setExchanges([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadExchanges();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, custodyScopeId]);

  useEffect(() => {
    let cancelled = false;

    async function loadCustodyDays() {
      if (!user || !custodyScopeId) {
        setCustodyDays([]);
        return;
      }

      try {
        const docs = await getCustodyScopedDocSnaps("custodyDays", custodyScopeId);
        const data = docs
          .map(normalizeCustodyDay)
          .sort((a, b) => (a.date || "").localeCompare(b.date || ""));

        if (!cancelled) setCustodyDays(data);
      } catch (error) {
        console.error("Error loading custody days for exchange suggestion:", error);
        if (!cancelled) setCustodyDays([]);
      }
    }

    loadCustodyDays();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, custodyScopeId]);

  const suggestedExchange = useMemo(() => {
    const candidate = findNextExchangeFromCalendar(custodyDays, getTodayKey());
    if (!candidate) return null;

    const existing = exchanges.find((exchange) =>
      exchange.date === candidate.date &&
      exchange.fromParent === candidate.fromParent &&
      exchange.toParent === candidate.toParent
    );

    if (existing) return null;

    return {
      ...candidate,
      location: "",
      notes: `Auto-suggested from the custody calendar${candidate.period ? ` (${candidate.period})` : ""}. Please confirm time, location, and handoff details.`,
      status: "pending",
      source: "calendar-suggested",
    };
  }, [custodyDays, exchanges]);

  const nextExchange = useMemo(() => {
    const todayKey = getTodayKey();
    return exchanges.find((exchange) => exchange.status !== "completed" && (!exchange.date || exchange.date >= todayKey)) || suggestedExchange || exchanges[0] || null;
  }, [exchanges, suggestedExchange]);

  const completedCount = exchanges.filter((exchange) => exchange.status === "completed").length;
  const pendingCount = exchanges.filter((exchange) => exchange.status === "pending").length;
  const issueCount = exchanges.filter((exchange) => exchange.status === "issue").length;
  const readiness = exchanges.length ? Math.round((completedCount / exchanges.length) * 100) : 0;

  const closeExchangeModal = () => {
    setShowExchangeModal(false);
    setEditingExchange(null);
    setExchangeForm({ ...emptyExchange, date: getTodayKey() });
  };

  const openAddExchange = () => {
    setEditingExchange(null);
    setExchangeForm({ ...emptyExchange, date: getTodayKey() });
    setShowExchangeModal(true);
  };

  const openSuggestedExchange = () => {
    if (!suggestedExchange) return;
    setEditingExchange(null);
    setExchangeForm(exchangeToForm(suggestedExchange));
    setShowExchangeModal(true);
  };

  const openEditExchange = (exchange) => {
    setEditingExchange(exchange);
    setExchangeForm(exchangeToForm(exchange));
    setShowExchangeModal(true);
  };

  const saveExchange = async (event) => {
    event.preventDefault();

    if (!exchangeForm.date || !exchangeForm.time || !exchangeForm.location.trim() || !user || !custodyScopeId || savingExchange) return;

    setSavingExchange(true);

    try {
      const payload = {
        date: exchangeForm.date,
        time: exchangeForm.time,
        location: exchangeForm.location.trim(),
        fromParent: exchangeForm.fromParent,
        toParent: exchangeForm.toParent,
        pickupBy: exchangeForm.pickupBy || exchangeForm.toParent,
        notes: exchangeForm.notes.trim(),
        status: exchangeForm.status,
        source: exchangeForm.source || "manual",
        ...custodyScopeFields,
        updatedAt: serverTimestamp(),
      };

      if (editingExchange) {
        await updateDoc(doc(db, "custodyExchanges", editingExchange.id), payload);
        setExchanges((current) =>
          current.map((exchange) => (exchange.id === editingExchange.id ? { ...exchange, ...payload } : exchange))
        );
      } else {
        const createPayload = {
          ...payload,
          createdBy: user.uid,
          order: exchanges.length,
          createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "custodyExchanges"), createPayload);
        setExchanges((current) => [...current, { ...createPayload, id: docRef.id }]);
      }

      closeExchangeModal();
    } catch (error) {
      console.error("Error saving custody exchange:", error);
      showNotice({
        tone: "danger",
        title: "Could not save exchange",
        message: error.message,
      });
    } finally {
      setSavingExchange(false);
    }
  };

  const cycleStatus = async (id) => {
    const next = {
      pending: "completed",
      completed: "issue",
      issue: "pending",
    };

    const currentExchange = exchanges.find((exchange) => exchange.id === id);
    if (!currentExchange) return;

    const nextStatus = next[currentExchange.status] || "pending";
    setExchanges((current) => current.map((exchange) => (exchange.id === id ? { ...exchange, status: nextStatus } : exchange)));

    try {
      await updateDoc(doc(db, "custodyExchanges", id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating custody exchange:", error);
      setExchanges((current) => current.map((exchange) => (exchange.id === id ? { ...exchange, status: currentExchange.status } : exchange)));
    }
  };

  const deleteExchange = async (exchangeToDelete) => {
    if (!skipConfirm) {
      askConfirm({
        tone: "danger",
        title: "Delete exchange?",
        message: `Delete exchange on ${formatDate(exchangeToDelete.date)}? This action cannot be undone.`,
        confirmLabel: "Delete exchange",
        onConfirm: () => handleDeleteExchange({ skipConfirm: true }),
      });
      return;
    }

    const previousExchanges = exchanges;
    setExchanges((current) => current.filter((exchange) => exchange.id !== exchangeToDelete.id));

    try {
      await deleteDoc(doc(db, "custodyExchanges", exchangeToDelete.id));
    } catch (error) {
      console.error("Error deleting custody exchange:", error);
      setExchanges(previousExchanges);
      showNotice({
        tone: "danger",
        title: "Could not delete exchange",
        message: error.message,
      });
    }
  };

  return (
    <div className="px-3 pb-28 pt-4 md:px-6 md:pb-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <ExchangeSummaryCard loading={loading} exchange={nextExchange} dadName={dadName} momName={momName} />

        <SuggestedExchangeCard suggestion={suggestedExchange} dadName={dadName} momName={momName} onConfirm={openSuggestedExchange} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DetailCard icon={Clock3} label="Time" value={nextExchange ? formatTime(nextExchange.time) : "TBD"} helper="Suggested reminder: 30 min before" />
          <DetailCard icon={MapPin} label="Location" value={nextExchange?.location || "Needs review"} helper="Visible to connected homes" />
          <DetailCard icon={Car} label="Pickup by" value={nextExchange ? formatParent(nextExchange.pickupBy, dadName, momName) : "TBD"} helper="Based on next exchange" />
          <DetailCard icon={CalendarClock} label="Exchange status" value={`${pendingCount} pending`} helper={`${completedCount} completed · ${issueCount} issue`} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.07)] md:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Upcoming exchanges
                </p>
                <h3 className="mt-1 text-2xl font-black text-slate-950">
                  Handoff schedule
                </h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  Tap an exchange to cycle pending, completed, and issue.
                </p>
              </div>
              <Badge className="rounded-full bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-50">
                {readiness}% done
              </Badge>
            </div>

            <div className="space-y-3">
              {exchanges.length ? (
                exchanges.map((exchange) => (
                  <ExchangeRow key={exchange.id} exchange={exchange} dadName={dadName} momName={momName} onCycle={cycleStatus} onEdit={openEditExchange} onDelete={deleteExchange} />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                  No confirmed exchanges yet. Use the smart suggestion above or add one manually.
                </div>
              )}
            </div>

            <Button type="button" onClick={openAddExchange} variant="outline" className="mt-4 w-full rounded-full gap-2">
              <Plus className="h-4 w-4" />
              Add exchange
            </Button>
          </Card>

          <Card className="rounded-[2rem] border-white/80 bg-white p-5 shadow-[0_14px_38px_rgba(15,23,42,0.07)] md:p-6">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                Calm transition flow
              </p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">
                Exchange timeline
              </h3>
              <p className="mt-2 text-sm font-semibold text-slate-500">
                A simple, low-conflict flow for what needs to happen before and during the handoff.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { id: "confirm", title: "Confirm exchange details", description: "Time, location, and pickup person are visible for both homes.", status: nextExchange && !suggestedExchange ? "done" : "pending" },
                { id: "pack", title: "Prepare transition items", description: "Backpack, medicine, clothes, and school items.", status: "active" },
                { id: "handoff", title: "Complete handoff", description: "Mark exchange complete once the child is with the next parent.", status: nextExchange?.status === "completed" ? "done" : "pending" },
              ].map((step, index) => (
                <div key={step.id} className="flex gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full font-black ${step.status === "done" ? "bg-emerald-100 text-emerald-700" : step.status === "active" ? "bg-blue-100 text-blue-700" : "bg-white text-slate-400"}`}>
                      {index + 1}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-base font-black text-slate-950">{step.title}</h4>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">{step.status}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[1.5rem] border border-blue-100 bg-blue-50/70 p-4">
              <div className="flex items-start gap-3">
                <MessageSquareText className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" />
                <div>
                  <p className="text-sm font-black text-blue-900">Handoff note</p>
                  <p className="mt-1 text-sm font-semibold text-blue-700">
                    {nextExchange?.notes || "Add exchange notes so both homes know what needs attention."}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ExchangeModal
        open={showExchangeModal}
        mode={editingExchange ? "edit" : "add"}
        value={exchangeForm}
        saving={savingExchange}
        onChange={setExchangeForm}
        onClose={closeExchangeModal}
        onSubmit={saveExchange}
      />

      <AppDialog
        open={Boolean(confirmDialog)}
        tone={confirmDialog?.tone}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel || "Confirm"}
        cancelLabel="Cancel"
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => {
          const action = confirmDialog?.onConfirm;
          setConfirmDialog(null);
          action?.();
        }}
      />

      <AppDialog
        open={Boolean(noticeDialog)}
        tone={noticeDialog?.tone}
        title={noticeDialog?.title}
        message={noticeDialog?.message}
        confirmLabel="Got it"
        onCancel={() => setNoticeDialog(null)}
        onConfirm={() => setNoticeDialog(null)}
      />
    </div>
  );
}
