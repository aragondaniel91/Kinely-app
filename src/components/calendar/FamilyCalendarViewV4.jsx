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
  Check,
  Grid3X3,
  HeartHandshake,
  Layers,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
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
import { Button } from "@/components/ui/button";
import AddFamilyEventDialog from "@/components/calendar/AddFamilyEventDialog";

const HOURS = Array.from({ length: 15 }, (_, index) => index + 7);
const HOUR_HEIGHT = 92;
const ALL_DAY_HEIGHT = 108;
const MIN_EVENT_HEIGHT = 54;
const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 360;
const ALL_DAY_VISIBLE_COUNT = 2;

const calendarTypeOptions = [
  { value: "family", label: "Family Calendar", icon: CalendarDays },
  { value: "custody", label: "Custody Calendar", icon: HeartHandshake },
  { value: "all", label: "All Calendar", icon: Layers },
];

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

const personColors = {
  dad: { dot: "bg-blue-400", bg: "bg-blue-50", border: "border-blue-300", stripe: "bg-blue-500", ring: "ring-blue-200" },
  mom: { dot: "bg-amber-300", bg: "bg-amber-50", border: "border-amber-300", stripe: "bg-amber-400", ring: "ring-amber-200" },
  child: { dot: "bg-emerald-400", bg: "bg-emerald-50", border: "border-emerald-300", stripe: "bg-emerald-500", ring: "ring-emerald-200" },
  all: { dot: "bg-gradient-to-r from-blue-400 via-amber-300 to-emerald-400", bg: "bg-orange-50", border: "border-amber-200", stripe: "bg-gradient-to-b from-blue-500 via-amber-400 to-emerald-500", ring: "ring-amber-200" },
};

function childName(child) {
  if (!child) return "";
  if (typeof child === "string") return child;
  return child.name || child.displayName || child.fullName || child.firstName || child.childName || "";
}

function childKey(child, index) {
  if (!child) return `child-${index + 1}`;
  if (typeof child === "string") return child.toLowerCase().replace(/\s+/g, "-") || `child-${index + 1}`;
  return child.id || child.uid || child.childId || child.profileId || child.name || child.displayName || `child-${index + 1}`;
}

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
    googleCalendarEventId: data.googleCalendarEventId || data.googleEventId || "",
  };
}

function categoryLabel(event) {
  return categoryOptions.find((item) => item.value === event.category)?.label || "Other";
}

function categoryEmoji(event) {
  return categoryOptions.find((item) => item.value === event.category)?.emoji || "📌";
}

function personKey(event) {
  if (event.assignedTo === "dad" || event.assignedToType === "dad") return "dad";
  if (event.assignedTo === "mom" || event.assignedToType === "mom") return "mom";
  if (event.assignedToType === "child" || event.childId || event.childName || String(event.assignedTo || "").startsWith("child:")) return "child";
  return "all";
}

function personLabel(event, fallbackChild = "Child") {
  const key = personKey(event);
  if (key === "dad") return event.assignedToName || "Dad";
  if (key === "mom") return event.assignedToName || "Mom";
  if (key === "child") return event.assignedToName || event.childName || fallbackChild;
  return "Everyone";
}

function eventMatchesPerson(event, filter, childPeople) {
  if (filter === "all") return true;
  const key = personKey(event);
  if (filter === "everyone") return key === "all";
  if (filter === "dad" || filter === "mom") return key === filter;
  if (!filter.startsWith("child:")) return false;

  const child = childPeople.find((item) => item.value === filter);
  if (!child) return key === "child";

  const values = [event.assignedTo, event.childId, event.childName, event.assignedToName].map(normalizeText);
  const targets = [child.value, child.childId, child.label, child.value.replace("child:", "")].map(normalizeText);
  return values.some((value) => targets.includes(value));
}

function parseMinutes(value) {
  if (!value) return null;
  const [hours, minutes = "0"] = value.split(":").map(Number);
  if (Number.isNaN(hours)) return null;
  return hours * 60 + minutes;
}

