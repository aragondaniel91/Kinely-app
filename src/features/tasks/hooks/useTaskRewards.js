import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  updateDoc,
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

function findRewardForChild(rewards = [], childPerson) {
  if (!childPerson) return null;

  const childId = childPerson.childId || childPerson.child_id || childPerson.id;

  return rewards.find((reward) => {
    if (reward.type !== "child") return false;

    return (
      reward.childPersonId === childPerson.id ||
      reward.childId === childId ||
      reward.childName === childPerson.name
    );
  });
}

export function useTaskRewards({ familyId, canRead, people = [], user = null, profile = null }) {
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

  const childPeople = useMemo(
    () => people.filter((person) => person.roleType === "child"),
    [people]
  );

  const childRewards = useMemo(
    () =>
      childPeople
        .map((childPerson) => {
          const realReward = findRewardForChild(rewards, childPerson);
          return realReward || buildDemoChildReward(childPerson);
        })
        .filter(Boolean),
    [childPeople, rewards]
  );

  const childReward = childRewards[0] || null;

  const familyReward = useMemo(() => {
    const realReward = rewards.find((reward) => reward.type === "family");

    return realReward || getActiveFamilyReward();
  }, [rewards]);

  const resetReward = useCallback(
    async (reward) => {
      if (!familyId || !reward) return;

      const nowPayload = {
        cycleStartedAt: serverTimestamp(),
        cycle_started_at: serverTimestamp(),
        lastRedeemedAt: serverTimestamp(),
        last_redeemed_at: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      };

      const isRealReward = reward.familyId === familyId && reward.id && !String(reward.id).startsWith("demo-");

      try {
        if (isRealReward) {
          await updateDoc(doc(db, TASK_COLLECTIONS.rewards, reward.id), {
            ...nowPayload,
            redeemedCount: increment(1),
            redeemed_count: increment(1),
          });
        } else {
          await addDoc(collection(db, TASK_COLLECTIONS.rewards), {
            familyId,
            family_id: familyId,
            familyName: profile?.family_name || profile?.familyName || "",

            type: reward.type || "family",
            title: reward.title || "Reward",
            icon: reward.icon || "gift",
            requiredTasks: Number(reward.requiredTasks || reward.required_tasks || 5),
            required_tasks: Number(reward.requiredTasks || reward.required_tasks || 5),

            childPersonId: reward.childPersonId || reward.child_person_id || "",
            child_person_id: reward.childPersonId || reward.child_person_id || "",
            childId: reward.childId || reward.child_id || "",
            child_id: reward.childId || reward.child_id || "",
            childName: reward.childName || reward.child_name || "",
            child_name: reward.childName || reward.child_name || "",

            active: true,
            redeemedCount: 1,
            redeemed_count: 1,
            createdAt: serverTimestamp(),
            createdBy: user?.uid || null,
            ...nowPayload,
          });
        }

        await loadRewards();
      } catch (error) {
        console.error("Error resetting reward:", error);
        notifyRewardNotice({
          tone: "danger",
          title: "Could not reset reward",
          message: error.message,
        });
      }
    },
    [familyId, loadRewards, profile, user]
  );

  return {
    rewards,
    loadingRewards,
    loadRewards,
    resetReward,
    childPeople,
    childRewards,
    childReward,
    familyReward,
    firstChildPerson: childPeople[0] || null,
  };
}
