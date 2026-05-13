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
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { cn } from "@/lib/utils";
import { adaptFamilyEvents } from "@/core/events/familyEventAdapter";
import AddFamilyEventDialog from "@/components/calendar/AddFamilyEventDialog";
import FamilyCalendarLegend from "@/components/calendar/family/FamilyCalendarLegend";
import FamilyEventCard from "@/components/calendar/family/FamilyEventCard";

function dateKey(date) {
  return format(date, "yyyy-MM-dd");
}

function familyName(profile) {
  return profile?.family_name || profile?.familyName || profile?.name || "Family";
}

function eventMatchesPerson(event, selectedPersonId) {
  if (!selectedPersonId || selectedPersonId === "family") return true;
  return (event.assignedPersonIds || event.assigned_person_ids || []).includes(selectedPersonId);
}

function eventMatchesCategory(event, selectedCategory) {
  if (!selectedCategory || selectedCategory === "all") return true;
  return event.category === selectedCategory;
}

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

export default function FamilyCalendarView({ viewMode = "month", setViewMode }) {
  const { familyId, profile, familyPeople } = useFamily();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDate, setAddDate] = useState(null);
  const [selectedPersonId, setSelectedPersonId] = useState("family");
  const [selectedCategory, setSelectedCategory] = useState("all");

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

  const daysToRender = viewMode === "week" ? weekDays : viewMode === "day" ? [anchorDate] : monthDays;
  const dayLabels = viewMode === "day" ? [format(anchorDate, "EEEE, MMM d")] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

  return (
    <div className="min-h-full bg-[#f7faff] px-3 pb-6 md:px-6">
      <div className="mx-auto max-w-[1440px] overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-white px-5 py-4 md:px-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.24em] text-blue-500">
                {familyName(profile)}
              </p>
              <div className="mt-1 flex flex-wrap items-end gap-3">
                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  Family Calendar
                </h1>
                <span className="mb-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                  {visibleEvents.length} event{visibleEvents.length === 1 ? "" : "s"} · {format(anchorDate, "MMMM yyyy")}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <button type="button" onClick={goPrevious} className="rounded-xl p-2 text-slate-600 hover:bg-white hover:shadow-sm">
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button type="button" onClick={() => setAnchorDate(new Date())} className="rounded-xl px-4 py-2 text-sm font-black text-slate-700 hover:bg-white hover:shadow-sm">
                  Today
                </button>
                <button type="button" onClick={goNext} className="rounded-xl p-2 text-slate-600 hover:bg-white hover:shadow-sm">
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1">
                {["day", "week", "month"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setViewMode?.(mode)}
                    className={cn(
                      "rounded-xl px-4 py-2 text-sm font-black capitalize transition",
                      viewMode === mode ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              <button type="button" onClick={() => setAddDate(new Date(anchorDate))} className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-95">
                <Plus className="mr-1 inline h-4 w-4" /> Add Event
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <FamilyCalendarLegend people={people} selectedPersonId={selectedPersonId} onSelectPerson={setSelectedPersonId} />

            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
              <CalendarDays className="ml-2 h-4 w-4 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="h-10 rounded-xl border-0 bg-transparent px-2 text-sm font-black text-slate-600 outline-none"
              >
                {categoryOptions.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[520px] items-center justify-center text-sm font-black text-slate-400">Loading family events...</div>
        ) : (
          <div className="bg-[#fbfdff] p-3 md:p-4">
            {viewMode !== "day" && (
              <div className="mb-2 grid grid-cols-7 gap-2 px-1">
                {dayLabels.map((label) => (
                  <div key={label} className="text-center text-xs font-black uppercase tracking-wide text-slate-400">{label}</div>
                ))}
              </div>
            )}

            <div className={cn("grid gap-2", viewMode === "day" ? "grid-cols-1" : "grid-cols-7")}>
              {daysToRender.map((day) => {
                const key = dateKey(day);
                const dayEvents = eventsByDay.get(key) || [];
                const outsideMonth = viewMode === "month" && !isSameMonth(day, anchorDate);
                const today = isToday(day);

                return (
                  <div
                    key={key}
                    className={cn(
                      "group min-h-[148px] rounded-2xl border bg-white p-2 transition hover:border-blue-200 hover:shadow-sm",
                      today ? "border-blue-300 ring-2 ring-blue-100" : "border-slate-200",
                      outsideMonth && "bg-slate-50/70 opacity-60",
                      viewMode === "week" && "min-h-[560px]",
                      viewMode === "day" && "min-h-[620px]"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setAddDate(day)}
                      className="mb-2 flex w-full items-center justify-between rounded-xl px-2 py-1 text-left hover:bg-slate-50"
                    >
                      <span className={cn("text-sm font-black", today ? "text-blue-700" : "text-slate-900")}>{format(day, viewMode === "day" ? "EEEE, MMM d" : "d")}</span>
                      <Plus className="h-4 w-4 text-slate-300 opacity-0 transition group-hover:opacity-100" />
                    </button>

                    <div className="space-y-1.5">
                      {dayEvents.slice(0, viewMode === "month" ? 4 : 16).map((event) => (
                        <FamilyEventCard key={event.id} event={event} people={people} compact={viewMode === "month"} />
                      ))}
                      {dayEvents.length > (viewMode === "month" ? 4 : 16) && (
                        <p className="rounded-xl bg-slate-100 px-2 py-1 text-xs font-black text-slate-500">+{dayEvents.length - (viewMode === "month" ? 4 : 16)} more</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
