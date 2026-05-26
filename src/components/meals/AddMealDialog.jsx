import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { format } from "date-fns";
import {
  Apple,
  CalendarDays,
  Coffee,
  Image,
  ListChecks,
  Moon,
  Sparkles,
  Sun,
  UtensilsCrossed,
  X,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

const mealTypeConfig = {
  breakfast: {
    label: "Breakfast",
    helper: "Morning fuel",
    emoji: "☕",
    icon: Coffee,
    tone: "bg-amber-50 text-amber-700 ring-amber-100",
    panel: "from-amber-50 via-orange-50 to-white",
  },
  lunch: {
    label: "Lunch",
    helper: "Midday plan",
    emoji: "🌞",
    icon: Sun,
    tone: "bg-orange-50 text-orange-700 ring-orange-100",
    panel: "from-orange-50 via-yellow-50 to-white",
  },
  dinner: {
    label: "Dinner",
    helper: "Family table",
    emoji: "🌙",
    icon: Moon,
    tone: "bg-violet-50 text-violet-700 ring-violet-100",
    panel: "from-violet-50 via-indigo-50 to-white",
  },
  snack: {
    label: "Snack",
    helper: "Quick bite",
    emoji: "🍎",
    icon: Apple,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    panel: "from-emerald-50 via-green-50 to-white",
  },
};

const FOOD_IMAGES = {
  default:
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=700&q=80",
  breakfast:
    "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=700&q=80",
  lunch:
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=700&q=80",
  dinner:
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=700&q=80",
  snack:
    "https://images.unsplash.com/photo-1481671703460-040cb8a2d909?w=700&q=80",
};

function getCreatorName(profile = null, user = null) {
  return (
    profile?.displayName ||
    profile?.fullName ||
    profile?.name ||
    user?.displayName ||
    "Unknown member"
  );
}

function MealTypeButton({ type, selected, onSelect }) {
  const config = mealTypeConfig[type] || mealTypeConfig.lunch;
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      className={cn(
        "rounded-[1.5rem] border p-3 text-left transition",
        selected
          ? "border-blue-200 bg-blue-50 shadow-[0_14px_32px_rgba(37,99,235,0.10)]"
          : "border-slate-100 bg-white hover:border-blue-100 hover:bg-blue-50/50"
      )}
    >
      <div
        className={cn(
          "mb-2 flex h-10 w-10 items-center justify-center rounded-2xl ring-1",
          selected ? "bg-blue-600 text-white ring-blue-200" : config.tone
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      <p className="text-sm font-black text-slate-950">
        {config.label}
      </p>

      <p className="mt-0.5 text-xs font-bold text-slate-400">
        {config.helper}
      </p>
    </button>
  );
}

export default function AddMealDialog({ date, onClose, onSuccess, prefill }) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [name, setName] = useState(prefill?.name || "");
  const [mealType, setMealType] = useState(prefill?.meal_type || "lunch");
  const [notes, setNotes] = useState(prefill?.notes || "");
  const [imageUrl, setImageUrl] = useState(prefill?.image_url || "");
  const [createGroceryList, setCreateGroceryList] = useState(false);
  const [saving, setSaving] = useState(false);

  const { familyId, user, profile } = useFamily();

  const config = mealTypeConfig[mealType] || mealTypeConfig.lunch;
  const Icon = config.icon;
  const previewImg = imageUrl || FOOD_IMAGES[mealType] || FOOD_IMAGES.default;

  const handleSave = async () => {
    if (!name.trim() || saving) return;

    if (!familyId) {
      toast({
        title: "No active family",
        description: "Please select or create a family before adding meals.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    setSaving(true);

    try {
      const mealRef = await addDoc(collection(db, "meals"), {
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
        createdByName: getCreatorName(profile, user),
        created_by_name: getCreatorName(profile, user),

        created_date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      let listRef = null;

      if (createGroceryList) {
        listRef = await addDoc(collection(db, "familyLists"), {
          title: `${name.trim()} ingredients`,
          type: "meal",
          description: notes.trim() || `Shopping list for ${name.trim()}`,
          status: "active",

          familyId,
          family_id: familyId,

          linkedMealId: mealRef.id,
          linked_meal_id: mealRef.id,
          linkedMealTitle: name.trim(),
          linked_meal_title: name.trim(),

          source: "meal",
          source_type: "meal",

          assignedToPersonId: "family",
          assigned_to_person_id: "family",
          assignedToPersonName: "Family",
          assigned_to_person_name: "Family",

          createdBy: user?.uid || null,
          createdByEmail: user?.email || null,
          createdByName: getCreatorName(profile, user),
          created_by_name: getCreatorName(profile, user),

          created_date: new Date().toISOString(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      toast({
        title: createGroceryList ? "Meal and grocery list created" : "Meal added",
        description: createGroceryList
          ? `${name.trim()} is ready, and a grocery list was created.`
          : `${name.trim()} was added to the meal plan.`,
        duration: 3500,
      });

      await onSuccess?.();

      if (listRef?.id) {
        navigate(`/lists?listId=${listRef.id}`);
      }
    } catch (error) {
      console.error("Error saving meal:", error);

      toast({
        title: "Could not save meal",
        description: error?.message || "Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-hidden rounded-[2.25rem] border-white/80 bg-white p-0 shadow-2xl">
        <div className="relative h-44 overflow-hidden">
          <img
            src={previewImg}
            alt="Meal preview"
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.src = FOOD_IMAGES.default;
            }}
          />

          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/55 via-slate-950/10 to-white/20" />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/88 text-slate-500 shadow-sm ring-1 ring-white/70 backdrop-blur-md transition hover:text-slate-950"
            aria-label="Close add meal"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="absolute bottom-4 left-4 right-4">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-white/80">
              <Sparkles className="h-4 w-4" />
              Add meal
            </p>

            <h2 className="mt-1 text-3xl font-black tracking-tight text-white">
              {format(date, "EEEE, MMM d")}
            </h2>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/88 px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm ring-1 ring-white/70 backdrop-blur-md">
              <Icon className="h-4 w-4" />
              {config.label}
            </div>
          </div>
        </div>

        <div className="max-h-[calc(92vh-11rem)] overflow-y-auto p-5">
          <section>
            <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Meal type
            </p>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Object.keys(mealTypeConfig).map((type) => (
                <MealTypeButton
                  key={type}
                  type={type}
                  selected={mealType === type}
                  onSelect={setMealType}
                />
              ))}
            </div>
          </section>

          <section className="mt-5 rounded-[1.75rem] border border-slate-100 bg-slate-50/70 p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              Meal details
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-black text-slate-700">
                  Meal name
                </label>

                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Taco night, pasta, pancakes..."
                  className="mt-1 h-12 rounded-2xl bg-white text-base font-bold"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && name.trim()) handleSave();
                  }}
                />
              </div>

              <div>
                <label className="text-sm font-black text-slate-700">
                  Notes
                </label>

                <Input
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Recipe link, prep note, who likes it..."
                  className="mt-1 h-12 rounded-2xl bg-white"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && name.trim()) handleSave();
                  }}
                />
              </div>

              <div>
                <label className="text-sm font-black text-slate-700">
                  Image URL
                </label>

                <div className="mt-1 flex gap-2">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-100">
                    <Image className="h-5 w-5" />
                  </div>

                  <Input
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    placeholder="Optional image link"
                    className="h-12 rounded-2xl bg-white text-sm"
                  />
                </div>
              </div>
            </div>
          </section>

          <section
            className={cn(
              "mt-4 rounded-[1.75rem] border p-4 transition",
              createGroceryList
                ? "border-emerald-200 bg-emerald-50"
                : "border-slate-100 bg-white"
            )}
          >
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={createGroceryList}
                onChange={(event) => setCreateGroceryList(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />

              <div>
                <p className="flex items-center gap-2 text-sm font-black text-slate-950">
                  <ListChecks className="h-4 w-4 text-emerald-600" />
                  Create grocery list after saving
                </p>

                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  We’ll create a linked Family List so you can add ingredients
                  right after saving this meal.
                </p>
              </div>
            </label>
          </section>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-white p-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl font-black"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || saving || !familyId}
            className="rounded-2xl bg-slate-950 font-black text-white hover:bg-slate-800"
          >
            <UtensilsCrossed className="mr-2 h-4 w-4" />
            {saving
              ? "Saving..."
              : createGroceryList
                ? "Save meal + list"
                : "Save meal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
