export const demoChildRewardTemplate = {
  id: "child-ice-cream",
  type: "child",
  title: "Ice cream",
  icon: "ice-cream",
  requiredTasks: 5,
  active: true,
};

export const demoFamilyReward = {
  id: "family-pizza-night",
  type: "family",
  title: "Pizza Night",
  icon: "pizza",
  requiredTasks: 8,
  active: true,
};

export function buildDemoChildReward(childPerson) {
  if (!childPerson) return null;

  return {
    ...demoChildRewardTemplate,
    id: `${childPerson.id}-ice-cream`,
    childId: childPerson.childId || childPerson.child_id || childPerson.id,
    childPersonId: childPerson.id,
    childName: childPerson.name,
  };
}

export function getActiveFamilyReward() {
  return demoFamilyReward.active ? demoFamilyReward : null;
}
