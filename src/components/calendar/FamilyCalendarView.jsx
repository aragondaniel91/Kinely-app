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
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  Filter,
  Grid3X3,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UserRound,
  UsersRound,
  X,
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
import AddFamilyEventDialog from "@/components/calendar/AddFamilyEventDialog";

const HOURS = Array.from({ length: 15 }, (_, index) => index + 7);
const HOUR_HEIGHT = 92;
const ALL_DAY_HEIGHT = 54;
const MIN_EVENT_HEIGHT = 54;

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

const moduleOptions = [
  { value: "all", label: "All Modules" },
  { value: "family", label: "Family Calendar" },
  { value: "custody", label: "Custody" },
  { value: "tasks", label: "Tasks" },
  { value: "meals", label: "Meals" },
  { value: "grocery", label: "Grocery" },
  { value: "notes", label: "Notes" },
];

const categoryConfig = categoryOptions.reduce((acc, item) => {
  if (item.value !== "all") acc[item.value] = { label: item.label };
  return acc;
}, {});

categoryConfig.other = categoryConfig.other || { label: "Other" };

const personColors = {
  dad: {
    dot: "bg-blue-400",
    border: "border-blue-300",
    bg: "bg-blue-50",
    stripe: "bg-blue-500",
    ring: "ring-blue-200",
  },
  mom: {
    dot: "bg-amber-300",
    border: "border-amber-300",
    bg: "bg-amber-50",
    stripe: "bg-amber-400",
    ring: "ring-amber-200",
  },
  child: {
    dot: "bg-emerald-400",
    border: "border-emerald-300",
    bg: "bg-emerald-50",
    stripe: "bg-emerald-500",
    ring: "ring-emerald-200",
  },
  all: {
    dot: "bg-gradient-to-r from-blue-400 via-amber-300 to-emerald-400",
    border: "border-amber-200",
    bg: "bg-orange-50",
    stripe: "bg-gradient-to-b from-blue-500 via-amber-400 to-emerald-500",
    ring: "ring-amber-200",
  },
};

function getChildName(child) {
  if (!child) return "";
  if (typeof child === "string") return child;
  return (
    child.name ||
    child.displayName ||
    child.fullName ||
    child.firstName ||
    child.childName ||
    ""
  );
}

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
    module: data.module || data.moduleType || "family",
    childName: data.childName || "",
    assignedTo: data.assignedTo || "",
    assignedToType: data.assignedToType || (data.childName ? "child" : "all"),
    assignedToName: data.assignedToName || data.childName || "",
    googleCalendarEventId: data.googleCalendarEventId || data.googleEventId || "",
  };
}

function getPersonKey(event) {
  if (event.assignedTo === "dad" || event.assignedToType === "dad") return "dad";
  if (event.assignedTo === "mom" || event.assignedToType === "mom") return "mom";
  if (
    event.assignedToType === "child" ||
    String(event.assignedTo || "").startsWith("child:")
  ) {
    return "child";
  }
  return "all";
}

function getPersonLabel(event, fallbackChildName = "Joaquín") {
  const key = getPersonKey(event);
  if (key === "dad") return event.assignedToName || "Dad";
  if (key === "mom") return event.assignedToName || "Mom";
  if (key === "child") return event.assignedToName || event.childName || fallbackChildName;
  return "Everyone";
}

function getCategoryLabel(event) {
  return categoryConfig[event.category]?.label || categoryConfig.other.label;
}

function getModuleLabel(value) {
  return moduleOptions.find((option) => option.value === value)?.label || "Family Calendar";
}

function parseTimeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes = "0"] = value.split(":").map(Number);
  if (Number.isNaN(hours)) return null;
  return hours * 60 + minutes;
}

function formatDisplayTime(value) {
  if (!value) return "";
  try {
    return format(parse(value, "HH:mm", new Date()), "h:mm a");
  } catch {
    return value;
  }
}

