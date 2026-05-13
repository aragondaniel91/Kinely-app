import { Clock, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/personColorUtils";
import { getFamilyEventAssignmentLabel } from "@/core/events/familyEventAdapter";

function timeLabel(event = {}) {
  if (event.isAllDay || event.is_all_day) return "All day";
  if (event.startTime && event.endTime) return `${event.startTime}–${event.endTime}`;
  if (event.startTime) return event.startTime;
  return "";
}

export default function FamilyEventCard({ event, people = [], compact = false, onClick }) {
  const colorId = event.colorId || event.color_id || event.eventColor || event.event_color || "family";
  const colors = colorClasses(colorId, "slate");
  const assignedLabel = event.assignedLabel || event.assigned_label || getFamilyEventAssignmentLabel(event, people, "Family");
  const eventTime = timeLabel(event);

  return (
    <button
      type="button"
      onClick={() => onClick?.(event)}
      className={cn(
        "group w-full rounded-2xl border bg-white p-2 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        colors.border,
        compact ? "space-y-1" : "space-y-2"
      )}
    >
      <div className="flex items-start gap-2">
        <span className={cn("mt-1 h-3 w-3 shrink-0 rounded-full", colors.dot)} />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate font-black text-slate-950", compact ? "text-xs" : "text-sm")}>
            {event.title || "Untitled event"}
          </p>
          <p className="truncate text-[11px] font-semibold text-slate-500">{assignedLabel}</p>
        </div>
      </div>

      {!compact && (eventTime || event.location) && (
        <div className="space-y-1 pl-5 text-[11px] font-semibold text-slate-500">
          {eventTime && (
            <p className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> {eventTime}
            </p>
          )}
          {event.location && (
            <p className="flex items-center gap-1.5 truncate">
              <MapPin className="h-3.5 w-3.5 shrink-0" /> {event.location}
            </p>
          )}
        </div>
      )}
    </button>
  );
}
