import React, { useEffect, useMemo, useState } from "react";

import FamilyCalendarHeader from "@/components/calendar/FamilyCalendarHeader";
import FamilyCalendarView from "@/components/calendar/FamilyCalendarViewV9";
import CustodyCalendarView from "@/components/calendar/CustodyCalendarView";
import { useFamily } from "@/lib/FamilyContext";
import { familyColorIds, colorHex, colorSoftHex } from "@/lib/personColorUtils";

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

function selectPersonFromExistingChip(label) {
  const body = document.querySelector(".family-calendar-live-body");
  const chip = Array.from(body?.querySelectorAll("button") || []).find((button) => {
    const text = cleanText(button);
    return text === label && !/^Person/i.test(text) && !/^Category/i.test(text);
  });

  chip?.click();
}

function decoratePersonFilterFamilyDots() {
  const popovers = Array.from(document.querySelectorAll("div.fixed"));
  const popover = popovers.find((element) => cleanText(element).includes("Filter by Person"));

  if (!popover) return;

  Array.from(popover.querySelectorAll("button")).forEach((button) => {
    const normalizedText = cleanText(button).replace(/\s+/g, "");
    const isFamilyOption = /^AllPerson$/i.test(normalizedText) || /^EveryonePerson$/i.test(normalizedText);
    if (!isFamilyOption) return;

    const dot = Array.from(button.querySelectorAll("span")).find((span) => {
      const className = String(span.className || "");
      return className.includes("rounded-full") || (className.includes("h-9") && className.includes("w-9"));
    });

    if (dot) {
      dot.classList.remove("bg-slate-500");
      dot.style.setProperty("background", "var(--family-gradient)", "important");
    }
  });
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

function formatClock(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

function formatHeaderDate(date) {
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

export default function Calendar() {
  const { user, profile, allProfiles, activeProfileId, setActiveProfileId } = useFamily();
  const [activeCalendar, setActiveCalendar] = useState("family");
  const [viewMode, setViewMode] = useState("week");
  const [calendarMeta, setCalendarMeta] = useState(() => readCalendarMeta());
  const [now, setNow] = useState(() => new Date());

  const familyGradientVariables = useMemo(() => {
    const colorIds = familyColorIds(profile || {}, user);
    const strongColors = colorIds.map((color) => colorHex(color));
    const softColors = colorIds.map((color) => colorSoftHex(color));

    return {
      "--family-gradient": `linear-gradient(to right, ${strongColors.join(", ")})`,
      "--family-gradient-vertical": `linear-gradient(to bottom, ${strongColors.join(", ")})`,
      "--family-soft-gradient": `linear-gradient(to right, ${softColors.join(", ")})`,
    };
  }, [profile, user]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const updateMeta = () => {
      setCalendarMeta(readCalendarMeta());
      requestAnimationFrame(() => {
        hideDuplicateSummary();
        decoratePersonFilterFamilyDots();
      });
    };
    updateMeta();

    const body = document.querySelector(".family-calendar-live-body");
    if (!body) return undefined;

    const observer = new MutationObserver(updateMeta);
    observer.observe(body, { childList: true, subtree: true, characterData: true });

    return () => observer.disconnect();
  }, [activeCalendar, viewMode]);

  return (
    <div className="family-calendar-shell relative min-h-full bg-background pb-28 md:pb-6" style={familyGradientVariables}>
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
            currentTimeLabel={formatClock(now)}
            currentDateLabel={formatHeaderDate(now)}
            weatherLabel="☁️ --°"
            weatherDescription="Weather"
            familyName={profile?.family_name || profile?.familyName || "Family"}
            families={allProfiles || []}
            activeFamilyId={activeProfileId || ""}
            onFamilyChange={setActiveProfileId}
            onViewModeChange={setViewMode}
            onPrevious={() => clickIconButton(0)}
            onToday={() => clickButtonByText(/^today$/i)}
            onNext={() => clickIconButton(1)}
            onMonthClick={() => clickButtonByText(/^[A-Za-z]+\s+\d{4}$/)}
            onAddEvent={triggerHiddenAddEventButton}
            onPersonFilterClick={() => clickButtonContainingText(/^Person/i)}
            onCategoryFilterClick={() => clickButtonContainingText(/^Category/i)}
            onLegendPersonClick={selectPersonFromExistingChip}
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
