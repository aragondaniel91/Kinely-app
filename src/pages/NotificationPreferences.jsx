import { useEffect, useMemo, useState } from "react";
import { Bell, CalendarDays, CheckSquare, HeartPulse, Home, Mail, MessageSquare, Save, Shield, ShoppingCart, UtensilsCrossed, Users } from "lucide-react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const DEFAULT_PREFERENCES = {
  channels: {
    inApp: true,
    email: true,
    push: false,
    sms: false,
  },
  notifyOn: {
    custodyCreated: true,
    custodyEdited: true,
    custodyDeleted: true,
    familyEventCreated: true,
    familyEventEdited: true,
    taskAssigned: true,
    taskCompleted: false,
    childCareUpdated: true,
    medicationOrAllergyUpdated: true,
    mealPlanUpdated: false,
    groceryItemAdded: false,
    invitationReceived: true,
    messageReceived: true,
  },
  eventDefaults: {
    notifyNoOne: false,
    notifyCoParent: true,
    notifyAllFamilyMembers: false,
    allowSelectedPeople: true,
  },
  quietHours: {
    enabled: false,
    start: "22:00",
    end: "07:00",
  },
};

const CHANNELS = [
  { id: "inApp", label: "In-app", description: "Show inside Family Wall.", icon: Bell },
  { id: "email", label: "Email", description: "Send email notifications.", icon: Mail },
  { id: "push", label: "Push", description: "For mobile/tablet app later.", icon: MessageSquare },
  { id: "sms", label: "SMS", description: "Optional future channel.", icon: MessageSquare },
];

const NOTIFICATION_GROUPS = [
  {
    title: "Custody",
    icon: Shield,
    items: [
      { id: "custodyCreated", label: "Custody day created", description: "Notify when a custody day or range is added." },
      { id: "custodyEdited", label: "Custody day edited", description: "Notify when custody ownership, notes, or details change." },
      { id: "custodyDeleted", label: "Custody day deleted", description: "Notify when a custody day or range is removed." },
    ],
  },
  {
    title: "Family Calendar",
    icon: CalendarDays,
    items: [
      { id: "familyEventCreated", label: "Family event created", description: "Notify when a school, sport, doctor, or family event is added." },
      { id: "familyEventEdited", label: "Family event edited", description: "Notify when a family event changes." },
    ],
  },
  {
    title: "Tasks",
    icon: CheckSquare,
    items: [
      { id: "taskAssigned", label: "Task assigned to me", description: "Notify when someone assigns me a task." },
      { id: "taskCompleted", label: "Task completed", description: "Notify when a shared task is marked complete." },
    ],
  },
  {
    title: "Child Care Profile",
    icon: HeartPulse,
    items: [
      { id: "childCareUpdated", label: "Child care profile updated", description: "Notify when health, size, doctor, or emergency notes change." },
      { id: "medicationOrAllergyUpdated", label: "Medication/allergy info updated", description: "Notify for important allergy or medication changes." },
    ],
  },
  {
    title: "Meals & Groceries",
    icon: UtensilsCrossed,
    items: [
      { id: "mealPlanUpdated", label: "Meal plan updated", description: "Notify when meals are changed." },
      { id: "groceryItemAdded", label: "Grocery item added", description: "Notify when shared grocery items are added." },
    ],
  },
  {
    title: "Invites & Messages",
    icon: Users,
    items: [
      { id: "invitationReceived", label: "Invitation received", description: "Notify when someone invites me to a family or custody group." },
      { id: "messageReceived", label: "Message received", description: "Notify when a family/custody message is sent." },
    ],
  },
];

function mergePreferences(saved = {}) {
  return {
    channels: { ...DEFAULT_PREFERENCES.channels, ...(saved.channels || {}) },
    notifyOn: { ...DEFAULT_PREFERENCES.notifyOn, ...(saved.notifyOn || saved.notify_on || {}) },
    eventDefaults: { ...DEFAULT_PREFERENCES.eventDefaults, ...(saved.eventDefaults || saved.event_defaults || {}) },
    quietHours: { ...DEFAULT_PREFERENCES.quietHours, ...(saved.quietHours || saved.quiet_hours || {}) },
  };
}

