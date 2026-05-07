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
  parse,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  MapPin,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
  UsersRound,
  Tags,
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
  resolveEventColor,
} from "@/lib/personColorUtils";
import { Button } from "@/components/ui/button";
import AddFamilyEventDialog from "@/components/calendar/AddFamilyEventDialog";

const HOURS = Array.from({ length: 15 }, (_, index) => index + 7);
const HOUR_HEIGHT = 92;
const ALL_DAY_HEIGHT = 108;
const MIN_EVENT_HEIGHT = 54;
const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 360;
const ALL_DAY_VISIBLE_COUNT = 2;

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

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeEvent(docSnap) {
  const data = docSnap.data();
  const isAllDay = Boolean(data.isAllDay) || (!data.startTime && !data.endTime);
  return {
    id: docSnap.id,
    ...data,
    title: data.title || "",
    description: data.description || data.notes || "",
    date: data.date || "",
    startTime: isAllDay ? "" : data.startTime || "",
    endTime: isAllDay ? "" : data.endTime || "",
    category: data.category || "other",
    isAllDay,
    location: data.location || "",
    childName: data.childName || "",
    childId: data.childId || data.child_id || "",
    assignedTo: data.assignedTo || "",
    assignedToType: data.assignedToType || (data.childName ? "child" : "all"),
    assignedToName: data.assignedToName || data.childName || "",
    assignedToEmail: data.assignedToEmail || data.assigned_to_email || "",
    eventColor: data.eventColor || data.event_color || "",
    eventColorSource: data.eventColorSource || data.event_color_source || "",
    googleCalendarEventId: data.googleCalendarEventId || data.googleEventId || "",
  };
}

function categoryLabel(event) {
  return categoryOptions.find((item) => item.value === event.category)?.label || "Other";
}

function categoryEmoji(event) {
  return categoryOptions.find((item) => item.value === event.category)?.emoji || "📌";
}

function displayTime(value) {
  if (!value) return "";
  try {
    return format(parse(value, "HH:mm", new Date()), "h:mm a");
  } catch {
    return value;
  }
}

function parseMinutes(value) {
  if (!value) return null;
  const [hours, minutes = "0"] = value.split(":").map(Number);
  if (Number.isNaN(hours)) return null;
  return hours * 60 + minutes;
}

function eventPosition(event) {
  if (event.isAllDay) return null;
  const start = parseMinutes(event.startTime);
  const end = parseMinutes(event.endTime);
  if (start === null) return null;
  const top = ALL_DAY_HEIGHT + ((start - 7 * 60) / 60) * HOUR_HEIGHT + 4;
  const duration = end && end > start ? end - start : 45;
  const height = Math.max(MIN_EVENT_HEIGHT, (duration / 60) * HOUR_HEIGHT - 8);
  return { top: Math.max(ALL_DAY_HEIGHT + 4, top), height };
}

function safeAnchorPosition(rect) {
  const margin = 16;
  const viewportWidth = window.innerWidth || 1024;
  const viewportHeight = window.innerHeight || 768;
  if (viewportWidth < 760) {
    return { mode: "sheet", left: margin, top: Math.max(margin, viewportHeight - PANEL_HEIGHT - 96) };
  }
  let left = rect.right + 12;
  let top = rect.top;
  if (left + PANEL_WIDTH > viewportWidth - margin) left = rect.left - PANEL_WIDTH - 12;
  if (left < margin) left = viewportWidth - PANEL_WIDTH - margin;
  if (top + PANEL_HEIGHT > viewportHeight - margin) top = viewportHeight - PANEL_HEIGHT - margin;
  if (top < margin) top = margin;
  return { mode: "anchored", left, top };
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
  if (filter === "everyone") return event.assignedTo === "all" || event.assignedToType === "all" || !event.assignedToType;
  if (filter === "dad" || filter === "mom") return event.assignedTo === filter || event.assignedToType === filter;

  const person = people.find((item) => item.value === filter);
  if (!person) return false;

  const values = [event.assignedTo, event.assignedToName, event.assignedToEmail, event.childName, event.childId].map(normalizeText);
  const targets = [
    person.value,
    person.label,
    person.email,
    person.childId,
    person.value?.replace("child:", ""),
    person.value?.replace("member:", ""),
  ].map(normalizeText);

  return values.some((value) => value && targets.includes(value));
}

