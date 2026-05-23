import { useMemo } from "react";
import {
  Baby,
  Briefcase,
  Heart,
  Home,
  Sparkles,
  Users,
} from "lucide-react";

import { taskPeople } from "@/features/tasks/data/taskPeople";

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

function buildChildPerson(child, index) {
  const name = getDisplayName(child, `Child ${index + 1}`);
  const id = getPersonId(child, name, "child");
  const childId =
    typeof child === "object" && child !== null
      ? child.childId || child.child_id || child.id || id
      : id;

  return {
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
    gradient: "from-emerald-50 to-lime-50",
    ring: "text-emerald-700",
    border: "border-emerald-200",
    bg: "bg-emerald-50",
    accent: "bg-emerald-600",
    aliases: [
      id,
      childId,
      name,
      "child",
      "kid",
      slugify(name),
    ].filter(Boolean),
  };
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

  const palette =
    color === "amber" || roleType === "mom"
      ? {
          gradient: "from-rose-50 to-orange-50",
          ring: "text-rose-700",
          border: "border-rose-200",
          bg: "bg-rose-50",
          accent: "bg-rose-500",
        }
      : color === "violet" || roleType === "caregiver"
      ? {
          gradient: "from-violet-50 to-purple-50",
          ring: "text-violet-700",
          border: "border-violet-200",
          bg: "bg-violet-50",
          accent: "bg-violet-500",
        }
      : {
          gradient: "from-sky-50 to-blue-50",
          ring: "text-sky-700",
          border: "border-sky-200",
          bg: "bg-sky-50",
          accent: "bg-sky-600",
        };

  return {
    id,
    personId: id,
    person_id: id,
    name: cleanName,
    role,
    roleType,
    icon,
    avatar: cleanName.charAt(0).toUpperCase(),
    ...palette,
    aliases: [
      id,
      cleanName,
      role,
      roleType,
      slugify(cleanName),
      ...aliases,
    ].filter(Boolean),
  };
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
        color: "violet",
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
  return {
    id: "family",
    personId: "family",
    person_id: "family",
    name: "Family",
    role: "Together",
    roleType: "family",
    icon: Home,
    avatar: "F",
    gradient: "from-amber-50 to-orange-50",
    ring: "text-amber-700",
    border: "border-amber-200",
    bg: "bg-amber-50",
    accent: "bg-amber-500",
    aliases: ["family", "familia", "together", "household"],
  };
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
 * Current:
 * - Builds board people from active family context when available.
 * - Falls back to static taskPeople if the family does not have usable people yet.
 *
 * Future:
 * - Move more role/color preferences into the family profile.
 * - Support module permissions per caregiver.
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

    const dadPerson = dadName
      ? buildAdultPerson({
          id: profile?.parent1_role === "dad"
            ? profile?.parent1_person_id || profile?.parent1PersonId || "dad"
            : profile?.parent2_person_id || profile?.parent2PersonId || "dad",
          name: dadName,
          role: "Parent",
          roleType: "dad",
          icon: Briefcase,
          color: "blue",
          aliases: ["dad", "father", "papá", "papa"],
        })
      : null;

    const momPerson = momName
      ? buildAdultPerson({
          id: profile?.parent1_role === "mom"
            ? profile?.parent1_person_id || profile?.parent1PersonId || "mom"
            : profile?.parent2_person_id || profile?.parent2PersonId || "mom",
          name: momName,
          role: "Parent",
          roleType: "mom",
          icon: Heart,
          color: "amber",
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

    return taskPeople;
  }, [children, dadName, momName, profile]);

  return {
    people,
    defaultPersonId: people[0]?.id || "family",
  };
}
