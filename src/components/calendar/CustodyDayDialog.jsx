import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarDays, Trash2, X } from "lucide-react";
import { collection, deleteDoc, getDocs, query, where } from "firebase/firestore";

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

import { db } from "@/lib/firebase";

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

function getBulkRunId(data = {}) {
  return data.bulkRunId || data.bulk_run_id || "";
}

function getFamilyId(data = {}) {
  return data.familyId || data.family_id || "";
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
  const [showDeleteChoice, setShowDeleteChoice] = useState(false);
  const [deletingSeries, setDeletingSeries] = useState(false);

  const dateKey = normalizeDate(date);
  const bulkRunId = getBulkRunId(existingData || {});
  const familyId = getFamilyId(existingData || {});
  const isBulkDay = Boolean(bulkRunId && familyId);

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

  const deleteOnlyThisDay = async () => {
    if (!existingData) {
      onClose?.();
      return;
    }

    const confirmDelete = window.confirm("Delete custody information for this day?");
    if (!confirmDelete) return;

    await onDelete(dateKey);
  };

  const deleteEntireBulkSchedule = async () => {
    if (!bulkRunId || !familyId) return;

    const confirmDelete = window.confirm(
      "Delete the entire bulk custody schedule connected to this day? This will remove all days created by the same bulk/template action."
    );

    if (!confirmDelete) return;

    setDeletingSeries(true);

    try {
      const collectionRef = collection(db, "custodyDays");
      const docsByCamel = await getDocs(
        query(collectionRef, where("familyId", "==", familyId), where("bulkRunId", "==", bulkRunId))
      );
      const docsBySnake = await getDocs(
        query(collectionRef, where("family_id", "==", familyId), where("bulk_run_id", "==", bulkRunId))
      );

      const refs = new Map();
      docsByCamel.docs.forEach((docSnap) => refs.set(docSnap.id, docSnap.ref));
      docsBySnake.docs.forEach((docSnap) => refs.set(docSnap.id, docSnap.ref));

      if (!refs.size) {
        alert("No matching bulk schedule days were found.");
        return;
      }

      await Promise.all(Array.from(refs.values()).map((ref) => deleteDoc(ref)));

      setShowDeleteChoice(false);
      onClose?.();
      window.location.reload();
    } catch (error) {
      console.error("Error deleting bulk custody schedule:", error);
      alert(`Could not delete the bulk custody schedule: ${error.message}`);
    } finally {
      setDeletingSeries(false);
    }
  };

  const handleDelete = async () => {
    if (!existingData) {
      onClose?.();
      return;
    }

    if (isBulkDay) {
      setShowDeleteChoice(true);
      return;
    }

    await deleteOnlyThisDay();
  };

  return (
    <>
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

            {isBulkDay && (
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3 text-xs font-semibold text-blue-800">
                This day is part of a bulk custody schedule/template.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            {existingData && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isSaving || deletingSeries}
                className="mr-auto gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </Button>
            )}

            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>

            <Button type="button" onClick={handleSave} disabled={isSaving || deletingSeries}>
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteChoice} onOpenChange={setShowDeleteChoice}>
        <DialogContent className="max-w-md rounded-[2rem] p-0 overflow-hidden">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="font-heading flex items-center gap-3 text-xl">
              <button
                type="button"
                onClick={() => setShowDeleteChoice(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
              Delete custody schedule
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 py-6 text-center">
            <p className="mx-auto max-w-sm text-base font-black text-slate-800">
              This day is part of a bulk custody schedule. What would you like to delete?
            </p>

            <div className="mt-6 space-y-3">
              <Button
                type="button"
                className="h-12 w-full rounded-full font-black"
                variant="destructive"
                disabled={deletingSeries}
                onClick={deleteEntireBulkSchedule}
              >
                {deletingSeries ? "Deleting..." : "Delete entire schedule"}
              </Button>

              <Button
                type="button"
                className="h-12 w-full rounded-full font-black"
                disabled={deletingSeries || isSaving}
                onClick={deleteOnlyThisDay}
              >
                Delete only this day
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full rounded-full font-bold text-slate-500"
                disabled={deletingSeries}
                onClick={() => setShowDeleteChoice(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
