import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  RefreshCw,
  ServerCrash,
  ShieldCheck,
  Wifi,
  XCircle,
} from "lucide-react";

import { useAuth } from "@/lib/AuthContext";
import { useFamily } from "@/lib/FamilyContext";
import { getModulePermission } from "@/lib/modulePermissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  checkWorkerHealth,
  hasWorkerApiConfigured,
  workerApiBaseUrl,
} from "@/services/kinelyApiClient";

const MODULES = [
  { id: "home", label: "Home" },
  { id: "calendar", label: "Calendar" },
  { id: "tasks", label: "Tasks" },
  { id: "meals", label: "Meals" },
  { id: "lists", label: "Lists" },
  { id: "custody", label: "Custody" },
  { id: "budget", label: "Budget" },
  { id: "notifications", label: "Notifications" },
];

function shortId(value) {
  const text = String(value || "").trim();
  if (!text) return "Not selected";
  if (text.length <= 12) return text;
  return `${text.slice(0, 6)}...${text.slice(-4)}`;
}

function statusMeta(status) {
  if (status === "ok") return { label: "OK", className: "border-emerald-200 bg-emerald-50 text-emerald-700", Icon: CheckCircle2 };
  if (status === "warning") return { label: "Check", className: "border-amber-200 bg-amber-50 text-amber-700", Icon: Clock3 };
  if (status === "error") return { label: "Error", className: "border-red-200 bg-red-50 text-red-700", Icon: XCircle };
  return { label: "Not checked", className: "border-slate-200 bg-slate-50 text-slate-600", Icon: Clock3 };
}

function StatusPill({ status }) {
  const { label, className, Icon } = statusMeta(status);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-black ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

function DiagnosticRow({ label, value, status, helper }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-1 break-words text-sm font-black text-slate-950">{value}</p>
        </div>
        <StatusPill status={status} />
      </div>
      {helper && <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">{helper}</p>}
    </div>
  );
}

export default function ProfileSystemStatusCard() {
  const { user } = useAuth();
  const {
    profile,
    familyId,
    isOwner,
    isAdmin,
    perms,
    custodyGroups,
    custodyGroupsLoading,
  } = useFamily();
  const [checking, setChecking] = useState(false);
  const [health, setHealth] = useState(null);
  const [tokenStatus, setTokenStatus] = useState("idle");
  const [error, setError] = useState("");
  const [checkedAt, setCheckedAt] = useState("");

  const workerConfigured = hasWorkerApiConfigured();
  const workerUrl = workerApiBaseUrl();
  const roleLabel = isOwner ? "Owner" : isAdmin ? "Admin" : "Member";

  const writableModules = useMemo(
    () =>
      MODULES.filter((module) => getModulePermission(perms, module.id).write)
        .map((module) => module.label),
    [perms]
  );

  const readableModules = useMemo(
    () =>
      MODULES.filter((module) => getModulePermission(perms, module.id).read)
        .map((module) => module.label),
    [perms]
  );

  async function handleRunCheck() {
    setChecking(true);
    setError("");
    setHealth(null);

    let nextTokenStatus = "idle";
    try {
      if (!user) {
        nextTokenStatus = "error";
      } else {
        await user.getIdToken();
        nextTokenStatus = "ok";
      }

      const healthResult = workerConfigured ? await checkWorkerHealth() : null;
      setHealth(healthResult);
      setTokenStatus(nextTokenStatus);
      setCheckedAt(new Date().toLocaleString());
    } catch (checkError) {
      setTokenStatus(nextTokenStatus === "idle" ? "warning" : nextTokenStatus);
      setError(checkError?.message || "Could not run diagnostics.");
      setCheckedAt(new Date().toLocaleString());
    } finally {
      setChecking(false);
    }
  }

  const workerStatus = !workerConfigured ? "warning" : health?.ok ? "ok" : error ? "error" : "idle";
  const familyStatus = familyId ? "ok" : "warning";
  const custodyStatus = custodyGroupsLoading ? "idle" : custodyGroups?.length ? "ok" : "warning";

  return (
    <Card className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">System status</p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">Diagnostics</h3>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
            Quick read-only checks for support, deployment, and access issues.
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <Wifi className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <DiagnosticRow
          label="Worker"
          value={workerConfigured ? shortId(workerUrl.replace(/^https?:\/\//i, "")) : "Missing VITE_KINELY_API_URL"}
          status={workerStatus}
          helper={health?.version ? `Version: ${health.version}` : "Used for email, invitations, family admin, and custody writes."}
        />
        <DiagnosticRow
          label="Auth token"
          value={user?.email || "No signed-in user"}
          status={tokenStatus}
          helper="Confirms the browser can issue a Firebase ID token for Worker requests."
        />
        <DiagnosticRow
          label="Family space"
          value={`${profile?.familyName || profile?.family_name || "Current family"} (${shortId(familyId)})`}
          status={familyStatus}
          helper={`${roleLabel} access. Write modules: ${writableModules.length ? writableModules.join(", ") : "none"}.`}
        />
        <DiagnosticRow
          label="Custody groups"
          value={custodyGroupsLoading ? "Loading" : `${custodyGroups?.length || 0} available`}
          status={custodyStatus}
          helper="Custody data is separated from the household and depends on group access."
        />
      </div>

      {readableModules.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {readableModules.map((moduleLabel) => (
            <Badge key={moduleLabel} variant="outline" className="rounded-full border-slate-200 bg-white text-[10px] text-slate-600">
              {moduleLabel}
            </Badge>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-semibold leading-5 text-red-700">
          <ServerCrash className="mb-2 h-4 w-4" />
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-slate-400">
          {checkedAt ? `Last checked ${checkedAt}` : "Run a check after deploys or permission changes."}
        </p>
        <Button type="button" variant="outline" onClick={handleRunCheck} disabled={checking} className="rounded-xl">
          <RefreshCw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking..." : "Run check"}
        </Button>
      </div>

      <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3">
        <ShieldCheck className="h-4 w-4 text-indigo-600" />
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">
          This panel does not change data. It only confirms what the app sees for the current browser session.
        </p>
      </div>
    </Card>
  );
}
