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

.family-calendar-week .family-calendar-live-body div.relative > button.absolute.left-2.right-2 {
  width: calc(50% - 0.45rem) !important;
  right: auto !important;
  z-index: 20 !important;
}

.family-calendar-week .family-calendar-live-body div.relative > button.absolute.left-2.right-2:nth-of-type(odd) {
  left: 0.5rem !important;
}

.family-calendar-week .family-calendar-live-body div.relative > button.absolute.left-2.right-2:nth-of-type(even) {
  left: calc(50% + 0.2rem) !important;
}

.family-calendar-week .family-calendar-live-body div.relative > button.absolute.left-2.right-2:hover,
.family-calendar-week .family-calendar-live-body div.relative > button.absolute.left-2.right-2:focus-visible {
  z-index: 40 !important;
}
`;

const weatherCodeMap = {
  0: { emoji: "☀️", label: "Clear" },
  1: { emoji: "🌤️", label: "Mostly clear" },
  2: { emoji: "⛅", label: "Partly cloudy" },
  3: { emoji: "☁️", label: "Cloudy" },
  45: { emoji: "🌫️", label: "Fog" },
  48: { emoji: "🌫️", label: "Fog" },
  51: { emoji: "🌦️", label: "Light drizzle" },
  53: { emoji: "🌦️", label: "Drizzle" },
  55: { emoji: "🌧️", label: "Heavy drizzle" },
  61: { emoji: "🌧️", label: "Light rain" },
  63: { emoji: "🌧️", label: "Rain" },
  65: { emoji: "🌧️", label: "Heavy rain" },
  71: { emoji: "🌨️", label: "Light snow" },
  73: { emoji: "🌨️", label: "Snow" },
  75: { emoji: "❄️", label: "Heavy snow" },
  80: { emoji: "🌦️", label: "Rain showers" },
  81: { emoji: "🌧️", label: "Rain showers" },
  82: { emoji: "⛈️", label: "Heavy showers" },
  95: { emoji: "⛈️", label: "Thunderstorm" },
  96: { emoji: "⛈️", label: "Storm / hail" },
  99: { emoji: "⛈️", label: "Storm / hail" },
};

const monthShortNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
  const body = document.querySelector(".family-calendar-live-body");
  const addButton = calendarButtons().find((button) => /add\s*event/i.test(cleanText(button)));

  if (addButton) {
    addButton.click();
    return true;
  }

  const visibleDayButtons = Array.from(body?.querySelectorAll("button") || []).filter((button) => {
    const text = cleanText(button);
    const className = String(button.className || "");
    return button.querySelector("svg") && /^\d+/.test(text) && !/add\s*event/i.test(text) && !className.includes("fixed");
  });

  const todayCell = visibleDayButtons.find((button) => String(button.className || "").includes("ring-blue-400"));
  const targetCell = todayCell || visibleDayButtons[0];

  if (targetCell) {
    targetCell.click();
    return true;
  }

  return false;
}

function findMonthYearPickerPanel() {
  const body = document.querySelector(".family-calendar-live-body");
  const panels = Array.from(body?.querySelectorAll("div.absolute") || []);
  return panels.find((panel) => {
    const text = cleanText(panel);
    return monthShortNames.every((month) => text.includes(month)) && /\d{4}/.test(text);
  });
}

function formatClock(date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).toLowerCase();
}

function formatHeaderDate(date) {
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function weatherLabels(weather) {
  if (weather.status === "loading") return { label: "📍 --°", description: "Locating" };
  if (weather.status === "blocked") return { label: "📍 --°", description: "Allow location" };
  if (weather.status === "error") return { label: "☁️ --°", description: "Weather" };
  if (weather.status !== "ready") return { label: "☁️ --°", description: "Weather" };

  const meta = weatherCodeMap[weather.code] || { emoji: "☁️", label: "Weather" };
  return {
    label: `${meta.emoji} ${Math.round(weather.temperature)}°`,
    description: meta.label,
  };
}

async function fetchWeather(latitude, longitude) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set("current", "temperature_2m,weather_code");
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url.toString());
  if (!response.ok) throw new Error("Weather request failed");
  const data = await response.json();

  return {
    temperature: data.current?.temperature_2m,
    code: data.current?.weather_code,
  };
}

export default function Calendar() {
  const { user, profile, allProfiles, activeProfileId, setActiveProfileId } = useFamily();
  const [activeCalendar, setActiveCalendar] = useState("family");
  const [viewMode, setViewMode] = useState("week");
  const [calendarMeta, setCalendarMeta] = useState(() => readCalendarMeta());
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState({ status: "idle" });

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

  const weatherInfo = useMemo(() => weatherLabels(weather), [weather]);

  const handleFloatingAddEvent = () => {
    if (triggerHiddenAddEventButton()) return;

    setViewMode("month");
    window.setTimeout(() => {
      triggerHiddenAddEventButton();
    }, 120);
  };

  const handleDateSelect = (dateValue) => {
    const targetDate = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(targetDate.getTime())) return;

    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    const targetMonthLabel = monthShortNames[targetMonth];

    setViewMode("month");

    window.setTimeout(() => {
      const realMonthPickerButton = calendarButtons().find((button) => /^[A-Za-z]+\s+\d{4}$/.test(cleanText(button)));
      realMonthPickerButton?.click();

      window.setTimeout(() => {
        const panel = findMonthYearPickerPanel();
        if (!panel) return;

        const visibleYearText = Array.from(panel.querySelectorAll("p, span"))
          .map(cleanText)
          .find((text) => /^\d{4}$/.test(text));
        const visibleYear = Number(visibleYearText) || targetYear;
        const yearDiff = Math.max(-20, Math.min(20, targetYear - visibleYear));
        const yearButtons = Array.from(panel.querySelectorAll("button")).filter((button) => !cleanText(button) && button.querySelector("svg"));
        const yearBack = yearButtons[0];
        const yearForward = yearButtons[1];
        const yearButton = yearDiff > 0 ? yearForward : yearBack;

        for (let index = 0; index < Math.abs(yearDiff); index += 1) {
          window.setTimeout(() => yearButton?.click(), index * 25);
        }

        window.setTimeout(() => {
          const updatedPanel = findMonthYearPickerPanel() || panel;
          const monthButton = Array.from(updatedPanel.querySelectorAll("button")).find((button) => cleanText(button) === targetMonthLabel);
          monthButton?.click();
        }, Math.abs(yearDiff) * 25 + 80);
      }, 40);
    }, 40);
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setWeather({ status: "error" });
      return undefined;
    }

    let cancelled = false;
    setWeather({ status: "loading" });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const result = await fetchWeather(position.coords.latitude, position.coords.longitude);
          if (!cancelled) setWeather({ status: "ready", ...result });
        } catch (error) {
          console.error("Error loading weather:", error);
          if (!cancelled) setWeather({ status: "error" });
        }
      },
      (error) => {
        console.error("Location permission/weather error:", error);
        if (!cancelled) setWeather({ status: "blocked" });
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 30 * 60 * 1000 }
    );

    return () => {
      cancelled = true;
    };
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
    <div className={`family-calendar-shell ${viewMode === "week" ? "family-calendar-week" : ""} relative min-h-full bg-background pb-28 md:pb-6`} style={familyGradientVariables}>
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
            weatherLabel={weatherInfo.label}
            weatherDescription={weatherInfo.description}
            familyName={profile?.family_name || profile?.familyName || "Family"}
            families={allProfiles || []}
            activeFamilyId={activeProfileId || ""}
            onFamilyChange={setActiveProfileId}
            onViewModeChange={setViewMode}
            onPrevious={() => clickIconButton(0)}
            onToday={() => clickButtonByText(/^today$/i)}
            onNext={() => clickIconButton(1)}
            onDateSelect={handleDateSelect}
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
            onClick={handleFloatingAddEvent}
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
