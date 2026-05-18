import { useEffect, useState } from "react";
import { addDays, addMonths, subMonths } from "date-fns";
import { Plus } from "lucide-react";

import { useFamily } from "@/lib/FamilyContext";
import { getFirestoreDocumentId } from "@/core/firestore/firestoreDocUtils";
import { deleteFamilyEventById } from "@/services/familyEventsService";
import AddFamilyEventDialog from "@/components/calendar/AddFamilyEventDialog";
import FamilyCalendarPlannerHeader from "@/components/calendar/family/FamilyCalendarPlannerHeader";
import FamilyCalendarMonthGrid from "@/components/calendar/family/FamilyCalendarMonthGrid";
import FamilyCalendarTimelineGrid from "@/components/calendar/family/FamilyCalendarTimelineGrid";
import FamilyEventDetailsPopover, { buildEventPanelState } from "@/components/calendar/family/FamilyEventDetailsPopover";
import FamilyEventOverflowPopover, { buildOverflowPanelState } from "@/components/calendar/family/FamilyEventOverflowPopover";
import { FAMILY_CALENDAR_CATEGORIES } from "@/components/calendar/family/familyCalendarUi";
import { ALL_ASSIGNMENT_ID, useFamilyCalendarFilters } from "@/components/calendar/family/hooks/useFamilyCalendarFilters";
import { useFamilyCalendarDateRange } from "@/components/calendar/family/hooks/useFamilyCalendarDateRange";
import { useFamilyCalendarEvents } from "@/components/calendar/family/hooks/useFamilyCalendarEvents";

const categoryOptions = FAMILY_CALENDAR_CATEGORIES;

export default function FamilyCalendarView({ viewMode = "week", setViewMode }) {
  const { familyId, profile, familyPeople } = useFamily();
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [addDate, setAddDate] = useState(null);
  const [editEvent, setEditEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedOverflow, setSelectedOverflow] = useState(null);
  const [selectedPersonId, setSelectedPersonId] = useState(ALL_ASSIGNMENT_ID);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [now, setNow] = useState(() => new Date());

  const people = familyPeople || [];
  const { events, loading, loadEvents } = useFamilyCalendarEvents({ familyId, people });
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
      await deleteFamilyEventById(documentId);
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
    <div className="kinly-gradient-bg min-h-full px-3 pb-28 pt-3 md:px-5 md:pb-12 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/82 shadow-[0_18px_52px_rgba(15,23,42,0.07)] backdrop-blur-xl">
          <FamilyCalendarPlannerHeader
            profile={profile}
            people={people}
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
          <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/84 shadow-[0_18px_52px_rgba(15,23,42,0.07)] backdrop-blur-xl">
            {viewMode === "month" ? (
              <FamilyCalendarMonthGrid
                monthDays={monthDays}
                anchorDate={anchorDate}
                eventsByDay={eventsByDay}
                people={people}
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
                onAddDate={setAddDate}
                onEventSelect={handleEventSelect}
                onOverflowSelect={handleOverflowSelect}
              />
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setAddDate(new Date(anchorDate))}
        className="fixed bottom-28 right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/25 transition hover:scale-105 hover:bg-blue-700 active:scale-95 md:bottom-8 md:right-8 md:h-15 md:w-15"
        aria-label="Add event"
      >
        <Plus className="h-7 w-7" />
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
