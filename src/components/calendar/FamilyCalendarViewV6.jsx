import React, { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  Grid3X3,
  Layers,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { cn } from "@/lib/utils";
import {
  colorClasses,
  familyPersonColorMap,
  getColorMeta,
  normalizeName,
  resolveEventColor,
} from "@/lib/personColorUtils";
import { Button } from "@/components/ui/button";
import AddFamilyEventDialog from "@/components/calendar/AddFamilyEventDialog";

const HOURS = Array.from({ length: 14 }, (_, index) => index + 7);
const HOUR_HEIGHT = 86;
const MIN_EVENT_HEIGHT = 48;

const categoryOptions = [
  { value: "all", label: "All Categories", emoji: "✨" },
  { value: "school", label: "School", emoji: "🎒" },
  { value: "sports", label: "Sports", emoji: "⚾" },
  { value: "doctor", label: "Health", emoji: "🩺" },
  { value: "pickup", label: "Pickup", emoji: "🚗" },
  { value: "birthday", label: "Birthday", emoji: "🎂" },
  { value: "family", label: "Family", emoji: "🏠" },
  { value: "note", label: "Note", emoji: "📝" },
  { value: "other", label: "Other", emoji: "📌" },
];

function parseMinutes(value) {
  if (!value) return null;
  const [hours, minutes = "0"] = value.split(":").map(Number);
  if (Number.isNaN(hours)) return null;
  return hours * 60 + minutes;
}

function displayTime(value) {
  if (!value) return "";
  const [rawHour, rawMinute = "00"] = value.split(":").map(Number);
  const suffix = rawHour >= 12 ? "PM" : "AM";
  const hour = rawHour % 12 || 12;
  return `${hour}:${String(rawMinute).padStart(2, "0")} ${suffix}`;
}

function normalizeEvent(docSnap) {
  const data = docSnap.data();
  const isAllDay = Boolean(data.isAllDay) || (!data.startTime && !data.endTime);
  return {
    id: docSnap.id,
    ...data,
    title: data.title || "Untitled event",
    description: data.description || data.notes || "",
    date: data.date || "",
    startTime: isAllDay ? "" : data.startTime || "",
    endTime: isAllDay ? "" : data.endTime || "",
    category: data.category || "other",
    isAllDay,
    location: data.location || "",
    childName: data.childName || "",
    childId: data.childId || data.child_id || "",
    assignedTo: data.assignedTo || "all",
    assignedToType: data.assignedToType || (data.childName ? "child" : "all"),
    assignedToName: data.assignedToName || data.childName || "",
    assignedToEmail: data.assignedToEmail || data.assigned_to_email || "",
  };
}

function categoryLabel(event) {
  return categoryOptions.find((item) => item.value === event.category)?.label || "Other";
}

function categoryEmoji(event) {
  return categoryOptions.find((item) => item.value === event.category)?.emoji || "📌";
}

function eventPersonLabel(event, dadName, momName) {
  if (event.assignedTo === "dad" || event.assignedToType === "dad") return event.assignedToName || dadName || "Dad";
  if (event.assignedTo === "mom" || event.assignedToType === "mom") return event.assignedToName || momName || "Mom";
  if (event.assignedToType === "child" || event.childName || String(event.assignedTo || "").startsWith("child:")) {
    return event.assignedToName || event.childName || String(event.assignedTo || "").replace("child:", "") || "Child";
  }
  return "Everyone";
}

function eventMatchesPerson(event, filter, people) {
  if (filter === "all") return true;
  if (filter === "everyone") return event.assignedTo === "all" || event.assignedToType === "all";
  if (filter === "dad" || filter === "mom") return event.assignedTo === filter || event.assignedToType === filter;

  const person = people.find((item) => item.value === filter);
  if (!person) return false;

  const values = [
    event.assignedTo,
    event.assignedToName,
    event.assignedToEmail,
    event.childName,
    event.childId,
  ].map(normalizeName);

  const targets = [
    person.value,
    person.label,
    person.email,
    person.childId,
    person.value?.replace("child:", ""),
    person.value?.replace("member:", ""),
  ].map(normalizeName);

  return values.some((value) => value && targets.includes(value));
}

function eventPosition(event) {
  if (event.isAllDay || !event.startTime) return null;
  const start = parseMinutes(event.startTime);
  const end = parseMinutes(event.endTime);
  if (start === null) return null;
  const top = ((start - 7 * 60) / 60) * HOUR_HEIGHT + 6;
  const duration = end && end > start ? end - start : 45;
  const height = Math.max(MIN_EVENT_HEIGHT, (duration / 60) * HOUR_HEIGHT - 8);
  return { top: Math.max(6, top), height };
}

function PersonDot({ color = "blue", size = "h-4 w-4" }) {
  const meta = getColorMeta(color);
  return <span className={cn("shrink-0 rounded-full border border-white shadow-sm", size, meta.dot)} />;
}

function EventPill({ event, profile, compact = false, onSelect }) {
  const colorId = resolveEventColor(event, profile);
  const colors = colorClasses(colorId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(event);
      }}
      className={cn(
        "w-full rounded-xl border px-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        compact ? "py-1" : "py-2",
        colors.bg,
        colors.border
      )}
    >
      <div className="flex items-center gap-1.5">
        <PersonDot color={colorId} />
        <p className="min-w-0 flex-1 truncate text-[11px] font-black text-slate-900">{event.title}</p>
      </div>
      {!compact && <p className="mt-1 truncate text-[10px] font-semibold text-slate-600">{categoryEmoji(event)} {categoryLabel(event)}</p>}
    </button>
  );
}

