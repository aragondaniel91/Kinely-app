import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { CalendarDays, Check, Clock, StickyNote, UserRound, X } from "lucide-react";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const categoryOptions = [
  { value: "school", label: "School", emoji: "🎒" },
  { value: "sports", label: "Sports", emoji: "⚾" },
  { value: "doctor", label: "Health", emoji: "🩺" },
  { value: "pickup", label: "Pickup", emoji: "🚗" },
  { value: "birthday", label: "Birthday", emoji: "🎂" },
  { value: "family", label: "Family", emoji: "🏠" },
  { value: "note", label: "Note", emoji: "📝" },
  { value: "other", label: "Other", emoji: "📌" },
];

const hourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));
const minuteOptions = ["00", "15", "30", "45"];

function getChildName(child) {
  if (!child) return "";
  if (typeof child === "string") return child;
  return child.name || child.displayName || child.fullName || child.firstName || child.childName || "";
}

function getChildKey(child, index) {
  if (!child) return `child-${index + 1}`;
  if (typeof child === "string") return child.toLowerCase().replace(/\s+/g, "-") || `child-${index + 1}`;
  return child.id || child.uid || child.childId || child.profileId || child.name || child.displayName || `child-${index + 1}`;
}

function parseTimeParts(timeValue, fallback = "09:00") {
  const value = timeValue || fallback;
  const [rawHour = "9", rawMinute = "00"] = value.split(":");
  let hour24 = Number(rawHour);
  if (Number.isNaN(hour24)) hour24 = 9;

  const period = hour24 >= 12 ? "PM" : "AM";
  let hour12 = hour24 % 12;
  if (hour12 === 0) hour12 = 12;

  return {
    hour: String(hour12),
    minute: rawMinute.padStart(2, "0").slice(0, 2),
    period,
  };
}

function to24HourTime(parts) {
  let hour = Number(parts.hour);
  if (Number.isNaN(hour)) hour = 9;

  if (parts.period === "PM" && hour !== 12) hour += 12;
  if (parts.period === "AM" && hour === 12) hour = 0;

  return `${String(hour).padStart(2, "0")}:${parts.minute}`;
}

function formatDisplayTime(parts) {
  return `${parts.hour}:${parts.minute} ${parts.period}`;
}

