import { useEffect, useMemo, useState } from "react";
import { Bell, Globe2, Languages, MapPin, Save, ShieldCheck } from "lucide-react";

import { useFamily } from "@/lib/FamilyContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
];

function profileValue(profile, ...keys) {
  for (const key of keys) {
    if (profile?.[key] !== undefined && profile?.[key] !== null) return profile[key];
  }
  return "";
}

function getBrowserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return "";
  }
}

function SettingsField({ icon: Icon, label, helper, children }) {
  return (
    <label className="block rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-600">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-950">{label}</p>
          <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{helper}</p>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </label>
  );
}

export default function ProfileSettingsSection() {
  const { profile, isOwner, isAdmin, updateActiveFamily, refreshFamilies } = useFamily();
  const { toast } = useToast();
  const canManageSettings = Boolean(isOwner || isAdmin);
  const browserTimeZone = useMemo(() => getBrowserTimeZone(), []);

  const [language, setLanguage] = useState("en");
  const [timeZone, setTimeZone] = useState(browserTimeZone || "America/Chicago");
  const [defaultLocation, setDefaultLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLanguage(String(profileValue(profile, "language", "defaultLanguage", "default_language") || "en"));
    setTimeZone(String(profileValue(profile, "timeZone", "timezone", "time_zone") || browserTimeZone || "America/Chicago"));
    setDefaultLocation(String(profileValue(profile, "defaultLocation", "default_location", "location") || ""));
    setMessage("");
    setError("");
  }, [browserTimeZone, profile]);

  async function handleSave(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!canManageSettings) {
      setError("Only the owner or an admin can update family settings.");
      return;
    }

    setSaving(true);
    try {
      const cleanLocation = defaultLocation.trim();
      const cleanTimeZone = timeZone.trim() || browserTimeZone || "America/Chicago";

      await updateActiveFamily?.({
        language,
        defaultLanguage: language,
        default_language: language,
        timeZone: cleanTimeZone,
        timezone: cleanTimeZone,
        time_zone: cleanTimeZone,
        defaultLocation: cleanLocation,
        default_location: cleanLocation,
        location: cleanLocation,
      });
      await refreshFamilies?.();
      setMessage("Settings saved.");
      toast({
        title: "Saved",
        description: "Your Kinely settings have been updated.",
        duration: 3000,
      });
    } catch (saveError) {
      console.error("Error saving profile settings:", saveError);
      setError(saveError?.message || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <Card className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Globe2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
              Family preferences
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              App settings
            </h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
              Set the defaults Kinely uses for reminders, scheduling, local context, and future localization.
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-3" onSubmit={handleSave}>
          <SettingsField
            icon={Languages}
            label="Language"
            helper="Controls the preferred family language as multilingual screens are added."
          >
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              disabled={!canManageSettings || saving}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </SettingsField>

          <SettingsField
            icon={Globe2}
            label="Timezone"
            helper="Used for custody reminders, events, tasks, and daily family summaries."
          >
            <Input
              value={timeZone}
              onChange={(event) => setTimeZone(event.target.value)}
              disabled={!canManageSettings || saving}
              placeholder="America/Chicago"
              className="h-10 rounded-xl border-slate-200 bg-white font-bold"
            />
          </SettingsField>

          <SettingsField
            icon={MapPin}
            label="Default location"
            helper="Optional family location for weather, school, activity, and reminder context."
          >
            <Input
              value={defaultLocation}
              onChange={(event) => setDefaultLocation(event.target.value)}
              disabled={!canManageSettings || saving}
              placeholder="City, state"
              className="h-10 rounded-xl border-slate-200 bg-white font-bold"
            />
          </SettingsField>

          {(error || message) && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                error
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {error || message}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-semibold leading-5 text-slate-500">
              Display name and member roles are managed in People & Access so identity and permissions stay together.
            </p>
            <Button type="submit" disabled={!canManageSettings || saving} className="rounded-xl">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save settings"}
            </Button>
          </div>
        </form>
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
              Use People & Access to decide who can view, create, edit, or manage each family module.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
