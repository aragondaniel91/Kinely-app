import { useEffect, useMemo, useState } from "react";
import { addDays, addMonths, subMonths } from "date-fns";
import { useSearchParams } from "react-router-dom";
import { collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { Plus } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useFamily } from "@/lib/FamilyContext";
import { db } from "@/lib/firebase";
import { getFirestoreDocumentId, mapFirestoreDoc } from "@/core/firestore/firestoreDocUtils";
import { deleteFamilyEventById } from "@/services/familyEventsService";
import AddFamilyEventDialog from "@/features/family-calendar/components/AddFamilyEventDialog";
import FamilyCalendarPlannerHeader from "@/features/family-calendar/components/FamilyCalendarPlannerHeader";
import FamilyCalendarMonthGrid from "@/features/family-calendar/components/FamilyCalendarMonthGrid";
import FamilyCalendarTimelineGrid from "@/features/family-calendar/components/FamilyCalendarTimelineGrid";
import FamilyEventDetailsPopover, { buildEventPanelState } from "@/features/family-calendar/components/FamilyEventDetailsPopover";
import FamilyEventOverflowPopover, { buildOverflowPanelState } from "@/features/family-calendar/components/FamilyEventOverflowPopover";
import { FAMILY_CALENDAR_CATEGORIES } from "@/features/family-calendar/utils/familyCalendarUi";
import { ALL_ASSIGNMENT_ID, FAMILY_ASSIGNMENT_ID, useFamilyCalendarFilters } from "@/features/family-calendar/hooks/useFamilyCalendarFilters";
import { useFamilyCalendarDateRange } from "@/features/family-calendar/hooks/useFamilyCalendarDateRange";
import { useFamilyCalendarEvents } from "@/features/family-calendar/hooks/useFamilyCalendarEvents";
import { TASK_COLLECTIONS } from "@/features/tasks/model/taskTypes";
import { adaptFamilyEvent } from "@/core/events/familyEventAdapter";
import {
  canAssignCalendarEventsToMember,
  shouldShowMemberInCalendar,
} from "@/features/tasks/utils/memberModuleVisibility";

const categoryOptions = FAMILY_CALENDAR_CATEGORIES;

function eventMatchesRequestedId(event = {}, requestedEventId = "") {
  if (!requestedEventId) return false;

  return [
    event.id,
    event.firestoreId,
    event.firestore_id,
    event.documentId,
    event.document_id,
    event.docId,
    event.doc_id,
    event.eventId,
    event.event_id,
    event.legacyId,
    event.legacy_id,
    event.legacyEventId,
    event.legacy_event_id,
    event.googleCalendarEventId,
    event.google_calendar_event_id,
  ]
    .filter(Boolean)
    .some((value) => String(value) === String(requestedEventId));
}

function focusEventPanel(event, setAnchorDate, setSelectedOverflow, setSelectedEvent) {
  if (event?.date) {
    setAnchorDate(new Date(`${event.date}T00:00:00`));
  }

  setSelectedOverflow(null);
  setSelectedEvent(buildEventPanelState(event, null));
}


