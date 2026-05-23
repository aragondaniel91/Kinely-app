import React, { useMemo } from "react";

import PersonCard from "@/features/tasks/components/PersonCard";
import TasksFocusPanel from "@/features/tasks/components/TasksFocusPanel";
import TasksRewardsPanel from "@/features/tasks/components/TasksRewardsPanel";
import { filterTasksByDateScope } from "@/features/tasks/utils/taskDateFilters";

function getAggregatedFamilyTasks(tasksByPerson = {}) {
  const tasksById = new Map();

  Object.values(tasksByPerson).forEach((personTasks) => {
    if (!Array.isArray(personTasks)) return;

    personTasks.forEach((task) => {
      if (task?.id) tasksById.set(task.id, task);
    });
  });

  return Array.from(tasksById.values());
}

export default function TaskBoardContent({
  people,
  selectedPerson,
  selectedTasks,
  childReward,
  childTasks,
  childRewardItems,
  familyReward,
  allTasks,
  loading,
  canWrite,
  pendingCount,
  completedCount,
  activeTaskScope,
  onTaskScopeChange,
  onSelectPerson,
  onQuickAddTask,
  onAddTask,
  onApplyTemplate,
  onManageTemplates,
  onManageRewards,
  onClaimReward,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  tasksByPerson,
}) {
  const familyTasks = useMemo(
    () => getAggregatedFamilyTasks(tasksByPerson),
    [tasksByPerson]
  );

  function getPersonTasks(person) {
    const rawTasks =
      person.id === "family"
        ? familyTasks
        : tasksByPerson?.[person.id] || [];

    return filterTasksByDateScope(rawTasks, activeTaskScope);
  }

  const peopleCount = people.length || 1;

  return (
    <div className="space-y-5">
      <section className="w-full overflow-x-auto pb-2">
        <div
          className="grid min-w-full gap-3"
          style={{
            gridTemplateColumns: `repeat(${peopleCount}, minmax(165px, 1fr))`,
          }}
        >
          {people.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              tasks={getPersonTasks(person)}
              selected={selectedPerson?.id === person.id}
              canWrite={canWrite}
              onSelect={onSelectPerson}
              onQuickAdd={onQuickAddTask}
            />
          ))}
        </div>
      </section>

      <TasksFocusPanel
        selectedPerson={selectedPerson}
        selectedTasks={selectedTasks}
        loading={loading}
        canWrite={canWrite}
        pendingCount={pendingCount}
        completedCount={completedCount}
        activeTaskScope={activeTaskScope}
        onTaskScopeChange={onTaskScopeChange}
        onAddTask={onAddTask}
        onApplyTemplate={onApplyTemplate}
        onManageTemplates={onManageTemplates}
        onManageRewards={onManageRewards}
        onToggleTask={onToggleTask}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
      />

      <TasksRewardsPanel
        childReward={childReward}
        childTasks={childTasks}
        childRewardItems={childRewardItems}
        familyReward={familyReward}
        allTasks={allTasks}
        canWrite={canWrite}
        onClaimReward={onClaimReward}
      />
    </div>
  );
}
