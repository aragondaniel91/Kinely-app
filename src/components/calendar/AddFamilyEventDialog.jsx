import React, { useState } from "react";
import { format } from "date-fns";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  CalendarDays,
  Clock,
  MapPin,
  FileText,
  Tag,
  UserRound,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";

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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const categories = [
  { value: "school", label: "School", emoji: "🎒" },
  { value: "sports", label: "Sports", emoji: "⚾" },
  { value: "doctor", label: "Doctor", emoji: "🩺" },
  { value: "pickup", label: "Pickup", emoji: "🚗" },
  { value: "birthday", label: "Birthday", emoji: "🎂" },
  { value: "family", label: "Family", emoji: "👨‍👩‍👧‍👦" },
  { value: "note", label: "Note", emoji: "📝" },
  { value: "other", label: "Other", emoji: "📌" },
];

export default function AddFamilyEventDialog({
  date,
  onClose,
  onSuccess,
  editEvent = null,
}) {
  const { user, familyId, profile, children } = useFamily();

  const [title, setTitle] = useState(editEvent?.title || "");
  const [description, setDescription] = useState(
    editEvent?.description || editEvent?.notes || ""
  );
  const [eventDate, setEventDate] = useState(
    editEvent?.date || format(date || new Date(), "yyyy-MM-dd")
  );
  const [startTime, setStartTime] = useState(editEvent?.startTime || "");
  const [endTime, setEndTime] = useState(editEvent?.endTime || "");
  const [category, setCategory] = useState(editEvent?.category || "family");
  const [childName, setChildName] = useState(editEvent?.childName || "all");
  const [location, setLocation] = useState(editEvent?.location || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;

    if (!familyId) {
      alert("No active family found.");
      return;
    }

    setSaving(true);

    try {
      await addDoc(collection(db, "familyEvents"), {
        title: title.trim(),
        description: description.trim(),
        notes: description.trim(),

        date: eventDate,
        startTime,
        endTime,

        category,
        childName: childName === "all" ? "" : childName,
        location: location.trim(),

        familyId,
        family_id: familyId,
        familyName: profile?.family_name || profile?.familyName || "",

        createdBy: user?.uid || null,
        createdByEmail: user?.email || null,

        created_date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      onSuccess?.();
    } catch (error) {
      console.error("Error creating family event:", error);
      alert(`There was an error creating the event: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Add Family Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>Title</Label>
            <div className="relative mt-1">
              <FileText className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Baseball practice, school activity..."
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && title.trim()) handleSave();
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.emoji} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Time</Label>
              <div className="relative mt-1">
                <Clock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <Label>End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Child</Label>
            <Select value={childName} onValueChange={setChildName}>
              <SelectTrigger className="mt-1">
                <UserRound className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All / General</SelectItem>
                {(children || []).map((child) => (
                  <SelectItem key={child} value={child}>
                    {child}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Location</Label>
            <div className="relative mt-1">
              <MapPin className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="School, clinic, baseball field..."
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <Label>Description / Notes</Label>
            <div className="relative mt-1">
              <Tag className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Pick up at 3:00 PM, bring uniform..."
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && title.trim()) handleSave();
                }}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button onClick={handleSave} disabled={!title.trim() || saving}>
            {saving ? "Saving..." : "Add Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
