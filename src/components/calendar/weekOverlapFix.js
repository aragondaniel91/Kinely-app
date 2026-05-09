let observer = null;
let scheduled = false;

function numberFromPx(value) {
  const number = Number.parseFloat(String(value || "").replace("px", ""));
  return Number.isFinite(number) ? number : 0;
}

function getRectData(button) {
  const top = numberFromPx(button.style.top);
  const height = numberFromPx(button.style.height);
  return {
    element: button,
    top,
    height,
    bottom: top + height,
  };
}

function overlaps(a, b) {
  return a.top < b.bottom && b.top < a.bottom;
}

function layoutCluster(items) {
  const columns = [];
  const sorted = [...items].sort((a, b) => a.top - b.top || b.height - a.height);

  sorted.forEach((item) => {
    let columnIndex = columns.findIndex((column) => column.every((existing) => !overlaps(existing, item)));
    if (columnIndex === -1) {
      columnIndex = columns.length;
      columns.push([]);
    }
    columns[columnIndex].push(item);
    item.columnIndex = columnIndex;
  });

  const columnCount = Math.max(1, columns.length);
  sorted.forEach((item) => {
    const gap = 6;
    const width = 100 / columnCount;
    item.element.style.setProperty("left", `calc(${width * item.columnIndex}% + ${gap}px)`, "important");
    item.element.style.setProperty("right", "auto", "important");
    item.element.style.setProperty("width", `calc(${width}% - ${gap * 2}px)`, "important");
    item.element.style.setProperty("z-index", String(30 + item.columnIndex), "important");
  });
}

function layoutDayColumn(dayColumn) {
  const eventButtons = Array.from(dayColumn.querySelectorAll("button.absolute.overflow-hidden.rounded-xl"))
    .filter((button) => button.style.top && button.style.height)
    .map(getRectData)
    .filter((item) => item.height > 0);

  if (eventButtons.length <= 1) return;

  const sorted = eventButtons.sort((a, b) => a.top - b.top || b.height - a.height);
  const clusters = [];
  let current = [];
  let currentBottom = 0;

  sorted.forEach((item) => {
    if (!current.length || item.top < currentBottom) {
      current.push(item);
      currentBottom = Math.max(currentBottom, item.bottom);
    } else {
      clusters.push(current);
      current = [item];
      currentBottom = item.bottom;
    }
  });

  if (current.length) clusters.push(current);
  clusters.forEach(layoutCluster);
}

function fixWeekOverlap() {
  const body = document.querySelector(".family-calendar-live-body");
  if (!body) return;

  const columns = Array.from(body.querySelectorAll("div.relative.border-r.border-slate-200"))
    .filter((column) => column.querySelector("button.absolute.overflow-hidden.rounded-xl"));

  columns.forEach(layoutDayColumn);
}

function scheduleFix() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    fixWeekOverlap();
  });
  window.setTimeout(fixWeekOverlap, 150);
  window.setTimeout(fixWeekOverlap, 500);
}

function attach() {
  const body = document.querySelector(".family-calendar-live-body");
  if (!body) return false;
  if (observer) observer.disconnect();
  observer = new MutationObserver(scheduleFix);
  observer.observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
  scheduleFix();
  return true;
}

export function startWeekOverlapFix() {
  if (typeof window === "undefined") return;

  const retry = window.setInterval(() => {
    if (attach()) window.clearInterval(retry);
  }, 300);

  window.addEventListener("load", attach);
  window.addEventListener("resize", scheduleFix);
  document.addEventListener("click", scheduleFix, true);
}

startWeekOverlapFix();
