import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  CalendarDays,
  CheckSquare,
  Clock,
  ListChecks,
  MapPin,
  Pencil,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { useToast } from "@/components/ui/use-toast";
import { TASK_COLLECTIONS } from "@/features/tasks/model/taskTypes";
import { cn } from "@/lib/utils";
import { colorClasses } from "@/lib/personColorUtils";
import { getFamilyEventAssignmentLabel } from "@/core/events/familyEventAdapter";
import {
  categoryEmoji,
  categoryLabel,
  displayTimeRange,
} from "@/features/family-calendar/utils/familyCalendarUi";

const PANEL_WIDTH = 400;
const PANEL_HEIGHT = 500;

function dateFromKey(value) {
  return new Date(`${value}T00:00:00`);
}

function safePanelPosition(rect) {
  const margin = 16;
  const viewportWidth = window.innerWidth || 1024;
  const viewportHeight = window.innerHeight || 768;

  if (!rect && viewportWidth >= 760) {
    return {
      mode: "anchored",
      left: Math.max(margin, Math.round((viewportWidth - PANEL_WIDTH) / 2)),
      top: Math.max(margin, Math.round((viewportHeight - PANEL_HEIGHT) / 2)),
      width: PANEL_WIDTH,
    };
  }

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

  if (left + PANEL_WIDTH > viewportWidth - margin) {
    left = rect.left - PANEL_WIDTH - 14;
  }

  if (left < margin) left = viewportWidth - PANEL_WIDTH - margin;

  if (top + PANEL_HEIGHT > viewportHeight - margin) {
    top = viewportHeight - PANEL_HEIGHT - margin;
  }

  if (top < margin) top = margin;

  return { mode: "anchored", left, top, width: PANEL_WIDTH };
}

function getLinkedListTypeFromEvent(event = {}) {
  const category = String(event.category || event.type || "").toLowerCase();
  const title = String(event.title || "").toLowerCase();

  if (
    category.includes("meal") ||
    title.includes("dinner") ||
    title.includes("lunch") ||
    title.includes("taco")
  ) {
    return "meal";
  }

  if (
    category.includes("school") ||
    title.includes("school") ||
    title.includes("project") ||
    title.includes("homework")
  ) {
    return "school";
  }

  if (
    title.includes("car") ||
    title.includes("jeep") ||
    title.includes("oil") ||
    title.includes("maintenance")
  ) {
    return "car";
  }

  return "event";
}