function getEventPosition(event) {
  const start = parseTimeToMinutes(event.startTime);
  const end = parseTimeToMinutes(event.endTime);
  if (start === null) return null;
  const top = ALL_DAY_HEIGHT + ((start - 7 * 60) / 60) * HOUR_HEIGHT + 4;
  const duration = end && end > start ? end - start : 45;
  const height = Math.max(MIN_EVENT_HEIGHT, (duration / 60) * HOUR_HEIGHT - 8);
  return { top: Math.max(ALL_DAY_HEIGHT + 4, top), height };
}

function isTimedEvent(event) {
  return Boolean(event.startTime);
}

function PersonChips({ personKey, size = "sm" }) {
  const chipClass = cn(
    "rounded-full border border-white shadow-sm",
    size === "xs" ? "h-4 w-4" : "h-5 w-5"
  );

  if (personKey === "all") {
    return (
      <div className="flex items-center -space-x-1">
        <span className={cn(chipClass, personColors.dad.dot)} />
        <span className={cn(chipClass, personColors.mom.dot)} />
        <span className={cn(chipClass, personColors.child.dot)} />
      </div>
    );
  }

  return <span className={cn(chipClass, personColors[personKey]?.dot)} />;
}

function EventBlock({ event, selected, onSelect, fallbackChildName }) {
  const personKey = getPersonKey(event);
  const colors = personColors[personKey] || personColors.all;
  const position = getEventPosition(event);
  if (!position) return null;

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
        colors.border,
        selected && "ring-2",
        selected && colors.ring
      )}
      style={{ top: position.top, height: position.height }}
      title={event.title}
    >
      <span className={cn("absolute left-0 top-0 h-full w-1.5", colors.stripe)} />
      <div className="pl-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-[11px] font-extrabold leading-tight text-slate-900 md:text-xs">
            {event.title}
          </p>
          <PersonChips personKey={personKey} size="xs" />
        </div>
        <p className="mt-1 text-[10px] font-semibold text-slate-700 md:text-[11px]">
          {formatDisplayTime(event.startTime)}
          {event.endTime ? ` – ${formatDisplayTime(event.endTime)}` : ""}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-slate-600">
          {getCategoryLabel(event)}
        </p>
        {event.description && position.height > 88 && (
          <p className="mt-1 line-clamp-2 text-[10px] text-slate-500">
            {event.description}
          </p>
        )}
        <span className="sr-only">{getPersonLabel(event, fallbackChildName)}</span>
      </div>
    </button>
  );
}

function AllDayEvent({ event, onSelect, fallbackChildName }) {
  const personKey = getPersonKey(event);
  const colors = personColors[personKey] || personColors.all;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(event);
      }}
      className={cn(
        "w-full rounded-lg border px-2 py-1 text-left shadow-sm transition hover:shadow-md",
        colors.bg,
        colors.border
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[10px] font-extrabold text-slate-900">
          {event.title}
        </p>
        <PersonChips personKey={personKey} size="xs" />
      </div>
      <p className="truncate text-[9px] text-slate-600">
        {getCategoryLabel(event)} · {getPersonLabel(event, fallbackChildName)}
      </p>
    </button>
  );
}

