import React, { useEffect, useState } from "react";
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
} from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import CustodyDayDialog from "@/components/calendar/CustodyDayDialog";
import GoogleCalendarSync from "@/components/calendar/GoogleCalendarSync";

const DAD_SOLID = "bg-blue-500";
const MOM_SOLID = "bg-amber-400";

export default function CustodyCalendar() {
  const { user, profile } = useAuth();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showSync, setShowSync] = useState(false);
  const [custodyDays, setCustodyDays] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

useEffect(() => {
  const loadCustodyDays = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const q = query(
        collection(db, "custodyDays"),
        where("userId", "==", user.uid)
      );

      const snap = await getDocs(q);

      const data = snap.docs.map((document) => ({
        id: document.id,
        ...document.data(),
      }));

      setCustodyDays(data);
    } catch (error) {
      console.error("Error loading custody days:", error);
    } finally {
      setIsLoading(false);
    }
  };

  loadCustodyDays();
}, [user]);

  const saveCustodyDay = async (payload) => {
    if (!user) return;

    setIsSaving(true);

    try {
      const docId = `${user.uid}_${payload.date}`;

      const data = {
        id: payload.date,
        ...payload,
        userId: user.uid,
        familyId: profile?.familyId || null,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, "custodyDays", docId), data, { merge: true });

      setCustodyDays((prev) => {
        const existing = prev.find((d) => d.date === payload.date);

        if (existing) {
          return prev.map((d) =>
            d.date === payload.date ? { ...d, ...data } : d
          );
        }

        return [...prev, data];
      });

      setSelectedDate(null);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCustodyDay = async (date) => {
    if (!user) return;

    setIsSaving(true);

    try {
      const docId = `${user.uid}_${date}`;

      await deleteDoc(doc(db, "custodyDays", docId));

      setCustodyDays((prev) => prev.filter((d) => d.date !== date));
      setSelectedDate(null);
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

  const visibleCustodyDays = custodyDays.filter(
    (d) =>
      d.date >= format(calStart, "yyyy-MM-dd") &&
      d.date <= format(calEnd, "yyyy-MM-dd")
  );

const custodyMap = {};
visibleCustodyDays.forEach((d) => {
  const key = d.date?.slice(0, 10); 
  custodyMap[key] = d;
});

  const todayKey = format(new Date(), "yyyy-MM-dd");
  const todayCustody = custodyMap[todayKey];
  const todayParent = todayCustody?.is_split ? null : todayCustody?.with_whom;

  const todayLabel = todayCustody?.is_split
    ? `AM: ${todayCustody.morning} / PM: ${todayCustody.afternoon}`
    : todayParent
    ? todayParent === "dad"
      ? "PAPÁ"
      : "MAMÁ"
    : null;

  const sortedDays = [...visibleCustodyDays].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const nextChange = sortedDays.find((d) => {
    if (d.date <= todayKey) return false;

    const prev =
      custodyMap[
        format(addDays(parseISO(d.date + "T12:00:00"), -1), "yyyy-MM-dd")
      ];

    if (!prev) return false;

    const prevParent = prev.is_split ? prev.afternoon : prev.with_whom;
    const thisParent = d.is_split ? d.morning : d.with_whom;

    return prevParent !== thisParent;
  });

  const upcoming = sortedDays.filter((d) => d.date >= todayKey).slice(0, 4);

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-screen bg-gray-50">
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 p-4 flex flex-col gap-4 overflow-y-auto">
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

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
            HOY
          </p>

          <p className="font-bold text-base font-heading">
            {format(new Date(), "EEEE, d 'de' MMMM")}
          </p>

          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d")}
          </p>

          {todayCustody && (
            <div
              className={cn(
                "mt-2 rounded-xl p-3 flex items-center gap-2 border",
                todayParent === "dad"
                  ? "bg-blue-50 border-blue-200"
                  : "bg-amber-50 border-amber-200"
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
                    todayParent === "dad" ? "text-blue-700" : "text-amber-700"
                  )}
                >
                  {todayLabel}
                </p>
              </div>

              <Heart
                className={cn(
                  "w-4 h-4 ml-auto",
                  todayParent === "dad"
                    ? "text-blue-400"
                    : "text-amber-400 fill-amber-400"
                )}
              />
            </div>
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
                    {format(parseISO(nextChange.date + "T12:00:00"), "d")}
                  </span>
                </div>

                <div>
                  <p className="text-xs font-bold leading-tight">
                    {format(
                      parseISO(nextChange.date + "T12:00:00"),
                      "EEE, d MMM"
                    )}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    en{" "}
                    {differenceInCalendarDays(
                      parseISO(nextChange.date + "T12:00:00"),
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
                Con {nextChange.with_whom === "dad" ? "PAPÁ 👨" : "MAMÁ 👩"}
              </p>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            RESUMEN
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-2 text-center">
              <p className="text-xs text-blue-700">Papá</p>
              <p className="text-lg font-black text-blue-800">{dadDays}</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-center">
              <p className="text-xs text-amber-700">Mamá</p>
              <p className="text-lg font-black text-amber-800">{momDays}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
            LEYENDA
          </p>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-300 shrink-0" />
              <span className="text-xs">Con Papá</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-300 shrink-0" />
              <span className="text-xs">Con Mamá</span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded overflow-hidden shrink-0 flex flex-col">
                <div className="flex-1 bg-blue-300" />
                <div className="flex-1 bg-amber-300" />
              </div>

              <span className="text-xs">Día compartido</span>
            </div>
          </div>
        </div>

        {upcoming.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              PRÓXIMOS DÍAS
            </p>

            <div className="space-y-1.5">
              {upcoming.map((d) => (
                <div key={d.id || d.date} className="flex items-center gap-2">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      d.with_whom === "dad" ? DAD_SOLID : MOM_SOLID
                    )}
                  />

                  <div>
                    <p className="text-xs font-semibold leading-tight">
                      {format(parseISO(d.date + "T12:00:00"), "EEE, d MMM")}
                    </p>

                    <p
                      className={cn(
                        "text-xs",
                        d.with_whom === "dad"
                          ? "text-blue-600"
                          : "text-amber-600"
                      )}
                    >
                      {d.is_split
                        ? `AM:${d.morning} PM:${d.afternoon}`
                        : `Con ${d.with_whom === "dad" ? "Papá" : "Mamá"}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-auto pt-2 border-t border-gray-100">
          <p className="text-xs text-muted-foreground text-center">
            💙 Lo más importante es que siempre se sienta amado.
          </p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
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
            <CalendarDays className="w-4 h-4 text-muted-foreground" />

            <h2 className="text-xl font-bold font-heading">
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
              className="gap-1.5"
              onClick={() => setShowSync(true)}
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync Google
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {weekDays.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-bold text-gray-400 py-1 uppercase tracking-wider"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1 min-h-[80px]">
                {week.map((day, di) => {
                  const key = format(day, "yyyy-MM-dd");
                  const custody = custodyMap[key];
                  const inMonth = isSameMonth(day, currentMonth);
                  const today = isToday(day);
                  const parent = custody?.is_split ? null : custody?.with_whom;
                  const isSplit = custody?.is_split;

                  return (
                    <button
                      key={di}
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        "relative rounded-xl border transition-all text-left overflow-hidden min-h-[72px]",
                        "hover:ring-2 hover:ring-primary/40 active:scale-95",
                        today && "ring-2 ring-primary ring-offset-1",
                        !custody && "bg-white border-gray-100 hover:bg-gray-50",
                        parent === "dad" && "border-blue-300",
                        parent === "mom" && "border-amber-300",
                        isSplit && "border-gray-300",
                        !inMonth && "opacity-40"
                      )}
                    >
                      {!isSplit && parent && (
                        <div
                          className={cn(
                            "absolute inset-0",
                            parent === "dad" ? "bg-blue-100" : "bg-amber-100"
                          )}
                        />
                      )}

                      {isSplit && (
                        <>
                          <div className="absolute inset-x-0 top-0 bottom-1/2 bg-blue-100" />
                          <div className="absolute inset-x-0 top-1/2 bottom-0 bg-amber-100" />
                        </>
                      )}

                      <div className="relative z-10 p-1.5 flex flex-col h-full">
                        <span
                          className={cn(
                            "text-xs font-bold mb-1 w-6 h-6 flex items-center justify-center rounded-full leading-none",
                            today ? "bg-primary text-white" : "text-gray-600"
                          )}
                        >
                          {format(day, "d")}
                        </span>

                        {parent && (
                          <div
                            className={cn(
                              "rounded-lg px-1.5 py-0.5 text-xs font-bold flex items-center gap-1",
                              parent === "dad"
                                ? "bg-blue-300/60 text-blue-900"
                                : "bg-amber-300/60 text-amber-900"
                            )}
                          >
                            <span>{parent === "dad" ? "👨" : "👩"}</span>
                            <span className="truncate">
                              {parent === "dad" ? "Con Papá" : "Con Mamá"}
                            </span>
                          </div>
                        )}

                        {isSplit && (
                          <div className="space-y-0.5 mt-0.5">
                            <div className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-blue-300/60 text-blue-900">
                              AM 👨 Papá
                            </div>

                            <div className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-300/60 text-amber-900">
                              PM 👩 Mamá
                            </div>
                          </div>
                        )}

                        {custody?.notes && (
                          <p className="text-[9px] text-muted-foreground mt-auto truncate">
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

        <div className="bg-white border-t border-gray-100 py-2 text-center">
          <p className="text-xs text-muted-foreground">
            💡 Los horarios pueden cambiar. Revisa el calendario regularmente.
            💙
          </p>
        </div>
      </div>

      {selectedDate && (
        <CustodyDayDialog
          date={selectedDate}
          existingData={custodyMap[format(selectedDate, "yyyy-MM-dd")]}
          onSave={saveCustodyDay}
          onDelete={deleteCustodyDay}
          onClose={() => setSelectedDate(null)}
          isSaving={isSaving}
        />
      )}

      {showSync && (
        <GoogleCalendarSync
          custodyDays={custodyDays}
          currentMonth={currentMonth}
          onClose={() => setShowSync(false)}
          onImported={(updatedDays) => {
            const data = updatedDays || custodyDays;
            setCustodyDays(data);
            setShowSync(false);
          }}
        />
      )}
    </div>
  );
}
