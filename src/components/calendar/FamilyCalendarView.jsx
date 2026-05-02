import React, { useEffect, useMemo, useState } from "react";
import { addDays, format, isToday, startOfWeek } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import AddFamilyEventDialog from "@/components/calendar/AddFamilyEventDialog";

const categoryConfig = {
  school: {
    label: "School",
    emoji: "🎒",
    chip: "bg-blue-100 text-blue-800 border-blue-200",
    dot: "bg-blue-500",
  },
  sports: {
    label: "Sports",
    emoji: "⚾",
    chip: "bg-green-100 text-green-800 border-green-200",
    dot: "bg-green-500",
  },
  doctor: {
    label: "Doctor",
    emoji: "🩺",
    chip: "bg-red-100 text-red-800 border-red-200",
    dot: "bg-red-500",
  },
  pickup: {
    label: "Pickup",
    emoji: "🚗",
    chip: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "bg-amber-500",
  },
  birthday: {
    label: "Birthday",
    emoji: "🎂",
    chip: "bg-pink-100 text-pink-800 border-pink-200",
    dot: "bg-pink-500",
  },
  family: {
    label: "Family",
    emoji: "👨‍👩‍👧‍👦",
    chip: "bg-violet-100 text-violet-800 border-violet-200",
    dot: "bg-violet-500",
  },
  note: {
    label: "Note",
    emoji: "📝",
    chip: "bg-slate-100 text-slate-800 border-slate-200",
    dot: "bg-slate-500",
  },
  other: {
    label: "Other",
    emoji: "📌",
    chip: "bg-gray-100 text-gray-800 border-gray-200",
    dot: "bg-gray-500",
  },
};

function normalizeEvent(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    ...data,
    title: data.title || "",
    description: data.description || data.notes || "",
    date: data.date || "",
    startTime: data.startTime || "",
    endTime: data.endTime || "",
    category: data.category || "other",
    childName: data.childName || "",
    location: data.location || "",
  };
}

function EventCard({ event, onDelete, canWrite }) {
  const config = categoryConfig[event.category] || categoryConfig.other;

  return (
    <Card className="p-3 hover:shadow-sm transition group">
      <div className="flex items-start gap-3">
        <div className={cn("w-2 h-2 rounded-full mt-2", config.dot)} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-sm leading-tight truncate">
              {event.title}
            </p>

            {canWrite && (
              <button
                onClick={() => onDelete(event.id)}
                className="opacity-0 group-hover:opacity-100 text-destructive transition-opacity shrink-0"
                title="Delete event"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border font-semibold",
                config.chip
              )}
            >
              {config.emoji} {config.label}
            </span>

            {event.childName && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                {event.childName}
              </span>
            )}
          </div>

          {(event.startTime || event.endTime) && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {event.startTime || "Any time"}
                {event.endTime ? ` – ${event.endTime}` : ""}
              </span>
            </div>
          )}

          {event.location && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {event.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function DayColumn({ day, events, onAdd, onDelete, canWrite }) {
  const today = isToday(day);

  return (
    <div
      className={cn(
        "flex-shrink-0 w-[220px] rounded-2xl border p-3 flex flex-col min-h-[460px]",
        today ? "bg-primary/5 border-primary/40" : "bg-muted/25 border-border"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <div
            className={cn(
              "inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-bold",
              today
                ? "bg-primary text-primary-foreground"
                : "bg-background border text-foreground"
            )}
          >
            {format(day, "EEE")}
          </div>

          <p className="text-xs text-muted-foreground mt-1 ml-1">
            {format(day, "MMM d")}
          </p>
        </div>

        {canWrite && (
          <button
            onClick={() => onAdd(day)}
            className="w-8 h-8 rounded-full bg-background border flex items-center justify-center hover:border-primary hover:text-primary transition"
            title="Add event"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-2 flex-1">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onDelete={onDelete}
            canWrite={canWrite}
          />
        ))}

        {events.length === 0 && (
          <div className="border border-dashed rounded-xl p-4 text-center text-xs text-muted-foreground">
            No events
          </div>
        )}
      </div>
    </div>
  );
}

export default function FamilyCalendarView() {
  const { user, familyId, perms } = useFamily();

  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDate, setAddDate] = useState(null);

  const canRead = perms?.calendar?.read !== false;
  const canWrite = perms?.calendar?.write !== false;

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }, [weekStart]);

  const weekEnd = addDays(weekStart, 6);

  const loadEvents = async () => {
    if (!user || !familyId || !canRead) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let snap;

      try {
        const q = query(
          collection(db, "familyEvents"),
          where("familyId", "==", familyId)
        );

        snap = await getDocs(q);
      } catch (error) {
        console.warn("Fallback familyEvents query by family_id:", error);

        const q = query(
          collection(db, "familyEvents"),
          where("family_id", "==", familyId)
        );

        snap = await getDocs(q);
      }

      const startKey = format(weekStart, "yyyy-MM-dd");
      const endKey = format(weekEnd, "yyyy-MM-dd");

      const data = snap.docs
        .map(normalizeEvent)
        .filter((event) => event.date >= startKey && event.date <= endKey);

      data.sort((a, b) => {
        const dateCompare = (a.date || "").localeCompare(b.date || "");
        if (dateCompare !== 0) return dateCompare;

        return (a.startTime || "").localeCompare(b.startTime || "");
      });

      setEvents(data);
    } catch (error) {
      console.error("Error loading family events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, familyId, canRead, weekStart]);

  const deleteEvent = async (id) => {
    if (!canWrite) return;

    const confirmDelete = window.confirm("Delete this family event?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "familyEvents", id));
      await loadEvents();
    } catch (error) {
      console.error("Error deleting family event:", error);
      alert(`There was an error deleting the event: ${error.message}`);
    }
  };

  const getEventsForDate = (day) => {
    const key = format(day, "yyyy-MM-dd");
    return events.filter((event) => event.date === key);
  };

  if (!canRead) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold font-heading mb-2">
          Family Calendar
        </h1>
        <p className="text-muted-foreground">
          You do not have access to family events for this family.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold font-heading">
            Family Calendar
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? "Loading events..."
              : `${events.length} events this week`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <span className="text-sm font-semibold font-heading min-w-[145px] text-center">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}
          </span>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {canWrite && (
            <Button onClick={() => setAddDate(new Date())} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
          {weekDays.map((day) => (
            <DayColumn
              key={day.toISOString()}
              day={day}
              events={getEventsForDate(day)}
              onAdd={(selectedDay) => setAddDate(selectedDay)}
              onDelete={deleteEvent}
              canWrite={canWrite}
            />
          ))}
        </div>
      )}

      {addDate && (
        <AddFamilyEventDialog
          date={addDate}
          onClose={() => setAddDate(null)}
          onSuccess={async () => {
            await loadEvents();
            setAddDate(null);
          }}
        />
      )}
    </div>
  );
}
