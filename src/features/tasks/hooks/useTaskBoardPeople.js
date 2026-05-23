import { useMemo } from "react";
import {
  Baby,
  Briefcase,
  Heart,
  Home,
  Sparkles,
} from "lucide-react";

import { taskPeople } from "@/features/tasks/data/taskPeople";
import {
  childColor,
  normalizeName,
} from "@/lib/personColorUtils";
import {
  getColorClasses,
  normalizeColorId,
} from "@/lib/appColorUtils";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getDisplayName(value, fallback = "") {
  if (!value) return fallback;
  if (typeof value === "string") return value.trim() || fallback;

  return String(
    value.name ||
      value.displayName ||
      value.display_name ||
      value.childName ||
      value.child_name ||
      value.fullName ||
      value.firstName ||
      fallback
  ).trim();
}

function getPersonId(value, fallbackName, prefix = "person") {
  if (value && typeof value === "object") {
    return (
      value.personId ||
      value.person_id ||
      value.childId ||
      value.child_id ||
      value.uid ||
      value.id ||
      `${prefix}-${slugify(fallbackName)}`
    );
  }

  return `${prefix}-${slugify(fallbackName)}`;
}

function withBoardColor(person, fallbackColor = "blue") {
  const colorId = normalizeColorId(person.colorId || person.color || fallbackColor, fallbackColor);
  const colorClasses = getColorClasses(colorId, fallbackColor);

  return {
    ...person,
    color: colorId,
    colorId,
    colorClasses,
    bg: colorClasses.bg,
    border: colorClasses.border,
    ring: colorClasses.text,
    accent: colorClasses.stripe,
  };
}

function buildChildPerson(child, index) {
  const name = getDisplayName(child, `Child ${index + 1}`);
  const id = getPersonId(child, name, "child");
  const childId =
    typeof child === "object" && child !== null
      ? child.childId || child.child_id || child.id || id
      : id;

  const colorId = childColor(child, index);

  return withBoardColor(
    {
      id,
      childId,
      child_id: childId,
      personId: id,
      person_id: id,
      name,
      role: "Child",
      roleType: "child",
      icon: Baby,
      avatar: name.charAt(0).toUpperCase(),
      color: colorId,
      colorId,
      aliases: [
        id,
        childId,
        name,
        "child",
        "kid",
        slugify(name),
        normalizeName(name),
      ].filter(Boolean),
    },
    "green"
  );
}

function buildAdultPerson({
  id,
  name,
  role,
  roleType,
  icon,
  color = "blue",
  aliases = [],
}) {
  const fallbackName = roleType === "dad" ? "Dad" : roleType === "mom" ? "Mom" : "Caregiver";
  const cleanName = name?.trim() || fallbackName;
  const colorId = normalizeColorId(color, roleType === "mom" ? "amber" : "blue");

  return withBoardColor(
    {
      id,
      personId: id,
      person_id: id,
      name: cleanName,
      role,
      roleType,
      icon,
      avatar: cleanName.charAt(0).toUpperCase(),
      color: colorId,
      colorId,
      aliases: [
        id,
        cleanName,
        role,
        roleType,
        slugify(cleanName),
        normalizeName(cleanName),
        ...aliases,
      ].filter(Boolean),
    },
    colorId
  );
}

function buildCaregiverPeople(profile = {}) {
  const members = Array.isArray(profile?.members) ? profile.members : [];

  return members
    .filter((member) => {
      const relationship = String(member.relationship || member.role || "").toLowerCase();
      const name = getDisplayName(member, "");

      if (!name) return false;

      const isParent =
        relationship.includes("father") ||
        relationship.includes("mother") ||
        relationship.includes("dad") ||
        relationship.includes("mom") ||
        relationship.includes("owner");

      return !isParent;
    })
    .map((member, index) => {
      const name = getDisplayName(member, `Caregiver ${index + 1}`);
      const id =
        member.personId ||
        member.person_id ||
        member.uid ||
        member.id ||
        `caregiver-${slugify(name)}`;

      return buildAdultPerson({
        id,
        name,
        role: member.relationship || member.role || "Caregiver",
        roleType: "caregiver",
        icon: Sparkles,
        color: member.colorId || member.color_id || member.color || "teal",
        aliases: [
          member.email,
          member.uid,
          member.relationship,
          member.role,
        ].filter(Boolean),
      });
    });
}

function buildFamilyPerson() {
  return withBoardColor(
    {
      id: "family",
      personId: "family",
      person_id: "family",
      name: "Family",
      role: "Together",
      roleType: "family",
      icon: Home,
      avatar: "F",
      color: "family",
      colorId: "family",
      aliases: ["family", "familia", "together", "household"],
    },
    "family"
  );
}

function dedupePeople(people) {
  const seen = new Set();

  return people.filter((person) => {
    if (!person?.id || seen.has(person.id)) return false;
    seen.add(person.id);
    return true;
  });
}

/**
 * Centralizes the people shown in the Family Rhythm Board.
 *
 * Uses the active family profile people/colors where available.
 * Falls back to static taskPeople if the family profile is not ready yet.
 */
export function useTaskBoardPeople({
  children = [],
  dadName = "",
  momName = "",
  profile = null,
} = {}) {
  const people = useMemo(() => {
    const childPeople = Array.isArray(children)
      ? children.map(buildChildPerson).filter(Boolean)
      : [];

    const parent1Role = profile?.parent1_role || profile?.parent1Role;
    const parent2Role = profile?.parent2_role || profile?.parent2Role;

    const dadColor =
      parent1Role === "dad"
        ? profile?.parent1_color || profile?.parent1Color || "blue"
        : profile?.parent2_color || profile?.parent2Color || "blue";

    const momColor =
      parent1Role === "mom"
        ? profile?.parent1_color || profile?.parent1Color || "amber"
        : profile?.parent2_color || profile?.parent2Color || "amber";

    const dadPerson = dadName
      ? buildAdultPerson({
          id:
            parent1Role === "dad"
              ? profile?.parent1_person_id || profile?.parent1PersonId || "dad"
              : profile?.parent2_person_id || profile?.parent2PersonId || "dad",
          name: dadName,
          role: "Parent",
          roleType: "dad",
          icon: Briefcase,
          color: dadColor,
          aliases: ["dad", "father", "papá", "papa"],
        })
      : null;

    const momPerson = momName
      ? buildAdultPerson({
          id:
            parent1Role === "mom"
              ? profile?.parent1_person_id || profile?.parent1PersonId || "mom"
              : profile?.parent2_person_id || profile?.parent2PersonId || "mom",
          name: momName,
          role: "Parent",
          roleType: "mom",
          icon: Heart,
          color: momColor,
          aliases: ["mom", "mother", "mamá", "mama"],
        })
      : null;

    const caregiverPeople = buildCaregiverPeople(profile);
    const familyPerson = buildFamilyPerson();

    const realPeople = dedupePeople([
      ...childPeople,
      dadPerson,
      momPerson,
      ...caregiverPeople,
      familyPerson,
    ].filter(Boolean));

    if (realPeople.length > 1) return realPeople;

    return taskPeople.map((person) => withBoardColor(person, person.color || "blue"));
  }, [children, dadName, momName, profile]);

  return {
    people,
    defaultPersonId: people[0]?.id || "family",
  };
}
