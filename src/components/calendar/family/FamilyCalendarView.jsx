import { useEffect, useMemo, useState } from "react";
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
import { CalendarDays, ChevronLeft, ChevronRight, CloudSun, Plus, RefreshCcw, Tag, UserRound } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { cn } from "@/lib/utils";
import { adaptFamilyEvents } from "@/core/events/familyEventAdapter";
import AddFamilyEventDialog from "@/components/calendar/AddFamilyEventDialog";
import FamilyCalendarLegend from "@/components/calendar/family/FamilyCalendarLegend";
import FamilyEventCard from "@/components/calendar/family/FamilyEventCard";

const FAMILY_ASSIGNMENT_ID = "family";
const hours = Array.from({ length: 13 }, (_, index) => index + 7);

const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "school", label: "School" },
  { value: "sports", label: "Sports" },
  { value: "doctor", label: "Health" },
  { value: "pickup", label: "Pickup" },
  { value: "birthday", label: "Birthday" },
  { value: "family", label: "Family" },
  { value: "note", label: "Note" },
  { value: "other", label: "Other" },
];

function dateKey(date) {
  return format(date, "yyyy-MM-dd");
}

function familyName(profile) {
  return profile?.family_name || profile?.familyName || profile?.name || "Family";
}

function eventMatchesPerson(event, selectedPersonId) {
  if (!selectedPersonId || selectedPersonId === FAMILY_ASSIGNMENT_ID) return true;
  return (event.assignedPersonIds || event.assigned_person_ids || []).includes(selectedPersonId);
}

function eventMatchesCategory(event, selectedCategory) {
  if (!selectedCategory || selectedCategory === "all") return true;
  return event.category === selectedCategory;
}

function timeToMinutes(value = "") {
  if (!value) return 9 * 60;
  const [hour = "9", minute = "0"] = String(value).split(":");
  return Number(hour) * 60 + Number(minute);
}

function hourLabel(hour) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour;
  return `${display} ${suffix}`;
}