function displayTime(value) {
  if (!value) return "";
  try {
    return format(parse(value, "HH:mm", new Date()), "h:mm a");
  } catch {
    return value;
  }
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

function PersonDot({ type = "all", size = "h-4 w-4" }) {
  return <span className={cn("shrink-0 rounded-full border border-white shadow-sm", size, personColors[type]?.dot || personColors.child.dot)} />;
}

function CalendarTypeDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = calendarTypeOptions.find((option) => option.value === value) || calendarTypeOptions[0];
  const SelectedIcon = selected.icon;

  return (
    <div className="relative z-30">
      <button type="button" onClick={() => setOpen((current) => !current)} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold text-slate-700 shadow-sm hover:bg-slate-50">
        <SelectedIcon className="h-4 w-4 text-blue-600" />
        {selected.label}
        <ChevronRight className="h-3.5 w-3.5 rotate-90 text-slate-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-12 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl">
          {calendarTypeOptions.map((option) => {
            const Icon = option.icon;
            const active = value === option.value;
            return (
              <button key={option.value} type="button" onClick={() => { onChange(option.value); setOpen(false); }} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-extrabold", active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50")}>
                <Icon className="h-4 w-4" />
                <span className="flex-1">{option.label}</span>
                {active && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MonthYearPicker({ anchorDate, setAnchorDate }) {
  const [open, setOpen] = useState(false);
  const [displayYear, setDisplayYear] = useState(anchorDate.getFullYear());
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return (
    <div className="relative z-30">
      <button type="button" onClick={() => { setDisplayYear(anchorDate.getFullYear()); setOpen((current) => !current); }} className="inline-flex items-center gap-2 rounded-xl px-1 text-2xl font-bold text-slate-900 hover:bg-slate-50">
        {format(anchorDate, "MMMM yyyy")}
        <ChevronRight className="h-4 w-4 rotate-90 text-slate-500" />
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

function CompactFilterButton({ icon: Icon, label, selectedLabel, onClick }) {
  return (
    <button type="button" onClick={onClick} className="flex h-9 w-[150px] shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-left text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-[0.98]">
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="shrink-0">{label}</span>
      <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-400">{selectedLabel}</span>
      <ChevronRight className="h-3 w-3 shrink-0 rotate-90" />
    </button>
  );
}

function FloatingFilterPopover({ type, categoryValue, personValue, personOptions, onCategoryChange, onPersonChange, onClose }) {
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
            const colorKey = option.colorKey || option.value;
            return (
              <button key={option.value} type="button" onClick={() => { isCategory ? onCategoryChange(option.value) : onPersonChange(option.value); onClose(); }} className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left", active ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 hover:bg-slate-50")}>
                {isCategory ? <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg", active ? "bg-white/20" : "bg-blue-50")}>{option.emoji}</span> : <PersonDot type={colorKey} size="h-9 w-9" />}
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-extrabold">{option.label}</span><span className={cn("block truncate text-xs font-semibold", active ? "text-blue-50" : "text-slate-400")}>{isCategory ? "Category" : "Person"}</span></span>
                {active && <Check className="h-5 w-5 shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function ToolbarButton({ children, active, onClick }) {
  return <button type="button" onClick={onClick} className={cn("h-10 min-w-[72px] border-r border-slate-200 px-3 text-sm font-bold transition last:border-r-0", active ? "bg-blue-600 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-50")}>{children}</button>;
}

function Legend({ people, activePerson, onSelectPerson }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {people.map((person) => {
        const active = activePerson === person.value;
        return (
          <button key={person.value} type="button" onClick={() => onSelectPerson(active ? "all" : person.value)} className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold transition", active ? "border-blue-600 bg-blue-600 text-white shadow-sm" : "border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50")}>
            <PersonDot type={person.colorKey || person.value} />
            <span>{person.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function EventBlock({ event, selected, onSelect, fallbackChildName }) {
  const key = personKey(event);
  const colors = personColors[key] || personColors.all;
  const position = eventPosition(event);
  if (!position) return null;

  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onSelect(event, e.currentTarget.getBoundingClientRect()); }} className={cn("absolute left-2 right-2 overflow-hidden rounded-xl border p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md", colors.bg, colors.border, selected && "ring-2", selected && colors.ring)} style={{ top: position.top, height: position.height }} title={event.title}>
      <span className={cn("absolute left-0 top-0 h-full w-1.5", colors.stripe)} />
      <div className="pl-1">
        <div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-[11px] font-extrabold leading-tight text-slate-900 md:text-xs">{event.title}</p><PersonDot type={key} size="h-4 w-4" /></div>
        <p className="mt-1 text-[10px] font-semibold text-slate-700 md:text-[11px]">{displayTime(event.startTime)}{event.endTime ? ` – ${displayTime(event.endTime)}` : ""}</p>
        <p className="mt-0.5 truncate text-[10px] text-slate-600">{categoryLabel(event)}</p>
        {event.description && position.height > 88 && <p className="mt-1 line-clamp-2 text-[10px] text-slate-500">{event.description}</p>}
        <span className="sr-only">{personLabel(event, fallbackChildName)}</span>
      </div>
    </button>
  );
}

function AllDayEvent({ event, onSelect, fallbackChildName }) {
  const key = personKey(event);
  const colors = personColors[key] || personColors.all;
  return (
    <button type="button" onClick={(e) => { e.stopPropagation(); onSelect(event, e.currentTarget.getBoundingClientRect()); }} className={cn("w-full rounded-lg border px-2 py-1 text-left shadow-sm transition hover:shadow-md", colors.bg, colors.border)}>
      <div className="flex items-center justify-between gap-2"><p className="truncate text-[10px] font-extrabold text-slate-900">{event.title}</p><PersonDot type={key} size="h-4 w-4" /></div>
      <p className="truncate text-[9px] text-slate-600">{categoryLabel(event)} · {personLabel(event, fallbackChildName)}</p>
    </button>
  );
}

function MoreAllDayButton({ count }) {
  if (count <= 0) return null;
  return <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-2 py-1 text-center text-[10px] font-extrabold text-slate-500">+{count} more</div>;
}

function WeekGrid({ days, events, onAdd, onSelect, selectedEvent, fallbackChildName }) {
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
          {days.map((day) => <div key={day.toISOString()} className={cn("border-r border-slate-200 py-4 text-center last:border-r-0", isToday(day) && "bg-blue-50/60")}><p className="text-base font-extrabold text-slate-900">{format(day, "EEE d")}</p><p className="text-xs font-semibold text-slate-500">{format(day, "MMM")}</p></div>)}
        </div>
        <div className="grid" style={{ gridTemplateColumns, height: ALL_DAY_HEIGHT + HOURS.length * HOUR_HEIGHT }}>
          <div className="relative border-r border-slate-200 bg-white">
            <div className="flex items-center justify-center border-b border-slate-200 text-xs font-semibold text-slate-500" style={{ height: ALL_DAY_HEIGHT }}>All-day</div>
            {HOURS.map((hour) => <div key={hour} className="border-b border-slate-100 pr-2 pt-2 text-right text-sm font-semibold text-slate-500" style={{ height: HOUR_HEIGHT }}>{format(new Date(2026, 0, 1, hour), "h a")}</div>)}
          </div>
          {days.map((day) => {
            const allDayForDay = dayEvents(day, allDayEvents);
            const visibleAllDay = allDayForDay.slice(0, ALL_DAY_VISIBLE_COUNT);
            const hiddenAllDayCount = Math.max(0, allDayForDay.length - ALL_DAY_VISIBLE_COUNT);
            return (
              <div key={day.toISOString()} className={cn("relative border-r border-slate-200 last:border-r-0", isToday(day) && "bg-blue-50/30")} onClick={() => onAdd(day)}>
                <div className="space-y-1 overflow-hidden border-b border-slate-200 p-2" style={{ height: ALL_DAY_HEIGHT }}>
                  {visibleAllDay.map((event) => <AllDayEvent key={event.id} event={event} onSelect={onSelect} fallbackChildName={fallbackChildName} />)}
                  <MoreAllDayButton count={hiddenAllDayCount} />
                </div>
                {HOURS.map((hour) => <div key={hour} className="border-b border-slate-100" style={{ height: HOUR_HEIGHT }} />)}
                {dayEvents(day, timedEvents).map((event) => <EventBlock key={event.id} event={event} selected={selectedEvent?.id === event.id} onSelect={onSelect} fallbackChildName={fallbackChildName} />)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MonthView({ monthDate, events, onAdd, onSelect }) {
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
                  const key = personKey(event);
                  const colors = personColors[key] || personColors.all;
                  return <div key={event.id} role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); onSelect(event, e.currentTarget.getBoundingClientRect()); }} className={cn("rounded-lg border px-2 py-1 text-[10px] font-bold", colors.bg, colors.border)}><div className="flex items-center gap-1"><PersonDot type={key} size="h-4 w-4" /><span className="truncate">{event.title}</span></div></div>;
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

function SelectedEventPopover({ selected, onClose, onEdit, onDelete, fallbackChildName }) {
  if (!selected?.event) return null;
  const { event, panel } = selected;
  const key = personKey(event);
  const timeText = event.isAllDay || !event.startTime ? "All day" : `${displayTime(event.startTime)}${event.endTime ? ` – ${displayTime(event.endTime)}` : ""}`;

  return (
    <div className="fixed z-[95] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl" style={{ left: panel.left, top: panel.top, width: panel.mode === "sheet" ? "calc(100vw - 2rem)" : PANEL_WIDTH, maxWidth: "calc(100vw - 2rem)" }}>
      <div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-extrabold text-slate-950">{event.title}</h3><p className="mt-1 text-sm font-medium text-slate-600">{event.date ? format(new Date(`${event.date}T00:00:00`), "EEE, MMM d") : ""} · {timeText}</p><p className="mt-1 text-sm text-slate-500">{categoryEmoji(event)} {categoryLabel(event)}</p></div><button type="button" onClick={onClose} className="rounded-full px-2 py-1 text-sm font-bold text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button></div>
      <div className="mt-4 flex items-center gap-2"><PersonDot type={key} size="h-8 w-8" /><span className="text-sm font-semibold text-slate-700">{personLabel(event, fallbackChildName)}</span>{event.googleCalendarEventId && <span className="ml-auto rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Google synced</span>}</div>
      <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{event.location && <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{event.location}</p>}{event.description ? <p className="flex gap-2"><StickyNote className="mt-0.5 h-4 w-4 shrink-0" />{event.description}</p> : <p className="text-slate-400">No notes added.</p>}</div>
      <div className="mt-5 grid grid-cols-3 gap-2 border-t pt-4"><button type="button" onClick={() => onEdit(event)} className="flex flex-col items-center gap-1 rounded-2xl p-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><Pencil className="h-4 w-4" />Edit</button><button type="button" onClick={() => onDelete(event.id)} className="col-span-2 flex flex-col items-center gap-1 rounded-2xl p-2 text-xs font-semibold text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" />Delete</button></div>
    </div>
  );
}

function CalendarPlaceholder({ activeCalendar }) {
  const selected = calendarTypeOptions.find((item) => item.value === activeCalendar);
  const Icon = selected?.icon || CalendarDays;
  return <div className="relative flex-1 bg-white p-8"><div className="mx-auto flex min-h-[420px] max-w-3xl items-center justify-center rounded-[2rem] border border-slate-200 bg-slate-50/70 p-8 text-center"><div className="max-w-lg"><div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-blue-600"><Icon className="h-8 w-8" /></div><h2 className="text-3xl font-black text-slate-950">{selected?.label}</h2><p className="mt-3 text-base font-semibold text-slate-500">{activeCalendar === "custody" ? "The existing Custody Calendar will be connected here without changing its current behavior." : "This future view will combine Family, Custody, Tasks, Meals, Grocery, and Notes into one calendar."}</p></div></div></div>;
}

export default function FamilyCalendarViewV4({ activeCalendar = "family", setActiveCalendar, viewMode = "week", setViewMode }) {
  const { user, familyId, perms, children, dadName, momName, profile } = useFamily();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDate, setAddDate] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [personFilter, setPersonFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [openFilter, setOpenFilter] = useState(null);

  const canRead = perms?.calendar?.read !== false;
  const canWrite = perms?.calendar?.write !== false;
  const familyDisplayName = profile?.family_name || profile?.familyName || profile?.family || "My Family";

  const childPeople = useMemo(() => (children || []).map((child, index) => {
    const label = childName(child) || `Child ${index + 1}`;
    const key = childKey(child, index);
    return { value: `child:${key}`, childId: String(key), label, colorKey: "child" };
  }).filter((child) => child.label), [children]);

  const fallbackChildName = childPeople[0]?.label || "Child";
  const personOptions = useMemo(() => [
    { value: "all", label: "All People", colorKey: "all" },
    { value: "dad", label: dadName || "Dad", colorKey: "dad" },
    { value: "mom", label: momName || "Mom", colorKey: "mom" },
    ...childPeople,
    { value: "everyone", label: "Everyone", colorKey: "all" },
  ], [dadName, momName, childPeople]);

  const legendPeople = personOptions.filter((person) => person.value !== "all");
  const selectedCategory = categoryOptions.find((item) => item.value === categoryFilter) || categoryOptions[0];
  const selectedPerson = personOptions.find((item) => item.value === personFilter) || personOptions[0];

  const weekStart = startOfWeek(anchorDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);

  const dateRange = useMemo(() => {
    if (viewMode === "day") return { startKey: format(anchorDate, "yyyy-MM-dd"), endKey: format(anchorDate, "yyyy-MM-dd") };
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
      } catch {
        snap = await getDocs(query(collection(db, "familyEvents"), where("family_id", "==", familyId)));
      }
      const data = snap.docs
        .map(normalizeEvent)
        .filter((event) => event.date >= dateRange.startKey && event.date <= dateRange.endKey)
        .sort((a, b) => (a.date || "").localeCompare(b.date || "") || (a.startTime || "").localeCompare(b.startTime || "") || (a.title || "").localeCompare(b.title || ""));
      setEvents(data);
    } catch (error) {
      console.error("Error loading family events:", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvents(); }, [user?.uid, familyId, canRead, dateRange.startKey, dateRange.endKey]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    const matchesPerson = eventMatchesPerson(event, personFilter, childPeople);
    const matchesCategory = categoryFilter === "all" || event.category === categoryFilter;
    return matchesPerson && matchesCategory;
  }), [events, personFilter, categoryFilter, childPeople]);

  const activeFilterCount = [personFilter, categoryFilter].filter((value) => value !== "all").length;
  const rangeTitle = viewMode === "day" ? format(anchorDate, "MMMM d, yyyy") : viewMode === "month" ? format(anchorDate, "MMMM yyyy") : `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`;

  const handleSelectEvent = (event, rect) => {
    setOpenFilter(null);
    setSelectedEvent({ event, panel: safeAnchorPosition(rect) });
  };

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

  const addEvent = (day) => {
    if (!canWrite || activeCalendar !== "family") return;
    setOpenFilter(null);
    setSelectedEvent(null);
    setAddDate(day);
  };

  const editSelectedEvent = (event) => {
    setSelectedEvent(null);
    setEditEvent(event);
  };

  if (!canRead) return <div className="mx-auto max-w-xl p-6 text-center"><h1 className="mb-2 text-2xl font-bold font-heading">Family Calendar</h1><p className="text-muted-foreground">You do not have access to family events for this family.</p></div>;

  return (
    <div className="min-h-full bg-[#f8fbff] p-2 md:p-4">
      <div className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-[1500px] flex-col rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white px-4 py-5 md:px-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div>
              <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-xl">🏠</div><div><p className="text-xl font-extrabold text-slate-950">Family Wall</p><p className="text-xs font-semibold text-slate-400">{familyDisplayName}</p></div></div>
              <div className="flex flex-wrap items-center gap-3"><h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-5xl">{calendarTypeOptions.find((item) => item.value === activeCalendar)?.label || "Family Calendar"}</h1><CalendarTypeDropdown value={activeCalendar} onChange={setActiveCalendar} /></div>
              <div className="mt-5 flex flex-wrap items-center gap-3"><CalendarDays className="h-5 w-5 text-slate-700" /><MonthYearPicker anchorDate={anchorDate} setAnchorDate={setAnchorDate} /></div>
            </div>
            <div className="flex flex-col items-end gap-5"><div className="flex items-center gap-4"><div className="hidden items-center gap-2 md:flex"><span className="text-4xl">☀️</span><div><p className="text-2xl font-bold text-slate-950">68°</p><p className="text-xs font-semibold text-slate-500">Sunny</p></div></div><div className="h-10 w-px bg-slate-200" /><button type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"><UsersRound className="h-5 w-5" /></button></div><div className="flex items-center gap-2"><Button variant="outline" size="icon" onClick={() => { setSelectedEvent(null); setAnchorDate(viewMode === "month" ? subMonths(anchorDate, 1) : addDays(anchorDate, viewMode === "day" ? -1 : -7)); }}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" onClick={() => setAnchorDate(new Date())}>Today</Button><Button variant="outline" size="icon" onClick={() => { setSelectedEvent(null); setAnchorDate(viewMode === "month" ? addMonths(anchorDate, 1) : addDays(anchorDate, viewMode === "day" ? 1 : 7)); }}><ChevronRight className="h-4 w-4" /></Button></div></div>
          </div>

          <div className="mt-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-nowrap items-center gap-3 overflow-x-auto pb-1"><div className="inline-flex shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">{[{ value: "day", label: "Day" }, { value: "week", label: "Week" }, { value: "month", label: "Month" }, { value: "mixed", label: "All" }].map((mode) => <ToolbarButton key={mode.value} active={viewMode === mode.value} onClick={() => { setSelectedEvent(null); setViewMode?.(mode.value); }}>{mode.label}</ToolbarButton>)}</div>{activeCalendar === "family" && <button type="button" className="inline-flex h-11 shrink-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-black text-white">31</span><span className="whitespace-nowrap text-left leading-tight">Sync with<br />Google Calendar</span><RefreshCw className="h-4 w-4 text-slate-400" /></button>}</div>
            {activeCalendar === "family" && <div className="flex w-full flex-nowrap justify-end gap-2 pb-1 xl:w-auto xl:min-w-[360px]"><CompactFilterButton icon={Grid3X3} label="Category" selectedLabel={selectedCategory.label} onClick={() => setOpenFilter(openFilter === "category" ? null : "category")} /><CompactFilterButton icon={UserRound} label="Person" selectedLabel={selectedPerson.label} onClick={() => setOpenFilter(openFilter === "person" ? null : "person")} />{activeFilterCount > 0 && <button type="button" onClick={() => { setPersonFilter("all"); setCategoryFilter("all"); setOpenFilter(null); }} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-500 hover:bg-slate-50"><X className="h-3.5 w-3.5" />Clear</button>}</div>}
          </div>

          {activeCalendar === "family" && <div className="mt-5"><Legend people={legendPeople} activePerson={personFilter} onSelectPerson={setPersonFilter} /></div>}
          <p className="mt-4 text-sm font-semibold text-slate-500">{loading ? "Loading events..." : activeCalendar === "family" ? `${filteredEvents.length} events · ${rangeTitle}` : rangeTitle}</p>
        </div>

        <div className="relative flex-1 bg-white">
          {activeCalendar !== "family" ? <CalendarPlaceholder activeCalendar={activeCalendar} /> : loading ? <div className="flex justify-center py-16"><div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" /></div> : <>{viewMode === "day" && <WeekGrid days={[anchorDate]} events={filteredEvents.filter((event) => isSameDay(new Date(`${event.date}T00:00:00`), anchorDate))} onAdd={addEvent} onSelect={handleSelectEvent} selectedEvent={selectedEvent?.event} fallbackChildName={fallbackChildName} />}{(viewMode === "week" || viewMode === "mixed") && <WeekGrid days={weekDays} events={filteredEvents} onAdd={addEvent} onSelect={handleSelectEvent} selectedEvent={selectedEvent?.event} fallbackChildName={fallbackChildName} />}{viewMode === "month" && <MonthView monthDate={anchorDate} events={filteredEvents} onAdd={addEvent} onSelect={handleSelectEvent} />}<SelectedEventPopover selected={selectedEvent} onClose={() => setSelectedEvent(null)} onEdit={editSelectedEvent} onDelete={deleteEvent} fallbackChildName={fallbackChildName} /></>}
          {canWrite && activeCalendar === "family" && <button type="button" onClick={() => addEvent(anchorDate)} className="fixed bottom-24 right-6 z-[80] flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl transition hover:scale-105 active:scale-95 lg:bottom-10 lg:right-10" title="Add family event" aria-label="Add family event"><Plus className="h-8 w-8" /></button>}
        </div>
      </div>

      <FloatingFilterPopover type={openFilter} categoryValue={categoryFilter} personValue={personFilter} personOptions={personOptions} onCategoryChange={setCategoryFilter} onPersonChange={setPersonFilter} onClose={() => setOpenFilter(null)} />

      {(addDate || editEvent) && <AddFamilyEventDialog date={addDate || new Date(`${editEvent?.date || format(new Date(), "yyyy-MM-dd")}T00:00:00`)} editEvent={editEvent} onClose={() => { setAddDate(null); setEditEvent(null); }} onSuccess={async () => { await loadEvents(); setAddDate(null); setEditEvent(null); }} />}
    </div>
  );
}
