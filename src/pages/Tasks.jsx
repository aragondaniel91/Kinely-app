import React, { useMemo, useState } from "react";
import {
  Clock,
  Gift,
  MoreHorizontal,
  Star,
} from "lucide-react";

import { useFamily } from "@/lib/FamilyContext";
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
import AddTaskDialog from "@/components/tasks/AddTaskDialog";

import FamilyHeader from "@/features/tasks/components/FamilyHeader";
import PersonCard from "@/features/tasks/components/PersonCard";
import TaskTile from "@/features/tasks/components/TaskTile";
import ChildRewardCard from "@/features/tasks/components/ChildRewardCard";
import FamilyRewardCard from "@/features/tasks/components/FamilyRewardCard";
import BottomFocusBar from "@/features/tasks/components/BottomFocusBar";

import { taskPeople } from "@/features/tasks/data/taskPeople";
import { demoTasks } from "@/features/tasks/data/demoTasks";
import { useFamilyTasks } from "@/features/tasks/hooks/useFamilyTasks";
import {
  getTaskAssignee,
  isDone,
  normalizeAssignee,
} from "@/features/tasks/utils/taskHelpers";

export default function Tasks() {
  const [selectedPerson, setSelectedPerson] = useState("joaquin");
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);

  const { familyId, perms } = useFamily();

  const canRead = perms?.tasks?.read !== false;
  const canWrite = perms?.tasks?.write !== false;

  const {
    tasks,
    loading,
    loadTasks,
    toggleTask,
    deleteTask,
  } = useFamilyTasks({
    familyId,
    canRead,
    canWrite,
  });

  const displayTasks = tasks.length > 0 ? tasks : demoTasks;

  const tasksByPerson = useMemo(() => {
    return taskPeople.reduce((acc, person) => {
      acc[person.id] = displayTasks.filter(
        (task) => normalizeAssignee(getTaskAssignee(task)) === person.id
      );

      return acc;
    }, {});
  }, [displayTasks]);

  const selected =
    taskPeople.find((person) => person.id === selectedPerson) || taskPeople[0];

  const selectedTasks = tasksByPerson[selected.id] || [];
  const joaquinTasks = tasksByPerson.joaquin || [];

  const completedCount = displayTasks.filter(isDone).length;
  const pendingCount = displayTasks.filter((task) => !isDone(task)).length;

  const handleDeleteTask = async (task) => {
    await deleteTask(task);
    setTaskToDelete(null);
  };

  if (!canRead) {
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <h1 className="mb-2 text-2xl font-black tracking-tight text-slate-950">
          Family Rhythm Board
        </h1>
        <p className="font-semibold text-muted-foreground">
          You do not have access to tasks for this family.
        </p>
      </div>
    );
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-[#f8f4ec] px-3 pb-28 pt-2 md:px-6 md:pb-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 top-10 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-orange-100/70 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-80 w-80 rounded-full bg-violet-100/55 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1500px] space-y-5">
        <FamilyHeader canWrite={canWrite} onAddTask={() => setShowAdd(true)} />

        <div className="grid gap-4 xl:grid-cols-5">
          {taskPeople.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              tasks={tasksByPerson[person.id] || []}
              selected={selectedPerson === person.id}
              onSelect={setSelectedPerson}
            />
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_420px]">
          <Card className="rounded-[2.25rem] border-emerald-200 bg-white/82 p-5 shadow-[0_24px_70px_rgba(38,50,56,0.08)] backdrop-blur-xl">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
                  <Star className="h-4 w-4" />
                  Focus del día
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  Tareas de {selected.name}
                </h2>
                <p className="mt-1 text-sm font-extrabold text-slate-500">
                  Iconos grandes, checks claros y lectura rápida para wall screen.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
                <Clock className="h-5 w-5 text-slate-400" />
                <span className="text-sm font-black text-slate-600">
                  {pendingCount} pending · {completedCount} done
                </span>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-800" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {selectedTasks.length > 0 ? (
                  selectedTasks.map((task) => (
                    <TaskTile
                      key={task.id}
                      task={task}
                      canWrite={canWrite}
                      onToggle={toggleTask}
                      onEdit={setEditTask}
                      onDelete={setTaskToDelete}
                    />
                  ))
                ) : (
                  <div className="col-span-full rounded-[2rem] border border-dashed border-slate-200 bg-slate-50/80 p-10 text-center">
                    <MoreHorizontal className="mx-auto h-10 w-10 text-slate-300" />
                    <p className="mt-3 text-xl font-black text-slate-900">
                      No hay tareas para {selected.name}
                    </p>
                    <p className="mt-1 text-sm font-bold text-slate-500">
                      Agrega una tarea nueva para verla en este board.
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>

          <div className="space-y-5">
            <ChildRewardCard
              childName="Joaquin"
              rewardName="Helado"
              childTasks={joaquinTasks}
            />

            <FamilyRewardCard
              rewardName="Pizza Night"
              allTasks={displayTasks}
            />

            <Card className="rounded-[2rem] border-white/80 bg-white/80 p-5 shadow-[0_18px_45px_rgba(38,50,56,0.07)]">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                  <Gift className="h-7 w-7" />
                </div>

                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                    Rhythm note
                  </p>
                  <h3 className="mt-1 text-xl font-black text-slate-950">
                    La familia avanza junta.
                  </h3>
                  <p className="mt-1 text-sm font-bold leading-6 text-slate-500">
                    Rewards individuales para cada hijo y una recompensa familiar para crear conexión.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <BottomFocusBar tasksByPerson={tasksByPerson} />

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
                  handleDeleteTask(taskToDelete);
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
