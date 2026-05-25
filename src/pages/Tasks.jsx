import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

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
import { useRecurringTaskGenerator } from "@/features/tasks/hooks/useRecurringTaskGenerator";
import { useRoutineRuns } from "@/features/tasks/hooks/useRoutineRuns";
import { useTaskBoardPeople } from "@/features/tasks/hooks/useTaskBoardPeople";
import {
  getSelectedPerson,
  getSelectedTasks,
  getTaskStats,
  getTasksByPerson,
} from "@/features/tasks/utils/taskSelectors";
import { filterTasksByDateScope } from "@/features/tasks/utils/taskDateFilters";
import { getRewardProgress } from "@/features/tasks/utils/rewardProgress";

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

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

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
    childProgressByRewardId: {},
    familyCompleted: 0,
    familyRequired: 0,
  });
  const rewardCelebrationArmedRef = useRef(false);
  const [quickAddPerson, setQuickAddPerson] = useState(null);
  const [linkedTaskDraft, setLinkedTaskDraft] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTaskScope, setActiveTaskScope] = useState("today");

  const canRead = perms?.tasks?.read !== false;
  const canWrite = perms?.tasks?.write !== false;

  const linkedListIdFilter = searchParams.get("linkedListId") || "";
  const linkedListTitleFilter = searchParams.get("listTitle") || "";
  const linkedEventIdFilter = searchParams.get("linkedEventId") || "";
  const linkedTaskAction = searchParams.get("action") || "";

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
    routineRuns,
    loadRoutineRuns,
    skipRoutineToday,
    regenerateRoutineToday,
    cancelRoutineToday,
  } = useRoutineRuns({
    familyId,
    canRead,
    canWrite,
    user,
    profile,
    people,
  });

  const {
    childReward,
    childRewards,
    childPeople,
    familyReward,
    firstChildPerson,
    loadRewards,
    resetReward,
  } = useTaskRewards({
    familyId,
    canRead,
    people,
    user,
    profile,
  });

  useRecurringTaskGenerator({
    familyId,
    canRead,
    canWrite,
    templates,
    people,
    user,
    profile,
    onGenerated: async () => {
      await loadTasks();
      await loadRoutineRuns();
    },
  });

  useEffect(() => {
    if (!people.some((person) => person.id === selectedPersonId)) {
      setSelectedPersonId(defaultPersonId);
    }
  }, [defaultPersonId, people, selectedPersonId]);

  useEffect(() => {
    if (linkedTaskAction !== "createTask" || !linkedListIdFilter || !canWrite) return;

    const assigneePersonId = searchParams.get("assigneePersonId") || "family";
    const assigneePerson = people.find((person) => person.id === assigneePersonId);

    setLinkedTaskDraft({
      title: linkedListTitleFilter ? `Follow up: ${linkedListTitleFilter}` : "Follow up task",
      category: "family",
      priority: "medium",
      linkedListId: linkedListIdFilter,
      linkedListTitle: linkedListTitleFilter || "Family list",
      linkedEventId: linkedEventIdFilter,
      source: "familyList",
      assignedToPersonId: assigneePerson?.id || assigneePersonId || "family",
    });

    setQuickAddPerson(assigneePerson || people.find((person) => person.id === "family") || null);
    if (assigneePerson?.id) setSelectedPersonId(assigneePerson.id);
    setShowAdd(true);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("action");
    setSearchParams(nextParams, { replace: true });
  }, [
    linkedTaskAction,
    linkedListIdFilter,
    linkedListTitleFilter,
    linkedEventIdFilter,
    canWrite,
    people,
    searchParams,
    setSearchParams,
  ]);

  const displayTasksBase = tasks.length > 0 ? tasks : demoTasks;

  const displayTasks = useMemo(() => {
    if (!linkedListIdFilter) return displayTasksBase;

    return displayTasksBase.filter((task) => {
      return (
        task.linkedListId === linkedListIdFilter ||
        task.linked_list_id === linkedListIdFilter
      );
    });
  }, [displayTasksBase, linkedListIdFilter]);

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

  const childRewardProgressItems = useMemo(
    () =>
      childRewardItems.map((item) => {
        const progress = getRewardProgress(item.tasks, item.reward);

        return {
          ...item,
          progress,
          rewardId: item.reward?.id || item.person?.id || item.reward?.childName,
        };
      }),
    [childRewardItems]
  );

  const familyRewardProgress = getRewardProgress(rewardEligibleTasks, familyReward);
  const familyRewardCompleted = familyRewardProgress.completed;
  const familyRewardRequired = familyRewardProgress.required;

  useEffect(() => {
    const previous = previousRewardProgressRef.current;

    const currentChildProgressByRewardId = childRewardProgressItems.reduce(
      (acc, item) => {
        if (!item.rewardId) return acc;

        acc[item.rewardId] = {
          completed: item.progress.completed,
          required: item.progress.required,
        };

        return acc;
      },
      {}
    );

    if (!previous.initialized) {
      previousRewardProgressRef.current = {
        initialized: true,
        childProgressByRewardId: currentChildProgressByRewardId,
        familyCompleted: familyRewardCompleted,
        familyRequired: familyRewardRequired,
      };
      return;
    }

    const childJustUnlockedItem = childRewardProgressItems.find((item) => {
      if (!item.reward || !item.rewardId) return false;

      const previousChildProgress =
        previous.childProgressByRewardId?.[item.rewardId] || {
          completed: 0,
          required: item.progress.required,
        };

      return (
        previousChildProgress.completed < item.progress.required &&
        item.progress.completed >= item.progress.required
      );
    });

    const familyJustUnlocked =
      familyReward &&
      previous.familyCompleted < familyRewardRequired &&
      familyRewardCompleted >= familyRewardRequired;

    if (rewardCelebrationArmedRef.current && childJustUnlockedItem) {
      const reward = childJustUnlockedItem.reward;
      const childName =
        reward.childName ||
        reward.child_name ||
        childJustUnlockedItem.person?.name ||
        "Your child";

      setRewardCelebration({
        type: "child",
        title: `${childName} earned ${reward.title}!`,
        message: `${childJustUnlockedItem.progress.completed}/${childJustUnlockedItem.progress.required} reward tasks completed. Time to celebrate.`,
      });
    } else if (rewardCelebrationArmedRef.current && familyJustUnlocked) {
      setRewardCelebration({
        type: "family",
        title: `${familyReward.title} unlocked!`,
        message: `${familyRewardCompleted}/${familyRewardRequired} family reward tasks completed together.`,
      });
    }

    rewardCelebrationArmedRef.current = false;

    previousRewardProgressRef.current = {
      initialized: true,
      childProgressByRewardId: currentChildProgressByRewardId,
      familyCompleted: familyRewardCompleted,
      familyRequired: familyRewardRequired,
    };
  }, [
    childRewardProgressItems,
    familyReward,
    familyRewardCompleted,
    familyRewardRequired,
  ]);

  useEffect(() => {
    if (!linkedListIdFilter || !displayTasks.length) return;

    const firstLinkedTask = displayTasks.find((task) => {
      return task.linkedListId === linkedListIdFilter || task.linked_list_id === linkedListIdFilter;
    });

    const linkedAssigneeId =
      firstLinkedTask?.assignedToPersonId ||
      firstLinkedTask?.assigned_to_person_id ||
      "";

    if (linkedAssigneeId && people.some((person) => person.id === linkedAssigneeId)) {
      setSelectedPersonId(linkedAssigneeId);
    }
  }, [linkedListIdFilter, displayTasks, people]);

  const { completedCount, pendingCount } = getTaskStats(selectedTasks);

  const handleDeleteTask = async (task) => {
    await deleteTask(task);
    setTaskToDelete(null);
  };

  const handleToggleTask = async (task) => {
    rewardCelebrationArmedRef.current = true;
    await toggleTask(task);
  };

  const handleClaimReward = async (reward) => {
    rewardCelebrationArmedRef.current = false;
    setRewardCelebration(null);
    await resetReward(reward);
  };

  const handleOpenAddTask = (person = null) => {
    setQuickAddPerson(person);
    if (person?.id) setSelectedPersonId(person.id);
    setShowAdd(true);
  };

  const handleCloseAddTask = () => {
    setShowAdd(false);
    setQuickAddPerson(null);
    setLinkedTaskDraft(null);
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

      {linkedListIdFilter && (
        <div className="mb-4 rounded-[1.75rem] border border-blue-100 bg-blue-50/85 p-4 shadow-[0_10px_28px_rgba(37,99,235,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-500">
                Linked task view
              </p>
              <h2 className="mt-1 text-xl font-black text-blue-950">
                Tasks for {linkedListTitleFilter || "this family list"}
              </h2>
              <p className="mt-1 text-sm font-bold text-blue-700/80">
                Only tasks connected to this list are shown here.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate(`/lists?listId=${linkedListIdFilter}`)}
                className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-50"
              >
                Back to list
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearchParams({});
                  setActiveTaskScope("today");
                }}
                className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white transition hover:bg-blue-700"
              >
                Show all tasks
              </button>
            </div>
          </div>
        </div>
      )}

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
        onClaimReward={handleClaimReward}
        onToggleTask={handleToggleTask}
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
        people={people}
        routineRuns={routineRuns}
        canWrite={canWrite}
        onSkipRoutineToday={skipRoutineToday}
        onRegenerateRoutineToday={async (template) => {
          await regenerateRoutineToday(template);
          await loadTasks();
        }}
        onCancelRoutineToday={async (template) => {
          await cancelRoutineToday(template);
          await loadTasks();
        }}
        onSaved={async () => {
          await loadTemplates();
          await loadRoutineRuns();
        }}
      />

      <ManageTaskRewardsDialog
        open={showManageRewards}
        onOpenChange={setShowManageRewards}
        people={people}
        childReward={childReward}
        childRewards={childRewards}
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
        initialTaskDraft={linkedTaskDraft}
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
