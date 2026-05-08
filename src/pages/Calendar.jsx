import React, { useEffect, useState } from "react";

import FamilyCalendarHeader from "@/components/calendar/FamilyCalendarHeader";
import FamilyCalendarView from "@/components/calendar/FamilyCalendarViewV9";
import CustodyCalendarView from "@/components/calendar/CustodyCalendarView";

const compactCalendarStyles = `
.family-calendar-live-body > div > div.mx-auto > div.border-b.border-slate-200.bg-white:first-child {
  position: absolute !important;
  left: -9999px !important;
  top: 0 !important;
  width: 1px !important;
  height: 1px !important;
  overflow: visible !important;
  padding: 0 !important;
  margin: 0 !important;
  border: 0 !important;
}

body.legend-quick-filter button[aria-label="Close filter menu"],
body.legend-quick-filter div.fixed[class*="z-[80]"] {
  opacity: 0 !important;
  pointer-events: none !important;
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

function cleanText(element) {
  return (element?.textContent || "").replace(/\s+/g, " ").trim();
}

function clickButtonByText(pattern) {
  const button = calendarButtons().find((item) => pattern.test(cleanText(item)));
  button?.click();
}

function clickButtonContainingText(pattern) {
  const button = calendarButtons().find((item) => pattern.test(cleanText(item)));
  button?.click();
}

function clickIconButton(index) {
  const buttons = calendarButtons().filter((item) => {
    const text = cleanText(item);
    return !text && item.querySelector("svg");
  });
  buttons[index]?.click();
}

function selectPersonFromMenu(label) {
  document.body.classList.add("legend-quick-filter");
  clickButtonContainingText(/^Person/i);

  let attempts = 0;
  const trySelect = () => {
    attempts += 1;
    const menuButtons = Array.from(document.querySelectorAll("button"));
    const target = menuButtons.find((button) => {
      const text = cleanText(button);
      return text === label || text.startsWith(`${label} `);
    });

    if (target) {
      target.click();
      window.setTimeout(() => document.body.classList.remove("legend-quick-filter"), 80);
      return;
    }

    if (attempts < 8) {
      window.setTimeout(trySelect, 25);
      return;
    }

    document.body.classList.remove("legend-quick-filter");
  };

  window.setTimeout(trySelect, 25);
}

function readCalendarMeta() {
  const body = document.querySelector(".family-calendar-live-body");
  const monthText = Array.from(body?.querySelectorAll("button") || [])
    .map(cleanText)
    .find((text) => /^[A-Za-z]+\s+\d{4}$/.test(text));

  const summaryText = Array.from(body?.querySelectorAll("p, div, span") || [])
    .map(cleanText)
    .find((text) => /^\d+\s+events?\s*\|/.test(text));

  const personText = Array.from(body?.querySelectorAll("button") || [])
    .map(cleanText)
    .find((text) => /^Person/i.test(text));

  const categoryText = Array.from(body?.querySelectorAll("button") || [])
    .map(cleanText)
    .find((text) => /^Category/i.test(text));

  return {
    monthLabel: monthText || "May 2026",
    eventSummary: summaryText ? summaryText.replace(" | ", " · ") : "17 events · May 2026",
    selectedPersonLabel: personText ? personText.replace(/^Person\s*/i, "") : "All People",
    selectedCategoryLabel: categoryText ? categoryText.replace(/^Category\s*/i, "") : "All Categories",
  };
}

function hideDuplicateSummary() {
  const body = document.querySelector(".family-calendar-live-body");
  if (!body) return;

  Array.from(body.querySelectorAll("p, div, span")).forEach((element) => {
    const text = cleanText(element);
    const isSummary = /^\d+\s+events?\s*[|·]/.test(text);
    const hasNestedElements = element.children.length > 0;

    if (isSummary && !hasNestedElements) {
      element.style.setProperty("display", "none", "important");
    }
  });
}

function triggerHiddenAddEventButton() {
  const addButton = calendarButtons().find((button) => /add\s*event/i.test(cleanText(button)));

  if (addButton) {
    addButton.click();
    return;
  }

  const todayCell = calendarButtons().find((button) => button.querySelector("svg") && /\d+/.test(cleanText(button)));
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
            selectedPersonLabel={calendarMeta.selectedPersonLabel}
            selectedCategoryLabel={calendarMeta.selectedCategoryLabel}
            onViewModeChange={setViewMode}
            onPrevious={() => clickIconButton(0)}
            onToday={() => clickButtonByText(/^today$/i)}
            onNext={() => clickIconButton(1)}
            onPersonFilterClick={() => clickButtonContainingText(/^Person/i)}
            onCategoryFilterClick={() => clickButtonContainingText(/^Category/i)}
            onLegendPersonClick={selectPersonFromMenu}
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
