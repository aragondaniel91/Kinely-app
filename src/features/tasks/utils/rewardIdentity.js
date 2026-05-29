function cleanString(value) {
  return String(value || "").trim();
}

export function getChildPersonId(childPerson = {}) {
  return cleanString(
    childPerson.id ||
      childPerson.personId ||
      childPerson.person_id ||
      childPerson.childPersonId ||
      childPerson.child_person_id ||
      childPerson.childId ||
      childPerson.child_id
  );
}

export function getChildLegacyId(childPerson = {}) {
  return cleanString(
    childPerson.childId ||
      childPerson.child_id ||
      getChildPersonId(childPerson)
  );
}

export function getChildDisplayName(childPerson = {}) {
  return cleanString(
    childPerson.name ||
      childPerson.displayName ||
      childPerson.display_name ||
      childPerson.childName ||
      childPerson.child_name ||
      childPerson.fullName ||
      childPerson.firstName
  );
}

export function getRewardChildPersonId(reward = {}) {
  return cleanString(
    reward.childPersonId ||
      reward.child_person_id ||
      reward.personId ||
      reward.person_id ||
      reward.assignedChildId ||
      reward.assigned_child_id
  );
}

export function getRewardChildLegacyId(reward = {}) {
  return cleanString(
    reward.childId ||
      reward.child_id ||
      reward.assignedChildId ||
      reward.assigned_child_id
  );
}

export function rewardBelongsToChild(reward, childPerson) {
  if (!reward || !childPerson) return false;

  const childPersonId = getChildPersonId(childPerson);
  if (!childPersonId) return false;

  const rewardPersonId = getRewardChildPersonId(reward);
  if (rewardPersonId) return rewardPersonId === childPersonId;

  const childLegacyId = getChildLegacyId(childPerson);
  const rewardLegacyId = getRewardChildLegacyId(reward);
  return Boolean(childLegacyId && rewardLegacyId && rewardLegacyId === childLegacyId);
}

export function buildRewardChildFields(childPerson = {}) {
  const childPersonId = getChildPersonId(childPerson);
  const childId = getChildLegacyId(childPerson) || childPersonId;
  const childName = getChildDisplayName(childPerson);

  return {
    childPersonId,
    child_person_id: childPersonId,
    childId,
    child_id: childId,
    childName,
    child_name: childName,
  };
}

export function normalizeRewardChildFields(reward = {}) {
  const childPersonId = getRewardChildPersonId(reward);
  const childId = getRewardChildLegacyId(reward) || childPersonId;
  const childName = cleanString(reward.childName || reward.child_name);

  return {
    childPersonId,
    child_person_id: reward.child_person_id || childPersonId,
    childId,
    child_id: reward.child_id || childId,
    childName,
    child_name: reward.child_name || childName,
  };
}
