import React, { useMemo, useState } from "react";

import { useFamily } from "@/lib/FamilyContext";
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

import TasksPageLayout from "@/features/tasks/components/TasksPageLayout";
import FamilyHeader from "@/features/tasks/components/FamilyHeader";
import PersonCard from "@/features/tasks/components/PersonCard";
import TasksFocusPanel from "@/features/tasks/components/TasksFocusPanel";
import TasksRewardsPanel from "@/features/tasks/components/TasksRewardsPanel";
import BottomFocusBar from "@/features/tasks/components/BottomFocusBar";

import { taskPeople } from "@/features/tasks/data/taskPeople";
import { demoTasks } from "@/features/tasks/data/demoTasks";
import {
  getActiveChildReward,
  getActiveFamilyReward,
} from "@/features/tasks/data/demoRewards";
import { useFamilyTasks } from "@/features/tasks/hooks/useFamilyTasks";
import {
  getSelectedPerson,
  getSelectedTasks,
  getTaskStats,
  getTasksByPerson,
} from "@/features/tasks/utils/taskSelectors";

export default function Tasks() {
  const [selectedPersonId, setSelectedPersonId] = useState("joaquin");
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

  const tasksByPerson = useMemo(
    () => getTasksByPerson(displayTasks, taskPeople),
    [displayTasks]
  );

  const selectedPerson = getSelectedPerson(taskPeople, selectedPersonId);
  const selectedTasks = getSelectedTasks(tasksByPerson, selectedPerson?.id);
  const joaquinTasks = getSelectedTasks(tasksByPerson, "joaquin");

  const childReward = getActiveChildReward("joaquin");
  const familyReward = getActiveFamilyReward();

  const { completedCount, pendingCount } = getTaskStats(displayTasks);

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
    <TasksPageLayout>
      <FamilyHeader canWrite={canWrite} onAddTask={() => setShowAdd(true)} />

      <div className="grid gap-4 xl:grid-cols-5">
        {taskPeople.map((person) => (
          <PersonCard
            key={person.id}
            person={person}
            tasks={tasksByPerson[person.id] || []}
            selected={selectedPersonId === person.id}
            onSelect={setSelectedPersonId}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_420px]">
        <TasksFocusPanel
          selectedPerson={selectedPerson}
          selectedTasks={selectedTasks}
          loading={loading}
          canWrite={canWrite}
          pendingCount={pendingCount}
          completedCount={completedCount}
          onToggleTask={toggleTask}
          onEditTask={setEditTask}
          onDeleteTask={setTaskToDelete}
        />

        <TasksRewardsPanel
          childReward={childReward}
          childTasks={joaquinTasks}
          familyReward={familyReward}
          allTasks={displayTasks}
        />
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
    </TasksPageLayout>
  );
}
