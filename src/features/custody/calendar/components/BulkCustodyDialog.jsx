import React, { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  eachDayOfInterval,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";
import { CalendarRange, Repeat2, Split, Sparkles } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { cn } from "@/lib/utils";
import AppDialog from "@/components/app/AppDialog";

const WEEK_DAYS = [
  { value: 0, label: "D" },
  { value: 1, label: "L" },
  { value: 2, label: "M" },
  { value: 3, label: "X" },
  { value: 4, label: "J" },
  { value: 5, label: "V" },
  { value: 6, label: "S" },
];

const SMART_PATTERNS = [
  {
    id: "223",
    label: "2-2-3",
    helper: "Creates the full alternating 2-2-3 rotation automatically.",
  },
  {
    id: "week-on-off",
    label: "Week on/off",
    helper: "Alternates full weeks between both parents.",
  },
  {
    id: "5-2",
    label: "5-2",
    helper: "Five days with one parent, two days with the other.",
  },
  {
    id: "custom",
    label: "Custom range",
    helper: "Manual range with optional split days and repeat rules.",
  },
];

function otherParent(parent) {
  return parent === "dad" ? "mom" : "dad";
}

function parentLabel(parent, dadLabel, momLabel) {
  return parent === "dad" ? dadLabel : momLabel;
}

function parentEmoji(parent) {
  return parent === "dad" ? "👨" : "👩";
}

function advanceDateByUnit(date, every, unit) {
  if (unit === "day") return addDays(date, every);
  if (unit === "week") return addWeeks(date, every);
  if (unit === "month") return addMonths(date, every);
  if (unit === "year") return addYears(date, every);

  return addWeeks(date, every);
}

function generatePreviewBlocks({
  startDate,
  endDate,
  repeatEnabled,
  repeatEvery,
  repeatUnit,
  repeatWeekdays,
  endMode,
  untilDate,
  occurrences,
}) {
  if (!startDate || !endDate || endDate < startDate) return [];

  const baseStart = parseISO(`${startDate}T12:00:00`);
  const baseEnd = parseISO(`${endDate}T12:00:00`);

  if (Number.isNaN(baseStart.getTime()) || Number.isNaN(baseEnd.getTime())) return [];

  const rangeLength = differenceInCalendarDays(baseEnd, baseStart);
  const safeEvery = Math.max(1, Number(repeatEvery) || 1);

  if (!repeatEnabled) {
    return [{ start: baseStart, end: baseEnd, days: rangeLength + 1 }];
  }

  const maxByOccurrences = endMode === "after" ? Math.max(1, Number(occurrences) || 1) : 9999;
  const hardLimitDate =
    endMode === "onDate" && untilDate
      ? parseISO(`${untilDate}T12:00:00`)
      : endMode === "never"
      ? addMonths(baseStart, 12)
      : null;

  if (hardLimitDate && baseStart > hardLimitDate) return [];

  const starts = [baseStart];

  if (repeatUnit === "week" && repeatWeekdays?.length) {
    const cycleStartBase = startOfWeek(baseStart, { weekStartsOn: 0 });
    const selectedWeekdays = [...new Set(repeatWeekdays)].sort((a, b) => a - b);
    let cycleIndex = safeEvery;

    while (starts.length < maxByOccurrences && cycleIndex < 500) {
      const cycleBase = addWeeks(cycleStartBase, cycleIndex);

      for (const weekday of selectedWeekdays) {
        const candidate = addDays(cycleBase, weekday);
        if (candidate <= baseStart) continue;
        if (hardLimitDate && candidate > hardLimitDate) {
          return starts.map((start) => ({ start, end: addDays(start, rangeLength), days: rangeLength + 1 }));
        }

        starts.push(candidate);
        if (starts.length >= maxByOccurrences) {
          return starts.map((start) => ({ start, end: addDays(start, rangeLength), days: rangeLength + 1 }));
        }
      }

      cycleIndex += safeEvery;
    }

    return starts.map((start) => ({ start, end: addDays(start, rangeLength), days: rangeLength + 1 }));
  }

  let current = advanceDateByUnit(baseStart, safeEvery, repeatUnit);

  while (starts.length < maxByOccurrences && starts.length < 500) {
    if (hardLimitDate && current > hardLimitDate) break;
    starts.push(current);
    current = advanceDateByUnit(current, safeEvery, repeatUnit);
  }

  return starts.map((start) => ({ start, end: addDays(start, rangeLength), days: rangeLength + 1 }));
}

function generateSmartDayMap({ patternId, startDate, endDate, startingParent }) {
  if (!patternId || patternId === "custom" || !startDate || !endDate || endDate < startDate) {
    return {};
  }

  const start = parseISO(`${startDate}T12:00:00`);
  const end = parseISO(`${endDate}T12:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return {};

  const days = eachDayOfInterval({ start, end });
  const map = {};
  const secondParent = otherParent(startingParent);

  days.forEach((day, index) => {
    let parent = startingParent;

    if (patternId === "223") {
      const slot = index % 14;
      parent = [0, 1, 4, 5, 6, 9, 10].includes(slot) ? startingParent : secondParent;
    } else if (patternId === "week-on-off") {
      const weekIndex = Math.floor(index / 7);
      parent = weekIndex % 2 === 0 ? startingParent : secondParent;
    } else if (patternId === "5-2") {
      const slot = index % 7;
      parent = slot < 5 ? startingParent : secondParent;
    }

    map[format(day, "yyyy-MM-dd")] = {
      parent,
      isSplit: false,
    };
  });

  return map;
}

function summarizeSmartSegments(days, dayMap, dadLabel, momLabel) {
  if (!days.length) return [];

  const segments = [];
  let current = null;

  days.forEach((day) => {
    const key = format(day, "yyyy-MM-dd");
    const parent = dayMap[key]?.parent;
    if (!parent) return;

    if (!current || current.parent !== parent) {
      current = {
        parent,
        start: day,
        end: day,
        days: 1,
      };
      segments.push(current);
      return;
    }

    current.end = day;
    current.days += 1;
  });

  return segments.map((segment, index) => ({
    ...segment,
    id: `${segment.parent}-${index}-${format(segment.start, "yyyy-MM-dd")}`,
    label: `${parentEmoji(segment.parent)} ${parentLabel(segment.parent, dadLabel, momLabel)}`,
  }));
}

function ParentPicker({ value, onChange, dadLabel = "Dad", momLabel = "Mom" }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={() => onChange("dad")}
        className={cn(
          "rounded-2xl border px-4 py-3 text-left font-semibold transition-all",
          value === "dad" ? "border-blue-400 bg-blue-50 text-blue-700" : "border-border bg-background text-foreground"
        )}
      >
        👨 {dadLabel}
      </button>

      <button
        type="button"
        onClick={() => onChange("mom")}
        className={cn(
          "rounded-2xl border px-4 py-3 text-left font-semibold transition-all",
          value === "mom" ? "border-amber-400 bg-amber-50 text-amber-700" : "border-border bg-background text-foreground"
        )}
      >
        👩 {momLabel}
      </button>
    </div>
  );
}

export default function BulkCustodyDialog({
  defaultDate = new Date(),
  onClose,
  onSave,
  isSaving = false,
  dadLabel = "Dad",
  momLabel = "Mom",
}) {
  const defaultKey = format(defaultDate, "yyyy-MM-dd");
  const threeMonthsLater = format(addMonths(defaultDate, 3), "yyyy-MM-dd");

  const [startDate, setStartDate] = useState(defaultKey);
  const [endDate, setEndDate] = useState(format(addWeeks(defaultDate, 8), "yyyy-MM-dd"));
  const [selectedTemplate, setSelectedTemplate] = useState("223");
  const [startingParent, setStartingParent] = useState("dad");

  const [fullDaysParent, setFullDaysParent] = useState("dad");
  const [splitFirstDay, setSplitFirstDay] = useState(false);
  const [firstDayMorning, setFirstDayMorning] = useState("dad");
  const [splitLastDay, setSplitLastDay] = useState(false);
  const [lastDayAfternoon, setLastDayAfternoon] = useState("mom");

  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [repeatEvery, setRepeatEvery] = useState(2);
  const [repeatUnit, setRepeatUnit] = useState("week");
  const [repeatWeekdays, setRepeatWeekdays] = useState([defaultDate.getDay()]);
  const [endMode, setEndMode] = useState("never");
  const [untilDate, setUntilDate] = useState(threeMonthsLater);
  const [occurrences, setOccurrences] = useState(13);
  const [notes, setNotes] = useState("");
  const [noticeDialog, setNoticeDialog] = useState(null);

  const isSmartPattern = selectedTemplate !== "custom";

  const applyTemplate = (templateId) => {
    setSelectedTemplate(templateId);

    const baseDate = parseISO(`${startDate || defaultKey}T12:00:00`);
    const safeBaseDate = Number.isNaN(baseDate.getTime()) ? defaultDate : baseDate;

    if (templateId === "223") {
      setEndDate(format(addWeeks(safeBaseDate, 8), "yyyy-MM-dd"));
      setNotes("Smart 2-2-3 custody rotation.");
      return;
    }

    if (templateId === "week-on-off") {
      setEndDate(format(addWeeks(safeBaseDate, 12), "yyyy-MM-dd"));
      setNotes("Smart week on / week off custody rotation.");
      return;
    }

    if (templateId === "5-2") {
      setEndDate(format(addWeeks(safeBaseDate, 8), "yyyy-MM-dd"));
      setNotes("Smart 5-2 custody rotation.");
      return;
    }

    setEndDate(defaultKey);
    setNotes("");
  };

  const smartDayMap = useMemo(() => {
    return generateSmartDayMap({
      patternId: selectedTemplate,
      startDate,
      endDate,
      startingParent,
    });
  }, [selectedTemplate, startDate, endDate, startingParent]);

  const smartDays = useMemo(() => {
    return Object.keys(smartDayMap)
      .sort()
      .map((key) => parseISO(`${key}T12:00:00`));
  }, [smartDayMap]);

  const smartSegments = useMemo(() => {
    return summarizeSmartSegments(smartDays, smartDayMap, dadLabel, momLabel);
  }, [smartDays, smartDayMap, dadLabel, momLabel]);

  const totalRangeDays = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return 0;
    const start = parseISO(`${startDate}T12:00:00`);
    const end = parseISO(`${endDate}T12:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    return differenceInCalendarDays(end, start) + 1;
  }, [startDate, endDate]);

  const previewBlocks = useMemo(() => {
    if (isSmartPattern) {
      return totalRangeDays > 0 ? [{ start: parseISO(`${startDate}T12:00:00`), end: parseISO(`${endDate}T12:00:00`), days: totalRangeDays }] : [];
    }

    return generatePreviewBlocks({
      startDate,
      endDate,
      repeatEnabled,
      repeatEvery,
      repeatUnit,
      repeatWeekdays,
      endMode,
      untilDate,
      occurrences,
    });
  }, [isSmartPattern, totalRangeDays, startDate, endDate, repeatEnabled, repeatEvery, repeatUnit, repeatWeekdays, endMode, untilDate, occurrences]);

  const estimatedPreviewDays = isSmartPattern
    ? smartDays.length
    : previewBlocks.reduce((total, block) => total + block.days, 0);

  const previewLimited = previewBlocks.slice(0, 8);
  const hasMorePreview = previewBlocks.length > previewLimited.length;
  const smartPreviewLimited = smartSegments.slice(0, 10);
  const hasMoreSmartSegments = smartSegments.length > smartPreviewLimited.length;

  const showValidationNotice = (message, title = "Review schedule setup") => {
    setNoticeDialog({
      tone: "warning",
      title,
      message,
    });
  };

  const toggleWeekday = (day) => {
    setRepeatWeekdays((prev) => {
      if (prev.includes(day)) {
        const next = prev.filter((d) => d !== day);
        return next.length ? next : [day];
      }

      return [...prev, day].sort((a, b) => a - b);
    });
  };

  const handleSave = async () => {
    if (!startDate || !endDate) return;

    if (endDate < startDate) {
      showValidationNotice("La fecha final no puede ser menor que la fecha inicial.", "Invalid date range");
      return;
    }

    if (isSmartPattern && !Object.keys(smartDayMap).length) {
      showValidationNotice("No se generó ningún día para este patrón. Revisa las fechas o el patrón seleccionado.", "No days generated");
      return;
    }

    if (!isSmartPattern) {
      if (repeatEnabled && Number(repeatEvery) < 1) {
        showValidationNotice("Repeat every debe ser al menos 1.");
        return;
      }

      if (repeatEnabled && repeatUnit === "week" && repeatWeekdays.length === 0) {
        showValidationNotice("Selecciona al menos un día de la semana.");
        return;
      }

      if (repeatEnabled && endMode === "onDate" && !untilDate) {
        showValidationNotice("Selecciona una fecha de finalización.");
        return;
      }

      if (repeatEnabled && endMode === "after" && Number(occurrences) < 1) {
        showValidationNotice("Occurrences debe ser al menos 1.");
        return;
      }
    }

    await onSave({
      startDate,
      endDate,
      fullDaysParent,
      splitFirstDay: isSmartPattern ? false : splitFirstDay,
      firstDayMorning,
      splitLastDay: isSmartPattern ? false : splitLastDay,
      lastDayAfternoon,
      repeatEnabled: isSmartPattern ? false : repeatEnabled,
      repeatEvery: Number(repeatEvery) || 1,
      repeatUnit,
      repeatWeekdays,
      endMode,
      untilDate,
      occurrences: Number(occurrences) || 1,
      notes: notes.trim(),
      templateId: selectedTemplate,
      smartPatternId: isSmartPattern ? selectedTemplate : null,
      generatedDayMap: isSmartPattern ? smartDayMap : null,
    });
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose?.()}>
        <DialogContent className="max-w-4xl max-h-[92vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-3 border-b bg-background">
          <DialogTitle className="font-heading text-2xl flex items-center gap-2">
            <CalendarRange className="w-6 h-6 text-primary" />
            Asignación masiva
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
            <div className="space-y-5">
              <div className="rounded-2xl border bg-card p-4 space-y-3">
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Smart schedule builder
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Choose a custody pattern and Kinly will generate the real day-by-day schedule.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {SMART_PATTERNS.map((template) => {
                    const active = selectedTemplate === template.id;

                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => applyTemplate(template.id)}
                        className={cn(
                          "rounded-2xl border px-3 py-2.5 text-left transition-all",
                          active
                            ? "border-blue-300 bg-blue-50 text-blue-800 shadow-sm"
                            : "border-border bg-background text-foreground hover:border-blue-200 hover:bg-blue-50/50"
                        )}
                      >
                        <p className="text-sm font-black">{template.label}</p>
                        <p className="mt-0.5 text-xs font-semibold text-muted-foreground">{template.helper}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Desde</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
                  </div>

                  <div>
                    <Label>Hasta</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
                  </div>
                </div>

                {isSmartPattern ? (
                  <div>
                    <Label>¿Quién empieza?</Label>
                    <div className="mt-2">
                      <ParentPicker value={startingParent} onChange={setStartingParent} dadLabel={dadLabel} momLabel={momLabel} />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-muted-foreground">
                      El patrón alterna automáticamente entre {dadLabel} y {momLabel}.
                    </p>
                  </div>
                ) : (
                  <div>
                    <Label>Con quién (días completos)</Label>
                    <div className="mt-2">
                      <ParentPicker value={fullDaysParent} onChange={setFullDaysParent} dadLabel={dadLabel} momLabel={momLabel} />
                    </div>
                  </div>
                )}
              </div>

              {!isSmartPattern && (
                <>
                  <div className="rounded-2xl border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold flex items-center gap-2"><Split className="w-4 h-4" />Primer día compartido</p>
                        <p className="text-sm text-muted-foreground">Divide el primer día del rango entre ambos padres.</p>
                      </div>
                      <Switch checked={splitFirstDay} onCheckedChange={setSplitFirstDay} />
                    </div>

                    {splitFirstDay && (
                      <div>
                        <Label>¿Quién tiene la mañana del primer día?</Label>
                        <div className="mt-2">
                          <ParentPicker value={firstDayMorning} onChange={setFirstDayMorning} dadLabel={dadLabel} momLabel={momLabel} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">→ La tarde la tiene: <strong>{firstDayMorning === "dad" ? momLabel : dadLabel}</strong></p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border bg-card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold flex items-center gap-2"><Split className="w-4 h-4" />Último día compartido</p>
                        <p className="text-sm text-muted-foreground">Divide el último día del rango entre ambos padres.</p>
                      </div>
                      <Switch checked={splitLastDay} onCheckedChange={setSplitLastDay} />
                    </div>

                    {splitLastDay && (
                      <div>
                        <Label>¿Quién tiene la tarde del último día?</Label>
                        <div className="mt-2">
                          <ParentPicker value={lastDayAfternoon} onChange={setLastDayAfternoon} dadLabel={dadLabel} momLabel={momLabel} />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">→ La mañana la tiene: <strong>{lastDayAfternoon === "dad" ? momLabel : dadLabel}</strong></p>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border bg-card p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold flex items-center gap-2"><Repeat2 className="w-4 h-4" />Repetición</p>
                        <p className="text-sm text-muted-foreground">Repite este mismo patrón automáticamente.</p>
                      </div>
                      <Switch checked={repeatEnabled} onCheckedChange={setRepeatEnabled} />
                    </div>

                    {repeatEnabled && (
                      <>
                        <div className="grid grid-cols-[120px_1fr] gap-3">
                          <div>
                            <Label>Repetir cada</Label>
                            <Input type="number" min="1" value={repeatEvery} onChange={(e) => setRepeatEvery(e.target.value)} className="mt-1" />
                          </div>

                          <div>
                            <Label>Unidad</Label>
                            <Select value={repeatUnit} onValueChange={setRepeatUnit}>
                              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="day">día(s)</SelectItem>
                                <SelectItem value="week">semana(s)</SelectItem>
                                <SelectItem value="month">mes(es)</SelectItem>
                                <SelectItem value="year">año(s)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {repeatUnit === "week" && (
                          <div>
                            <Label>Repetir el</Label>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {WEEK_DAYS.map((day) => {
                                const active = repeatWeekdays.includes(day.value);
                                return (
                                  <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleWeekday(day.value)}
                                    className={cn("w-10 h-10 rounded-full border text-sm font-bold transition-all", active ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground")}
                                  >
                                    {day.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div>
                          <Label>Finaliza</Label>
                          <div className="space-y-3 mt-2">
                            <div className="grid gap-2 sm:grid-cols-3">
                              <Button
                                type="button"
                                variant={endMode === "never" ? "default" : "outline"}
                                onClick={() => setEndMode("never")}
                                className="rounded-2xl"
                              >
                                Nunca
                              </Button>
                              <Button
                                type="button"
                                variant={endMode === "onDate" ? "default" : "outline"}
                                onClick={() => setEndMode("onDate")}
                                className="rounded-2xl"
                              >
                                El día
                              </Button>
                              <Button
                                type="button"
                                variant={endMode === "after" ? "default" : "outline"}
                                onClick={() => setEndMode("after")}
                                className="rounded-2xl"
                              >
                                Después de
                              </Button>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                              <div className={cn("rounded-2xl border p-3", endMode === "onDate" ? "border-primary bg-primary/5" : "border-border bg-muted/30")}>
                                <Label className="text-xs font-black uppercase tracking-wide text-muted-foreground">Finalizar el día</Label>
                                <Input
                                  type="date"
                                  value={untilDate}
                                  onChange={(e) => setUntilDate(e.target.value)}
                                  disabled={endMode !== "onDate"}
                                  className="mt-2"
                                />
                              </div>

                              <div className={cn("rounded-2xl border p-3", endMode === "after" ? "border-primary bg-primary/5" : "border-border bg-muted/30")}>
                                <Label className="text-xs font-black uppercase tracking-wide text-muted-foreground">Después de ocurrencias</Label>
                                <div className="mt-2 flex items-center gap-2">
                                  <Input
                                    type="number"
                                    min="1"
                                    value={occurrences}
                                    onChange={(e) => setOccurrences(e.target.value)}
                                    disabled={endMode !== "after"}
                                    className="w-24"
                                  />
                                  <span className="text-sm font-semibold text-muted-foreground">ocurrencias</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              <div className="rounded-2xl border bg-card p-4">
                <Label>Notas</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Nota opcional para este rango..." className="mt-1" />
              </div>
            </div>

            <div className="rounded-2xl border bg-muted/20 p-4">
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Vista previa</p>

              <div className="grid grid-cols-2 gap-2 mt-4">
                <div className="rounded-xl bg-background border p-3">
                  <p className="text-xs text-muted-foreground">Bloques</p>
                  <p className="text-2xl font-black">{isSmartPattern ? smartSegments.length : previewBlocks.length}</p>
                </div>
                <div className="rounded-xl bg-background border p-3">
                  <p className="text-xs text-muted-foreground">Días aprox.</p>
                  <p className="text-2xl font-black">{estimatedPreviewDays}</p>
                </div>
              </div>

              <div className="space-y-3 mt-4 text-sm">
                <div className="rounded-xl bg-background border p-3">
                  <p className="text-muted-foreground">Rango</p>
                  <p className="font-semibold">{startDate} → {endDate}</p>
                  <p className="text-muted-foreground mt-1">{totalRangeDays} día(s)</p>
                </div>

                {isSmartPattern ? (
                  <>
                    <div className="rounded-xl bg-background border p-3">
                      <p className="text-muted-foreground">Patrón inteligente</p>
                      <p className="font-semibold">{SMART_PATTERNS.find((item) => item.id === selectedTemplate)?.label}</p>
                      <p className="text-muted-foreground mt-1">Empieza: {parentEmoji(startingParent)} {parentLabel(startingParent, dadLabel, momLabel)}</p>
                    </div>

                    <div className="rounded-xl bg-background border p-3">
                      <p className="text-muted-foreground font-semibold mb-2">Bloques generados</p>
                      {smartPreviewLimited.length === 0 && <p className="text-sm text-destructive">No hay días válidos para este patrón.</p>}
                      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                        {smartPreviewLimited.map((segment) => (
                          <div key={segment.id} className="rounded-lg border bg-muted/30 p-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-bold text-xs">{format(segment.start, "MMM d")} – {format(segment.end, "MMM d")}</p>
                              <span className="text-[10px] rounded-full bg-background border px-2 py-0.5 text-muted-foreground font-semibold">{segment.days} day(s)</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-1">{segment.label}</p>
                          </div>
                        ))}
                        {hasMoreSmartSegments && <p className="text-xs text-muted-foreground text-center pt-1">+{smartSegments.length - smartPreviewLimited.length} more block(s)</p>}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl bg-background border p-3">
                      <p className="text-muted-foreground">Días completos</p>
                      <p className="font-semibold">{fullDaysParent === "dad" ? `👨 ${dadLabel}` : `👩 ${momLabel}`}</p>
                    </div>

                    <div className="rounded-xl bg-background border p-3">
                      <p className="text-muted-foreground">Repetición</p>
                      <p className="font-semibold">{repeatEnabled ? `Cada ${repeatEvery} ${repeatUnit === "day" ? "día(s)" : repeatUnit === "week" ? "semana(s)" : repeatUnit === "month" ? "mes(es)" : "año(s)"}` : "No repetir"}</p>
                    </div>

                    <div className="rounded-xl bg-background border p-3">
                      <p className="text-muted-foreground font-semibold mb-2">Bloques que se crearán</p>
                      {previewBlocks.length === 0 && <p className="text-sm text-destructive">No hay bloques válidos para crear.</p>}
                      {previewLimited.length > 0 && (
                        <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                          {previewLimited.map((block, index) => (
                            <div key={`${block.start.toISOString()}-${index}`} className="rounded-lg border bg-muted/30 p-2">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-xs">#{index + 1} {format(block.start, "MMM d")} – {format(block.end, "MMM d")}</p>
                                <span className="text-[10px] rounded-full bg-background border px-2 py-0.5 text-muted-foreground font-semibold">{block.days} day(s)</span>
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-1">Full days: {fullDaysParent === "dad" ? `👨 ${dadLabel}` : `👩 ${momLabel}`}</p>
                            </div>
                          ))}
                          {hasMorePreview && <p className="text-xs text-muted-foreground text-center pt-1">+{previewBlocks.length - previewLimited.length} more block(s)</p>}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {estimatedPreviewDays > 90 && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-800 text-sm">
                    ⚠️ This will create a large number of custody days. Review carefully before saving.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t bg-background">
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || previewBlocks.length === 0}>{isSaving ? "Guardando..." : "Guardar todos los días"}</Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>

      <AppDialog
        open={Boolean(noticeDialog)}
        tone={noticeDialog?.tone}
        title={noticeDialog?.title}
        message={noticeDialog?.message}
        confirmLabel="Got it"
        onConfirm={() => setNoticeDialog(null)}
        onCancel={() => setNoticeDialog(null)}
      />
    </>
  );
}
