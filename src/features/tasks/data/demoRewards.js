export const demoChildRewards = [
  {
    id: "joaquin-ice-cream",
    type: "child",
    childId: "joaquin",
    childName: "Joaquin",
    title: "Helado",
    icon: "ice-cream",
    requiredTasks: 5,
    active: true,
  },
];

export const demoFamilyReward = {
  id: "family-pizza-night",
  type: "family",
  title: "Pizza Night",
  icon: "pizza",
  requiredTasks: 8,
  active: true,
};

export function getActiveChildReward(childId) {
  return (
    demoChildRewards.find(
      (reward) => reward.childId === childId && reward.active
    ) || null
  );
}

export function getActiveFamilyReward() {
  return demoFamilyReward.active ? demoFamilyReward : null;
}
