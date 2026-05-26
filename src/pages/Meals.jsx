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
  where,
} from "firebase/firestore";

import {
  addDays,
  format,
  isToday as dateFnsIsToday,
  startOfWeek,
} from "date-fns";

import {
  AlertTriangle,
  Apple,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Cookie,
  ListChecks,
  Moon,
  Plus,
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
import { useToast } from "@/components/ui/use-toast";
import AddMealDialog from "@/components/meals/AddMealDialog";

const mealTypeConfig = {
  breakfast: {
    label: "Breakfast",
    shortLabel: "Morning",
    icon: Coffee,
    emoji: "☕",
    card: "from-amber-50 via-orange-50 to-white",
    iconTone: "bg-amber-100 text-amber-700 ring-amber-200",
    badge: "bg-amber-100 text-amber-700 ring-amber-200",
  },
  lunch: {
    label: "Lunch",
    shortLabel: "Midday",
    icon: Sun,
    emoji: "🌞",
    card: "from-orange-50 via-yellow-50 to-white",
    iconTone: "bg-orange-100 text-orange-700 ring-orange-200",
    badge: "bg-orange-100 text-orange-700 ring-orange-200",
  },
  dinner: {
    label: "Dinner",
    shortLabel: "Evening",
    icon: Moon,
    emoji: "🌙",
    card: "from-indigo-50 via-violet-50 to-white",
    iconTone: "bg-violet-100 text-violet-700 ring-violet-200",
    badge: "bg-violet-100 text-violet-700 ring-violet-200",
  },
  snack: {
    label: "Snack",
    shortLabel: "Anytime",
    icon: Apple,
    emoji: "🍎",
    card: "from-emerald-50 via-green-50 to-white",
    iconTone: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
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

function getMealConfig(type = "lunch") {
  return mealTypeConfig[type] || mealTypeConfig.snack;
}

function getMealImage(meal = {}) {
  return meal.image_url || FOOD_IMAGES[meal.meal_type] || FOOD_IMAGES.default;
}

function MealCard({ meal, onDelete, onCreateList, mealList, canWrite }) {
  const config = getMealConfig(meal.meal_type);
  const Icon = config.icon;
  const img = getMealImage(meal);

  return (
    <div className="group overflow-hidden rounded-[1.65rem] border border-white/75 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.07)] ring-1 ring-slate-100/70 transition hover:-translate-y-0.5 hover:shadow-[0_18px_42px_rgba(15,23,42,0.1)]">
      <div className="relative h-24 overflow-hidden lg:h-28">
        <img
          src={img}
          alt={meal.name || config.label}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          onError={(event) => {
            event.currentTarget.src = FOOD_IMAGES.default;
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/30 via-slate-950/5 to-white/20" />

        <div className="absolute left-3 top-3 flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 backdrop-blur-md",
              config.badge
            )}
          >
            {config.emoji} {config.label}
          </span>
        </div>

        {canWrite && (
          <button
            type="button"
            onClick={() => onDelete?.(meal)}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/88 text-slate-500 opacity-0 shadow-sm ring-1 ring-white/70 backdrop-blur-md transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
            aria-label="Delete meal"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className={cn("bg-gradient-to-br p-3.5", config.card)}>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1",
              config.iconTone
            )}
          >
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-base font-black leading-tight tracking-tight text-slate-950">
              {meal.name || "Untitled meal"}
            </p>

            <p className="mt-0.5 text-xs font-bold text-slate-500">
              {config.shortLabel}
              {meal.notes ? ` · ${meal.notes}` : ""}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onCreateList?.(meal)}
          className={cn(
            "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2 text-xs font-black transition ring-1",
            mealList
              ? "bg-blue-50 text-blue-700 ring-blue-100 hover:bg-blue-100"
              : "bg-white/88 text-emerald-700 ring-emerald-100 hover:bg-emerald-50"
          )}
        >
          <ListChecks className="h-4 w-4" />
          {mealList ? "View grocery list" : "Create grocery list"}
        </button>
      </div>
    </div>
  );
}

function EmptyMealSlot({ day, canWrite, onAdd }) {
  return (
    <button
      type="button"
      onClick={() => canWrite && onAdd?.(day)}
      disabled={!canWrite}
      className="flex min-h-[132px] w-full flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-slate-200 bg-white/55 px-4 py-5 text-center transition hover:border-blue-200 hover:bg-blue-50/40 disabled:cursor-default disabled:hover:border-slate-200 disabled:hover:bg-white/55"
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 ring-1 ring-slate-100">
        <UtensilsCrossed className="h-5 w-5" />
      </div>

      <p className="text-sm font-black text-slate-600">No meals planned</p>
      {canWrite && (
        <p className="mt-1 text-xs font-bold text-slate-400">Tap to add one</p>
      )}
    </button>
  );
}

function DayColumn({
  day,
  meals,
  onAdd,
  onDelete,
  onCreateMealList,
  listsByMealId,
  canWrite,
}) {
  const isToday = dateFnsIsToday(day);

  return (
    <div
      className={cn(
        "flex min-h-[420px] flex-col overflow-hidden rounded-[2rem] border shadow-[0_18px_42px_rgba(15,23,42,0.06)] backdrop-blur-xl",
        isToday
          ? "border-blue-200 bg-blue-50/55"
          : "border-white/80 bg-white/68"
      )}
    >
      <div
        className={cn(
          "border-b p-4",
          isToday
            ? "border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50"
            : "border-slate-100 bg-gradient-to-br from-white via-slate-50/70 to-white"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p
              className={cn(
                "text-xs font-black uppercase tracking-[0.2em]",
                isToday ? "text-blue-600" : "text-slate-400"
              )}
            >
              {isToday ? "Today" : format(day, "EEEE")}
            </p>

            <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              {format(day, "EEE")}
            </h3>

            <p className="text-sm font-bold text-slate-500">
              {format(day, "MMM d")}
            </p>
          </div>

          <div
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-2xl ring-1",
              isToday
                ? "bg-blue-600 text-white ring-blue-200"
                : "bg-white text-slate-400 ring-slate-100"
            )}
          >
            <CalendarDays className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {meals.length > 0 ? (
          meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onDelete={onDelete}
              onCreateList={onCreateMealList}
              mealList={listsByMealId[meal.id]}
              canWrite={canWrite}
            />
          ))
        ) : (
          <EmptyMealSlot day={day} canWrite={canWrite} onAdd={onAdd} />
        )}
      </div>

      {canWrite && (
        <div className="border-t border-white/75 bg-white/70 p-3">
          <button
            type="button"
            onClick={() => onAdd(day)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Add meal
          </button>
        </div>
      )}
    </div>
  );
}

export default function Meals() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [addMealDate, setAddMealDate] = useState(null);
  const [mealToDelete, setMealToDelete] = useState(null);
  const [deletingMeal, setDeletingMeal] = useState(false);
  const [meals, setMeals] = useState([]);
  const [mealLists, setMealLists] = useState([]);
  const [loading, setLoading] = useState(true);

  const { familyId, user, profile, perms } = useFamily();

  const canRead = perms?.meals?.read !== false;
  const canWrite = perms?.meals?.write !== false;

  const weekEnd = addDays(weekStart, 6);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }, [weekStart]);

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
    } catch (error) {
      console.error("Error loading meals:", error);
      setMeals([]);
      setMealLists([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, canRead, weekStart]);

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
                Family meals for the week
              </h1>

              <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-500">
                Plan breakfast, lunch, dinner, and snacks. Turn any meal into a
                grocery list when you need ingredients.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-100">
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  {loading ? "Loading..." : `${meals.length} meals this week`}
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 ring-1 ring-blue-100">
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
                onClick={() => setWeekStart(startOfWeek(new Date()))}
                className="mt-2 w-full rounded-2xl bg-white font-black"
              >
                This week
              </Button>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex min-h-[520px] items-center justify-center rounded-[2rem] border border-white/80 bg-white/82 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl">
            <div className="text-center">
              <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
              <p className="text-sm font-black text-slate-400">
                Loading family meals...
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-7">
            {weekDays.map((day) => (
              <DayColumn
                key={day.toISOString()}
                day={day}
                meals={getMealsForDate(day)}
                onAdd={(date) => setAddMealDate(date)}
                onDelete={requestDeleteMeal}
                onCreateMealList={createOrViewMealList}
                listsByMealId={listsByMealId}
                canWrite={canWrite}
              />
            ))}
          </div>
        )}
      </div>

      {canWrite && (
        <button
          type="button"
          onClick={() => setAddMealDate(new Date())}
          className="fixed bottom-28 right-5 z-[90] flex h-14 w-14 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-white shadow-xl shadow-slate-950/20 transition hover:scale-105 hover:bg-slate-800 active:scale-95 md:bottom-8 md:right-8 md:h-14 md:w-auto"
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
