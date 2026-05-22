import { Bell, Globe2, Settings, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";

export default function ProfileSettingsSection() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Card className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Profile / Settings</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Family settings</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              Default location, timezone, notification rules, family-level permissions, and app preferences will live here.
            </p>
          </div>
        </div>
      </Card>

      <Card className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Coming next</p>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <Globe2 className="h-5 w-5 text-slate-500" />
            <p className="text-sm font-bold text-slate-600">Timezone and default location</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <Bell className="h-5 w-5 text-slate-500" />
            <p className="text-sm font-bold text-slate-600">Notification defaults</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <ShieldCheck className="h-5 w-5 text-slate-500" />
            <p className="text-sm font-bold text-slate-600">Family permission presets</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
