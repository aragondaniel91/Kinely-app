import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import {
  AlertTriangle,
  Apple,
  ArchiveRestore,
  CalendarDays,
  Check,
  CheckSquare,
  CircleDot,
  Cookie,
  Croissant,
  GraduationCap,
  Milk,
  ListChecks,
  Package,
  ShoppingCart,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  UtensilsCrossed,
  Warehouse,
  X,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { getFamilyScopedDocSnaps } from "@/lib/firestoreFamilyQueries";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { TASK_COLLECTIONS } from "@/features/tasks/model/taskTypes";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LIST_COLLECTION = "familyLists";
const ITEM_COLLECTION = "familyListItems";
const PANTRY_COLLECTION = "familyPantryItems";

const pantryStatusConfig = {
  in_stock: {
    label: "In stock",
    color: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  low: {
    label: "Low",
    color: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  out: {
    label: "Out",
    color: "bg-red-50 text-red-700 ring-red-100",
  },
};

const pantryCategoryConfig = {
  breakfast: {
    label: "Food basics",
    icon: Milk,
    color: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  easy_dinners: {
    label: "Meals & cooking",
    icon: UtensilsCrossed,
    color: "bg-orange-50 text-orange-700 ring-orange-100",
  },
  kid_snacks: {
    label: "Snacks",
    icon: Apple,
    color: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  household: {
    label: "Home supplies",
    icon: Warehouse,
    color: "bg-slate-50 text-slate-700 ring-slate-100",
  },
  school: {
    label: "School & kids",
    icon: GraduationCap,
    color: "bg-sky-50 text-sky-700 ring-sky-100",
  },
  freezer: {
    label: "Freezer",
    icon: Package,
    color: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  },
  drinks: {
    label: "Drinks",
    icon: Cookie,
    color: "bg-violet-50 text-violet-700 ring-violet-100",
  },
  other: {
    label: "Personal / Other",
    icon: Package,
    color: "bg-zinc-50 text-zinc-700 ring-zinc-100",
  },
};

const starterPantryItems = [
  { title: "Milk", category: "breakfast" },
  { title: "Eggs", category: "breakfast" },
  { title: "Bread", category: "breakfast" },
  { title: "Cereal", category: "breakfast" },
  { title: "Oatmeal", category: "breakfast" },
  { title: "Yogurt", category: "breakfast" },
  { title: "Bananas", category: "breakfast" },
  { title: "Pasta", category: "easy_dinners" },
  { title: "Pasta sauce", category: "easy_dinners" },
  { title: "Rice", category: "easy_dinners" },
  { title: "Tortillas", category: "easy_dinners" },
  { title: "Ground beef", category: "easy_dinners" },
  { title: "Chicken", category: "easy_dinners" },
  { title: "Cheese", category: "easy_dinners" },
  { title: "Frozen vegetables", category: "easy_dinners" },
  { title: "Mac and cheese", category: "easy_dinners" },
  { title: "Apples", category: "kid_snacks" },
  { title: "Crackers", category: "kid_snacks" },
  { title: "Granola bars", category: "kid_snacks" },
  { title: "Fruit cups", category: "kid_snacks" },
  { title: "Popcorn", category: "kid_snacks" },
  { title: "Yogurt pouches", category: "kid_snacks" },
  { title: "Toilet paper", category: "household" },
  { title: "Paper towels", category: "household" },
  { title: "Trash bags", category: "household" },
  { title: "Dish soap", category: "household" },
  { title: "Laundry detergent", category: "household" },
  { title: "Hand soap", category: "household" },
  { title: "Wipes", category: "household" },
  { title: "Lunch bags", category: "school" },
  { title: "Water bottles", category: "school" },
  { title: "Snack bags", category: "school" },
  { title: "Juice boxes", category: "school" },
  { title: "Chicken nuggets", category: "freezer" },
  { title: "Frozen fruit", category: "freezer" },
  { title: "Frozen pizza", category: "freezer" },
  { title: "Water", category: "drinks" },
  { title: "Juice", category: "drinks" },
];

const listTypeConfig = {
  groceries: {
    icon: Apple,
    label: "Groceries",
    color: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  household: {
    icon: Warehouse,
    label: "Home supplies",
    color: "bg-slate-50 text-slate-700 ring-slate-100",
  },
  school: {
    icon: GraduationCap,
    label: "School",
    color: "bg-sky-50 text-sky-700 ring-sky-100",
  },
  car: {
    icon: Package,
    label: "Car",
    color: "bg-zinc-50 text-zinc-700 ring-zinc-100",
  },
  meal: {
    icon: UtensilsCrossed,
    label: "Meal",
    color: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  event: {
    icon: CalendarDays,
    label: "Event",
    color: "bg-violet-50 text-violet-700 ring-violet-100",
  },
  trip: {
    icon: Croissant,
    label: "Trip",
    color: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  },
  gifts: {
    icon: Cookie,
    label: "Gifts",
    color: "bg-pink-50 text-pink-700 ring-pink-100",
  },
  other: {
    icon: CircleDot,
    label: "Other",
    color: "bg-slate-50 text-slate-700 ring-slate-100",
  },
};

function timestampKey(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value?.toDate) return value.toDate().toISOString();
  return "";
}

function normalizeList(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    ...data,
    title: data.title || "Untitled list",
    type: data.type || "other",
    status: data.status || "active",
    description: data.description || "",
    assignedToPersonId: data.assignedToPersonId || data.assigned_to_person_id || "family",
    assignedToPersonName: data.assignedToPersonName || data.assigned_to_person_name || "Family",
    createdBy: data.createdBy || data.created_by || "",
    createdByEmail: data.createdByEmail || data.created_by_email || "",
    createdByName:
      data.createdByName ||
      data.created_by_name ||
      data.createdByDisplayName ||
      data.created_by_display_name ||
      data.createdByEmail ||
      data.created_by_email ||
      "",
    created_date: data.created_date || timestampKey(data.createdAt),
  };
}

function normalizeItem(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    ...data,
    title: data.title || data.name || "",
    quantity: data.quantity || "",
    note: data.note || "",
    status: data.status || "needed",
    checked: data.checked === true || data.status === "done",
    listId: data.listId || data.list_id || "",
    created_date: data.created_date || timestampKey(data.createdAt),
  };
}

function normalizePantryItem(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    ...data,
    title: data.title || data.name || "",
    category: data.category || "household",
    status: data.status || "in_stock",
    note: data.note || "",
    created_date: data.created_date || timestampKey(data.createdAt),
  };
}


function ListTypeIcon({ type, className = "" }) {
  const config = listTypeConfig[type] || listTypeConfig.other;
  const Icon = config.icon;

  return <Icon className={className} />;
}

function isCalendarLinkedList(list = {}) {
  return Boolean(
    list.linkedEventId ||
      list.linked_event_id ||
      list.source === "calendar" ||
      list.source_type === "calendar"
  );
}

function getLinkedEventId(list = {}) {
  return (
    list.linkedEventId ||
    list.linked_event_id ||
    list.eventId ||
    list.event_id ||
    list.calendarEventId ||
    list.calendar_event_id ||
    list.googleCalendarEventId ||
    list.google_calendar_event_id ||
    ""
  );
}

function hasLinkedEvent(list = {}) {
  return Boolean(getLinkedEventId(list));
}



function getListSourceConfig(list = {}) {
  const source = String(list.source || list.source_type || "").toLowerCase();
  const title = String(list.title || "").trim().toLowerCase();
  const type = String(list.type || "").toLowerCase();

  if (source === "pantry" || title === "pantry refill") {
    return {
      label: "From Pantry",
      icon: ShoppingCart,
      color: "bg-emerald-50 text-emerald-700 ring-emerald-100",
      context: "Built from Pantry items marked Low or Out.",
    };
  }

  if (
    source === "meal" ||
    type === "meal" ||
    list.linkedMealId ||
    list.linked_meal_id
  ) {
    return {
      label: "From Meal",
      icon: UtensilsCrossed,
      color: "bg-amber-50 text-amber-700 ring-amber-100",
      context: "Connected to meal planning or Family Menu ingredients.",
    };
  }

  if (isCalendarLinkedList(list) || source === "event") {
    return {
      label: "From Calendar",
      icon: CalendarDays,
      color: "bg-violet-50 text-violet-700 ring-violet-100",
      context: "Connected to a family calendar event.",
    };
  }

  if (source === "tasks" || source === "task") {
    return {
      label: "From Tasks",
      icon: CheckSquare,
      color: "bg-blue-50 text-blue-700 ring-blue-100",
      context: "Connected to family tasks.",
    };
  }

  if (type === "school") {
    return {
      label: "School list",
      icon: GraduationCap,
      color: "bg-sky-50 text-sky-700 ring-sky-100",
      context: "School, kids, or project supplies.",
    };
  }

  if (type === "trip") {
    return {
      label: "Trip list",
      icon: Croissant,
      color: "bg-cyan-50 text-cyan-700 ring-cyan-100",
      context: "Packing, travel, and family trip planning.",
    };
  }

  return {
    label: "Manual list",
    icon: ListChecks,
    color: "bg-slate-50 text-slate-600 ring-slate-100",
    context: "Created directly by the family.",
  };
}

function ListSourceBadge({ list, compact = false }) {
  const sourceConfig = getListSourceConfig(list);
  const SourceIcon = sourceConfig.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-black ring-1",
        compact
          ? "px-2 py-1 text-[10px]"
          : "px-3 py-1.5 text-xs",
        sourceConfig.color
      )}
    >
      <SourceIcon className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {sourceConfig.label}
    </span>
  );
}

function ListContextNote({ list }) {
  const sourceConfig = getListSourceConfig(list);

  return (
    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[10px] font-black text-slate-500 ring-1 ring-slate-100">
      <CircleDot className="h-3 w-3" />
      {sourceConfig.context}
    </span>
  );
}


function normalizePersonName(value, fallback = "Family") {
  return String(value || fallback || "").trim() || fallback;
}