function PersonDot({ colorId = "family" }) {
  const colors = colorClasses(colorId, "slate");

  return (
    <span
      className={cn(
        "h-9 w-9 shrink-0 rounded-full border-2 border-white shadow-sm",
        colors.dot
      )}
    />
  );
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

export default function FamilyEventDetailsPopover({
  selected,
  people = [],
  onClose,
  onEdit,
  onDelete,
}) {
  const { familyId, user } = useFamily();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [creatingLinkedList, setCreatingLinkedList] = useState(false);
  const [checkingLinkedList, setCheckingLinkedList] = useState(false);
  const [linkedList, setLinkedList] = useState(null);
  const [linkedTasks, setLinkedTasks] = useState([]);

  const event = selected?.event || null;
  const panel = selected?.panel || null;

  const eventId =
    event?.id ||
    event?.documentId ||
    event?.firestoreId ||
    event?.eventId ||
    event?.googleCalendarEventId ||
    "";

  const eventTitle = event?.title || "Family event";

  useEffect(() => {
    async function loadLinkedList() {
      if (!familyId || !eventId) {
        setLinkedList(null);
        setLinkedTasks([]);
        return;
      }

      setCheckingLinkedList(true);

      try {
        const snap = await getDocs(
          query(
            collection(db, "familyLists"),
            where("familyId", "==", familyId),
            where("linkedEventId", "==", eventId)
          )
        );

        const match = snap.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .find((list) => list.status !== "archived");

        setLinkedList(match || null);

        const taskSnap = await getDocs(
          query(
            collection(db, TASK_COLLECTIONS.tasks),
            where("familyId", "==", familyId),
            where("linkedEventId", "==", eventId)
          )
        );

        const eventTasks = taskSnap.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .filter((task) => {
            const status = String(task.status || "").toLowerCase();
            return (
              status !== "archived" &&
              status !== "cancelled" &&
              status !== "canceled" &&
              status !== "skipped"
            );
          });

        setLinkedTasks(eventTasks);
      } catch (error) {
        console.error("Error checking linked list:", error);
        setLinkedList(null);
      } finally {
        setCheckingLinkedList(false);
      }
    }

    loadLinkedList();
  }, [familyId, eventId]);

  if (!event || !panel) return null;

  const colorId =
    event.colorId ||
    event.color_id ||
    event.eventColor ||
    event.event_color ||
    "family";

  const colors = colorClasses(colorId, "slate");
  const personLabel = getFamilyEventAssignmentLabel(event, people, "Family");
  const timeText = displayTimeRange(event);
  const eventDate = event.date
    ? format(dateFromKey(event.date), "EEEE, MMM d")
    : "No date";

  const categoryText = `${categoryEmoji(event.category)} ${categoryLabel(
    event.category
  )}`;

  const notes = event.description || event.notes || "";

  function handleViewLinkedList() {
    if (!linkedList?.id) return;

    onClose?.();
    navigate(`/lists?listId=${linkedList.id}`);
  }

  function handleCreateLinkedTask() {
    const params = new URLSearchParams({
      action: "createTask",
      linkedEventId: eventId,
      eventTitle,
      assigneePersonId: "family",
    });

    onClose?.();
    navigate(`/tasks?${params.toString()}`);
  }

  function handleViewLinkedTasks() {
    const params = new URLSearchParams({
      linkedEventId: eventId,
      eventTitle,
    });

    onClose?.();
    navigate(`/tasks?${params.toString()}`);
  }

  async function handleCreateLinkedList() {
    if (!familyId || creatingLinkedList) return;

    if (linkedList?.id) {
      handleViewLinkedList();
      return;
    }

    setCreatingLinkedList(true);

    try {
      const docRef = await addDoc(collection(db, "familyLists"), {
        title: eventTitle,
        type: getLinkedListTypeFromEvent(event),
        description: "Linked to calendar event.",
        status: "active",

        familyId,
        family_id: familyId,

        linkedEventId: eventId,
        linked_event_id: eventId,
        source: "calendar",
        source_type: "calendar",

        createdBy: user?.uid || null,
        createdByEmail: user?.email || null,
        created_date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Linked list created",
        description: `"${eventTitle}" is ready in Family Lists.`,
      });

      onClose?.();
      navigate(`/lists?listId=${docRef.id}`);
    } catch (error) {
      console.error("Error creating linked list:", error);

      toast({
        title: "Could not create linked list",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreatingLinkedList(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close event details"
        className="fixed inset-0 z-[94] cursor-default bg-black/5"
        onClick={onClose}
      />

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

                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs font-black",
                    colors.bg,
                    colors.border,
                    colors.text
                  )}
                >
                  {personLabel}
                </span>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">
                  {categoryText}
                </span>
              </div>

              <h3 className="line-clamp-2 text-xl font-black leading-tight text-slate-950">
                {eventTitle}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 space-y-2">
            <DetailRow icon={CalendarDays}>{eventDate}</DetailRow>
            <DetailRow icon={Clock}>{timeText || "All-day"}</DetailRow>

            {event.location && (
              <DetailRow icon={MapPin}>{event.location}</DetailRow>
            )}

            <DetailRow icon={StickyNote}>
              {notes || <span className="text-slate-400">No notes added.</span>}
            </DetailRow>
          </div>

          {event.googleCalendarEventId && (
            <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
              Google Calendar synced
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-2 border-t border-slate-100 pt-4">
            {linkedTasks.length > 0 && (
              <button
                type="button"
                onClick={handleViewLinkedTasks}
                className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
              >
                <CheckSquare className="h-4 w-4" />
                View linked tasks ({linkedTasks.length})
              </button>
            )}

            <button
              type="button"
              onClick={handleCreateLinkedTask}
              className="flex items-center justify-center gap-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-black text-blue-700 transition hover:bg-blue-100"
            >
              <CheckSquare className="h-4 w-4" />
              {linkedTasks.length > 0 ? "Create another task" : "Create linked task"}
            </button>

            {linkedList ? (
              <button
                type="button"
                onClick={handleViewLinkedList}
                className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
              >
                <ListChecks className="h-4 w-4" />
                View linked list
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateLinkedList}
                disabled={creatingLinkedList || checkingLinkedList}
                className="flex items-center justify-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-black text-violet-700 transition hover:bg-violet-100 disabled:opacity-60"
              >
                <ListChecks className="h-4 w-4" />
                {checkingLinkedList
                  ? "Checking list..."
                  : creatingLinkedList
                    ? "Creating..."
                    : "Create linked list"}
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onEdit?.(event)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>

              <button
                type="button"
                onClick={() => onDelete?.(event)}
                className="flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-600 transition hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
