import React, { useEffect, useMemo, useState } from "react";

import { useFamily } from "@/lib/FamilyContext";
import AddTaskDialog from "@/components/tasks/AddTaskDialog";

import TasksPageLayout from "@/features/tasks/components/TasksPageLayout";
import FamilyHeader from "@/features/tasks/components/FamilyHeader";
import TaskBoardContent from "@/features/tasks/components/TaskBoardContent";
import DeleteTaskDialog from "@/features/tasks/components/DeleteTaskDialog";

import { demoTasks } from "@/features/tasks/data/demoTasks";
import {
  getActiveChildReward,
  getActiveFamilyReward,
} from "@/features/tasks/data/demoRewards";
import { useFamilyTasks } from "@/features/tasks/hooks/useFamilyTasks";
import { useTaskBoardPeople } from "@/features/tasks/hooks/useTaskBoardPeople";
import {
  getSelectedPerson,
  getSelectedTasks,
  getTaskStats,
  getTasksByPerson,
} from "@/features/tasks/utils/taskSelectors";

export default function Tasks() {
  const { familyId, perms } = useFamily();
  const { people, defaultPersonId } = useTaskBoardPeople();

  const [selectedPersonId, setSelectedPersonId] = useState(defaultPersonId);
  const [showAdd, setShowAdd] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);

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

  useEffect(() => {
    if (!people.some((person) => person.id === selectedPersonId)) {
      setSelectedPersonId(defaultPersonId);
    }
  }, [defaultPersonId, people, selectedPersonId]);

  const displayTasks = tasks.length > 0 ? tasks : demoTasks;

  const tasksByPerson = useMemo(
    () => getTasksByPerson(displayTasks, people),
    [displayTasks, people]
  );

  const selectedPerson = getSelectedPerson(people, selectedPersonId);
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

      <TaskBoardContent
        people={people}
        tasksByPerson={tasksByPerson}
        selectedPersonId={selectedPersonId}
        selectedPerson={selectedPerson}
        selectedTasks={selectedTasks}
        childReward={childReward}
        childTasks={joaquinTasks}
        familyReward={familyReward}
        allTasks={displayTasks}
        loading={loading}
        canWrite={canWrite}
        pendingCount={pendingCount}
        completedCount={completedCount}
        onSelectPerson={setSelectedPersonId}
        onToggleTask={toggleTask}
        onEditTask={setEditTask}
        onDeleteTask={setTaskToDelete}
      />

      <DeleteTaskDialog
        task={taskToDelete}
        open={Boolean(taskToDelete)}
        onOpenChange={(open) => {
          if (!open) setTaskToDelete(null);
        }}
        onConfirm={handleDeleteTask}
      />

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
