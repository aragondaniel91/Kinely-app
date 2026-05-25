import React, { useEffect, useMemo, useState } from "react";
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
  Apple,
  Beef,
  CalendarDays,
  Check,
  CircleDot,
  Cookie,
  Croissant,
  GraduationCap,
  Home,
  ListChecks,
  Package,
  Plus,
  Trash2,
  UtensilsCrossed,
  Warehouse,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { cn } from "@/lib/utils";

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

const DEFAULT_LIST_TITLE = "Family List";

const typeConfig = {
  groceries: {
    icon: Apple,
    label: "Groceries",
    color: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  household: {
    icon: Warehouse,
    label: "Household",
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

function getListKey(title = DEFAULT_LIST_TITLE, type = "other") {
  return `${type}:${String(title || DEFAULT_LIST_TITLE).trim().toLowerCase()}`;
}

function normalizeItem(docSnap) {
  const data = docSnap.data();

  const listTitle =
    data.listTitle ||
    data.list_title ||
    data.projectTitle ||
    data.project_title ||
    DEFAULT_LIST_TITLE;

  const listType = data.listType || data.list_type || data.category || "other";

  return {
    id: docSnap.id,
    ...data,
    name: data.name || data.title || "",
    category: data.category || listType || "other",
    listTitle,
    list_title: listTitle,
    listType,
    list_type: listType,
    quantity: data.quantity || "",
    checked: data.checked === true || data.status === "done",
    created_date: data.created_date || "",
  };
}

export default function Groceries() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const [newQuantity, setNewQuantity] = useState("");
  const [newListTitle, setNewListTitle] = useState(DEFAULT_LIST_TITLE);
  const [newListType, setNewListType] = useState("groceries");
  const [activeListKey, setActiveListKey] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { familyId, user, perms } = useFamily();

  const canRead =
    perms?.lists?.read !== false &&
    perms?.groceries?.read !== false &&
    perms?.meals?.read !== false;

  const canWrite =
    perms?.lists?.write !== false &&
    perms?.groceries?.write !== false &&
    perms?.meals?.write !== false;

  const loadItems = async () => {
    if (!familyId || !canRead) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let snap;

      try {
        const q = query(
          collection(db, "groceries"),
          where("familyId", "==", familyId)
        );

        snap = await getDocs(q);
      } catch (error) {
        console.warn("Fallback to family_id query:", error);

        const q = query(
          collection(db, "groceries"),
          where("family_id", "==", familyId)
        );

        snap = await getDocs(q);
      }

      const data = snap.docs.map(normalizeItem);

      data.sort((a, b) => {
        const aDate = a.created_date || "";
        const bDate = b.created_date || "";
        return bDate.localeCompare(aDate);
      });

      setItems(data);
    } catch (error) {
      console.error("Error loading list items:", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, canRead]);

  const lists = useMemo(() => {
    const map = new Map();

    items.forEach((item) => {
      const listTitle = item.listTitle || DEFAULT_LIST_TITLE;
      const listType = item.listType || item.category || "other";
      const key = getListKey(listTitle, listType);

      if (!map.has(key)) {
        map.set(key, {
          key,
          title: listTitle,
          type: listType,
          items: [],
        });
      }

      map.get(key).items.push(item);
    });

    if (!map.size) {
      map.set(getListKey(DEFAULT_LIST_TITLE, "groceries"), {
        key: getListKey(DEFAULT_LIST_TITLE, "groceries"),
        title: DEFAULT_LIST_TITLE,
        type: "groceries",
        items: [],
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      a.title.localeCompare(b.title)
    );
  }, [items]);

  const activeItems = useMemo(() => {
    if (activeListKey === "all") return items;

    return lists.find((list) => list.key === activeListKey)?.items || [];
  }, [activeListKey, items, lists]);

  const unchecked = useMemo(() => {
    return activeItems.filter((item) => !item.checked);
  }, [activeItems]);

  const checked = useMemo(() => {
    return activeItems.filter((item) => item.checked);
  }, [activeItems]);

  const grouped = useMemo(() => {
    return unchecked.reduce((acc, item) => {
      const type = item.listType || item.category || "other";

      if (!acc[type]) acc[type] = [];
      acc[type].push(item);

      return acc;
    }, {});
  }, [unchecked]);

  const totalOpenItems = items.filter((item) => !item.checked).length;

  const handleAdd = async () => {
    if (!newItem.trim() || !familyId || !canWrite) return;

    const cleanListTitle = newListTitle.trim() || DEFAULT_LIST_TITLE;
    const cleanType = newListType || "other";

    setSaving(true);

    try {
      await addDoc(collection(db, "groceries"), {
        name: newItem.trim(),
        title: newItem.trim(),

        listTitle: cleanListTitle,
        list_title: cleanListTitle,
        listType: cleanType,
        list_type: cleanType,
        listKey: getListKey(cleanListTitle, cleanType),
        list_key: getListKey(cleanListTitle, cleanType),

        category: cleanType,
        quantity: newQuantity.trim(),
        checked: false,
        status: "needed",

        familyId,
        family_id: familyId,

        linkedEventId: "",
        linked_event_id: "",
        linkedMealId: "",
        linked_meal_id: "",

        createdBy: user?.uid || null,
        createdByEmail: user?.email || null,

        created_date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const nextKey = getListKey(cleanListTitle, cleanType);
      setActiveListKey(nextKey);
      setNewItem("");
      setNewQuantity("");

      await loadItems();
    } catch (error) {
      console.error("Error adding list item:", error);
      alert(`There was an error adding the list item: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleItem = async (item) => {
    if (!canWrite) return;

    const nextChecked = !item.checked;

    try {
      await updateDoc(doc(db, "groceries", item.id), {
        checked: nextChecked,
        status: nextChecked ? "done" : "needed",
        completedAt: nextChecked ? serverTimestamp() : null,
        completedBy: nextChecked ? user?.uid || null : null,
        updatedAt: serverTimestamp(),
      });

      await loadItems();
    } catch (error) {
      console.error("Error updating list item:", error);
      alert(`There was an error updating the list item: ${error.message}`);
    }
  };

  const deleteItem = async (id) => {
    if (!canWrite) return;

    const confirmDelete = window.confirm("Delete this list item?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "groceries", id));
      await loadItems();
    } catch (error) {
      console.error("Error deleting list item:", error);
      alert(`There was an error deleting the list item: ${error.message}`);
    }
  };

  const clearChecked = async () => {
    if (!canWrite) return;

    if (checked.length === 0) return;

    const confirmClear = window.confirm("Clear all done items?");
    if (!confirmClear) return;

    try {
      await Promise.all(
        checked.map((item) => deleteDoc(doc(db, "groceries", item.id)))
      );

      await loadItems();
    } catch (error) {
      console.error("Error clearing done list items:", error);
      alert(`There was an error clearing done items: ${error.message}`);
    }
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
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Groceries, school projects, car supplies, meal prep, trips, and event checklists.
          </p>
        </div>

        <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm font-black">
          {loading ? "Loading..." : `${totalOpenItems} open items`}
        </Badge>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveListKey("all")}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black ring-1 transition",
            activeListKey === "all"
              ? "bg-primary text-primary-foreground ring-transparent"
              : "bg-white text-slate-500 ring-slate-200 hover:text-slate-900"
          )}
        >
          <ListChecks className="h-4 w-4" />
          All lists
        </button>

        {lists.map((list) => {
          const config = typeConfig[list.type] || typeConfig.other;
          const Icon = config.icon;
          const openCount = list.items.filter((item) => !item.checked).length;

          return (
            <button
              key={list.key}
              type="button"
              onClick={() => {
                setActiveListKey(list.key);
                setNewListTitle(list.title);
                setNewListType(list.type);
              }}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-black ring-1 transition",
                activeListKey === list.key
                  ? "bg-primary text-primary-foreground ring-transparent"
                  : "bg-white text-slate-500 ring-slate-200 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {list.title}
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px]">
                {openCount}
              </span>
            </button>
          );
        })}
      </div>

      {canWrite && (
        <Card className="mb-5 rounded-[1.75rem] border-white/70 bg-white/76 p-4 shadow-[0_14px_34px_rgba(38,50,56,0.055)]">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_120px_minmax(160px,0.75fr)_170px_auto]">
            <Input
              value={newItem}
              onChange={(event) => setNewItem(event.target.value)}
              placeholder="Add list item... e.g. 5qt oil, poster board, tortillas"
              className="h-11 rounded-2xl bg-white font-semibold"
              onKeyDown={(event) => event.key === "Enter" && handleAdd()}
            />

            <Input
              value={newQuantity}
              onChange={(event) => setNewQuantity(event.target.value)}
              placeholder="Qty"
              className="h-11 rounded-2xl bg-white"
              onKeyDown={(event) => event.key === "Enter" && handleAdd()}
            />

            <Input
              value={newListTitle}
              onChange={(event) => setNewListTitle(event.target.value)}
              placeholder="List / project"
              className="h-11 rounded-2xl bg-white font-semibold"
              onKeyDown={(event) => event.key === "Enter" && handleAdd()}
            />

            <Select value={newListType} onValueChange={setNewListType}>
              <SelectTrigger className="h-11 rounded-2xl bg-white">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {Object.entries(typeConfig).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    {value.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={handleAdd}
              disabled={!newItem.trim() || saving}
              className="h-11 rounded-2xl font-black"
            >
              <Plus className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Add</span>
            </Button>
          </div>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : (
        <>
          {Object.entries(grouped).map(([type, typeItems]) => {
            const config = typeConfig[type] || typeConfig.other;
            const TypeIcon = config.icon;

            return (
              <div key={type} className="mb-5">
                <div className="mb-2 flex items-center gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-2xl ring-1",
                      config.color
                    )}
                  >
                    <TypeIcon className="h-4 w-4" />
                  </div>

                  <p className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                    {config.label}
                  </p>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  {typeItems.map((item) => {
                    const itemConfig =
                      typeConfig[item.listType || item.category] || typeConfig.other;
                    const ItemIcon = itemConfig.icon;

                    return (
                      <Card
                        key={item.id}
                        className="flex items-center gap-3 rounded-[1.35rem] border-white/70 bg-white/82 p-3 shadow-[0_10px_24px_rgba(38,50,56,0.04)]"
                      >
                        <button
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

                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ring-1",
                            itemConfig.color
                          )}
                        >
                          <ItemIcon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-slate-900">
                            {item.name}
                          </p>

                          <p className="truncate text-xs font-semibold text-slate-500">
                            {item.listTitle || DEFAULT_LIST_TITLE}
                            {item.quantity ? ` · ${item.quantity}` : ""}
                          </p>
                        </div>

                        {canWrite && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => deleteItem(item.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {unchecked.length === 0 && (
            <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white/60 py-12 text-center text-muted-foreground">
              <ListChecks className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="font-heading font-semibold">No open list items</p>
              <p className="text-sm">
                {canWrite
                  ? "Add items for a grocery run, school project, meal, car task, or event."
                  : "No list items yet"}
              </p>
            </div>
          )}

          {checked.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-black uppercase tracking-wider text-muted-foreground">
                  Done ({checked.length})
                </p>

                {canWrite && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs font-black text-destructive"
                    onClick={clearChecked}
                  >
                    Clear done
                  </Button>
                )}
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                {checked.map((item) => (
                  <Card
                    key={item.id}
                    className="flex items-center gap-3 rounded-[1.35rem] p-3 opacity-55"
                  >
                    <button
                      onClick={() => toggleItem(item)}
                      disabled={!canWrite}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-primary/10"
                    >
                      <Check className="h-3.5 w-3.5 text-primary" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-muted-foreground line-through">
                        {item.name}
                      </p>

                      <p className="truncate text-xs text-muted-foreground line-through">
                        {item.listTitle || DEFAULT_LIST_TITLE}
                        {item.quantity ? ` · ${item.quantity}` : ""}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
