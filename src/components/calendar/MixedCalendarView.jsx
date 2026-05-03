import React, { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  MapPin,
  Users,
} from "lucide-react";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { cn } from "@/lib/utils";
import { COLOR_MAP } from "@/components/profile/ParentColorPicker";

import { Button } from "@/components/ui/button";

function normalizeDate(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);

  if (value?.toDate) {
    return format(value.toDate(), "yyyy-MM-dd");
  }

  return String(value).slice(0, 10);
}

function normalizeCustodyDay(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    type: "custody",
    date: normalizeDate(data.date),
    is_split: data.is_split || data.isSplit || false,
    with_whom: data.with_whom || data.withWhom || null,
    morning: data.morning || null,
    afternoon: data.afternoon || null,
    notes: data.notes || "",
  };
}

function normalizeFamilyEvent(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    type: "event",
    title: data.title || "",
    description: data.description || data.notes || "",
    date: data.date || "",
    startTime: data.startTime || "",
    endTime: data.endTime || "",
    category: data.category || "family",
    location: data.location || "",
    assignedToType: data.assignedToType || (data.childName ? "child" : "all"),
    assignedToName: data.assignedToName || data.childName || "",
  };
}

function getParentName(parent, dadName, momName) {
  if (parent === "dad") return dadName || "Dad";
  if (parent === "mom") return momName || "Mom";
  return "Shared";
}

function getCustodySummary(custody, dadName, momName) {
  if (!custody) return "No custody info";

  if (custody.is_split) {
    return `AM: ${getParentName(
      custody.morning,
      dadName,
      momName
    )} / PM: ${getParentName(custody.afternoon, dadName, momName)}`;
  }

  return `With ${getParentName(custody.with_whom, dadName, momName)}`;
}

function getAssignedLabel(event) {
  if (event.assignedToType === "dad")
    return `👨 ${event.assignedToName || "Dad"}`;
  if (event.assignedToType === "mom")
    return `👩 ${event.assignedToName || "Mom"}`;
  if (event.assignedToType === "child") return `👶 ${event.assignedToName}`;
  return "👨‍👩‍👧‍👦 Family";
}

