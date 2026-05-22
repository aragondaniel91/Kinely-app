export function getParentLabel(parent, dadName, momName) {
  if (parent === "dad") return dadName || "Papá";
  if (parent === "mom") return momName || "Mamá";
  return "Compartido";
}

export function getParentEmoji(parent) {
  if (parent === "dad") return "👨";
  if (parent === "mom") return "👩";
  return "👨👩";
}

export function getCustodyParent(custody) {
  if (!custody) return null;
  if (custody.is_split) return "split";
  return custody.with_whom;
}

export function travelPlanAffectsCustody(plan) {
  if (!plan) return false;
  if (plan.affectsCustody === false || plan.affects_custody === false) return false;

  const status = plan.travelStatus || plan.travel_status || plan.status || "approved";
  return status !== "rejected" && status !== "cancelled";
}

export function buildTravelOverrideCustody({ dateKey, baseCustody, travelPlansForDay = [] }) {
  const overridePlan = travelPlansForDay.find(travelPlanAffectsCustody);
  if (!overridePlan?.travelingParent) return baseCustody || null;

  return {
    ...(baseCustody || {}),
    id: baseCustody?.id || `travel_override_${dateKey}`,
    date: dateKey,
    is_split: false,
    isSplit: false,
    with_whom: overridePlan.travelingParent,
    withWhom: overridePlan.travelingParent,
    morning: null,
    afternoon: null,
    isTravelOverride: true,
    travelOverridePlanId: overridePlan.id,
    travelOverridePlanTitle: overridePlan.title,
    travelOverrideDestination: overridePlan.destination,
    baseCustody,
  };
}

export function getOtherParent(parent) {
  return parent === "dad" ? "mom" : "dad";
}
