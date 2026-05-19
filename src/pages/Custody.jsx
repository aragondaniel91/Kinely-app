import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  BellRing,
  CalendarDays,
  CreditCard,
  History,
  LayoutDashboard,
  MessageCircle,
  Plane,
  Shirt,
  Sparkles,
  Sun,
  Trash2,
  Truck,
} from "lucide-react";
import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";

import CustodyCalendarView from "@/components/calendar/CustodyCalendarView";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { resetCustodyDays } from "@/lib/resetCustodyData";
import { useFamily } from "@/lib/FamilyContext";
import { db } from "@/lib/firebase";

const custodyModules = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description:
      "Quick custody status, next change, parent balance, and selected custody group overview.",
    accent: "bg-slate-50 text-slate-700 border-slate-200",
  },
  {
    id: "schedule",
    label: "Schedule",
    icon: CalendarDays,
    description: "Custody calendar, manual days, bulk schedule, and future templates.",
    accent: "bg-blue-50 text-blue-600 border-blue-100",
  },
  {
    id: "exchange",
    label: "Exchange",
    icon: Truck,
    description: "Pickup/dropoff days, handoff notes, exchange reminders, and status.",
    accent: "bg-cyan-50 text-cyan-600 border-cyan-100",
  },
  {
    id: "packing",
    label: "Packing List",
    icon: Shirt,
    description:
      "Checklist for clothes, backpack, medicine, sports gear, and exchange-day items.",
    accent: "bg-emerald-50 text-emerald-600 border-emerald-100",
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: BellRing,
    description:
      "Smart reminders for exchanges, packing, school items, medicine, and transition readiness.",
    accent: "bg-orange-50 text-orange-600 border-orange-100",
  },
  {
    id: "budget",
    label: "Budget",
    icon: CreditCard,
    description: "Shared expenses, split costs, who paid, who owes, and recurring payments.",
    accent: "bg-amber-50 text-amber-600 border-amber-100",
  },
  {
    id: "chat",
    label: "Chat",
    icon: MessageCircle,
    description: "Co-parent messages, important notes, and custody-related communication.",
    accent: "bg-violet-50 text-violet-600 border-violet-100",
  },
];

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function formatTime(date) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getActivitySortValue(activity) {
  const raw = activity.created_at || activity.createdAt || activity.updated_date || "";
  if (typeof raw === "string") return raw;
  if (raw?.toDate) return raw.toDate().toISOString();
  return String(raw || "");
}

