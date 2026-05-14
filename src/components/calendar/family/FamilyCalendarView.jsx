import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { Plus } from "lucide-react";
import { collection, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { getFirestoreDocumentId, mapFirestoreDoc } from "@/core/firestore/firestoreDocUtils";
import { adaptFamilyEvents } from "@/core/events/familyEventAdapter";
import AddFamilyEventDialog from "@/components/calendar/AddFamilyEventDialog";
import FamilyCalendarPlannerHeader from "@/components/calendar/family/FamilyCalendarPlannerHeader";
import FamilyCalendarMonthGrid from "@/components/calendar/family/FamilyCalendarMonthGrid";
import FamilyCalendarTimelineGrid from "@/components/calendar/family/FamilyCalendarTimelineGrid";
import FamilyEventDetailsPopover, { buildEventPanelState } from "@/components/calendar/family/FamilyEventDetailsPopover";
import FamilyEventOverflowPopover, { buildOverflowPanelState } from "@/components/calendar/family/FamilyEventOverflowPopover";
import { FAMILY_CALENDAR_CATEGORIES } from "@/components/calendar/family/familyCalendarUi";

const FAMILY_ASSIGNMENT_ID = "family";
const categoryOptions = FAMILY_CALENDAR_CATEGORIES;

function eventMatchesPerson(event, selectedPersonId) {
  if (!selectedPersonId || selectedPersonId === FAMILY_ASSIGNMENT_ID) return true;
  return (event.assignedPersonIds || event.assigned_person_ids || []).includes(selectedPersonId);
}

function eventMatchesCategory(event, selectedCategory) {
  if (!selectedCategory || selectedCategory === "all") return true;
  return event.category === selectedCategory;
}

function buildEventsByDay(events = []) {
  const map = new Map();
  events.forEach((event) => {
    if (!event.date) return;
    if (!map.has(event.date)) map.set(event.date, []);
    map.get(event.date).push(event);
  });
  return map;
}

export default function FamilyCalendarView({ viewMode = "week", setViewMode }) {
  const { familyId, profile, familyPeople } = useFamily();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addDate, setAddDate] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedOverflow, setSelectedOverflow] = useState(null);
  const [selectedPersonId, setSelectedPersonId] = useState(FAMILY_ASSIGNMENT_ID);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [now, setNow] = useState(() => new Date());

  const people = familyPeople || [];
  const weekStart = useMemo(() => startOfWeek(anchorDate, { weekStartsOn: 1 }), [anchorDate]);
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  async function loadEvents() {
    if (!familyId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, "familyEvents"), where("familyId", "==", familyId));
      const snap = await getDocs(q);
      const rawEvents = snap.docs.map((docSnap) => mapFirestoreDoc(docSnap, { type: "familyEvent" }));
      setEvents(adaptFamilyEvents(rawEvents, people));
    } catch (error) {
      console.error("Error loading family events", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, people.map((person) => `${person.id}:${person.colorId}`).join("|")]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleEvents = useMemo(
    () => events.filter((event) => eventMatchesPerson(event, selectedPersonId) && eventMatchesCategory(event, selectedCategory)),
    [events, selectedPersonId, selectedCategory]
  );

  const eventsByDay = useMemo(() => buildEventsByDay(visibleEvents), [visibleEvents]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(anchorDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(anchorDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [anchorDate]);

  const weekDays = useMemo(
    () => eachDayOfInterval({ start: weekStart, end: weekEnd }),
    [weekStart, weekEnd]
  );

  const timelineDays = viewMode === "day" ? [anchorDate] : weekDays;

  function goPrevious() {
    if (viewMode === "month") setAnchorDate((date) => subMonths(date, 1));
    else setAnchorDate((date) => addDays(date, viewMode === "day" ? -1 : -7));
  }

  function goNext() {
    if (viewMode === "month") setAnchorDate((date) => addMonths(date, 1));
    else setAnchorDate((date) => addDays(date, viewMode === "day" ? 1 : 7));
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
    setSelectedEvent(null);
    setSelectedOverflow(null);
    setEditEvent(event);
    setAddDate(event?.date ? new Date(`${event.date}T00:00:00`) : new Date(anchorDate));
  }

  async function handleDeleteEvent(eventOrId) {
    const documentId = typeof eventOrId === "string" ? eventOrId : getFirestoreDocumentId(eventOrId || {});
    if (!documentId) return;
    const confirmed = window.confirm("Delete this event?");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "familyEvents", documentId));
      setSelectedEvent(null);
      setSelectedOverflow(null);
      await loadEvents();
    } catch (error) {
      console.error("Error deleting family event", error);
      alert(`There was an error deleting the event: ${error.message}`);
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
    <div className="min-h-full bg-white pb-24">
      <FamilyCalendarPlannerHeader
        profile={profile}
        people={people}
        now={now}
        anchorDate={anchorDate}
        viewMode={viewMode}
        visibleEventCount={visibleEvents.length}
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
      />

      {loading ? (
        <div className="flex min-h-[520px] items-center justify-center text-sm font-black text-slate-400">
          Loading family events...
        </div>
      ) : (
        <div className="mt-5 border-t border-slate-100">
          {viewMode === "month" ? (
            <FamilyCalendarMonthGrid
              monthDays={monthDays}
              anchorDate={anchorDate}
              eventsByDay={eventsByDay}
              people={people}
              onAddDate={setAddDate}
              onEventSelect={handleEventSelect}
            />
          ) : (
            <FamilyCalendarTimelineGrid
              viewMode={viewMode}
              timelineDays={timelineDays}
              eventsByDay={eventsByDay}
              people={people}
              onAddDate={setAddDate}
              onEventSelect={handleEventSelect}
              onOverflowSelect={handleOverflowSelect}
            />
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setAddDate(new Date(anchorDate))}
        className="fixed bottom-24 right-8 z-[90] flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-4xl font-light leading-none text-white shadow-xl shadow-blue-600/30 transition hover:scale-105 hover:bg-blue-700 active:scale-95 md:bottom-8"
        aria-label="Add event"
      >
        <Plus className="h-8 w-8" />
      </button>

      <FamilyEventOverflowPopover
        selected={selectedOverflow}
        people={people}
        onClose={() => setSelectedOverflow(null)}
        onSelectEvent={handleEventSelect}
      />

      <FamilyEventDetailsPopover
        selected={selectedEvent}
        people={people}
        onClose={() => setSelectedEvent(null)}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
      />

      {addDate && (
        <AddFamilyEventDialog
          date={addDate}
          editEvent={editEvent}
          onClose={closeEventDialog}
          onSuccess={handleEventSaved}
        />
      )}
    </div>
  );
}
