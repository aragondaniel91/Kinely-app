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
import KidsChoresPreview from "@/features/tasks/components/KidsChoresPreview";

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

function getTaskAssignee(task = {}) {
  return (
    task.assignedToName ||
    task.assigned_to_name ||
    task.assignedTo ||
    task.assigned_to ||
    task.assigneeName ||
    task.assignee_name ||
    task.ownerName ||
    task.owner ||
    "Family"
  );
}

function getTaskDueLabel(task = {}) {
  const value = task.due_date || task.dueDate;
  if (!value) return "No due date";

  try {
    const date = new Date(`${value}T12:00:00`);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

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

  const { familyId, perms, profile } = useFamily();

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
    <div className="relative min-h-full overflow-hidden px-3 pb-28 pt-1 md:px-6 md:pb-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 left-10 h-72 w-72 rounded-full bg-blue-200/35 blur-3xl" />
        <div className="absolute top-20 right-10 h-80 w-80 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-amber-100/45 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-5">
        <Card className="rounded-[2rem] border border-white/80 bg-white/82 p-4 shadow-[0_18px_52px_rgba(15,23,42,0.07)] backdrop-blur-xl md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20">
                  <Check className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-500">
                    Family Tasks
                  </p>
                  <h1 className="truncate text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                    Today’s focus
                  </h1>
                </div>
              </div>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Family tasks, school responsibilities, personal to-dos, and kids routines in one calm daily view.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">
                {allPending.length} pending
              </span>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                {completedTasks.length} completed
              </span>
              <span className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700">
                {highPriorityTasks.length} high priority
              </span>
              {canWrite && (
                <Button
                  onClick={() => setShowAdd(true)}
                  className="h-10 rounded-2xl bg-slate-950 px-4 font-black text-white shadow-lg shadow-slate-900/15 hover:bg-slate-800"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add task
                </Button>
              )}
            </div>
          </div>
        </Card>

        <KidsChoresPreview
          profile={profile}
          canWrite={canWrite}
          onAddTask={() => setShowAdd(true)}
        />

        <Card className="rounded-[2.25rem] border-white/80 bg-white/88 p-4 shadow-[0_18px_52px_rgba(15,23,42,0.07)] backdrop-blur-xl md:p-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                Family board
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                Open tasks by area
              </h2>
            </div>
            <p className="text-sm font-semibold text-slate-500">
              {pending.length} pending · {done.length} completed
            </p>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
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
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-3">
            {pending.length > 0 ? (
              pending.map((task) => {
                const cfg = categoryConfig[task.category] || categoryConfig.other;
                const TaskIcon = cfg.icon;

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "rounded-[1.5rem] border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                      cfg.card
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleTask(task)}
                        disabled={!canWrite}
                        className={cn(
                          "mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-white/75 transition",
                          cfg.text.replace("text-", "border-"),
                          canWrite ? "hover:scale-105" : "cursor-not-allowed opacity-40"
                        )}
                        aria-label="Mark task complete"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black", cfg.text)}>
                            <TaskIcon className="h-3.5 w-3.5" />
                            {cfg.label}
                          </span>
                          <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black capitalize text-slate-500">
                            {task.priority || "medium"}
                          </span>
                          <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-black text-slate-500">
                            📅 {getTaskDueLabel(task)}
                          </span>
                        </div>

                        <p className={cn("mt-2 text-base font-black leading-snug", cfg.text)}>
                          {task.title}
                        </p>

                        <p className="mt-1 text-xs font-bold text-slate-500">
                          Assigned to {getTaskAssignee(task)}
                        </p>
                      </div>

                      {canWrite && (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditTask(task)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/75 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-900"
                            aria-label="Edit task"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setTaskToDelete(task)}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/75 text-red-500 shadow-sm transition hover:bg-red-50 hover:text-red-700"
                            aria-label="Delete task"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50/80 p-8 text-center">
                <p className="text-lg font-black text-slate-900">All clear</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  No open tasks match this filter.
                </p>
              </div>
            )}
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Completed
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-950">
                  Finished tasks
                </h3>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500">
                {done.length}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {done.length > 0 ? (
                done.slice(0, 6).map((task) => (
                  <div key={task.id} className="rounded-2xl border border-slate-200 bg-white/80 p-3">
                    <div className="flex items-start gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTask(task)}
                        disabled={!canWrite}
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-slate-100"
                        aria-label="Reopen task"
                      >
                        <Check className="h-3 w-3 text-slate-500" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-500 line-through">
                          {task.title}
                        </p>
                        <p className="mt-0.5 text-[11px] font-bold text-slate-400">
                          Assigned to {getTaskAssignee(task)}
                        </p>
                      </div>

                      {canWrite && (
                        <button
                          type="button"
                          onClick={() => setTaskToDelete(task)}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-500 shadow-sm transition hover:bg-red-50"
                          aria-label="Delete completed task"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-5 text-center">
                  <p className="text-sm font-black text-slate-700">Nothing completed yet</p>
                  <p className="mt-1 text-xs font-semibold text-slate-400">
                    Finished tasks will appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

        </Card>

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
