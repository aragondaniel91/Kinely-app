import {
  FAMILY_CALENDAR_ALL_DAY_HEIGHT,
  FAMILY_CALENDAR_DEFAULT_START_HOUR,
  FAMILY_CALENDAR_HOUR_HEIGHT,
  FAMILY_CALENDAR_MIN_EVENT_HEIGHT,
  buildTimelineHourRange,
  parseEventMinutes,
} from "@/features/family-calendar/utils/familyCalendarUi";

export const TIMELINE_MAX_VISIBLE_COLUMNS = 3;

function defaultTimelineRange() {
  return buildTimelineHourRange([]);
}

export function getEventTimelinePosition(event = {}, timelineRange = defaultTimelineRange()) {
  if (event.isAllDay || event.is_all_day) return null;

  const start = parseEventMinutes(event.startTime || event.start_time);
  const rawEnd = parseEventMinutes(event.endTime || event.end_time);

  if (start === null) return null;

  const rangeStartMinutes = timelineRange?.startMinutes ?? FAMILY_CALENDAR_DEFAULT_START_HOUR * 60;
  const end = rawEnd && rawEnd > start ? rawEnd : start + 45;
  const top = FAMILY_CALENDAR_ALL_DAY_HEIGHT + ((start - rangeStartMinutes) / 60) * FAMILY_CALENDAR_HOUR_HEIGHT + 4;
  const height = Math.max(FAMILY_CALENDAR_MIN_EVENT_HEIGHT, ((end - start) / 60) * FAMILY_CALENDAR_HOUR_HEIGHT - 8);

  return {
    top: Math.max(FAMILY_CALENDAR_ALL_DAY_HEIGHT + 4, top),
    height,
    start,
    end,
  };
}

function assignClusterColumns(cluster = []) {
  const columns = [];
  const withColumns = [...cluster]
    .sort((a, b) => a.start - b.start || b.end - a.end || a.originalIndex - b.originalIndex)
    .map((item) => {
      let columnIndex = columns.findIndex((columnEnd) => columnEnd <= item.start);
      if (columnIndex === -1) {
        columnIndex = columns.length;
        columns.push(item.end);
      } else {
        columns[columnIndex] = item.end;
      }
      return { ...item, columnIndex };
    });

  return {
    columnCount: Math.max(1, columns.length),
    items: withColumns,
  };
}

function eventHourStartMinutes(startMinutes) {
  return Math.floor(startMinutes / 60) * 60;
}

function groupItemsByStartHour(items = []) {
  const groups = new Map();

  items.forEach((item) => {
    const hourStart = eventHourStartMinutes(item.start);
    const key = String(hourStart);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ ...item, overflowHourStart: hourStart });
  });

  return Array.from(groups.values()).map((group) =>
    group.sort((a, b) => a.start - b.start || a.end - b.end || a.originalIndex - b.originalIndex)
  );
}

function buildOverflowBadge(hiddenItems = [], timelineRange = defaultTimelineRange()) {
  if (!hiddenItems.length) return null;

  const firstHidden = hiddenItems[0];
  const rangeStartMinutes = timelineRange?.startMinutes ?? FAMILY_CALENDAR_DEFAULT_START_HOUR * 60;
  const overflowHourStart = firstHidden.overflowHourStart ?? eventHourStartMinutes(firstHidden.start);
  const startTop = FAMILY_CALENDAR_ALL_DAY_HEIGHT + ((overflowHourStart - rangeStartMinutes) / 60) * FAMILY_CALENDAR_HOUR_HEIGHT + 8;

  return {
    id: `overflow-hour-${overflowHourStart}-${firstHidden.event.id || firstHidden.originalIndex}`,
    count: hiddenItems.length,
    events: hiddenItems.map((item) => item.event),
    top: Math.max(FAMILY_CALENDAR_ALL_DAY_HEIGHT + 8, startTop),
    right: 8,
    zIndex: 80,
    ariaLabel: `${hiddenItems.length} more events`,
    start: overflowHourStart,
    end: Math.max(...hiddenItems.map((item) => item.end)),
  };
}

export function buildTimelineLayout(events = [], options = {}) {
  const maxVisibleColumns = options.maxVisibleColumns || TIMELINE_MAX_VISIBLE_COLUMNS;
  const timelineRange = options.timelineRange || buildTimelineHourRange(events);
  const items = events
    .map((event, originalIndex) => {
      const position = getEventTimelinePosition(event, timelineRange);
      if (!position) return null;
      return { event, originalIndex, ...position };
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start || b.end - a.end || a.originalIndex - b.originalIndex);

  const clusters = [];
  let cluster = [];
  let clusterEnd = null;

  items.forEach((item) => {
    if (!cluster.length || item.start < clusterEnd) {
      cluster.push(item);
      clusterEnd = Math.max(clusterEnd ?? item.end, item.end);
    } else {
      clusters.push(cluster);
      cluster = [item];
      clusterEnd = item.end;
    }
  });

  if (cluster.length) clusters.push(cluster);

  const layoutMap = new Map();
  const overflowBadges = [];

  clusters.forEach((group) => {
    const { columnCount, items: columnItems } = assignClusterColumns(group);
    const visibleColumnCount = Math.min(columnCount, maxVisibleColumns);
    const hiddenItems = columnItems.filter((item) => item.columnIndex >= maxVisibleColumns);
    const visibleItems = columnItems.filter((item) => item.columnIndex < maxVisibleColumns);
    const width = 100 / visibleColumnCount;

    visibleItems.forEach((item) => {
      layoutMap.set(item.event.id, {
        top: item.top,
        height: item.height,
        left: `calc(${width * item.columnIndex}% + 0.5rem)`,
        width: `calc(${width}% - ${visibleColumnCount === 1 ? "1rem" : "0.7rem"})`,
        zIndex: 30 + item.columnIndex,
      });
    });

    groupItemsByStartHour(hiddenItems).forEach((hiddenHourGroup) => {
      const badge = buildOverflowBadge(hiddenHourGroup, timelineRange);
      if (badge) overflowBadges.push(badge);
    });
  });

  return {
    layoutMap,
    overflowBadges,
    timelineRange,
  };
}
