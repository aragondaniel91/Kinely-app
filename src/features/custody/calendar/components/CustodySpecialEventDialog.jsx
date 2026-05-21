import React, { useState } from "react";
import { format } from "date-fns";
import { CalendarHeart, Clock, MapPin } from "lucide-react";

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

const EVENT_CATEGORIES = [
  { id: "sports", label: "Sports", icon: "⚽" },
  { id: "school", label: "School", icon: "🏫" },
  { id: "medical", label: "Medical", icon: "🩺" },
  { id: "graduation", label: "Graduation", icon: "🎓" },
  { id: "family", label: "Family", icon: "👨‍👩‍👧‍👦" },
  { id: "birthday", label: "Birthday", icon: "🎂" },
  { id: "other", label: "Other", icon: "✨" },
];

function normalizeDate(value) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return format(value, "yyyy-MM-dd");
  }
  return String(value).slice(0, 10);
}

export function getCustodyEventCategory(categoryId) {
  return EVENT_CATEGORIES.find((item) => item.id === categoryId) || EVENT_CATEGORIES[EVENT_CATEGORIES.length - 1];
}

export default function CustodySpecialEventDialog({
  defaultDate = new Date(),
  existingEvent = null,
  onClose,
  onSave,
  isSaving = false,
}) {
  const editing = Boolean(existingEvent?.id);

  const [title, setTitle] = useState(existingEvent?.title || "");
  const [category, setCategory] = useState(existingEvent?.category || "sports");
  const [date, setDate] = useState(normalizeDate(existingEvent?.date || defaultDate));
  const [startTime, setStartTime] = useState(existingEvent?.startTime || existingEvent?.start_time || "");
  const [endTime, setEndTime] = useState(existingEvent?.endTime || existingEvent?.end_time || "");
  const [location, setLocation] = useState(existingEvent?.location || "");
  const [notes, setNotes] = useState(existingEvent?.notes || "");

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Add a title for this special event.");
      return;
    }

    if (!date) {
      alert("Select a date for this special event.");
      return;
    }

    await onSave({
      id: existingEvent?.id || null,
      title: title.trim(),
      category,
      date,
      startTime,
      endTime,
      location: location.trim(),
      notes: notes.trim(),
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="max-w-lg rounded-[2rem] p-0 overflow-hidden">
        <DialogHeader className="border-b bg-background px-5 py-4">
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <CalendarHeart className="h-5 w-5 text-primary" />
            {editing ? "Edit special event" : "Add special event"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-2xl border bg-blue-50/70 p-3 text-sm font-semibold text-blue-800">
            Add an important moment for the child, like a game, doctor visit, school event, or graduation.
          </div>

          <div>
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Soccer game, doctor appointment, graduation..."
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_CATEGORIES.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.icon} {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Start time
              </Label>
              <Input
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>End time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Location
            </Label>
            <Input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Field 3, school auditorium, clinic..."
              className="mt-1"
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Bring uniform, insurance card, arrive early..."
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="border-t bg-background px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : editing ? "Save changes" : "Add event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
