import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { format } from "date-fns";
import {
  Apple,
  CalendarDays,
  Coffee,
  Image,
  ListChecks,
  Moon,
  Plus,
  Search,
  Sparkles,
  Sun,
  UtensilsCrossed,
  X,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { getFamilyScopedDocSnaps } from "@/lib/firestoreFamilyQueries";
import { cn } from "@/lib/utils";
import { queueFamilyActivity } from "@/services/familyActivityService";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";

const mealOrder = ["breakfast", "lunch", "snack", "dinner"];
const PANTRY_COLLECTION = "familyPantryItems";

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
  snack: {
    label: "Snack",
    helper: "Quick bite",
    emoji: "🍎",
    icon: Apple,
    tone: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    panel: "from-emerald-50 via-green-50 to-white",
  },
  dinner: {
    label: "Dinner",
    helper: "Family table",
    emoji: "🌙",
    icon: Moon,
    tone: "bg-violet-50 text-violet-700 ring-violet-100",
    panel: "from-violet-50 via-indigo-50 to-white",
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

function getMealConfig(type = "lunch") {
  return mealTypeConfig[type] || mealTypeConfig.lunch;
}

function getCreatorName(profile = null, user = null) {
  return (
    profile?.displayName ||
    profile?.fullName ||
    profile?.name ||
    user?.displayName ||
    "Unknown member"
  );
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
  };
}

function normalizeIngredientKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}


function MealTypeButton({ type, selected, onSelect }) {
  const config = getMealConfig(type);
  const Icon = config.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(type)}
      className={cn(
        "rounded-[1.5rem] border p-3 text-left transition",
        selected
          ? "border-accent/20 bg-accent/10 shadow-[0_14px_32px_rgba(15,23,42,0.06)]"
          : "border-slate-100 bg-white hover:border-accent/15 hover:bg-secondary/40"
      )}
    >
      <div
        className={cn(
          "mb-2 flex h-10 w-10 items-center justify-center rounded-2xl ring-1",
          selected ? "bg-accent text-accent-foreground ring-accent/20" : config.tone
        )}
      >
        <Icon className="h-5 w-5" />
      </div>

      <p className="text-sm font-black text-slate-950">{config.label}</p>
      <p className="mt-0.5 text-xs font-bold text-slate-400">{config.helper}</p>
    </button>
  );
}

