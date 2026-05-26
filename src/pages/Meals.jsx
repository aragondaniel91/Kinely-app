import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  addDays,
  format,
  isSameDay,
  isToday as dateFnsIsToday,
  startOfWeek,
} from "date-fns";

import {
  AlertTriangle,
  Apple,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Cookie,
  ListChecks,
  Moon,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import AddMealDialog from "@/components/meals/AddMealDialog";

const mealTypeConfig = {
  breakfast: {
    label: "Breakfast",
    shortLabel: "Morning",
    icon: Coffee,
    emoji: "☕",
    tone: "bg-amber-50 text-amber-700 ring-amber-100",
    panel: "from-amber-50 via-orange-50 to-white",
  },
  lunch: {
    label: "Lunch",
    shortLabel: "Midday",
    icon: Sun,
    emoji: "🌞",
    tone: "bg-orange-50 text-orange-700 ring-orange-100",
    panel: "from-orange-50 via-yellow-50 to-white",
  },
  snack: {
    label: "Snack",
    shortLabel: "Anytime",
    icon: Apple,
    emoji: "🍎",
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    panel: "from-emerald-50 via-green-50 to-white",
  },
  dinner: {
    label: "Dinner",
    shortLabel: "Evening",
    icon: Moon,
    emoji: "🌙",
    tone: "bg-violet-50 text-violet-700 ring-violet-100",
    panel: "from-violet-50 via-indigo-50 to-white",
  },
};

const mealOrder = ["breakfast", "lunch", "snack", "dinner"];

function normalizeMeal(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    ...data,
    meal_type: data.meal_type || data.mealType || "lunch",
    image_url: data.image_url || data.imageUrl || "",
    notes: data.notes || "",
    name: data.name || "",
    date: data.date || "",
  };
}

function normalizeMealTemplate(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    ...data,
    name: data.name || "",
    mealType: data.mealType || data.meal_type || "dinner",
    meal_type: data.meal_type || data.mealType || "dinner",
    notes: data.notes || "",
    ingredients: Array.isArray(data.ingredients) ? data.ingredients : [],
    status: data.status || "active",
    favorite: data.favorite === true,
    kidFriendly: data.kidFriendly === true || data.kid_friendly === true,
    quickMeal: data.quickMeal === true || data.quick_meal === true,
  };
}

function getMealConfig(type = "lunch") {
  return mealTypeConfig[type] || mealTypeConfig.lunch;
}

function normalizeIngredientKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, "")
    .replace(/\s+/g, " ");
}


function MealSummaryPill({ type, count }) {
  const config = getMealConfig(type);
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ring-1",
        count > 0 ? config.tone : "bg-slate-50 text-slate-300 ring-slate-100"
      )}
    >
      <Icon className="h-3 w-3" />
      {count}
    </span>
  );
}

function WeekDayCard({ day, meals, selected, onSelect }) {
  const isToday = dateFnsIsToday(day);

  const counts = mealOrder.reduce((acc, type) => {
    acc[type] = meals.filter((meal) => meal.meal_type === type).length;
    return acc;
  }, {});

  return (
    <button
      type="button"
      onClick={() => onSelect(day)}
      className={cn(
        "min-w-[8.5rem] rounded-[1.5rem] border p-3 text-left transition sm:min-w-0",
        selected
          ? "border-accent/20 bg-accent/8 shadow-[0_14px_32px_rgba(37,99,235,0.10)]"
          : "border-white/80 bg-white/72 shadow-[0_10px_24px_rgba(15,23,42,0.05)] hover:border-blue-100 hover:bg-accent/8/45"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p
            className={cn(
              "text-xs font-black uppercase tracking-[0.18em]",
              selected || isToday ? "text-accent" : "text-slate-400"
            )}
          >
            {isToday ? "Today" : format(day, "EEE")}
          </p>

          <p className="mt-1 text-xl font-black tracking-tight text-slate-950">
            {format(day, "d")}
          </p>
        </div>

        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-2xl ring-1",
            selected
              ? "bg-blue-600 text-white ring-blue-200"
              : "bg-white text-slate-400 ring-slate-100"
          )}
        >
          <CalendarDays className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {mealOrder.map((type) => (
          <MealSummaryPill key={type} type={type} count={counts[type]} />
        ))}
      </div>
    </button>
  );
}

function FocusMealCard({ meal, mealList, canWrite, onCreateList, onDelete }) {
  const config = getMealConfig(meal.meal_type);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-white/80 bg-gradient-to-br p-4 shadow-[0_14px_34px_rgba(15,23,42,0.06)]",
        config.panel
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl ring-1",
            config.tone
          )}
        >
          <Icon className="h-6 w-6" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1",
                config.tone
              )}
            >
              {config.emoji} {config.label}
            </span>

            {mealList && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/8 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-accent ring-1 ring-accent/15">
                <ListChecks className="h-3 w-3" />
                List ready
              </span>
            )}
          </div>

          <h3 className="mt-2 text-xl font-black leading-tight tracking-tight text-slate-950">
            {meal.name || "Untitled meal"}
          </h3>

          {meal.notes && (
            <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
              {meal.notes}
            </p>
          )}
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => onDelete?.(meal)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-slate-400 ring-1 ring-slate-100 transition hover:bg-red-50 hover:text-red-600"
            aria-label="Delete meal"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onCreateList?.(meal)}
          className={cn(
            "rounded-2xl font-black",
            mealList
              ? "border-blue-100 bg-accent/8 text-accent hover:bg-blue-100"
              : "border-emerald-100 bg-white text-emerald-700 hover:bg-emerald-50"
          )}
        >
          <ListChecks className="mr-2 h-4 w-4" />
          {mealList ? "View grocery list" : "Create grocery list"}
        </Button>
      </div>
    </div>
  );
}

function EmptyMealMoment({ type, selectedDay, canWrite, onAdd }) {
  const config = getMealConfig(type);
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={() => canWrite && onAdd?.(selectedDay)}
      disabled={!canWrite}
      className="flex w-full items-center gap-3 rounded-[1.5rem] border border-dashed border-slate-200 bg-white/55 p-4 text-left transition hover:border-blue-200 hover:bg-accent/8/45 disabled:cursor-default disabled:hover:border-slate-200 disabled:hover:bg-white/55"
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1",
          config.tone
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      <div>
        <p className="font-black text-slate-700">{config.label}</p>
        <p className="text-xs font-bold text-slate-400">
          {canWrite ? "Tap to add a meal" : "No meal planned"}
        </p>
      </div>
    </button>
  );
}

