import React, { useEffect, useMemo, useState } from "react";
import {
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
  Plus,
  Check,
  Trash2,
  Home,
  Briefcase,
  GraduationCap,
  User,
  MoreHorizontal,
  Pencil,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import AddTaskDialog from "@/components/tasks/AddTaskDialog";

const categoryConfig = {
  house: {
    icon: Home,
    label: "House",
    bg: "bg-amber-400",
    card: "bg-amber-50 border-amber-200",
    text: "text-amber-800",
  },
  work: {
    icon: Briefcase,
    label: "Work",
    bg: "bg-blue-500",
    card: "bg-blue-50 border-blue-200",
    text: "text-blue-800",
  },
  school: {
    icon: GraduationCap,
    label: "School",
    bg: "bg-emerald-500",
    card: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-800",
  },
  personal: {
    icon: User,
    label: "Personal",
    bg: "bg-violet-500",
    card: "bg-violet-50 border-violet-200",
    text: "text-violet-800",
  },
  other: {
    icon: MoreHorizontal,
    label: "Other",
    bg: "bg-slate-400",
    card: "bg-slate-50 border-slate-200",
    text: "text-slate-800",
  },
};

const priorityDot = {
  high: "bg-red-500",
  medium: "bg-amber-400",
  low: "bg-green-500",
};

function normalizeTask(docSnap) {
  const data = docSnap.data();

  return {
    id: docSnap.id,
    ...data,
    due_date: data.due_date || data.dueDate || "",
    category: data.category || "other",
    priority: data.priority || "medium",
    status: data.status || "pending",
  };
}

export default function Tasks() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const { familyId, perms } = useFamily();

  const canRead = perms?.tasks?.read !== false;
  const canWrite = perms?.tasks?.write !== false;

  const loadTasks = async () => {
    if (!familyId || !canRead) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      let snap;

      try {
        const q = query(
          collection(db, "tasks"),
          where("familyId", "==", familyId)
        );

        snap = await getDocs(q);
      } catch (error) {
        console.warn("Fallback to family_id query:", error);

        const q = query(
          collection(db, "tasks"),
          where("family_id", "==", familyId)
        );

        snap = await getDocs(q);
      }

      const data = snap.docs.map(normalizeTask);

      data.sort((a, b) => {
        const aDate = a.created_date || "";
        const bDate = b.created_date || "";
        return bDate.localeCompare(aDate);
      });

      setTasks(data);
    } catch (error) {
      console.error("Error loading tasks:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, canRead]);

  const toggleTask = async (task) => {
    if (!canWrite) return;

    try {
      await updateDoc(doc(db, "tasks", task.id), {
        status: task.status === "pending" ? "done" : "pending",
        updatedAt: serverTimestamp(),
      });

      await loadTasks();
    } catch (error) {
      console.error("Error toggling task:", error);
      alert(`There was an error updating the task: ${error.message}`);
    }
  };

  const deleteTask = async (taskOrId) => {
    if (!canWrite) return;

    const id = typeof taskOrId === "string" ? taskOrId : taskOrId?.id;
    if (!id) return;

    try {
      await deleteDoc(doc(db, "tasks", id));
      setTaskToDelete(null);
      await loadTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      alert(`There was an error deleting the task: ${error.message}`);
    }
  };

  const categories = Object.keys(categoryConfig);

  const filtered = useMemo(() => {
    return activeCategory === "all"
      ? tasks
      : tasks.filter((t) => t.category === activeCategory);
  }, [activeCategory, tasks]);

  const pending = filtered.filter((t) => t.status === "pending");
  const done = filtered.filter((t) => t.status === "done");

  const allPending = tasks.filter((task) => task.status === "pending");
  const completedTasks = tasks.filter((task) => task.status === "done");
  const highPriorityTasks = allPending.filter((task) => task.priority === "high");
  const dueSoonTasks = allPending.filter((task) => task.due_date || task.dueDate);
  const kidsChorePreviewCount = tasks.filter((task) =>
    ["school", "house"].includes(task.category)
  ).length;

  const columns =
    activeCategory === "all"
      ? categories.map((cat) => ({
          key: cat,
          config: categoryConfig[cat],
          tasks: tasks.filter(
            (t) => t.category === cat && t.status === "pending"
          ),
        }))
      : [
          {
            key: activeCategory,
            config: categoryConfig[activeCategory] || categoryConfig.other,
            tasks: pending,
          },
        ];

  if (!canRead) {
    return (
      <div className="p-6 max-w-xl mx-auto text-center">
        <h1 className="text-2xl font-bold font-heading mb-2">Task Board</h1>
        <p className="text-muted-foreground">
          You do not have access to tasks for this family.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-3 pb-28 pt-3 md:px-6 md:pb-12">
      <div className="mx-auto max-w-7xl space-y-5">
        <Card className="rounded-[1.75rem] border-white/80 bg-white/90 p-4 shadow-[0_16px_45px_rgba(15,23,42,0.07)] backdrop-blur-xl md:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                  <Check className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-500">
                    Family Tasks
                  </p>
                  <h1 className="truncate text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                    Today’s focus
                  </h1>
                </div>
              </div>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-500">
                Coordinate family tasks, school responsibilities, personal to-dos, and future kids chores with rewards.
              </p>
            </div>

            {canWrite && (
              <Button
                onClick={() => setShowAdd(true)}
                className="h-11 rounded-2xl px-5 font-black shadow-lg shadow-indigo-600/15"
              >
                <Plus className="mr-2 h-4 w-4" /> Add task
              </Button>
            )}
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-3">
              <p className="text-xl font-black text-blue-700">{allPending.length}</p>
              <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-blue-500">Pending</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3">
              <p className="text-xl font-black text-emerald-700">{completedTasks.length}</p>
              <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-500">Completed</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50/80 p-3">
              <p className="text-xl font-black text-rose-700">{highPriorityTasks.length}</p>
              <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-rose-500">High priority</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50/80 p-3">
              <p className="text-xl font-black text-amber-700">{kidsChorePreviewCount}</p>
              <p className="mt-0.5 text-[10px] font-black uppercase tracking-wide text-amber-500">Kids & home</p>
            </div>
          </div>

          <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-indigo-600">
              Coming next
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              Kids routines, chores, and reward unlocks for screen time, treats, or family privileges.
            </p>
          </div>
        </Card>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-5 scrollbar-hide">
        <button
          onClick={() => setActiveCategory("all")}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border",
            activeCategory === "all"
              ? "bg-foreground text-background border-foreground"
              : "bg-card border-border text-muted-foreground hover:border-foreground/30"
          )}
        >
          All
        </button>

        {categories.map((cat) => {
          const cfg = categoryConfig[cat];
          const Icon = cfg.icon;

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all border flex items-center gap-1.5",
                activeCategory === cat
                  ? `${cfg.bg} text-white border-transparent`
                  : "bg-card border-border text-muted-foreground hover:border-foreground/30"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((col) => {
            const ColIcon = col.config.icon;

            return (
              <div key={col.key} className="flex-shrink-0 w-64 flex flex-col">
                <div
                  className={cn(
                    "rounded-xl px-3 py-2 mb-3 flex items-center gap-2 border",
                    col.config.card
                  )}
                >
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center text-white",
                      col.config.bg
                    )}
                  >
                    <ColIcon className="w-4 h-4" />
                  </div>

                  <span
                    className={cn(
                      "font-bold font-heading text-sm flex-1",
                      col.config.text
                    )}
                  >
                    {col.config.label}
                  </span>

                  <span
                    className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      col.config.card,
                      col.config.text
                    )}
                  >
                    {col.tasks.length}
                  </span>
                </div>

                <div className="space-y-2 flex-1">
                  {col.tasks.map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "rounded-xl border p-3 shadow-sm hover:shadow-md transition-all group",
                        col.config.card
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => toggleTask(task)}
                          disabled={!canWrite}
                          className={cn(
                            "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                            col.config.text.replace("text-", "border-"),
                            canWrite
                              ? "hover:opacity-70"
                              : "opacity-40 cursor-not-allowed"
                          )}
                        />

                        <p
                          className={cn(
                            "flex-1 font-semibold text-sm leading-snug",
                            col.config.text
                          )}
                        >
                          {task.title}
                        </p>

                        {canWrite && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditTask(task)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setTaskToDelete(task)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {(task.priority || task.due_date) && (
                        <div className="flex items-center gap-2 mt-2 pl-7">
                          {task.priority && (
                            <div className="flex items-center gap-1">
                              <div
                                className={cn(
                                  "w-2 h-2 rounded-full",
                                  priorityDot[task.priority] || "bg-gray-400"
                                )}
                              />
                              <span className="text-xs text-muted-foreground capitalize">
                                {task.priority}
                              </span>
                            </div>
                          )}

                          {task.due_date && (
                            <span className="text-xs text-muted-foreground">
                              📅 {task.due_date}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {col.tasks.length === 0 && (
                    <div
                      className={cn(
                        "rounded-xl border-2 border-dashed p-4 text-center",
                        col.config.card
                      )}
                    >
                      <p className={cn("text-xs opacity-50", col.config.text)}>
                        No tasks
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {activeCategory === "all" && done.length > 0 && (
            <div className="flex-shrink-0 w-64 flex flex-col">
              <div className="rounded-xl px-3 py-2 mb-3 flex items-center gap-2 border bg-slate-100 border-slate-200">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white bg-slate-400">
                  <Check className="w-4 h-4" />
                </div>

                <span className="font-bold font-heading text-sm flex-1 text-slate-600">
                  Done
                </span>

                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {done.length}
                </span>
              </div>

              <div className="space-y-2">
                {done.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border p-3 bg-slate-100 border-slate-200 opacity-60 group"
                  >
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => toggleTask(task)}
                        disabled={!canWrite}
                        className="mt-0.5 w-5 h-5 rounded-full border-2 border-slate-400 bg-slate-300 flex items-center justify-center shrink-0"
                      >
                        <Check className="w-3 h-3 text-slate-600" />
                      </button>

                      <p className="flex-1 text-sm text-slate-500 line-through">
                        {task.title}
                      </p>

                      {canWrite && (
                        <button
                          type="button"
                          onClick={() => setTaskToDelete(task)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AlertDialog
        open={Boolean(taskToDelete)}
        onOpenChange={(open) => {
          if (!open) setTaskToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-[2rem] border-slate-200 bg-white p-6 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-black tracking-tight text-slate-950">
              Delete task?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-semibold leading-6 text-slate-500">
              This will remove “{taskToDelete?.title || "this task"}” from the family task board.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-2xl font-black">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                deleteTask(taskToDelete);
              }}
              className="rounded-2xl bg-red-600 font-black text-white hover:bg-red-700"
            >
              Delete task
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {(showAdd || editTask) && (
        <AddTaskDialog
          editTask={editTask}
          onClose={() => {
            setShowAdd(false);
            setEditTask(null);
          }}
          onSuccess={async () => {
            await loadTasks();
            setShowAdd(false);
            setEditTask(null);
          }}
        />
      )}
      </div>
    </div>
  );
}
