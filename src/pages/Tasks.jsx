import React, { useEffect, useMemo, useRef, useState } from "react";

import { useFamily } from "@/lib/FamilyContext";
import AddTaskDialog from "@/components/tasks/AddTaskDialog";

import TasksPageLayout from "@/features/tasks/components/TasksPageLayout";
import FamilyHeader from "@/features/tasks/components/FamilyHeader";
import TaskBoardContent from "@/features/tasks/components/TaskBoardContent";
import DeleteTaskDialog from "@/features/tasks/components/DeleteTaskDialog";
import ApplyTaskTemplateDialog from "@/features/tasks/components/ApplyTaskTemplateDialog";
import ManageTaskTemplatesDialog from "@/features/tasks/components/ManageTaskTemplatesDialog";
import ManageTaskRewardsDialog from "@/features/tasks/components/ManageTaskRewardsDialog";
import RewardCelebrationOverlay from "@/features/tasks/components/RewardCelebrationOverlay";

import { demoTasks } from "@/features/tasks/data/demoTasks";
import { useFamilyTasks } from "@/features/tasks/hooks/useFamilyTasks";
import { useTaskTemplates } from "@/features/tasks/hooks/useTaskTemplates";
import { useTaskRewards } from "@/features/tasks/hooks/useTaskRewards";
import { useTaskBoardPeople } from "@/features/tasks/hooks/useTaskBoardPeople";
import {
  getSelectedPerson,
  getSelectedTasks,
  getTaskStats,
  getTasksByPerson,
} from "@/features/tasks/utils/taskSelectors";
import { filterTasksByDateScope } from "@/features/tasks/utils/taskDateFilters";
import { isDone } from "@/features/tasks/utils/taskHelpers";

