import React from "react";

import PersonCard from "@/features/tasks/components/PersonCard";
import TasksFocusPanel from "@/features/tasks/components/TasksFocusPanel";
import TasksRewardsPanel from "@/features/tasks/components/TasksRewardsPanel";
import BottomFocusBar from "@/features/tasks/components/BottomFocusBar";

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
  onToggleTask,
  onEditTask,
  onDeleteTask,
}) {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-5">
        {people.map((person) => (
          <PersonCard
            key={person.id}
            person={person}
            tasks={tasksByPerson[person.id] || []}
            selected={selectedPersonId === person.id}
            onSelect={onSelectPerson}
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

      <BottomFocusBar tasksByPerson={tasksByPerson} />
    </>
  );
}
