import { format } from "date-fns";
import { MapPin, Pencil, StickyNote, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/personColorUtils";
import { getFamilyEventAssignmentLabel } from "@/core/events/familyEventAdapter";
import { categoryEmoji, categoryLabel, displayTimeRange } from "@/components/calendar/family/familyCalendarUi";

const PANEL_WIDTH = 380;
const PANEL_HEIGHT = 380;

function dateFromKey(value) {
  return new Date(`${value}T00:00:00`);
}

function safePanelPosition(rect) {
  const margin = 16;
  const viewportWidth = window.innerWidth || 1024;
  const viewportHeight = window.innerHeight || 768;

  if (!rect || viewportWidth < 760) {
    return {
      mode: "sheet",
      left: margin,
      top: Math.max(margin, viewportHeight - PANEL_HEIGHT - 96),
      width: `calc(100vw - ${margin * 2}px)`,
    };
  }

  let left = rect.right + 12;
  let top = rect.top;

  if (left + PANEL_WIDTH > viewportWidth - margin) left = rect.left - PANEL_WIDTH - 12;
  if (left < margin) left = viewportWidth - PANEL_WIDTH - margin;
  if (top + PANEL_HEIGHT > viewportHeight - margin) top = viewportHeight - PANEL_HEIGHT - margin;
  if (top < margin) top = margin;

  return { mode: "anchored", left, top, width: PANEL_WIDTH };
}

function PersonDot({ colorId = "family" }) {
  const colors = colorClasses(colorId, "slate");
  return <span className={cn("h-8 w-8 shrink-0 rounded-full border border-white shadow-sm", colors.dot)} />;
}

export function buildEventPanelState(event, anchorRect) {
  return {
    event,
    panel: safePanelPosition(anchorRect),
  };
}

export default function FamilyEventDetailsPopover({ selected, people = [], onClose, onEdit, onDelete }) {
  if (!selected?.event) return null;

  const { event, panel } = selected;
  const colorId = event.colorId || event.color_id || event.eventColor || event.event_color || "family";
  const colors = colorClasses(colorId, "slate");
  const personLabel = getFamilyEventAssignmentLabel(event, people, "Family");
  const timeText = displayTimeRange(event);
  const eventDate = event.date ? format(dateFromKey(event.date), "EEE, MMM d") : "";

  return (
    <>
      <button type="button" aria-label="Close event details" className="fixed inset-0 z-[94] cursor-default bg-transparent" onClick={onClose} />
      <div
        className="fixed z-[95] rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl"
        style={{
          left: panel.left,
          top: panel.top,
          width: panel.width,
          maxWidth: "calc(100vw - 2rem)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-lg font-extrabold text-slate-950">{event.title || "Untitled event"}</h3>
            <p className="mt-1 text-sm font-medium text-slate-600">{eventDate} · {timeText}</p>
            <p className="mt-1 text-sm text-slate-500">{categoryEmoji(event.category)} {categoryLabel(event.category)}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <PersonDot colorId={colorId} />
          <span className={cn("rounded-full border px-2 py-1 text-xs font-black", colors.bg, colors.border, colors.text)}>{personLabel}</span>
          {event.googleCalendarEventId && (
            <span className="ml-auto rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Google synced</span>
          )}
        </div>

        <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">
          {event.location && (
            <p className="flex gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{event.location}</span>
            </p>
          )}
          {event.description || event.notes ? (
            <p className="flex gap-2">
              <StickyNote className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{event.description || event.notes}</span>
            </p>
          ) : (
            <p className="text-slate-400">No notes added.</p>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t pt-4">
          <button type="button" onClick={() => onEdit?.(event)} className="flex flex-col items-center gap-1 rounded-2xl p-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button type="button" onClick={() => onDelete?.(event.id)} className="col-span-2 flex flex-col items-center gap-1 rounded-2xl p-2 text-xs font-semibold text-red-500 hover:bg-red-50">
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      </div>
    </>
  );
}
