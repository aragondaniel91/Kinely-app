import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import {
  format,
  addDays,
  startOfWeek,
  isToday as dateFnsIsToday,
} from "date-fns";

import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import AddMealDialog from "@/components/meals/AddMealDialog";

const mealTypeConfig = {
  breakfast: {
    label: "Breakfast",
    emoji: "☕",
    color: "from-amber-400 to-orange-300",
  },
  lunch: {
    label: "Lunch",
    emoji: "🌞",
    color: "from-orange-400 to-yellow-300",
  },
  dinner: {
    label: "Dinner",
    emoji: "🌙",
    color: "from-indigo-500 to-purple-400",
  },
  snack: {
    label: "Snack",
    emoji: "🍎",
    color: "from-green-400 to-emerald-300",
  },
};

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

function MealCard({ meal, onDelete, canWrite }) {
  const config = mealTypeConfig[meal.meal_type] || mealTypeConfig.snack;
  const img =
    meal.image_url || FOOD_IMAGES[meal.meal_type] || FOOD_IMAGES.default;

  return (
    <div className="rounded-xl overflow-hidden border shadow-sm group bg-card">
      <div className="h-24 relative">
        <img
          src={img}
          alt={meal.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = FOOD_IMAGES.default;
          }}
        />

        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-40",
            config.color
          )}
        />

        <div className="absolute top-1.5 left-1.5">
          <span className="bg-white/90 backdrop-blur-sm text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
            {config.emoji} {config.label}
          </span>
        </div>

        {canWrite && (
          <button
            onClick={() => onDelete(meal.id)}
            className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-black/50 text-white rounded-full p-1 transition-opacity"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="p-2 text-sm">
        <p className="font-bold leading-tight">{meal.name}</p>

        {meal.notes && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {meal.notes}
          </p>
        )}
      </div>
    </div>
  );
}

function DayColumn({ day, meals, onAdd, onDelete, canWrite }) {
  const isToday = dateFnsIsToday(day);

  return (
    <div
      className={cn(
        "flex-shrink-0 w-52 flex flex-col rounded-2xl p-3 border",
        isToday ? "bg-primary/5 border-primary/40" : "bg-muted/30 border-border"
      )}
    >
      <div className="mb-3">
        <div
          className={cn(
            "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-bold font-heading",
            isToday
              ? "bg-primary text-primary-foreground"
              : "bg-background border border-border text-foreground"
          )}
        >
          {isToday && (
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          )}
          {format(day, "EEE")}
        </div>

        <p className="text-xs text-muted-foreground mt-1 ml-1">
          {format(day, "MMM d")}
        </p>
      </div>

      <div className="flex-1 space-y-2">
        {meals.map((meal) => (
          <MealCard
            key={meal.id}
            meal={meal}
            onDelete={onDelete}
            canWrite={canWrite}
          />
        ))}
      </div>

      {canWrite && (
        <button
          onClick={() => onAdd(day)}
          className="mt-3 border-2 border-dashed rounded-xl p-2 text-sm flex items-center justify-center gap-1 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add meal
        </button>
      )}
    </div>
  );
}

export default function Meals() {
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date()));
  const [addMealDate, setAddMealDate] = useState(null);
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);

  const { familyId, perms } = useFamily();

  const canRead = perms?.meals?.read !== false;
  const canWrite = perms?.meals?.write !== false;

  const weekEnd = addDays(weekStart, 6);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const loadMeals = async () => {
    if (!familyId || !canRead) {
      setMeals([]);
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
    } catch (error) {
      console.error("Error loading meals:", error);
      setMeals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, canRead, weekStart]);

  const deleteMeal = async (id) => {
    if (!canWrite) return;

    const confirmDelete = window.confirm("Delete this meal?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "meals", id));
      await loadMeals();
    } catch (error) {
      console.error("Error deleting meal:", error);
      alert(`There was an error deleting the meal: ${error.message}`);
    }
  };

  const getMealsForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return meals.filter((m) => m.date === dateStr);
  };

  if (!canRead) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold font-heading mb-2">Meal Planner</h1>
        <p className="text-muted-foreground">
          You do not have access to meals for this family.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold font-heading">Meal Planner</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Loading meals..." : `${meals.length} meals this week`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addDays(weekStart, -7))}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <span className="text-sm font-semibold font-heading min-w-[140px] text-center">
            {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d")}
          </span>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(addDays(weekStart, 7))}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
          {weekDays.map((day) => (
            <DayColumn
              key={day.toISOString()}
              day={day}
              meals={getMealsForDate(day)}
              onAdd={(d) => setAddMealDate(d)}
              onDelete={deleteMeal}
              canWrite={canWrite}
            />
          ))}
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
