import React from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarClock, Info } from "lucide-react";

export default function GoogleCalendarSync({ currentMonth, onClose }) {
  const monthStr = currentMonth
    ? format(currentMonth, "MMMM yyyy")
    : format(new Date(), "MMMM yyyy");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <CalendarClock className="w-5 h-5" />
            Google Calendar Sync
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl border bg-muted/40 p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-muted-foreground mt-0.5" />

              <div>
                <p className="font-semibold text-sm">Sync is not enabled yet</p>

                <p className="text-sm text-muted-foreground mt-1">
                  Google Calendar integration will be added in a later step. The
                  app is currently using Firestore as the source of truth for
                  custody days.
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Current view: <span className="font-semibold">{monthStr}</span>
          </p>

          <Button onClick={onClose} className="w-full">
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
