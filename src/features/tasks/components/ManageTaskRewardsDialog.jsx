import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  Gift,
  Heart,
  Save,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

import { db } from "@/lib/firebase";
import { useFamily } from "@/lib/FamilyContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { TASK_COLLECTIONS } from "@/features/tasks/model/taskTypes";

function isRealReward(reward, familyId) {
  return Boolean(reward?.id && reward?.familyId === familyId);
}

function getNumber(value, fallback = 5) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.round(parsed);
}

function RewardSection({
  icon: Icon,
  eyebrow,
  title,
  description,
  children,
}) {
  return (
    <section className="rounded-[1.75rem] bg-slate-50/75 p-3 ring-1 ring-slate-100">
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
            {eyebrow}
          </p>
          <h3 className="mt-1 text-lg font-black tracking-tight text-slate-950">
            {title}
          </h3>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
            {description}
          </p>
        </div>
      </div>

      {children}
    </section>
  );
}

export default function ManageTaskRewardsDialog({
  open,
  onOpenChange,
  people = [],
  childReward = null,
  familyReward = null,
  onSaved,
}) {
  const { familyId, user, profile } = useFamily();

  const childPeople = useMemo(
    () => people.filter((person) => person.roleType === "child"),
    [people]
  );

  const [selectedChildPersonId, setSelectedChildPersonId] = useState("");
  const [childRewardTitle, setChildRewardTitle] = useState("Ice cream");
  const [childRequiredTasks, setChildRequiredTasks] = useState(5);
  const [familyRewardTitle, setFamilyRewardTitle] = useState("Pizza Night");
  const [familyRequiredTasks, setFamilyRequiredTasks] = useState(8);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedChild =
    childPeople.find((person) => person.id === selectedChildPersonId) ||
    childPeople[0];

  useEffect(() => {
    if (!open) return;

    const fallbackChild = childPeople[0];

    setSelectedChildPersonId(
      childReward?.childPersonId ||
        childReward?.child_person_id ||
        fallbackChild?.id ||
        ""
    );

    setChildRewardTitle(childReward?.title || "Ice cream");
    setChildRequiredTasks(childReward?.requiredTasks || childReward?.required_tasks || 5);

    setFamilyRewardTitle(familyReward?.title || "Pizza Night");
    setFamilyRequiredTasks(familyReward?.requiredTasks || familyReward?.required_tasks || 8);

    setError("");
  }, [open, childPeople, childReward, familyReward]);

  async function upsertReward(existingReward, payload) {
    if (isRealReward(existingReward, familyId)) {
      await updateDoc(doc(db, TASK_COLLECTIONS.rewards, existingReward.id), {
        ...payload,
        updatedAt: serverTimestamp(),
        updatedBy: user?.uid || null,
      });

      return;
    }

    await addDoc(collection(db, TASK_COLLECTIONS.rewards), {
      ...payload,
      active: true,
      createdAt: serverTimestamp(),
      createdBy: user?.uid || null,
      updatedAt: serverTimestamp(),
      updatedBy: user?.uid || null,
    });
  }

  async function handleSave() {
    if (!familyId || saving) return;

    const cleanChildTitle = childRewardTitle.trim();
    const cleanFamilyTitle = familyRewardTitle.trim();

    if (!cleanFamilyTitle) {
      setError("Please enter a family reward title.");
      return;
    }

    if (selectedChild && !cleanChildTitle) {
      setError("Please enter a child reward title.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      if (selectedChild) {
        const childId = selectedChild.childId || selectedChild.child_id || selectedChild.id;

        await upsertReward(childReward, {
          familyId,
          family_id: familyId,
          familyName: profile?.family_name || profile?.familyName || "",

          type: "child",
          childPersonId: selectedChild.id,
          child_person_id: selectedChild.id,
          childId,
          child_id: childId,
          childName: selectedChild.name,
          child_name: selectedChild.name,

          title: cleanChildTitle,
          icon: "trophy",
          requiredTasks: getNumber(childRequiredTasks, 5),
          required_tasks: getNumber(childRequiredTasks, 5),
          active: true,
        });
      }

      await upsertReward(familyReward, {
        familyId,
        family_id: familyId,
        familyName: profile?.family_name || profile?.familyName || "",

        type: "family",
        title: cleanFamilyTitle,
        icon: "gift",
        requiredTasks: getNumber(familyRequiredTasks, 8),
        required_tasks: getNumber(familyRequiredTasks, 8),
        active: true,
      });

      await onSaved?.();
      onOpenChange?.(false);
    } catch (err) {
      console.error("Error saving rewards:", err);
      setError(err?.message || "There was an error saving rewards.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !saving && onOpenChange?.(nextOpen)}>
      <DialogContent className="flex max-h-[92dvh] w-[calc(100vw-1.25rem)] max-w-2xl flex-col overflow-hidden rounded-[2rem] border-slate-200 bg-white p-0 shadow-2xl sm:w-[calc(100vw-2rem)]">
        <DialogHeader className="shrink-0 bg-gradient-to-br from-white via-secondary/20 to-accent/5 px-4 pb-3 pt-4 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/15">
              <Gift className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">
                Reward goals
              </p>

              <DialogTitle className="mt-1 text-2xl font-black tracking-tight text-slate-950">
                Manage rewards
              </DialogTitle>

              <p className="mt-1 text-sm font-semibold text-slate-500">
                Choose what your family earns after reward tasks are completed.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-2 pt-3 sm:px-5">
          {error && (
            <div className="mb-4 rounded-3xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <RewardSection
              icon={Trophy}
              eyebrow="Child reward"
              title={selectedChild?.name ? `${selectedChild.name}'s reward` : "Child reward"}
              description="Choose a child, then set or update that child’s personal reward goal."
            >
              {childPeople.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <Label>Child</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {childPeople.map((person) => {
                        const active = selectedChildPersonId === person.id;

                        return (
                          <button
                            key={person.id}
                            type="button"
                            onClick={() => setSelectedChildPersonId(person.id)}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-2xl px-3.5 py-2 text-sm font-black ring-1 transition hover:-translate-y-0.5 hover:shadow-sm",
                              active
                                ? "bg-primary text-primary-foreground ring-transparent shadow-lg shadow-primary/15"
                                : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50 hover:text-slate-900"
                            )}
                          >
                            <Users className="h-4 w-4" />
                            {person.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
                    <div>
                      <Label>Reward</Label>
                      <Input
                        value={childRewardTitle}
                        onChange={(event) => setChildRewardTitle(event.target.value)}
                        placeholder="Example: Ice cream"
                        className="mt-1 h-11 rounded-2xl bg-white"
                      />
                    </div>

                    <div>
                      <Label>Tasks needed</Label>
                      <Input
                        type="number"
                        min="1"
                        value={childRequiredTasks}
                        onChange={(event) => setChildRequiredTasks(event.target.value)}
                        className="mt-1 h-11 rounded-2xl bg-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-5 text-center">
                  <p className="text-sm font-black text-slate-900">
                    No child profiles yet
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Add a child profile before creating a child reward.
                  </p>
                </div>
              )}
            </RewardSection>

            <RewardSection
              icon={Heart}
              eyebrow="Family reward"
              title="Shared family goal"
              description="A shared reward that counts all reward-eligible tasks."
            >
              <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
                <div>
                  <Label>Reward</Label>
                  <Input
                    value={familyRewardTitle}
                    onChange={(event) => setFamilyRewardTitle(event.target.value)}
                    placeholder="Example: Pizza Night"
                    className="mt-1 h-11 rounded-2xl bg-white"
                  />
                </div>

                <div>
                  <Label>Tasks needed</Label>
                  <Input
                    type="number"
                    min="1"
                    value={familyRequiredTasks}
                    onChange={(event) => setFamilyRequiredTasks(event.target.value)}
                    className="mt-1 h-11 rounded-2xl bg-white"
                  />
                </div>
              </div>
            </RewardSection>

            <div className="rounded-[1.75rem] border border-accent/10 bg-accent/5 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-sm font-black text-slate-950">
                    Only reward tasks count
                  </p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                    In Add Task, enable “Counts toward rewards”. Chores turn this on by default.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 bg-transparent px-4 pb-4 pt-1 sm:px-5">
          <Button
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            disabled={saving}
            className="rounded-2xl font-black"
          >
            Cancel
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving || !familyId}
            className="rounded-2xl font-black"
          >
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save rewards"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
