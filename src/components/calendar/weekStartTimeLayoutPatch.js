const MAX_VISIBLE_PER_START_TIME = 3;
let scheduled = false;

function textOf(element) {
  return (element?.textContent || "").replace(/\s+/g, " ").trim();
}

function isWeekViewActive() {
  const buttons = Array.from(document.querySelectorAll("button"));
  const active = buttons.find((button) => {
    const text = textOf(button).toLowerCase();
    const classes = String(button.className || "");
    return text === "week" && /bg-blue-600|text-white/.test(classes);
  });
  return Boolean(active);
}

function setImportant(element, property, value) {
  element.style.setProperty(property, value, "important");
}

function clearManagedBadges(parent) {
  parent.querySelectorAll("[data-week-start-more-badge]").forEach((badge) => badge.remove());
}

function eventLabel(button) {
  const text = textOf(button);
  if (!text) return "Hidden event";
  const match = text.match(/^(.*?)(\d{1,2}:\d{2}\s*[AP]M.*)$/i);
  if (!match) return text;
  return `${match[1].trim()} · ${match[2].trim()}`;
}

function clickOriginal(button) {
  const previousDisplay = button.style.display;
  const previousOpacity = button.style.opacity;
  const previousPointerEvents = button.style.pointerEvents;

  button.style.setProperty("display", "block", "important");
  button.style.opacity = "0";
  button.style.pointerEvents = "none";
  button.click();

  window.setTimeout(() => {
    button.style.display = previousDisplay;
    button.style.opacity = previousOpacity;
    button.style.pointerEvents = previousPointerEvents;
  }, 0);
}

function closePanels() {
  document.querySelectorAll("[data-week-start-panel]").forEach((panel) => panel.remove());
  document.querySelectorAll("[data-week-start-more-badge]").forEach((badge) => badge.setAttribute("aria-expanded", "false"));
}

function applyPreviewColor(preview, source) {
  const style = window.getComputedStyle(source);
  const background = style.backgroundColor;
  const textColor = style.color;
  const borderColor = style.borderLeftColor || style.borderTopColor || background;

  if (background && background !== "rgba(0, 0, 0, 0)" && background !== "transparent") {
    preview.style.backgroundColor = background;
  }
  if (textColor) preview.style.color = textColor;
  if (borderColor && borderColor !== "rgba(0, 0, 0, 0)" && borderColor !== "transparent") {
    preview.style.borderLeft = `4px solid ${borderColor}`;
  }
}

function buildPanel(badge, hiddenItems) {
  const panel = document.createElement("div");
  panel.dataset.weekStartPanel = "true";
  panel.className = "absolute z-[120] w-[280px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl ring-1 ring-black/5";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "More events with the same start time");
  panel.style.top = `${Math.max(96, Number.parseFloat(badge.style.top || "96") + 34)}px`;
  panel.style.right = "0.5rem";

  const header = document.createElement("div");
  header.className = "mb-2 flex items-start justify-between gap-3 border-b border-slate-100 pb-2";
  header.innerHTML = `
    <div class="min-w-0">
      <div class="text-xs font-black uppercase tracking-wide text-slate-700">More events</div>
      <div class="mt-0.5 text-[11px] font-semibold text-slate-400">Same start time · tap to open</div>
    </div>
  `;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base font-black leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700";
  closeButton.textContent = "×";
  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    closePanels();
  });

  header.appendChild(closeButton);
  panel.appendChild(header);

  hiddenItems.forEach((item) => {
    const preview = document.createElement("button");
    preview.type = "button";
    preview.className = "mb-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-700 shadow-sm transition hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-blue-300";
    preview.textContent = eventLabel(item.button);
    applyPreviewColor(preview, item.button);
    preview.addEventListener("click", (event) => {
      event.stopPropagation();
      closePanels();
      clickOriginal(item.button);
    });
    panel.appendChild(preview);
  });

  return panel;
}

function eventsOverlap(a, b) {
  return a.top < b.bottom && b.top < a.bottom;
}

function assignColumns(items) {
  const columns = [];
  items.forEach((item) => {
    let columnIndex = columns.findIndex((columnEnd) => columnEnd <= item.top);
    if (columnIndex === -1) {
      columnIndex = columns.length;
      columns.push(item.bottom);
    } else {
      columns[columnIndex] = item.bottom;
    }
    item.columnIndex = columnIndex;
  });

  let columnCount = Math.max(1, columns.length);
  items.forEach((item) => {
    const localMax = Math.max(
      ...items
        .filter((other) => other === item || eventsOverlap(item, other))
        .map((other) => other.columnIndex),
      0
    );
    columnCount = Math.max(columnCount, localMax + 1);
  });
  return columnCount;
}

