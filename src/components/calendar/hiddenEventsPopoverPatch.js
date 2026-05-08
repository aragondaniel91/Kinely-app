const MAX_WEEK_VISIBLE_PER_START_TIME = 3;
let layoutScheduled = false;

function cleanText(element) {
  return (element?.textContent || "").replace(/\s+/g, " ").trim();
}

function labelForEvent(button) {
  const text = cleanText(button);
  if (!text) return "Hidden event";

  const match = text.match(/^(.*?)(\d{1,2}:\d{2}\s*[AP]M.*)$/i);
  if (!match) return text;

  return `${match[1].trim()} · ${match[2].trim()}`;
}

function clickOriginalEvent(button) {
  const previousDisplay = button.style.display;
  const previousOpacity = button.style.opacity;
  const previousPointerEvents = button.style.pointerEvents;

  button.style.display = "";
  button.style.opacity = "0";
  button.style.pointerEvents = "none";
  button.click();

  window.setTimeout(() => {
    button.style.display = previousDisplay;
    button.style.opacity = previousOpacity;
    button.style.pointerEvents = previousPointerEvents;
  }, 0);
}

function closeHiddenEventsPanel() {
  document.querySelectorAll("[data-smart-hidden-events-panel]").forEach((panel) => panel.remove());
  document.querySelectorAll("[data-overlap-more-badge]").forEach((badge) => {
    badge.setAttribute("aria-expanded", "false");
  });
}

function applyEventColor(preview, sourceButton) {
  const sourceClass = String(sourceButton.className || "").toLowerCase();
  const sourceText = cleanText(sourceButton).toLowerCase();
  const computedStyle = window.getComputedStyle(sourceButton);
  const background = computedStyle.backgroundColor;
  const textColor = computedStyle.color;
  const borderColor = computedStyle.borderLeftColor || background;

  const hints = [
    { pattern: /(yellow|amber|mom|mama|mamá)/, className: "border-yellow-300 bg-yellow-50 text-yellow-950 hover:bg-yellow-100" },
    { pattern: /(blue|dad|papa|papá)/, className: "border-blue-300 bg-blue-50 text-blue-950 hover:bg-blue-100" },
    { pattern: /(green|family|familia)/, className: "border-emerald-300 bg-emerald-50 text-emerald-950 hover:bg-emerald-100" },
    { pattern: /(purple|school|escuela|activity|actividad)/, className: "border-purple-300 bg-purple-50 text-purple-950 hover:bg-purple-100" },
    { pattern: /(red|medical|doctor|médico|medico|important|urgent)/, className: "border-rose-300 bg-rose-50 text-rose-950 hover:bg-rose-100" },
  ];

  const match = hints.find((hint) => hint.pattern.test(sourceClass) || hint.pattern.test(sourceText));
  if (match) {
    preview.className = `${preview.className} ${match.className}`;
    return;
  }

  if (background && background !== "rgba(0, 0, 0, 0)" && background !== "transparent") {
    preview.style.backgroundColor = background;
  }

  if (textColor) preview.style.color = textColor;
  if (borderColor && borderColor !== "rgba(0, 0, 0, 0)" && borderColor !== "transparent") {
    preview.style.borderLeft = `4px solid ${borderColor}`;
  }
}

function activeCalendarView() {
  const buttons = Array.from(document.querySelectorAll("button"));
  const viewButton = buttons.find((button) => {
    const text = cleanText(button).toLowerCase();
    const className = String(button.className || "");
    return ["month", "week", "day"].includes(text) && /bg-blue-600|text-white/.test(className);
  });

  return cleanText(viewButton).toLowerCase();
}

function isWeekView() {
  return activeCalendarView() === "week";
}

function getTimedEventItems(parent) {
  return Array.from(parent.querySelectorAll("button.absolute.left-2.right-2"))
    .map((button, originalIndex) => {
      const top = Number.parseFloat(button.style.top || "0");
      const height = Number.parseFloat(button.style.height || "0");
      if (!top || !height) return null;
      return {
        button,
        originalIndex,
        top,
        bottom: top + height,
        startKey: String(Math.round(top)),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.top - b.top || b.bottom - a.bottom || a.originalIndex - b.originalIndex);
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

  let maxColumnCount = 1;
  items.forEach((item) => {
    const overlappingColumnIndexes = items
      .filter((other) => other === item || eventsOverlap(item, other))
      .map((other) => other.columnIndex);
    const localColumnCount = Math.max(...overlappingColumnIndexes) + 1;
    maxColumnCount = Math.max(maxColumnCount, localColumnCount);
  });

  return Math.max(1, maxColumnCount, columns.length);
}

function setStyleValue(element, property, value) {
  if (element.style[property] !== value) {
    element.style[property] = value;
  }
}

function positionVisibleEvents(items) {
  const visibleItems = items.filter((item) => !item.hiddenByStartTime);
  if (visibleItems.length === 0) return;

  const columnCount = assignColumns(visibleItems);
  const width = 100 / columnCount;

  visibleItems.forEach((item) => {
    setStyleValue(item.button, "display", "");
    setStyleValue(item.button, "left", `calc(${width * item.columnIndex}% + 0.5rem)`);
    setStyleValue(item.button, "right", "auto");
    setStyleValue(item.button, "width", `calc(${width}% - 0.7rem)`);
    setStyleValue(item.button, "zIndex", String(20 + item.columnIndex));
  });
}

function buildPanel(badge) {
  const parent = badge.parentElement;
  if (!parent) return null;

  const startKey = badge.dataset.startKey;
  const hiddenEvents = getTimedEventItems(parent)
    .filter((item) => item.startKey === startKey)
    .map((item) => item.button)
    .filter((button) => button.style.display === "none" || window.getComputedStyle(button).display === "none");

  if (hiddenEvents.length === 0) return null;

  const panel = document.createElement("div");
  panel.dataset.smartHiddenEventsPanel = "true";
  panel.className = "absolute z-[95] w-[280px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl ring-1 ring-black/5";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "More calendar events");

  const badgeTop = Number.parseFloat(badge.style.top || "96");
  panel.style.top = `${Math.max(96, badgeTop + 34)}px`;
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
  closeButton.setAttribute("aria-label", "Close hidden events panel");
  closeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    closeHiddenEventsPanel();
  });

  header.appendChild(closeButton);
  panel.appendChild(header);

  hiddenEvents.forEach((button) => {
    const preview = document.createElement("button");
    preview.type = "button";
    preview.className = "mb-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-700 shadow-sm transition hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-blue-300";
    preview.textContent = labelForEvent(button);
    applyEventColor(preview, button);
    preview.addEventListener("click", (event) => {
      event.stopPropagation();
      closeHiddenEventsPanel();
      clickOriginalEvent(button);
    });
    panel.appendChild(preview);
  });

  const footer = document.createElement("div");
  footer.className = "mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500";
  footer.textContent = "Use Esc or click outside to close.";
  panel.appendChild(footer);

  return panel;
}

