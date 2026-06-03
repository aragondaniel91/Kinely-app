import { Bell, Globe2, Languages, MapPin, ShieldCheck } from "lucide-react";

import { Card } from "@/components/ui/card";

function PreferenceRow({ icon: Icon, label, value, helper, badge = null }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-black text-slate-950">{label}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{helper}</p>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-black text-slate-800">{value}</p>
        {badge && (
          <p className="mt-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
            {badge}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ProfileSettingsSection() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Card className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Globe2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Local preferences
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              App preferences
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              Manage language, timezone, default location, and family-level defaults. English is the default language while multilingual support is prepared.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <PreferenceRow
            icon={Languages}
            label="Language"
            value="English"
            helper="The app currently uses English by default. Spanish support will be added through a dedicated language system."
            badge="Default"
          />

          <PreferenceRow
            icon={Globe2}
            label="Timezone"
            value="Automatic"
            helper="Used for custody reminders, events, tasks, and daily family summaries."
            badge="Active"
          />

          <PreferenceRow
            icon={MapPin}
            label="Default location"
            value="Not set"
            helper="Optional family location for local reminders, weather, school, and activity context."
            badge="Optional"
          />
        </div>
      </Card>

      <Card className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
          Where to manage this
        </p>

        <div className="mt-4 space-y-3">
          <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-4">
            <Bell className="h-5 w-5 text-blue-600" />
            <p className="mt-2 text-sm font-black text-slate-950">Notifications</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              Use the Notifications tab to manage custody reminders, task due dates, and family event alerts.
            </p>
          </div>

          <div className="rounded-3xl border border-indigo-100 bg-indigo-50/70 p-4">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <p className="mt-2 text-sm font-black text-slate-950">Member access</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              Use Members & Access to decide who can view, create, edit, or manage each family module.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
