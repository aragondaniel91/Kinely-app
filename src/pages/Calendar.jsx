import React, { useEffect, useState } from "react";

import FamilyCalendarHeader from "@/components/calendar/FamilyCalendarHeader";
import FamilyCalendarView from "@/components/calendar/FamilyCalendarViewV9";
import CustodyCalendarView from "@/components/calendar/CustodyCalendarView";

const compactCalendarStyles = `
.family-calendar-live-body > div > div.mx-auto > div.border-b.border-slate-200.bg-white:first-child {
  display: none !important;
}

.family-calendar-live-body p.mt-4,
.family-calendar-live-body p.text-base.font-semibold.text-slate-600,
.family-calendar-live-body p[class*="text-slate-600"]:has(+ .grid.border-b.border-slate-200) {
  display: none !important;
}

.family-calendar-live-body > div > div.mx-auto {
  max-width: none !important;
  min-height: calc(100vh - 1rem) !important;
  border-top-left-radius: 0 !important;
  border-top-right-radius: 0 !important;
}
`;

function calendarButtons() {
  return Array.from(document.querySelectorAll(".family-calendar-live-body button"));
}

function clickButtonByText(pattern) {
  const button = calendarButtons().find((item) => pattern.test(item.textContent || ""));
  button?.click();
}

function clickIconButton(index) {
  const buttons = calendarButtons().filter((item) => {
    const text = (item.textContent || "").trim();
    return !text && item.querySelector("svg");
  });
  buttons[index]?.click();
}

function readCalendarMeta() {
  const body = document.querySelector(".family-calendar-live-body");
  const monthText = Array.from(body?.querySelectorAll("button") || [])
    .map((button) => (button.textContent || "").trim())
    .find((text) => /^[A-Za-z]+\s+\d{4}$/.test(text));

  const summaryText = Array.from(body?.querySelectorAll("p, div, span") || [])
    .map((item) => (item.textContent || "").trim())
    .find((text) => /^\d+\s+events?\s*\|/.test(text));

  return {
    monthLabel: monthText || "May 2026",
    eventSummary: summaryText ? summaryText.replace(" | ", " · ") : "17 events · May 2026",
  };
}

function hideDuplicateSummary() {
  const body = document.querySelector(".family-calendar-live-body");
  if (!body) return;

  Array.from(body.querySelectorAll("p, div, span")).forEach((element) => {
    const text = (element.textContent || "").trim();
    const isSummary = /^\d+\s+events?\s*[|·]/.test(text);
    const hasNestedElements = element.children.length > 0;

    if (isSummary && !hasNestedElements) {
      element.style.setProperty("display", "none", "important");
    }
  });
}

function triggerHiddenAddEventButton() {
  const addButton = calendarButtons().find((button) => /add\s*event/i.test(button.textContent || ""));

  if (addButton) {
    addButton.click();
    return;
  }

  const todayCell = calendarButtons().find((button) => button.querySelector("svg") && /\d+/.test(button.textContent || ""));
  todayCell?.click();
}

export default function Calendar() {
  const [activeCalendar, setActiveCalendar] = useState("family");
  const [viewMode, setViewMode] = useState("week");
  const [calendarMeta, setCalendarMeta] = useState(() => readCalendarMeta());

  useEffect(() => {
    const updateMeta = () => {
      setCalendarMeta(readCalendarMeta());
      requestAnimationFrame(hideDuplicateSummary);
    };
    updateMeta();

    const body = document.querySelector(".family-calendar-live-body");
    if (!body) return undefined;

    const observer = new MutationObserver(updateMeta);
    observer.observe(body, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, [activeCalendar, viewMode]);

  return (
    <div className="family-calendar-shell relative min-h-full bg-background pb-28 md:pb-6">
      <style>{compactCalendarStyles}</style>

      {activeCalendar === "custody" ? (
        <CustodyCalendarView
          activeCalendar={activeCalendar}
          setActiveCalendar={setActiveCalendar}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      ) : (
        <div className="mx-auto max-w-none overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
          <FamilyCalendarHeader
            viewMode={viewMode}
            monthLabel={calendarMeta.monthLabel}
            eventSummary={calendarMeta.eventSummary}
            onViewModeChange={setViewMode}
            onPrevious={() => clickIconButton(0)}
            onToday={() => clickButtonByText(/^today$/i)}
            onNext={() => clickIconButton(1)}
          />
          <div className="family-calendar-live-body">
            <FamilyCalendarView
              activeCalendar={activeCalendar}
              setActiveCalendar={setActiveCalendar}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
          </div>
          <button
            type="button"
            onClick={triggerHiddenAddEventButton}
            className="fixed bottom-28 right-8 z-[90] flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-4xl font-light leading-none text-white shadow-xl shadow-blue-600/30 transition hover:scale-105 hover:bg-blue-700 active:scale-95 md:bottom-8"
            aria-label="Add event"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