function renderStartTimeBadge(parent, startKey, hiddenItems) {
  const firstHidden = hiddenItems[0];
  if (!firstHidden) return;

  const badgeKey = `start-${startKey}`;
  let badge = parent.querySelector(`[data-overlap-more-badge="${badgeKey}"]`);

  if (!badge) {
    badge = document.createElement("button");
    badge.type = "button";
    badge.dataset.overlapMoreBadge = badgeKey;
    badge.dataset.startKey = startKey;
    badge.className = "absolute rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-black text-slate-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700";
    badge.setAttribute("aria-haspopup", "dialog");
    badge.setAttribute("aria-expanded", "false");
    parent.appendChild(badge);
  }

  badge.dataset.startKey = startKey;
  badge.textContent = `+${hiddenItems.length}`;
  badge.title = `${hiddenItems.length} more events starting at the same time`;
  setStyleValue(badge, "display", "block");
  setStyleValue(badge, "top", `${Math.max(112, firstHidden.top + 8)}px`);
  setStyleValue(badge, "right", "0.5rem");
  setStyleValue(badge, "zIndex", "65");
}

function layoutWeekEventsByStartTime() {
  if (!isWeekView()) return;

  const body = document.querySelector(".family-calendar-live-body");
  if (!body) return;

  const parents = Array.from(new Set(
    Array.from(body.querySelectorAll("button.absolute.left-2.right-2"))
      .map((button) => button.parentElement)
      .filter(Boolean)
  ));

  parents.forEach((parent) => {
    const items = getTimedEventItems(parent);
    const startGroups = new Map();

    parent.querySelectorAll("[data-overlap-more-badge]").forEach((badge) => {
      setStyleValue(badge, "display", "none");
      badge.setAttribute("aria-expanded", "false");
    });

    items.forEach((item) => {
      item.hiddenByStartTime = false;
      setStyleValue(item.button, "display", "");
      setStyleValue(item.button, "right", "auto");
      const list = startGroups.get(item.startKey) || [];
      list.push(item);
      startGroups.set(item.startKey, list);
    });

    startGroups.forEach((group, startKey) => {
      const hiddenItems = group.slice(MAX_WEEK_VISIBLE_PER_START_TIME);
      hiddenItems.forEach((item) => {
        item.hiddenByStartTime = true;
        setStyleValue(item.button, "display", "none");
      });

      if (hiddenItems.length > 0) {
        renderStartTimeBadge(parent, startKey, hiddenItems);
      }
    });

    positionVisibleEvents(items);
  });
}

function scheduleWeekLayout() {
  if (layoutScheduled) return;
  layoutScheduled = true;

  window.setTimeout(() => {
    window.requestAnimationFrame(() => {
      layoutScheduled = false;
      layoutWeekEventsByStartTime();
    });
  }, 80);
}

if (typeof window !== "undefined" && !window.__familyCalendarHiddenEventsPatchLoaded) {
  window.__familyCalendarHiddenEventsPatchLoaded = true;

  document.addEventListener(
    "click",
    (event) => {
      const badge = event.target?.closest?.("[data-overlap-more-badge]");
      if (!badge) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      const isOpen = badge.getAttribute("aria-expanded") === "true";
      closeHiddenEventsPanel();

      if (isOpen) return;

      const panel = buildPanel(badge);
      if (!panel) return;

      badge.parentElement.appendChild(panel);
      badge.setAttribute("aria-expanded", "true");
    },
    true
  );

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.target?.closest?.("[data-smart-hidden-events-panel]")) return;
      if (event.target?.closest?.("[data-overlap-more-badge]")) return;
      closeHiddenEventsPanel();
    },
    true
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeHiddenEventsPanel();
  });

  const observer = new MutationObserver(scheduleWeekLayout);

  window.addEventListener("load", scheduleWeekLayout);
  window.addEventListener("resize", scheduleWeekLayout);
  document.addEventListener("click", scheduleWeekLayout);

  window.requestAnimationFrame(() => {
    const body = document.querySelector(".family-calendar-live-body");
    if (body) {
      observer.observe(body, { childList: true, subtree: true });
    }
    scheduleWeekLayout();
  });
}