function buildListPeopleOptions({ familyPeople = [], familyAdults = [], children = [], familyChildrenCore = [], user = null } = {}) {
  const peopleById = new Map();

  peopleById.set("family", {
    id: "family",
    name: "Family",
    role: "Together",
  });

  [...children, ...familyChildrenCore].forEach((child) => {
    const id = child.id || child.childId || child.child_id || child.name;
    const name = child.name || child.displayName || child.fullName || "Child";

    if (!id || !name) return;

    peopleById.set(id, {
      id,
      name,
      role: "Child",
    });
  });

  [...familyAdults, ...familyPeople].forEach((person) => {
    const id =
      person.id ||
      person.uid ||
      person.personId ||
      person.person_id ||
      person.email ||
      "";

    const name =
      person.name ||
      person.displayName ||
      person.fullName ||
      person.label ||
      person.email ||
      "";

    if (!id || !name) return;

    peopleById.set(id, {
      id,
      name,
      role: person.role || person.relationship || "Family",
    });
  });

  if (user?.uid && !peopleById.has(user.uid)) {
    peopleById.set(user.uid, {
      id: user.uid,
      name: user.displayName || user.email || "Me",
      role: "Me",
    });
  }

  return Array.from(peopleById.values());
}

function getCleanDisplayName(value = "") {
  const name = String(value || "").trim();

  if (!name || name.includes("@")) return "";

  return name;
}

function normalizeItemKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, "")
    .replace(/\s+/g, " ");
}


function getProfileDisplayName(profile = null, user = null) {
  return (
    getCleanDisplayName(profile?.displayName) ||
    getCleanDisplayName(profile?.fullName) ||
    getCleanDisplayName(profile?.name) ||
    getCleanDisplayName(user?.displayName) ||
    ""
  );
}

function getPersonNameFromOptions(peopleOptions = [], identifiers = []) {
  const validIdentifiers = identifiers.filter(Boolean);

  if (!validIdentifiers.length) return "";

  const match = peopleOptions.find((person) => {
    return validIdentifiers.some((value) => {
      return (
        person.id === value ||
        person.uid === value ||
        person.personId === value ||
        person.person_id === value ||
        person.email === value
      );
    });
  });

  return (
    getCleanDisplayName(match?.name) ||
    getCleanDisplayName(match?.displayName) ||
    getCleanDisplayName(match?.fullName) ||
    ""
  );
}

function getListCreatorLabel(list = {}, currentUserContext = {}) {
  const { user = null, profile = null, peopleOptions = [] } = currentUserContext;

  const createdById = list.createdBy || list.created_by || "";
  const createdByEmail = list.createdByEmail || list.created_by_email || "";

  const storedName =
    getCleanDisplayName(list.createdByName) ||
    getCleanDisplayName(list.created_by_name) ||
    getCleanDisplayName(list.createdByDisplayName) ||
    getCleanDisplayName(list.created_by_display_name);

  if (storedName) return storedName;

  const memberName = getPersonNameFromOptions(peopleOptions, [createdById, createdByEmail]);

  if (memberName) return memberName;

  if (user?.uid && createdById && createdById === user.uid) {
    return getProfileDisplayName(profile, user) || "Unknown member";
  }

  return "Unknown member";
}

function PantryStatusButton({ status, active, onClick }) {
  const config = pantryStatusConfig[status] || pantryStatusConfig.in_stock;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ring-1 transition",
        active ? config.color : "bg-white text-slate-400 ring-slate-100 hover:bg-slate-50"
      )}
    >
      {config.label}
    </button>
  );
}

