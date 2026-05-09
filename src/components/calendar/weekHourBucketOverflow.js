const ALL_DAY_HEIGHT = 108;
const HOUR_HEIGHT = 92;
const DAY_START_MINUTES = 7 * 60;
const MAX_VISIBLE_PER_HOUR_BUCKET = 3;

let observerStarted = false;
let layoutScheduled = false;
let bodyObserver = null;
let retryTimer = null;

function textOf(element) {
  return (element?.textContent || "").replace(/\s+/g, " ").trim();
}

function isWeekView(body) {
  const dayHeaders = Array.from(body.querySelectorAll(".grid.border-b.border-slate-200 > div"));
  return dayHeaders.length >= 8;
}

function closePanels() {
  document.querySelectorAll("[data-family-wall-hour-panel]").forEach((panel) => panel.remove());
}

function getStartMinutesFromTop(top) {
  return Math.round(((top - ALL_DAY_HEIGHT - 4) / HOUR_HEIGHT) * 60 + DAY_START_MINUTES);
}

function getTopFromBucket(bucketStart) {
  return ALL_DAY_HEIGHT + ((bucketStart - DAY_START_MINUTES) / 60) * HOUR_HEIGHT + 8;
}

function hourBucket(startMinutes) {
  return Math.floor(startMinutes / 60) * 60;
}

function eventLabel(button) {
  const text = textOf(button);
  if (!text) return "Hidden event";
  const match = text.match(/^(.*?)(\d{1,2}:\d{2}\s*[AP]M.*)$/i);
  if (!match) return text;
  return `${match[1].trim()} · ${match[2].trim()}`;
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
  panel.dataset.familyWallHourPanel = "true";
  panel.className = "fixed z-[140] w-[360px] max-w-[calc(100vw-2rem)] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl ring-1 ring-black/5";
  panel.style.top = `${Math.max(12, Math.min(window.innerHeight - 360, rect.bottom + 8))}px`;
  panel.style.left = `${Math.max(12, Math.min(window.innerWidth - 372, rect.right - 360))}px`;

  const header = document.createElement("div");
  header.className = "mb-3 flex items-start justify-between gap-3 border-b border-slate-100 pb-2";
  header.innerHTML = `
    <div>
      <div class="text-base font-black text-slate-900">More events</div>
      <div class="text-xs font-semibold text-slate-400">Same hour · tap to open</div>
    </div>
  `;

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "flex h-8 w-8 items-center justify-center rounded-full text-lg font-black text-slate-400 hover:bg-slate-100 hover:text-slate-700";
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
    preview.className = "mb-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-bold text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50";
    preview.textContent = eventLabel(item.button);
    preview.onclick = (event) => {
      event.stopPropagation();
      closePanels();
      clickOriginalEvent(item.button);
    };
    panel.appendChild(preview);
  });

  document.body.appendChild(panel);
}

function renderBadge(parent, bucket, hiddenItems) {
  if (!hiddenItems.length) return;

  const badge = document.createElement("button");
  badge.type = "button";
  badge.dataset.familyWallHourBadge = String(bucket);
  badge.className = "absolute rounded-full border border-slate-300 bg-white px-2 py-1 text-xs font-black text-slate-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700";
  badge.textContent = `+${hiddenItems.length}`;
  badge.title = `${hiddenItems.length} more events starting during this hour`;
  badge.style.top = `${getTopFromBucket(bucket)}px`;
  badge.style.right = "0.5rem";
  badge.style.zIndex = "90";
  badge.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    buildPanel(badge, hiddenItems);
  };

  parent.appendChild(badge);
}

function layoutHourBuckets() {
  const body = document.querySelector(".family-calendar-live-body");
  if (!body || !isWeekView(body)) return;

  body.querySelectorAll("[data-family-wall-hour-badge]").forEach((badge) => badge.remove());

  const eventButtons = Array.from(body.querySelectorAll("button.absolute.left-2.right-2, button.absolute.overflow-hidden"))
    .filter((button) => button.parentElement && Number.parseFloat(button.style.top || "0") > 0 && Number.parseFloat(button.style.height || "0") > 0);

  const parents = Array.from(new Set(eventButtons.map((button) => button.parentElement).filter(Boolean)));

  parents.forEach((parent) => {
    const items = Array.from(parent.querySelectorAll("button.absolute.left-2.right-2, button.absolute.overflow-hidden"))
      .map((button, index) => {
        const top = Number.parseFloat(button.style.top || "0");
        const height = Number.parseFloat(button.style.height || "0");
        if (!top || !height) return null;
        const startMinutes = getStartMinutesFromTop(top);
        return {
          button,
          index,
          top,
          height,
          startMinutes,
          bucket: hourBucket(startMinutes),
        };
      })
      .filter(Boolean);

    if (!items.length) return;

    items.forEach((item) => {
      item.button.style.removeProperty("display");
      item.button.style.removeProperty("opacity");
      item.button.style.removeProperty("pointer-events");
    });

    const groups = new Map();
    items.forEach((item) => {
      const group = groups.get(item.bucket) || [];
      group.push(item);
      groups.set(item.bucket, group);
    });

    groups.forEach((group, bucket) => {
      const ordered = [...group].sort((a, b) => a.startMinutes - b.startMinutes || b.height - a.height || a.index - b.index);
      const visible = ordered.slice(0, MAX_VISIBLE_PER_HOUR_BUCKET);
      const hidden = ordered.slice(MAX_VISIBLE_PER_HOUR_BUCKET);

      visible.forEach((item, visibleIndex) => {
        const width = 100 / Math.max(1, visible.length);
        item.button.style.setProperty("display", "block", "important");
        item.button.style.setProperty("left", `calc(${width * visibleIndex}% + 0.5rem)`, "important");
        item.button.style.setProperty("right", "auto", "important");
        item.button.style.setProperty("width", `calc(${width}% - ${visible.length === 1 ? "1rem" : "0.7rem"})`, "important");
        item.button.style.setProperty("z-index", String(30 + visibleIndex), "important");
      });

      hidden.forEach((item) => {
        item.button.style.setProperty("display", "none", "important");
      });

      renderBadge(parent, bucket, hidden);
    });
  });
}

function scheduleLayout() {
  if (layoutScheduled) return;
  layoutScheduled = true;
  window.requestAnimationFrame(() => {
    layoutScheduled = false;
    layoutHourBuckets();
  });
  window.setTimeout(layoutHourBuckets, 120);
}

function attachObserver() {
  const body = document.querySelector(".family-calendar-live-body");
  if (!body) return false;

  if (bodyObserver) bodyObserver.disconnect();
  bodyObserver = new MutationObserver(scheduleLayout);
  bodyObserver.observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class"] });
  scheduleLayout();
  return true;
}

function startObserver() {
  if (observerStarted) return;
  observerStarted = true;

  const tryAttach = () => {
    if (attachObserver() && retryTimer) {
      window.clearInterval(retryTimer);
      retryTimer = null;
    }
  };

  window.addEventListener("load", tryAttach);
  window.addEventListener("resize", scheduleLayout);
  document.addEventListener("click", scheduleLayout, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePanels();
  }, true);
  document.addEventListener("pointerdown", (event) => {
    if (event.target?.closest?.("[data-family-wall-hour-panel]")) return;
    if (event.target?.closest?.("[data-family-wall-hour-badge]")) return;
    closePanels();
  }, true);

  tryAttach();
  retryTimer = window.setInterval(tryAttach, 300);
}

if (typeof window !== "undefined") {
  startObserver();
}
