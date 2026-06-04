import { useMemo } from "react";
import {
  Baby,
  Briefcase,
  Heart,
  Home,
  Sparkles,
} from "lucide-react";

import {
  childColor,
  normalizeName,
} from "@/lib/personColorUtils";
import {
  getColorClasses,
  normalizeColorId,
} from "@/lib/appColorUtils";
import {
  canAssignTasksToMember,
  shouldShowMemberInTasks,
} from "@/features/tasks/utils/memberModuleVisibility";

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
      avatarUrl: typeof child === "object" && child !== null
        ? child.avatarUrl || child.avatar_url || child.photoURL || child.photoUrl || child.photo_url || ""
        : "",
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
  uid = "",
  email = "",
  name,
  role,
  roleType,
  icon,
  color = "blue",
  aliases = [],
}) {
  const fallbackName =
    roleType === "dad"
      ? "Papa"
      : roleType === "mom"
      ? "Mama"
      : roleType === "parent"
      ? "Padre o madre"
      : roleType === "owner"
      ? "Me"
      : "Caregiver";
  const cleanName = name?.trim() || fallbackName;
  const colorId = normalizeColorId(color, roleType === "mom" ? "amber" : "blue");

  return withBoardColor(
    {
      id,
      personId: id,
      person_id: id,
      uid,
      email,
      name: cleanName,
      role,
      roleType,
      icon,
      avatar: cleanName.charAt(0).toUpperCase(),
      avatarUrl: "",
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
      const relationship = String(member.relationship || member.role || "")
        .trim()
        .toLowerCase();
      const name = getDisplayName(member, "");

      if (!name) return false;

      const parentRoles = new Set([
        "parent",
        "dad",
        "father",
        "mom",
        "mother",
        "owner",
        "co-parent",
        "coparent",
      ]);

      if (parentRoles.has(relationship)) return false;

      return shouldShowMemberInTasks(member);
    })
    .map((member, index) => {
      const name = getDisplayName(member, `Caregiver ${index + 1}`);
      const id =
        member.personId ||
        member.person_id ||
        member.uid ||
        member.id ||
        `caregiver-${slugify(name)}`;

      const person = buildAdultPerson({
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

      return {
        ...person,
        taskAssignable: canAssignTasksToMember(member),
        avatarUrl: member.avatarUrl || member.avatar_url || member.photoURL || member.photoUrl || member.photo_url || "",
      };
    });
}

function roleTypeForAdult(person = {}) {
  const relationship = String(person.relationship || person.memberRelationship || person.member_relationship || person.role || "")
    .trim()
    .toLowerCase();
  const source = String(person.source || "").trim().toLowerCase();
  const role = String(person.role || "").trim().toLowerCase();

  if (relationship === "father" || relationship === "dad") return "dad";
  if (relationship === "mother" || relationship === "mom") return "mom";
  if (relationship === "parent" || source === "parent1" || source === "parent2") return "parent";
  if (role === "owner") return "owner";
  return relationship || "adult";
}

function adultRoleLabel(person = {}) {
  const relationship = String(person.relationship || "").trim().toLowerCase();
  if (relationship === "father") return "Papa";
  if (relationship === "mother") return "Mama";
  if (relationship === "parent") return "Padre o madre";
  if (relationship === "grandmother") return "Grandmother";
  if (relationship === "grandfather") return "Grandfather";
  if (relationship === "babysitter") return "Babysitter";
  if (relationship === "caregiver") return "Caregiver";
  if (person.role === "owner") return "Owner";
  return "Adult";
}

function shouldShowCoreAdultInTasks(person = {}) {
  const source = String(person.source || "").trim().toLowerCase();
  const role = String(person.role || "").trim().toLowerCase();
  const relationship = String(person.relationship || "").trim().toLowerCase();

  if (source === "parent1" || source === "parent2" || role === "owner") return true;
  if (["father", "mother", "parent", "partner", "spouse"].includes(relationship)) return true;
  return shouldShowMemberInTasks(person);
}

function buildAdultPersonFromCore(person = {}, index = 0) {
  const name = getDisplayName(person, `Adult ${index + 1}`);
  const id =
    person.id ||
    person.personId ||
    person.person_id ||
    person.uid ||
    person.email ||
    `adult-${slugify(name)}`;
  const roleType = roleTypeForAdult(person);
  const icon = roleType === "mom" ? Heart : roleType === "caregiver" ? Sparkles : Briefcase;

  const boardPerson = buildAdultPerson({
    id,
    uid: person.uid || "",
    email: person.email || "",
    name,
    role: adultRoleLabel(person),
    roleType,
    icon,
    color: person.colorId || person.color_id || person.color || (index === 1 ? "amber" : "blue"),
    aliases: [
      person.uid,
      person.email,
      person.personId,
      person.person_id,
      person.relationship,
      person.role,
    ].filter(Boolean),
  });

  return {
    ...boardPerson,
    taskAssignable: canAssignTasksToMember(person),
    avatarUrl: person.avatarUrl || person.avatar_url || person.photoURL || person.photoUrl || person.photo_url || "",
  };
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
    const keys = [
      person.id,
      person.personId,
      person.person_id,
      person.uid,
      person.email ? `email:${String(person.email).trim().toLowerCase()}` : "",
    ].filter(Boolean);

    if (!keys.length || keys.some((key) => seen.has(key))) return false;
    keys.forEach((key) => seen.add(key));
    return true;
  });
}

/**
 * Centralizes the people shown in the Family Rhythm Board.
 *
 * Uses the active family profile people/colors where available.
 * Falls back to a family-level bucket while the family profile is not ready yet.
 */
export function useTaskBoardPeople({
  children = [],
  dadName = "",
  momName = "",
  profile = null,
  familyPeople = [],
} = {}) {
  const people = useMemo(() => {
    const coreChildren = Array.isArray(familyPeople)
      ? familyPeople.filter((person) => person.type === "child")
      : [];
    const coreAdults = Array.isArray(familyPeople)
      ? familyPeople.filter((person) => person.type === "adult" && shouldShowCoreAdultInTasks(person))
      : [];

    const childPeople = coreChildren.length
      ? coreChildren.map(buildChildPerson).filter(Boolean)
      : Array.isArray(children)
      ? children.map(buildChildPerson).filter(Boolean)
      : [];

    const adultPeople = coreAdults.map(buildAdultPersonFromCore).filter(Boolean);
    const caregiverPeople = coreAdults.length ? [] : buildCaregiverPeople(profile);
    const familyPerson = buildFamilyPerson();

    const corePeople = dedupePeople([
      ...adultPeople,
      ...childPeople,
      ...caregiverPeople,
      familyPerson,
    ].filter(Boolean));

    if (adultPeople.length || childPeople.length || caregiverPeople.length) return corePeople;

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

    const realPeople = dedupePeople([
      ...childPeople,
      dadPerson,
      momPerson,
      ...caregiverPeople,
      familyPerson,
    ].filter(Boolean));

    if (realPeople.length > 1) return realPeople;

    return [familyPerson];
  }, [children, dadName, momName, familyPeople, profile]);

  return {
    people,
    defaultPersonId: people[0]?.id || "family",
  };
}
