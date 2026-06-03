import { useCallback, useEffect, useState } from "react";
import {
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { getFamilyScopedDocSnaps } from "@/lib/firestoreFamilyQueries";
import { TASK_COLLECTIONS } from "@/features/tasks/model/taskTypes";
import {
  isDemoTask,
  isDone,
  normalizeTask,
} from "@/features/tasks/utils/taskHelpers";
import { queueFamilyActivity } from "@/services/familyActivityService";

export function useFamilyTasks({ familyId, canRead, canWrite, user = null, profile = null }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTasks = useCallback(async () => {
    if (!familyId || !canRead) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const taskDocs = await getFamilyScopedDocSnaps(TASK_COLLECTIONS.tasks, familyId);
      const data = taskDocs.map(normalizeTask);
      setTasks(data);
    } catch (error) {
      console.error("Error loading tasks:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [familyId, canRead]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const toggleTask = async (task) => {
    if (!canWrite || isDemoTask(task)) return;

    const nextDone = !isDone(task);
    const completedByName =
      profile?.displayName ||
      profile?.name ||
      user?.displayName ||
      user?.email ||
      "";

    try {
      await updateDoc(doc(db, TASK_COLLECTIONS.tasks, task.id), {
        status: nextDone ? "done" : "pending",

        completedAt: nextDone ? serverTimestamp() : null,
        completed_at: nextDone ? serverTimestamp() : null,
        completedBy: nextDone ? user?.uid || null : null,
        completed_by: nextDone ? user?.uid || null : null,
        completedByName: nextDone ? completedByName : "",
        completed_by_name: nextDone ? completedByName : "",

        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });

      queueFamilyActivity({
        familyId,
        user,
        profile,
        module: "tasks",
        type: nextDone ? "task_completed" : "task_reopened",
        title: `${nextDone ? "Task completed" : "Task reopened"}: ${task.title || "Family task"}`,
        description: completedByName
          ? `${completedByName} marked it ${nextDone ? "done" : "pending"}.`
          : `Marked ${nextDone ? "done" : "pending"}.`,
        entityType: "task",
        entityId: task.id,
        date: task.dueDate || task.due_date || task.date || "",
      });

      await loadTasks();
    } catch (error) {
      console.error("Error toggling task:", error);
    }
  };

  const deleteTask = async (taskOrId) => {
    if (!canWrite) return;

    const id = typeof taskOrId === "string" ? taskOrId : taskOrId?.id;
    if (!id || String(id).startsWith("demo-")) return;

    try {
      await deleteDoc(doc(db, TASK_COLLECTIONS.tasks, id));
      queueFamilyActivity({
        familyId,
        user,
        profile,
        module: "tasks",
        type: "task_deleted",
        title: `Task deleted: ${taskOrId?.title || "Family task"}`,
        description: "A task was removed from the family board.",
        entityType: "task",
        entityId: id,
        date: taskOrId?.dueDate || taskOrId?.due_date || taskOrId?.date || "",
      });
      await loadTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  return {
    tasks,
    loading,
    loadTasks,
    toggleTask,
    deleteTask,
  };
}
