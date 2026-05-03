import React, { useEffect, useMemo, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isToday,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  parseISO,
  differenceInCalendarDays,
} from "date-fns";

import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CalendarDays,
  Heart,
} from "lucide-react";

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { COLOR_MAP } from "@/components/profile/ParentColorPicker";

import CustodyDayDialog from "@/components/calendar/CustodyDayDialog";
// GoogleCalendarSync currently still uses localStorage, so we keep it disabled for now.
// import GoogleCalendarSync from "@/components/calendar/GoogleCalendarSync";

const DAD_SOLID = "bg-blue-500";
const MOM_SOLID = "bg-amber-400";

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
    ...data,
    date: normalizeDate(data.date),
    is_split: data.is_split || data.isSplit || false,
    with_whom: data.with_whom || data.withWhom || null,
    morning: data.morning || null,
    afternoon: data.afternoon || null,
    notes: data.notes || "",
  };
}

function getParentLabel(parent, dadName, momName) {
  if (parent === "dad") return dadName || "Papá";
  if (parent === "mom") return momName || "Mamá";
  return "Compartido";
}

export default function CustodyCalendar({ viewMode = "month" }) {
  const {
    user,
    profile,
    familyId,
    perms,
    dadName,
    momName,
    dadColor,
    momColor,
  } = useFamily();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showSync, setShowSync] = useState(false);
  const [custodyDays, setCustodyDays] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const canRead = perms?.calendar?.read !== false;
  const canWrite = perms?.calendar?.write !== false;

  const dadTheme = COLOR_MAP[dadColor] || COLOR_MAP.blue;
  const momTheme = COLOR_MAP[momColor] || COLOR_MAP.amber;

  const loadCustodyDays = async () => {
    if (!user || !familyId || !canRead) {
      setCustodyDays([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let data = [];

      try {
        const q = query(
          collection(db, "custodyDays"),
          where("familyId", "==", familyId)
        );

        const snap = await getDocs(q);
        data = snap.docs.map(normalizeCustodyDay);
      } catch (error) {
        console.warn("Fallback custody query by family_id:", error);

        try {
          const q = query(
            collection(db, "custodyDays"),
            where("family_id", "==", familyId)
          );

          const snap = await getDocs(q);
          data = snap.docs.map(normalizeCustodyDay);
        } catch (legacyError) {
          console.warn("Fallback custody query by userId:", legacyError);

          const q = query(
            collection(db, "custodyDays"),
            where("userId", "==", user.uid)
          );

          const snap = await getDocs(q);
          data = snap.docs.map(normalizeCustodyDay);
        }
      }

      data.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      setCustodyDays(data);
    } catch (error) {
      console.error("Error loading custody days:", error);
      setCustodyDays([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustodyDays();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, familyId, canRead]);

  const saveCustodyDay = async (payload) => {
    if (!user || !familyId || !canWrite) return;

    setIsSaving(true);

    try {
      const dateKey = normalizeDate(payload.date);
      const docId = `${familyId}_${dateKey}`;

      const data = {
        id: docId,
        date: dateKey,

        is_split: payload.is_split || false,
        isSplit: payload.is_split || false,

        with_whom: payload.is_split ? null : payload.with_whom,
        withWhom: payload.is_split ? null : payload.with_whom,

        morning: payload.is_split ? payload.morning : null,
        afternoon: payload.is_split ? payload.afternoon : null,

        notes: payload.notes || "",

        familyId,
        family_id: familyId,
        familyName: profile?.family_name || profile?.familyName || "",

        userId: user.uid,
        createdBy: user.uid,
        createdByEmail: user.email || null,

        updatedAt: serverTimestamp(),
        updated_date: new Date().toISOString(),
      };

      await setDoc(doc(db, "custodyDays", docId), data, { merge: true });

      setCustodyDays((prev) => {
        const existing = prev.find((d) => normalizeDate(d.date) === dateKey);

        if (existing) {
          return prev.map((d) =>
            normalizeDate(d.date) === dateKey ? { ...d, ...data } : d
          );
        }

        return [...prev, data].sort((a, b) =>
          (a.date || "").localeCompare(b.date || "")
        );
      });

      setSelectedDate(null);
    } catch (error) {
      console.error("Error saving custody day:", error);
      alert(`There was an error saving the custody day: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCustodyDay = async (date) => {
    if (!user || !familyId || !date || !canWrite) return;

    setIsSaving(true);

    try {
      const dateKey = normalizeDate(date);
      const newDocId = `${familyId}_${dateKey}`;

      await deleteDoc(doc(db, "custodyDays", newDocId));

      // Best-effort cleanup for old per-user document ID.
      try {
        const oldDocId = `${user.uid}_${dateKey}`;
        await deleteDoc(doc(db, "custodyDays", oldDocId));
      } catch (legacyError) {
        console.warn("Could not delete legacy custody doc:", legacyError);
      }

      setCustodyDays((prev) =>
        prev.filter((d) => normalizeDate(d.date) !== dateKey)
      );

      setSelectedDate(null);
    } catch (error) {
      console.error("Error deleting custody day:", error);
      alert(`There was an error deleting the custody day: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  const visibleCustodyDays = custodyDays.filter((d) => {
    const dateKey = normalizeDate(d.date);

    return (
      dateKey >= format(calStart, "yyyy-MM-dd") &&
      dateKey <= format(calEnd, "yyyy-MM-dd")
    );
  });

  const custodyMap = {};
  visibleCustodyDays.forEach((d) => {
    const key = normalizeDate(d.date);
    if (key) custodyMap[key] = d;
  });

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayCustody = custodyMap[todayKey];

  const todayParent = todayCustody?.is_split ? null : todayCustody?.with_whom;

  const todayLabel = todayCustody?.is_split
    ? `AM: ${getParentLabel(
        todayCustody.morning,
        dadName,
        momName
      )} / PM: ${getParentLabel(todayCustody.afternoon, dadName, momName)}`
    : todayParent
    ? todayParent === "dad"
      ? (dadName || "PAPÁ").toUpperCase()
      : (momName || "MAMÁ").toUpperCase()
    : null;

  const sortedDays = [...visibleCustodyDays].sort((a, b) =>
    (a.date || "").localeCompare(b.date || "")
  );

  const nextChange = sortedDays.find((d) => {
    const dateKey = normalizeDate(d.date);
    if (!dateKey || dateKey <= todayKey) return false;

    const prevKey = format(
      addDays(parseISO(dateKey + "T12:00:00"), -1),
      "yyyy-MM-dd"
    );

    const prev = custodyMap[prevKey];

    if (!prev) return false;

    const prevParent = prev.is_split ? prev.afternoon : prev.with_whom;
    const thisParent = d.is_split ? d.morning : d.with_whom;

    return prevParent !== thisParent;
  });

  const upcoming = sortedDays
    .filter((d) => normalizeDate(d.date) >= todayKey)
    .slice(0, 4);

  const dadDays = visibleCustodyDays.reduce((acc, d) => {
    if (!d.is_split) return acc + (d.with_whom === "dad" ? 1 : 0);

    return (
      acc + (d.morning === "dad" ? 0.5 : 0) + (d.afternoon === "dad" ? 0.5 : 0)
    );
  }, 0);

  const momDays = visibleCustodyDays.reduce((acc, d) => {
    if (!d.is_split) return acc + (d.with_whom === "mom" ? 1 : 0);

    return (
      acc + (d.morning === "mom" ? 0.5 : 0) + (d.afternoon === "mom" ? 0.5 : 0)
    );
  }, 0);

  const weekDays = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

  const selectedDateKey =
    selectedDate instanceof Date && !Number.isNaN(selectedDate.getTime())
      ? format(selectedDate, "yyyy-MM-dd")
      : null;

  const selectedExistingData = selectedDateKey
    ? custodyDays.find((d) => normalizeDate(d.date) === selectedDateKey)
    : null;

  if (!canRead) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold font-heading mb-2">
          Calendario de Custodia
        </h1>
        <p className="text-muted-foreground">
          No tienes acceso al calendario de esta familia.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-screen bg-gray-50">
      <aside className="w-full lg:w-56 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-3 lg:p-4 flex flex-col gap-3 lg:gap-4 overflow-visible lg:overflow-y-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-white" />
          </div>

          <div>
            <p className="font-bold font-heading text-sm leading-tight">
              Plan de Familia
            </p>
            <p className="text-xs text-muted-foreground">Calendario Familiar</p>
          </div>
        </div>

        {loading && (
          <div className="text-xs text-muted-foreground bg-gray-50 border rounded-xl p-2">
            Loading calendar...
          </div>
        )}

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
            HOY
          </p>

          <p className="font-bold text-base font-heading">
            {format(new Date(), "EEEE, d 'de' MMMM")}
          </p>

          {todayCustody && (
            <div
              className={cn(
                "mt-2 rounded-xl p-3 flex items-center gap-2 border",
                todayParent === "dad"
                  ? `${dadTheme.bg} ${dadTheme.border}`
                  : `${momTheme.bg} ${momTheme.border}`
              )}
            >
              <span className="text-2xl">
                {todayParent === "dad"
                  ? "👨"
                  : todayParent === "mom"
                  ? "👩"
                  : "👨👩"}
              </span>

              <div>
                <p className="text-xs text-muted-foreground">Está con</p>
                <p
                  className={cn(
                    "font-black text-sm",
                    todayParent === "dad" ? dadTheme.text : momTheme.text
                  )}
                >
                  {todayLabel}
                </p>
              </div>

              <Heart
                className={cn(
                  "w-4 h-4 ml-auto",
                  todayParent === "dad"
                    ? dadTheme.text
                    : `${momTheme.text} fill-current`
                )}
              />
            </div>
          )}

          {!todayCustody && (
            <p className="text-xs text-muted-foreground mt-2">
              No hay información de custodia para hoy.
            </p>
          )}
        </div>

        {nextChange && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
              PRÓXIMO CAMBIO
            </p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">
                    {format(
                      parseISO(normalizeDate(nextChange.date) + "T12:00:00"),
                      "d"
                    )}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold leading-tight">
                    {format(
                      parseISO(normalizeDate(nextChange.date) + "T12:00:00"),
                      "EEE, d MMM"
                    )}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    en{" "}
                    {differenceInCalendarDays(
                      parseISO(normalizeDate(nextChange.date) + "T12:00:00"),
                      new Date()
                    )}{" "}
                    días
                  </p>
                </div>
              </div>

              <p
                className={cn(
                  "text-xs font-bold mt-1.5",
                  nextChange.with_whom === "dad"
                    ? "text-blue-600"
                    : "text-amber-600"
                )}
              >
                Con{" "}
                {nextChange.with_whom === "dad"
                  ? `${dadName || "Papá"} 👨`
                  : `${momName || "Mamá"} 👩`}
              </p>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            RESUMEN
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div
              className={`${dadTheme.bg} ${dadTheme.border} border rounded-xl p-2 text-center`}
            >
              <p className={`text-xs ${dadTheme.text}`}>{dadName || "Papá"}</p>
              <p className={`text-lg font-black ${dadTheme.text}`}>{dadDays}</p>
            </div>

            <div
              className={`${momTheme.bg} ${momTheme.border} border rounded-xl p-2 text-center`}
            >
              <p className={`text-xs ${momTheme.text}`}>{momName || "Mamá"}</p>
              <p className={`text-lg font-black ${momTheme.text}`}>{momDays}</p>
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            LEYENDA
          </p>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${dadTheme.dot} shrink-0`} />
              <span className="text-xs">Con {dadName || "Papá"}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded ${momTheme.dot} shrink-0`} />
              <span className="text-xs">Con {momName || "Mamá"}</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded overflow-hidden shrink-0 flex flex-col">
                <div className={`flex-1 ${dadTheme.dot}`} />
                <div className={`flex-1 ${momTheme.dot}`} />
              </div>

              <span className="text-xs">Día compartido</span>
            </div>
          </div>
        </div>

        {upcoming.length > 0 && (
          <div className="hidden lg:block">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              PRÓXIMOS DÍAS
            </p>

            <div className="space-y-1.5">
              {upcoming.map((d) => (
                <div key={d.id || d.date} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      d.with_whom === "dad" ? dadTheme.dot : momTheme.dot
                    )}
                  />

                  <div>
                    <p className="text-xs font-semibold leading-tight">
                      {format(
                        parseISO(normalizeDate(d.date) + "T12:00:00"),
                        "EEE, d MMM"
                      )}
                    </p>

                    <p
                      className={cn(
                        "text-xs",
                        d.with_whom === "dad" ? dadTheme.text : momTheme.text
                      )}
                    >
                      {d.is_split
                        ? `AM:${getParentLabel(
                            d.morning,
                            dadName,
                            momName
                          )} PM:${getParentLabel(
                            d.afternoon,
                            dadName,
                            momName
                          )}`
                        : `Con ${getParentLabel(
                            d.with_whom,
                            dadName,
                            momName
                          )}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-3 lg:px-4 py-3 flex items-center gap-2 lg:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          <div className="flex items-center gap-2 ml-1">
            <CalendarDays className="w-4 h-4 text-muted-foreground hidden sm:block" />

            <h2 className="text-base sm:text-xl font-bold font-heading">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
          </div>

          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
            >
              Hoy
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 hidden sm:flex"
              disabled
              title="Google Calendar sync will be enabled in a later step"
              onClick={() => setShowSync(true)}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync Google
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2 lg:p-3">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] sm:text-xs font-bold text-gray-400 py-1 uppercase tracking-wider"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {weeks.map((week, wi) => (
              <div
                key={wi}
                className="grid grid-cols-7 gap-1 min-h-[58px] sm:min-h-[80px]"
              >
                {week.map((day, di) => {
                  const key = format(day, "yyyy-MM-dd");
                  const custody = custodyMap[key];
                  const inMonth = isSameMonth(day, currentMonth);
                  const today = isToday(day);
                  const parent = custody?.is_split ? null : custody?.with_whom;
                  const splitDay = custody?.is_split;

                  return (
                    <button
                      key={di}
                      type="button"
                      disabled={!canWrite}
                      onClick={() => canWrite && setSelectedDate(day)}
                      className={cn(
                        "relative rounded-lg sm:rounded-xl border transition-all text-left overflow-hidden min-h-[54px] sm:min-h-[72px]",
                        canWrite
                          ? "hover:ring-2 hover:ring-primary/40 active:scale-95"
                          : "cursor-not-allowed opacity-80",
                        today && "ring-2 ring-primary ring-offset-1",
                        !custody && "bg-white border-gray-100 hover:bg-gray-50",
                        parent === "dad" && dadTheme.border,
                        parent === "mom" && momTheme.border,
                        splitDay && "border-gray-300",
                        !inMonth && "opacity-40"
                      )}
                    >
                      {!splitDay && parent && (
                        <div
                          className={cn(
                            "absolute inset-0",
                            parent === "dad" ? dadTheme.bg : momTheme.bg
                          )}
                        />
                      )}

                      {splitDay && (
                        <>
                          <div
                            className={`absolute inset-x-0 top-0 bottom-1/2 ${dadTheme.bg}`}
                          />
                          <div
                            className={`absolute inset-x-0 top-1/2 bottom-0 ${momTheme.bg}`}
                          />
                        </>
                      )}

                      <div className="relative z-10 p-1 sm:p-1.5 flex flex-col h-full">
                        <span
                          className={cn(
                            "text-[10px] sm:text-xs font-bold mb-1 w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full leading-none",
                            today ? "bg-primary text-white" : "text-gray-600"
                          )}
                        >
                          {format(day, "d")}
                        </span>

                        {parent && (
                          <div
                            className={cn(
                              "rounded-md sm:rounded-lg px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-xs font-bold flex items-center gap-1",
                              parent === "dad" ? dadTheme.chip : momTheme.chip
                            )}
                          >
                            <span>{parent === "dad" ? "👨" : "👩"}</span>
                            <span className="truncate hidden sm:inline">
                              Con {getParentLabel(parent, dadName, momName)}
                            </span>
                          </div>
                        )}

                        {splitDay && (
                          <div className="space-y-0.5 mt-0.5">
                            <div
                              className={`rounded px-1 py-0.5 text-[8px] sm:text-[10px] font-bold ${dadTheme.chip}`}
                            >
                              AM 👨
                            </div>

                            <div
                              className={`rounded px-1 py-0.5 text-[8px] sm:text-[10px] font-bold ${momTheme.chip}`}
                            >
                              PM 👩
                            </div>
                          </div>
                        )}

                        {custody?.notes && (
                          <p className="text-[8px] sm:text-[9px] text-muted-foreground mt-auto truncate">
                            {custody.notes}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedDate instanceof Date &&
        !Number.isNaN(selectedDate.getTime()) && (
          <CustodyDayDialog
            date={selectedDate}
            existingData={selectedExistingData}
            onSave={saveCustodyDay}
            onDelete={deleteCustodyDay}
            onClose={() => setSelectedDate(null)}
            isSaving={isSaving}
          />
        )}

      {showSync && null}
    </div>
  );
}
