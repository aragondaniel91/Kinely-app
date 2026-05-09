import React from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, Heart, RefreshCw } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function formatDayLabel(value) {
  if (!value) return "Not scheduled";

  try {
    return format(parseISO(`${String(value).slice(0, 10)}T12:00:00`), "EEE, MMM d");
  } catch {
    return String(value).slice(0, 10);
  }
}

function getNextChangeLabel(nextChange, dadName, momName) {
  if (!nextChange) return "No upcoming change";

  const isSplit = nextChange.is_split || nextChange.isSplit;
  const parent = isSplit ? nextChange.morning : nextChange.with_whom || nextChange.withWhom;
  const parentLabel = parent === "dad" ? dadName || "Dad" : parent === "mom" ? momName || "Mom" : "Split day";

  return `${formatDayLabel(nextChange.date)} → ${parentLabel}`;
}

function StatCard({ title, value, helper, icon: Icon, className }) {
  return (
    <Card className={cn("rounded-3xl border p-4 shadow-sm", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{value}</p>
          {helper && <p className="mt-1 text-sm font-semibold text-slate-500">{helper}</p>}
        </div>
        {Icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-slate-500 shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}

export default function CustodyStatusSummary({
  todayLabel,
  nextChange,
  dadDays = 0,
  momDays = 0,
  dadName = "Dad",
  momName = "Mom",
  dadTheme,
  momTheme,
}) {
  const hasToday = Boolean(todayLabel);
  const dadCount = Number.isInteger(dadDays) ? dadDays : Number(dadDays).toFixed(1);
  const momCount = Number.isInteger(momDays) ? momDays : Number(momDays).toFixed(1);

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <StatCard
        title="Today"
        value={hasToday ? todayLabel : "Not scheduled"}
        helper={hasToday ? "Current custody status" : "Add custody info for today"}
        icon={Heart}
        className={cn(
          "bg-white",
          todayLabel?.toLowerCase?.().includes(String(dadName).toLowerCase()) && dadTheme?.border,
          todayLabel?.toLowerCase?.().includes(String(momName).toLowerCase()) && momTheme?.border
        )}
      />

      <StatCard
        title="Next change"
        value={getNextChangeLabel(nextChange, dadName, momName)}
        helper="Based on the upcoming custody schedule"
        icon={RefreshCw}
        className="bg-white"
      />

      <Card className="rounded-3xl border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">This period</p>
            <div className="mt-3 space-y-2">
              <div className={cn("flex items-center justify-between rounded-2xl border px-3 py-2", dadTheme?.bg, dadTheme?.border)}>
                <span className="text-sm font-black text-slate-800">👨 {dadName}</span>
                <span className="text-sm font-black text-slate-950">{dadCount} days</span>
              </div>
              <div className={cn("flex items-center justify-between rounded-2xl border px-3 py-2", momTheme?.bg, momTheme?.border)}>
                <span className="text-sm font-black text-slate-800">👩 {momName}</span>
                <span className="text-sm font-black text-slate-950">{momCount} days</span>
              </div>
            </div>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-slate-500 shadow-sm">
            <CalendarDays className="h-5 w-5" />
          </div>
        </div>
      </Card>
    </div>
  );
}