function TimedEventBlock({ event, profile, onSelect }) {
  const position = eventPosition(event);
  if (!position) return null;

  const colorId = resolveEventColor(event, profile);
  const colors = colorClasses(colorId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(event);
      }}
      className={cn(
        "absolute left-2 right-2 overflow-hidden rounded-xl border p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        colors.bg,
        colors.border
      )}
      style={{ top: position.top, height: position.height }}
    >
      <span className={cn("absolute left-0 top-0 h-full w-1.5", colors.stripe)} />
      <div className="pl-1">
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 line-clamp-2 text-[11px] font-black leading-tight text-slate-900">{event.title}</p>
          <PersonDot color={colorId} />
        </div>
        <p className="mt-1 text-[10px] font-bold text-slate-600">
          {displayTime(event.startTime)}{event.endTime ? ` – ${displayTime(event.endTime)}` : ""}
        </p>
      </div>
    </button>
  );
}

function Legend({ people, activePerson, onSelectPerson }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {people.map((person) => {
        const active = activePerson === person.value;
        return (
          <button
            key={person.value}
            type="button"
            onClick={() => onSelectPerson(active ? "all" : person.value)}
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black transition",
              active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            <PersonDot color={person.color} />
            {person.label}
          </button>
        );
      })}
    </div>
  );
}

