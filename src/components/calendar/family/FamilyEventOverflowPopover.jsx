import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/personColorUtils";
import { getFamilyEventAssignmentLabel } from "@/core/events/familyEventAdapter";
import { categoryLabel, displayTimeRange } from "@/components/calendar/family/familyCalendarUi";

const PANEL_WIDTH = 340;
const PANEL_HEIGHT = 360;

function safePanelPosition(rect) {
  const margin = 16;
  const viewportWidth = window.innerWidth || 1024;
  const viewportHeight = window.innerHeight || 768;

  if (!rect || viewportWidth < 760) {
    return {
      left: margin,
      top: Math.max(margin, viewportHeight - PANEL_HEIGHT - 96),
      width: `calc(100vw - ${margin * 2}px)`,
    };
  }

  let left = rect.right + 12;
  let top = rect.top - 8;

  if (left + PANEL_WIDTH > viewportWidth - margin) left = rect.left - PANEL_WIDTH - 12;
  if (left < margin) left = viewportWidth - PANEL_WIDTH - margin;
  if (top + PANEL_HEIGHT > viewportHeight - margin) top = viewportHeight - PANEL_HEIGHT - margin;
  if (top < margin) top = margin;

  return { left, top, width: PANEL_WIDTH };
}

export function buildOverflowPanelState(badge, anchorRect) {
  return {
    badge,
    events: badge?.events || [],
    panel: safePanelPosition(anchorRect),
  };
}

function OverflowEventRow({ event, people = [], onSelect }) {
  const colorId = event.colorId || event.color_id || event.eventColor || event.event_color || "family";
  const colors = colorClasses(colorId, "slate");
  const personLabel = getFamilyEventAssignmentLabel(event, people, "Family");
  const timeText = displayTimeRange(event);

  return (
    <button
      type="button"
      onClick={(clickEvent) => onSelect?.(event, clickEvent.currentTarget.getBoundingClientRect())}
      className="flex w-full items-start gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-left transition hover:border-blue-200 hover:bg-blue-50/40"
    >
      <span className={cn("mt-1 h-4 w-4 shrink-0 rounded-full border border-white shadow-sm", colors.dot)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-slate-950">{event.title || "Untitled event"}</p>
        <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{timeText || "All-day"}</p>
        <p className="mt-0.5 truncate text-xs text-slate-400">{categoryLabel(event.category)} · {personLabel}</p>
      </div>
    </button>
  );
}

export default function FamilyEventOverflowPopover({ selected, people = [], onClose, onSelectEvent }) {
  if (!selected?.events?.length) return null;

  const { events, panel } = selected;

  return (
    <>
      <button type="button" aria-label="Close more events" className="fixed inset-0 z-[96] cursor-default bg-transparent" onClick={onClose} />
      <div
        className="fixed z-[97] max-h-[420px] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-2xl shadow-slate-900/15"
        style={{
          left: panel.left,
          top: panel.top,
          width: panel.width,
          maxWidth: "calc(100vw - 2rem)",
        }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-black text-slate-950">More events</h3>
            <p className="text-xs font-semibold text-slate-400">{events.length} hidden event{events.length === 1 ? "" : "s"}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[330px] space-y-2 overflow-y-auto bg-slate-50/60 p-3">
          {events.map((event) => (
            <OverflowEventRow
              key={event.firestoreId || event.firestore_id || event.id}
              event={event}
              people={people}
              onSelect={(selectedEvent, anchorRect) => {
                onClose?.();
                onSelectEvent?.(selectedEvent, anchorRect);
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
