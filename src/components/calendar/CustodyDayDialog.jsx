import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarDays, Trash2 } from "lucide-react";

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

  if (value?.toDate) {
    return format(value.toDate(), "yyyy-MM-dd");
  }

  return String(value).slice(0, 10);
}

export default function CustodyDayDialog({
  date,
  existingData = null,
  onSave,
  onDelete,
  onClose,
  isSaving = false,
  dadLabel = "Dad",
  momLabel = "Mom",
}) {
  const [isSplit, setIsSplit] = useState(
    existingData?.is_split || existingData?.isSplit || false
  );

  const [withWhom, setWithWhom] = useState(
    existingData?.with_whom || existingData?.withWhom || "dad"
  );

  const [morning, setMorning] = useState(existingData?.morning || "dad");
  const [afternoon, setAfternoon] = useState(existingData?.afternoon || "mom");
  const [notes, setNotes] = useState(existingData?.notes || "");

  const dateKey = normalizeDate(date);

  const handleSave = async () => {
    const payload = {
      date: dateKey,
      is_split: isSplit,
      with_whom: isSplit ? null : withWhom,
      morning: isSplit ? morning : null,
      afternoon: isSplit ? afternoon : null,
      notes: notes.trim(),
    };

    await onSave(payload);
  };

  const handleDelete = async () => {
    if (!existingData) {
      onClose?.();
      return;
    }

    const confirmDelete = window.confirm(
      "Delete custody information for this day?"
    );

    if (!confirmDelete) return;

    await onDelete(dateKey);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose?.();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Custody Day
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-xl bg-muted/50 border p-3">
            <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
              Date
            </p>
            <p className="font-bold text-base">
              {date instanceof Date
                ? format(date, "EEEE, MMMM d, yyyy")
                : dateKey}
            </p>
          </div>

          <div>
            <Label>Day Type</Label>
            <Select
              value={isSplit ? "split" : "single"}
              onValueChange={(value) => setIsSplit(value === "split")}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="single">Full day with one parent</SelectItem>
                <SelectItem value="split">Split day / AM and PM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!isSplit && (
            <div>
              <Label>With</Label>
              <Select value={withWhom} onValueChange={setWithWhom}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="dad">👨 {dadLabel}</SelectItem>
                  <SelectItem value="mom">👩 {momLabel}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {isSplit && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Morning</Label>
                <Select value={morning} onValueChange={setMorning}>
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
                <Label>Afternoon</Label>
                <Select value={afternoon} onValueChange={setAfternoon}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="dad">👨 {dadLabel}</SelectItem>
                    <SelectItem value="mom">👩 {momLabel}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Pickup note, school note, special detail..."
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {existingData && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isSaving}
              className="mr-auto gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          )}

          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
