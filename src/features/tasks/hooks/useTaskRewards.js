import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { TASK_COLLECTIONS } from "@/features/tasks/model/taskTypes";
import {
  buildDemoChildReward,
  getActiveFamilyReward,
} from "@/features/tasks/data/demoRewards";

function normalizeReward(docSnap) {
  const data = docSnap.data() || {};

  return {
    id: docSnap.id,
    ...data,
    familyId: data.familyId || data.family_id || "",
    type: data.type || "family",
    childPersonId: data.childPersonId || data.child_person_id || "",
    childId: data.childId || data.child_id || "",
    childName: data.childName || data.child_name || "",
    title: data.title || "Reward",
    icon: data.icon || "",
    requiredTasks: Number(data.requiredTasks || data.required_tasks || 5),
    active: data.active !== false,
  };
}

export function useTaskRewards({ familyId, canRead, people = [] }) {
  const [rewards, setRewards] = useState([]);
  const [loadingRewards, setLoadingRewards] = useState(true);

  const loadRewards = useCallback(async () => {
    if (!familyId || !canRead) {
      setRewards([]);
      setLoadingRewards(false);
      return;
    }

    setLoadingRewards(true);

    try {
      let snap;

      try {
        const q = query(
          collection(db, TASK_COLLECTIONS.rewards),
          where("familyId", "==", familyId),
          where("active", "==", true)
        );

        snap = await getDocs(q);
      } catch (error) {
        console.warn("Fallback to reward family_id query:", error);

        const q = query(
          collection(db, TASK_COLLECTIONS.rewards),
          where("family_id", "==", familyId),
          where("active", "==", true)
        );

        snap = await getDocs(q);
      }

      setRewards(snap.docs.map(normalizeReward));
    } catch (error) {
      console.error("Error loading rewards:", error);
      setRewards([]);
    } finally {
      setLoadingRewards(false);
    }
  }, [familyId, canRead]);

  useEffect(() => {
    loadRewards();
  }, [loadRewards]);

  const firstChildPerson = useMemo(
    () => people.find((person) => person.roleType === "child"),
    [people]
  );

  const childReward = useMemo(() => {
    if (!firstChildPerson) return null;

    const childId = firstChildPerson.childId || firstChildPerson.id;

    const realReward = rewards.find((reward) => {
      if (reward.type !== "child") return false;

      return (
        reward.childPersonId === firstChildPerson.id ||
        reward.childId === childId ||
        reward.childName === firstChildPerson.name
      );
    });

    return realReward || buildDemoChildReward(firstChildPerson);
  }, [firstChildPerson, rewards]);

  const familyReward = useMemo(() => {
    const realReward = rewards.find((reward) => reward.type === "family");

    return realReward || getActiveFamilyReward();
  }, [rewards]);

  return {
    rewards,
    loadingRewards,
    loadRewards,
    childReward,
    familyReward,
    firstChildPerson,
  };
}