export default function Tasks() {
  const {
    children,
    dadName,
    momName,
    familyChildrenCore,
    familyAdults,
    familyPeople,
    familyId,
    perms,
    profile,
    user,
  } = useFamily();

  const boardChildren = children?.length ? children : familyChildrenCore;

  const { people, defaultPersonId } = useTaskBoardPeople({
    children: boardChildren,
    dadName,
    momName,
    familyAdults,
    familyPeople,
    profile,
  });

  const [selectedPersonId, setSelectedPersonId] = useState(defaultPersonId);
  const [showAdd, setShowAdd] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showManageTemplates, setShowManageTemplates] = useState(false);
  const [showManageRewards, setShowManageRewards] = useState(false);
  const [rewardCelebration, setRewardCelebration] = useState(null);
  const previousRewardProgressRef = useRef({
    initialized: false,
    childCompleted: 0,
    childRequired: 0,
    familyCompleted: 0,
    familyRequired: 0,
  });
  const [quickAddPerson, setQuickAddPerson] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTaskScope, setActiveTaskScope] = useState("today");

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
    user,
    profile,
  });

  const { templates, loadTemplates } = useTaskTemplates({
    familyId,
    canRead,
  });

  const {
    childReward,
    childRewards,
    childPeople,
    familyReward,
    firstChildPerson,
    loadRewards,
  } = useTaskRewards({
    familyId,
    canRead,
    people,
  });

  useEffect(() => {
    if (!people.some((person) => person.id === selectedPersonId)) {
      setSelectedPersonId(defaultPersonId);
    }
  }, [defaultPersonId, people, selectedPersonId]);

  const displayTasks = tasks.length > 0 ? tasks : demoTasks;

  const filteredTasks = useMemo(() => {
    if (activeCategory === "all") return displayTasks;
    return displayTasks.filter((task) => (task.category || "other") === activeCategory);
  }, [activeCategory, displayTasks]);

  const allTasksByPerson = useMemo(
    () => getTasksByPerson(displayTasks, people),
    [displayTasks, people]
  );

  const tasksByPerson = useMemo(
    () => getTasksByPerson(filteredTasks, people),
    [filteredTasks, people]
  );

  const selectedPerson = getSelectedPerson(people, selectedPersonId);
  const selectedTasksBase = getSelectedTasks(tasksByPerson, selectedPerson?.id);
  const selectedTasks = useMemo(
    () => filterTasksByDateScope(selectedTasksBase, activeTaskScope),
    [selectedTasksBase, activeTaskScope]
  );

  const rewardEligibleTasks = useMemo(
    () =>
      displayTasks.filter(
        (task) => task.rewardEligible === true || task.reward_eligible === true
      ),
    [displayTasks]
  );

  const rewardTasksByPerson = useMemo(
    () => getTasksByPerson(rewardEligibleTasks, people),
    [rewardEligibleTasks, people]
  );

  const childRewardPersonId = firstChildPerson?.id || people[0]?.id;
  const childTasks = getSelectedTasks(rewardTasksByPerson, childRewardPersonId);

  const childRewardItems = useMemo(
    () =>
      childRewards.map((reward) => {
        const childPerson =
          childPeople.find((person) => {
            const childId = person.childId || person.child_id || person.id;

            return (
              reward.childPersonId === person.id ||
              reward.child_person_id === person.id ||
              reward.childId === childId ||
              reward.child_id === childId ||
              reward.childName === person.name ||
              reward.child_name === person.name
            );
          }) || null;

        return {
          reward,
          person: childPerson,
          tasks: childPerson ? getSelectedTasks(rewardTasksByPerson, childPerson.id) : [],
        };
      }),
    [childRewards, childPeople, rewardTasksByPerson]
  );

  const childRewardCompleted = childTasks.filter(isDone).length;
  const childRewardRequired = Math.max(
    Number(childReward?.requiredTasks || childReward?.required_tasks || childTasks.length || 1),
    1
  );

  const familyRewardCompleted = rewardEligibleTasks.filter(isDone).length;
  const familyRewardRequired = Math.max(
    Number(familyReward?.requiredTasks || familyReward?.required_tasks || rewardEligibleTasks.length || 1),
    1
  );

  useEffect(() => {
    const previous = previousRewardProgressRef.current;

    if (!previous.initialized) {
      previousRewardProgressRef.current = {
        initialized: true,
        childCompleted: childRewardCompleted,
        childRequired: childRewardRequired,
        familyCompleted: familyRewardCompleted,
        familyRequired: familyRewardRequired,
      };
      return;
    }

    const childJustUnlocked =
      childReward &&
      previous.childCompleted < childRewardRequired &&
      childRewardCompleted >= childRewardRequired;

    const familyJustUnlocked =
      familyReward &&
      previous.familyCompleted < familyRewardRequired &&
      familyRewardCompleted >= familyRewardRequired;

    if (childJustUnlocked) {
      setRewardCelebration({
        type: "child",
        title: `${childReward.childName || firstChildPerson?.name || "Your child"} earned ${childReward.title}!`,
        message: `${childRewardCompleted}/${childRewardRequired} reward tasks completed. Time to celebrate.`,
      });
    } else if (familyJustUnlocked) {
      setRewardCelebration({
        type: "family",
        title: `${familyReward.title} unlocked!`,
        message: `${familyRewardCompleted}/${familyRewardRequired} family reward tasks completed together.`,
      });
    }

    previousRewardProgressRef.current = {
      initialized: true,
      childCompleted: childRewardCompleted,
      childRequired: childRewardRequired,
      familyCompleted: familyRewardCompleted,
      familyRequired: familyRewardRequired,
    };
  }, [
    childReward,
    childRewardCompleted,
    childRewardRequired,
    familyReward,
    familyRewardCompleted,
    familyRewardRequired,
    firstChildPerson,
  ]);

  const { completedCount, pendingCount } = getTaskStats(selectedTasks);

  const handleDeleteTask = async (task) => {
    await deleteTask(task);
    setTaskToDelete(null);
  };

  const handleOpenAddTask = (person = null) => {
    setQuickAddPerson(person);
    if (person?.id) setSelectedPersonId(person.id);
    setShowAdd(true);
  };

  const handleCloseAddTask = () => {
    setShowAdd(false);
    setQuickAddPerson(null);
    setEditTask(null);
  };

  const handleOpenTemplates = (person = null) => {
    setQuickAddPerson(person);
    if (person?.id) setSelectedPersonId(person.id);
    setShowTemplates(true);
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
      <FamilyHeader canWrite={canWrite} onAddTask={() => handleOpenAddTask(selectedPerson)} />

      <TaskBoardContent
        people={people}
        tasksByPerson={tasksByPerson}
        selectedPersonId={selectedPersonId}
        selectedPerson={selectedPerson}
        selectedTasks={selectedTasks}
        childReward={childReward}
        childTasks={childTasks}
        childRewardItems={childRewardItems}
        familyReward={familyReward}
        allTasks={rewardEligibleTasks}
        loading={loading}
        canWrite={canWrite}
        pendingCount={pendingCount}
        completedCount={completedCount}
        activeTaskScope={activeTaskScope}
        onTaskScopeChange={setActiveTaskScope}
        onSelectPerson={setSelectedPersonId}
        onQuickAddTask={handleOpenAddTask}
        onAddTask={handleOpenAddTask}
        onApplyTemplate={handleOpenTemplates}
        onManageTemplates={() => setShowManageTemplates(true)}
        onManageRewards={() => setShowManageRewards(true)}
        onToggleTask={toggleTask}
        onEditTask={setEditTask}
        onDeleteTask={setTaskToDelete}
        activeCategory={activeCategory}
        onCategoryChange={setActiveCategory}
      />

      <DeleteTaskDialog
        task={taskToDelete}
        open={Boolean(taskToDelete)}
        onOpenChange={(open) => {
          if (!open) setTaskToDelete(null);
        }}
        onConfirm={handleDeleteTask}
      />

      <ManageTaskTemplatesDialog
        open={showManageTemplates}
        onOpenChange={setShowManageTemplates}
        templates={templates}
        onSaved={loadTemplates}
      />

      <ManageTaskRewardsDialog
        open={showManageRewards}
        onOpenChange={setShowManageRewards}
        people={people}
        childReward={childReward}
        familyReward={familyReward}
        onSaved={loadRewards}
      />

      <ApplyTaskTemplateDialog
        open={showTemplates}
        onOpenChange={setShowTemplates}
        templates={templates}
        people={people}
        initialPersonId={quickAddPerson?.id || selectedPerson?.id || ""}
        onApplied={loadTasks}
      />

      <AddTaskDialog
        open={showAdd || Boolean(editTask)}
        onOpenChange={(open) => {
          if (!open) handleCloseAddTask();
        }}
        people={people}
        editTask={editTask}
        initialAssigneePersonId={quickAddPerson?.id || selectedPerson?.id || ""}
        onTaskSaved={async () => {
          await loadTasks();
          handleCloseAddTask();
        }}
      />

      <RewardCelebrationOverlay
        celebration={rewardCelebration}
        onClose={() => setRewardCelebration(null)}
      />
    </TasksPageLayout>
  );
}
