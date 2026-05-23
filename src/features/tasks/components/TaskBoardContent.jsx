import React from "react";

import PersonCard from "@/features/tasks/components/PersonCard";
import TasksFocusPanel from "@/features/tasks/components/TasksFocusPanel";

export default function TaskBoardContent({
  people,
  selectedPerson,
  selectedTasks,
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
  onToggleTask,
  onEditTask,
  onDeleteTask,
  tasksByPerson,
}) {
  const peopleCount = people.length || 1;

  return (
    <div className="space-y-5">
      <section className="w-full overflow-x-auto pb-2">
        <div
          className="grid min-w-max gap-3"
          style={{
            gridTemplateColumns: `repeat(${peopleCount}, clamp(150px, ${Math.max(
              11,
              Math.min(18, 78 / peopleCount)
            )}vw, 230px))`,
          }}
        >
          {people.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              tasks={tasksByPerson?.[person.id] || []}
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
        onToggleTask={onToggleTask}
        onEditTask={onEditTask}
        onDeleteTask={onDeleteTask}
      />
    </div>
  );
}
