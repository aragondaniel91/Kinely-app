import { colorHex, colorSoftHex } from "@/lib/personColorUtils";

const FALLBACK_COLORS = ["#3b82f6", "#10b981", "#f97316", "#8b5cf6"];
const FALLBACK_SOFT_COLORS = ["#eff6ff", "#ecfdf5", "#fff7ed", "#f5f3ff"];

export function isFamilyColorId(colorId) {
  return ["family", "all", "everyone"].includes(String(colorId || "").trim().toLowerCase());
}

export function familyPeopleColors(people = [], soft = false) {
  const colors = people
    .map((person) => {
      const colorId = person.colorId || person.color || "";
      return soft ? colorSoftHex(colorId, "blue") : colorHex(colorId, "blue");
    })
    .filter(Boolean);

  const uniqueColors = Array.from(new Set(colors));
  if (uniqueColors.length) return uniqueColors;
  return soft ? FALLBACK_SOFT_COLORS : FALLBACK_COLORS;
}

export function familyGradientStyle(people = [], direction = "90deg") {
  const colors = familyPeopleColors(people, false);
  return {
    background: `linear-gradient(${direction}, ${colors.join(", ")})`,
  };
}

export function familySoftGradientStyle(people = [], direction = "90deg") {
  const colors = familyPeopleColors(people, true);
  return {
    background: `linear-gradient(${direction}, ${colors.join(", ")})`,
  };
}

export function familyEventCardStyle(people = []) {
  const colors = familyPeopleColors(people, false);
  const softColors = familyPeopleColors(people, true);

  return {
    background: `linear-gradient(90deg, ${softColors.join(", ")})`,
    borderColor: colors[0] || FALLBACK_COLORS[0],
  };
}

export function familyEventStripeStyle(people = []) {
  const colors = familyPeopleColors(people, false);
  return {
    background: `linear-gradient(180deg, ${colors.join(", ")})`,
  };
}