function TimePicker({ label, value, onChange }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
        <Clock className="h-3.5 w-3.5" />
        {label}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr_1.4fr] items-center gap-2">
        <select
          value={value.hour}
          onChange={(event) => onChange({ ...value, hour: event.target.value })}
          className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-center text-base font-extrabold text-slate-800 outline-none focus:border-blue-400"
        >
          {hourOptions.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </select>

        <span className="text-xl font-black text-slate-300">:</span>

        <select
          value={value.minute}
          onChange={(event) => onChange({ ...value, minute: event.target.value })}
          className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-center text-base font-extrabold text-slate-800 outline-none focus:border-blue-400"
        >
          {minuteOptions.map((minute) => (
            <option key={minute} value={minute}>
              {minute}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {[
            "AM",
            "PM",
          ].map((period) => (
            <button
              key={period}
              type="button"
              onClick={() => onChange({ ...value, period })}
              className={cn(
                "h-12 text-sm font-black transition",
                value.period === period ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-white"
              )}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-2 text-right text-xs font-semibold text-slate-400">{formatDisplayTime(value)}</p>
    </div>
  );
}

export default function AddFamilyEventDialog({ date, editEvent, onClose, onSuccess }) {
  const { user, familyId, children, dadName, momName } = useFamily();
  const isEditing = Boolean(editEvent?.id);

  const childPeople = useMemo(() => {
    return (children || [])
      .map((child, index) => {
        const label = getChildName(child) || `Child ${index + 1}`;
        const key = getChildKey(child, index);
        return {
          value: `child:${key}`,
          childId: String(key),
          label,
        };
      })
      .filter((child) => child.label);
  }, [children]);

  const personOptions = useMemo(
    () => [
      { value: "all", label: "Everyone", type: "all" },
      { value: "dad", label: dadName || "Dad", type: "dad" },
      { value: "mom", label: momName || "Mom", type: "mom" },
      ...childPeople.map((child) => ({ ...child, type: "child" })),
    ],
    [dadName, momName, childPeople]
  );

  const initialDate = editEvent?.date || format(date || new Date(), "yyyy-MM-dd");
  const initialAssignedTo = editEvent?.assignedTo || (editEvent?.assignedToType === "child" && editEvent?.childId ? `child:${editEvent.childId}` : "all");

  const [title, setTitle] = useState(editEvent?.title || "");
  const [dateValue, setDateValue] = useState(initialDate);
  const [category, setCategory] = useState(editEvent?.category || "family");
  const [assignedTo, setAssignedTo] = useState(initialAssignedTo);
  const [notes, setNotes] = useState(editEvent?.description || editEvent?.notes || "");
  const [startTime, setStartTime] = useState(parseTimeParts(editEvent?.startTime, "09:00"));
  const [endTime, setEndTime] = useState(parseTimeParts(editEvent?.endTime, "10:00"));
  const [syncWithGoogle, setSyncWithGoogle] = useState(Boolean(editEvent?.googleCalendarEventId || editEvent?.syncWithGoogleCalendar));
  const [saving, setSaving] = useState(false);

  const selectedPerson = personOptions.find((person) => person.value === assignedTo) || personOptions[0];

  const handleSave = async (event) => {
    event.preventDefault();

    if (!user || !familyId) {
      alert("Family profile is still loading. Please try again.");
      return;
    }

    const cleanedTitle = title.trim();
    if (!cleanedTitle) {
      alert("Please enter an event title.");
      return;
    }

    const startTimeValue = to24HourTime(startTime);
    const endTimeValue = to24HourTime(endTime);

    const payload = {
      title: cleanedTitle,
      date: dateValue,
      startTime: startTimeValue,
      endTime: endTimeValue,
      category,
      description: notes.trim(),
      notes: notes.trim(),
      assignedTo,
      assignedToType: selectedPerson.type,
      assignedToName: selectedPerson.label,
      childId: selectedPerson.type === "child" ? selectedPerson.childId : "",
      childName: selectedPerson.type === "child" ? selectedPerson.label : "",
      familyId,
      family_id: familyId,
      module: "family",
      syncWithGoogleCalendar: syncWithGoogle,
      googleCalendarEventId: editEvent?.googleCalendarEventId || "",
      updatedAt: serverTimestamp(),
    };

    setSaving(true);
    try {
      if (isEditing) {
        await updateDoc(doc(db, "familyEvents", editEvent.id), payload);
      } else {
        await addDoc(collection(db, "familyEvents"), {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: user.uid,
        });
      }
      await onSuccess?.();
    } catch (error) {
      console.error("Error saving family event:", error);
      alert(`There was an error saving this event: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-sm md:p-6">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 md:px-6">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-blue-600">
              {isEditing ? "Edit Family Event" : "New Family Event"}
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              {isEditing ? "Update event" : "Create event"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-slate-400">
              Use the tablet-friendly time controls. No Android AM/PM weirdness here.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="overflow-y-auto px-5 py-5 md:px-6">
          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-extrabold text-slate-700">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Baseball practice, doctor appointment, family dinner..."
                  className="h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-900 shadow-sm outline-none transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-700">
                  <CalendarDays className="h-4 w-4" />
                  Date
                </label>
                <input
                  type="date"
                  value={dateValue}
                  onChange={(event) => setDateValue(event.target.value)}
                  className="h-13 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <TimePicker label="Start time" value={startTime} onChange={setStartTime} />
                <TimePicker label="End time" value={endTime} onChange={setEndTime} />
              </div>

              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-700">
                  <StickyNote className="h-4 w-4" />
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Add pickup details, reminders, location, or anything the family should know."
                  rows={5}
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm outline-none transition placeholder:text-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-sm font-extrabold text-slate-700">Category</p>
                <div className="grid grid-cols-2 gap-2">
                  {categoryOptions.map((option) => {
                    const isActive = category === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setCategory(option.value)}
                        className={cn(
                          "flex items-center gap-2 rounded-2xl border px-3 py-3 text-left text-sm font-extrabold transition",
                          isActive
                            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl text-base", isActive ? "bg-white/20" : "bg-blue-50")}>{option.emoji}</span>
                        <span className="truncate">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2 flex items-center gap-2 text-sm font-extrabold text-slate-700">
                  <UserRound className="h-4 w-4" />
                  Person
                </p>
                <div className="space-y-2">
                  {personOptions.map((person) => {
                    const isActive = assignedTo === person.value;
                    const colorKey = person.type === "child" ? "child" : person.value;
                    return (
                      <button
                        key={person.value}
                        type="button"
                        onClick={() => setAssignedTo(person.value)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm font-extrabold transition",
                          isActive
                            ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        )}
                      >
                        <span className={cn("h-8 w-8 rounded-full border-2 border-white shadow-sm", personColors[colorKey]?.dot || personColors.child.dot)} />
                        <span className="min-w-0 flex-1 truncate">{person.label}</span>
                        {isActive && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSyncWithGoogle((current) => !current)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition",
                  syncWithGoogle
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", syncWithGoogle ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400")}>{syncWithGoogle ? <Check className="h-4 w-4" /> : "31"}</span>
                <span>
                  <span className="block text-sm font-black">Sync with Google Calendar</span>
                  <span className="block text-xs font-semibold text-slate-400">Stores the preference now; real Google sync comes next.</span>
                </span>
              </button>
            </div>
          </div>

          <div className="sticky bottom-0 mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white/95 py-4 backdrop-blur md:flex-row md:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving} className="rounded-xl">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="rounded-xl bg-blue-600 text-white hover:bg-blue-700">
              {saving ? "Saving..." : isEditing ? "Save changes" : "Create event"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
