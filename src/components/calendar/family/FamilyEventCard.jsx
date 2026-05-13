import { Clock, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/personColorUtils";
import { getFamilyEventAssignmentLabel } from "@/core/events/familyEventAdapter";

function timeLabel(event = {}) {
  if (event.isAllDay || event.is_all_day) return "All-day";
  if (event.startTime && event.endTime) return `${event.startTime} – ${event.endTime}`;
  if (event.startTime) return event.startTime;
  return "";
}

export default function FamilyEventCard({ event, people = [], variant = "month", onClick }) {
  const colorId = event.colorId || event.color_id || event.eventColor || event.event_color || "family";
  const colors = colorClasses(colorId, "slate");
  const assignedLabel = event.assignedLabel || event.assigned_label || getFamilyEventAssignmentLabel(event, people, "Family");
  const eventTime = timeLabel(event);

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={() => onClick?.(event)}
        className={cn(
          "flex h-6 w-full min-w-0 items-center gap-1.5 rounded-full border px-2 text-left text-[11px] font-black leading-none transition hover:shadow-sm",
          colors.bg,
          colors.border,
          colors.text
        )}
      >
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", colors.dot)} />
        <span className="truncate">{event.title || "Untitled"}</span>
      </button>
    );
  }

  if (variant === "timeline") {
    return (
      <button
        type="button"
        onClick={() => onClick?.(event)}
        className={cn(
          "group h-full w-full overflow-hidden rounded-xl border bg-white/90 p-2 text-left shadow-sm backdrop-blur transition hover:z-20 hover:-translate-y-0.5 hover:shadow-lg",
          colors.border,
          colors.bg
        )}
      >
        <div className={cn("absolute inset-y-0 left-0 w-1.5", colors.stripe)} />
        <div className="flex h-full min-w-0 flex-col pl-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-xs font-black text-slate-950">{event.title || "Untitled event"}</p>
            <span className={cn("mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full", colors.dot)} />
          </div>
          {eventTime && <p className="mt-0.5 truncate text-[10px] font-bold text-slate-600">{eventTime}</p>}
          <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">{assignedLabel}</p>
          {event.location && <p className="mt-auto truncate text-[10px] font-semibold text-slate-400">{event.location}</p>}
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick?.(event)}
      className={cn(
        "group w-full rounded-2xl border bg-white p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        colors.border
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn("mt-1 h-3 w-3 shrink-0 rounded-full", colors.dot)} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-slate-950">{event.title || "Untitled event"}</p>
          <p className="truncate text-[11px] font-semibold text-slate-500">{assignedLabel}</p>
        </div>
      </div>

      {(eventTime || event.location) && (
        <div className="space-y-1 pl-5 text-[11px] font-semibold text-slate-500">
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
