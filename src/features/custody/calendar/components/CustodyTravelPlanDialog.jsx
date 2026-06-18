import React, { useState } from "react";
import { format } from "date-fns";
import { MapPin, Plane, UserRound } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import AppDialog from "@/components/app/AppDialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function normalizeDate(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return format(value, "yyyy-MM-dd");
  }
  return String(value).slice(0, 10);
}

export default function CustodyTravelPlanDialog({
  defaultDate = new Date(),
  existingTravel = null,
  onClose,
  onSave,
  isSaving = false,
  dadLabel = "Dad",
  momLabel = "Mom",
}) {
  const editing = Boolean(existingTravel?.id);

  const [noticeDialog, setNoticeDialog] = useState(null);

  const showValidationNotice = (message, title = "Review travel plan") => {
    setNoticeDialog({
      tone: "warning",
      title,
      message,
    });
  };

  const [title, setTitle] = useState(existingTravel?.title || "Vacation / travel");
  const [destination, setDestination] = useState(existingTravel?.destination || "");
  const [startDate, setStartDate] = useState(normalizeDate(existingTravel?.startDate || existingTravel?.start_date || defaultDate));
  const [endDate, setEndDate] = useState(normalizeDate(existingTravel?.endDate || existingTravel?.end_date || defaultDate));
  const [travelingParent, setTravelingParent] = useState(existingTravel?.travelingParent || existingTravel?.traveling_parent || "dad");
  const [notes, setNotes] = useState(existingTravel?.notes || "");

  const handleSave = async () => {
    if (!title.trim()) {
      showValidationNotice("Add a title for this travel plan.", "Title required");
      return;
    }

    if (!startDate || !endDate) {
      showValidationNotice("Select a start and end date.", "Dates required");
      return;
    }

    if (endDate < startDate) {
      showValidationNotice("The end date cannot be before the start date.", "Invalid date range");
      return;
    }

    await onSave({
      id: existingTravel?.id || null,
      title: title.trim(),
      destination: destination.trim(),
      startDate,
      endDate,
      travelingParent,
      notes: notes.trim(),
    });
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-w-lg rounded-[2rem] p-0 overflow-hidden">
        <DialogHeader className="border-b bg-background px-5 py-4">
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <Plane className="h-5 w-5 text-primary" />
            {editing ? "Edit travel plan" : "Add travel plan"}
          </DialogTitle>
          <DialogDescription>
            Add or edit travel days so the custody calendar reflects vacation or trip plans.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-2xl border bg-blue-50/70 p-3 text-sm font-semibold text-blue-800">
            Mark days when the child is traveling or on vacation, so the custody calendar shows it clearly.
          </div>

          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Spring break trip, Disney vacation, Austin weekend..."
              className="mt-1"
            />
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Destination
            </Label>
            <Input
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder="Orlando, Austin, New York..."
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>End date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5" />
              Traveling with
            </Label>
            <Select value={travelingParent} onValueChange={setTravelingParent}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dad">👨 {dadLabel}</SelectItem>
                <SelectItem value="mom">👩 {momLabel}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Flight info pending, hotel name, return details..."
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="border-t bg-background px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : editing ? "Save changes" : "Add travel"}
          </Button>
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