function PantryItemCard({
  item,
  canWrite,
  alreadyInRefillList,
  onStatusChange,
  onEdit,
  onArchive,
}) {
  const categoryConfig = pantryCategoryConfig[item.category] || pantryCategoryConfig.household;
  const CategoryIcon = categoryConfig.icon;

  return (
    <Card className="rounded-[1.5rem] border-white/75 bg-white/82 p-3 shadow-[0_10px_24px_rgba(38,50,56,0.045)]">
      <div className="flex items-start gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1", categoryConfig.color)}>
          <CategoryIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-950">
                {item.title}
              </p>

              <p className="mt-0.5 text-xs font-semibold text-slate-400">
                {categoryConfig.label}
                {item.note ? ` · ${item.note}` : ""}
              </p>

              {alreadyInRefillList && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                  <Check className="h-3 w-3" />
                  Already in refill list
                </span>
              )}
            </div>

            {canWrite && (
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-300 ring-1 ring-slate-100 transition hover:bg-accent/10 hover:text-accent hover:ring-accent/15"
                  aria-label="Edit pantry item"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => onArchive(item)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-300 ring-1 ring-slate-100 transition hover:bg-red-50 hover:text-red-600 hover:ring-red-100"
                  aria-label="Remove pantry item"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.keys(pantryStatusConfig).map((status) => (
              <PantryStatusButton
                key={status}
                status={status}
                active={item.status === status}
                onClick={() => onStatusChange(item, status)}
              />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function PantryPanel({
  pantryItems,
  refillItemKeys,
  activeRefillList,
  loading,
  canWrite,
  searchQuery,
  creatingStarterPantry,
  newPantryTitle,
  setNewPantryTitle,
  newPantryCategory,
  setNewPantryCategory,
  newPantryStatus,
  setNewPantryStatus,
  newPantryNote,
  setNewPantryNote,
  savingPantryItem,
  creatingRefillList,
  onAddPantryItem,
  onCreateRefillList,
  onCreateStarterPantry,
  onStatusChange,
  onEditPantryItem,
  onArchivePantryItem,
}) {
  const normalizedSearch = String(searchQuery || "").trim().toLowerCase();

  const filteredPantryItems = pantryItems.filter((item) => {
    if (!normalizedSearch) return true;

    const categoryLabel =
      pantryCategoryConfig[item.category]?.label || item.category || "";

    const haystack = [
      item.title,
      item.name,
      item.note,
      item.status,
      categoryLabel,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });

  const needToBuy = filteredPantryItems.filter(
    (item) => item.status === "low" || item.status === "out"
  );

  const needToBuyNotInRefill = needToBuy.filter(
    (item) => !refillItemKeys?.has(normalizeItemKey(item.title || item.name))
  );

  const allNeedToBuyAlreadyInRefill =
    needToBuy.length > 0 && needToBuyNotInRefill.length === 0 && activeRefillList?.id;

  const refillButtonLabel = allNeedToBuyAlreadyInRefill
    ? "Open refill list"
    : activeRefillList?.id && needToBuyNotInRefill.length > 0
      ? "Add missing to refill list"
      : "Create refill list";

  const itemsByCategory = Object.keys(pantryCategoryConfig).reduce((acc, category) => {
    acc[category] = filteredPantryItems.filter((item) => item.category === category);
    return acc;
  }, {});

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-4">
        <Card className="overflow-hidden rounded-[2rem] border-white/80 bg-white/76 shadow-[0_18px_48px_rgba(38,50,56,0.06)]">
          <div className="bg-gradient-to-br from-white via-emerald-50/60 to-amber-50/50 p-5">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-accent">
              <ShoppingCart className="h-4 w-4" />
              Pantry
            </p>

            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Home essentials
            </h2>

            <p className="mt-2 max-w-2xl text-sm font-bold leading-6 text-slate-500">
              Start with a guided pantry list, then customize it for your home:
              in stock, low, or out.
            </p>

            {canWrite && pantryItems.length === 0 && (
              <Button
                type="button"
                onClick={onCreateStarterPantry}
                disabled={creatingStarterPantry}
                className="mt-4 rounded-2xl bg-accent font-black text-accent-foreground hover:bg-accent/90"
              >
                <Plus className="mr-2 h-4 w-4" />
                {creatingStarterPantry ? "Creating..." : "Add starter pantry"}
              </Button>
            )}
          </div>
        </Card>

        {canWrite && (
          <Card className="rounded-[2rem] border-white/80 bg-white/76 p-4 shadow-[0_14px_34px_rgba(38,50,56,0.055)]">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                <Plus className="h-4 w-4" />
              </div>

              <div>
                <p className="text-sm font-black text-slate-950">
                  Add pantry item
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  Add the specific things your home actually uses.
                </p>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_140px_minmax(0,0.8fr)_auto]">
              <Input
                value={newPantryTitle}
                onChange={(event) => setNewPantryTitle(event.target.value)}
                placeholder="Coffee pods, favorite cereal, pet food..."
                className="h-11 rounded-2xl bg-white font-semibold"
                onKeyDown={(event) => event.key === "Enter" && onAddPantryItem()}
              />

              <Select value={newPantryCategory} onValueChange={setNewPantryCategory}>
                <SelectTrigger className="h-11 rounded-2xl bg-white">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {Object.entries(pantryCategoryConfig).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={newPantryStatus} onValueChange={setNewPantryStatus}>
                <SelectTrigger className="h-11 rounded-2xl bg-white">
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  {Object.entries(pantryStatusConfig).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                value={newPantryNote}
                onChange={(event) => setNewPantryNote(event.target.value)}
                placeholder="Optional note"
                className="h-11 rounded-2xl bg-white"
                onKeyDown={(event) => event.key === "Enter" && onAddPantryItem()}
              />

              <Button
                type="button"
                onClick={onAddPantryItem}
                disabled={!newPantryTitle.trim() || savingPantryItem}
                className="h-11 rounded-2xl bg-accent font-black text-accent-foreground hover:bg-accent/90"
              >
                {savingPantryItem ? "Adding..." : "Add"}
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-accent" />
          </div>
        ) : filteredPantryItems.length > 0 ? (
          Object.entries(pantryCategoryConfig).map(([category, config]) => {
            const CategoryIcon = config.icon;
            const categoryItems = itemsByCategory[category] || [];

            if (!categoryItems.length) return null;

            return (
              <section key={category}>
                <div className="mb-2 flex items-center gap-2">
                  <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl ring-1", config.color)}>
                    <CategoryIcon className="h-4 w-4" />
                  </div>

                  <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500">
                    {config.label}
                  </h3>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {categoryItems.map((item) => (
                    <PantryItemCard
                      key={item.id}
                      item={item}
                      canWrite={canWrite}
                      alreadyInRefillList={refillItemKeys?.has(
                        normalizeItemKey(item.title || item.name)
                      )}
                      onStatusChange={onStatusChange}
                      onEdit={onEditPantryItem}
                      onArchive={onArchivePantryItem}
                    />
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <Card className="rounded-[2rem] border-dashed border-slate-200 bg-white/60 p-10 text-center">
            <ShoppingCart className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="text-xl font-black text-slate-950">
              {normalizedSearch ? "No pantry matches" : "No pantry yet"}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-500">
              {normalizedSearch
                ? "Try another search or clear the search box."
                : "Add the items your family actually keeps at home."}
            </p>
          </Card>
        )}
      </section>

      <aside className="space-y-4">
        <Card className="rounded-[2rem] border-white/80 bg-white/78 p-4 shadow-[0_16px_42px_rgba(15,23,42,0.06)]">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-amber-600">
            <ListChecks className="h-4 w-4" />
            Need to buy
          </p>

          <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">
            Refill list
          </h3>

          <p className="mt-1 text-sm font-bold text-slate-500">
            Anything marked Low or Out shows here.
          </p>

          {canWrite && needToBuy.length > 0 && (
            <Button
              type="button"
              onClick={() => onCreateRefillList(needToBuy)}
              disabled={creatingRefillList}
              className="mt-4 w-full rounded-2xl bg-accent font-black text-accent-foreground hover:bg-accent/90"
            >
              <ListChecks className="mr-2 h-4 w-4" />
              {creatingRefillList ? "Working..." : refillButtonLabel}
            </Button>
          )}

          <div className="mt-4 space-y-2">
            {needToBuy.length > 0 ? (
              needToBuy.map((item) => {
                const statusConfig = pantryStatusConfig[item.status] || pantryStatusConfig.low;

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white px-3 py-3 ring-1 ring-slate-100"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">
                        {item.title}
                      </p>
                      <p className="text-xs font-bold text-slate-400">
                        {pantryCategoryConfig[item.category]?.label || "Pantry"}
                      </p>
                    </div>

                    <span className={cn("rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ring-1", statusConfig.color)}>
                      {statusConfig.label}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/55 p-5 text-center">
                <Check className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
                <p className="font-black text-slate-950">All stocked</p>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  Mark items Low or Out when something runs down.
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-[2rem] border-white/80 bg-gradient-to-br from-white via-amber-50/60 to-emerald-50/50 p-4 shadow-[0_16px_42px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
            Home mode
          </p>
          <h3 className="mt-2 text-xl font-black tracking-tight text-slate-950">
            Make it yours
          </h3>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
            Starter pantry is only a shortcut. Add your own brands, snacks,
            school items, pet supplies, or anything your family normally buys.
          </p>
        </Card>
      </aside>
    </div>
  );
}

export default function Groceries() {
  const {
    familyId,
    user,
    profile,
    perms,
    familyPeople,
    familyAdults,
    children,
    familyChildrenCore,
  } = useFamily();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const canRead =
    perms?.lists?.read !== false &&
    perms?.groceries?.read !== false &&
    perms?.meals?.read !== false;

  const canWrite =
    perms?.lists?.write !== false &&
    perms?.groceries?.write !== false &&
    perms?.meals?.write !== false;

  const peopleOptions = useMemo(
    () =>
      buildListPeopleOptions({
        familyPeople,
        familyAdults,
        children,
        familyChildrenCore,
        user,
      }),
    [familyPeople, familyAdults, children, familyChildrenCore, user]
  );

  const [lists, setLists] = useState([]);
  const [items, setItems] = useState([]);
  const [linkedTasks, setLinkedTasks] = useState([]);
  const [pantryItems, setPantryItems] = useState([]);
  const [activeListsTab, setActiveListsTab] = useState("lists");
  const [creatingStarterPantry, setCreatingStarterPantry] = useState(false);
  const [newPantryTitle, setNewPantryTitle] = useState("");
  const [newPantryCategory, setNewPantryCategory] = useState("household");
  const [newPantryStatus, setNewPantryStatus] = useState("in_stock");
  const [newPantryNote, setNewPantryNote] = useState("");
  const [savingPantryItem, setSavingPantryItem] = useState(false);
  const [creatingRefillList, setCreatingRefillList] = useState(false);
  const [pendingRefillItems, setPendingRefillItems] = useState([]);
  const [existingRefillList, setExistingRefillList] = useState(null);
  const [pantryStockPrompt, setPantryStockPrompt] = useState(null);
  const [updatingPantryFromList, setUpdatingPantryFromList] = useState(false);
  const [pantryListCompletionPrompt, setPantryListCompletionPrompt] = useState(null);
  const [completingRefillItemsFromPantry, setCompletingRefillItemsFromPantry] = useState(false);

  const [editingPantryItem, setEditingPantryItem] = useState(null);
  const [editPantryTitle, setEditPantryTitle] = useState("");
  const [editPantryCategory, setEditPantryCategory] = useState("household");
  const [editPantryStatus, setEditPantryStatus] = useState("in_stock");
  const [editPantryNote, setEditPantryNote] = useState("");
  const [savingPantryEdit, setSavingPantryEdit] = useState(false);

  const [activeListId, setActiveListId] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [linkedTasksPreviewList, setLinkedTasksPreviewList] = useState(null);
  const [linkedEventPreview, setLinkedEventPreview] = useState(null);
  const [loadingLinkedEventPreview, setLoadingLinkedEventPreview] = useState(false);
  const [showArchivedLists, setShowArchivedLists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingList, setSavingList] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  const [listsSearch, setListsSearch] = useState("");

  const [newListTitle, setNewListTitle] = useState("");
  const [newListType, setNewListType] = useState("groceries");
  const [newListAssigneePersonId, setNewListAssigneePersonId] = useState("family");
  const [newListDescription, setNewListDescription] = useState("");

  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [newItemNote, setNewItemNote] = useState("");

  const [editingListId, setEditingListId] = useState("");
  const [editListTitle, setEditListTitle] = useState("");
  const [editListType, setEditListType] = useState("groceries");
  const [editListAssigneePersonId, setEditListAssigneePersonId] = useState("family");
  const [editListDescription, setEditListDescription] = useState("");
  const [savingListEdit, setSavingListEdit] = useState(false);

  function showErrorToast(title, error) {
    toast({
      title,
      description: error?.message || "Please try again.",
      variant: "destructive",
      duration: 5000,
    });
  }

  function requestConfirmation(config) {
    setConfirmAction(config);
  }

  async function runConfirmedAction() {
    const action = confirmAction?.onConfirm;
    setConfirmAction(null);

    if (typeof action === "function") {
      await action();
    }
  }

  const loadData = async () => {
    if (!familyId || !canRead) {
      setLists([]);
      setItems([]);
      setLinkedTasks([]);
      setPantryItems([]);
      setPantryItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [listDocs, itemDocs, taskDocs, pantryDocs] = await Promise.all([
        getFamilyScopedDocSnaps(LIST_COLLECTION, familyId),
        getFamilyScopedDocSnaps(ITEM_COLLECTION, familyId),
        getFamilyScopedDocSnaps(TASK_COLLECTIONS.tasks, familyId),
        getFamilyScopedDocSnaps(PANTRY_COLLECTION, familyId),
      ]);

      const nextLists = listDocs
        .map(normalizeList)
        .sort((a, b) => {
          const aDate = a.created_date || "";
          const bDate = b.created_date || "";
          return bDate.localeCompare(aDate);
        });

      const nextItems = itemDocs
        .map(normalizeItem)
        .filter((item) => item.status !== "archived")
        .sort((a, b) => {
          const aDate = a.created_date || "";
          const bDate = b.created_date || "";
          return bDate.localeCompare(aDate);
        });

      const nextLinkedTasks = taskDocs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .filter((task) => {
          const status = String(task.status || "").toLowerCase();

          return (
            (task.linkedListId || task.linked_list_id) &&
            status !== "archived" &&
            status !== "cancelled" &&
            status !== "canceled" &&
            status !== "skipped"
          );
        });

      const nextPantryItems = pantryDocs
        .map(normalizePantryItem)
        .filter((item) => item.status !== "archived")
        .sort((a, b) => {
          const categoryCompare = (a.category || "").localeCompare(b.category || "");
          if (categoryCompare !== 0) return categoryCompare;
          return (a.title || "").localeCompare(b.title || "");
        });

      setLists(nextLists);
      setItems(nextItems);
      setLinkedTasks(nextLinkedTasks);
      setPantryItems(nextPantryItems);

      const requestedListId = searchParams.get("listId");

      const requestedList = nextLists.find((list) => list.id === requestedListId);
      const firstActiveList = nextLists.find((list) => list.status !== "archived");

      if (requestedList) {
        setShowArchivedLists(requestedList.status === "archived");
        setActiveListId(requestedList.id);
      } else if (!activeListId && firstActiveList?.id) {
        setActiveListId(firstActiveList.id);
      }
    } catch (error) {
      console.error("Error loading family lists:", error);
      setLists([]);
      setItems([]);
      setLinkedTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [familyId, canRead]);

  const tasksByListId = useMemo(() => {
    return linkedTasks.reduce((acc, task) => {
      const listId = task.linkedListId || task.linked_list_id;
      if (!listId) return acc;

      if (!acc[listId]) acc[listId] = [];
      acc[listId].push(task);

      return acc;
    }, {});
  }, [linkedTasks]);

  const activeLists = useMemo(() => {
    return lists.filter((list) => list.status !== "archived");
  }, [lists]);

  const archivedLists = useMemo(() => {
    return lists.filter((list) => list.status === "archived");
  }, [lists]);

  const visibleLists = showArchivedLists ? archivedLists : activeLists;

  const normalizedListsSearch = listsSearch.trim().toLowerCase();

  const filteredVisibleLists = useMemo(() => {
    if (!normalizedListsSearch) return visibleLists;

    return visibleLists.filter((list) => {
      const listItems = items.filter((item) => item.listId === list.id);

      const haystack = [
        list.title,
        list.description,
        list.type,
        list.assignedToPersonName,
        ...listItems.flatMap((item) => [
          item.title,
          item.quantity,
          item.note,
          item.status,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedListsSearch);
    });
  }, [visibleLists, items, normalizedListsSearch]);

  const itemsByListId = useMemo(() => {
    return items.reduce((acc, item) => {
      const listId = item.listId;
      if (!listId) return acc;

      if (!acc[listId]) acc[listId] = [];
      acc[listId].push(item);

      return acc;
    }, {});
  }, [items]);

  const activeList = useMemo(() => {
    return (
      filteredVisibleLists.find((list) => list.id === activeListId) ||
      filteredVisibleLists[0] ||
      null
    );
  }, [filteredVisibleLists, activeListId]);

  const activeItems = activeList ? itemsByListId[activeList.id] || [] : [];
  const neededItems = activeItems.filter((item) => !item.checked);
  const doneItems = activeItems.filter((item) => item.checked);
  const activeListIds = new Set(activeLists.map((list) => list.id));
  const totalOpenItems = items.filter(
    (item) => !item.checked && activeListIds.has(item.listId)
  ).length;

  const activePantryRefillListIds = useMemo(() => {
    return new Set(
      activeLists
        .filter((list) => {
          const title = String(list.title || "").trim().toLowerCase();
          const source = String(list.source || list.source_type || "").toLowerCase();

          return (
            list.status !== "archived" &&
            title === "pantry refill" &&
            source === "pantry"
          );
        })
        .map((list) => list.id)
    );
  }, [activeLists]);

  const pantryRefillItemKeys = useMemo(() => {
    return new Set(
      items
        .filter((item) => {
          const status = String(item.status || "").toLowerCase();

          return (
            activePantryRefillListIds.has(item.listId) &&
            status !== "archived" &&
            !item.checked
          );
        })
        .map((item) => normalizeItemKey(item.title || item.name))
        .filter(Boolean)
    );
  }, [items, activePantryRefillListIds]);

  const activePantryRefillList = useMemo(() => {
    return (
      activeLists.find((list) => {
        const title = String(list.title || "").trim().toLowerCase();
        const source = String(list.source || list.source_type || "").toLowerCase();

        return (
          list.status !== "archived" &&
          title === "pantry refill" &&
          source === "pantry"
        );
      }) || null
    );
  }, [activeLists]);



  const createList = async () => {
    const cleanTitle = newListTitle.trim();

    if (!cleanTitle || !familyId || !canWrite) return;

    const selectedAssignee =
      peopleOptions.find((person) => person.id === newListAssigneePersonId) ||
      peopleOptions.find((person) => person.id === "family") ||
      { id: "family", name: "Family" };

    setSavingList(true);

    try {
      const docRef = await addDoc(collection(db, LIST_COLLECTION), {
        title: cleanTitle,
        type: newListType || "other",
        description: newListDescription.trim(),
        status: "active",

        assignedToPersonId: selectedAssignee.id || "family",
        assignedToPersonName: normalizePersonName(selectedAssignee.name, "Family"),

        familyId,

        linkedEventId: "",
        linkedMealId: "",

        createdBy: user?.uid || null,
        createdByEmail: user?.email || null,
        createdByName: getProfileDisplayName(profile, user) || "Unknown member",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setActiveListId(docRef.id);
      setSearchParams({ listId: docRef.id });
      setNewListTitle("");
      setNewListDescription("");
      setNewListType("groceries");
      setNewListAssigneePersonId("family");

      await loadData();
    } catch (error) {
      console.error("Error creating family list:", error);
      showErrorToast("Could not create list", error);
    } finally {
      setSavingList(false);
    }
  };

  const addItem = async () => {
    const cleanTitle = newItemTitle.trim();

    if (!cleanTitle || !activeList || !familyId || !canWrite) return;

    setSavingItem(true);

    try {
      await addDoc(collection(db, ITEM_COLLECTION), {
        title: cleanTitle,
        name: cleanTitle,
        quantity: newItemQuantity.trim(),
        note: newItemNote.trim(),
        status: "needed",
        checked: false,

        listId: activeList.id,
        listTitle: activeList.title,
        listType: activeList.type,

        familyId,

        assignedToPersonId: "",
        requestedByPersonId: "",

        createdBy: user?.uid || null,
        createdByEmail: user?.email || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setNewItemTitle("");
      setNewItemQuantity("");
      setNewItemNote("");

      await loadData();
    } catch (error) {
      console.error("Error adding list item:", error);
      showErrorToast("Could not add item", error);
    } finally {
      setSavingItem(false);
    }
  };

  const toggleItem = async (item) => {
    if (!canWrite || !item?.id) return;

    const nextDone = !item.checked;

    try {
      await updateDoc(doc(db, ITEM_COLLECTION, item.id), {
        checked: nextDone,
        status: nextDone ? "done" : "needed",
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });

      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                checked: nextDone,
                status: nextDone ? "done" : "needed",
              }
            : currentItem
        )
      );

      const source = String(item.source || item.source_type || "").toLowerCase();
      const listTitle = String(item.listTitle || item.list_title || "").trim().toLowerCase();

      const isPantryRefillItem =
        nextDone &&
        (source === "pantry" || listTitle === "pantry refill");

      if (isPantryRefillItem) {
        const itemKey = normalizeItemKey(
          item.pantryKey ||
            item.pantry_key ||
            item.title ||
            item.name
        );

        const pantryMatch =
          pantryItems.find(
            (pantryItem) =>
              pantryItem.status !== "archived" &&
              normalizeItemKey(pantryItem.title || pantryItem.name) === itemKey
          ) || null;

        if (pantryMatch?.id && pantryMatch.status !== "in_stock") {
          setPantryStockPrompt({
            listItem: {
              ...item,
              checked: nextDone,
              status: "done",
            },
            pantryItem: pantryMatch,
          });
        }
      }
    } catch (error) {
      console.error("Error updating item:", error);
      showErrorToast("Could not update item", error);
    }
  };

  const deleteItem = async (item) => {
    if (!canWrite || !item?.id) return;

    requestConfirmation({
      title: "Remove this item?",
      description: "This item will be hidden from the active list. The rest of the list will stay available.",
      confirmLabel: "Remove item",
      tone: "danger",
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, ITEM_COLLECTION, item.id), {
            status: "archived",
            archivedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            updatedBy: user?.uid || null,
          });

          toast({
            title: "Item removed",
            description: "The item was removed from the active list.",
            duration: 3500,
          });

          await loadData();
        } catch (error) {
          console.error("Error deleting list item:", error);
          showErrorToast("Could not remove item", error);
        }
      },
    });
  };

  function startEditingList(list) {
    if (!list?.id) return;

    setEditingListId(list.id);
    setEditListTitle(list.title || "");
    setEditListType(list.type || "other");
    setEditListAssigneePersonId(list.assignedToPersonId || list.assigned_to_person_id || "family");
    setEditListDescription(list.description || "");
  }

  function cancelEditingList() {
    setEditingListId("");
    setEditListTitle("");
    setEditListType("groceries");
    setEditListAssigneePersonId("family");
    setEditListDescription("");
  }

  const saveListEdit = async () => {
    if (!canWrite || !activeList?.id || !editListTitle.trim()) return;

    const selectedAssignee =
      peopleOptions.find((person) => person.id === editListAssigneePersonId) ||
      peopleOptions.find((person) => person.id === "family") ||
      { id: "family", name: "Family" };

    setSavingListEdit(true);

    try {
      await updateDoc(doc(db, LIST_COLLECTION, activeList.id), {
        title: editListTitle.trim(),
        type: editListType || "other",
        description: editListDescription.trim(),

        assignedToPersonId: selectedAssignee.id || "family",
        assignedToPersonName: normalizePersonName(selectedAssignee.name, "Family"),

        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });

      cancelEditingList();
      await loadData();
    } catch (error) {
      console.error("Error updating list:", error);
      showErrorToast("Could not update list", error);
    } finally {
      setSavingListEdit(false);
    }
  };

  const archiveList = async (list) => {
    if (!canWrite || !list?.id) return;

    requestConfirmation({
      title: `Hide "${list.title}"?`,
      description: "This moves the list to Hidden lists. You can restore it later from the Hidden lists view.",
      confirmLabel: "Hide list",
      tone: "danger",
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, LIST_COLLECTION, list.id), {
            status: "archived",
            archivedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            updatedBy: user?.uid || null,
          });

          toast({
            title: "List hidden",
            description: "You can restore it from Hidden lists.",
            duration: 3500,
          });

          setActiveListId("");
          setSearchParams({});
          await loadData();
        } catch (error) {
          console.error("Error archiving list:", error);
          showErrorToast("Could not hide list", error);
        }
      },
    });
  };

  function openLinkedTasksInTasksPage(list) {
    if (!list?.id) return;

    const params = new URLSearchParams({
      linkedListId: list.id,
      listTitle: list.title || "Family list",
    });

    setLinkedTasksPreviewList(null);
    navigate(`/tasks?${params.toString()}`);
  }

  const createLinkedTaskFromList = (list) => {
    const listId = list?.id || list?.listId || list?.list_id || "";
    const listTitle = list?.title || list?.listTitle || list?.list_title || "Family list";

    if (!listId) {
      toast({
        title: "Could not create linked task",
        description: "This list is missing a valid list id.",
        variant: "destructive",
        duration: 4500,
      });
      return;
    }

    const params = new URLSearchParams({
      action: "createTask",
      linkedListId: listId,
      listTitle,
      source: "list",
    });

    navigate(`/tasks?${params.toString()}`);
  };

  const viewLinkedTasksFromList = (list) => {
    if (!list?.id) {
      toast({
        title: "Could not open linked tasks",
        description: "This list is missing a valid list id.",
        variant: "destructive",
        duration: 4500,
      });
      return;
    }

    const listTasks = tasksByListId[list.id] || [];

    if (!listTasks.length) {
      toast({
        title: "No linked tasks yet",
        description: "Create a linked task first, then it will show here.",
        duration: 3500,
      });
      return;
    }

    setLinkedTasksPreviewList(list);
  };

  const viewLinkedEventFromList = (list) => {
    goToLinkedEvent(list);
  };

  const goToLinkedEvent = async (list) => {
    const eventId = getLinkedEventId(list);

    if (!eventId) {
      toast({
        title: "No linked event",
        description: "This list is not connected to a calendar event.",
        duration: 3500,
      });
      return;
    }

    setLoadingLinkedEventPreview(true);

    try {
      const eventSnap = await getDoc(doc(db, "familyEvents", eventId));

      if (eventSnap.exists()) {
        const data = eventSnap.data();

        setLinkedEventPreview({
          id: eventSnap.id,
          title: data.title || list.linkedEventTitle || list.linked_event_title || list.title || "Family event",
          date: data.date || data.eventDate || data.event_date || list.linkedEventDate || list.linked_event_date || "",
          category: data.category || "",
          location: data.location || "",
          description: data.description || data.notes || "",
          isAllDay: data.isAllDay || data.is_all_day || false,
          startTime: data.startTime || data.start_time || "",
          endTime: data.endTime || data.end_time || "",
          listTitle: list.title || "Linked list",
        });

        return;
      }

      setLinkedEventPreview({
        id: eventId,
        title: list.linkedEventTitle || list.linked_event_title || list.title || "Family event",
        date: list.linkedEventDate || list.linked_event_date || "",
        category: "",
        location: "",
        description: "This event is linked to the list, but the event details could not be loaded.",
        isAllDay: false,
        startTime: "",
        endTime: "",
        listTitle: list.title || "Linked list",
      });
    } catch (error) {
      console.error("Error loading linked event preview:", error);

      toast({
        title: "Could not open event preview",
        description: error?.message || "Please try again.",
        variant: "destructive",
        duration: 4500,
      });
    } finally {
      setLoadingLinkedEventPreview(false);
    }
  };

  const restoreList = async (list) => {
    if (!canWrite || !list?.id) return;

    try {
      await updateDoc(doc(db, LIST_COLLECTION, list.id), {
        status: "active",
        restoredAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });

      toast({
        title: "List restored",
        description: `"${list.title}" is back in active lists.`,
        duration: 3500,
      });

      setShowArchivedLists(false);
      setActiveListId(list.id);
      setSearchParams({ listId: list.id });
      await loadData();
    } catch (error) {
      console.error("Error restoring list:", error);
      showErrorToast("Could not restore list", error);
    }
  };

  const updatePantryStatus = async (item, nextStatus) => {
    if (!canWrite || !item?.id || !nextStatus) return;

    const previousStatus = item.status || "in_stock";
    const title = item.title || item.name || "Pantry item";

    try {
      await updateDoc(doc(db, PANTRY_COLLECTION, item.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });

      setPantryItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                status: nextStatus,
              }
            : currentItem
        )
      );

      const shouldPromptToCompleteRefill =
        nextStatus === "in_stock" && previousStatus !== "in_stock";

      if (shouldPromptToCompleteRefill) {
        const pantryKey = normalizeItemKey(item.title || item.name);

        const matchingOpenRefillItems = items.filter((listItem) => {
          const listItemKey = normalizeItemKey(
            listItem.pantryKey ||
              listItem.pantry_key ||
              listItem.title ||
              listItem.name
          );

          const source = String(listItem.source || listItem.source_type || "").toLowerCase();
          const listTitle = String(listItem.listTitle || listItem.list_title || "")
            .trim()
            .toLowerCase();

          return (
            pantryKey &&
            listItemKey === pantryKey &&
            !listItem.checked &&
            String(listItem.status || "").toLowerCase() !== "archived" &&
            (activePantryRefillListIds.has(listItem.listId) ||
              source === "pantry" ||
              listTitle === "pantry refill")
          );
        });

        if (matchingOpenRefillItems.length > 0) {
          setPantryListCompletionPrompt({
            pantryItem: {
              ...item,
              status: nextStatus,
            },
            refillItems: matchingOpenRefillItems,
          });
        }
      }

      toast({
        title: "Pantry updated",
        description: `${title} is now ${nextStatus === "in_stock" ? "In stock" : nextStatus === "low" ? "Low" : "Out"}.`,
        duration: 2500,
      });
    } catch (error) {
      console.error("Error updating pantry status:", error);
      showErrorToast("Could not update pantry status", error);
    }
  };

  const addCustomPantryItem = async () => {
    const cleanTitle = newPantryTitle.trim();

    if (!canWrite || !familyId || !cleanTitle || savingPantryItem) return;

    setSavingPantryItem(true);

    try {
      await addDoc(collection(db, PANTRY_COLLECTION), {
        title: cleanTitle,
        name: cleanTitle,
        category: newPantryCategory || "household",
        status: newPantryStatus || "in_stock",
        note: newPantryNote.trim(),

        familyId,

        createdBy: user?.uid || null,
        createdByEmail: user?.email || null,
        createdByName: getProfileDisplayName(profile, user) || "Unknown member",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setNewPantryTitle("");
      setNewPantryNote("");
      setNewPantryStatus("in_stock");

      toast({
        title: "Pantry item added",
        description: `${cleanTitle} was added to your pantry.`,
        duration: 3000,
      });

      await loadData();
    } catch (error) {
      console.error("Error adding pantry item:", error);
      showErrorToast("Could not add pantry item", error);
    } finally {
      setSavingPantryItem(false);
    }
  };

  const createStarterPantry = async () => {
    if (!canWrite || !familyId || creatingStarterPantry) return;

    setCreatingStarterPantry(true);

    try {
      const existingTitles = new Set(
        pantryItems.map((item) => String(item.title || "").trim().toLowerCase())
      );
      const itemsToCreate = starterPantryItems.filter(
        (item) => !existingTitles.has(item.title.toLowerCase())
      );

      await Promise.all(
        itemsToCreate.map((item) =>
          addDoc(collection(db, PANTRY_COLLECTION), {
            title: item.title,
            name: item.title,
            category: item.category,
            status: "in_stock",
            note: "",

            familyId,

            createdBy: user?.uid || null,
            createdByEmail: user?.email || null,
            createdByName: getProfileDisplayName(profile, user) || "Unknown member",

            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        )
      );

      toast({
        title: "Starter pantry added",
        description: itemsToCreate.length
          ? `${itemsToCreate.length} home essentials were added.`
          : "Your pantry already has these starter items.",
        duration: 3500,
      });

      await loadData();
    } catch (error) {
      console.error("Error creating starter pantry:", error);
      showErrorToast("Could not create pantry", error);
    } finally {
      setCreatingStarterPantry(false);
    }
  };

  const completePromptedRefillItemsFromPantry = async () => {
    if (
      !pantryListCompletionPrompt?.refillItems?.length ||
      completingRefillItemsFromPantry
    ) {
      return;
    }

    const refillItems = pantryListCompletionPrompt.refillItems;
    const title =
      pantryListCompletionPrompt.pantryItem?.title ||
      pantryListCompletionPrompt.pantryItem?.name ||
      "Pantry item";

    setCompletingRefillItemsFromPantry(true);

    try {
      await Promise.all(
        refillItems.map((item) =>
          updateDoc(doc(db, ITEM_COLLECTION, item.id), {
            checked: true,
            status: "done",
            updatedAt: serverTimestamp(),
            updatedBy: user?.uid || null,
          })
        )
      );

      const refillItemIds = new Set(refillItems.map((item) => item.id));

      setItems((current) =>
        current.map((item) =>
          refillItemIds.has(item.id)
            ? {
                ...item,
                checked: true,
                status: "done",
              }
            : item
        )
      );

      toast({
        title: "Refill list updated",
        description: `${title} was marked done in the refill list.`,
        duration: 3500,
      });

      setPantryListCompletionPrompt(null);
    } catch (error) {
      console.error("Error completing refill list item from Pantry:", error);
      showErrorToast("Could not update refill list", error);
    } finally {
      setCompletingRefillItemsFromPantry(false);
    }
  };

  const markPromptedPantryItemInStock = async () => {
    if (!pantryStockPrompt?.pantryItem?.id || updatingPantryFromList) return;

    const pantryItem = pantryStockPrompt.pantryItem;
    const title = pantryItem.title || pantryItem.name || "Pantry item";

    setUpdatingPantryFromList(true);

    try {
      await updateDoc(doc(db, PANTRY_COLLECTION, pantryItem.id), {
        status: "in_stock",
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });

      setPantryItems((current) =>
        current.map((item) =>
          item.id === pantryItem.id
            ? {
                ...item,
                status: "in_stock",
              }
            : item
        )
      );

      toast({
        title: "Pantry updated",
        description: `${title} is now marked In stock.`,
        duration: 3500,
      });

      setPantryStockPrompt(null);
    } catch (error) {
      console.error("Error updating Pantry from refill list:", error);
      showErrorToast("Could not update Pantry", error);
    } finally {
      setUpdatingPantryFromList(false);
    }
  };

  const buildPantryRefillList = async (needToBuyItems = [], { forceNew = false } = {}) => {
    if (!canWrite || !familyId || creatingRefillList) return;

    const cleanItems = needToBuyItems
      .filter((item) => item?.title || item?.name)
      .map((item) => ({
        title: String(item.title || item.name || "").trim(),
        category: item.category || "other",
        status: item.status || "needed",
        note: item.note || "",
      }))
      .filter((item) => item.title);

    if (!cleanItems.length) {
      toast({
        title: "Nothing to add",
        description: "Mark Pantry items as Low or Out first.",
        duration: 3000,
      });
      return;
    }

    const existing = !forceNew
      ? activeLists.find((list) => {
          const title = String(list.title || "").trim().toLowerCase();
          const source = String(list.source || list.source_type || "").toLowerCase();

          return (
            list.status !== "archived" &&
            title === "pantry refill" &&
            source === "pantry"
          );
        })
      : null;

    if (existing?.id) {
      const existingKeys = new Set(
        items
          .filter((item) => {
            const status = String(item.status || "").toLowerCase();

            return (
              item.listId === existing.id &&
              status !== "archived" &&
              !item.checked
            );
          })
          .map((item) => normalizeItemKey(item.title || item.name))
          .filter(Boolean)
      );

      const missingItems = cleanItems.filter(
        (item) => !existingKeys.has(normalizeItemKey(item.title))
      );

      if (!missingItems.length) {
        setActiveListsTab("lists");
        setShowArchivedLists(false);
        setActiveListId(existing.id);
        setSearchParams({ listId: existing.id });

        toast({
          title: "Refill list already ready",
          description: "All current Low/Out pantry items are already in the refill list.",
          duration: 3500,
        });

        return;
      }

      setCreatingRefillList(true);

      try {
        await Promise.all(
          missingItems.map((item) =>
            addDoc(collection(db, ITEM_COLLECTION), {
              title: item.title,
              name: item.title,
              quantity: "",
              note:
                item.status === "out"
                  ? "Pantry: Out"
                  : item.status === "low"
                    ? "Pantry: Low"
                    : item.note || "",
              status: "needed",
              checked: false,

              listId: existing.id,
              listTitle: existing.title || "Pantry refill",
              listType: existing.type || "groceries",

              familyId,

              source: "pantry",
              pantryCategory: item.category,
              pantryStatus: item.status,

              assignedToPersonId: "",
              requestedByPersonId: "",

              createdBy: user?.uid || null,
              createdByEmail: user?.email || null,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            })
          )
        );

        await updateDoc(doc(db, LIST_COLLECTION, existing.id), {
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || null,
        });

        toast({
          title: "Refill list updated",
          description: `${missingItems.length} missing item${missingItems.length === 1 ? "" : "s"} added.`,
          duration: 3500,
        });

        setActiveListsTab("lists");
        setShowArchivedLists(false);
        setActiveListId(existing.id);
        setSearchParams({ listId: existing.id });
        await loadData();
      } catch (error) {
        console.error("Error updating pantry refill list:", error);
        showErrorToast("Could not update refill list", error);
      } finally {
        setCreatingRefillList(false);
      }

      return;
    }

    setCreatingRefillList(true);

    try {
      const listRef = await addDoc(collection(db, LIST_COLLECTION), {
        title: "Pantry refill",
        type: "groceries",
        description: "Items marked Low or Out from Pantry.",
        status: "active",

        assignedToPersonId: "family",
        assignedToPersonName: "Family",

        familyId,

        linkedEventId: "",
        linkedMealId: "",

        source: "pantry",

        createdBy: user?.uid || null,
        createdByEmail: user?.email || null,
        createdByName: getProfileDisplayName(profile, user) || "Unknown member",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await Promise.all(
        cleanItems.map((item) =>
          addDoc(collection(db, ITEM_COLLECTION), {
            title: item.title,
            name: item.title,
            quantity: "",
            note:
              item.status === "out"
                ? "Pantry: Out"
                : item.status === "low"
                  ? "Pantry: Low"
                  : item.note || "",
            status: "needed",
            checked: false,

            listId: listRef.id,
            listTitle: "Pantry refill",
            listType: "groceries",

            familyId,

            source: "pantry",
            pantryCategory: item.category,
            pantryStatus: item.status,
            pantryKey: normalizeItemKey(item.title),

            assignedToPersonId: "",
            requestedByPersonId: "",

            createdBy: user?.uid || null,
            createdByEmail: user?.email || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        )
      );

      toast({
        title: "Refill list created",
        description: `${cleanItems.length} item${cleanItems.length === 1 ? "" : "s"} added from Pantry.`,
        duration: 3500,
      });

      setPendingRefillItems([]);
      setExistingRefillList(null);
      setActiveListsTab("lists");
      setShowArchivedLists(false);
      setActiveListId(listRef.id);
      setSearchParams({ listId: listRef.id });
      await loadData();
    } catch (error) {
      console.error("Error creating pantry refill list:", error);
      showErrorToast("Could not create refill list", error);
    } finally {
      setCreatingRefillList(false);
    }
  };

  const createPantryRefillList = async (needToBuyItems = []) => {
    await buildPantryRefillList(needToBuyItems, { forceNew: false });
  };

  const openExistingRefillList = () => {
    if (!existingRefillList?.id) return;

    setActiveListsTab("lists");
    setShowArchivedLists(false);
    setActiveListId(existingRefillList.id);
    setSearchParams({ listId: existingRefillList.id });
    setExistingRefillList(null);
    setPendingRefillItems([]);
  };

  const createNewRefillListAnyway = async () => {
    const items = pendingRefillItems;
    setExistingRefillList(null);
    setPendingRefillItems([]);

    await buildPantryRefillList(items, { forceNew: true });
  };

  const startEditingPantryItem = (item) => {
    if (!item?.id) return;

    setEditingPantryItem(item);
    setEditPantryTitle(item.title || item.name || "");
    setEditPantryCategory(item.category || "household");
    setEditPantryStatus(item.status || "in_stock");
    setEditPantryNote(item.note || "");
  };

  const cancelEditingPantryItem = () => {
    setEditingPantryItem(null);
    setEditPantryTitle("");
    setEditPantryCategory("household");
    setEditPantryStatus("in_stock");
    setEditPantryNote("");
    setSavingPantryEdit(false);
  };

  const savePantryItemEdit = async () => {
    if (!canWrite || !editingPantryItem?.id || !editPantryTitle.trim() || savingPantryEdit) {
      return;
    }

    const cleanTitle = editPantryTitle.trim();

    setSavingPantryEdit(true);

    try {
      await updateDoc(doc(db, PANTRY_COLLECTION, editingPantryItem.id), {
        title: cleanTitle,
        name: cleanTitle,
        category: editPantryCategory || "household",
        status: editPantryStatus || "in_stock",
        note: editPantryNote.trim(),

        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });

      setPantryItems((current) =>
        current.map((item) =>
          item.id === editingPantryItem.id
            ? {
                ...item,
                title: cleanTitle,
                name: cleanTitle,
                category: editPantryCategory || "household",
                status: editPantryStatus || "in_stock",
                note: editPantryNote.trim(),
              }
            : item
        )
      );

      toast({
        title: "Pantry item updated",
        description: `${cleanTitle} was updated.`,
        duration: 3000,
      });

      cancelEditingPantryItem();
    } catch (error) {
      console.error("Error updating pantry item:", error);
      showErrorToast("Could not update pantry item", error);
    } finally {
      setSavingPantryEdit(false);
    }
  };

  const archivePantryItem = async (item) => {
    if (!canWrite || !item?.id) return;

    requestConfirmation({
      title: `Remove "${item.title || "this item"}" from Pantry?`,
      description:
        "This will remove it from Pantry and Need to buy. You can add it again later if needed.",
      confirmLabel: "Remove item",
      tone: "danger",
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, PANTRY_COLLECTION, item.id), {
            status: "archived",
            archivedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            updatedBy: user?.uid || null,
          });

          setPantryItems((current) =>
            current.filter((pantryItem) => pantryItem.id !== item.id)
          );

          toast({
            title: "Pantry item removed",
            description: `${item.title || "Item"} was removed from Pantry.`,
            duration: 3000,
          });
        } catch (error) {
          console.error("Error removing pantry item:", error);
          showErrorToast("Could not remove pantry item", error);
        }
      },
    });

  };

  if (!canRead) {
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <h1 className="mb-2 text-2xl font-bold font-heading">Family Lists</h1>
        <p className="text-muted-foreground">
          You do not have access to lists for this family.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-accent">
            Family command center
          </p>

          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 font-heading">
            Family Lists
          </h1>

          <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500">
            Shopping, packing, projects, meal prep, trips, gifts, and family checklists.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm font-black">
            {loading ? "Loading..." : `${totalOpenItems} open items`}
          </Badge>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setShowArchivedLists((current) => !current);
              setActiveListId("");
              setSearchParams({});
            }}
            className="rounded-full bg-white/80 px-3 py-1 text-xs font-black"
          >
            <ArchiveRestore className="mr-1.5 h-3.5 w-3.5" />
            {showArchivedLists
              ? "Active lists"
              : `Hidden lists (${archivedLists.length})`}
          </Button>
        </div>
      </div>

      <section className="mb-5 rounded-[2rem] border border-white/80 bg-white/70 p-2 shadow-[0_12px_30px_rgba(15,23,42,0.05)] backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: "lists", label: "Lists", helper: `${activeLists.length} family lists` },
            { id: "pantry", label: "Pantry", helper: `${pantryItems.filter((item) => item.status === "low" || item.status === "out").length} to buy` },
          ].map((tab) => {
            const active = activeListsTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveListsTab(tab.id)}
                className={cn(
                  "rounded-[1.5rem] px-4 py-3 text-left transition",
                  active
                    ? "bg-accent text-accent-foreground shadow-lg shadow-accent/15"
                    : "bg-white text-slate-500 ring-1 ring-slate-100 hover:bg-secondary/40"
                )}
              >
                <p className="text-sm font-black">{tab.label}</p>
                <p className={cn("text-xs font-bold", active ? "text-accent-foreground/75" : "text-slate-400")}>
                  {tab.helper}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mb-5 rounded-[1.75rem] border border-white/80 bg-white/72 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.045)] backdrop-blur-xl">
        <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-slate-100">
          <Search className="h-4 w-4 text-slate-400" />

          <Input
            value={listsSearch}
            onChange={(event) => setListsSearch(event.target.value)}
            placeholder={
              activeListsTab === "pantry"
                ? "Search pantry items, categories, notes..."
                : "Search lists, projects, items, notes..."
            }
            className="h-10 border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0"
          />

          {listsSearch && (
            <button
              type="button"
              onClick={() => setListsSearch("")}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-100 transition hover:text-slate-900"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      {activeListsTab === "pantry" ? (
        <PantryPanel
          pantryItems={pantryItems}
          refillItemKeys={pantryRefillItemKeys}
          activeRefillList={activePantryRefillList}
          loading={loading}
          canWrite={canWrite}
          searchQuery={listsSearch}
          creatingStarterPantry={creatingStarterPantry}
          newPantryTitle={newPantryTitle}
          setNewPantryTitle={setNewPantryTitle}
          newPantryCategory={newPantryCategory}
          setNewPantryCategory={setNewPantryCategory}
          newPantryStatus={newPantryStatus}
          setNewPantryStatus={setNewPantryStatus}
          newPantryNote={newPantryNote}
          setNewPantryNote={setNewPantryNote}
          savingPantryItem={savingPantryItem}
          creatingRefillList={creatingRefillList}
          onAddPantryItem={addCustomPantryItem}
          onCreateRefillList={createPantryRefillList}
          onCreateStarterPantry={createStarterPantry}
          onStatusChange={updatePantryStatus}
          onEditPantryItem={startEditingPantryItem}
          onArchivePantryItem={archivePantryItem}
        />
      ) : (
        <>
      {canWrite && (
        <Card className="mb-5 rounded-[1.75rem] border-white/70 bg-white/76 p-4 shadow-[0_14px_34px_rgba(38,50,56,0.055)]">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Plus className="h-4 w-4" />
            </div>

            <div>
              <p className="text-sm font-black text-slate-950">Create list / project</p>
              <p className="text-xs font-semibold text-slate-500">
                Create a list for groceries, home supplies, school, events, or travel.
              </p>
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_180px_minmax(0,1fr)_auto]">
            <Input
              value={newListTitle}
              onChange={(event) => setNewListTitle(event.target.value)}
              placeholder="List / project name"
              className="h-11 rounded-2xl bg-white font-semibold"
              onKeyDown={(event) => event.key === "Enter" && createList()}
            />

            <Select value={newListType} onValueChange={setNewListType}>
              <SelectTrigger className="h-11 rounded-2xl bg-white">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {Object.entries(listTypeConfig).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={newListAssigneePersonId} onValueChange={setNewListAssigneePersonId}>
              <SelectTrigger className="h-11 rounded-2xl bg-white">
                <Users className="mr-2 h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Responsible" />
              </SelectTrigger>

              <SelectContent>
                {peopleOptions.map((person) => (
                  <SelectItem key={person.id} value={person.id}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              value={newListDescription}
              onChange={(event) => setNewListDescription(event.target.value)}
              placeholder="Optional note"
              className="h-11 rounded-2xl bg-white"
              onKeyDown={(event) => event.key === "Enter" && createList()}
            />

            <Button
              onClick={createList}
              disabled={!newListTitle.trim() || savingList}
              className="h-11 rounded-2xl font-black"
            >
              Create
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[310px_minmax(0,1fr)]">
          <aside className="max-h-[34rem] space-y-3 overflow-y-auto pr-1 lg:sticky lg:top-4">
            {filteredVisibleLists.length > 0 ? (
              filteredVisibleLists.map((list) => {
                const config = listTypeConfig[list.type] || listTypeConfig.other;
                const Icon = config.icon;
                const listItems = itemsByListId[list.id] || [];
                const openCount = listItems.filter((item) => !item.checked).length;
                const doneCount = listItems.filter((item) => item.checked).length;
                const active = activeList?.id === list.id;

                return (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => {
                      setActiveListId(list.id);
                      setSearchParams({ listId: list.id });
                    }}
                    className={cn(
                      "w-full rounded-[1.45rem] border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm",
                      active
                        ? "border-primary/20 bg-primary/5 ring-4 ring-primary/5"
                        : "border-white/70 bg-white/76 hover:bg-white"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1", config.color)}>
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-950">
                          {list.title}
                        </p>

                        <p className="mt-0.5 text-xs font-semibold text-slate-500">
                          {config.label} · {openCount} open · {doneCount} done
                        </p>

                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-1 text-[10px] font-black text-slate-600 ring-1 ring-slate-100">
                            <Users className="h-3 w-3" />
                            {list.assignedToPersonName || "Family"}
                          </span>

                          <ListSourceBadge list={list} compact />

                          {(tasksByListId[list.id]?.length || 0) > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-[10px] font-black text-blue-700 ring-1 ring-blue-100">
                              <CheckSquare className="h-3 w-3" />
                              {tasksByListId[list.id].length} task{tasksByListId[list.id].length === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>

                        {list.description && (
                          <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-400">
                            {list.description}
                          </p>
                        )}

                        <ListContextNote list={list} />
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <Card className="rounded-[1.75rem] border-dashed border-slate-200 bg-white/60 p-6 text-center">
                <ListChecks className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="font-black text-slate-950">
                  {listsSearch
                    ? "No matching lists"
                    : showArchivedLists
                      ? "No hidden lists"
                      : "No lists yet"}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {listsSearch
                    ? "Try another search or clear the search box."
                    : showArchivedLists
                      ? "Hidden lists will appear here so you can restore them later."
                      : "Create your first family list above."}
                </p>
              </Card>
            )}
          </aside>

          <section>
            {activeList ? (
              <Card className="rounded-[2rem] border-white/70 bg-white/76 p-4 shadow-[0_14px_34px_rgba(38,50,56,0.055)]">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1", (listTypeConfig[activeList.type] || listTypeConfig.other).color)}>
                      <ListTypeIcon type={activeList.type} className="h-6 w-6" />
                    </div>

                    <div className="min-w-0 flex-1">
                      {editingListId === activeList.id ? (
                        <div className="space-y-3">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">
                            Edit list
                          </p>

                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_160px_180px]">
                            <Input
                              value={editListTitle}
                              onChange={(event) => setEditListTitle(event.target.value)}
                              placeholder="List title"
                              className="h-11 rounded-2xl bg-white font-black"
                            />

                            <Select value={editListType} onValueChange={setEditListType}>
                              <SelectTrigger className="h-11 rounded-2xl bg-white">
                                <SelectValue />
                              </SelectTrigger>

                              <SelectContent>
                                {Object.entries(listTypeConfig).map(([key, value]) => (
                                  <SelectItem key={key} value={key}>
                                    {value.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select
                              value={editListAssigneePersonId}
                              onValueChange={setEditListAssigneePersonId}
                            >
                              <SelectTrigger className="h-11 rounded-2xl bg-white">
                                <Users className="mr-2 h-4 w-4 text-slate-400" />
                                <SelectValue />
                              </SelectTrigger>

                              <SelectContent>
                                {peopleOptions.map((person) => (
                                  <SelectItem key={person.id} value={person.id}>
                                    {person.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <Input
                            value={editListDescription}
                            onChange={(event) => setEditListDescription(event.target.value)}
                            placeholder="Optional note"
                            className="h-11 rounded-2xl bg-white"
                          />

                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              onClick={saveListEdit}
                              disabled={!editListTitle.trim() || savingListEdit}
                              className="rounded-2xl font-black"
                            >
                              {savingListEdit ? "Saving..." : "Save changes"}
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              onClick={cancelEditingList}
                              disabled={savingListEdit}
                              className="rounded-2xl font-black"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-accent">
                            Active list
                          </p>

                          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                            {activeList.title}
                          </h2>

                          <p className="mt-1 text-sm font-semibold text-slate-500">
                            {(listTypeConfig[activeList.type] || listTypeConfig.other).label}
                            {activeList.description ? ` · ${activeList.description}` : ""}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 ring-1 ring-slate-100">
                              <Users className="h-3.5 w-3.5" />
                              Responsible: {activeList.assignedToPersonName || "Family"}
                            </div>

                            <ListSourceBadge list={activeList} />

                            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                              <Pencil className="h-3.5 w-3.5" />
                              Created by: {getListCreatorLabel(activeList, { user, profile, peopleOptions })}
                            </div>

                            {(tasksByListId[activeList.id]?.length || 0) > 0 && (
                              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 ring-1 ring-blue-100">
                                <CheckSquare className="h-3.5 w-3.5" />
                                {tasksByListId[activeList.id].length} linked task{tasksByListId[activeList.id].length === 1 ? "" : "s"}
                              </div>
                            )}

                            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-500 ring-1 ring-slate-100">
                              <CircleDot className="h-3.5 w-3.5" />
                              {getListSourceConfig(activeList).context}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canWrite && activeList.status !== "archived" && editingListId !== activeList.id && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => startEditingList(activeList)}
                        className="rounded-2xl border-slate-200 bg-white font-black text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit list
                      </Button>
                    )}

                    {(tasksByListId[activeList.id]?.length || 0) > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => viewLinkedTasksFromList(activeList)}
                        className="rounded-2xl border-emerald-200 bg-emerald-50 font-black text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                      >
                        <CheckSquare className="mr-2 h-4 w-4" />
                        View linked tasks ({tasksByListId[activeList.id].length})
                      </Button>
                    )}

                    {canWrite && activeList.status !== "archived" && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => createLinkedTaskFromList(activeList)}
                        className="rounded-2xl border-blue-200 bg-blue-50 font-black text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                      >
                        <CheckSquare className="mr-2 h-4 w-4" />
                        {(tasksByListId[activeList.id]?.length || 0) > 0
                          ? "Create another task"
                          : "Create linked task"}
                      </Button>
                    )}

                    {hasLinkedEvent(activeList) && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => goToLinkedEvent(activeList)}
                        disabled={loadingLinkedEventPreview}
                        className="rounded-2xl border-violet-200 bg-violet-50 font-black text-violet-700 hover:bg-violet-100 hover:text-violet-800 disabled:opacity-60"
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {loadingLinkedEventPreview ? "Opening..." : "View event"}
                      </Button>
                    )}

                    {canWrite && activeList.status === "archived" ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => restoreList(activeList)}
                        className="rounded-2xl border-emerald-200 bg-emerald-50 font-black text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                      >
                        <ArchiveRestore className="mr-2 h-4 w-4" />
                        Restore list
                      </Button>
                    ) : canWrite ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => archiveList(activeList)}
                        className="rounded-2xl border-red-200 bg-red-50 font-black text-red-600 hover:bg-red-100 hover:text-red-700"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Hide list
                      </Button>
                    ) : null}
                  </div>
                </div>

                {canWrite && (
                  <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_130px_minmax(0,0.8fr)_auto]">
                    <Input
                      value={newItemTitle}
                      onChange={(event) => setNewItemTitle(event.target.value)}
                      placeholder="Add item... e.g. 5qt oil, poster board, tortillas"
                      className="h-11 rounded-2xl bg-white font-semibold"
                      onKeyDown={(event) => event.key === "Enter" && addItem()}
                    />

                    <Input
                      value={newItemQuantity}
                      onChange={(event) => setNewItemQuantity(event.target.value)}
                      placeholder="Qty"
                      className="h-11 rounded-2xl bg-white"
                      onKeyDown={(event) => event.key === "Enter" && addItem()}
                    />

                    <Input
                      value={newItemNote}
                      onChange={(event) => setNewItemNote(event.target.value)}
                      placeholder="Note"
                      className="h-11 rounded-2xl bg-white"
                      onKeyDown={(event) => event.key === "Enter" && addItem()}
                    />

                    <Button
                      onClick={addItem}
                      disabled={!newItemTitle.trim() || savingItem}
                      className="h-11 rounded-2xl font-black"
                    >
                      <Plus className="h-4 w-4 lg:mr-2" />
                      <span className="hidden lg:inline">Add</span>
                    </Button>
                  </div>
                )}

                <div className="space-y-5">
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Needed ({neededItems.length})
                    </p>

                    {neededItems.length > 0 ? (
                      <div className="grid gap-2 md:grid-cols-2">
                        {neededItems.map((item) => (
                          <Card
                            key={item.id}
                            className="flex items-center gap-3 rounded-[1.35rem] border-white/70 bg-white/82 p-3 shadow-[0_10px_24px_rgba(38,50,56,0.04)]"
                          >
                            <button
                              type="button"
                              onClick={() => toggleItem(item)}
                              disabled={!canWrite}
                              className={cn(
                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-muted-foreground/30 transition-colors",
                                canWrite
                                  ? "hover:border-primary"
                                  : "cursor-not-allowed opacity-40"
                              )}
                              aria-label="Mark item done"
                            />

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-black text-slate-900">
                                {item.title}
                              </p>

                              {(item.quantity || item.note) && (
                                <p className="truncate text-xs font-semibold text-slate-500">
                                  {item.quantity}
                                  {item.quantity && item.note ? " · " : ""}
                                  {item.note}
                                </p>
                              )}
                            </div>

                            {canWrite && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteItem(item)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm font-semibold text-slate-500">
                        No open items in this list.
                      </div>
                    )}
                  </div>

                  {doneItems.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                        Done ({doneItems.length})
                      </p>

                      <div className="grid gap-2 md:grid-cols-2">
                        {doneItems.map((item) => (
                          <Card
                            key={item.id}
                            className="flex items-center gap-3 rounded-[1.35rem] p-3 opacity-55"
                          >
                            <button
                              type="button"
                              onClick={() => toggleItem(item)}
                              disabled={!canWrite}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10"
                            >
                              <Check className="h-3.5 w-3.5 text-primary" />
                            </button>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-muted-foreground line-through">
                                {item.title}
                              </p>

                              {(item.quantity || item.note) && (
                                <p className="truncate text-xs text-muted-foreground line-through">
                                  {item.quantity}
                                  {item.quantity && item.note ? " · " : ""}
                                  {item.note}
                                </p>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ) : (
              <Card className="rounded-[2rem] border-dashed border-slate-200 bg-white/60 p-10 text-center">
                <ListChecks className="mx-auto mb-3 h-12 w-12 text-slate-300" />
                <p className="text-xl font-black text-slate-950">
                  {showArchivedLists ? "Select a hidden list" : "Select or create a list"}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {showArchivedLists
                    ? "Hidden lists can be restored back to your active lists."
                    : "Lists can support groceries, school projects, car needs, meals, trips, and family events."}
                </p>
              </Card>
            )}
          </section>
        </div>
      )}

        </>
      )}

      {pantryListCompletionPrompt && (
        <div className="fixed inset-0 z-[135] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md rounded-[2rem] border-white/80 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <ListChecks className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-black tracking-tight text-slate-950">
                  Complete refill list item?
                </h2>

                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  "{pantryListCompletionPrompt.pantryItem.title || pantryListCompletionPrompt.pantryItem.name}"
                  is now In stock. Should we mark it done in the Pantry refill list too?
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPantryListCompletionPrompt(null)}
                disabled={completingRefillItemsFromPantry}
                className="rounded-2xl font-black"
              >
                Not now
              </Button>

              <Button
                type="button"
                onClick={completePromptedRefillItemsFromPantry}
                disabled={completingRefillItemsFromPantry}
                className="rounded-2xl bg-accent font-black text-accent-foreground hover:bg-accent/90"
              >
                {completingRefillItemsFromPantry ? "Updating..." : "Mark done"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {pantryStockPrompt && (
        <div className="fixed inset-0 z-[135] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md rounded-[2rem] border-white/80 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                <Package className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-black tracking-tight text-slate-950">
                  Update Pantry?
                </h2>

                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  You marked "{pantryStockPrompt.pantryItem.title || pantryStockPrompt.pantryItem.name}" as done.
                  Should we mark it In stock in Pantry too?
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPantryStockPrompt(null)}
                disabled={updatingPantryFromList}
                className="rounded-2xl font-black"
              >
                Not now
              </Button>

              <Button
                type="button"
                onClick={markPromptedPantryItemInStock}
                disabled={updatingPantryFromList}
                className="rounded-2xl bg-accent font-black text-accent-foreground hover:bg-accent/90"
              >
                {updatingPantryFromList ? "Updating..." : "Mark In stock"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {existingRefillList && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md rounded-[2rem] border-white/80 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-black tracking-tight text-slate-950">
                  Pantry refill already exists
                </h2>

                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  You already have an active Pantry refill list. Open the existing list,
                  or create a new one anyway.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setExistingRefillList(null);
                  setPendingRefillItems([]);
                }}
                disabled={creatingRefillList}
                className="rounded-2xl font-black"
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={createNewRefillListAnyway}
                disabled={creatingRefillList}
                className="rounded-2xl border-amber-200 bg-amber-50 font-black text-amber-700 hover:bg-amber-100"
              >
                Create new
              </Button>

              <Button
                type="button"
                onClick={openExistingRefillList}
                disabled={creatingRefillList}
                className="rounded-2xl bg-accent font-black text-accent-foreground hover:bg-accent/90"
              >
                Open existing
              </Button>
            </div>
          </Card>
        </div>
      )}

      {editingPantryItem && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg rounded-[2rem] border-white/80 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-accent">
                  Edit Pantry
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  Update item
                </h2>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  Fix the name, category, status, or notes for this pantry item.
                </p>
              </div>

              <button
                type="button"
                onClick={cancelEditingPantryItem}
                disabled={savingPantryEdit}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-slate-100 transition hover:text-slate-900 disabled:opacity-50"
                aria-label="Close edit pantry item"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <label className="text-sm font-black text-slate-700">
                  Item name
                </label>

                <Input
                  value={editPantryTitle}
                  onChange={(event) => setEditPantryTitle(event.target.value)}
                  placeholder="Milk, coffee pods, trash bags..."
                  className="mt-1 h-11 rounded-2xl bg-white font-bold"
                  onKeyDown={(event) => event.key === "Enter" && savePantryItemEdit()}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-black text-slate-700">
                    Category
                  </label>

                  <Select value={editPantryCategory} onValueChange={setEditPantryCategory}>
                    <SelectTrigger className="mt-1 h-11 rounded-2xl bg-white">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {Object.entries(pantryCategoryConfig).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-black text-slate-700">
                    Status
                  </label>

                  <Select value={editPantryStatus} onValueChange={setEditPantryStatus}>
                    <SelectTrigger className="mt-1 h-11 rounded-2xl bg-white">
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      {Object.entries(pantryStatusConfig).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-black text-slate-700">
                  Note
                </label>

                <Input
                  value={editPantryNote}
                  onChange={(event) => setEditPantryNote(event.target.value)}
                  placeholder="Brand, size, preference, reminder..."
                  className="mt-1 h-11 rounded-2xl bg-white"
                  onKeyDown={(event) => event.key === "Enter" && savePantryItemEdit()}
                />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={cancelEditingPantryItem}
                disabled={savingPantryEdit}
                className="rounded-2xl font-black"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={savePantryItemEdit}
                disabled={!editPantryTitle.trim() || savingPantryEdit}
                className="rounded-2xl bg-accent font-black text-accent-foreground hover:bg-accent/90"
              >
                {savingPantryEdit ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md rounded-[2rem] border-white/80 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-black tracking-tight text-slate-950">
                  {confirmAction.title}
                </h2>

                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                  {confirmAction.description}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmAction(null)}
                className="rounded-2xl font-black"
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={runConfirmedAction}
                className="rounded-2xl bg-red-600 font-black text-white hover:bg-red-700"
              >
                {confirmAction.confirmLabel || "Confirm"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {linkedEventPreview && (
        <div className="fixed inset-0 z-[135] flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg rounded-[2rem] border-white/80 bg-white p-5 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                <CalendarDays className="h-6 w-6" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-violet-600">
                  Linked event
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  {linkedEventPreview.title}
                </h2>

                <p className="mt-1 text-sm font-semibold text-slate-500">
                  From list: {linkedEventPreview.listTitle}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 rounded-[1.5rem] bg-slate-50/70 p-4 ring-1 ring-slate-100">
              {linkedEventPreview.date && (
                <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                  <CalendarDays className="h-4 w-4 text-violet-500" />
                  <span>{linkedEventPreview.date}</span>
                  {linkedEventPreview.isAllDay ? (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-black uppercase text-slate-400 ring-1 ring-slate-100">
                      All day
                    </span>
                  ) : linkedEventPreview.startTime || linkedEventPreview.endTime ? (
                    <span className="text-slate-400">
                      · {linkedEventPreview.startTime || "Start"} - {linkedEventPreview.endTime || "End"}
                    </span>
                  ) : null}
                </div>
              )}

              {linkedEventPreview.category && (
                <div className="text-sm font-bold text-slate-500">
                  Category: <span className="text-slate-800">{linkedEventPreview.category}</span>
                </div>
              )}

              {linkedEventPreview.location && (
                <div className="text-sm font-bold text-slate-500">
                  Location: <span className="text-slate-800">{linkedEventPreview.location}</span>
                </div>
              )}

              {linkedEventPreview.description && (
                <p className="text-sm font-semibold leading-6 text-slate-500">
                  {linkedEventPreview.description}
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLinkedEventPreview(null)}
                className="rounded-2xl font-black"
              >
                Close
              </Button>

              <Button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams({ eventId: linkedEventPreview.id });
                  setLinkedEventPreview(null);
                  navigate(`/calendar?${params.toString()}`);
                }}
                className="rounded-2xl bg-accent font-black text-accent-foreground hover:bg-accent/90"
              >
                Open in Calendar
              </Button>
            </div>
          </Card>
        </div>
      )}

      {linkedTasksPreviewList && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/20 px-3 pb-4 pt-10 backdrop-blur-sm sm:items-center sm:p-6">
          <Card className="max-h-[82vh] w-full max-w-2xl overflow-hidden rounded-[2rem] border-white/80 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-br from-white via-blue-50/70 to-violet-50/50 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">
                  Linked tasks
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                  {linkedTasksPreviewList.title}
                </h2>

                <p className="mt-1 text-sm font-bold text-slate-500">
                  These tasks are connected to this list.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setLinkedTasksPreviewList(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-100 transition hover:text-slate-900"
                aria-label="Close linked tasks preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-4">
              {(tasksByListId[linkedTasksPreviewList.id] || []).length > 0 ? (
                <div className="space-y-2">
                  {(tasksByListId[linkedTasksPreviewList.id] || []).map((task) => {
                    const done =
                      task.status === "done" ||
                      task.status === "completed" ||
                      task.done === true ||
                      task.completed === true;

                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3"
                      >
                        <div
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2",
                            done
                              ? "border-emerald-500 bg-emerald-50 text-emerald-600"
                              : "border-slate-300 bg-white text-slate-400"
                          )}
                        >
                          {done ? <Check className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "truncate text-sm font-black",
                              done ? "text-slate-400 line-through" : "text-slate-950"
                            )}
                          >
                            {task.title || "Untitled task"}
                          </p>

                          <p className="truncate text-xs font-semibold text-slate-500">
                            {task.assignedToPersonName ||
                              task.assigned_to_person_name ||
                              task.assignedToName ||
                              task.assigned_to_name ||
                              task.assignedTo ||
                              "Family"}
                            {task.dueDate || task.due_date
                              ? ` · Due ${task.dueDate || task.due_date}`
                              : ""}
                          </p>
                        </div>

                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide",
                            done
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                              : "bg-blue-50 text-blue-700 ring-1 ring-blue-100"
                          )}
                        >
                          {done ? "Done" : "Pending"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white p-8 text-center">
                  <CheckSquare className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                  <p className="font-black text-slate-950">No linked tasks yet</p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Create a linked task from this list when there is something to follow up.
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-white p-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLinkedTasksPreviewList(null)}
                className="rounded-2xl font-black"
              >
                Close
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => openLinkedTasksInTasksPage(linkedTasksPreviewList)}
                className="rounded-2xl border-blue-200 bg-blue-50 font-black text-blue-700 hover:bg-blue-100"
              >
                Open in Tasks
              </Button>

              {canWrite && linkedTasksPreviewList.status !== "archived" && (
                <Button
                  type="button"
                  onClick={() => {
                    const list = linkedTasksPreviewList;
                    setLinkedTasksPreviewList(null);
                    createLinkedTaskFromList(list);
                  }}
                  className="rounded-2xl font-black"
                >
                  Create another task
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
