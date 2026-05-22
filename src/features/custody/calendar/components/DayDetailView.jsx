import { format } from "date-fns";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getCustodyParent,
  getParentLabel,
} from "@/features/custody/calendar/utils/custodyCalculations";

export default function DayDetailView({ day, custody, canWrite, onEdit, dadTheme, momTheme, dadName, momName }) {
  const parent = getCustodyParent(custody);
  const baseParent = custody?.baseCustody?.is_split
    ? "split"
    : custody?.baseCustody?.with_whom || custody?.baseCustody?.withWhom || null;
  const label = custody?.is_split
    ? `AM: ${getParentLabel(custody.morning, dadName, momName)} / PM: ${getParentLabel(custody.afternoon, dadName, momName)}`
    : parent === "dad"
    ? `Con ${dadName || "Papá"}`
    : parent === "mom"
    ? `Con ${momName || "Mamá"}`
    : "No custody info";

  const theme = parent === "dad" ? dadTheme : parent === "mom" ? momTheme : null;

  return (
    <div className="p-3 md:p-4 max-w-3xl mx-auto w-full">
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Custody Day</p>
            <h2 className="text-2xl font-bold font-heading">{format(day, "EEEE, MMMM d")}</h2>
          </div>

          {canWrite && (
            <Button onClick={() => onEdit(day)} className="gap-1.5">
              <Plus className="w-4 h-4" />
              Edit Day
            </Button>
          )}
        </div>
      </Card>

      <Card className={cn("p-5 border-2", theme ? `${theme.bg} ${theme.border}` : "bg-white border-border")}>
        <div className="flex items-start gap-4">
          <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", theme ? theme.bg : "bg-muted")}>
            <span className="text-3xl">{parent === "dad" ? "👨" : parent === "mom" ? "👩" : parent === "split" ? "👨👩" : "📅"}</span>
          </div>

          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className={cn("text-2xl font-black", theme ? theme.text : "text-foreground")}>{label}</p>
            {custody?.isTravelOverride && (
              <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50/80 p-3 text-sm font-semibold text-blue-800">
                Custody changed by travel plan{custody.travelOverrideDestination ? ` · ${custody.travelOverrideDestination}` : ""}.
                {baseParent && baseParent !== parent && (
                  <span className="block text-xs text-blue-700">
                    Base: {getParentLabel(baseParent, dadName, momName)} · Travel override: {getParentLabel(parent, dadName, momName)}
                  </span>
                )}
              </div>
            )}
            {custody?.notes && <p className="text-sm text-muted-foreground mt-3">{custody.notes}</p>}
            {!custody && <p className="text-sm text-muted-foreground mt-3">Click edit to add custody information for this day.</p>}
          </div>
        </div>
      </Card>
    </div>
  );
}