function timedItems(parent) {
  return Array.from(parent.querySelectorAll("button.absolute.left-2.right-2"))
    .map((button, index) => {
      const top = Number.parseFloat(button.style.top || "0");
      const height = Number.parseFloat(button.style.height || "0");
      if (!top || !height) return null;
      return {
        button,
        index,
        top,
        bottom: top + height,
        startKey: String(Math.round(top)),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.top - b.top || b.bottom - a.bottom || a.index - b.index);
}

function renderBadge(parent, startKey, hiddenItems) {
  const firstHidden = hiddenItems[0];
  if (!firstHidden) return;

  const badge = document.createElement("button");
  badge.type = "button";
  badge.dataset.weekStartMoreBadge = "true";
  badge.dataset.startKey = startKey;
  badge.className = "absolute rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-black text-slate-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700";
  badge.textContent = `+${hiddenItems.length}`;
  badge.title = `${hiddenItems.length} more events starting at the same time`;
  badge.setAttribute("aria-haspopup", "dialog");
  badge.setAttribute("aria-expanded", "false");
  setImportant(badge, "display", "block");
  setImportant(badge, "top", `${Math.max(112, firstHidden.top + 8)}px`);
  setImportant(badge, "right", "0.5rem");
  setImportant(badge, "z-index", "140");

  badge.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    const isOpen = badge.getAttribute("aria-expanded") === "true";
    closePanels();
    if (isOpen) return;

    const panel = buildPanel(badge, hiddenItems);
    parent.appendChild(panel);
    badge.setAttribute("aria-expanded", "true");
  });

  parent.appendChild(badge);
}

function layoutParent(parent) {
  clearManagedBadges(parent);

  const items = timedItems(parent);
  if (items.length === 0) return;

  const groups = new Map();
  items.forEach((item) => {
    const group = groups.get(item.startKey) || [];
    group.push(item);
    groups.set(item.startKey, group);
    item.hidden = false;
  });

  groups.forEach((group, startKey) => {
    const hidden = group.slice(MAX_VISIBLE_PER_START_TIME);
    hidden.forEach((item) => {
      item.hidden = true;
      setImportant(item.button, "display", "none");
    });
    if (hidden.length > 0) renderBadge(parent, startKey, hidden);
  });

  const visible = items.filter((item) => !item.hidden);
  const columnCount = assignColumns(visible);
  const width = 100 / columnCount;

  visible.forEach((item) => {
    setImportant(item.button, "display", "block");
    setImportant(item.button, "left", `calc(${width * item.columnIndex}% + 0.5rem)`);
    setImportant(item.button, "right", "auto");
    setImportant(item.button, "width", `calc(${width}% - 0.7rem)`);
    setImportant(item.button, "z-index", String(80 + item.columnIndex));
  });
}

function forceWeekLayout() {
  if (!isWeekViewActive()) return;
  const body = document.querySelector(".family-calendar-live-body");
  if (!body) return;

  const parents = Array.from(new Set(
    Array.from(body.querySelectorAll("button.absolute.left-2.right-2"))
      .map((button) => button.parentElement)
      .filter(Boolean)
  ));

  parents.forEach(layoutParent);
}

function scheduleForceLayout() {
  if (scheduled) return;
  scheduled = true;

  const run = () => {
    scheduled = false;
    forceWeekLayout();
  };

  window.requestAnimationFrame(run);
  window.setTimeout(forceWeekLayout, 120);
  window.setTimeout(forceWeekLayout, 300);
}

if (typeof window !== "undefined" && !window.__familyCalendarWeekStartTimeLayoutPatchLoaded) {
  window.__familyCalendarWeekStartTimeLayoutPatchLoaded = true;

  window.addEventListener("load", scheduleForceLayout);
  window.addEventListener("resize", scheduleForceLayout);
  document.addEventListener("click", scheduleForceLayout, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePanels();
  });
  document.addEventListener("pointerdown", (event) => {
    if (event.target?.closest?.("[data-week-start-panel]")) return;
    if (event.target?.closest?.("[data-week-start-more-badge]")) return;
    closePanels();
  }, true);

  const observer = new MutationObserver(scheduleForceLayout);
  window.requestAnimationFrame(() => {
    const body = document.querySelector(".family-calendar-live-body");
    if (body) observer.observe(body, { childList: true, subtree: true });
    scheduleForceLayout();
  });
}
