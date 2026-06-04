import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  parseISO,
  startOfWeek,
  format,
} from "date-fns";

import { serverTimestamp } from "firebase/firestore";

export function advanceDateByUnit(date, every, unit) {
  if (unit === "day") return addDays(date, every);
  if (unit === "week") return addWeeks(date, every);
  if (unit === "month") return addMonths(date, every);
  if (unit === "year") return addYears(date, every);

  return addWeeks(date, every);
}

export function generateBlockStarts(payload) {
  const baseStart = parseISO(`${payload.startDate}T12:00:00`);
  const safeEvery = Math.max(1, Number(payload.repeatEvery) || 1);

  if (!payload.repeatEnabled) return [baseStart];

  const starts = [baseStart];
  const maxByOccurrences =
    payload.endMode === "after"
      ? Math.max(1, Number(payload.occurrences) || 1)
      : 9999;

  if (starts.length >= maxByOccurrences) return starts;

  const untilDate =
    payload.endMode === "onDate" && payload.untilDate
      ? parseISO(`${payload.untilDate}T12:00:00`)
      : payload.endMode === "never"
      ? addMonths(baseStart, 12)
      : null;

  if (untilDate && baseStart > untilDate) return [];

  if (payload.repeatUnit === "week" && payload.repeatWeekdays?.length) {
    const cycleStartBase = startOfWeek(baseStart, { weekStartsOn: 0 });
    const selectedWeekdays = [...new Set(payload.repeatWeekdays)].sort(
      (a, b) => a - b
    );
    let cycleIndex = safeEvery;

    while (starts.length < maxByOccurrences && cycleIndex < 500) {
      const cycleBase = addWeeks(cycleStartBase, cycleIndex);

      for (const weekday of selectedWeekdays) {
        const candidate = addDays(cycleBase, weekday);
        if (candidate <= baseStart) continue;
        if (untilDate && candidate > untilDate) return starts;

        starts.push(candidate);
        if (payload.endMode === "after" && starts.length >= maxByOccurrences) {
          return starts;
        }
      }

      cycleIndex += safeEvery;
    }

    return starts;
  }

  let current = advanceDateByUnit(baseStart, safeEvery, payload.repeatUnit);

  while (starts.length < maxByOccurrences && starts.length < 500) {
    if (untilDate && current > untilDate) break;
    starts.push(current);
    current = advanceDateByUnit(current, safeEvery, payload.repeatUnit);
  }

  return starts;
}

export function buildBulkDayPayload({
  day,
  blockStart,
  blockEnd,
  payload,
  familyId,
  custodyScopeId,
  custodyScopeFields = {},
  profile,
  user,
  bulkRunId,
  getOtherParent,
}) {
  const dateKey = format(day, "yyyy-MM-dd");
  const scopeId = custodyScopeId || familyId;
  const blockStartKey = format(blockStart, "yyyy-MM-dd");
  const blockEndKey = format(blockEnd, "yyyy-MM-dd");
  const generatedDay = payload.generatedDayMap?.[dateKey] || null;

  let isSplit = false;
  let withWhom = generatedDay?.parent || payload.fullDaysParent;
  let morning = null;
  let afternoon = null;

  const singleDayRange = blockStartKey === blockEndKey;

  if (generatedDay?.isSplit) {
    isSplit = true;
    withWhom = null;
    morning = generatedDay.morning || null;
    afternoon = generatedDay.afternoon || null;
  } else if (singleDayRange && (payload.splitFirstDay || payload.splitLastDay)) {
    isSplit = true;
    withWhom = null;

    if (payload.splitFirstDay && payload.splitLastDay) {
      morning = payload.firstDayMorning;
      afternoon = payload.lastDayAfternoon;
    } else if (payload.splitFirstDay) {
      morning = payload.firstDayMorning;
      afternoon = getOtherParent(payload.firstDayMorning);
    } else if (payload.splitLastDay) {
      morning = getOtherParent(payload.lastDayAfternoon);
      afternoon = payload.lastDayAfternoon;
    }
  } else if (dateKey === blockStartKey && payload.splitFirstDay) {
    isSplit = true;
    withWhom = null;
    morning = payload.firstDayMorning;
    afternoon = getOtherParent(payload.firstDayMorning);
  } else if (dateKey === blockEndKey && payload.splitLastDay) {
    isSplit = true;
    withWhom = null;
    morning = getOtherParent(payload.lastDayAfternoon);
    afternoon = payload.lastDayAfternoon;
  }

  return {
    id: `${scopeId}_${dateKey}`,
    date: dateKey,
    is_split: isSplit,
    isSplit,
    with_whom: isSplit ? null : withWhom,
    withWhom: isSplit ? null : withWhom,
    morning: isSplit ? morning : null,
    afternoon: isSplit ? afternoon : null,
    notes: payload.notes || "",
    familyId: custodyScopeFields.familyId || familyId,
    custodyGroupId: custodyScopeFields.custodyGroupId || scopeId,
    householdFamilyId: custodyScopeFields.householdFamilyId || "",
    custodyGroupName: custodyScopeFields.custodyGroupName || "",
    module: "custody",
    visibility: "custody",
    familyName: profile?.family_name || profile?.familyName || "",
    userId: user.uid,
    createdBy: user.uid,
    createdByEmail: user.email || null,
    updatedBy: user.uid,
    updatedByEmail: user.email || null,
    bulkRunId,
    bulkTemplateId: payload.templateId || "custom",
    smartPatternId: payload.smartPatternId || null,
    updatedAt: serverTimestamp(),
  };
}
