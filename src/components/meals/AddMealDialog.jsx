import React, { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";

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

const FOOD_IMAGES = {
  default:
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
  breakfast:
    "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=400&q=80",
  lunch:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80",
  dinner:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80",
  snack:
    "https://images.unsplash.com/photo-1481671703460-040cb8a2d909?w=400&q=80",
};

export default function AddMealDialog({ date, onClose, onSuccess, prefill }) {
  const [name, setName] = useState(prefill?.name || "");
  const [mealType, setMealType] = useState(prefill?.meal_type || "lunch");
  const [notes, setNotes] = useState(prefill?.notes || "");
  const [imageUrl, setImageUrl] = useState(prefill?.image_url || "");
  const [saving, setSaving] = useState(false);

  const { familyId, user, profile } = useFamily();

  const previewImg = imageUrl || FOOD_IMAGES[mealType] || FOOD_IMAGES.default;

  const handleSave = async () => {
    if (!name.trim()) return;

    if (!familyId) {
      alert("No active familyId found.");
      console.error("Missing familyId in AddMealDialog", {
        familyId,
        user,
        profile,
      });
      return;
    }

    setSaving(true);

    try {
      const payload = {
        date: format(date, "yyyy-MM-dd"),

        meal_type: mealType,
        mealType,

        name: name.trim(),
        notes: notes.trim() || "",
        image_url: imageUrl.trim() || "",
        imageUrl: imageUrl.trim() || "",

        familyId,
        family_id: familyId,
        familyName: profile?.family_name || profile?.familyName || "",

        createdBy: user?.uid || null,
        createdByEmail: user?.email || null,

        created_date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.log("Saving meal payload:", payload);

      const docRef = await addDoc(collection(db, "meals"), payload);

      console.log("Meal saved with ID:", docRef.id);

      onSuccess?.();
    } catch (error) {
      console.error("Error saving meal:", error);
      alert(`There was an error saving the meal: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            Add Meal – {format(date, "EEEE, MMM d")}
          </DialogTitle>
        </DialogHeader>

        <div className="relative h-36 rounded-xl overflow-hidden bg-muted">
          <img
            src={previewImg}
            alt="meal"
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = FOOD_IMAGES.default;
            }}
          />
          <div className="absolute inset-0 bg-black/20" />
        </div>

        <div className="space-y-3 py-1">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Meal Type</Label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="breakfast">☕ Breakfast</SelectItem>
                  <SelectItem value="lunch">🌞 Lunch</SelectItem>
                  <SelectItem value="dinner">🌙 Dinner</SelectItem>
                  <SelectItem value="snack">🍎 Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Meal Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Pasta, Tacos…"
                className="mt-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) handleSave();
                }}
              />
            </div>
          </div>

          <div>
            <Label>Image URL (optional)</Label>
            <Input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Recipe link, instructions…"
              className="mt-1"
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) handleSave();
              }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>

          <Button onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? "Saving…" : "Add Meal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