export default function FamilyCalendarView({ viewMode = "week", setViewMode }) {
  const { familyId, profile, familyPeople, perms } = useFamily();
  const [searchParams, setSearchParams] = useSearchParams();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [addDate, setAddDate] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedOverflow, setSelectedOverflow] = useState(null);
  const [selectedPersonId, setSelectedPersonId] = useState(ALL_ASSIGNMENT_ID);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [eventToDelete, setEventToDelete] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [now, setNow] = useState(() => new Date());

  const people = familyPeople || [];
  const canWriteCalendar = perms?.calendar?.write !== false;
  const canReadLists = perms?.lists?.read !== false;
  const canWriteLists = perms?.lists?.write !== false;
  const canReadTasks = perms?.tasks?.read !== false;
  const canWriteTasks = perms?.tasks?.write !== false;
  const { events, loading, loadEvents } = useFamilyCalendarEvents({ familyId, people });
  const calendarPeople = useMemo(
    () => people.filter((person) => shouldShowMemberInCalendar(person)),
    [people]
  );
  const assignableCalendarPeople = useMemo(
    () => people.filter((person) => canAssignCalendarEventsToMember(person)),
    [people]
  );
  const { filteredEvents, eventsByDay } = useFamilyCalendarFilters({
    events,
    selectedPersonId,
    selectedCategory,
  });
  const {
    weekStart,
    weekEnd,
    monthDays,
    timelineDays,
    summaryEventsForCurrentView,
  } = useFamilyCalendarDateRange({
    anchorDate,
    viewMode,
    filteredEvents,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (
      selectedPersonId !== ALL_ASSIGNMENT_ID &&
      selectedPersonId !== FAMILY_ASSIGNMENT_ID &&
      !calendarPeople.some((person) => person.id === selectedPersonId)
    ) {
      setSelectedPersonId(ALL_ASSIGNMENT_ID);
    }
  }, [calendarPeople, selectedPersonId]);

  useEffect(() => {
    const requestedEventId = searchParams.get("eventId");

    if (!requestedEventId || loading) return;

    let cancelled = false;

    async function openRequestedEvent() {
      const loadedMatch = events.find((event) =>
        eventMatchesRequestedId(event, requestedEventId)
      );

      if (loadedMatch) {
        focusEventPanel(loadedMatch, setAnchorDate, setSelectedOverflow, setSelectedEvent);
        setSearchParams({}, { replace: true });
        return;
      }

      try {
        const directSnap = await getDoc(doc(db, "familyEvents", requestedEventId));

        if (!cancelled && directSnap.exists()) {
          const rawEvent = mapFirestoreDoc(directSnap, { type: "familyEvent" });
          const adaptedEvent = adaptFamilyEvent(rawEvent, people);

          focusEventPanel(adaptedEvent, setAnchorDate, setSelectedOverflow, setSelectedEvent);
          setSearchParams({}, { replace: true });
          return;
        }

        const aliasFields = [
          "id",
          "eventId",
          "event_id",
          "legacyId",
          "legacy_id",
          "googleCalendarEventId",
          "google_calendar_event_id",
        ];

        for (const field of aliasFields) {
          const aliasSnap = await getDocs(
            query(
              collection(db, "familyEvents"),
              where("familyId", "==", familyId),
              where(field, "==", requestedEventId)
            )
          );

          if (cancelled) return;

          if (!aliasSnap.empty) {
            const rawEvent = mapFirestoreDoc(aliasSnap.docs[0], { type: "familyEvent" });
            const adaptedEvent = adaptFamilyEvent(rawEvent, people);

            focusEventPanel(adaptedEvent, setAnchorDate, setSelectedOverflow, setSelectedEvent);
            setSearchParams({}, { replace: true });
            return;
          }
        }

        if (!cancelled) {
          console.warn("Could not find linked calendar event", requestedEventId);

          setSearchParams({}, { replace: true });
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error opening linked calendar event", error);
          setSearchParams({}, { replace: true });
        }
      }
    }

    openRequestedEvent();

    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams, events, loading, familyId, people]);



  function goPrevious() {
    if (viewMode === "month") setAnchorDate((date) => subMonths(date, 1));
    else setAnchorDate((date) => addDays(date, viewMode === "day" ? -1 : -7));
  }

  function goNext() {
    if (viewMode === "month") setAnchorDate((date) => addMonths(date, 1));
    else setAnchorDate((date) => addDays(date, viewMode === "day" ? 1 : 7));
  }

  function handleChangeMonth(nextDate) {
    setAnchorDate(nextDate);
    setViewMode?.("month");
  }

  function handleEventSelect(event, anchorRect) {
    setSelectedOverflow(null);
    setSelectedEvent(buildEventPanelState(event, anchorRect));
  }

  function handleOverflowSelect(badge, anchorRect) {
    setSelectedEvent(null);
    setSelectedOverflow(buildOverflowPanelState(badge, anchorRect));
  }

  function handleEditEvent(event) {
    if (!canWriteCalendar) return;

    setSelectedEvent(null);
    setSelectedOverflow(null);
    setEditEvent(event);
    setAddDate(event?.date ? new Date(`${event.date}T00:00:00`) : new Date(anchorDate));
  }

  function handleDeleteEvent(eventOrId) {
    if (!canWriteCalendar) return;

    const documentId = typeof eventOrId === "string" ? eventOrId : getFirestoreDocumentId(eventOrId || {});
    if (!documentId) return;

    setDeleteError("");
    setSelectedEvent(null);
    setSelectedOverflow(null);
    setEventToDelete({
      documentId,
      title: typeof eventOrId === "string" ? "this event" : eventOrId?.title || "this event",
    });
  }

  async function unlinkDeletedEventReferences(documentId) {
    if (!familyId || !documentId || (!canWriteLists && !canWriteTasks)) return;

    try {
      const [listSnap, taskSnap] = await Promise.all([
        canWriteLists
          ? getDocs(
              query(
                collection(db, "familyLists"),
                where("familyId", "==", familyId),
                where("linkedEventId", "==", documentId)
              )
            )
          : Promise.resolve({ docs: [] }),
        canWriteTasks
          ? getDocs(
              query(
                collection(db, TASK_COLLECTIONS.tasks),
                where("familyId", "==", familyId),
                where("linkedEventId", "==", documentId)
              )
            )
          : Promise.resolve({ docs: [] }),
      ]);

      await Promise.all([
        ...listSnap.docs.map((docSnap) =>
          updateDoc(doc(db, "familyLists", docSnap.id), {
            linkedEventId: "",
            linked_event_id: "",
            source: "manual",
            source_type: "manual",
            formerLinkedEventId: documentId,
            former_linked_event_id: documentId,
            eventUnlinkedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        ),
        ...taskSnap.docs.map((docSnap) =>
          updateDoc(doc(db, TASK_COLLECTIONS.tasks, docSnap.id), {
            linkedEventId: "",
            linked_event_id: "",
            linkedEventTitle: "",
            linked_event_title: "",
            formerLinkedEventId: documentId,
            former_linked_event_id: documentId,
            eventUnlinkedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        ),
      ]);
    } catch (error) {
      console.error("Error unlinking deleted event references", error);
    }
  }

  async function confirmDeleteEvent() {
    if (!canWriteCalendar || !eventToDelete?.documentId) return;

    setDeletingEvent(true);
    setDeleteError("");

    try {
      await deleteFamilyEventById(eventToDelete.documentId);
      await unlinkDeletedEventReferences(eventToDelete.documentId);
      setSelectedEvent(null);
      setSelectedOverflow(null);
      setEventToDelete(null);
      await loadEvents();
    } catch (error) {
      console.error("Error deleting family event", error);
      setDeleteError(error?.message || "There was an error deleting this event.");
    } finally {
      setDeletingEvent(false);
    }
  }

  function closeEventDialog() {
    setAddDate(null);
    setEditEvent(null);
  }

  async function handleEventSaved() {
    closeEventDialog();
    await loadEvents();
  }

  return (
    <div className="kinly-gradient-bg min-h-full px-3 pb-28 pt-3 md:px-5 md:pb-12 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="relative z-30 overflow-visible rounded-[2rem] border border-white/80 bg-white/82 shadow-[0_18px_52px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <FamilyCalendarPlannerHeader
            profile={profile}
            people={calendarPeople}
            now={now}
            anchorDate={anchorDate}
            viewMode={viewMode}
            visibleEventCount={summaryEventsForCurrentView.length}
            selectedPersonId={selectedPersonId}
            selectedCategory={selectedCategory}
            categoryOptions={categoryOptions}
            weekStart={weekStart}
            weekEnd={weekEnd}
            onSelectPerson={setSelectedPersonId}
            onSelectCategory={setSelectedCategory}
            onPrevious={goPrevious}
            onToday={() => setAnchorDate(new Date())}
            onNext={goNext}
            onViewModeChange={setViewMode}
            onSync={loadEvents}
            onChangeMonth={handleChangeMonth}
            onPreviousMonth={() => handleChangeMonth(subMonths(anchorDate, 1))}
            onNextMonth={() => handleChangeMonth(addMonths(anchorDate, 1))}
          />
        </div>

        {loading ? (
          <div className="flex min-h-[520px] items-center justify-center rounded-[2rem] border border-white/80 bg-white/82 text-sm font-black text-slate-400 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl">
            Loading family events...
          </div>
        ) : (
          <div className="relative z-10 overflow-hidden rounded-[2rem] border border-white/80 bg-white/84 shadow-[0_18px_52px_rgba(15,23,42,0.07)] backdrop-blur-xl">
            {viewMode === "month" ? (
              <FamilyCalendarMonthGrid
                monthDays={monthDays}
                anchorDate={anchorDate}
                eventsByDay={eventsByDay}
                people={people}
                canWrite={canWriteCalendar}
                onAddDate={setAddDate}
                onEventSelect={handleEventSelect}
                onOverflowSelect={handleOverflowSelect}
              />
            ) : (
              <FamilyCalendarTimelineGrid
                viewMode={viewMode}
                timelineDays={timelineDays}
                eventsByDay={eventsByDay}
                people={people}
                canWrite={canWriteCalendar}
                onAddDate={setAddDate}
                onEventSelect={handleEventSelect}
                onOverflowSelect={handleOverflowSelect}
              />
            )}
          </div>
        )}
      </div>

      {canWriteCalendar && (
        <button
          type="button"
          onClick={() => setAddDate(new Date(anchorDate))}
          className="fixed bottom-28 right-5 z-[90] flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-white shadow-xl shadow-blue-600/25 transition hover:scale-105 hover:bg-blue-700 active:scale-95 md:bottom-8 md:right-8 md:h-14 md:w-auto"
          aria-label="Add event"
        >
          <Plus className="h-6 w-6" />
          <span className="hidden text-sm font-black md:inline">Add event</span>
        </button>
      )}

      <FamilyEventOverflowPopover
        selected={selectedOverflow}
        people={people}
        onClose={() => setSelectedOverflow(null)}
        onSelectEvent={handleEventSelect}
      />

      <FamilyEventDetailsPopover
        selected={selectedEvent}
        people={people}
        canReadLists={canReadLists}
        canWriteLists={canWriteLists}
        canReadTasks={canReadTasks}
        canWriteTasks={canWriteTasks}
        canWriteCalendar={canWriteCalendar}
        onClose={() => setSelectedEvent(null)}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />

      <AlertDialog
        open={Boolean(eventToDelete)}
        onOpenChange={(open) => {
          if (!open && !deletingEvent) {
            setEventToDelete(null);
            setDeleteError("");
          }
        }}
      >
        <AlertDialogContent className="rounded-[2rem] border-slate-200 bg-white p-6 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight text-slate-950">
              Delete event?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-semibold leading-6 text-slate-500">
              This will remove {eventToDelete?.title || "this event"} from the family calendar only. Linked lists and tasks will stay available, but they will no longer point back to this event. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
              {deleteError}
            </div>
          )}

          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel disabled={deletingEvent} className="rounded-2xl font-black">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingEvent}
              onClick={(event) => {
                event.preventDefault();
                confirmDeleteEvent();
              }}
              className="rounded-2xl bg-red-600 font-black text-white hover:bg-red-700"
            >
              {deletingEvent ? "Deleting..." : "Delete event"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {addDate && (
        <AddFamilyEventDialog
          date={addDate}
          editEvent={editEvent}
          assignablePeople={assignableCalendarPeople}
          canWrite={canWriteCalendar}
          canWriteLists={canWriteLists}
          onClose={closeEventDialog}
          onSuccess={handleEventSaved}
        />
      )}
    </div>
  );
}
