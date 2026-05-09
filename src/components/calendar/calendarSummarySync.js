let started = false;
let observer = null;
let scheduled = false;

function textOf(element) {
  return (element?.textContent || "").replace(/\s+/g, " ").trim();
}

function isVisible(element) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
}

function activeView() {
  const buttons = Array.from(document.querySelectorAll("button"));
  const active = buttons.find((button) => {
    const text = textOf(button).toLowerCase();
    return ["day", "week", "month"].includes(text) && String(button.className || "").includes("bg-blue-600");
  });
  return textOf(active).toLowerCase() || "week";
}

function visibleSummaryElement() {
  const shell = document.querySelector(".family-calendar-shell");
  if (!shell) return null;

  return Array.from(shell.querySelectorAll("p, span, div"))
    .filter((element) => isVisible(element))
    .find((element) => {
      if (element.closest(".family-calendar-live-body")) return false;
      return /^\d+\s+events?\s*[·|]/i.test(textOf(element));
    });
}

function normalizeRange(range, view) {
  const clean = String(range || "").replace(" | ", " · ").trim();

  if (view === "day") {
    const sameDay = clean.match(/^([A-Za-z]{3,9}\s+\d{1,2})\s*-\s*\1$/i);
    if (sameDay) return sameDay[1];

    const firstDay = clean.match(/^([A-Za-z]{3,9}\s+\d{1,2})\s*-/i);
    if (firstDay) return firstDay[1];
  }

  return clean;
}

function visibleTextEvents(body) {
  const seen = new Set();

  const addFromElement = (element) => {
    if (!isVisible(element)) return;
    if (element.closest("[data-family-wall-hour-panel]")) return;
    const text = textOf(element);
    if (!text) return;
    if (/^\+\d+(\s+more)?$/i.test(text)) return;
    if (/^(month|week|day|today|person|category|add event)$/i.test(text)) return;
    if (/^\d+\s+events?/i.test(text)) return;
    seen.add(text);
  };

  body.querySelectorAll("button.absolute.overflow-hidden").forEach(addFromElement);
  body.querySelectorAll("button.w-full.rounded-lg.border").forEach(addFromElement);
  body.querySelectorAll("[role='button']").forEach(addFromElement);

  return seen.size;
}

function hiddenBadgeCount(body) {
  return Array.from(body.querySelectorAll("button, p, span, div"))
    .filter((element) => isVisible(element))
    .filter((element) => !element.closest("[data-family-wall-hour-panel]"))
    .map((element) => textOf(element).match(/^\+(\d+)(?:\s+more)?$/i))
    .filter(Boolean)
    .reduce((total, match) => total + Number(match[1] || 0), 0);
}

function eventCountForCurrentView(body) {
  return visibleTextEvents(body) + hiddenBadgeCount(body);
}

function syncCalendarSummary() {
  const body = document.querySelector(".family-calendar-live-body");
  const summary = visibleSummaryElement();
  if (!body || !summary) return;

  const currentText = textOf(summary).replace(" | ", " · ");
  const match = currentText.match(/^\d+\s+events?\s*[·|]\s*(.+)$/i);
  if (!match) return;

  const view = activeView();
  const count = eventCountForCurrentView(body);
  const range = normalizeRange(match[1], view);
  const label = count === 1 ? "event" : "events";
  const nextText = `${count} ${label} · ${range}`;

  if (textOf(summary) !== nextText) {
    summary.textContent = nextText;
  }
}

function scheduleSync() {
  if (scheduled) return;
  scheduled = true;
  window.requestAnimationFrame(() => {
    scheduled = false;
    syncCalendarSummary();
  });
  window.setTimeout(syncCalendarSummary, 150);
}

function attach() {
  const shell = document.querySelector(".family-calendar-shell");
  if (!shell) return false;
  if (observer) observer.disconnect();
  observer = new MutationObserver(scheduleSync);
  observer.observe(shell, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["class", "style"] });
  scheduleSync();
  return true;
}

export function startCalendarSummarySync() {
  if (started || typeof window === "undefined") return;
  started = true;

  const retry = window.setInterval(() => {
    if (attach()) window.clearInterval(retry);
  }, 300);

  window.addEventListener("load", attach);
  window.addEventListener("resize", scheduleSync);
  document.addEventListener("click", scheduleSync, true);
}

startCalendarSummarySync();