function ToggleRow({ checked, onChange, title, description, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50 disabled:opacity-60"
    >
      <div>
        <p className="text-sm font-black text-slate-950">{title}</p>
        {description && <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-500">{description}</p>}
      </div>
      <span className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? "bg-indigo-600" : "bg-slate-300"}`}>
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${checked ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

function ChannelCard({ channel, checked, onChange, disabled }) {
  const Icon = channel.icon;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`rounded-3xl border p-4 text-left transition disabled:opacity-60 ${
        checked ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${checked ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${checked ? "bg-white text-indigo-700" : "bg-slate-100 text-slate-500"}`}>
          {checked ? "On" : "Off"}
        </span>
      </div>
      <p className="mt-3 text-sm font-black text-slate-950">{channel.label}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{channel.description}</p>
    </button>
  );
}

export default function NotificationPreferences() {
  const { user, myEmail } = useFamily();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const userId = user?.uid;

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      if (!userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "users", userId));
        const saved = snap.exists() ? snap.data()?.notificationPreferences : null;
        if (!cancelled) setPreferences(mergePreferences(saved || {}));
      } catch (loadError) {
        console.error("Error loading notification preferences:", loadError);
        if (!cancelled) setError("Could not load notification preferences.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const enabledCount = useMemo(
    () => Object.values(preferences.notifyOn || {}).filter(Boolean).length,
    [preferences.notifyOn]
  );

  function updateSection(section, key, value) {
    setMessage("");
    setError("");
    setPreferences((current) => ({
      ...current,
      [section]: {
        ...current[section],
        [key]: value,
      },
    }));
  }

  async function savePreferences() {
    if (!userId) {
      setError("You must be logged in to save notification preferences.");
      return;
    }

    setSaving(true);
    setMessage("");
    setError("");

    try {
      await setDoc(
        doc(db, "users", userId),
        {
          notificationPreferences: preferences,
          notification_preferences: preferences,
          notificationEmail: myEmail || user?.email || "",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setMessage("Notification preferences saved.");
    } catch (saveError) {
      console.error("Error saving notification preferences:", saveError);
      setError(saveError?.message || "Could not save notification preferences.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500 shadow-sm">
        Loading notification preferences...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-[2rem] border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-500">Notifications</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Notification preferences</h1>
            <p className="mt-2 max-w-4xl text-sm font-semibold leading-6 text-slate-500">
              Control when Family Wall should notify you about custody changes, family events, tasks, child care updates, meals, groceries, invitations, and messages.
            </p>
            <p className="mt-2 text-xs font-bold text-slate-400">
              {enabledCount} notification types enabled · Saved per user account
            </p>
          </div>

          <Button type="button" onClick={savePreferences} disabled={saving} className="gap-2 rounded-2xl">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save preferences"}
          </Button>
        </div>

        {(message || error) && (
          <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-bold ${message ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {message || error}
          </div>
        )}
      </Card>

      <Card className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Channels</p>
            <h2 className="text-xl font-black text-slate-950">How you want to be notified</h2>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {CHANNELS.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              checked={preferences.channels[channel.id] === true}
              onChange={(value) => updateSection("channels", channel.id, value)}
            />
          ))}
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {NOTIFICATION_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <Card key={group.title} className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Notify me about</p>
                  <h2 className="text-xl font-black text-slate-950">{group.title}</h2>
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {group.items.map((item) => (
                  <ToggleRow
                    key={item.id}
                    checked={preferences.notifyOn[item.id] === true}
                    onChange={(value) => updateSection("notifyOn", item.id, value)}
                    title={item.label}
                    description={item.description}
                  />
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Event defaults</p>
              <h2 className="text-xl font-black text-slate-950">When I create or edit something</h2>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <ToggleRow checked={preferences.eventDefaults.notifyNoOne === true} onChange={(value) => updateSection("eventDefaults", "notifyNoOne", value)} title="Default to no notification" description="Useful when making small edits without bothering anyone." />
            <ToggleRow checked={preferences.eventDefaults.notifyCoParent === true} onChange={(value) => updateSection("eventDefaults", "notifyCoParent", value)} title="Notify co-parent by default" description="Recommended for custody and child-related changes." />
            <ToggleRow checked={preferences.eventDefaults.notifyAllFamilyMembers === true} onChange={(value) => updateSection("eventDefaults", "notifyAllFamilyMembers", value)} title="Notify all family members by default" description="Use for shared household updates." />
            <ToggleRow checked={preferences.eventDefaults.allowSelectedPeople === true} onChange={(value) => updateSection("eventDefaults", "allowSelectedPeople", value)} title="Allow selected people" description="Let me choose specific recipients when creating events or notes." />
          </div>
        </Card>

        <Card className="rounded-[2rem] border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <Home className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Quiet hours</p>
              <h2 className="text-xl font-black text-slate-950">Pause non-urgent notifications</h2>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <ToggleRow checked={preferences.quietHours.enabled === true} onChange={(value) => updateSection("quietHours", "enabled", value)} title="Enable quiet hours" description="Emergency/urgent notifications can still be handled later as exceptions." />

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Start</Label>
                <Input
                  type="time"
                  value={preferences.quietHours.start || "22:00"}
                  onChange={(event) => updateSection("quietHours", "start", event.target.value)}
                  className="mt-1 rounded-xl border-slate-200 bg-white text-sm font-bold text-slate-700"
                />
              </div>
              <div>
                <Label>End</Label>
                <Input
                  type="time"
                  value={preferences.quietHours.end || "07:00"}
                  onChange={(event) => updateSection("quietHours", "end", event.target.value)}
                  className="mt-1 rounded-xl border-slate-200 bg-white text-sm font-bold text-slate-700"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
