import {
  FAMILY_CALENDAR_ALL_DAY_HEIGHT,
  FAMILY_CALENDAR_DAY_START_MINUTES,
  FAMILY_CALENDAR_HOUR_HEIGHT,
  FAMILY_CALENDAR_MIN_EVENT_HEIGHT,
  parseEventMinutes,
} from "@/components/calendar/family/familyCalendarUi";

export const TIMELINE_MAX_VISIBLE_COLUMNS = 3;

export function getEventTimelinePosition(event = {}) {
  if (event.isAllDay || event.is_all_day) return null;

  const start = parseEventMinutes(event.startTime || event.start_time);
  const rawEnd = parseEventMinutes(event.endTime || event.end_time);

  if (start === null) return null;

  const end = rawEnd && rawEnd > start ? rawEnd : start + 45;
  const top = FAMILY_CALENDAR_ALL_DAY_HEIGHT + ((start - FAMILY_CALENDAR_DAY_START_MINUTES) / 60) * FAMILY_CALENDAR_HOUR_HEIGHT + 4;
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

function groupItemsByStart(items = []) {
  const groups = new Map();

  items.forEach((item) => {
    const key = String(item.start);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  return Array.from(groups.values()).map((group) =>
    group.sort((a, b) => a.end - b.end || a.originalIndex - b.originalIndex)
  );
}

function buildOverflowBadge(hiddenItems = []) {
  if (!hiddenItems.length) return null;

  const firstHidden = hiddenItems[0];
  const startTop = FAMILY_CALENDAR_ALL_DAY_HEIGHT + ((firstHidden.start - FAMILY_CALENDAR_DAY_START_MINUTES) / 60) * FAMILY_CALENDAR_HOUR_HEIGHT + 8;

  return {
    id: `overflow-${firstHidden.start}-${firstHidden.event.id || firstHidden.originalIndex}`,
    count: hiddenItems.length,
    events: hiddenItems.map((item) => item.event),
    top: Math.max(FAMILY_CALENDAR_ALL_DAY_HEIGHT + 8, startTop),
    right: 8,
    zIndex: 80,
    ariaLabel: `${hiddenItems.length} more events`,
    start: firstHidden.start,
    end: Math.max(...hiddenItems.map((item) => item.end)),
  };
}

export function buildTimelineLayout(events = [], options = {}) {
  const maxVisibleColumns = options.maxVisibleColumns || TIMELINE_MAX_VISIBLE_COLUMNS;
  const items = events
    .map((event, originalIndex) => {
      const position = getEventTimelinePosition(event);
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

    groupItemsByStart(hiddenItems).forEach((hiddenStartGroup) => {
      const badge = buildOverflowBadge(hiddenStartGroup);
      if (badge) overflowBadges.push(badge);
    });
  });

  return {
    layoutMap,
    overflowBadges,
  };
}