function FilterDropdown({ icon: Icon, label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) || options[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm hover:bg-slate-50"
      >
        <Icon className="h-4 w-4" />
        <span>{label}</span>
        <span className="hidden text-xs font-semibold text-slate-400 md:inline">
          {selected.label}
        </span>
        <ChevronRight className="h-3.5 w-3.5 rotate-90" />
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-[100] w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-bold transition",
                value === option.value
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {option.label}
              {value === option.value && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ToolbarButton({ children, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 min-w-[76px] border-r border-slate-200 px-4 text-sm font-bold transition last:border-r-0",
        active ? "bg-blue-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  );
}

function Legend({ dadName, momName, childName }) {
  const items = [
    { key: "dad", label: dadName || "Dad" },
    { key: "mom", label: momName || "Mom" },
    { key: "child", label: childName || "Joaquín" },
    { key: "all", label: "Everyone" },
  ];

  return (
    <div className="flex flex-wrap items-center gap-5">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-2">
          <span className={cn("h-4 w-4 rounded-full", personColors[item.key].dot)} />
          <span className="text-sm font-semibold text-slate-700">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function WeekGrid({ days, events, onAdd, onSelect, selectedEvent, fallbackChildName }) {
  const timedEvents = events.filter(isTimedEvent);
  const allDayEvents = events.filter((event) => !isTimedEvent(event));
  const isSingleDay = days.length === 1;
  const gridTemplateColumns = `74px repeat(${days.length}, minmax(${isSingleDay ? "520px" : "126px"}, 1fr))`;

  const getEventsForDay = (day, eventList) => {
    const key = format(day, "yyyy-MM-dd");
    return eventList.filter((event) => event.date === key);
  };

  return (
    <div className={cn("relative overflow-x-auto rounded-b-[2rem] bg-white", isSingleDay && "flex justify-center")}>
      <div className={cn(isSingleDay ? "w-full max-w-[760px]" : "min-w-[980px]")}>
        <div className="grid border-b border-slate-200" style={{ gridTemplateColumns }}>
          <div className="border-r border-slate-200 bg-white" />
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={cn(
                "border-r border-slate-200 py-4 text-center last:border-r-0",
                isToday(day) && "bg-blue-50/60"
              )}
            >
              <p className="text-base font-extrabold text-slate-900">{format(day, "EEE d")}</p>
              <p className="text-xs font-semibold text-slate-500">{format(day, "MMM")}</p>
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns, height: ALL_DAY_HEIGHT + HOURS.length * HOUR_HEIGHT }}>
          <div className="relative border-r border-slate-200 bg-white">
            <div className="flex items-center justify-center border-b border-slate-200 text-xs font-semibold text-slate-500" style={{ height: ALL_DAY_HEIGHT }}>
              All-day
            </div>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="border-b border-slate-100 pr-2 pt-2 text-right text-sm font-semibold text-slate-500"
                style={{ height: HOUR_HEIGHT }}
              >
                {format(new Date(2026, 0, 1, hour), "h a")}
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dayTimedEvents = getEventsForDay(day, timedEvents);
            const dayAllDayEvents = getEventsForDay(day, allDayEvents);

            return (
              <div
                key={day.toISOString()}
                className={cn("relative border-r border-slate-200 last:border-r-0", isToday(day) && "bg-blue-50/30")}
                onClick={() => onAdd(day)}
              >
                <div className="space-y-1 border-b border-slate-200 p-2" style={{ height: ALL_DAY_HEIGHT }}>
                  {dayAllDayEvents.slice(0, 1).map((event) => (
                    <AllDayEvent key={event.id} event={event} onSelect={onSelect} fallbackChildName={fallbackChildName} />
                  ))}
                </div>
                {HOURS.map((hour) => (
                  <div key={hour} className="border-b border-slate-100" style={{ height: HOUR_HEIGHT }} />
                ))}
                {dayTimedEvents.map((event) => (
                  <EventBlock
                    key={event.id}
                    event={event}
                    selected={selectedEvent?.id === event.id}
                    onSelect={onSelect}
                    fallbackChildName={fallbackChildName}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthView({ monthDate, events, onAdd, onSelect, fallbackChildName }) {
  const monthStart = startOfMonth(monthDate);
  const monthEnd = endOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const weekLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const getEventsForDay = (day) => {
    const key = format(day, "yyyy-MM-dd");
    return events.filter((event) => event.date === key);
  };

  return (
    <div className="rounded-b-[2rem] bg-white p-3">
      <div className="grid grid-cols-7 gap-2 pb-2">
        {weekLabels.map((label) => (
          <div key={label} className="text-center text-xs font-extrabold uppercase tracking-wide text-slate-500">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayEvents = getEventsForDay(day);
          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => onAdd(day)}
              className={cn(
                "min-h-[128px] rounded-2xl border border-slate-200 bg-white p-2 text-left transition hover:border-blue-200 hover:bg-blue-50/30",
                isToday(day) && "ring-2 ring-blue-400",
                !isSameMonth(day, monthDate) && "opacity-45"
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-extrabold text-slate-800">
                  {format(day, "d")}
                </span>
                <Plus className="h-4 w-4 text-slate-300" />
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => {
                  const personKey = getPersonKey(event);
                  const colors = personColors[personKey] || personColors.all;
                  return (
                    <div
                      key={event.id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(event);
                      }}
                      className={cn("rounded-lg border px-2 py-1 text-[10px] font-bold", colors.bg, colors.border)}
                    >
                      <div className="flex items-center gap-1">
                        <PersonChips personKey={personKey} size="xs" />
                        <span className="truncate">{event.title}</span>
                      </div>
                      <span className="sr-only">{getPersonLabel(event, fallbackChildName)}</span>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <p className="px-1 text-[10px] font-bold text-slate-400">+{dayEvents.length - 3} more</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectedEventPopover({ event, onClose, onEdit, onDelete, fallbackChildName }) {
  if (!event) return null;
  const personKey = getPersonKey(event);
  const colors = personColors[personKey] || personColors.all;

  return (
    <div className="fixed inset-x-4 bottom-24 z-[90] mx-auto max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl lg:absolute lg:bottom-auto lg:left-1/2 lg:top-[58%] lg:-translate-x-1/2">
      <div className="absolute -top-3 left-1/2 hidden h-6 w-6 -translate-x-1/2 rotate-45 border-l border-t border-slate-200 bg-white lg:block" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold text-slate-950">{event.title}</h3>
            <p className="mt-1 text-sm font-medium text-slate-600">
              {event.date ? format(new Date(`${event.date}T00:00:00`), "EEE, MMM d") : ""}
              {event.startTime ? ` • ${formatDisplayTime(event.startTime)}` : ""}
              {event.endTime ? ` – ${formatDisplayTime(event.endTime)}` : ""}
            </p>
            <p className="mt-1 text-sm text-slate-500">{getCategoryLabel(event)} · {getModuleLabel(event.module)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full px-2 py-1 text-sm font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            ×
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className={cn("h-8 w-8 rounded-full", colors.dot)} />
          <span className="text-sm font-semibold text-slate-700">{getPersonLabel(event, fallbackChildName)}</span>
          {event.googleCalendarEventId && (
            <span className="ml-auto rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Google synced</span>
          )}
        </div>
        {event.description && <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{event.description}</p>}
        <div className="mt-5 grid grid-cols-4 gap-2 border-t pt-4">
          <button type="button" className="flex flex-col items-center gap-1 rounded-2xl p-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Eye className="h-4 w-4" />Details</button>
          <button type="button" onClick={() => onEdit(event)} className="flex flex-col items-center gap-1 rounded-2xl p-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Pencil className="h-4 w-4" />Edit</button>
          <button type="button" className="flex flex-col items-center gap-1 rounded-2xl p-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Copy className="h-4 w-4" />Duplicate</button>
          <button type="button" onClick={() => onDelete(event.id)} className="flex flex-col items-center gap-1 rounded-2xl p-2 text-xs font-semibold text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" />Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function FamilyCalendarView({ viewMode = "week", setViewMode, showFilters = true, setShowFilters }) {
  const { user, familyId, perms, children, dadName, momName } = useFamily();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDate, setAddDate] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [personFilter, setPersonFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [moduleFilter, setModuleFilter] = useState("all");

  const canRead = perms?.calendar?.read !== false;
  const canWrite = perms?.calendar?.write !== false;
  const fallbackChildName = useMemo(() => (children || []).map(getChildName).find(Boolean) || "Joaquín", [children]);
  const personOptions = useMemo(
    () => [
      { value: "all", label: "All People" },
      { value: "dad", label: dadName || "Dad" },
      { value: "mom", label: momName || "Mom" },
      { value: "child", label: fallbackChildName },
      { value: "everyone", label: "Everyone" },
    ],
    [dadName, momName, fallbackChildName]
  );

  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);
  const dateRange = useMemo(() => {
    if (viewMode === "day") {
      const key = format(anchorDate, "yyyy-MM-dd");
      return { startKey: key, endKey: key };
    }
    if (viewMode === "month") {
      const start = startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 1 });
      const end = endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 1 });
      return { startKey: format(start, "yyyy-MM-dd"), endKey: format(end, "yyyy-MM-dd") };
    }
    return { startKey: format(weekStart, "yyyy-MM-dd"), endKey: format(weekEnd, "yyyy-MM-dd") };
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
        snap = await getDocs(query(collection(db, "familyEvents"), where("familyId", "==", familyId)));
      } catch (error) {
        console.warn("Fallback familyEvents query by family_id:", error);
        snap = await getDocs(query(collection(db, "familyEvents"), where("family_id", "==", familyId)));
      }
      const data = snap.docs
        .map(normalizeEvent)
        .filter((event) => event.date >= dateRange.startKey && event.date <= dateRange.endKey)
        .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.startTime || "").localeCompare(b.startTime || ""));
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

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const personKey = getPersonKey(event);
      const matchesPerson = personFilter === "all" || (personFilter === "everyone" ? personKey === "all" : personKey === personFilter);
      const matchesCategory = categoryFilter === "all" || event.category === categoryFilter;
      const matchesModule = moduleFilter === "all" || event.module === moduleFilter;
      return matchesPerson && matchesCategory && matchesModule;
    });
  }, [events, personFilter, categoryFilter, moduleFilter]);

  const activeFilterCount = [personFilter, categoryFilter, moduleFilter].filter((value) => value !== "all").length;
  const title = viewMode === "day" ? format(anchorDate, "MMMM d, yyyy") : viewMode === "month" ? format(anchorDate, "MMMM yyyy") : `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`;

  const deleteEvent = async (id) => {
    if (!canWrite || !window.confirm("Delete this family event?")) return;
    try {
      await deleteDoc(doc(db, "familyEvents", id));
      setSelectedEvent(null);
      await loadEvents();
    } catch (error) {
      console.error("Error deleting family event:", error);
      alert(`There was an error deleting the event: ${error.message}`);
    }
  };

  const goPrevious = () => {
    setSelectedEvent(null);
    if (viewMode === "day") setAnchorDate(addDays(anchorDate, -1));
    else if (viewMode === "month") setAnchorDate(subMonths(anchorDate, 1));
    else setAnchorDate(addDays(anchorDate, -7));
  };
  const goNext = () => {
    setSelectedEvent(null);
    if (viewMode === "day") setAnchorDate(addDays(anchorDate, 1));
    else if (viewMode === "month") setAnchorDate(addMonths(anchorDate, 1));
    else setAnchorDate(addDays(anchorDate, 7));
  };
  const handleAdd = (day) => {
    if (!canWrite) return;
    setSelectedEvent(null);
    setAddDate(day);
  };
  const handleEdit = (event) => {
    setSelectedEvent(null);
    setEditEvent(event);
  };
  const resetFilters = () => {
    setPersonFilter("all");
    setCategoryFilter("all");
    setModuleFilter("all");
  };

  if (!canRead) {
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <h1 className="mb-2 text-2xl font-bold font-heading">Family Calendar</h1>
        <p className="text-muted-foreground">You do not have access to family events for this family.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#f8fbff] p-2 md:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-[1500px] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white px-4 py-5 md:px-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-xl">🏠</div>
                <div>
                  <p className="text-xl font-extrabold text-slate-950">Family Wall</p>
                  <p className="text-xs font-semibold text-slate-400">Family organizer</p>
                </div>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">Family Calendar</h1>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <CalendarDays className="h-5 w-5 text-slate-700" />
                <button type="button" className="text-2xl font-bold text-slate-900">{format(anchorDate, "MMMM yyyy")}</button>
                <ChevronRight className="h-4 w-4 rotate-90 text-slate-500" />
              </div>
            </div>
            <div className="flex flex-col items-end gap-5">
              <div className="flex items-center gap-4">
                <div className="hidden items-center gap-2 md:flex"><span className="text-4xl">☀️</span><div><p className="text-2xl font-bold text-slate-950">68°</p><p className="text-xs font-semibold text-slate-500">Sunny</p></div></div>
                <div className="h-10 w-px bg-slate-200" />
                <button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"><UsersRound className="h-5 w-5" /></button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={goPrevious}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" onClick={() => setAnchorDate(new Date())}>Today</Button>
                <Button variant="outline" size="icon" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-3">
              <FilterDropdown icon={Grid3X3} label="Category" value={categoryFilter} options={categoryOptions} onChange={setCategoryFilter} />
              <FilterDropdown icon={UserRound} label="Person" value={personFilter} options={personOptions} onChange={setPersonFilter} />
              <FilterDropdown icon={Layers} label="Module" value={moduleFilter} options={moduleOptions} onChange={setModuleFilter} />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {[
                  { value: "day", label: "Day" },
                  { value: "week", label: "Week" },
                  { value: "month", label: "Month" },
                  { value: "mixed", label: "All" },
                ].map((mode) => (
                  <ToolbarButton key={mode.value} active={viewMode === mode.value} onClick={() => { setSelectedEvent(null); setViewMode?.(mode.value); }}>
                    {mode.label}
                  </ToolbarButton>
                ))}
              </div>
              <button type="button" className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">31</span><span className="text-left leading-tight">Sync with<br />Google Calendar</span><RefreshCw className="h-4 w-4 text-slate-400" /></button>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <Legend dadName={dadName} momName={momName} childName={fallbackChildName} />
            {showFilters && (
              <div className="flex flex-wrap items-center gap-2">
                {personOptions.map((option) => (
                  <button key={option.value} type="button" onClick={() => setPersonFilter(option.value)} className={cn("rounded-full border px-3 py-1.5 text-xs font-extrabold transition", personFilter === option.value ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50")}>{option.label.replace("All People", "All")}</button>
                ))}
                {activeFilterCount > 0 && <button type="button" onClick={resetFilters} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-extrabold text-slate-500 hover:bg-slate-50"><X className="h-3.5 w-3.5" />Clear</button>}
                <button type="button" onClick={() => setShowFilters?.(!showFilters)} className="rounded-full border border-slate-200 bg-white p-2 text-slate-500" title="Hide filters"><Filter className="h-4 w-4" /></button>
              </div>
            )}
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-500">{loading ? "Loading events..." : `${filteredEvents.length} events`} · {title}</p>
        </div>

        <div className="relative flex-1 bg-white">
          {loading ? (
            <div className="flex justify-center py-16"><div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" /></div>
          ) : (
            <>
              {viewMode === "day" && <WeekGrid days={[anchorDate]} events={filteredEvents.filter((event) => isSameDay(new Date(`${event.date}T00:00:00`), anchorDate))} onAdd={handleAdd} onSelect={setSelectedEvent} selectedEvent={selectedEvent} fallbackChildName={fallbackChildName} />}
              {(viewMode === "week" || viewMode === "mixed") && <WeekGrid days={weekDays} events={filteredEvents} onAdd={handleAdd} onSelect={setSelectedEvent} selectedEvent={selectedEvent} fallbackChildName={fallbackChildName} />}
              {viewMode === "month" && <MonthView monthDate={anchorDate} events={filteredEvents} onAdd={handleAdd} onSelect={setSelectedEvent} fallbackChildName={fallbackChildName} />}
              <SelectedEventPopover event={selectedEvent} onClose={() => setSelectedEvent(null)} onEdit={handleEdit} onDelete={deleteEvent} fallbackChildName={fallbackChildName} />
            </>
          )}

          {canWrite && <button type="button" onClick={() => handleAdd(anchorDate)} className="fixed bottom-24 right-6 z-[80] flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl transition hover:scale-105 active:scale-95 lg:bottom-10 lg:right-10" title="Add family event" aria-label="Add family event"><Plus className="h-8 w-8" /></button>}
        </div>
      </div>

      {(addDate || editEvent) && (
        <AddFamilyEventDialog
          date={addDate || new Date(`${editEvent?.date || format(new Date(), "yyyy-MM-dd")}T00:00:00`)}
          editEvent={editEvent}
          onClose={() => { setAddDate(null); setEditEvent(null); }}
          onSuccess={async () => { await loadEvents(); setAddDate(null); setEditEvent(null); }}
        />
      )}
    </div>
  );
}
