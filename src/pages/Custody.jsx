import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  BellRing,
  CalendarDays,
  CreditCard,
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

import CustodyCalendarView from "@/features/custody/CustodyCalendarView";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import AppDialog from "@/components/app/AppDialog";
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

      <AppDialog
        open={Boolean(confirmDialog)}
        tone={confirmDialog?.tone}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel || "Confirm"}
        cancelLabel="Cancel"
        loading={isResetting}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={() => {
          const action = confirmDialog?.onConfirm;
          setConfirmDialog(null);
          action?.();
        }}
      />
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
  const [noticeDialog, setNoticeDialog] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);

  const showNotice = ({ tone = "info", title, message }) => {
    setNoticeDialog({ tone, title, message });
  };

  const askConfirm = ({ tone = "danger", title, message, confirmLabel = "Confirm", onConfirm }) => {
    setConfirmDialog({ tone, title, message, confirmLabel, onConfirm });
  };
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

  const handleResetCustody = async ({ skipConfirm = false } = {}) => {
    if (!canResetCustody || isResetting) return;

    if (!skipConfirm) {
      askConfirm({
        tone: "danger",
        title: "Reset custody calendar?",
        message: "This will permanently delete the existing custody days for the selected custody scope and start the custody calendar from zero. Continue?",
        confirmLabel: "Reset calendar",
        onConfirm: () => handleResetCustody({ skipConfirm: true }),
      });
      return;
    }

    setIsResetting(true);

    try {
      const result = await resetCustodyDays({
        familyId,
        userId: user.uid,
      });

      showNotice({
        tone: "success",
        title: "Custody reset completed",
        message: `Deleted ${result.deleted} day(s). The calendar will refresh now.`,
      });
      window.setTimeout(() => window.location.reload(), 900);
    } catch (error) {
      console.error("Error resetting custody data:", error);
      showNotice({
        tone: "danger",
        title: "Could not reset custody data",
        message: error.message,
      });
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
        <CustodyCalendarView
          key={`dashboard-${calendarRefreshKey}`}
          mode="dashboard"
          activeCalendar={activeCalendar}
          setActiveCalendar={setActiveCalendar}
          viewMode={viewMode}
          setViewMode={setViewMode}
          recentActivity={custodyActivity}
          activityLoading={loadingActivity}
          activityError={activityError}
          onOpenSchedule={() => setActiveModule("schedule")}
          onOpenExchange={() => setActiveModule("exchange")}
          onOpenPacking={() => setActiveModule("packing")}
          onOpenNotifications={() => setActiveModule("notifications")}
          onOpenBudget={() => setActiveModule("budget")}
          onOpenChat={() => setActiveModule("chat")}
        />
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
