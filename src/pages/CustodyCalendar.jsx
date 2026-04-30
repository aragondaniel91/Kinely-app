import React, { useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { User, Heart, Sun, Sunset, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

function ParentPicker({ value, onChange, label, icon: Icon }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" /> {label}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onChange("dad")}
          className={cn(
            "flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all",
            value === "dad"
              ? "border-primary bg-primary/10"
              : "border-border hover:border-primary/30"
          )}
        >
          <User
            className={cn(
              "w-5 h-5",
              value === "dad" ? "text-primary" : "text-muted-foreground"
            )}
          />
          <span
            className={cn(
              "text-xs font-bold",
              value === "dad" ? "text-primary" : "text-muted-foreground"
            )}
          >
            Dad
          </span>
        </button>

        <button
          type="button"
          onClick={() => onChange("mom")}
          className={cn(
            "flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all",
            value === "mom"
              ? "border-pink-400 bg-pink-50"
              : "border-border hover:border-pink-200"
          )}
        >
          <Heart
            className={cn(
              "w-5 h-5",
              value === "mom" ? "text-pink-500" : "text-muted-foreground"
            )}
          />
          <span
            className={cn(
              "text-xs font-bold",
              value === "mom" ? "text-pink-600" : "text-muted-foreground"
            )}
          >
            Mom
          </span>
        </button>
      </div>
    </div>
  );
}

export default function CustodyDayDialog({
  date,
  existingData,
  onSave,
  onDelete,
  onClose,
  isSaving,
}) {
  const safeDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(safeDate.getTime())) {
    console.error("Invalid date received by CustodyDayDialog:", date);
    return null;
  }

  const [isSplit, setIsSplit] = useState(existingData?.is_split || false);
  const [withWhom, setWithWhom] = useState(existingData?.with_whom || "dad");
  const [morning, setMorning] = useState(existingData?.morning || "mom");
  const [afternoon, setAfternoon] = useState(existingData?.afternoon || "dad");
  const [notes, setNotes] = useState(existingData?.notes || "");

  const handleSave = () => {
    onSave({
      date: format(safeDate, "yyyy-MM-dd"),
      is_split: isSplit,
      with_whom: isSplit ? null : withWhom,
      morning: isSplit ? morning : null,
      afternoon: isSplit ? afternoon : null,
      notes,
    });
  };

  const handleDelete = () => {
    if (!existingData || !onDelete) return;

    const dateToDelete = existingData.date || format(safeDate, "yyyy-MM-dd");

    if (!window.confirm("Delete this custody day?")) return;

    onDelete(dateToDelete);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            {format(safeDate, "EEEE, MMMM d")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between bg-muted/50 rounded-xl px-4 py-3">
            <div>
              <p className="font-semibold text-sm">Split Day</p>
              <p className="text-xs text-muted-foreground">
                Morning with one, afternoon with other
              </p>
            </div>

            <Switch checked={isSplit} onCheckedChange={setIsSplit} />
          </div>

          {isSplit ? (
            <div className="space-y-3">
              <ParentPicker
                value={morning}
                onChange={setMorning}
                label="Morning"
                icon={Sun}
              />
              <ParentPicker
                value={afternoon}
                onChange={setAfternoon}
                label="Afternoon / Evening"
                icon={Sunset}
              />
            </div>
          ) : (
            <ParentPicker
              value={withWhom}
              onChange={setWithWhom}
              label="All Day"
              icon={User}
            />
          )}

          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes
            </Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Pick up at 3pm, soccer practice…"
              className="mt-1.5"
            />
          </div>
        </div>

        <DialogFooter>
          {existingData && (
            <Button
              type="button"
              variant="outline"
              onClick={handleDelete}
              disabled={isSaving}
              className="text-red-500"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          )}

          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : existingData ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