function EventMiniCard({ event }) {
  return (
    <div className="rounded-xl border bg-background p-2">
      <div className="flex items-start gap-2">
        <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 shrink-0" />

        <div className="min-w-0 flex-1">
          <p className="font-bold text-xs truncate">{event.title}</p>

          <div className="flex flex-wrap gap-1 mt-1">
            {event.startTime && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {event.startTime}
              </span>
            )}

            {event.location && (
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                <MapPin className="w-3 h-3" />
                {event.location}
              </span>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground mt-1">
            {getAssignedLabel(event)}
          </p>
        </div>
      </div>
    </div>
  );
}

function CustodyMiniCard({ custody, dadName, momName, dadTheme, momTheme }) {
  if (!custody) {
    return (
      <div className="rounded-xl border border-dashed bg-background p-2 text-[11px] text-muted-foreground">
        No custody info
      </div>
    );
  }

  const isDad = custody.with_whom === "dad";
  const theme = custody.is_split ? null : isDad ? dadTheme : momTheme;

  return (
    <div
      className={cn(
        "rounded-xl border p-2 text-xs",
        theme ? `${theme.bg} ${theme.border}` : "bg-background"
      )}
    >
      <div className="flex items-center gap-2">
        <Heart
          className={cn(
            "w-3.5 h-3.5",
            theme ? theme.text : "text-muted-foreground"
          )}
        />
        <p className={cn("font-bold", theme ? theme.text : "text-foreground")}>
          {getCustodySummary(custody, dadName, momName)}
        </p>
      </div>

      {custody.notes && (
        <p className="text-[10px] text-muted-foreground mt-1 truncate">
          {custody.notes}
        </p>
      )}
    </div>
  );
}

function DayMixedCard({
  day,
  custody,
  events,
  dadName,
  momName,
  dadTheme,
  momTheme,
  viewMode,
}) {
  const today = isToday(day);

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-2 min-h-[150px]",
        today && "ring-2 ring-primary ring-offset-1",
        viewMode === "month" && "min-h-[125px]"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <p
            className={cn(
              "font-black",
              today ? "text-primary" : "text-foreground",
              viewMode === "month" ? "text-xs" : "text-sm"
            )}
          >
            {format(day, viewMode === "week" ? "EEE d" : "d")}
          </p>
          {viewMode !== "month" && (
            <p className="text-[10px] text-muted-foreground">
              {format(day, "MMM")}
            </p>
          )}
        </div>

        {events.length > 0 && (
          <span className="text-[10px] rounded-full bg-muted px-2 py-0.5 font-semibold text-muted-foreground">
            {events.length} event{events.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <CustodyMiniCard
          custody={custody}
          dadName={dadName}
          momName={momName}
          dadTheme={dadTheme}
          momTheme={momTheme}
        />

        {events.slice(0, viewMode === "month" ? 1 : 3).map((event) => (
          <EventMiniCard key={event.id} event={event} />
        ))}

        {events.length > (viewMode === "month" ? 1 : 3) && (
          <p className="text-[10px] text-muted-foreground font-semibold px-1">
            +{events.length - (viewMode === "month" ? 1 : 3)} more
          </p>
        )}
      </div>
    </div>
  );
}

export default function MixedCalendarView({ viewMode = "week" }) {
  const { user, familyId, perms, dadName, momName, dadColor, momColor } =
    useFamily();

  const [anchorDate, setAnchorDate] = useState(new Date());
  const [custodyDays, setCustodyDays] = useState([]);
  const [familyEvents, setFamilyEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCustody, setShowCustody] = useState(true);
  const [showEvents, setShowEvents] = useState(true);

  const canRead = perms?.calendar?.read !== false;

  const dadTheme = COLOR_MAP[dadColor] || COLOR_MAP.blue;
  const momTheme = COLOR_MAP[momColor] || COLOR_MAP.amber;

  const period = useMemo(() => {
    if (viewMode === "day") {
      const key = format(anchorDate, "yyyy-MM-dd");
      return {
        title: format(anchorDate, "MMM d, yyyy"),
        days: [anchorDate],
        startKey: key,
        endKey: key,
      };
    }

    if (viewMode === "month") {
      const monthStart = startOfMonth(anchorDate);
      const monthEnd = endOfMonth(anchorDate);
      const start = startOfWeek(monthStart, { weekStartsOn: 0 });
      const end = endOfWeek(monthEnd, { weekStartsOn: 0 });

      const days = [];
      let current = start;

      while (current <= end) {
        days.push(current);
        current = addDays(current, 1);
      }

      return {
        title: format(anchorDate, "MMMM yyyy"),
        days,
        startKey: format(start, "yyyy-MM-dd"),
        endKey: format(end, "yyyy-MM-dd"),
      };
    }

    const start = startOfWeek(anchorDate, { weekStartsOn: 0 });
    const end = addDays(start, 6);

    const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));

    return {
      title: `${format(start, "MMM d")} – ${format(end, "MMM d")}`,
      days,
      startKey: format(start, "yyyy-MM-dd"),
      endKey: format(end, "yyyy-MM-dd"),
    };
  }, [anchorDate, viewMode]);

  const loadData = async () => {
    if (!user || !familyId || !canRead) {
      setCustodyDays([]);
      setFamilyEvents([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const custodyQuery = query(
        collection(db, "custodyDays"),
        where("familyId", "==", familyId)
      );

      const eventsQuery = query(
        collection(db, "familyEvents"),
        where("familyId", "==", familyId)
      );

      const [custodySnap, eventsSnap] = await Promise.all([
        getDocs(custodyQuery),
        getDocs(eventsQuery),
      ]);

      const custody = custodySnap.docs
        .map(normalizeCustodyDay)
        .filter(
          (item) => item.date >= period.startKey && item.date <= period.endKey
        );

      const events = eventsSnap.docs
        .map(normalizeFamilyEvent)
        .filter(
          (item) => item.date >= period.startKey && item.date <= period.endKey
        )
        .sort((a, b) => {
          const dateCompare = (a.date || "").localeCompare(b.date || "");
          if (dateCompare !== 0) return dateCompare;

          return (a.startTime || "").localeCompare(b.startTime || "");
        });

      setCustodyDays(custody);
      setFamilyEvents(events);
    } catch (error) {
      console.error("Error loading mixed calendar:", error);
      setCustodyDays([]);
      setFamilyEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, familyId, canRead, period.startKey, period.endKey]);

  const custodyMap = useMemo(() => {
    const map = {};
    custodyDays.forEach((day) => {
      map[day.date] = day;
    });
    return map;
  }, [custodyDays]);

  const getEventsForDate = (day) => {
    const key = format(day, "yyyy-MM-dd");
    return familyEvents.filter((event) => event.date === key);
  };

  const goPrevious = () => {
    if (viewMode === "day") {
      setAnchorDate(addDays(anchorDate, -1));
      return;
    }

    if (viewMode === "month") {
      setAnchorDate(subMonths(anchorDate, 1));
      return;
    }

    setAnchorDate(addDays(anchorDate, -7));
  };

  const goNext = () => {
    if (viewMode === "day") {
      setAnchorDate(addDays(anchorDate, 1));
      return;
    }

    if (viewMode === "month") {
      setAnchorDate(addMonths(anchorDate, 1));
      return;
    }

    setAnchorDate(addDays(anchorDate, 7));
  };

  if (!canRead) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold font-heading mb-2">Mixed Calendar</h1>
        <p className="text-muted-foreground">
          You do not have access to this family calendar.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-4 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold font-heading flex items-center gap-2">
            <Users className="w-5 h-5" />
            Mixed Calendar
          </h1>
          <p className="text-sm text-muted-foreground">
            Custody schedule and family events together.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={goPrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <span className="text-sm font-semibold font-heading min-w-[145px] text-center">
            {period.title}
          </span>

          <Button variant="outline" size="icon" onClick={goNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>

          <Button variant="outline" onClick={() => setAnchorDate(new Date())}>
            Today
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          type="button"
          onClick={() => setShowCustody((prev) => !prev)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-bold",
            showCustody
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground"
          )}
        >
          <Heart className="w-3 h-3 inline mr-1" />
          Custody
        </button>

        <button
          type="button"
          onClick={() => setShowEvents((prev) => !prev)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-bold",
            showEvents
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground"
          )}
        >
          <CalendarDays className="w-3 h-3 inline mr-1" />
          Events
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : (
        <div
          className={cn(
            "grid gap-2",
            viewMode === "day"
              ? "grid-cols-1 max-w-3xl w-full mx-auto"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-7",
            viewMode === "month" && "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7"
          )}
        >
          {period.days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const custody = showCustody ? custodyMap[key] : null;
            const events = showEvents ? getEventsForDate(day) : [];
            const inMonth =
              viewMode === "month" ? isSameMonth(day, anchorDate) : true;

            return (
              <div key={key} className={cn(!inMonth && "opacity-40")}>
                <DayMixedCard
                  day={day}
                  custody={custody}
                  events={events}
                  dadName={dadName}
                  momName={momName}
                  dadTheme={dadTheme}
                  momTheme={momTheme}
                  viewMode={viewMode}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