function getActivityDate(activity) {
  const raw = activity?.created_at || activity?.createdAt;
  const date = raw?.toDate ? raw.toDate() : raw ? new Date(raw) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function formatActivityTime(activity) {
  const date = getActivityDate(activity);

  if (!date) return "Just now";

  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatAuditTimestamp(activity) {
  const date = getActivityDate(activity);
  if (!date) return "Time not available";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function titleCase(value = "") {
  return String(value)
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getActionLabel(type = "") {
  if (type.includes("deleted")) return "Deleted";
  if (type.includes("updated")) return "Updated";
  if (type.includes("created") || type.includes("added")) return "Created";
  if (type.includes("test")) return "Test";
  return "Changed";
}

function getActionTone(type = "") {
  if (type.includes("deleted")) return "border-rose-100 bg-rose-50 text-rose-700";
  if (type.includes("updated")) return "border-blue-100 bg-blue-50 text-blue-700";
  if (type.includes("created") || type.includes("added")) return "border-emerald-100 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function getParentLabel(value) {
  if (value === "dad") return "Dad";
  if (value === "mom") return "Mom";
  if (!value) return "";
  return titleCase(value);
}

function compactDateRange(start, end) {
  if (start && end) return `${start} → ${end}`;
  return start || end || "";
}

function addDetail(details, label, value) {
  if (value === undefined || value === null || value === "") return;
  details.push({ label, value: String(value) });
}

function buildActivityDetails(item = {}) {
  const details = [];
  const metadata = item.metadata || {};
  const type = item.type || "";
  const after = metadata.after || metadata;

  if (type.includes("travel")) {
    addDetail(details, "Destination", metadata.destination || after.destination);
    addDetail(details, "Dates", compactDateRange(metadata.startDate || metadata.start_date || after.startDate, metadata.endDate || metadata.end_date || after.endDate));
    addDetail(details, "Parent", getParentLabel(metadata.travelingParent || metadata.traveling_parent || after.travelingParent));
    addDetail(details, "Affects custody", (metadata.affectsCustody ?? after.affectsCustody) === false ? "No" : "Yes");
  } else if (type.includes("special_event")) {
    addDetail(details, "Category", titleCase(metadata.category || after.category));
    addDetail(details, "Time", metadata.startTime || metadata.start_time || after.startTime);
    addDetail(details, "Location", metadata.location || after.location);
  } else if (type.includes("custody_day")) {
    addDetail(details, "Date", item.date || metadata.date || after.date);
    if (metadata.is_split || metadata.isSplit || after.type === "split") {
      addDetail(details, "Morning", getParentLabel(metadata.morning || after.morning));
      addDetail(details, "Afternoon", getParentLabel(metadata.afternoon || after.afternoon));
    } else {
      addDetail(details, "With", getParentLabel(metadata.with_whom || metadata.withWhom || after.with));
    }
    addDetail(details, "Notes", metadata.notes || after.notes);
  } else if (type.includes("bulk")) {
    addDetail(details, "Removed", metadata.removedCount ? `${metadata.removedCount} day(s)` : "");
    addDetail(details, "Bulk run", metadata.bulkRunId || metadata.bulk_run_id);
  }

  return details.slice(0, 4);
}

function summarizeAuditSnapshot(snapshot = null, fallback = "") {
  if (!snapshot) return fallback;

  if (snapshot.type === "split") {
    const morning = snapshot.morningLabel || getParentLabel(snapshot.morning);
    const afternoon = snapshot.afternoonLabel || getParentLabel(snapshot.afternoon);
    return [morning && `AM ${morning}`, afternoon && `PM ${afternoon}`].filter(Boolean).join(" · ") || fallback;
  }

  if (snapshot.withLabel || snapshot.with) {
    return snapshot.withLabel || getParentLabel(snapshot.with);
  }

  if (snapshot.title && (snapshot.startDate || snapshot.endDate)) {
    return `${snapshot.title} · ${compactDateRange(snapshot.startDate, snapshot.endDate)}`;
  }

  if (snapshot.title && snapshot.date) {
    return `${snapshot.title} · ${snapshot.date}`;
  }

  if (snapshot.title) return snapshot.title;
  if (snapshot.destination) return snapshot.destination;
  if (snapshot.date) return snapshot.date;

  return fallback;
}

function formatChangedFieldName(field = "") {
  const labelMap = {
    with: "custody parent",
    withLabel: "custody parent",
    type: "day type",
    morning: "morning parent",
    morningLabel: "morning parent",
    afternoon: "afternoon parent",
    afternoonLabel: "afternoon parent",
    notes: "notes",
    title: "title",
    destination: "destination",
    startDate: "start date",
    endDate: "end date",
    travelingParent: "traveling parent",
    travelStatus: "travel status",
    affectsCustody: "affects custody",
    category: "category",
    startTime: "start time",
    endTime: "end time",
    location: "location",
  };

  return labelMap[field] || titleCase(field);
}

function getAuditChangeSummary(item = {}) {
  const metadata = item.metadata || {};
  const before = metadata.before;
  const after = metadata.after;
  const hasBefore = before && Object.keys(before).length > 0;
  const hasAfter = after && Object.keys(after).length > 0;

  if (!hasBefore && !hasAfter) return null;

  const action = metadata.action || getActionLabel(item.type || "").toLowerCase();
  const beforeLabel = hasBefore ? summarizeAuditSnapshot(before, "Previous value") : action === "created" ? "New item" : "None";
  const afterLabel = hasAfter ? summarizeAuditSnapshot(after, "Updated value") : action === "deleted" ? "Deleted" : "None";
  const changedFields = metadata.changedFields || metadata.changed_fields || [];

  return {
    beforeLabel,
    afterLabel,
    changedFields: Array.from(new Set(changedFields.map(formatChangedFieldName))).slice(0, 4),
  };
}

function isCustodyActivity(activity) {
  const type = activity?.type || "";
  const module = activity?.module || activity?.module_name || "";
  const entityType = activity?.entityType || activity?.entity_type || "";

  return (
    module === "custody" ||
    type.includes("custody") ||
    type.includes("travel") ||
    type.includes("special_event") ||
    entityType.includes("custody")
  );
}

function getCustodyActivityIcon(type = "") {
  if (type.includes("travel")) return Plane;
  if (type.includes("special_event")) return Sparkles;
  if (type.includes("deleted")) return Trash2;
  return CalendarDays;
}

function getCustodyActivityTone(type = "") {
  if (type.includes("deleted")) return "bg-rose-50 text-rose-700 border-rose-100";
  if (type.includes("travel")) return "bg-blue-50 text-blue-700 border-blue-100";
  if (type.includes("special_event")) return "bg-amber-50 text-amber-700 border-amber-100";
  return "bg-violet-50 text-violet-700 border-violet-100";
}

function mergeActivityDocs(...groups) {
  const map = new Map();
  groups.flat().forEach((item) => {
    if (item?.id) map.set(item.id, item);
  });

  return Array.from(map.values())
    .filter(isCustodyActivity)
    .sort((a, b) => getActivitySortValue(b).localeCompare(getActivitySortValue(a)))
    .slice(0, 10);
}

function WeatherTimeBadge() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="hidden items-center gap-2 rounded-full border border-white/80 bg-white px-3 py-2 shadow-[0_8px_22px_rgba(15,23,42,0.05)] sm:flex">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-50 text-yellow-500">
        <Sun className="h-4 w-4" />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-black text-slate-950">{formatTime(now)}</p>
        <p className="text-[11px] font-bold text-slate-500">68° · Sunny</p>
      </div>
    </div>
  );
}

function ModuleCard({ module, onClick }) {
  const Icon = module.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-[2rem] border border-white/80 bg-white p-5 text-left shadow-[0_12px_30px_rgba(15,23,42,0.05)] transition hover:-translate-y-0.5 hover:border-blue-100 hover:shadow-md md:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className={`flex h-14 w-14 items-center justify-center rounded-3xl border ${module.accent}`}>
          <Icon className="h-7 w-7" />
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500 transition group-hover:bg-blue-100 group-hover:text-blue-700">
          Open
        </span>
      </div>

      <h2 className="mt-5 text-2xl font-black tracking-tight text-slate-950">
        {module.label}
      </h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
        {module.description}
      </p>
    </button>
  );
}

function AuditChangeSummary({ summary }) {
  if (!summary) return null;

  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="rounded-xl bg-white px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">Before</p>
          <p className="mt-0.5 truncate text-xs font-black text-slate-700">{summary.beforeLabel}</p>
        </div>
        <div className="hidden text-xs font-black text-slate-400 sm:block">→</div>
        <div className="rounded-xl bg-white px-3 py-2">
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">After</p>
          <p className="mt-0.5 truncate text-xs font-black text-slate-900">{summary.afterLabel}</p>
        </div>
      </div>
      {summary.changedFields.length > 0 && (
        <p className="mt-2 text-[11px] font-bold text-slate-500">
          Changed: {summary.changedFields.join(", ")}
        </p>
      )}
    </div>
  );
}

