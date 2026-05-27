import { useCallback, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { TASK_COLLECTIONS } from "@/features/tasks/model/taskTypes";
import {
  isDemoTask,
  isDone,
  normalizeTask,
} from "@/features/tasks/utils/taskHelpers";

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
      let snap;

      try {
        const q = query(collection(db, TASK_COLLECTIONS.tasks), where("familyId", "==", familyId));
        snap = await getDocs(q);
      } catch (error) {
        console.warn("Fallback to family_id query:", error);

        const q = query(collection(db, TASK_COLLECTIONS.tasks), where("family_id", "==", familyId));
        snap = await getDocs(q);
      }

      const data = snap.docs.map(normalizeTask);
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

      await loadTasks();
    } catch (error) {
      console.error("Error toggling task:", error);
      notifyTaskNotice({
        tone: "danger",
        title: "Could not update task",
        message: error.message,
      });
    }
  };

  const deleteTask = async (taskOrId) => {
    if (!canWrite) return;

    const id = typeof taskOrId === "string" ? taskOrId : taskOrId?.id;
    if (!id || String(id).startsWith("demo-")) return;

    try {
      await deleteDoc(doc(db, TASK_COLLECTIONS.tasks, id));
      await loadTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      notifyTaskNotice({
        tone: "danger",
        title: "Could not delete task",
        message: error.message,
      });
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
