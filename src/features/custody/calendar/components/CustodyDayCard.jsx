import { format, isToday } from "date-fns";
import { Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import { getCustodyEventCategory } from "@/components/calendar/CustodySpecialEventDialog";
import {
  getCustodyParent,
  getParentEmoji,
  getParentLabel,
} from "@/features/custody/calendar/utils/custodyCalculations";

export default function CustodyDayCard({ day, custody, canWrite, onClick, dadTheme, momTheme, dadName, momName, specialEvents = [], travelPlans = [], compact = false, inMonth = true }) {
  const today = isToday(day);
  const parent = getCustodyParent(custody);
  const splitDay = parent === "split";
  const visibleTravelPlans = travelPlans.slice(0, compact ? 1 : 2);
  const hiddenTravelCount = Math.max(0, travelPlans.length - visibleTravelPlans.length);
  const visibleEvents = specialEvents.slice(0, compact ? 2 : 3);
  const hiddenEventCount = Math.max(0, specialEvents.length - visibleEvents.length);

  const getTheme = (value) => {
    if (value === "dad") return dadTheme;
    if (value === "mom") return momTheme;
    return null;
  };

  const singleTheme = getTheme(parent);
  const morningTheme = getTheme(custody?.morning) || dadTheme;
  const afternoonTheme = getTheme(custody?.afternoon) || momTheme;

  return (
    <button
      type="button"
      disabled={!canWrite}
      onClick={onClick}
      className={cn(
        "relative rounded-xl border transition-all text-left overflow-hidden",
        compact ? "min-h-[72px] p-1.5" : "min-h-[112px] p-2",
        canWrite ? "hover:ring-2 hover:ring-primary/40 active:scale-95" : "cursor-not-allowed opacity-80",
        today && "ring-2 ring-primary ring-offset-1",
        !custody && "bg-card border-border hover:bg-muted/40",
        parent === "dad" && dadTheme.border,
        parent === "mom" && momTheme.border,
        splitDay && "border-border",
        custody?.isTravelOverride && "ring-2 ring-blue-200",
        !inMonth && "opacity-40"
      )}
    >
      {!splitDay && singleTheme && <div className={cn("absolute inset-0", singleTheme.bg)} />}

      {splitDay && (
        <>
          <div className={`absolute inset-x-0 top-0 bottom-1/2 ${morningTheme.bg}`} />
          <div className={`absolute inset-x-0 top-1/2 bottom-0 ${afternoonTheme.bg}`} />
        </>
      )}

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between gap-1">
          <span
            className={cn(
              "font-bold flex items-center justify-center rounded-full leading-none",
              compact ? "text-[10px] w-5 h-5" : "text-xs w-7 h-7",
              today ? "bg-primary text-primary-foreground" : "text-foreground bg-background/70"
            )}
          >
            {format(day, "d")}
          </span>

          {!compact && canWrite && (
            <span className="w-6 h-6 rounded-full bg-white/70 flex items-center justify-center text-muted-foreground">
              <Plus className="w-3.5 h-3.5" />
            </span>
          )}
        </div>

        {parent === "dad" && (
          <div className={cn("rounded-lg px-1.5 py-0.5 font-bold flex items-center gap-1 mt-2", compact ? "text-[9px]" : "text-xs", dadTheme.chip)}>
            <span>👨</span>
            <span className="truncate">{compact ? dadName || "Papá" : `Con ${dadName || "Papá"}`}</span>
          </div>
        )}

        {parent === "mom" && (
          <div className={cn("rounded-lg px-1.5 py-0.5 font-bold flex items-center gap-1 mt-2", compact ? "text-[9px]" : "text-xs", momTheme.chip)}>
            <span>👩</span>
            <span className="truncate">{compact ? momName || "Mamá" : `Con ${momName || "Mamá"}`}</span>
          </div>
        )}

        {custody?.isTravelOverride && (
          <div className={cn("mt-1 rounded-lg border border-blue-100 bg-blue-50/90 px-1.5 py-0.5 font-black text-blue-800", compact ? "text-[8px]" : "text-[10px]")}>Travel override</div>
        )}

        {splitDay && (
          <div className="space-y-1 mt-2">
            <div className={cn("rounded px-1 py-0.5 font-bold", compact ? "text-[8px]" : "text-[10px]", morningTheme.chip)}>
              AM {getParentEmoji(custody.morning)} {!compact && getParentLabel(custody.morning, dadName, momName)}
            </div>
            <div className={cn("rounded px-1 py-0.5 font-bold", compact ? "text-[8px]" : "text-[10px]", afternoonTheme.chip)}>
              PM {getParentEmoji(custody.afternoon)} {!compact && getParentLabel(custody.afternoon, dadName, momName)}
            </div>
          </div>
        )}

        {(visibleTravelPlans.length > 0 || visibleEvents.length > 0) && (
          <div className="mt-1.5 space-y-1">
            {visibleTravelPlans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  "flex items-center gap-1 rounded-lg border border-blue-100 bg-blue-50/90 px-1.5 py-0.5 font-bold text-blue-800 shadow-sm",
                  compact ? "text-[8px]" : "text-[10px]"
                )}
              >
                <span>✈️</span>
                <span className="truncate">{plan.destination || plan.title}</span>
              </div>
            ))}

            {hiddenTravelCount > 0 && (
              <div className={cn("rounded-lg border border-blue-100 bg-blue-50/90 px-1.5 py-0.5 font-bold text-blue-700 shadow-sm", compact ? "text-[8px]" : "text-[10px]")}>+{hiddenTravelCount} travel</div>
            )}

            {visibleEvents.map((event) => {
              const category = getCustodyEventCategory(event.category);

              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex items-center gap-1 rounded-lg border border-white/70 bg-white/75 px-1.5 py-0.5 font-bold shadow-sm",
                    compact ? "text-[8px]" : "text-[10px]"
                  )}
                >
                  <span>{category.icon}</span>
                  <span className="truncate">{event.startTime ? `${event.startTime} ` : ""}{event.title}</span>
                </div>
              );
            })}

            {hiddenEventCount > 0 && (
              <div className={cn("rounded-lg border border-white/70 bg-white/75 px-1.5 py-0.5 font-bold text-muted-foreground shadow-sm", compact ? "text-[8px]" : "text-[10px]")}>+{hiddenEventCount} more</div>
            )}
          </div>
        )}

        {custody?.notes && !compact && <p className="text-[10px] text-muted-foreground mt-auto truncate bg-background/70 rounded px-1">{custody.notes}</p>}
        {!custody && !compact && !visibleEvents.length && !visibleTravelPlans.length && <p className="text-[10px] text-muted-foreground mt-auto">No custody info</p>}
      </div>
    </button>
  );
}
