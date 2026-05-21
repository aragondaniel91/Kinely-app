import { format } from "date-fns";
import { CalendarDays, Clock, MapPin, Pencil, StickyNote, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/personColorUtils";
import { getFamilyEventAssignmentLabel } from "@/core/events/familyEventAdapter";
import { categoryEmoji, categoryLabel, displayTimeRange } from "@/features/family-calendar/utils/familyCalendarUi";

const PANEL_WIDTH = 400;
const PANEL_HEIGHT = 430;

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

  let left = rect.right + 14;
  let top = rect.top - 10;

  if (left + PANEL_WIDTH > viewportWidth - margin) left = rect.left - PANEL_WIDTH - 14;
  if (left < margin) left = viewportWidth - PANEL_WIDTH - margin;
  if (top + PANEL_HEIGHT > viewportHeight - margin) top = viewportHeight - PANEL_HEIGHT - margin;
  if (top < margin) top = margin;

  return { mode: "anchored", left, top, width: PANEL_WIDTH };
}

function PersonDot({ colorId = "family" }) {
  const colors = colorClasses(colorId, "slate");
  return <span className={cn("h-9 w-9 shrink-0 rounded-full border-2 border-white shadow-sm", colors.dot)} />;
}

function DetailRow({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <div className="flex gap-3 rounded-2xl bg-slate-50 p-3 text-sm font-medium text-slate-600">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
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
  const eventDate = event.date ? format(dateFromKey(event.date), "EEEE, MMM d") : "No date";
  const categoryText = `${categoryEmoji(event.category)} ${categoryLabel(event.category)}`;
  const notes = event.description || event.notes || "";

  return (
    <>
      <button type="button" aria-label="Close event details" className="fixed inset-0 z-[94] cursor-default bg-black/5" onClick={onClose} />
      <div
        className="fixed z-[95] overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/15"
        style={{
          left: panel.left,
          top: panel.top,
          width: panel.width,
          maxWidth: "calc(100vw - 2rem)",
        }}
      >
        <div className={cn("h-2 w-full", colors.stripe)} />

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-3 flex items-center gap-2">
                <PersonDot colorId={colorId} />
                <span className={cn("rounded-full border px-2.5 py-1 text-xs font-black", colors.bg, colors.border, colors.text)}>{personLabel}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">{categoryText}</span>
              </div>

              <h3 className="line-clamp-2 text-xl font-black leading-tight text-slate-950">{event.title || "Untitled event"}</h3>
            </div>

            <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 space-y-2">
            <DetailRow icon={CalendarDays}>{eventDate}</DetailRow>
            <DetailRow icon={Clock}>{timeText || "All-day"}</DetailRow>
            {event.location && <DetailRow icon={MapPin}>{event.location}</DetailRow>}
            <DetailRow icon={StickyNote}>{notes || <span className="text-slate-400">No notes added.</span>}</DetailRow>
          </div>

          {event.googleCalendarEventId && (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
              Google Calendar synced
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => onEdit?.(event)} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50">
              <Pencil className="h-4 w-4" />
              Edit
            </button>
            <button type="button" onClick={() => onDelete?.(event)} className="flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-100">
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
