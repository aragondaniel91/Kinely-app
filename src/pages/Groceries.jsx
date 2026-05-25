import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  Apple,
  ArchiveRestore,
  CalendarDays,
  Check,
  CheckSquare,
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

const listTypeConfig = {
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

const quickListTemplates = [
  {
    title: "Jeep Oil Change",
    type: "car",
    description: "Supplies and reminders for a car maintenance day.",
  },
  {
    title: "Joaquin School Project",
    type: "school",
    description: "Materials and prep steps for a school deadline.",
  },
  {
    title: "Taco Night",
    type: "meal",
    description: "Ingredients and prep items for a family meal.",
  },
  {
    title: "Family Trip Packing",
    type: "trip",
    description: "Packing list for clothes, documents, snacks, and essentials.",
  },
  {
    title: "Birthday Party",
    type: "event",
    description: "Supplies, gifts, food, and setup items for a family event.",
  },
  {
    title: "House Supplies",
    type: "household",
    description: "Things needed around the house.",
  },
];

function normalizeList(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    ...data,
    title: data.title || "Untitled list",
    type: data.type || "other",
    status: data.status || "active",
    description: data.description || "",
    created_date: data.created_date || "",
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
    created_date: data.created_date || "",
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
  return list.linkedEventId || list.linked_event_id || "";
}

export default function Groceries() {
  const { familyId, user, perms } = useFamily();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const canRead =
    perms?.lists?.read !== false &&
    perms?.groceries?.read !== false &&
    perms?.meals?.read !== false;

  const canWrite =
    perms?.lists?.write !== false &&
    perms?.groceries?.write !== false &&
    perms?.meals?.write !== false;

  const [lists, setLists] = useState([]);
  const [items, setItems] = useState([]);
  const [linkedTasks, setLinkedTasks] = useState([]);
  const [activeListId, setActiveListId] = useState("");
  const [showArchivedLists, setShowArchivedLists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingList, setSavingList] = useState(false);
  const [savingItem, setSavingItem] = useState(false);

  const [newListTitle, setNewListTitle] = useState("");
  const [newListType, setNewListType] = useState("groceries");
  const [newListDescription, setNewListDescription] = useState("");

  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [newItemNote, setNewItemNote] = useState("");

  const loadData = async () => {
    if (!familyId || !canRead) {
      setLists([]);
      setItems([]);
      setLinkedTasks([]);
      setLinkedTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [listSnap, itemSnap, taskSnap] = await Promise.all([
        getDocs(query(collection(db, LIST_COLLECTION), where("familyId", "==", familyId))),
        getDocs(query(collection(db, ITEM_COLLECTION), where("familyId", "==", familyId))),
        getDocs(query(collection(db, TASK_COLLECTIONS.tasks), where("familyId", "==", familyId))),
      ]);

      const nextLists = listSnap.docs
        .map(normalizeList)
        .sort((a, b) => {
          const aDate = a.created_date || "";
          const bDate = b.created_date || "";
          return bDate.localeCompare(aDate);
        });

      const nextItems = itemSnap.docs
        .map(normalizeItem)
        .filter((item) => item.status !== "archived")
        .sort((a, b) => {
          const aDate = a.created_date || "";
          const bDate = b.created_date || "";
          return bDate.localeCompare(aDate);
        });

      const nextLinkedTasks = taskSnap.docs
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

      setLists(nextLists);
      setItems(nextItems);
      setLinkedTasks(nextLinkedTasks);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      visibleLists.find((list) => list.id === activeListId) ||
      visibleLists[0] ||
      null
    );
  }, [visibleLists, activeListId]);

  const activeItems = activeList ? itemsByListId[activeList.id] || [] : [];
  const neededItems = activeItems.filter((item) => !item.checked);
  const doneItems = activeItems.filter((item) => item.checked);
  const activeListIds = new Set(activeLists.map((list) => list.id));
  const totalOpenItems = items.filter(
    (item) => !item.checked && activeListIds.has(item.listId)
  ).length;

  function applyQuickTemplate(template) {
    setNewListTitle(template.title);
    setNewListType(template.type);
    setNewListDescription(template.description || "");
  }

  const createList = async () => {
    const cleanTitle = newListTitle.trim();

    if (!cleanTitle || !familyId || !canWrite) return;

    setSavingList(true);

    try {
      const docRef = await addDoc(collection(db, LIST_COLLECTION), {
        title: cleanTitle,
        type: newListType || "other",
        description: newListDescription.trim(),
        status: "active",

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

      setActiveListId(docRef.id);
      setSearchParams({ listId: docRef.id });
      setNewListTitle("");
      setNewListDescription("");
      setNewListType("groceries");

      await loadData();
    } catch (error) {
      console.error("Error creating family list:", error);
      alert(`There was an error creating the list: ${error.message}`);
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
        list_id: activeList.id,
        listTitle: activeList.title,
        list_title: activeList.title,
        listType: activeList.type,
        list_type: activeList.type,

        familyId,
        family_id: familyId,

        assignedToPersonId: "",
        assigned_to_person_id: "",
        requestedByPersonId: "",
        requested_by_person_id: "",

        createdBy: user?.uid || null,
        createdByEmail: user?.email || null,
        created_date: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setNewItemTitle("");
      setNewItemQuantity("");
      setNewItemNote("");

      await loadData();
    } catch (error) {
      console.error("Error adding list item:", error);
      alert(`There was an error adding the item: ${error.message}`);
    } finally {
      setSavingItem(false);
    }
  };

  const toggleItem = async (item) => {
    if (!canWrite) return;

    const nextDone = !item.checked;

    try {
      await updateDoc(doc(db, ITEM_COLLECTION, item.id), {
        checked: nextDone,
        status: nextDone ? "done" : "needed",
        completedAt: nextDone ? serverTimestamp() : null,
        completedBy: nextDone ? user?.uid || null : null,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });

      await loadData();
    } catch (error) {
      console.error("Error updating list item:", error);
      alert(`There was an error updating the item: ${error.message}`);
    }
  };

  const deleteItem = async (item) => {
    if (!canWrite || !item?.id) return;

    const confirmDelete = window.confirm("Delete this item?");
    if (!confirmDelete) return;

    try {
      await updateDoc(doc(db, ITEM_COLLECTION, item.id), {
        status: "archived",
        archivedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });

      await loadData();
    } catch (error) {
      console.error("Error deleting list item:", error);
      alert(`There was an error deleting the item: ${error.message}`);
    }
  };

  function goToLinkedEvent(list) {
    const linkedEventId = getLinkedEventId(list);

    if (!linkedEventId) return;

    navigate(`/calendar?eventId=${linkedEventId}`);
  }

  function createLinkedTaskFromList(list) {
    if (!list?.id) return;

    const params = new URLSearchParams({
      linkedListId: list.id,
      listTitle: list.title || "Family list",
      action: "createTask",
    });

    const linkedEventId = getLinkedEventId(list);
    if (linkedEventId) params.set("linkedEventId", linkedEventId);

    navigate(`/tasks?${params.toString()}`);
  }

  function viewLinkedTasksFromList(list) {
    if (!list?.id) return;

    navigate(`/tasks?linkedListId=${list.id}`);
  }

  const archiveList = async (list) => {
    if (!canWrite || !list?.id) return;

    const confirmArchive = window.confirm(`Hide "${list.title}" from active lists? You can restore archived lists later once the archive view is available.`);
    if (!confirmArchive) return;

    try {
      await updateDoc(doc(db, LIST_COLLECTION, list.id), {
        status: "archived",
        archivedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });

      setActiveListId("");
      setSearchParams({});
      await loadData();
    } catch (error) {
      console.error("Error archiving list:", error);
      alert(`There was an error archiving the list: ${error.message}`);
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

      setShowArchivedLists(false);
      setActiveListId(list.id);
      setSearchParams({ listId: list.id });
      await loadData();
    } catch (error) {
      console.error("Error restoring list:", error);
      alert(`There was an error restoring the list: ${error.message}`);
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

          <p className="mt-1 max-w-2xl text-sm font-semibold text-slate-500">
            Groceries, school projects, car supplies, meal prep, trips, gifts, and event checklists.
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

      {canWrite && (
        <Card className="mb-5 rounded-[1.75rem] border-white/70 bg-white/76 p-4 shadow-[0_14px_34px_rgba(38,50,56,0.055)]">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Plus className="h-4 w-4" />
            </div>

            <div>
              <p className="text-sm font-black text-slate-950">Create list / project</p>
              <p className="text-xs font-semibold text-slate-500">
                Example: Jeep Oil Change, Joaquin Science Project, Taco Night.
              </p>
            </div>
          </div>

          <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
            {quickListTemplates.map((template) => {
              const config = listTypeConfig[template.type] || listTypeConfig.other;
              const Icon = config.icon;

              return (
                <button
                  key={`${template.type}-${template.title}`}
                  type="button"
                  onClick={() => applyQuickTemplate(template)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-500 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                >
                  <span className={cn("flex h-7 w-7 items-center justify-center rounded-xl ring-1", config.color)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {template.title}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_minmax(0,1fr)_auto]">
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
          <aside className="space-y-3">
            {visibleLists.length > 0 ? (
              visibleLists.map((list) => {
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
                          {(tasksByListId[list.id]?.length || 0) > 0
                            ? ` · ${tasksByListId[list.id].length} task${tasksByListId[list.id].length === 1 ? "" : "s"}`
                            : ""}
                        </p>

                        {list.description && (
                          <p className="mt-1 line-clamp-2 text-xs font-semibold text-slate-400">
                            {list.description}
                          </p>
                        )}

                        {isCalendarLinkedList(list) && (
                          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black text-violet-700 ring-1 ring-violet-100">
                            <CalendarDays className="h-3 w-3" />
                            Linked to calendar
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <Card className="rounded-[1.75rem] border-dashed border-slate-200 bg-white/60 p-6 text-center">
                <ListChecks className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                <p className="font-black text-slate-950">
                  {showArchivedLists ? "No hidden lists" : "No lists yet"}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  {showArchivedLists
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

                    <div>
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

                      {isCalendarLinkedList(activeList) && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-black text-violet-700 ring-1 ring-violet-100">
                          <CalendarDays className="h-3.5 w-3.5" />
                          Linked to calendar
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
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

                    {isCalendarLinkedList(activeList) && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => goToLinkedEvent(activeList)}
                        className="rounded-2xl border-violet-200 bg-violet-50 font-black text-violet-700 hover:bg-violet-100 hover:text-violet-800"
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        View event
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
    </div>
  );
}
