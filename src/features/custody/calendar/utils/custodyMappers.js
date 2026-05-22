import { normalizeDate } from "@/features/custody/calendar/utils/custodyDateUtils";

export function normalizeCustodyDay(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    ...data,
    date: normalizeDate(data.date),
    is_split: data.is_split || data.isSplit || false,
    with_whom: data.with_whom || data.withWhom || null,
    morning: data.morning || null,
    afternoon: data.afternoon || null,
    notes: data.notes || "",
  };
}

export function normalizeSpecialEvent(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    ...data,
    date: normalizeDate(data.date),
    title: data.title || "Special event",
    category: data.category || "other",
    startTime: data.startTime || data.start_time || "",
    endTime: data.endTime || data.end_time || "",
    location: data.location || "",
    notes: data.notes || "",
  };
}

export function normalizeTravelPlan(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    ...data,
    title: data.title || "Travel / vacation",
    destination: data.destination || "",
    startDate: normalizeDate(data.startDate || data.start_date),
    endDate: normalizeDate(data.endDate || data.end_date),
    travelingParent: data.travelingParent || data.traveling_parent || "dad",
    travelStatus: data.travelStatus || data.travel_status || data.status || "approved",
    affectsCustody: data.affectsCustody ?? data.affects_custody ?? true,
    notes: data.notes || "",
  };
}