function MonthView({ monthDate, events, profile, onAdd, onSelect }) {
  const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="rounded-b-[2rem] bg-white p-3">
      <div className="grid grid-cols-7 gap-2 pb-2">
        {labels.map((label) => <div key={label} className="text-center text-xs font-black uppercase tracking-wide text-slate-500">{label}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const list = events.filter((event) => event.date === format(day, "yyyy-MM-dd"));
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onAdd(day)}
              className={cn(
                "min-h-[132px] rounded-2xl border border-slate-200 bg-white p-2 text-left transition hover:border-blue-200 hover:bg-blue-50/30",
                isToday(day) && "ring-2 ring-blue-400",
                !isSameMonth(day, monthDate) && "opacity-45"
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-black text-slate-800">{format(day, "d")}</span>
                <Plus className="h-4 w-4 text-slate-300" />
              </div>
              <div className="space-y-1">
                {list.slice(0, 3).map((event) => <EventPill key={event.id} event={event} profile={profile} compact onSelect={onSelect} />)}
                {list.length > 3 && <p className="px-1 text-[10px] font-black text-slate-400">+{list.length - 3} more</p>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({ days, events, profile, onAdd, onSelect }) {
  const gridTemplateColumns = `74px repeat(${days.length}, minmax(${days.length === 1 ? "520px" : "130px"}, 1fr))`;
  const allDayEvents = events.filter((event) => event.isAllDay || !event.startTime);
  const timedEvents = events.filter((event) => !event.isAllDay && event.startTime);

  return (
    <div className="overflow-x-auto rounded-b-[2rem] bg-white">
      <div className={days.length === 1 ? "mx-auto w-full max-w-[780px]" : "min-w-[980px]"}>
        <div className="grid border-b border-slate-200" style={{ gridTemplateColumns }}>
          <div className="border-r border-slate-200 bg-white" />
          {days.map((day) => (
            <div key={day.toISOString()} className={cn("border-r border-slate-200 py-4 text-center last:border-r-0", isToday(day) && "bg-blue-50/60")}>
              <p className="text-base font-black text-slate-900">{format(day, "EEE d")}</p>
              <p className="text-xs font-semibold text-slate-500">{format(day, "MMM")}</p>
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns, height: 82 + HOURS.length * HOUR_HEIGHT }}>
          <div className="relative border-r border-slate-200 bg-white">
            <div className="flex h-[82px] items-center justify-center border-b border-slate-200 text-xs font-semibold text-slate-500">All-day</div>
            {HOURS.map((hour) => (
              <div key={hour} className="border-b border-slate-100 pr-2 pt-2 text-right text-sm font-semibold text-slate-500" style={{ height: HOUR_HEIGHT }}>
                {format(new Date(2026, 0, 1, hour), "h a")}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const allDayForDay = allDayEvents.filter((event) => event.date === dayKey);
            const timedForDay = timedEvents.filter((event) => event.date === dayKey);
            return (
              <div key={day.toISOString()} className={cn("relative border-r border-slate-200 last:border-r-0", isToday(day) && "bg-blue-50/30")} onClick={() => onAdd(day)}>
                <div className="space-y-1 overflow-hidden border-b border-slate-200 p-2" style={{ height: 82 }}>
                  {allDayForDay.slice(0, 2).map((event) => <EventPill key={event.id} event={event} profile={profile} compact onSelect={onSelect} />)}
                  {allDayForDay.length > 2 && <p className="px-1 text-[10px] font-black text-slate-400">+{allDayForDay.length - 2} more</p>}
                </div>
                {HOURS.map((hour) => <div key={hour} className="border-b border-slate-100" style={{ height: HOUR_HEIGHT }} />)}
                {timedForDay.map((event) => <TimedEventBlock key={event.id} event={event} profile={profile} onSelect={onSelect} />)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SelectedEventPanel({ event, profile, dadName, momName, onClose, onEdit, onDelete }) {
  if (!event) return null;
  const colorId = resolveEventColor(event, profile);
  const color = getColorMeta(colorId);
  const timeText = event.isAllDay || !event.startTime ? "All day" : `${displayTime(event.startTime)}${event.endTime ? ` – ${displayTime(event.endTime)}` : ""}`;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/20 p-4 md:items-center">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <PersonDot color={colorId} size="h-7 w-7" />
              <span className={cn("rounded-full border px-2 py-1 text-[10px] font-black", color.bg, color.border, color.text)}>
                {eventPersonLabel(event, dadName, momName)}
              </span>
            </div>
            <h3 className="text-xl font-black text-slate-950">{event.title}</h3>
            <p className="mt-1 text-sm font-bold text-slate-500">{event.date} · {timeText}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">
          <p>{categoryEmoji(event)} {categoryLabel(event)}</p>
          {event.description ? <p className="flex gap-2"><StickyNote className="mt-0.5 h-4 w-4 shrink-0" />{event.description}</p> : <p className="text-slate-400">No notes added.</p>}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 border-t pt-4">
          <Button type="button" variant="outline" onClick={() => onEdit(event)} className="gap-2"><Pencil className="h-4 w-4" /> Edit</Button>
          <Button type="button" variant="outline" onClick={() => onDelete(event.id)} className="gap-2 border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"><Trash2 className="h-4 w-4" /> Delete</Button>
        </div>
      </div>
    </div>
  );
}

export default function FamilyCalendarViewV6({ activeCalendar = "family", setActiveCalendar, viewMode = "week", setViewMode }) {
  const { user, familyId, profile, dadName, momName } = useFamily();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [personFilter, setPersonFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [addDate, setAddDate] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { people } = useMemo(() => familyPersonColorMap(profile || {}, user, user?.email || ""), [profile, user]);
  const personOptions = useMemo(() => [
    { value: "all", label: "All", color: "slate" },
    { value: "everyone", label: "Everyone", color: "slate" },
    ...people,
  ], [people]);

  const loadEvents = async () => {
    if (!familyId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const eventsQuery = query(collection(db, "familyEvents"), where("familyId", "==", familyId));
      const snapshot = await getDocs(eventsQuery);
      setEvents(snapshot.docs.map(normalizeEvent));
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
  }, [familyId]);

  const visibleDays = useMemo(() => {
    if (viewMode === "day") return [anchorDate];
    return eachDayOfInterval({ start: startOfWeek(anchorDate, { weekStartsOn: 1 }), end: endOfWeek(anchorDate, { weekStartsOn: 1 }) });
  }, [anchorDate, viewMode]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    const byCategory = categoryFilter === "all" || event.category === categoryFilter;
    const byPerson = eventMatchesPerson(event, personFilter, personOptions);
    return byCategory && byPerson;
  }), [events, categoryFilter, personFilter, personOptions]);

  const handlePrevious = () => {
    if (viewMode === "month") setAnchorDate((date) => subMonths(date, 1));
    else setAnchorDate((date) => addDays(date, viewMode === "day" ? -1 : -7));
  };

  const handleNext = () => {
    if (viewMode === "month") setAnchorDate((date) => addMonths(date, 1));
    else setAnchorDate((date) => addDays(date, viewMode === "day" ? 1 : 7));
  };

  const handleDelete = async (eventId) => {
    const confirmed = window.confirm("Delete this event?");
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "familyEvents", eventId));
      setSelectedEvent(null);
      await loadEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      alert(`Could not delete event: ${error.message}`);
    }
  };

  return (
    <div className="min-h-full bg-[#f8fbff] p-2 md:p-4">
      <div className="mx-auto max-w-none rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white px-4 py-4 md:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><CalendarDays className="h-5 w-5" /></div>
                <div>
                  <p className="text-lg font-black text-slate-950">Family Calendar</p>
                  <p className="text-xs font-semibold text-slate-400">Colors come from Profile → Families</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">{format(anchorDate, viewMode === "month" ? "MMMM yyyy" : "MMM d, yyyy")}</h1>
                <Button type="button" variant="outline" onClick={() => setAnchorDate(new Date())}>Today</Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <button type="button" onClick={handlePrevious} className="flex h-10 w-10 items-center justify-center border-r border-slate-200 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" onClick={handleNext} className="flex h-10 w-10 items-center justify-center hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
              </div>

              <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {[
                  { value: "day", label: "Day" },
                  { value: "week", label: "Week" },
                  { value: "month", label: "Month" },
                ].map((item) => (
                  <button key={item.value} type="button" onClick={() => setViewMode?.(item.value)} className={cn("h-10 border-r border-slate-200 px-3 text-sm font-black last:border-r-0", viewMode === item.value ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50")}>{item.label}</button>
                ))}
              </div>

              <Button type="button" onClick={() => setAddDate(anchorDate)} className="gap-2 bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4" /> Add event</Button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <Legend people={personOptions} activePerson={personFilter} onSelectPerson={setPersonFilter} />
            <div className="flex flex-wrap gap-2">
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600">
                {categoryOptions.map((category) => <option key={category.value} value={category.value}>{category.emoji} {category.label}</option>)}
              </select>
              <select value={activeCalendar} onChange={(e) => setActiveCalendar?.(e.target.value)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600">
                <option value="family">Family</option>
                <option value="custody">Custody</option>
                <option value="all">All</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm font-bold text-slate-400">Loading family events...</div>
        ) : viewMode === "month" ? (
          <MonthView monthDate={anchorDate} events={filteredEvents} profile={profile} onAdd={setAddDate} onSelect={setSelectedEvent} />
        ) : (
          <WeekView days={visibleDays} events={filteredEvents} profile={profile} onAdd={setAddDate} onSelect={setSelectedEvent} />
        )}
      </div>

      {(addDate || editEvent) && (
        <AddFamilyEventDialog
          date={addDate || new Date(`${editEvent?.date || format(new Date(), "yyyy-MM-dd")}T00:00:00`)}
          editEvent={editEvent}
          onClose={() => {
            setAddDate(null);
            setEditEvent(null);
          }}
          onSuccess={() => {
            setAddDate(null);
            setEditEvent(null);
            loadEvents();
          }}
        />
      )}

      <SelectedEventPanel
        event={selectedEvent}
        profile={profile}
        dadName={dadName}
        momName={momName}
        onClose={() => setSelectedEvent(null)}
        onEdit={(event) => {
          setSelectedEvent(null);
          setEditEvent(event);
        }}
        onDelete={handleDelete}
      />
    </div>
  );
}
