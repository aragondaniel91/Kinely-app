const MAX_WEEK_VISIBLE_PER_START_TIME = 3;
let layoutScheduled = false;
let observerStarted = false;
let bodyObserver = null;
let retryTimer = null;
let heartbeatTimer = null;

function textOf(element) {
  return (element?.textContent || "").replace(/\s+/g, " ").trim();
}

function setStyle(element, property, value) {
  if (element.style[property] !== value) {
    element.style[property] = value;
  }
  element.style.setProperty(property, value, "important");
}

function timedEventLabel(button) {
  const text = textOf(button);
  if (!text) return "Hidden event";
  const match = text.match(/^(.*?)(\d{1,2}:\d{2}\s*[AP]M.*)$/i);
  if (!match) return text;
  return `${match[1].trim()} · ${match[2].trim()}`;
}

function closePanels() {
  document.querySelectorAll("[data-family-wall-timed-panel]").forEach((panel) => panel.remove());
}

function clickOriginalEvent(button) {
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

function buildPanel(badge, hiddenItems) {
  closePanels();

  const rect = badge.getBoundingClientRect();
  const panel = document.createElement("div");
  panel.dataset.familyWallTimedPanel = "true";
  panel.className = "fixed z-[130] w-[300px] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl ring-1 ring-black/5";
  panel.style.top = `${Math.max(12, Math.min(window.innerHeight - 280, rect.bottom + 8))}px`;
  panel.style.left = `${Math.max(12, Math.min(window.innerWidth - 312, rect.right - 300))}px`;

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
  closeButton.onclick = (event) => {
    event.stopPropagation();
    closePanels();
  };

  header.appendChild(closeButton);
  panel.appendChild(header);

  hiddenItems.forEach((item) => {
    const preview = document.createElement("button");
    preview.type = "button";
    preview.className = "mb-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-700 shadow-sm transition hover:scale-[1.01] hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300";
    preview.textContent = timedEventLabel(item.button);
    preview.onclick = (event) => {
      event.stopPropagation();
      closePanels();
      clickOriginalEvent(item.button);
    };
    panel.appendChild(preview);
  });

  document.body.appendChild(panel);
}

function overlaps(a, b) {
  return a.top < b.bottom && b.top < a.bottom;
}

function buildOverlapClusters(items) {
  const sorted = [...items].sort((a, b) => a.top - b.top || b.bottom - a.bottom || a.index - b.index);
  const clusters = [];
  let current = [];
  let currentBottom = null;

  sorted.forEach((item) => {
    if (!current.length || item.top < currentBottom) {
      current.push(item);
      currentBottom = Math.max(currentBottom ?? item.bottom, item.bottom);
    } else {
      clusters.push(current);
      current = [item];
      currentBottom = item.bottom;
    }
  });

  if (current.length) clusters.push(current);
  return clusters;
}

function layoutCluster(cluster) {
  if (cluster.length === 1) {
    const item = cluster[0];
    setStyle(item.button, "display", "block");
    setStyle(item.button, "left", "0.5rem");
    setStyle(item.button, "right", "auto");
    setStyle(item.button, "width", "calc(100% - 1rem)");
    setStyle(item.button, "z-index", "20");
    return;
  }

  const sorted = [...cluster].sort((a, b) => a.top - b.top || a.bottom - b.bottom || a.index - b.index);
  const columns = [];

  sorted.forEach((item) => {
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
  sorted.forEach((item) => {
    const localMax = Math.max(
      ...sorted
        .filter((other) => other === item || overlaps(item, other))
        .map((other) => other.columnIndex),
      0
    );
    columnCount = Math.max(columnCount, localMax + 1);
  });

  const width = 100 / columnCount;
  sorted.forEach((item) => {
    setStyle(item.button, "display", "block");
    setStyle(item.button, "left", `calc(${width * item.columnIndex}% + 0.5rem)`);
    setStyle(item.button, "right", "auto");
    setStyle(item.button, "width", `calc(${width}% - 0.7rem)`);
    setStyle(item.button, "z-index", String(30 + item.columnIndex));
  });
}

function isWeekLike(parentCount) {
  return parentCount > 1;
}

function getTimedItems(parent) {
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
        hidden: false,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.top - b.top || b.bottom - a.bottom || a.index - b.index);
}

function renderMoreBadge(parent, startKey, visibleAnchor, hiddenItems) {
  if (!hiddenItems.length) return;

  const badge = document.createElement("button");
  badge.type = "button";
  badge.dataset.familyWallTimedBadge = startKey;
  badge.className = "absolute rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-black text-slate-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700";
  badge.textContent = `+${hiddenItems.length}`;
  badge.title = `${hiddenItems.length} more events starting at this time`;
  badge.style.setProperty("top", `${Math.max(112, visibleAnchor.top + 8)}px`, "important");
  badge.style.setProperty("right", "0.5rem", "important");
  badge.style.setProperty("z-index", "90", "important");
  badge.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    buildPanel(badge, hiddenItems);
  };

  parent.appendChild(badge);
}

function layoutTimedEvents() {
  const body = document.querySelector(".family-calendar-live-body");
  if (!body) return;

  const buttons = Array.from(body.querySelectorAll("button.absolute.left-2.right-2"));
  if (!buttons.length) return;

  body.querySelectorAll("[data-family-wall-timed-badge]").forEach((badge) => badge.remove());

  const parents = Array.from(new Set(buttons.map((button) => button.parentElement).filter(Boolean)));
  const weekLike = isWeekLike(parents.length);

  parents.forEach((parent) => {
    const items = getTimedItems(parent);
    if (!items.length) return;

    items.forEach((item) => {
      item.hidden = false;
      setStyle(item.button, "display", "block");
      setStyle(item.button, "right", "auto");
    });

    if (weekLike) {
      const byStart = new Map();
      items.forEach((item) => {
        const group = byStart.get(item.startKey) || [];
        group.push(item);
        byStart.set(item.startKey, group);
      });

      byStart.forEach((group, startKey) => {
        const ordered = [...group].sort((a, b) => b.bottom - a.bottom || a.index - b.index);
        const hiddenItems = ordered.slice(MAX_WEEK_VISIBLE_PER_START_TIME);

        hiddenItems.forEach((item) => {
          item.hidden = true;
          setStyle(item.button, "display", "none");
        });

        renderMoreBadge(parent, startKey, ordered[0], hiddenItems);
      });
    }

    const visibleItems = items.filter((item) => !item.hidden);
    buildOverlapClusters(visibleItems).forEach(layoutCluster);
  });
}

function scheduleLayout() {
  if (layoutScheduled) return;
  layoutScheduled = true;

  window.requestAnimationFrame(() => {
    layoutScheduled = false;
    layoutTimedEvents();
  });

  window.setTimeout(layoutTimedEvents, 80);
  window.setTimeout(layoutTimedEvents, 220);
}

function attachBodyObserver() {
  const body = document.querySelector(".family-calendar-live-body");
  if (!body) return false;

  if (bodyObserver) bodyObserver.disconnect();
  bodyObserver = new MutationObserver(scheduleLayout);
  bodyObserver.observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
  scheduleLayout();
  return true;
}

function waitForCalendarBody() {
  if (attachBodyObserver()) return;

  if (retryTimer) window.clearInterval(retryTimer);
  retryTimer = window.setInterval(() => {
    if (attachBodyObserver()) {
      window.clearInterval(retryTimer);
      retryTimer = null;
    }
  }, 250);
}

function startObserver() {
  if (observerStarted) return;
  observerStarted = true;

  window.addEventListener("load", waitForCalendarBody);
  window.addEventListener("resize", scheduleLayout);
  document.addEventListener("click", () => {
    waitForCalendarBody();
    scheduleLayout();
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePanels();
  }, true);
  document.addEventListener("pointerdown", (event) => {
    if (event.target?.closest?.("[data-family-wall-timed-panel]")) return;
    if (event.target?.closest?.("[data-family-wall-timed-badge]")) return;
    closePanels();
  }, true);

  if (!heartbeatTimer) {
    heartbeatTimer = window.setInterval(() => {
      waitForCalendarBody();
      scheduleLayout();
    }, 1000);
  }

  waitForCalendarBody();
}

if (typeof window !== "undefined") {
  startObserver();
}