function CustodyActivityPanel({ activity = [], loading = false, error = "" }) {
  return (
    <div className="px-3 pb-8 pt-4 md:px-6">
      <Card className="mx-auto max-w-7xl rounded-[2rem] border-blue-100 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">
              Audit log
            </p>
            <h2 className="text-xl font-black text-slate-950">Custody activity</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              Evidence of custody schedule, travel, special event, and delete changes.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-500">
            <History className="h-3.5 w-3.5" />
            {activity.length} recent
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
            Audit log error: {error}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {loading && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
              Loading custody activity...
            </div>
          )}

          {!loading && activity.length === 0 && !error && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-500">
              No custody activity yet. Create or edit a custody day, travel plan, or special event to start the audit trail.
            </div>
          )}

          {!loading && activity.slice(0, 6).map((item) => {
            const Icon = getCustodyActivityIcon(item.type || "");
            const actor = item.actorName || item.actor_name || item.actorEmail || "Someone";
            const details = buildActivityDetails(item);
            const action = getActionLabel(item.type || "");
            const changeSummary = getAuditChangeSummary(item);

            return (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${getCustodyActivityTone(item.type || "")}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-black text-slate-950">
                            {item.title || "Custody activity"}
                          </p>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${getActionTone(item.type || "")}`}>
                            {action}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">
                          {item.description || "Custody record was changed"}
                        </p>
                      </div>
                      <div className="shrink-0 text-left sm:text-right">
                        <p className="text-[11px] font-black text-slate-500">
                          {formatActivityTime(item)}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400">
                          {formatAuditTimestamp(item)}
                        </p>
                      </div>
                    </div>

                    <AuditChangeSummary summary={changeSummary} />

                    {details.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {details.map((detail) => (
                          <span
                            key={`${item.id}-${detail.label}`}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-600"
                          >
                            <span className="text-slate-400">{detail.label}:</span> {detail.value}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="mt-2 truncate text-[11px] font-bold text-slate-400">
                      by {actor}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function ManagementPanel({ canResetCustody, isResetting, onReset }) {
  if (!canResetCustody) return null;

  return (
    <Card className="mt-5 rounded-[2rem] border-white/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Management
          </p>
          <h2 className="text-lg font-black text-slate-950">Custody data tools</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Temporary admin tools live here until Profile has full custody management.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={isResetting}
          onClick={onReset}
          className="w-fit gap-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
        >
          <Trash2 className="h-4 w-4" />
          {isResetting ? "Resetting..." : "Reset custody data"}
        </Button>
      </div>
    </Card>
  );
}

function ComingSoonPanel({ icon: Icon, title, description, bullets }) {
  return (
    <div className="px-3 pb-8 pt-4 md:px-6">
      <Card className="mx-auto max-w-5xl rounded-[2rem] border-white/80 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
            <Icon className="h-7 w-7" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">
              Coming next
            </p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              {title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-500">
              {description}
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {bullets.map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function Custody() {
  const [activeCalendar, setActiveCalendar] = useState("custody");
  const [viewMode, setViewMode] = useState("month");
  const [activeModule, setActiveModule] = useState("dashboard");
  const [isResetting, setIsResetting] = useState(false);
  const [custodyActivity, setCustodyActivity] = useState([]);
  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityError, setActivityError] = useState("");
  const { user, familyId, myEmail, isAdmin, isOwner } = useFamily();

  const canResetCustody = Boolean(user && familyId && (isAdmin || isOwner));
  const selectedModule = custodyModules.find((module) => module.id === activeModule);
  const latestActivityId = custodyActivity[0]?.id || "";

  useEffect(() => {
    let cancelled = false;
    let unsubscribers = [];

    const setupActivityListeners = async () => {
      if (!user || !familyId) {
        setCustodyActivity([]);
        setLoadingActivity(false);
        setActivityError("");
        return;
      }

      setLoadingActivity(true);
      setActivityError("");

      const familyIdsToWatch = new Set([familyId]);
      const email = normalizeEmail(myEmail || user.email);

      if (email) {
        try {
          const groupRef = collection(db, "custodyGroups");
          const [memberSnap, viewerSnap] = await Promise.allSettled([
            getDocs(query(groupRef, where("memberEmails", "array-contains", email))),
            getDocs(query(groupRef, where("viewerEmails", "array-contains", email))),
          ]);

          [memberSnap, viewerSnap].forEach((result) => {
            if (result.status !== "fulfilled") return;
            result.value.docs.forEach((docSnap) => familyIdsToWatch.add(docSnap.id));
          });
        } catch (error) {
          console.warn("Could not load custody spaces for audit log:", error);
        }
      }

      if (cancelled) return;

      const bucket = new Map();
      const updateActivity = () => {
        if (cancelled) return;
        setCustodyActivity(mergeActivityDocs(...Array.from(bucket.values())));
        setLoadingActivity(false);
      };

      Array.from(familyIdsToWatch).forEach((idToWatch) => {
        ["familyId", "family_id"].forEach((fieldName) => {
          const bucketKey = `${fieldName}:${idToWatch}`;
          const activityQuery = query(
            collection(db, "familyActivity"),
            where(fieldName, "==", idToWatch)
          );

          const unsubscribe = onSnapshot(
            activityQuery,
            (snap) => {
              bucket.set(bucketKey, snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
              updateActivity();
            },
            (error) => {
              console.warn(`Could not listen to custody activity for ${bucketKey}:`, error);
              if (!cancelled) {
                setActivityError(error.message || `Could not read familyActivity for ${bucketKey}.`);
                setLoadingActivity(false);
              }
            }
          );

          unsubscribers.push(unsubscribe);
        });
      });
    };

    setupActivityListeners();

    return () => {
      cancelled = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      unsubscribers = [];
    };
  }, [user, familyId, myEmail]);

  useEffect(() => {
    if (!latestActivityId) return;
    setCalendarRefreshKey((current) => current + 1);
  }, [latestActivityId]);

  const handleResetCustody = async () => {
    if (!canResetCustody || isResetting) return;

    const confirmed = window.confirm(
      "This will permanently delete the existing custody days for the selected custody scope and start the custody calendar from zero. Continue?"
    );

    if (!confirmed) return;

    setIsResetting(true);

    try {
      const result = await resetCustodyDays({
        familyId,
        userId: user.uid,
      });

      window.alert(`Custody reset completed. Deleted ${result.deleted} day(s).`);
      window.location.reload();
    } catch (error) {
      console.error("Error resetting custody data:", error);
      window.alert(`Could not reset custody data: ${error.message}`);
    } finally {
      setIsResetting(false);
    }
  };

  if (activeModule === "hub") {
    return (
      <div className="min-h-full bg-[#F8F7F4] px-4 pb-28 pt-5 md:px-8 md:pb-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 rounded-[2rem] border border-white/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)] md:p-7">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-500">
              Custody
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              Custody tools
            </h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-500 md:text-base">
              Manage the custody schedule, exchanges, packing needs, child expenses, and co-parent communication from one place.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {custodyModules.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                onClick={() => setActiveModule(module.id)}
              />
            ))}
          </div>

          <ManagementPanel
            canResetCustody={canResetCustody}
            isResetting={isResetting}
            onReset={handleResetCustody}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F8F7F4] pb-28 md:pb-6">
      <div className="sticky top-0 z-30 bg-[#F8F7F4]/95 px-3 py-3 backdrop-blur md:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setActiveModule("hub")}
              className="h-9 shrink-0 gap-2 rounded-full bg-white px-3 text-xs font-black text-slate-600 shadow-[0_8px_22px_rgba(15,23,42,0.05)] hover:bg-blue-50 hover:text-blue-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Modules
            </Button>

            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-500">
                Custody
              </p>
              <h1 className="truncate text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                {selectedModule?.label || "Custody"}
              </h1>
            </div>
          </div>

          <WeatherTimeBadge />
        </div>
      </div>

      {activeModule === "dashboard" && (
        <>
          <CustodyCalendarView
            key={`dashboard-${calendarRefreshKey}`}
            mode="dashboard"
            activeCalendar={activeCalendar}
            setActiveCalendar={setActiveCalendar}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onOpenSchedule={() => setActiveModule("schedule")}
            onOpenExchange={() => setActiveModule("exchange")}
            onOpenPacking={() => setActiveModule("packing")}
            onOpenNotifications={() => setActiveModule("notifications")}
            onOpenBudget={() => setActiveModule("budget")}
            onOpenChat={() => setActiveModule("chat")}
          />
          <CustodyActivityPanel
            activity={custodyActivity}
            loading={loadingActivity}
            error={activityError}
          />
        </>
      )}

      {activeModule === "schedule" && (
        <CustodyCalendarView
          key={`schedule-${calendarRefreshKey}`}
          activeCalendar={activeCalendar}
          setActiveCalendar={setActiveCalendar}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      )}

      {["exchange", "packing", "notifications", "budget"].includes(activeModule) && (
        <CustodyCalendarView
          key={`${activeModule}-${calendarRefreshKey}`}
          mode={activeModule}
          activeCalendar={activeCalendar}
          setActiveCalendar={setActiveCalendar}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      )}

      {activeModule === "chat" && (
        <ComingSoonPanel
          icon={MessageCircle}
          title="Co-parent chat"
          description="This section will keep custody-related messages and important notes organized by custody group."
          bullets={[
            "Custody-specific message thread",
            "Important pinned notes",
            "Exchange-day messages",
            "Budget and receipt comments",
            "Read status",
            "Future notification support",
          ]}
        />
      )}
    </div>
  );
}