function TemplateCard({
  template,
  selectedType,
  onSelectedTypeChange,
  onAdd,
  onAddWithList,
  saving,
}) {
  const config = getMealConfig(selectedType || template.mealType || template.meal_type);
  const Icon = config.icon;
  const ingredients = Array.isArray(template.ingredients) ? template.ingredients : [];

  return (
    <div
      className={cn(
        "rounded-[1.75rem] border border-white/80 bg-gradient-to-br p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]",
        config.panel
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1",
            config.tone
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <h4 className="text-lg font-black leading-tight text-slate-950">
            {template.name}
          </h4>

          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
            {template.notes ||
              `${ingredients.length} ingredient${ingredients.length === 1 ? "" : "s"}`}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {ingredients.slice(0, 4).map((ingredient) => (
              <span
                key={ingredient}
                className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black text-slate-500 ring-1 ring-slate-100"
              >
                {ingredient}
              </span>
            ))}

            {ingredients.length > 4 && (
              <span className="rounded-full bg-white/80 px-2 py-1 text-[10px] font-black text-slate-400 ring-1 ring-slate-100">
                +{ingredients.length - 4}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-white/70 p-2 ring-1 ring-white/80">
        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          Add as
        </p>

        <div className="grid grid-cols-4 gap-1.5">
          {mealOrder.map((type) => {
            const typeConfig = getMealConfig(type);
            const TypeIcon = typeConfig.icon;
            const active = selectedType === type;

            return (
              <button
                key={type}
                type="button"
                onClick={() => onSelectedTypeChange(type)}
                className={cn(
                  "flex h-10 items-center justify-center rounded-xl transition ring-1",
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
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          onClick={onAdd}
          disabled={saving}
          className="rounded-2xl bg-white font-black text-accent ring-1 ring-accent/15 hover:bg-accent/10"
        >
          <CalendarDays className="mr-2 h-4 w-4" />
          {saving ? "Adding..." : "Add to day"}
        </Button>

        <Button
          type="button"
          onClick={onAddWithList}
          disabled={saving || !ingredients.length}
          className="rounded-2xl bg-emerald-50 font-black text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100 disabled:opacity-50"
        >
          <ListChecks className="mr-2 h-4 w-4" />
          Add + list
        </Button>
      </div>
    </div>
  );
}

export default function AddMealDialog({ date, onClose, onSuccess, prefill }) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [mode, setMode] = useState("menu");
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateFilter, setTemplateFilter] = useState("all");
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateMealTypes, setTemplateMealTypes] = useState({});
  const [savingTemplateId, setSavingTemplateId] = useState("");

  const [name, setName] = useState(prefill?.name || "");
  const [mealType, setMealType] = useState(prefill?.meal_type || "lunch");
  const [notes, setNotes] = useState(prefill?.notes || "");
  const [imageUrl, setImageUrl] = useState(prefill?.image_url || "");
  const [createGroceryList, setCreateGroceryList] = useState(false);
  const [saving, setSaving] = useState(false);

  const { familyId, user, profile } = useFamily();

  const config = getMealConfig(mealType);
  const Icon = config.icon;
  const previewImg = imageUrl || FOOD_IMAGES[mealType] || FOOD_IMAGES.default;

  useEffect(() => {
    let cancelled = false;

    async function loadTemplates() {
      if (!familyId) {
        setTemplates([]);
        setLoadingTemplates(false);
        setMode("new");
        return;
      }

      setLoadingTemplates(true);

      try {
        const templateDocs = await getFamilyScopedDocSnaps("mealTemplates", familyId);

        if (cancelled) return;

        const data = templateDocs.map(normalizeMealTemplate).sort((a, b) => {
          const order = { breakfast: 1, lunch: 2, snack: 3, dinner: 4 };
          const typeCompare =
            (order[a.mealType || a.meal_type] || 99) -
            (order[b.mealType || b.meal_type] || 99);

          if (typeCompare !== 0) return typeCompare;
          return (a.name || "").localeCompare(b.name || "");
        });

        setTemplates(data);

        const initialTypes = data.reduce((acc, template) => {
          acc[template.id] = template.mealType || template.meal_type || "dinner";
          return acc;
        }, {});
        setTemplateMealTypes(initialTypes);

        if (!data.length) setMode("new");
      } catch (error) {
        console.error("Error loading meal templates:", error);

        if (!cancelled) {
          setTemplates([]);
          setMode("new");
        }
      } finally {
        if (!cancelled) setLoadingTemplates(false);
      }
    }

    loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [familyId]);

  const visibleTemplates = useMemo(() => {
    const queryText = templateSearch.trim().toLowerCase();

    return templates.filter((template) => {
      const type = template.mealType || template.meal_type || "dinner";
      const matchesFilter = templateFilter === "all" || type === templateFilter;
      const matchesSearch =
        !queryText ||
        template.name?.toLowerCase().includes(queryText) ||
        template.notes?.toLowerCase().includes(queryText) ||
        template.ingredients?.some((ingredient) =>
          String(ingredient || "").toLowerCase().includes(queryText)
        );

      return matchesFilter && matchesSearch;
    });
  }, [templates, templateFilter, templateSearch]);

  async function createListForMeal({
    mealId,
    mealTitle,
    mealNotes,
    ingredients = [],
    allowEmptyList = false,
  }) {
    const cleanIngredients = Array.isArray(ingredients)
      ? ingredients.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    const pantryDocs = await getFamilyScopedDocSnaps(PANTRY_COLLECTION, familyId);

    const pantryByName = new Map();

    pantryDocs.forEach((docSnap) => {
      const data = docSnap.data();
      const key = normalizeIngredientKey(data.title || data.name || "");
      const status = String(data.status || "in_stock").toLowerCase();

      if (key && status !== "archived") {
        pantryByName.set(key, status);
      }
    });

    const ingredientsToBuy = cleanIngredients.filter((ingredient) => {
      const pantryStatus = pantryByName.get(normalizeIngredientKey(ingredient));

      return pantryStatus !== "in_stock";
    });

    const skippedInStockCount = cleanIngredients.length - ingredientsToBuy.length;
    const listItems = allowEmptyList ? cleanIngredients : ingredientsToBuy;

    if (!allowEmptyList && listItems.length === 0) {
      return {
        listRef: null,
        addedCount: 0,
        skippedInStockCount,
      };
    }

    const listRef = await addDoc(collection(db, "familyLists"), {
      title: `${mealTitle || "Meal"} ingredients`,
      type: "meal",
      description: mealNotes || `Shopping list for ${mealTitle || "this meal"}`,
      status: "active",

      familyId,

      linkedMealId: mealId,
      linkedMealTitle: mealTitle || "",

      source: "meal",

      assignedToPersonId: "family",
      assignedToPersonName: "Family",

      createdBy: user?.uid || null,
      createdByEmail: user?.email || null,
      createdByName: getCreatorName(profile, user),

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await Promise.all(
      listItems.map((ingredient) => {
        const title = String(ingredient || "").trim();
        if (!title) return Promise.resolve();

        return addDoc(collection(db, "familyListItems"), {
          title,
          name: title,
          quantity: "",
          note: "",
          status: "needed",
          checked: false,

          listId: listRef.id,
          listTitle: `${mealTitle || "Meal"} ingredients`,
          listType: "meal",

          familyId,

          source: "mealTemplate",
          linkedMealId: mealId,
          linkedMealTitle: mealTitle || "",

          createdBy: user?.uid || null,
          createdByEmail: user?.email || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      })
    );

    queueFamilyActivity({
      familyId,
      user,
      profile,
      module: "lists",
      type: "list_created",
      title: `List created: ${mealTitle || "Meal"} ingredients`,
      description: "Created from a meal plan.",
      entityType: "familyList",
      entityId: listRef.id,
      date,
    });

    return {
      listRef,
      addedCount: listItems.length,
      skippedInStockCount,
    };
  }

  const saveMealFromTemplate = async (template, options = {}) => {
    if (!familyId || !template?.id || savingTemplateId) return;

    const selectedType =
      templateMealTypes[template.id] || template.mealType || template.meal_type || "dinner";

    const ingredients = Array.isArray(template.ingredients)
      ? template.ingredients.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    const shouldCreateGroceryList = options?.createGroceryList === true && ingredients.length > 0;

    setSavingTemplateId(template.id);

    try {
      const mealRef = await addDoc(collection(db, "meals"), {
        date: format(date, "yyyy-MM-dd"),

        mealType: selectedType,

        name: template.name || "Meal",
        notes: template.notes || "",
        imageUrl: "",

        templateId: template.id,

        familyId,
        familyName: profile?.family_name || profile?.familyName || "",

        createdBy: user?.uid || null,
        createdByEmail: user?.email || null,
        createdByName: getCreatorName(profile, user),

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      queueFamilyActivity({
        familyId,
        user,
        profile,
        module: "meals",
        type: "meal_created",
        title: `Meal added: ${template.name || "Meal"}`,
        description: `${selectedType} for ${format(date, "EEEE")}`,
        entityType: "meal",
        entityId: mealRef.id,
        date,
      });

      let listRef = null;
      let grocerySummary = {
        addedCount: 0,
        skippedInStockCount: 0,
      };

      if (shouldCreateGroceryList) {
        grocerySummary = await createListForMeal({
          mealId: mealRef.id,
          mealTitle: template.name || "Meal",
          mealNotes: template.notes || "",
          ingredients,
        });

        listRef = grocerySummary.listRef;
      }

      toast({
        title: listRef?.id
          ? "Meal and smart list added"
          : shouldCreateGroceryList
            ? "Meal added, pantry already stocked"
            : "Meal added",
        description: listRef?.id
          ? `${grocerySummary.addedCount} item${grocerySummary.addedCount === 1 ? "" : "s"} added. ${grocerySummary.skippedInStockCount} already in stock.`
          : shouldCreateGroceryList
            ? `${template.name} was added. All ingredients were already in stock.`
            : `${template.name} was added to ${format(date, "EEEE")}.`,
        duration: 3500,
      });

      await onSuccess?.();

      if (listRef?.id) {
        navigate(`/lists?listId=${listRef.id}`);
      }
    } catch (error) {
      console.error("Error adding meal from template:", error);

      toast({
        title: "Could not add meal",
        description: error?.message || "Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setSavingTemplateId("");
    }
  };

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

        mealType,

        name: name.trim(),
        notes: notes.trim() || "",
        imageUrl: imageUrl.trim() || "",

        familyId,
        familyName: profile?.family_name || profile?.familyName || "",

        createdBy: user?.uid || null,
        createdByEmail: user?.email || null,
        createdByName: getCreatorName(profile, user),

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      queueFamilyActivity({
        familyId,
        user,
        profile,
        module: "meals",
        type: "meal_created",
        title: `Meal added: ${name.trim()}`,
        description: `${mealType} for ${format(date, "EEEE")}`,
        entityType: "meal",
        entityId: mealRef.id,
        date,
      });

      let listRef = null;

      if (createGroceryList) {
        const grocerySummary = await createListForMeal({
          mealId: mealRef.id,
          mealTitle: name.trim(),
          mealNotes: notes.trim() || "",
          ingredients: [],
          allowEmptyList: true,
        });

        listRef = grocerySummary.listRef;
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
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-hidden rounded-[2.25rem] border-white/80 bg-white p-0 shadow-2xl">
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

            <DialogTitle className="mt-1 text-3xl font-black tracking-tight text-white">
              {format(date, "EEEE, MMM d")}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Add a meal from the family menu or create a new meal plan for this date.
            </DialogDescription>

            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/88 px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm ring-1 ring-white/70 backdrop-blur-md">
              <Icon className="h-4 w-4" />
              {mode === "menu" ? "From Family Menu" : config.label}
            </div>
          </div>
        </div>

        <div className="border-b border-slate-100 bg-white p-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "menu", label: "Family Menu", helper: "Use saved meals" },
              { id: "new", label: "New meal", helper: "Create manually" },
            ].map((tab) => {
              const active = mode === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMode(tab.id)}
                  className={cn(
                    "rounded-[1.35rem] px-4 py-3 text-left transition",
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
        </div>

        <div className="max-h-[calc(92vh-16rem)] overflow-y-auto p-5">
          {mode === "menu" ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">
                    Family Menu
                  </p>
                  <h3 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                    Pick a saved meal
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {["all", ...mealOrder].map((type) => {
                    const active = templateFilter === type;
                    const label = type === "all" ? "All" : getMealConfig(type).label;

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTemplateFilter(type)}
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

              <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <Input
                  id="add-meal-template-search"
                  name="add-meal-template-search"
                  value={templateSearch}
                  onChange={(event) => setTemplateSearch(event.target.value)}
                  placeholder="Search meals or ingredients..."
                  className="h-9 border-0 bg-transparent px-0 font-semibold shadow-none focus-visible:ring-0"
                />
              </div>

              {loadingTemplates ? (
                <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white p-8 text-center">
                  <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-accent" />
                  <p className="text-sm font-black text-slate-400">
                    Loading Family Menu...
                  </p>
                </div>
              ) : visibleTemplates.length > 0 ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {visibleTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      selectedType={
                        templateMealTypes[template.id] ||
                        template.mealType ||
                        template.meal_type ||
                        "dinner"
                      }
                      onSelectedTypeChange={(nextType) =>
                        setTemplateMealTypes((current) => ({
                          ...current,
                          [template.id]: nextType,
                        }))
                      }
                      onAdd={() => saveMealFromTemplate(template)}
                      onAddWithList={() =>
                        saveMealFromTemplate(template, { createGroceryList: true })
                      }
                      saving={savingTemplateId === template.id}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white p-8 text-center">
                  <UtensilsCrossed className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="font-black text-slate-950">
                    No saved meals yet
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Create your first reusable meal from the Family Menu tab.
                  </p>

                  <Button
                    type="button"
                    onClick={() => setMode("new")}
                    className="mt-4 rounded-2xl bg-accent font-black text-accent-foreground hover:bg-accent/90"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create new meal
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <section>
                <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Meal type
                </p>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {mealOrder.map((type) => (
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
                    <label htmlFor="add-meal-name" className="text-sm font-black text-slate-700">
                      Meal name
                    </label>

                    <Input
                      id="add-meal-name"
                      name="add-meal-name"
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
                    <label htmlFor="add-meal-notes" className="text-sm font-black text-slate-700">
                      Notes
                    </label>

                    <Input
                      id="add-meal-notes"
                      name="add-meal-notes"
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
                    <label htmlFor="add-meal-image-url" className="text-sm font-black text-slate-700">
                      Image URL
                    </label>

                    <div className="mt-1 flex gap-2">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-100">
                        <Image className="h-5 w-5" />
                      </div>

                      <Input
                        id="add-meal-image-url"
                        name="add-meal-image-url"
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
                <div className="flex cursor-pointer items-start gap-3">
                  <Switch
                    aria-label="Create grocery list after saving"
                    checked={createGroceryList}
                    onCheckedChange={setCreateGroceryList}
                    className="mt-1"
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
                </div>
              </section>
            </>
          )}
        </div>

        {mode === "new" && (
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
              className="rounded-2xl bg-accent font-black text-accent-foreground hover:bg-accent/90"
            >
              <UtensilsCrossed className="mr-2 h-4 w-4" />
              {saving
                ? "Saving..."
                : createGroceryList
                  ? "Save meal + list"
                  : "Save meal"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
