import { Clock, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/personColorUtils";
import { getFamilyEventAssignmentLabel } from "@/core/events/familyEventAdapter";
import { categoryLabel, displayTimeRange } from "@/features/family-calendar/utils/familyCalendarUi";
import {
  familyEventCardStyle,
  familyEventStripeStyle,
  familyGradientStyle,
  isFamilyColorId,
} from "@/features/family-calendar/utils/familyCalendarColorStyles";

function handleCardClick(event, calendarEvent, onClick) {
  calendarEvent.stopPropagation();
  onClick?.(event, calendarEvent.currentTarget.getBoundingClientRect());
}

function FamilyDot({ people = [], active = false }) {
  return (
    <span
      className={cn(
        "h-4 w-4 shrink-0 rounded-full border border-white shadow-sm",
        active && "ring-2 ring-blue-200"
      )}
      style={familyGradientStyle(people)}
    />
  );
}

function EventDot({ colorId, people = [] }) {
  if (isFamilyColorId(colorId)) return <FamilyDot people={people} />;
  const colors = colorClasses(colorId, "slate");
  return <span className={cn("h-4 w-4 shrink-0 rounded-full border border-white shadow-sm", colors.dot)} />;
}

export default function FamilyEventCard({ event, people = [], variant = "month", onClick }) {
  const colorId = event.colorId || event.color_id || event.eventColor || event.event_color || "family";
  const isFamilyEvent = isFamilyColorId(colorId);
  const colors = colorClasses(colorId, "slate");
  const assignedLabel = event.assignedLabel || event.assigned_label || getFamilyEventAssignmentLabel(event, people, "Family");
  const eventTime = displayTimeRange(event);
  const eventCategory = categoryLabel(event.category);
  const familyCardStyle = isFamilyEvent ? familyEventCardStyle(people) : undefined;
  const familyStripeStyle = isFamilyEvent ? familyEventStripeStyle(people) : undefined;

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={(calendarEvent) => handleCardClick(event, calendarEvent, onClick)}
        className={cn(
          "flex h-6 w-full min-w-0 items-center gap-1.5 rounded-lg border px-2 text-left text-[10px] font-extrabold leading-none transition hover:shadow-sm",
          !isFamilyEvent && colors.bg,
          !isFamilyEvent && colors.border,
          isFamilyEvent ? "text-slate-800" : colors.text
        )}
        style={familyCardStyle}
      >
        <EventDot colorId={colorId} people={people} />
        <span className="truncate">{event.title || "Untitled"}</span>
      </button>
    );
  }

  if (variant === "timeline") {
    return (
      <button
        type="button"
        onClick={(calendarEvent) => handleCardClick(event, calendarEvent, onClick)}
        className={cn(
          "group relative h-full w-full overflow-hidden rounded-xl border p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
          !isFamilyEvent && colors.bg,
          !isFamilyEvent && colors.border
        )}
        style={familyCardStyle}
      >
        <span className={cn("absolute left-0 top-0 h-full w-1.5", !isFamilyEvent && colors.stripe)} style={familyStripeStyle} />
        <div className="flex h-full min-w-0 flex-col pl-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-[11px] font-extrabold leading-tight text-slate-900 md:text-xs">
              {event.title || "Untitled event"}
            </p>
            <EventDot colorId={colorId} people={people} />
          </div>
          {eventTime && <p className="mt-1 text-[10px] font-semibold text-slate-700 md:text-[11px]">{eventTime}</p>}
          <p className="mt-0.5 truncate text-[10px] text-slate-600">{eventCategory}</p>
          {event.description && <p className="mt-1 line-clamp-2 text-[10px] text-slate-500">{event.description}</p>}
          <span className="sr-only">{assignedLabel}</span>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={(calendarEvent) => handleCardClick(event, calendarEvent, onClick)}
      className={cn(
        "group w-full rounded-2xl border p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        isFamilyEvent ? "text-slate-800" : "bg-white",
        !isFamilyEvent && colors.border
      )}
      style={familyCardStyle}
    >
      <div className="flex items-start gap-2">
        <span className="mt-1">
          <EventDot colorId={colorId} people={people} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-slate-950">{event.title || "Untitled event"}</p>
          <p className="truncate text-[11px] font-semibold text-slate-500">{eventCategory} · {assignedLabel}</p>
        </div>
      </div>

      {(eventTime || event.location) && (
        <div className="space-y-1 pl-6 text-[11px] font-semibold text-slate-500">
          {eventTime && (
            <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {eventTime}</p>
          )}
          {event.location && (
            <p className="flex items-center gap-1.5 truncate"><MapPin className="h-3.5 w-3.5 shrink-0" /> {event.location}</p>
          )}
        </div>
      )}
    </button>
  );
}