function calendarRangeLabel(viewMode, anchorDate) {
  if (viewMode === "day") return format(anchorDate, "MMM d, yyyy");
  if (viewMode === "week") {
    const start = startOfWeek(anchorDate, { weekStartsOn: 1 });
    const end = addDays(start, 6);
    return `${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
  }
  return format(anchorDate, "MMMM yyyy");
}

function eventHeight(event = {}) {
  if (event.isAllDay || event.is_all_day) return 24;
  const start = timeToMinutes(event.startTime || event.start_time);
  const end = timeToMinutes(event.endTime || event.end_time) || start + 60;
  return Math.max(44, ((end - start) / 60) * 76);
}

function eventTop(event = {}) {
  if (event.isAllDay || event.is_all_day) return 0;
  const start = timeToMinutes(event.startTime || event.start_time);
  return Math.max(0, ((start - 7 * 60) / 60) * 76);
}

export default function FamilyCalendarView({ viewMode = "week", setViewMode }) {
  const { familyId, profile, familyPeople } = useFamily();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDate, setAddDate] = useState(null);
  const [selectedPersonId, setSelectedPersonId] = useState(FAMILY_ASSIGNMENT_ID);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [now, setNow] = useState(() => new Date());

  const people = familyPeople || [];

  async function loadEvents() {
    if (!familyId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, "familyEvents"), where("familyId", "==", familyId));
      const snap = await getDocs(q);
      const rawEvents = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      setEvents(adaptFamilyEvents(rawEvents, people));
    } catch (error) {
      console.error("Error loading family events", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, people.map((person) => `${person.id}:${person.colorId}`).join("|")]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleEvents = useMemo(
    () => events.filter((event) => eventMatchesPerson(event, selectedPersonId) && eventMatchesCategory(event, selectedCategory)),
    [events, selectedPersonId, selectedCategory]
  );

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [anchorDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchorDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, [anchorDate]);

  const timelineDays = viewMode === "day" ? [anchorDate] : weekDays;

  const eventsByDay = useMemo(() => {
    const map = new Map();
    visibleEvents.forEach((event) => {
      const key = event.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(event);
    });
    return map;
  }, [visibleEvents]);

  function goPrevious() {
    if (viewMode === "month") setAnchorDate((date) => subMonths(date, 1));
    else setAnchorDate((date) => addDays(date, viewMode === "day" ? -1 : -7));
  }

  function goNext() {
    if (viewMode === "month") setAnchorDate((date) => addMonths(date, 1));
    else setAnchorDate((date) => addDays(date, viewMode === "day" ? 1 : 7));
  }

  function renderMonthView() {
    return (
      <div className="border-t border-slate-100 bg-white">
        <div className="grid grid-cols-7 border-b border-slate-100 text-center text-[11px] font-black uppercase tracking-wide text-slate-400">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="py-3">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 bg-slate-100/70">
          {monthDays.map((day) => {
            const key = dateKey(day);
            const dayEvents = eventsByDay.get(key) || [];
            const outsideMonth = !isSameMonth(day, anchorDate);
            const today = isToday(day);
            return (
              <div key={key} className="min-h-[128px] border-b border-r border-slate-100 bg-white p-2 last:border-r-0">
                <button type="button" onClick={() => setAddDate(day)} className="mb-2 flex w-full items-center justify-between">
                  <span className={cn("text-xs font-black", today ? "rounded-full bg-blue-600 px-2 py-1 text-white" : outsideMonth ? "text-slate-300" : "text-slate-800")}>{format(day, "d")}</span>
                  <Plus className="h-3.5 w-3.5 text-slate-300" />
                </button>
                <div className="space-y-1">
                  {dayEvents.slice(0, 4).map((event) => (
                    <FamilyEventCard key={event.id} event={event} people={people} variant="pill" />
                  ))}
                  {dayEvents.length > 4 && <p className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">+{dayEvents.length - 4} more</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderTimelineView() {
    return (
      <div className="border-t border-slate-100 bg-white">
        <div className={cn("grid border-b border-slate-100", viewMode === "day" ? "grid-cols-[72px_1fr]" : "grid-cols-[72px_repeat(7,minmax(0,1fr))]") }>
          <div className="border-r border-slate-100" />
          {timelineDays.map((day) => (
            <div key={dateKey(day)} className="border-r border-slate-100 px-3 py-3 text-center last:border-r-0">
              <p className="text-xs font-black text-slate-400">{format(day, "EEE")}</p>
              <p className={cn("mt-1 text-sm font-black", isToday(day) ? "text-blue-600" : "text-slate-950")}>{format(day, "d")}</p>
              <p className="text-[10px] font-bold text-slate-400">{format(day, "MMM")}</p>
            </div>
          ))}
        </div>

        <div className={cn("grid", viewMode === "day" ? "grid-cols-[72px_1fr]" : "grid-cols-[72px_repeat(7,minmax(0,1fr))]") }>
          <div className="border-r border-slate-100 bg-white">
            <div className="h-9 border-b border-slate-100 px-2 py-2 text-[11px] font-bold text-slate-400">All-day</div>
            {hours.map((hour) => (
              <div key={hour} className="h-[76px] border-b border-slate-100 px-2 pt-2 text-right text-[11px] font-bold text-slate-400">
                {hourLabel(hour)}
              </div>
            ))}
          </div>

          {timelineDays.map((day) => {
            const key = dateKey(day);
            const dayEvents = eventsByDay.get(key) || [];
            const allDayEvents = dayEvents.filter((event) => event.isAllDay || event.is_all_day);
            const timedEvents = dayEvents.filter((event) => !(event.isAllDay || event.is_all_day));
            return (
              <div key={key} className="relative border-r border-slate-100 last:border-r-0">
                <div className="h-9 border-b border-slate-100 p-1">
                  {allDayEvents.slice(0, 1).map((event) => <FamilyEventCard key={event.id} event={event} people={people} variant="pill" />)}
                </div>
                <button type="button" onClick={() => setAddDate(day)} className="absolute right-2 top-2 z-10 rounded-full bg-white/80 p-1 text-slate-300 opacity-0 shadow-sm transition hover:text-blue-600 group-hover:opacity-100">
                  <Plus className="h-3.5 w-3.5" />
                </button>
                <div className="relative h-[988px] bg-white">
                  {hours.map((hour) => <div key={hour} className="h-[76px] border-b border-slate-100" />)}
                  {timedEvents.map((event, index) => (
                    <div key={event.id} className="absolute left-2 right-2" style={{ top: eventTop(event), height: eventHeight(event), transform: `translateX(${(index % 3) * 8}px)`, width: `calc(100% - ${16 + (index % 3) * 8}px)` }}>
                      <FamilyEventCard event={event} people={people} variant="timeline" />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-white pb-24">
      <div className="px-6 pt-5">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-sm font-black text-slate-950">
              <span>🏠</span> Family Wall
            </div>
            <p className="mt-0.5 text-[11px] font-bold text-slate-400">{familyName(profile)}</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">Family Calendar</h1>
            <button type="button" className="mt-4 inline-flex items-center gap-2 text-xl font-black text-slate-800">
              <CalendarDays className="h-5 w-5 text-blue-500" /> {format(anchorDate, "MMMM yyyy")}
            </button>
          </div>

          <div className="text-right">
            <p className="text-2xl font-black text-slate-950">{format(now, "h:mm a")}</p>
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{format(now, "EEE, MMM d")}</p>
            <div className="mt-4 flex items-center justify-end gap-2 text-xs font-bold text-slate-500"><CloudSun className="h-4 w-4" /> --°</div>
            <button type="button" onClick={loadEvents} className="mt-4 inline-flex items-center gap-2 text-xs font-black text-slate-500 hover:text-blue-600"><RefreshCcw className="h-3.5 w-3.5" /> Sync calendar</button>
          </div>
        </div>

        <div className="mt-7 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <FamilyCalendarLegend people={people} selectedPersonId={selectedPersonId} onSelectPerson={setSelectedPersonId} />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 shadow-sm">
              <UserRound className="h-4 w-4 text-slate-400" />
              <span>Person</span>
              <select value={selectedPersonId} onChange={(event) => setSelectedPersonId(event.target.value)} className="bg-transparent text-slate-400 outline-none">
                <option value={FAMILY_ASSIGNMENT_ID}>All</option>
                {people.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
              </select>
            </div>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 shadow-sm">
              <Tag className="h-4 w-4 text-slate-400" />
              <span>Category</span>
              <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="bg-transparent text-slate-400 outline-none">
                {categoryOptions.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-7 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-500">{visibleEvents.length} events · {calendarRangeLabel(viewMode, anchorDate)}</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={goPrevious} className="rounded-full px-3 py-2 text-slate-400 hover:bg-slate-50">‹</button>
            <button type="button" onClick={() => setAnchorDate(new Date())} className="rounded-xl border border-slate-200 bg-white px-6 py-2 text-sm font-black text-slate-700 shadow-sm">Today</button>
            <button type="button" onClick={goNext} className="rounded-full px-3 py-2 text-slate-400 hover:bg-slate-50">›</button>
            <div className="ml-3 flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {["day", "week", "month"].map((mode) => <button key={mode} type="button" onClick={() => setViewMode?.(mode)} className={cn("px-6 py-2 text-sm font-black capitalize", viewMode === mode ? "bg-blue-600 text-white" : "text-slate-700 hover:bg-slate-50")}>{mode}</button>)}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[520px] items-center justify-center text-sm font-black text-slate-400">Loading family events...</div>
      ) : (
        <div className="mt-5 border-t border-slate-100">
          {viewMode === "month" ? renderMonthView() : renderTimelineView()}
        </div>
      )}

      <button type="button" onClick={() => setAddDate(new Date(anchorDate))} className="fixed bottom-24 right-8 z-[90] flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-4xl font-light leading-none text-white shadow-xl shadow-blue-600/30 transition hover:scale-105 hover:bg-blue-700 active:scale-95 md:bottom-8" aria-label="Add event">+</button>

      {addDate && (
        <AddFamilyEventDialog
          date={addDate}
          onClose={() => setAddDate(null)}
          onSuccess={() => {
            setAddDate(null);
            loadEvents();
          }}
        />
      )}
    </div>
  );
}