function FocusDayPanel({
  selectedDay,
  meals,
  listsByMealId,
  canWrite,
  onAdd,
  onDelete,
  onCreateMealList,
}) {
  const isToday = dateFnsIsToday(selectedDay);

  return (
    <section className="rounded-[2.25rem] border border-white/80 bg-white/78 p-4 shadow-[0_20px_58px_rgba(15,23,42,0.08)] backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-accent">
            {isToday ? "Today’s meals" : "Selected day"}
          </p>

          <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
            {format(selectedDay, "EEEE, MMM d")}
          </h2>

          <p className="mt-1 text-sm font-bold text-slate-500">
            {meals.length} meal{meals.length === 1 ? "" : "s"} planned
          </p>
        </div>

        {canWrite && (
          <Button
            type="button"
            onClick={() => onAdd(selectedDay)}
            className="rounded-2xl bg-accent font-black text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add meal
          </Button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {mealOrder.map((type) => {
          const mealsForType = meals.filter((meal) => meal.meal_type === type);

          if (!mealsForType.length) {
            return (
              <EmptyMealMoment
                key={type}
                type={type}
                selectedDay={selectedDay}
                canWrite={canWrite}
                onAdd={onAdd}
              />
            );
          }

          return mealsForType.map((meal) => (
            <FocusMealCard
              key={meal.id}
              meal={meal}
              mealList={listsByMealId[meal.id]}
              canWrite={canWrite}
              onCreateList={onCreateMealList}
              onDelete={onDelete}
            />
          ));
        })}
      </div>
    </section>
  );
}

function BentoSidePanel({
  selectedDay,
  selectedMeals,
  weekMeals,
  listsByMealId,
  canWrite,
  onAdd,
  onOpenList,
}) {
  const missingMeals = mealOrder.filter(
    (type) => !selectedMeals.some((meal) => meal.meal_type === type)
  );

  const linkedMealLists = weekMeals
    .map((meal) => ({
      meal,
      list: listsByMealId[meal.id],
    }))
    .filter((item) => item.list);

  return (
    <aside className="space-y-4">
      <section className="rounded-[2rem] border border-white/80 bg-white/74 p-4 shadow-[0_16px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-600">
          <ListChecks className="h-4 w-4" />
          Grocery lists
        </p>

        <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">
          Meal shopping
        </h3>

        <div className="mt-3 space-y-2">
          {linkedMealLists.length > 0 ? (
            linkedMealLists.slice(0, 4).map(({ meal, list }) => (
              <button
                key={list.id}
                type="button"
                onClick={() => onOpenList(list)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-3 py-3 text-left ring-1 ring-emerald-100 transition hover:bg-emerald-100"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-emerald-900">
                    {meal.name || list.title}
                  </p>
                  <p className="text-xs font-bold text-emerald-700">
                    View grocery list
                  </p>
                </div>

                <ListChecks className="h-4 w-4 shrink-0 text-emerald-700" />
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/55 p-4 text-sm font-bold text-slate-400">
              No meal grocery lists yet.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/80 bg-white/74 p-4 shadow-[0_16px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-orange-500">
          <UtensilsCrossed className="h-4 w-4" />
          Missing meals
        </p>

        <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">
          Fill the gaps
        </h3>

        <div className="mt-3 flex flex-wrap gap-2">
          {missingMeals.length > 0 ? (
            missingMeals.map((type) => {
              const config = getMealConfig(type);
              const Icon = config.icon;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => canWrite && onAdd(selectedDay)}
                  disabled={!canWrite}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-black ring-1 transition",
                    config.tone,
                    canWrite && "hover:scale-[1.02]"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {config.label}
                </button>
              );
            })
          ) : (
            <span className="rounded-full bg-accent/8 px-3 py-2 text-xs font-black text-accent ring-1 ring-accent/15">
              Full day planned
            </span>
          )}
        </div>
      </section>

      {canWrite && (
        <section className="rounded-[2rem] border border-blue-100 bg-accent/8 p-4 text-blue-950 shadow-[0_18px_44px_rgba(37,99,235,0.10)]">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
            Quick action
          </p>

          <h3 className="mt-2 text-xl font-black tracking-tight">
            Add something for {format(selectedDay, "EEE")}
          </h3>

          <Button
            type="button"
            onClick={() => onAdd(selectedDay)}
            className="mt-4 w-full rounded-2xl bg-accent font-black text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add meal
          </Button>
        </section>
      )}
    </aside>
  );
}

function PantryIngredientHelper({
  ingredientsText,
  setIngredientsText,
  pantryItems,
  addMissingToPantry,
  setAddMissingToPantry,
}) {
  const selectedIngredients = useMemo(() => {
    return String(ingredientsText || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [ingredientsText]);

  const selectedKeys = useMemo(() => {
    return new Set(selectedIngredients.map(normalizeIngredientKey));
  }, [selectedIngredients]);

  const pantryOptions = useMemo(() => {
    return pantryItems
      .filter((item) => item.status !== "archived")
      .filter((item) => item.title || item.name)
      .filter((item) => !selectedKeys.has(normalizeIngredientKey(item.title || item.name)))
      .slice(0, 18);
  }, [pantryItems, selectedKeys]);

  const pantryKeys = useMemo(() => {
    return new Set(
      pantryItems
        .filter((item) => item.status !== "archived")
        .map((item) => normalizeIngredientKey(item.title || item.name))
        .filter(Boolean)
    );
  }, [pantryItems]);

  const missingIngredients = selectedIngredients.filter(
    (ingredient) => !pantryKeys.has(normalizeIngredientKey(ingredient))
  );

  const addIngredient = (ingredient) => {
    const clean = String(ingredient || "").trim();
    if (!clean) return;

    const current = String(ingredientsText || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    if (current.some((item) => normalizeIngredientKey(item) === normalizeIngredientKey(clean))) {
      return;
    }

    setIngredientsText([...current, clean].join("\n"));
  };

  return (
    <div className="mt-3 space-y-3 rounded-[1.5rem] border border-white/80 bg-white/70 p-3 ring-1 ring-slate-100">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
          Pick from Pantry
        </p>

        {pantryOptions.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pantryOptions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => addIngredient(item.title || item.name)}
                className="rounded-full bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-600 ring-1 ring-slate-100 transition hover:bg-accent/10 hover:text-accent hover:ring-accent/15"
              >
                + {item.title || item.name}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs font-bold text-slate-400">
            No pantry suggestions available. You can still type ingredients manually.
          </p>
        )}
      </div>

      {missingIngredients.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
            Not in Pantry yet
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {missingIngredients.map((ingredient) => (
              <span
                key={ingredient}
                className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-amber-700 ring-1 ring-amber-100"
              >
                {ingredient}
              </span>
            ))}
          </div>

          <label className="mt-3 flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={addMissingToPantry}
              onChange={(event) => setAddMissingToPantry(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-amber-300"
            />

            <span className="text-xs font-bold leading-5 text-amber-800">
              Add missing ingredients to Pantry as Out, so future smart lists can match them.
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

function IngredientPantryModal({
  open,
  onClose,
  pantryItems,
  ingredientsText,
  onApply,
}) {
  const [search, setSearch] = useState("");
  const [selectedKeys, setSelectedKeys] = useState(new Set());

  useEffect(() => {
    if (!open) return;

    const currentKeys = new Set(
      String(ingredientsText || "")
        .split("\n")
        .map((item) => normalizeIngredientKey(item))
        .filter(Boolean)
    );

    setSelectedKeys(currentKeys);
    setSearch("");
  }, [open, ingredientsText]);

  if (!open) return null;

  const filteredItems = pantryItems
    .filter((item) => item.status !== "archived")
    .filter((item) => item.title || item.name)
    .filter((item) => {
      const queryText = search.trim().toLowerCase();
      if (!queryText) return true;

      return String(item.title || item.name || "")
        .toLowerCase()
        .includes(queryText);
    });

  const toggleItem = (item) => {
    const key = normalizeIngredientKey(item.title || item.name);

    setSelectedKeys((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  };

  const applySelection = () => {
    const currentManual = String(ingredientsText || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

    const selectedFromPantry = pantryItems
      .filter((item) => selectedKeys.has(normalizeIngredientKey(item.title || item.name)))
      .map((item) => item.title || item.name)
      .filter(Boolean);

    const merged = [...currentManual, ...selectedFromPantry].reduce((acc, item) => {
      const key = normalizeIngredientKey(item);

      if (!key || acc.some((existing) => normalizeIngredientKey(existing) === key)) {
        return acc;
      }

      acc.push(item);
      return acc;
    }, []);

    onApply(merged.join("\n"));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-slate-950/20 px-3 pb-4 pt-10 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="max-h-[84vh] w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-br from-white via-emerald-50/70 to-amber-50/50 p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
              Pantry picker
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              Add ingredients from Pantry
            </h2>

            <p className="mt-1 text-sm font-bold text-slate-500">
              Search and select the pantry items this meal needs.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-100 transition hover:text-slate-900"
            aria-label="Close pantry ingredient picker"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
            <Search className="h-4 w-4 text-slate-400" />

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search pantry ingredients..."
              className="h-10 border-0 bg-transparent px-0 font-semibold shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="max-h-[42vh] overflow-y-auto pr-1">
            {filteredItems.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {filteredItems.map((item) => {
                  const key = normalizeIngredientKey(item.title || item.name);
                  const selected = selectedKeys.has(key);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleItem(item)}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-3 text-left transition",
                        selected
                          ? "border-accent/20 bg-accent/10 ring-2 ring-accent/10"
                          : "border-slate-100 bg-white hover:bg-secondary/40"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1",
                          selected
                            ? "bg-accent text-accent-foreground ring-accent/20"
                            : "bg-slate-50 text-slate-300 ring-slate-100"
                        )}
                      >
                        {selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-slate-950">
                          {item.title || item.name}
                        </span>
                        <span className="block text-xs font-bold text-slate-400">
                          {item.status === "out"
                            ? "Out"
                            : item.status === "low"
                              ? "Low"
                              : "In stock"}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/60 p-8 text-center">
                <p className="font-black text-slate-950">No pantry matches</p>
                <p className="mt-1 text-sm font-bold text-slate-400">
                  Try another search, or type the ingredient manually.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-white p-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-2xl font-black"
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={applySelection}
            className="rounded-2xl bg-accent font-black text-accent-foreground hover:bg-accent/90"
          >
            Add selected
          </Button>
        </div>
      </div>
    </div>
  );
}

function IngredientField({
  value,
  onChange,
  pantryItems,
  addMissingToPantry,
  setAddMissingToPantry,
  onOpenPantry,
}) {
  const ingredients = useMemo(() => {
    return String(value || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }, [value]);

  const pantryKeys = useMemo(() => {
    return new Set(
      pantryItems
        .filter((item) => item.status !== "archived")
        .map((item) => normalizeIngredientKey(item.title || item.name))
        .filter(Boolean)
    );
  }, [pantryItems]);

  const missingIngredients = ingredients.filter(
    (ingredient) => !pantryKeys.has(normalizeIngredientKey(ingredient))
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-black text-slate-700">Ingredients</label>

        <button
          type="button"
          onClick={onOpenPantry}
          className="rounded-full bg-accent/10 px-3 py-1.5 text-xs font-black text-accent ring-1 ring-accent/15 transition hover:bg-accent/15"
        >
          Add from Pantry
        </button>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={"One per line:\ntortillas\nground beef\ncheese"}
        className="mt-1 min-h-[130px] w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm font-semibold outline-none transition focus:border-accent/20 focus:ring-2 focus:ring-accent/15"
      />

      {missingIngredients.length > 0 && (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">
            Not in Pantry yet
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {missingIngredients.map((ingredient) => (
              <span
                key={ingredient}
                className="rounded-full bg-white px-2 py-1 text-[10px] font-black text-amber-700 ring-1 ring-amber-100"
              >
                {ingredient}
              </span>
            ))}
          </div>

          <label className="mt-3 flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={addMissingToPantry}
              onChange={(event) => setAddMissingToPantry(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-amber-300"
            />

            <span className="text-xs font-bold leading-5 text-amber-800">
              Add missing ingredients to Pantry as Out when saving.
            </span>
          </label>
        </div>
      )}
    </div>
  );
}

function FamilyMenuPanel({
  templates,
  selectedDay,
  canWrite,
  savingTemplate,
  addingTemplateId,
  pantryItems,
  onCreateTemplate,
  onUpdateTemplate,
  onArchiveTemplate,
  onAddTemplateToPlan,
}) {
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("dinner");
  const [newNotes, setNewNotes] = useState("");
  const [newIngredients, setNewIngredients] = useState("");
  const [addMissingNewToPantry, setAddMissingNewToPantry] = useState(true);
  const [filter, setFilter] = useState("all");
  const [menuSearch, setMenuSearch] = useState("");

  const [editingTemplateId, setEditingTemplateId] = useState("");
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("dinner");
  const [editNotes, setEditNotes] = useState("");
  const [editIngredients, setEditIngredients] = useState("");
  const [addMissingEditToPantry, setAddMissingEditToPantry] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const [ingredientPickerMode, setIngredientPickerMode] = useState(null);
  const [templateToRemove, setTemplateToRemove] = useState(null);
  const [removingTemplate, setRemovingTemplate] = useState(false);

  const visibleTemplates = templates.filter((template) => {
    const type = template.mealType || template.meal_type || "dinner";
    const matchesFilter = filter === "all" || type === filter;
    const searchText = menuSearch.trim().toLowerCase();

    if (!matchesFilter) return false;
    if (!searchText) return true;

    const typeLabel = getMealConfig(type).label;

    const haystack = [
      template.name,
      template.notes,
      type,
      typeLabel,
      ...(Array.isArray(template.ingredients) ? template.ingredients : []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(searchText);
  });

  const groupedTemplates = mealOrder.reduce((acc, type) => {
    acc[type] = visibleTemplates.filter(
      (template) => (template.mealType || template.meal_type) === type
    );
    return acc;
  }, {});

  const parseIngredients = (value) =>
    String(value || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    const created = await onCreateTemplate({
      name: newName.trim(),
      mealType: newType,
      notes: newNotes.trim(),
      ingredients: parseIngredients(newIngredients),
      addMissingIngredientsToPantry: addMissingNewToPantry,
    });

    if (created) {
      setNewName("");
      setNewType("dinner");
      setNewNotes("");
      setNewIngredients("");
      setAddMissingNewToPantry(true);
    }
  };

  const startEditingTemplate = (template) => {
    setEditingTemplateId(template.id);
    setEditName(template.name || "");
    setEditType(template.mealType || template.meal_type || "dinner");
    setEditNotes(template.notes || "");
    setEditIngredients((template.ingredients || []).join("\n"));
    setAddMissingEditToPantry(true);
  };

  const cancelEditingTemplate = () => {
    setEditingTemplateId("");
    setEditName("");
    setEditType("dinner");
    setEditNotes("");
    setEditIngredients("");
    setAddMissingEditToPantry(true);
    setSavingEdit(false);
  };

  const saveTemplateEdit = async (template) => {
    if (!editName.trim() || !template?.id || savingEdit) return;

    setSavingEdit(true);

    const saved = await onUpdateTemplate(template.id, {
      name: editName.trim(),
      mealType: editType,
      notes: editNotes.trim(),
      ingredients: parseIngredients(editIngredients),
      addMissingIngredientsToPantry: addMissingEditToPantry,
    });

    setSavingEdit(false);

    if (saved) {
      cancelEditingTemplate();
    }
  };

  const confirmRemoveTemplate = async () => {
    if (!templateToRemove?.id || removingTemplate) return;

    setRemovingTemplate(true);
    const removed = await onArchiveTemplate(templateToRemove);
    setRemovingTemplate(false);

    if (removed) {
      if (editingTemplateId === templateToRemove.id) {
        cancelEditingTemplate();
      }
      setTemplateToRemove(null);
    }
  };

  const pickerValue = ingredientPickerMode === "edit" ? editIngredients : newIngredients;

  return (
    <div className="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <IngredientPantryModal
        open={Boolean(ingredientPickerMode)}
        onClose={() => setIngredientPickerMode(null)}
        pantryItems={pantryItems}
        ingredientsText={pickerValue}
        onApply={(nextIngredients) => {
          if (ingredientPickerMode === "edit") {
            setEditIngredients(nextIngredients);
          } else {
            setNewIngredients(nextIngredients);
          }
        }}
      />

      <section className="rounded-[2.25rem] border border-white/80 bg-white/78 p-4 shadow-[0_20px_58px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-orange-500">
          <Sparkles className="h-4 w-4" />
          Family Menu
        </p>

        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          Add a go-to meal
        </h2>

        <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
          Save meals you repeat often, then add them to any day without starting from scratch.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm font-black text-slate-700">Meal name</label>
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Taco night, pancakes, chicken rice..."
              className="mt-1 h-12 rounded-2xl bg-white font-bold"
            />
          </div>

          <div>
            <label className="text-sm font-black text-slate-700">Meal type</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {mealOrder.map((type) => {
                const config = getMealConfig(type);
                const Icon = config.icon;
                const selected = newType === type;

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setNewType(type)}
                    className={cn(
                      "rounded-2xl border p-3 text-left transition",
                      selected
                        ? "border-accent/20 bg-accent/10 text-accent"
                        : "border-slate-100 bg-white text-slate-600 hover:bg-secondary/40"
                    )}
                  >
                    <Icon className="mb-1 h-4 w-4" />
                    <p className="text-xs font-black">{config.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-black text-slate-700">Notes</label>
            <Input
              value={newNotes}
              onChange={(event) => setNewNotes(event.target.value)}
              placeholder="Easy dinner, Joaquin likes it, 20 minutes..."
              className="mt-1 h-12 rounded-2xl bg-white"
            />
          </div>

          <IngredientField
            value={newIngredients}
            onChange={setNewIngredients}
            pantryItems={pantryItems}
            addMissingToPantry={addMissingNewToPantry}
            setAddMissingToPantry={setAddMissingNewToPantry}
            onOpenPantry={() => setIngredientPickerMode("new")}
          />

          <Button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim() || savingTemplate || !canWrite}
            className="w-full rounded-2xl bg-accent font-black text-accent-foreground hover:bg-accent/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            {savingTemplate ? "Saving..." : "Save to Family Menu"}
          </Button>
        </div>
      </section>

      <section className="rounded-[2.25rem] border border-white/80 bg-white/62 p-4 shadow-[0_20px_58px_rgba(15,23,42,0.08)] backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-accent">
              Saved meals
            </p>
            <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
              Your house menu
            </h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Add one to {format(selectedDay, "EEEE, MMM d")}.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {["all", ...mealOrder].map((type) => {
              const label = type === "all" ? "All" : getMealConfig(type).label;
              const active = filter === type;

              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilter(type)}
                  className={cn(
                    "rounded-full px-3 py-2 text-xs font-black ring-1 transition",
                    active
                      ? "bg-accent text-accent-foreground ring-accent/20"
                      : "bg-white text-slate-500 ring-slate-100 hover:bg-secondary/40"
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 rounded-[1.5rem] border border-white/80 bg-white/72 p-3 ring-1 ring-slate-100">
          <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-100">
            <Search className="h-4 w-4 text-slate-400" />

            <Input
              value={menuSearch}
              onChange={(event) => setMenuSearch(event.target.value)}
              placeholder="Search meals, ingredients, notes..."
              className="h-10 border-0 bg-transparent px-0 text-sm font-semibold shadow-none focus-visible:ring-0"
            />

            {menuSearch && (
              <button
                type="button"
                onClick={() => setMenuSearch("")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-100 transition hover:text-slate-900"
                aria-label="Clear Family Menu search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-5">
          {mealOrder.map((type) => {
            const config = getMealConfig(type);
            const Icon = config.icon;
            const items = groupedTemplates[type] || [];

            if (filter !== "all" && filter !== type) return null;

            return (
              <div key={type}>
                <div className="mb-2 flex items-center gap-2">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl ring-1", config.tone)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">
                    {config.label}
                  </h3>
                </div>

                {items.length > 0 ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {items.map((template) => {
                      const isEditing = editingTemplateId === template.id;

                      return (
                        <div
                          key={template.id}
                          className={cn(
                            "rounded-[1.75rem] border border-white/80 bg-gradient-to-br p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]",
                            config.panel
                          )}
                        >
                          {isEditing ? (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">
                                  Edit meal
                                </p>

                                <button
                                  type="button"
                                  onClick={cancelEditingTemplate}
                                  disabled={savingEdit}
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-100 transition hover:text-slate-900 disabled:opacity-50"
                                  aria-label="Cancel edit"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>

                              <Input
                                value={editName}
                                onChange={(event) => setEditName(event.target.value)}
                                className="h-11 rounded-2xl bg-white font-bold"
                                placeholder="Meal name"
                              />

                              <div className="grid grid-cols-4 gap-1.5">
                                {mealOrder.map((mealType) => {
                                  const typeConfig = getMealConfig(mealType);
                                  const TypeIcon = typeConfig.icon;
                                  const active = editType === mealType;

                                  return (
                                    <button
                                      key={mealType}
                                      type="button"
                                      onClick={() => setEditType(mealType)}
                                      className={cn(
                                        "flex h-10 items-center justify-center rounded-xl ring-1 transition",
                                        active
                                          ? "bg-accent text-accent-foreground ring-accent/20"
                                          : "bg-white text-slate-400 ring-slate-100 hover:bg-secondary/40"
                                      )}
                                      title={typeConfig.label}
                                    >
                                      <TypeIcon className="h-4 w-4" />
                                    </button>
                                  );
                                })}
                              </div>

                              <Input
                                value={editNotes}
                                onChange={(event) => setEditNotes(event.target.value)}
                                className="h-11 rounded-2xl bg-white"
                                placeholder="Notes"
                              />

                              <IngredientField
                                value={editIngredients}
                                onChange={setEditIngredients}
                                pantryItems={pantryItems}
                                addMissingToPantry={addMissingEditToPantry}
                                setAddMissingToPantry={setAddMissingEditToPantry}
                                onOpenPantry={() => setIngredientPickerMode("edit")}
                              />

                              <div className="grid gap-2 sm:grid-cols-2">
                                <Button
                                  type="button"
                                  onClick={() => saveTemplateEdit(template)}
                                  disabled={!editName.trim() || savingEdit || !canWrite}
                                  className="rounded-2xl bg-accent font-black text-accent-foreground hover:bg-accent/90"
                                >
                                  {savingEdit ? "Saving..." : "Save changes"}
                                </Button>

                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={cancelEditingTemplate}
                                  disabled={savingEdit}
                                  className="rounded-2xl bg-white font-black"
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-start gap-3">
                                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1", config.tone)}>
                                  <Icon className="h-5 w-5" />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <h4 className="text-lg font-black leading-tight text-slate-950">
                                        {template.name}
                                      </h4>

                                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                                        {template.notes || `${template.ingredients.length} ingredient${template.ingredients.length === 1 ? "" : "s"}`}
                                      </p>
                                    </div>

                                    {canWrite && (
                                      <div className="flex shrink-0 gap-1">
                                        <button
                                          type="button"
                                          onClick={() => startEditingTemplate(template)}
                                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-100 transition hover:bg-accent/10 hover:text-accent hover:ring-accent/15"
                                          aria-label="Edit menu meal"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => setTemplateToRemove(template)}
                                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 ring-1 ring-slate-100 transition hover:bg-red-50 hover:text-red-600 hover:ring-red-100"
                                          aria-label="Remove menu meal"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {template.ingredients.slice(0, 4).map((ingredient) => (
                                      <span
                                        key={ingredient}
                                        className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black text-slate-500 ring-1 ring-slate-100"
                                      >
                                        {ingredient}
                                      </span>
                                    ))}

                                    {template.ingredients.length > 4 && (
                                      <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black text-slate-400 ring-1 ring-slate-100">
                                        +{template.ingredients.length - 4}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                                <Button
                                  type="button"
                                  onClick={() => onAddTemplateToPlan(template)}
                                  disabled={!canWrite || addingTemplateId === template.id}
                                  className="rounded-2xl bg-white font-black text-accent ring-1 ring-accent/15 hover:bg-accent/10"
                                >
                                  <CalendarDays className="mr-2 h-4 w-4" />
                                  {addingTemplateId === template.id ? "Adding..." : "Add to day"}
                                </Button>

                                <Button
                                  type="button"
                                  onClick={() =>
                                    onAddTemplateToPlan(template, { createGroceryList: true })
                                  }
                                  disabled={
                                    !canWrite ||
                                    addingTemplateId === template.id ||
                                    !template.ingredients?.length
                                  }
                                  className="rounded-2xl bg-emerald-50 font-black text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100 disabled:opacity-50"
                                >
                                  <ListChecks className="mr-2 h-4 w-4" />
                                  Add + list
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/55 p-5 text-sm font-bold text-slate-400">
                    {menuSearch
                      ? `No ${config.label.toLowerCase()} meals match "${menuSearch}".`
                      : `No ${config.label.toLowerCase()} meals saved yet.`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {templateToRemove && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-black tracking-tight text-slate-950">
                  Remove from Family Menu?
                </h2>

                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  This removes "{templateToRemove.name}" from your saved menu.
                  Existing planned meals will stay on the calendar.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTemplateToRemove(null)}
                disabled={removingTemplate}
                className="rounded-2xl font-black"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={confirmRemoveTemplate}
                disabled={removingTemplate}
                className="rounded-2xl bg-red-600 font-black text-white hover:bg-red-700"
              >
                {removingTemplate ? "Removing..." : "Remove meal"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Meals() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [addMealDate, setAddMealDate] = useState(null);
  const [mealToDelete, setMealToDelete] = useState(null);
  const [deletingMeal, setDeletingMeal] = useState(false);
  const [meals, setMeals] = useState([]);
  const [mealLists, setMealLists] = useState([]);
  const [mealTemplates, setMealTemplates] = useState([]);
  const [pantryItems, setPantryItems] = useState([]);
  const [activeMealTab, setActiveMealTab] = useState("planner");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [addingTemplateId, setAddingTemplateId] = useState("");
  const [loading, setLoading] = useState(true);

  const { familyId, user, profile, perms } = useFamily();

  const canRead = perms?.meals?.read !== false;
  const canWrite = perms?.meals?.write !== false;

  const weekEnd = addDays(weekStart, 6);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }, [weekStart]);

  const selectedDateKey = format(selectedDay, "yyyy-MM-dd");

  const selectedMeals = useMemo(() => {
    return meals.filter((meal) => meal.date === selectedDateKey);
  }, [meals, selectedDateKey]);

  const todayMeals = useMemo(() => {
    const todayKey = format(new Date(), "yyyy-MM-dd");
    return meals.filter((meal) => meal.date === todayKey);
  }, [meals]);

  const listsByMealId = useMemo(() => {
    return mealLists.reduce((acc, list) => {
      const mealId = list.linkedMealId || list.linked_meal_id || "";
      if (mealId && list.status !== "archived") {
        acc[mealId] = list;
      }
      return acc;
    }, {});
  }, [mealLists]);

  const linkedListCount = Object.keys(listsByMealId).length;

  function getCreatorName() {
    return (
      profile?.displayName ||
      profile?.fullName ||
      profile?.name ||
      user?.displayName ||
      "Unknown member"
    );
  }

  const loadMeals = async () => {
    if (!familyId || !canRead) {
      setMeals([]);
      setMealLists([]);
      setMealTemplates([]);
      setPantryItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let snap;

      try {
        const q = query(
          collection(db, "meals"),
          where("familyId", "==", familyId)
        );

        snap = await getDocs(q);
      } catch (error) {
        console.warn("Fallback to family_id query:", error);

        const q = query(
          collection(db, "meals"),
          where("family_id", "==", familyId)
        );

        snap = await getDocs(q);
      }

      const startKey = format(weekStart, "yyyy-MM-dd");
      const endKey = format(weekEnd, "yyyy-MM-dd");

      const data = snap.docs
        .map(normalizeMeal)
        .filter((meal) => meal.date >= startKey && meal.date <= endKey);

      data.sort((a, b) => {
        const dateCompare = (a.date || "").localeCompare(b.date || "");
        if (dateCompare !== 0) return dateCompare;

        const order = {
          breakfast: 1,
          lunch: 2,
          snack: 3,
          dinner: 4,
        };

        return (order[a.meal_type] || 99) - (order[b.meal_type] || 99);
      });

      setMeals(data);

      const listSnap = await getDocs(
        query(
          collection(db, "familyLists"),
          where("familyId", "==", familyId),
          where("source", "==", "meal")
        )
      );

      setMealLists(
        listSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }))
      );

      const templateSnap = await getDocs(
        query(
          collection(db, "mealTemplates"),
          where("familyId", "==", familyId)
        )
      );

      const templateData = templateSnap.docs
        .map(normalizeMealTemplate)
        .filter((template) => template.status !== "archived");

      templateData.sort((a, b) => {
        const order = {
          breakfast: 1,
          lunch: 2,
          snack: 3,
          dinner: 4,
        };

        const typeCompare =
          (order[a.mealType || a.meal_type] || 99) -
          (order[b.mealType || b.meal_type] || 99);

        if (typeCompare !== 0) return typeCompare;

        return (a.name || "").localeCompare(b.name || "");
      });

      setMealTemplates(templateData);

      const pantrySnap = await getDocs(
        query(
          collection(db, "familyPantryItems"),
          where("familyId", "==", familyId)
        )
      );

      const pantryData = pantrySnap.docs
        .map((docSnap) => {
          const data = docSnap.data();

          return {
            id: docSnap.id,
            ...data,
            title: data.title || data.name || "",
            name: data.name || data.title || "",
            status: data.status || "in_stock",
            category: data.category || "easy_dinners",
          };
        })
        .filter((item) => item.status !== "archived")
        .sort((a, b) => (a.title || "").localeCompare(b.title || ""));

      setPantryItems(pantryData);
    } catch (error) {
      console.error("Error loading meals:", error);
      setMeals([]);
      setMealLists([]);
      setMealTemplates([]);
      setPantryItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, canRead, weekStart]);

  useEffect(() => {
    const selectedInsideWeek = weekDays.some((day) => isSameDay(day, selectedDay));

    if (!selectedInsideWeek) {
      setSelectedDay(weekStart);
    }
  }, [weekDays, selectedDay, weekStart]);

  const addMissingIngredientsToPantry = async (ingredients = []) => {
    if (!canWrite || !familyId || !Array.isArray(ingredients)) return 0;

    const existingKeys = new Set(
      pantryItems
        .filter((item) => item.status !== "archived")
        .map((item) => normalizeIngredientKey(item.title || item.name))
        .filter(Boolean)
    );

    const missingIngredients = ingredients
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .filter((ingredient, index, arr) => {
        const key = normalizeIngredientKey(ingredient);
        return key && arr.findIndex((candidate) => normalizeIngredientKey(candidate) === key) === index;
      })
      .filter((ingredient) => !existingKeys.has(normalizeIngredientKey(ingredient)));

    if (!missingIngredients.length) return 0;

    await Promise.all(
      missingIngredients.map((ingredient) =>
        addDoc(collection(db, "familyPantryItems"), {
          title: ingredient,
          name: ingredient,
          category: "easy_dinners",
          status: "out",
          note: "Added from Family Menu",

          familyId,
          family_id: familyId,

          createdBy: user?.uid || null,
          createdByEmail: user?.email || null,
          createdByName: getCreatorName(),
          created_by_name: getCreatorName(),

          created_date: new Date().toISOString(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      )
    );

    return missingIngredients.length;
  };

  const createMealTemplate = async ({
    name,
    mealType,
    notes,
    ingredients,
    addMissingIngredientsToPantry: shouldAddMissingIngredientsToPantry = true,
  }) => {
    if (!canWrite || !familyId || !name?.trim()) return false;

    setSavingTemplate(true);

    try {
      await addDoc(collection(db, "mealTemplates"), {
        familyId,
        family_id: familyId,

        name: name.trim(),
        mealType,
        meal_type: mealType,
        notes: notes || "",
        ingredients: Array.isArray(ingredients) ? ingredients : [],
        status: "active",

        favorite: true,
        kidFriendly: true,
        kid_friendly: true,
        quickMeal: false,
        quick_meal: false,

        createdBy: user?.uid || null,
        createdByEmail: user?.email || null,
        createdByName: getCreatorName(),
        created_by_name: getCreatorName(),

        created_date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const addedToPantryCount = shouldAddMissingIngredientsToPantry
        ? await addMissingIngredientsToPantry(ingredients)
        : 0;

      toast({
        title: "Saved to Family Menu",
        description:
          addedToPantryCount > 0
            ? `${name.trim()} is ready. ${addedToPantryCount} ingredient${addedToPantryCount === 1 ? "" : "s"} added to Pantry as Out.`
            : `${name.trim()} is ready to reuse.`,
        duration: 3500,
      });

      await loadMeals();
      return true;
    } catch (error) {
      console.error("Error creating meal template:", error);

      toast({
        title: "Could not save menu item",
        description: error?.message || "Please try again.",
        variant: "destructive",
        duration: 5000,
      });

      return false;
    } finally {
      setSavingTemplate(false);
    }
  };

  const updateMealTemplate = async (templateId, updates) => {
    if (!canWrite || !familyId || !templateId || !updates?.name?.trim()) return false;

    try {
      await updateDoc(doc(db, "mealTemplates", templateId), {
        name: updates.name.trim(),
        mealType: updates.mealType || "dinner",
        meal_type: updates.mealType || "dinner",
        notes: updates.notes || "",
        ingredients: Array.isArray(updates.ingredients) ? updates.ingredients : [],

        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });

      const addedToPantryCount = updates.addMissingIngredientsToPantry
        ? await addMissingIngredientsToPantry(updates.ingredients)
        : 0;

      toast({
        title: "Family Menu updated",
        description:
          addedToPantryCount > 0
            ? `${updates.name.trim()} was updated. ${addedToPantryCount} ingredient${addedToPantryCount === 1 ? "" : "s"} added to Pantry as Out.`
            : `${updates.name.trim()} was updated.`,
        duration: 3000,
      });

      await loadMeals();
      return true;
    } catch (error) {
      console.error("Error updating meal template:", error);

      toast({
        title: "Could not update menu item",
        description: error?.message || "Please try again.",
        variant: "destructive",
        duration: 5000,
      });

      return false;
    }
  };

  const archiveMealTemplate = async (template) => {
    if (!canWrite || !template?.id) return false;

    try {
      await updateDoc(doc(db, "mealTemplates", template.id), {
        status: "archived",
        archivedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });

      toast({
        title: "Removed from Family Menu",
        description: `${template.name || "Meal"} was removed from saved meals.`,
        duration: 3000,
      });

      await loadMeals();
      return true;
    } catch (error) {
      console.error("Error removing meal template:", error);

      toast({
        title: "Could not remove menu item",
        description: error?.message || "Please try again.",
        variant: "destructive",
        duration: 5000,
      });

      return false;
    }
  };

  const addTemplateToSelectedDay = async (template, options = {}) => {
    if (!canWrite || !familyId || !template?.id) return;

    const shouldCreateGroceryList = options?.createGroceryList === true;
    const ingredients = Array.isArray(template.ingredients)
      ? template.ingredients.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    setAddingTemplateId(template.id);

    try {
      const mealRef = await addDoc(collection(db, "meals"), {
        date: format(selectedDay, "yyyy-MM-dd"),

        meal_type: template.mealType || template.meal_type || "dinner",
        mealType: template.mealType || template.meal_type || "dinner",

        name: template.name || "Meal",
        notes: template.notes || "",
        image_url: "",
        imageUrl: "",

        templateId: template.id,
        template_id: template.id,

        familyId,
        family_id: familyId,
        familyName: profile?.family_name || profile?.familyName || "",

        createdBy: user?.uid || null,
        createdByEmail: user?.email || null,
        createdByName: getCreatorName(),
        created_by_name: getCreatorName(),

        created_date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      let listRef = null;
      let addedCount = 0;
      let skippedInStockCount = 0;

      if (shouldCreateGroceryList && ingredients.length > 0) {
        const pantrySnap = await getDocs(
          query(collection(db, "familyPantryItems"), where("familyId", "==", familyId))
        );

        const pantryByName = new Map();

        pantrySnap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const key = String(data.title || data.name || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");
          const status = String(data.status || "in_stock").toLowerCase();

          if (key && status !== "archived") {
            pantryByName.set(key, status);
          }
        });

        const ingredientsToBuy = ingredients.filter((ingredient) => {
          const key = String(ingredient || "")
            .trim()
            .toLowerCase()
            .replace(/\s+/g, " ");

          return pantryByName.get(key) !== "in_stock";
        });

        skippedInStockCount = ingredients.length - ingredientsToBuy.length;
        addedCount = ingredientsToBuy.length;

        if (ingredientsToBuy.length > 0) {
          listRef = await addDoc(collection(db, "familyLists"), {
            title: `${template.name || "Meal"} ingredients`,
            type: "meal",
            description:
              template.notes ||
              `Shopping list for ${template.name || "this meal"}`,
            status: "active",

            familyId,
            family_id: familyId,

            linkedMealId: mealRef.id,
            linked_meal_id: mealRef.id,
            linkedMealTitle: template.name || "",
            linked_meal_title: template.name || "",

            source: "meal",
            source_type: "meal",

            assignedToPersonId: "family",
            assigned_to_person_id: "family",
            assignedToPersonName: "Family",
            assigned_to_person_name: "Family",

            createdBy: user?.uid || null,
            createdByEmail: user?.email || null,
            createdByName: getCreatorName(),
            created_by_name: getCreatorName(),

            created_date: new Date().toISOString(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          await Promise.all(
            ingredientsToBuy.map((ingredient) =>
              addDoc(collection(db, "familyListItems"), {
                title: ingredient,
                name: ingredient,
                quantity: "",
                note: "",
                status: "needed",
                checked: false,

                listId: listRef.id,
                list_id: listRef.id,
                listTitle: `${template.name || "Meal"} ingredients`,
                list_title: `${template.name || "Meal"} ingredients`,
                listType: "meal",
                list_type: "meal",

                familyId,
                family_id: familyId,

                source: "mealTemplate",
                source_type: "mealTemplate",
                linkedMealId: mealRef.id,
                linked_meal_id: mealRef.id,
                linkedMealTitle: template.name || "",
                linked_meal_title: template.name || "",

                createdBy: user?.uid || null,
                createdByEmail: user?.email || null,
                created_date: new Date().toISOString(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              })
            )
          );
        }
      }

      toast({
        title:
          shouldCreateGroceryList && listRef?.id
            ? "Meal and smart list added"
            : shouldCreateGroceryList
              ? "Meal added, pantry already stocked"
              : "Meal added",
        description:
          shouldCreateGroceryList && listRef?.id
            ? `${addedCount} item${addedCount === 1 ? "" : "s"} added. ${skippedInStockCount} already in stock.`
            : shouldCreateGroceryList
              ? `${template.name} was added. All ingredients were already in stock.`
              : `${template.name} was added to ${format(selectedDay, "EEEE")}.`,
        duration: 3500,
      });

      setActiveMealTab("planner");
      await loadMeals();

      if (listRef?.id) {
        navigate(`/lists?listId=${listRef.id}`);
      }
    } catch (error) {
      console.error("Error adding template to plan:", error);

      toast({
        title: "Could not add meal",
        description: error?.message || "Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setAddingTemplateId("");
    }
  };

  const createOrViewMealList = async (meal) => {
    if (!meal?.id) return;

    const existingList = listsByMealId[meal.id];

    if (existingList?.id) {
      navigate(`/lists?listId=${existingList.id}`);
      return;
    }

    if (!canWrite || !familyId) return;

    try {
      const docRef = await addDoc(collection(db, "familyLists"), {
        title: `${meal.name || "Meal"} ingredients`,
        type: "meal",
        description: meal.notes || `Shopping list for ${meal.name || "this meal"}`,
        status: "active",

        familyId,
        family_id: familyId,

        linkedMealId: meal.id,
        linked_meal_id: meal.id,
        linkedMealTitle: meal.name || "",
        linked_meal_title: meal.name || "",

        source: "meal",
        source_type: "meal",

        assignedToPersonId: "family",
        assigned_to_person_id: "family",
        assignedToPersonName: "Family",
        assigned_to_person_name: "Family",

        createdBy: user?.uid || null,
        createdByEmail: user?.email || null,
        createdByName: getCreatorName(),
        created_by_name: getCreatorName(),
        created_date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast({
        title: "Grocery list created",
        description: `A list was created for ${meal.name || "this meal"}.`,
        duration: 3500,
      });

      await loadMeals();
      navigate(`/lists?listId=${docRef.id}`);
    } catch (error) {
      console.error("Error creating meal list:", error);

      toast({
        title: "Could not create grocery list",
        description: error?.message || "Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  const requestDeleteMeal = (meal) => {
    if (!canWrite || !meal?.id) return;
    setMealToDelete(meal);
  };

  const confirmDeleteMeal = async () => {
    if (!canWrite || !mealToDelete?.id) return;

    setDeletingMeal(true);

    try {
      await deleteDoc(doc(db, "meals", mealToDelete.id));

      toast({
        title: "Meal deleted",
        description: `${mealToDelete.name || "Meal"} was removed from the weekly plan.`,
        duration: 3500,
      });

      setMealToDelete(null);
      await loadMeals();
    } catch (error) {
      console.error("Error deleting meal:", error);

      toast({
        title: "Could not delete meal",
        description: error?.message || "Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setDeletingMeal(false);
    }
  };

  const getMealsForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return meals.filter((meal) => meal.date === dateStr);
  };

  if (!canRead) {
    return (
      <div className="kinly-gradient-bg flex min-h-full items-center justify-center p-6">
        <div className="max-w-xl rounded-[2rem] border border-white/80 bg-white/80 p-8 text-center shadow-xl backdrop-blur-xl">
          <h1 className="text-2xl font-black tracking-tight text-slate-950">
            Meal Planner
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            You do not have access to meals for this family.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="kinly-gradient-bg min-h-full px-3 pb-28 pt-3 md:px-5 md:pb-12 lg:px-6">
      <div className="mx-auto max-w-7xl space-y-4">
        <section className="overflow-hidden rounded-[2.25rem] border border-white/80 bg-white/78 shadow-[0_20px_58px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <div className="grid gap-5 bg-gradient-to-br from-white via-orange-50/70 to-blue-50/60 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-orange-500">
                <Sparkles className="h-4 w-4" />
                Meal Planner
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                Family meals, without the chaos
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-500">
                Pick a day, plan the meals, and turn dinner ideas into grocery
                lists when it’s time to shop.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-100">
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  {loading ? "Loading..." : `${meals.length} meals this week`}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/8 px-3 py-1.5 text-xs font-black text-accent ring-1 ring-accent/15">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {todayMeals.length} today
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">
                  <ListChecks className="h-3.5 w-3.5" />
                  {linkedListCount} grocery list{linkedListCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/80 bg-white/78 p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setWeekStart(addDays(weekStart, -7))}
                  className="h-11 w-11 rounded-2xl bg-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="min-w-[180px] text-center">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                    Current week
                  </p>
                  <p className="text-sm font-black text-slate-950">
                    {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setWeekStart(addDays(weekStart, 7))}
                  className="h-11 w-11 rounded-2xl bg-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const today = new Date();
                  setWeekStart(startOfWeek(today));
                  setSelectedDay(today);
                }}
                className="mt-2 w-full rounded-2xl bg-white font-black"
              >
                This week
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/80 bg-white/70 p-2 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl">
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "planner", label: "Planner", helper: "This week" },
              { id: "menu", label: "Family Menu", helper: "Saved meals" },
            ].map((tab) => {
              const active = activeMealTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveMealTab(tab.id)}
                  className={cn(
                    "rounded-[1.5rem] px-4 py-3 text-left transition",
                    active
                      ? "bg-accent text-accent-foreground shadow-lg shadow-accent/15"
                      : "bg-white text-slate-500 ring-1 ring-slate-100 hover:bg-secondary/40"
                  )}
                >
                  <p className="text-sm font-black">{tab.label}</p>
                  <p
                    className={cn(
                      "text-xs font-bold",
                      active ? "text-accent-foreground/75" : "text-slate-400"
                    )}
                  >
                    {tab.helper}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {activeMealTab === "menu" ? (
          <div className="block">
            <FamilyMenuPanel
            templates={mealTemplates}
            selectedDay={selectedDay}
            canWrite={canWrite}
            savingTemplate={savingTemplate}
            addingTemplateId={addingTemplateId}
            pantryItems={pantryItems}
            onCreateTemplate={createMealTemplate}
            onUpdateTemplate={updateMealTemplate}
            onArchiveTemplate={archiveMealTemplate}
            onAddTemplateToPlan={addTemplateToSelectedDay}
          />
          </div>
        ) : (
          <>
            <section className="rounded-[2.25rem] border border-white/80 bg-white/62 p-3 shadow-[0_16px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {weekDays.map((day) => (
                  <WeekDayCard
                    key={day.toISOString()}
                    day={day}
                    meals={getMealsForDate(day)}
                    selected={isSameDay(day, selectedDay)}
                    onSelect={setSelectedDay}
                  />
                ))}
              </div>
            </section>

            {loading ? (
              <div className="flex min-h-[440px] items-center justify-center rounded-[2rem] border border-white/80 bg-white/82 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-accent" />
                  <p className="text-sm font-black text-slate-400">
                    Loading family meals...
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <FocusDayPanel
                  selectedDay={selectedDay}
                  meals={selectedMeals}
                  listsByMealId={listsByMealId}
                  canWrite={canWrite}
                  onAdd={setAddMealDate}
                  onDelete={requestDeleteMeal}
                  onCreateMealList={createOrViewMealList}
                />

                <BentoSidePanel
                  selectedDay={selectedDay}
                  selectedMeals={selectedMeals}
                  weekMeals={meals}
                  listsByMealId={listsByMealId}
                  canWrite={canWrite}
                  onAdd={setAddMealDate}
                  onOpenList={(list) => navigate(`/lists?listId=${list.id}`)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {canWrite && (
        <button
          type="button"
          onClick={() => {
            if (activeMealTab === "menu") {
              setActiveMealTab("planner");
            }
            setAddMealDate(selectedDay || new Date());
          }}
          className="fixed bottom-28 right-5 z-[90] flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-accent px-4 text-accent-foreground shadow-xl shadow-accent/20 transition hover:scale-105 hover:bg-accent/90 active:scale-95 md:bottom-8 md:right-8 md:h-14 md:w-auto"
          aria-label="Add meal"
        >
          <Plus className="h-6 w-6" />
          <span className="hidden text-sm font-black md:inline">Add meal</span>
        </button>
      )}

      {mealToDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-xl font-black tracking-tight text-slate-950">
                    Delete meal?
                  </h2>

                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                    This will remove {mealToDelete.name || "this meal"} from the
                    weekly meal plan.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => !deletingMeal && setMealToDelete(null)}
                disabled={deletingMeal}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-100 transition hover:text-slate-900 disabled:opacity-50"
                aria-label="Close delete meal dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setMealToDelete(null)}
                disabled={deletingMeal}
                className="rounded-2xl font-black"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={confirmDeleteMeal}
                disabled={deletingMeal}
                className="rounded-2xl bg-red-600 font-black text-white hover:bg-red-700"
              >
                {deletingMeal ? "Deleting..." : "Delete meal"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {addMealDate && (
        <AddMealDialog
          date={addMealDate}
          onClose={() => setAddMealDate(null)}
          onSuccess={async () => {
            await loadMeals();
            setAddMealDate(null);
          }}
        />
      )}
    </div>
  );
}
