import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import CalendarViewControls from "@/components/calendar/CalendarViewControls";

export default function CustodyCalendarToolbar({
  period,
  viewMode,
  setViewMode,
  canWrite,
  goPrevious,
  goNext,
  setAnchorDate,
  setShowBulkDialog,
  setShowSync,
}) {
  return (
    <div className="bg-card border-b border-border px-3 lg:px-4 py-3 flex items-center gap-2 lg:gap-3">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goPrevious}><ChevronLeft className="w-4 h-4" /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goNext}><ChevronRight className="w-4 h-4" /></Button>

      <div className="flex items-center gap-2 ml-1 min-w-0">
        <CalendarDays className="w-4 h-4 text-muted-foreground hidden sm:block" />
        <h2 className="text-base sm:text-xl font-bold font-heading truncate">{period.title}</h2>
      </div>

      <div className="ml-auto flex gap-2 flex-wrap justify-end">
        <Button variant="outline" size="sm" onClick={() => setAnchorDate(new Date())}>Today</Button>
        <CalendarViewControls viewMode={viewMode} setViewMode={setViewMode} />
        {canWrite && (
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowBulkDialog(true)}>
            <CalendarRange className="w-3.5 h-3.5" />
            Range
          </Button>
        )}
        <Button variant="outline" size="sm" className="gap-1.5 hidden sm:flex" disabled title="Google Calendar sync will be enabled in a later step" onClick={() => setShowSync(true)}>
          <RefreshCw className="w-3.5 h-3.5" />
          Sync Google
        </Button>
      </div>
    </div>
  );
}
