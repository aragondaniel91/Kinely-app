import { format, parseISO, differenceInCalendarDays } from "date-fns";
import { CalendarDays, Heart } from "lucide-react";

import { cn } from "@/lib/utils";
import { normalizeDate } from "@/features/custody/calendar/utils/custodyDateUtils";
import { getParentLabel } from "@/features/custody/calendar/utils/custodyCalculations";

export default function CustodyCalendarSidebar({
  showFilters,
  custodyFilterOptions,
  custodyFilter,
  setCustodyFilter,
  filteredVisibleCustodyDays,
  visibleCustodyDays,
  loading,
  todayCustody,
  todayParent,
  todayLabel,
  dadTheme,
  momTheme,
  dadName,
  momName,
  nextChange,
  dadDays,
  momDays,
  upcoming,
}) {
  return (
<aside className="w-full lg:w-56 shrink-0 bg-card border-b lg:border-b-0 lg:border-r border-border p-3 lg:p-4 flex flex-col gap-3 lg:gap-4 overflow-visible lg:overflow-y-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <CalendarDays className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold font-heading text-sm leading-tight">Family Plan</p>
            <p className="text-xs text-muted-foreground">Custody Calendar</p>
          </div>
        </div>

        {showFilters && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">FILTERS</p>
            <div className="flex flex-wrap lg:flex-col gap-1.5">
              {custodyFilterOptions.map((option) => {
                const active = custodyFilter === option.id;
                return (
                  <button key={option.id} type="button" onClick={() => setCustodyFilter(option.id)} className={cn("rounded-full lg:rounded-xl border px-3 py-1.5 text-xs font-bold text-left transition", active ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:text-foreground")}>
                    <span className="mr-1">{option.icon}</span>
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Showing {filteredVisibleCustodyDays.length} of {visibleCustodyDays.length} custody day(s)</p>
          </div>
        )}

        {loading && <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded-xl p-2">Loading calendar...</div>}

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">TODAY</p>
          <p className="font-bold text-base font-heading">{format(new Date(), "EEEE, MMMM d")}</p>

          {todayCustody && (
            <div className={cn("mt-2 rounded-xl p-3 flex items-center gap-2 border", todayParent === "dad" ? `${dadTheme.bg} ${dadTheme.border}` : `${momTheme.bg} ${momTheme.border}`)}>
              <span className="text-2xl">{todayParent === "dad" ? "👨" : todayParent === "mom" ? "👩" : "👨👩"}</span>
              <div>
                <p className="text-xs text-muted-foreground">With</p>
                <p className={cn("font-black text-sm", todayParent === "dad" ? dadTheme.text : momTheme.text)}>{todayLabel}</p>
                {todayCustody.isTravelOverride && <p className="text-[11px] font-bold text-blue-700">Travel override</p>}
              </div>
              <Heart className={cn("w-4 h-4 ml-auto", todayParent === "dad" ? dadTheme.text : `${momTheme.text} fill-current`)} />
            </div>
          )}

          {!todayCustody && <p className="text-xs text-muted-foreground mt-2">No custody information for today.</p>}
        </div>

        {nextChange && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">NEXT CHANGE</p>
            <div className="bg-muted/40 border border-border rounded-xl p-2.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-primary">{format(parseISO(normalizeDate(nextChange.date) + "T12:00:00"), "d")}</span>
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">{format(parseISO(normalizeDate(nextChange.date) + "T12:00:00"), "EEE, d MMM")}</p>
                  <p className="text-xs text-muted-foreground">in {differenceInCalendarDays(parseISO(normalizeDate(nextChange.date) + "T12:00:00"), new Date())} days</p>
                </div>
              </div>
              <p className={cn("text-xs font-bold mt-1.5", nextChange.with_whom === "dad" ? dadTheme.text : momTheme.text)}>
                With {nextChange.with_whom === "dad" ? `${dadName || "Dad"} 👨` : `${momName || "Mom"} 👩`}
              </p>
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">PERIOD SUMMARY</p>
          <div className="grid grid-cols-2 gap-2">
            <div className={`${dadTheme.bg} ${dadTheme.border} border rounded-xl p-2 text-center`}>
              <p className={`text-xs ${dadTheme.text}`}>{dadName || "Dad"}</p>
              <p className={`text-lg font-black ${dadTheme.text}`}>{dadDays}</p>
            </div>
            <div className={`${momTheme.bg} ${momTheme.border} border rounded-xl p-2 text-center`}>
              <p className={`text-xs ${momTheme.text}`}>{momName || "Mom"}</p>
              <p className={`text-lg font-black ${momTheme.text}`}>{momDays}</p>
            </div>
          </div>
          {visibleCustodyDays.some((day) => day.isTravelOverride) && (
            <p className="mt-2 text-[11px] font-semibold text-blue-700">Includes travel custody overrides.</p>
          )}
        </div>

        <div className="hidden lg:block">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">LEGEND</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded ${dadTheme.dot} shrink-0`} /><span className="text-xs">With {dadName || "Dad"}</span></div>
            <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded ${momTheme.dot} shrink-0`} /><span className="text-xs">With {momName || "Mom"}</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 rounded overflow-hidden shrink-0 flex flex-col"><div className={`flex-1 ${dadTheme.dot}`} /><div className={`flex-1 ${momTheme.dot}`} /></div><span className="text-xs">Split day</span></div>
            <div className="flex items-center gap-2"><div className="flex h-4 w-4 items-center justify-center rounded bg-blue-50 text-[10px]">✈️</div><span className="text-xs">Travel override</span></div>
          </div>
        </div>

        {upcoming.length > 0 && (
          <div className="hidden lg:block">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">UPCOMING DAYS</p>
            <div className="space-y-1.5">
              {upcoming.map((d) => (
                <div key={d.id || d.date} className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full shrink-0", d.with_whom === "dad" ? dadTheme.dot : momTheme.dot)} />
                  <div>
                    <p className="text-xs font-semibold leading-tight">{format(parseISO(normalizeDate(d.date) + "T12:00:00"), "EEE, d MMM")}</p>
                    <p className={cn("text-xs", d.with_whom === "dad" ? dadTheme.text : momTheme.text)}>
                      {d.is_split ? `AM:${getParentLabel(d.morning, dadName, momName)} PM:${getParentLabel(d.afternoon, dadName, momName)}` : `With ${getParentLabel(d.with_whom, dadName, momName)}`}
                    </p>
                    {d.isTravelOverride && <p className="text-[10px] font-bold text-blue-700">✈️ Travel override</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>
  );
}