function PersonDot({ color = "slate", size = "h-4 w-4" }) {
  const meta = getColorMeta(color, "slate");
  return <span className={cn("shrink-0 rounded-full border border-white shadow-sm", size, meta.dot)} />;
}

function EventColor(event, profile) {
  return resolveEventColor(event, profile || {});
}

function ToolbarButton({ children, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 min-w-[72px] border-r border-slate-200 px-3 text-sm font-bold transition last:border-r-0",
        active ? "bg-blue-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-50"
      )}
    >
      {children}
    </button>
  );
}

function FilterButton({ icon: Icon, label, selectedLabel, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-10 min-w-[150px] shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]"
    >
      <Icon className="h-4 w-4 shrink-0 text-blue-600" />
      <span className="shrink-0">{label}</span>
      <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-400">{selectedLabel}</span>
      <ChevronRight className="h-3.5 w-3.5 shrink-0 rotate-90 text-slate-400" />
    </button>
  );
}

function FilterPopover({ type, categoryValue, personValue, personOptions, onCategoryChange, onPersonChange, onClose }) {
  if (!type) return null;
  const isCategory = type === "category";
  const options = isCategory ? categoryOptions : personOptions;
  const currentValue = isCategory ? categoryValue : personValue;

  return (
    <>
      <button type="button" aria-label="Close filter menu" className="fixed inset-0 z-[70] cursor-default bg-slate-950/10" onClick={onClose} />
      <div className="fixed right-4 top-28 z-[80] w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl md:right-8 md:top-32">
        <div className="mb-2 flex items-center justify-between px-1">
          <div>
            <p className="text-sm font-black text-slate-900">{isCategory ? "Filter by Category" : "Filter by Person"}</p>
            <p className="text-xs font-semibold text-slate-400">Tap one option to apply it.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-700"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
          {options.map((option) => {
            const active = currentValue === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  isCategory ? onCategoryChange(option.value) : onPersonChange(option.value);
                  onClose();
                }}
                className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left", active ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-50")}
              >
                {isCategory ? (
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg", active ? "bg-white/20" : "bg-blue-50")}>{option.emoji}</span>
                ) : (
                  <PersonDot color={option.color} size="h-9 w-9" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-extrabold">{option.label}</span>
                  <span className={cn("block truncate text-xs font-semibold", active ? "text-blue-50" : "text-slate-400")}>{isCategory ? "Category" : "Person"}</span>
                </span>
                {active && <Check className="h-5 w-5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function MonthYearPicker({ anchorDate, setAnchorDate }) {
  const [open, setOpen] = useState(false);
  const [displayYear, setDisplayYear] = useState(anchorDate.getFullYear());
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="relative z-30">
      <button type="button" onClick={() => { setDisplayYear(anchorDate.getFullYear()); setOpen((current) => !current); }} className="inline-flex items-center gap-2 rounded-xl px-1 text-2xl font-bold text-slate-900 hover:bg-slate-50">
        {format(anchorDate, "MMMM yyyy")}<ChevronRight className="h-4 w-4 rotate-90 text-slate-500" />
      </button>
      {open && (
        <div className="absolute left-0 top-11 w-[320px] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" onClick={() => setDisplayYear((year) => year - 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
            <p className="text-lg font-black text-slate-900">{displayYear}</p>
            <button type="button" onClick={() => setDisplayYear((year) => year + 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {months.map((month, index) => {
              const active = anchorDate.getFullYear() === displayYear && anchorDate.getMonth() === index;
              return <button key={month} type="button" onClick={() => { setAnchorDate(new Date(displayYear, index, 1)); setOpen(false); }} className={cn("rounded-2xl px-3 py-3 text-sm font-extrabold", active ? "bg-blue-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700")}>{month}</button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AllDayEvent({ event, profile, onSelect, compact = false, dadName, momName }) {
  const colorId = EventColor(event, profile);
  const colors = colorClasses(colorId, "slate");
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(event, e.currentTarget.getBoundingClientRect());
      }}
      className={cn("w-full rounded-lg border px-2 text-left shadow-sm transition hover:shadow-md", compact ? "py-0.5" : "py-1", colors.bg, colors.border)}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[10px] font-extrabold text-slate-900">{event.title}</p>
        <PersonDot color={colorId} size="h-4 w-4" />
      </div>
      {!compact && <p className="truncate text-[9px] text-slate-600">{categoryLabel(event)} · {eventPersonLabel(event, dadName, momName)}</p>}
    </button>
  );
}

function EventBlock({ event, profile, selected, onSelect, dadName, momName }) {
  const position = eventPosition(event);
  if (!position) return null;
  const colorId = EventColor(event, profile);
  const colors = colorClasses(colorId, "slate");

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(event, e.currentTarget.getBoundingClientRect());
      }}
      className={cn("absolute left-2 right-2 overflow-hidden rounded-xl border p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", colors.bg, colors.border, selected && "ring-2", selected && colors.ring)}
      style={{ top: position.top, height: position.height }}
      title={event.title}
    >
      <span className={cn("absolute left-0 top-0 h-full w-1.5", colors.stripe)} />
      <div className="pl-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-[11px] font-extrabold leading-tight text-slate-900 md:text-xs">{event.title}</p>
          <PersonDot color={colorId} size="h-4 w-4" />
        </div>
        <p className="mt-1 text-[10px] font-semibold text-slate-700 md:text-[11px]">{displayTime(event.startTime)}{event.endTime ? ` – ${displayTime(event.endTime)}` : ""}</p>
        <p className="mt-0.5 truncate text-[10px] text-slate-600">{categoryLabel(event)}</p>
        {event.description && position.height > 88 && <p className="mt-1 line-clamp-2 text-[10px] text-slate-500">{event.description}</p>}
        <span className="sr-only">{eventPersonLabel(event, dadName, momName)}</span>
      </div>
    </button>
  );
}

function MoreAllDayButton({ count, hiddenEvents, onOpen }) {
  if (count <= 0) return null;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onOpen(hiddenEvents, e.currentTarget.getBoundingClientRect());
      }}
      className="w-full rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2 py-0.5 text-center text-[10px] font-extrabold leading-4 text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
    >
      +{count} more
    </button>
  );
}

function WeekGrid({ days, events, profile, onAdd, onSelect, onOpenAllDayMore, selectedEvent, dadName, momName }) {
  const timedEvents = events.filter((event) => !event.isAllDay && event.startTime);
  const allDayEvents = events.filter((event) => event.isAllDay || !event.startTime);
  const isSingleDay = days.length === 1;
  const gridTemplateColumns = `74px repeat(${days.length}, minmax(${isSingleDay ? "520px" : "126px"}, 1fr))`;
  const dayEvents = (day, list) => list.filter((event) => event.date === format(day, "yyyy-MM-dd"));

  return (
    <div className={cn("relative overflow-x-auto rounded-b-[2rem] bg-white", isSingleDay && "flex justify-center")}>
      <div className={cn(isSingleDay ? "w-full max-w-[760px]" : "min-w-[980px]")}>
        <div className="grid border-b border-slate-200" style={{ gridTemplateColumns }}>
          <div className="border-r border-slate-200 bg-white" />
          {days.map((day) => (
            <div key={day.toISOString()} className={cn("border-r border-slate-200 py-4 text-center last:border-r-0", isToday(day) && "bg-blue-50/60")}>
              <p className="text-base font-extrabold text-slate-900">{format(day, "EEE d")}</p>
              <p className="text-xs font-semibold text-slate-500">{format(day, "MMM")}</p>
            </div>
          ))}
        </div>

        <div className="grid" style={{ gridTemplateColumns, height: ALL_DAY_HEIGHT + HOURS.length * HOUR_HEIGHT }}>
          <div className="relative border-r border-slate-200 bg-white">
            <div className="flex items-center justify-center border-b border-slate-200 text-xs font-semibold text-slate-500" style={{ height: ALL_DAY_HEIGHT }}>All-day</div>
            {HOURS.map((hour) => <div key={hour} className="border-b border-slate-100 pr-2 pt-2 text-right text-sm font-semibold text-slate-500" style={{ height: HOUR_HEIGHT }}>{format(new Date(2026, 0, 1, hour), "h a")}</div>)}
          </div>

          {days.map((day) => {
            const allDayForDay = dayEvents(day, allDayEvents);
            const visibleAllDay = allDayForDay.slice(0, ALL_DAY_VISIBLE_COUNT);
            const hiddenAllDay = allDayForDay.slice(ALL_DAY_VISIBLE_COUNT);
            return (
              <div key={day.toISOString()} className={cn("relative border-r border-slate-200 last:border-r-0", isToday(day) && "bg-blue-50/30")} onClick={() => onAdd(day)}>
                <div className="space-y-1 overflow-hidden border-b border-slate-200 p-2" style={{ height: ALL_DAY_HEIGHT }}>
                  {visibleAllDay.map((event) => <AllDayEvent key={event.id} event={event} profile={profile} onSelect={onSelect} compact dadName={dadName} momName={momName} />)}
                  <MoreAllDayButton count={hiddenAllDay.length} hiddenEvents={hiddenAllDay} onOpen={(hiddenEvents, rect) => onOpenAllDayMore(hiddenEvents, day, rect)} />
                </div>
                {HOURS.map((hour) => <div key={hour} className="border-b border-slate-100" style={{ height: HOUR_HEIGHT }} />)}
                {dayEvents(day, timedEvents).map((event) => <EventBlock key={event.id} event={event} profile={profile} selected={selectedEvent?.id === event.id} onSelect={onSelect} dadName={dadName} momName={momName} />)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthView({ monthDate, events, profile, onAdd, onSelect }) {
  const gridStart = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayEvents = (day) => events.filter((event) => event.date === format(day, "yyyy-MM-dd"));

  return (
    <div className="rounded-b-[2rem] bg-white p-3">
      <div className="grid grid-cols-7 gap-2 pb-2">{labels.map((label) => <div key={label} className="text-center text-xs font-extrabold uppercase tracking-wide text-slate-500">{label}</div>)}</div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const list = dayEvents(day);
          return (
            <button key={day.toISOString()} type="button" onClick={() => onAdd(day)} className={cn("min-h-[128px] rounded-2xl border border-slate-200 bg-white p-2 text-left transition hover:border-blue-200 hover:bg-blue-50/30", isToday(day) && "ring-2 ring-blue-400", !isSameMonth(day, monthDate) && "opacity-45")}>
              <div className="mb-2 flex items-center justify-between"><span className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-extrabold text-slate-800">{format(day, "d")}</span><Plus className="h-4 w-4 text-slate-300" /></div>
              <div className="space-y-1">
                {list.slice(0, 3).map((event) => {
                  const colorId = EventColor(event, profile);
                  const colors = colorClasses(colorId, "slate");
                  return <div key={event.id} role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onSelect(event, e.currentTarget.getBoundingClientRect()); }} className={cn("rounded-lg border px-2 py-1 text-[10px] font-bold", colors.bg, colors.border)}><div className="flex items-center gap-1"><PersonDot color={colorId} size="h-4 w-4" /><span className="truncate">{event.title}</span></div></div>;
                })}
                {list.length > 3 && <p className="px-1 text-[10px] font-bold text-slate-400">+{list.length - 3} more</p>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectedEventPopover({ selected, profile, dadName, momName, onClose, onEdit, onDelete }) {
  if (!selected?.event) return null;
  const { event, panel } = selected;
  const colorId = EventColor(event, profile);
  const color = getColorMeta(colorId, "slate");
  const timeText = event.isAllDay || !event.startTime ? "All day" : `${displayTime(event.startTime)}${event.endTime ? ` – ${displayTime(event.endTime)}` : ""}`;

  return (
    <div className="fixed z-[95] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl" style={{ left: panel.left, top: panel.top, width: panel.mode === "sheet" ? "calc(100vw - 2rem)" : PANEL_WIDTH, maxWidth: "calc(100vw - 2rem)" }}>
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="text-lg font-extrabold text-slate-950">{event.title}</h3><p className="mt-1 text-sm font-medium text-slate-600">{event.date ? format(new Date(`${event.date}T00:00:00`), "EEE, MMM d") : ""} · {timeText}</p><p className="mt-1 text-sm text-slate-500">{categoryEmoji(event)} {categoryLabel(event)}</p></div>
        <button type="button" onClick={onClose} className="rounded-full px-2 py-1 text-sm font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button>
      </div>
      <div className="mt-4 flex items-center gap-2"><PersonDot color={colorId} size="h-8 w-8" /><span className={cn("rounded-full border px-2 py-1 text-xs font-black", color.bg, color.border, color.text)}>{eventPersonLabel(event, dadName, momName)}</span>{event.googleCalendarEventId && <span className="ml-auto rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Google synced</span>}</div>
      <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{event.location && <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{event.location}</p>}{event.description ? <p className="flex gap-2"><StickyNote className="mt-0.5 h-4 w-4 shrink-0" />{event.description}</p> : <p className="text-slate-400">No notes added.</p>}</div>
      <div className="mt-5 grid grid-cols-3 gap-2 border-t pt-4"><button type="button" onClick={() => onEdit(event)} className="flex flex-col items-center gap-1 rounded-2xl p-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Pencil className="h-4 w-4" />Edit</button><button type="button" onClick={() => onDelete(event.id)} className="col-span-2 flex flex-col items-center gap-1 rounded-2xl p-2 text-xs font-semibold text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" />Delete</button></div>
    </div>
  );
}

export default function FamilyCalendarViewV7({ activeCalendar = "family", setActiveCalendar, viewMode = "week", setViewMode }) {
  const { user, familyId, profile, dadName, momName } = useFamily();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDate, setAddDate] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [allDayOverflow, setAllDayOverflow] = useState(null);
  const [personFilter, setPersonFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [openFilter, setOpenFilter] = useState(null);

  const { people } = useMemo(() => familyPersonColorMap(profile || {}, user, user?.email || ""), [profile, user]);
  const personOptions = useMemo(() => [{ value: "all", label: "All", color: "slate" }, { value: "everyone", label: "Everyone", color: "slate" }, ...people], [people]);
  const selectedPersonLabel = personOptions.find((item) => item.value === personFilter)?.label || "All";
  const selectedCategoryLabel = categoryOptions.find((item) => item.value === categoryFilter)?.label || "All Categories";

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

  const handlePrevious = () => viewMode === "month" ? setAnchorDate((date) => subMonths(date, 1)) : setAnchorDate((date) => addDays(date, viewMode === "day" ? -1 : -7));
  const handleNext = () => viewMode === "month" ? setAnchorDate((date) => addMonths(date, 1)) : setAnchorDate((date) => addDays(date, viewMode === "day" ? 1 : 7));
  const handleSelectEvent = (event, rect) => setSelectedEvent({ event, panel: safeAnchorPosition(rect) });
  const handleOpenAllDayMore = (hiddenEvents, day, rect) => setAllDayOverflow({ events: hiddenEvents, dateLabel: format(day, "EEE, MMM d"), panel: safeAnchorPosition(rect) });

  const handleDelete = async (eventId) => {
    if (!window.confirm("Delete this event?")) return;
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
      <div className="mx-auto max-w-none overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white px-4 py-4 md:px-8">
          <div className="mb-4 flex items-center gap-3 pr-48 md:pr-56">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"><CalendarDays className="h-5 w-5" /></div>
            <div>
              <p className="text-xl font-black text-slate-950">Family Calendar</p>
              <p className="text-xs font-semibold text-slate-400">Colors from Profile → Families</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={handlePrevious} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50"><ChevronLeft className="h-4 w-4" /></button>
            <MonthYearPicker anchorDate={anchorDate} setAnchorDate={setAnchorDate} />
            <button type="button" onClick={handleNext} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50"><ChevronRight className="h-4 w-4" /></button>
            <Button type="button" variant="outline" onClick={() => setAnchorDate(new Date())}>Today</Button>

            <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <ToolbarButton active={viewMode === "day"} onClick={() => setViewMode?.("day")}>Day</ToolbarButton>
              <ToolbarButton active={viewMode === "week"} onClick={() => setViewMode?.("week")}>Week</ToolbarButton>
              <ToolbarButton active={viewMode === "month"} onClick={() => setViewMode?.("month")}>Month</ToolbarButton>
            </div>

            <FilterButton icon={UsersRound} label="Person" selectedLabel={selectedPersonLabel} onClick={() => setOpenFilter("person")} />
            <FilterButton icon={Tags} label="Category" selectedLabel={selectedCategoryLabel} onClick={() => setOpenFilter("category")} />

            <Button type="button" onClick={() => setAddDate(anchorDate)} className="gap-2 bg-blue-600 hover:bg-blue-700"><Plus className="h-4 w-4" /> Add Event</Button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm font-bold text-slate-400">Loading family events...</div>
        ) : viewMode === "month" ? (
          <MonthView monthDate={anchorDate} events={filteredEvents} profile={profile} onAdd={setAddDate} onSelect={handleSelectEvent} />
        ) : (
          <WeekGrid days={visibleDays} events={filteredEvents} profile={profile} onAdd={setAddDate} onSelect={handleSelectEvent} onOpenAllDayMore={handleOpenAllDayMore} selectedEvent={selectedEvent?.event} dadName={dadName} momName={momName} />
        )}
      </div>

      {allDayOverflow && (
        <div className="fixed z-[100] w-[min(340px,calc(100vw-2rem))] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl" style={{ left: allDayOverflow.panel.left, top: allDayOverflow.panel.top }}>
          <div className="mb-3 flex items-start justify-between gap-3"><div><p className="text-sm font-black text-slate-950">All-day events</p><p className="text-xs font-semibold text-slate-400">{allDayOverflow.dateLabel}</p></div><button type="button" onClick={() => setAllDayOverflow(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-700"><X className="h-4 w-4" /></button></div>
          <div className="space-y-2">{allDayOverflow.events.map((event) => <AllDayEvent key={event.id} event={event} profile={profile} onSelect={handleSelectEvent} dadName={dadName} momName={momName} />)}</div>
        </div>
      )}

      <SelectedEventPopover selected={selectedEvent} profile={profile} dadName={dadName} momName={momName} onClose={() => setSelectedEvent(null)} onEdit={(event) => { setSelectedEvent(null); setEditEvent(event); }} onDelete={handleDelete} />

      {(addDate || editEvent) && (
        <AddFamilyEventDialog
          date={addDate || new Date(`${editEvent?.date || format(new Date(), "yyyy-MM-dd")}T00:00:00`)}
          editEvent={editEvent}
          onClose={() => { setAddDate(null); setEditEvent(null); }}
          onSuccess={() => { setAddDate(null); setEditEvent(null); loadEvents(); }}
        />
      )}

      <FilterPopover type={openFilter} categoryValue={categoryFilter} personValue={personFilter} personOptions={personOptions} onCategoryChange={setCategoryFilter} onPersonChange={setPersonFilter} onClose={() => setOpenFilter(null)} />
    </div>
  );
}
