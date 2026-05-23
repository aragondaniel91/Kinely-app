import React from "react";

import PersonCard from "@/features/tasks/components/PersonCard";
import TasksFocusPanel from "@/features/tasks/components/TasksFocusPanel";
import TasksRewardsPanel from "@/features/tasks/components/TasksRewardsPanel";
import BottomFocusBar from "@/features/tasks/components/BottomFocusBar";
import TaskCategoryFilter from "@/features/tasks/components/TaskCategoryFilter";

export default function TaskBoardContent({
  people,
  tasksByPerson,
  selectedPersonId,
  selectedPerson,
  selectedTasks,
  childReward,
  childTasks,
  familyReward,
  allTasks,
  loading,
  canWrite,
  pendingCount,
  completedCount,
  onSelectPerson,
  onQuickAddTask,
  onAddTask,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  activeCategory,
  onCategoryChange,
}) {
  return (
    <>
      <TaskCategoryFilter
        activeCategory={activeCategory}
        onChange={onCategoryChange}
      />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        {people.map((person) => (
          <PersonCard
            key={person.id}
            person={person}
            tasks={tasksByPerson[person.id] || []}
            selected={selectedPersonId === person.id}
            canWrite={canWrite}
            onSelect={onSelectPerson}
            onQuickAdd={onQuickAddTask}
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
          onAddTask={onAddTask}
          onToggleTask={onToggleTask}
          onEditTask={onEditTask}
          onDeleteTask={onDeleteTask}
        />

        <TasksRewardsPanel
          childReward={childReward}
          childTasks={childTasks}
          familyReward={familyReward}
          allTasks={allTasks}
        />
      </div>

      <BottomFocusBar people={people} tasksByPerson={tasksByPerson} />
    </>
  );
}
