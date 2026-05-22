import { useCallback, useEffect, useMemo, useState } from "react";

import { getFamilyEvents } from "@/services/familyEventsService";

function buildPeopleSignature(people = []) {
  return people.map((person) => `${person.id}:${person.colorId}`).join("|");
}

export function useFamilyCalendarEvents({ familyId, people = [] } = {}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const peopleSignature = useMemo(() => buildPeopleSignature(people), [people]);

  const loadEvents = useCallback(async () => {
    if (!familyId) {
      setEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const familyEvents = await getFamilyEvents({ familyId, people });
      setEvents(familyEvents);
    } catch (error) {
      console.error("Error loading family events", error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [familyId, peopleSignature]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return {
    events,
    loading,
    loadEvents,
  };
}
