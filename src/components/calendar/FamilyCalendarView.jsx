import React, { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  UserRound,
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
    assignedTo: data.assignedTo || "",
    assignedToType: data.assignedToType || (data.childName ? "child" : "all"),
    assignedToName: data.assignedToName || data.childName || "",
  };
}

function getAssignedLabel(event) {
  if (event.assignedToType === "dad")
    return `👨 ${event.assignedToName || "Papá"}`;
  if (event.assignedToType === "mom")
    return `👩 ${event.assignedToName || "Mamá"}`;
  if (event.assignedToType === "child")
    return `👶 ${event.assignedToName || event.childName}`;
  return "👨‍👩‍👧‍👦 Family";
}

function EventCard({ event, onDelete, onEdit, canWrite, compact = false }) {
  const config = categoryConfig[event.category] || categoryConfig.other;

  return (
    <Card
      className={cn(
        "hover:shadow-sm transition group",
        compact ? "p-2" : "p-3"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("w-2 h-2 rounded-full mt-2", config.dot)} />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "font-bold leading-tight truncate",
                compact ? "text-xs" : "text-sm"
              )}
            >
              {event.title}
            </p>

            {canWrite && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => onEdit(event)}
                  className="text-muted-foreground hover:text-foreground"
                  title="Edit event"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onDelete(event.id)}
                  className="text-destructive"
                  title="Delete event"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full border font-semibold",
                config.chip
              )}
            >
              {config.emoji} {compact ? "" : config.label}
            </span>

            {!compact && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold inline-flex items-center gap-1">
                <UserRound className="w-3 h-3" />
                {getAssignedLabel(event)}
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

          {!compact && event.location && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <MapPin className="w-3.5 h-3.5" />
              <span className="truncate">{event.location}</span>
            </div>
          )}

          {!compact && event.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {event.description}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function DayColumn({ day, events, onAdd, onDelete, onEdit, canWrite }) {
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
            onEdit={onEdit}
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

function DayAgendaView({ day, events, onAdd, onDelete, onEdit, canWrite }) {
  return (
    <div className="max-w-3xl mx-auto w-full">
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Selected Day
            </p>
            <h2 className="text-2xl font-bold font-heading">
              {format(day, "EEEE, MMMM d")}
            </h2>
          </div>

          {canWrite && (
            <Button onClick={() => onAdd(day)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Add Event
            </Button>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onDelete={onDelete}
            onEdit={onEdit}
            canWrite={canWrite}
          />
        ))}

        {events.length === 0 && (
          <Card className="p-8 text-center border-dashed">
            <p className="text-muted-foreground">
              No family events for this day.
            </p>
            {canWrite && (
              <Button
                variant="outline"
                className="mt-4 gap-1.5"
                onClick={() => onAdd(day)}
              >
                <Plus className="w-4 h-4" />
                Add first event
              </Button>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

function MonthGridView({
  monthDate,
  events,
  onAdd,
  onDelete,
  onEdit,
  canWrite,
}) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getEventsForDay = (day) => {
    const key = format(day, "yyyy-MM-dd");
    return events.filter((event) => event.date === key);
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekLabels.map((label) => (
          <div
            key={label}
            className="text-center text-[10px] sm:text-xs font-bold text-muted-foreground uppercase py-1"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = getEventsForDay(day);
          const today = isToday(day);
          const inMonth = isSameMonth(day, monthDate);

          return (
            <div
              key={key}
              className={cn(
                "rounded-xl border min-h-[105px] p-1.5 bg-card overflow-hidden",
                today && "ring-2 ring-primary ring-offset-1",
                !inMonth && "opacity-40 bg-muted/30"
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center",
                    today
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground"
                  )}
                >
                  {format(day, "d")}
                </span>

                {canWrite && (
                  <button
                    onClick={() => onAdd(day)}
                    className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-primary"
                    title="Add event"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 2).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onDelete={onDelete}
                    onEdit={onEdit}
                    canWrite={canWrite}
                    compact
                  />
                ))}

                {dayEvents.length > 2 && (
                  <p className="text-[10px] text-muted-foreground font-semibold px-1">
                    +{dayEvents.length - 2} more
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function FamilyCalendarView({ viewMode = "week" }) {
  const { user, familyId, perms } = useFamily();

  const [anchorDate, setAnchorDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDate, setAddDate] = useState(null);
  const [editEvent, setEditEvent] = useState(null);

  const canRead = perms?.calendar?.read !== false;
  const canWrite = perms?.calendar?.write !== false;

  const weekStart = startOfWeek(anchorDate);
  const weekEnd = addDays(weekStart, 6);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }, [weekStart]);

  const dateRange = useMemo(() => {
    if (viewMode === "day") {
      const key = format(anchorDate, "yyyy-MM-dd");
      return { startKey: key, endKey: key };
    }

    if (viewMode === "month") {
      const start = startOfWeek(startOfMonth(anchorDate));
      const end = endOfWeek(endOfMonth(anchorDate));
      return {
        startKey: format(start, "yyyy-MM-dd"),
        endKey: format(end, "yyyy-MM-dd"),
      };
    }

    return {
      startKey: format(weekStart, "yyyy-MM-dd"),
      endKey: format(weekEnd, "yyyy-MM-dd"),
    };
  }, [anchorDate, viewMode, weekStart, weekEnd]);

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

      const data = snap.docs
        .map(normalizeEvent)
        .filter(
          (event) =>
            event.date >= dateRange.startKey && event.date <= dateRange.endKey
        );

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
  }, [user?.uid, familyId, canRead, dateRange.startKey, dateRange.endKey]);

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

  const goPrevious = () => {
    if (viewMode === "day") setAnchorDate(addDays(anchorDate, -1));
    else if (viewMode === "month") setAnchorDate(subMonths(anchorDate, 1));
    else setAnchorDate(addDays(anchorDate, -7));
  };

  const goNext = () => {
    if (viewMode === "day") setAnchorDate(addDays(anchorDate, 1));
    else if (viewMode === "month") setAnchorDate(addMonths(anchorDate, 1));
    else setAnchorDate(addDays(anchorDate, 7));
  };

  const title = (() => {
    if (viewMode === "day") return format(anchorDate, "MMM d, yyyy");
    if (viewMode === "month") return format(anchorDate, "MMMM yyyy");
    return `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`;
  })();

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
            {loading ? "Loading events..." : `${events.length} events`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={goPrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <span className="text-sm font-semibold font-heading min-w-[145px] text-center">
            {title}
          </span>

          <Button variant="outline" size="icon" onClick={goNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button variant="outline" onClick={() => setAnchorDate(new Date())}>
            Today
          </Button>

          {canWrite && (
            <Button onClick={() => setAddDate(anchorDate)} className="gap-1.5">
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
        <>
          {viewMode === "day" && (
            <DayAgendaView
              day={anchorDate}
              events={getEventsForDate(anchorDate)}
              onAdd={(selectedDay) => setAddDate(selectedDay)}
              onDelete={deleteEvent}
              onEdit={(event) => setEditEvent(event)}
              canWrite={canWrite}
            />
          )}

          {viewMode === "week" && (
            <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
              {weekDays.map((day) => (
                <DayColumn
                  key={day.toISOString()}
                  day={day}
                  events={getEventsForDate(day)}
                  onAdd={(selectedDay) => setAddDate(selectedDay)}
                  onDelete={deleteEvent}
                  onEdit={(event) => setEditEvent(event)}
                  canWrite={canWrite}
                />
              ))}
            </div>
          )}

          {viewMode === "month" && (
            <MonthGridView
              monthDate={anchorDate}
              events={events}
              onAdd={(selectedDay) => setAddDate(selectedDay)}
              onDelete={deleteEvent}
              onEdit={(event) => setEditEvent(event)}
              canWrite={canWrite}
            />
          )}
        </>
      )}

      {(addDate || editEvent) && (
        <AddFamilyEventDialog
          date={addDate || new Date(editEvent?.date || new Date())}
          editEvent={editEvent}
          onClose={() => {
            setAddDate(null);
            setEditEvent(null);
          }}
          onSuccess={async () => {
            await loadEvents();
            setAddDate(null);
            setEditEvent(null);
          }}
        />
      )}
    </div>
  );
}
