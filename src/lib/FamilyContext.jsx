import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/AuthContext";
import { buildFamilyModel } from "@/core/family/familyCore";
import { mapSettledFirestoreSnapshots } from "@/core/firestore/firestoreDocUtils";
import {
  buildFamilyInvitation,
  familyInvitationId,
  normalizeInviteEmail,
  withPendingFamilyInvitation,
} from "@/lib/invitationUtils";
import {
  bootstrapFamilyIdForUser,
  findExistingFamilyIdForUser,
} from "@/lib/familyBootstrap";
import {
  normalizeMemberRole,
  oppositeParentRole,
  roleDefaultLivesHere,
  roleDefaultShowOnHomeDashboard,
  roleToPersonType,
  roleToRelationship,
} from "@/lib/memberRoles";

export const FamilyContext = createContext(null);

const STORAGE_KEY = "familywall_active_family_id";
const FAMILY_MODULE_NAMES = [
  "home",
  "calendar",
  "tasks",
  "meals",
  "groceries",
  "lists",
  "custody",
  "budget",
  "notifications",
];

const DEFAULT_PERMS = {
  home: { read: true, write: true },
  calendar: { read: true, write: true },
  tasks: { read: true, write: true },
  meals: { read: true, write: true },
  groceries: { read: true, write: true },
  lists: { read: true, write: true },
  custody: { read: true, write: true },
  budget: { read: true, write: true },
  notifications: { read: true, write: true },
};

const READ_ONLY_PERMS = {
  home: { read: true, write: false },
  calendar: { read: true, write: false },
  tasks: { read: true, write: false },
  meals: { read: true, write: false },
  groceries: { read: true, write: false },
  lists: { read: true, write: false },
  custody: { read: false, write: false },
  budget: { read: false, write: false },
  notifications: { read: true, write: false },
};

const NO_PERMS = {
  home: { read: false, write: false },
  calendar: { read: false, write: false },
  tasks: { read: false, write: false },
  meals: { read: false, write: false },
  groceries: { read: false, write: false },
  lists: { read: false, write: false },
  custody: { read: false, write: false },
  budget: { read: false, write: false },
  notifications: { read: false, write: false },
};

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function listOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function memberHasAdminRole(member) {
  const appRole = String(member?.appRole || member?.app_role || "").trim().toLowerCase();
  const role = String(member?.role || "").trim().toLowerCase();
  return (
    member?.isAdmin === true ||
    member?.is_admin === true ||
    member?.admin === true ||
    appRole === "owner" ||
    appRole === "admin" ||
    role === "owner" ||
    role === "admin"
  );
}

function pushUniqueFamily(target, family) {
  if (!family?.id || target.some((item) => item.id === family.id)) return;
  target.push(family);
}

async function getFamiliesByMemberEmail(email) {
  const cleanEmail = normalizeInviteEmail(email);
  if (!cleanEmail) return [];

  const familiesRef = collection(db, "families");
  const results = await Promise.allSettled([
    getDocs(query(familiesRef, where("memberEmails", "array-contains", cleanEmail))),
    getDocs(query(familiesRef, where("member_emails", "array-contains", cleanEmail))),
  ]);

  if (results.every((result) => result.status === "rejected")) {
    throw results[0].reason;
  }

  return mapSettledFirestoreSnapshots(results, { type: "family" });
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function childDisplayName(child, index = 0) {
  if (!child) return "";
  if (typeof child === "string") return child.trim();
  return String(child.name || child.fullName || child.displayName || child.childName || child.firstName || `Child ${index + 1}`).trim();
}

function normalizeFamilyChild(child, index = 0) {
  const name = childDisplayName(child, index);
  if (!name) return null;

  if (typeof child === "object" && child !== null) {
    const id = child.personId || child.person_id || child.id || child.uid || child.childId || child.child_id || `child-${slugify(name) || index + 1}`;
    const color = child.colorId || child.color_id || child.color || child.familyColor || child.family_color || child.calendarColor || child.calendar_color || "green";
    return {
      ...child,
      id,
      personId: child.personId || child.person_id || id,
      person_id: child.person_id || child.personId || id,
      childId: child.childId || child.child_id || id,
      child_id: child.child_id || child.childId || id,
      name,
      displayName: child.displayName || child.display_name || name,
      display_name: child.display_name || child.displayName || name,
      childName: child.childName || child.child_name || name,
      child_name: child.child_name || child.childName || name,
      nameKey: child.nameKey || child.name_key || slugify(name),
      color,
      colorId: child.colorId || child.color_id || color,
      color_id: child.color_id || child.colorId || color,
    };
  }

  const id = `child-${slugify(name) || index + 1}`;
  return {
    id,
    personId: id,
    person_id: id,
    childId: id,
    child_id: id,
    name,
    displayName: name,
    display_name: name,
    childName: name,
    child_name: name,
    nameKey: slugify(name),
    color: "green",
    colorId: "green",
    color_id: "green",
  };
}

function normalizeFamilyChildren(children = []) {
  if (!Array.isArray(children)) return [];
  return children.map(normalizeFamilyChild).filter(Boolean);
}

function booleanOrUndefined(value) {
  return typeof value === "boolean" ? value : undefined;
}

function hasModulePermissions(modules = {}) {
  return Object.values(modules || {}).some((moduleAccess) =>
    Object.values(moduleAccess || {}).some((value) => typeof value === "boolean")
  );
}

function hasLegacyPermissions(member = {}) {
  return [
    "share_home",
    "home_write",
    "share_calendar",
    "calendar_write",
    "share_tasks",
    "tasks_write",
    "share_meals",
    "meals_write",
    "share_groceries",
    "groceries_write",
    "share_lists",
    "lists_write",
    "share_custody",
    "custody_read",
    "custody_write",
    "share_budget",
    "budget_read",
    "budget_write",
    "share_notifications",
    "notifications_write",
  ].some((key) => typeof member[key] === "boolean");
}

function moduleAccessToPermission(moduleAccess = {}, fallback = { read: false, write: false }) {
  return {
    read: booleanOrUndefined(moduleAccess.read) ?? fallback.read === true,
    write: booleanOrUndefined(moduleAccess.write) ?? fallback.write === true,
  };
}

function applyModulePermissions(permissions, modules = {}) {
  if (!hasModulePermissions(modules)) return permissions;

  return FAMILY_MODULE_NAMES.reduce(
    (nextPermissions, moduleName) => ({
      ...nextPermissions,
      [moduleName]: moduleAccessToPermission(
        modules[moduleName],
        permissions[moduleName] || { read: false, write: false }
      ),
    }),
    { ...permissions }
  );
}

function permissionFrom(value = {}, fallback = { read: false, write: false }) {
  return {
    read: booleanOrUndefined(value.read) ?? fallback.read === true,
    write: booleanOrUndefined(value.write) ?? fallback.write === true,
  };
}

function normalizePermissions(member) {
  if (!member) return NO_PERMS;

  if (member.isAdmin || member.is_admin) {
    return DEFAULT_PERMS;
  }

  if (!member.permissions && !hasModulePermissions(member.modules) && !hasLegacyPermissions(member)) {
    return NO_PERMS;
  }

  const legacy = {
    home: {
      read: member.share_home !== false,
      write: member.home_write === true,
    },
    calendar: {
      read: member.share_calendar !== false,
      write: member.calendar_write === true,
    },
    tasks: {
      read: member.share_tasks !== false,
      write: member.tasks_write === true,
    },
    meals: {
      read: member.share_meals !== false,
      write: member.meals_write === true,
    },
    groceries: {
      read: member.share_groceries !== false && member.share_meals !== false,
      write: member.groceries_write === true || member.meals_write === true,
    },
    lists: {
      read: member.share_lists !== false && member.share_groceries !== false,
      write: member.lists_write === true || member.groceries_write === true,
    },
    custody: {
      read: member.share_custody === true || member.custody_read === true,
      write: member.custody_write === true,
    },
    budget: {
      read: member.share_budget === true || member.budget_read === true,
      write: member.budget_write === true,
    },
    notifications: {
      read: member.share_notifications !== false,
      write: member.notifications_write === true,
    },
  };

  if (!member.permissions) return applyModulePermissions(legacy, member.modules);

  return applyModulePermissions(
    FAMILY_MODULE_NAMES.reduce(
      (permissions, moduleName) => ({
        ...permissions,
        [moduleName]: permissionFrom(member.permissions[moduleName], legacy[moduleName]),
      }),
      {}
    ),
    member.modules
  );
}

function normalizeFamilyProfile(family, user) {
  if (!family) return null;

  const parent1Role = normalizeMemberRole(family.parent1Role || family.parent1_role, "dad");

  const parent2Role =
    normalizeMemberRole(
      family.parent2Role || family.parent2_role,
      oppositeParentRole(parent1Role)
    );

  const familyName =
    family.familyName ||
    family.family_name ||
    `${user?.displayName || "Family"}'s Family`;

  const rawChildren =
    Array.isArray(family.children) && family.children.length
      ? family.children
      : family.childName
      ? [family.childName]
      : family.child_name
      ? [family.child_name]
      : [];

  const children = normalizeFamilyChildren(rawChildren);

  const parent1PersonId =
    family.parent1PersonId ||
    family.parent1_person_id ||
    family.ownerId ||
    family.owner_id ||
    user?.uid ||
    "";

  const parent2PersonId =
    family.parent2PersonId ||
    family.parent2_person_id ||
    family.parent2Email ||
    family.parent2_email ||
    "";

  return {
    ...family,

    familyId: family.id,
    familyName,
    ownerId: family.ownerId || family.owner_id,
    ownerEmail: family.ownerEmail || family.owner_email,

    parent1PersonId,
    parent1_person_id: parent1PersonId,
    parent1Name:
      family.parent1Name || family.parent1_name || user?.displayName || "",
    parent1Role,
    parent1Color: family.parent1Color || family.parent1_color || "blue",

    parent2PersonId,
    parent2_person_id: parent2PersonId,
    parent2Name: family.parent2Name || family.parent2_name || "",
    parent2Email: family.parent2Email || family.parent2_email || "",
    parent2Role,
    parent2Color: family.parent2Color || family.parent2_color || "amber",

    children,

    family_name: familyName,
    owner_email: family.ownerEmail || family.owner_email || user?.email || "",
    created_by: family.createdByEmail || family.created_by || user?.email || "",

    parent1_name:
      family.parent1Name || family.parent1_name || user?.displayName || "",
    parent1_role: parent1Role,
    parent1_color: family.parent1Color || family.parent1_color || "blue",

    parent2_name: family.parent2Name || family.parent2_name || "",
    parent2_email: family.parent2Email || family.parent2_email || "",
    parent2_role: parent2Role,
    parent2_color: family.parent2Color || family.parent2_color || "amber",

    member_emails:
      family.memberEmails ||
      family.member_emails ||
      (family.members || []).map((m) => m.email).filter(Boolean),

    share_calendar: family.shareCalendar ?? family.share_calendar ?? true,
    share_tasks: family.shareTasks ?? family.share_tasks ?? true,
    share_meals: family.shareMeals ?? family.share_meals ?? true,

    calendar_write: family.calendarWrite ?? family.calendar_write ?? true,
    tasks_write: family.tasksWrite ?? family.tasks_write ?? true,
    meals_write: family.mealsWrite ?? family.meals_write ?? true,
  };
}

async function ensureUserHasFamily(firebaseUser, authProfile) {
  if (!firebaseUser) return null;

  const userRef = doc(db, "users", firebaseUser.uid);
  const userSnap = await getDoc(userRef);

  const userData = userSnap.exists() ? userSnap.data() : authProfile || {};

  const candidateFamilyIds = [
    userData?.familyId,
    ...(Array.isArray(userData?.familyIds) ? userData.familyIds : []),
    authProfile?.familyId,
    ...(Array.isArray(authProfile?.familyIds) ? authProfile.familyIds : []),
  ].filter(Boolean);

  for (const candidateFamilyId of [...new Set(candidateFamilyIds)]) {
    let familySnap = null;

    try {
      familySnap = await getDoc(doc(db, "families", candidateFamilyId));
    } catch {
      familySnap = null;
    }

    if (familySnap?.exists()) {
      return candidateFamilyId;
    }
  }

  if (userData?.onboardingMode === "join" || authProfile?.onboardingMode === "join") {
    await setDoc(
      userRef,
      {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || userData?.name || "",
        email: firebaseUser.email || userData?.email || "",
        onboardingMode: "join",
        onboardingComplete: true,
        familyId: "",
        familyIds: [],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return null;
  }

  const existingFamilyId = await findExistingFamilyIdForUser(db, firebaseUser, userData);
  if (existingFamilyId) {
    await setDoc(
      userRef,
      {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || userData?.name || "",
        email: firebaseUser.email || userData?.email || "",
        familyId: existingFamilyId,
        familyIds: [existingFamilyId],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return existingFamilyId;
  }

  const familyRef = doc(db, "families", bootstrapFamilyIdForUser(firebaseUser.uid));
  const parent1PersonId = `user_${firebaseUser.uid}`;
  const parent1Role = normalizeMemberRole(userData?.role, "dad");
  const parent1Relationship = userData?.relationship || userData?.memberRelationship || userData?.member_relationship || roleToRelationship(parent1Role);
  const parent1PersonType = userData?.personType || userData?.person_type || roleToPersonType(parent1Role);
  const parent1LivesHere =
    typeof userData?.livesHere === "boolean"
      ? userData.livesHere
      : roleDefaultLivesHere(parent1Role);
  const parent1ShowOnHomeDashboard =
    typeof userData?.showOnHomeDashboard === "boolean"
      ? userData.showOnHomeDashboard
      : roleDefaultShowOnHomeDashboard(parent1Role);
  const parent2Role = oppositeParentRole(parent1Role);
  const parent2Relationship = roleToRelationship(parent2Role);
  const parent2PersonType = roleToPersonType(parent2Role);
  const parent2LivesHere = roleDefaultLivesHere(parent2Role);
  const parent2ShowOnHomeDashboard = roleDefaultShowOnHomeDashboard(parent2Role);

  const familyData = {
    familyId: familyRef.id,
    familyName: `${firebaseUser.displayName || userData?.name || "Family"}'s Family`,
    family_name: `${firebaseUser.displayName || userData?.name || "Family"}'s Family`,
    ownerId: firebaseUser.uid,
    ownerEmail: firebaseUser.email,
    createdBy: firebaseUser.uid,
    createdByEmail: firebaseUser.email,

    parent1PersonId,
    parent1_person_id: parent1PersonId,
    parent1Name: firebaseUser.displayName || userData?.name || "",
    parent1_name: firebaseUser.displayName || userData?.name || "",
    parent1Role,
    parent1_role: parent1Role,
    parent1Relationship,
    parent1_relationship: parent1Relationship,
    parent1PersonType,
    parent1_person_type: parent1PersonType,
    parent1LivesHere,
    parent1_lives_here: parent1LivesHere,
    parent1ShowOnHomeDashboard,
    parent1_show_on_home_dashboard: parent1ShowOnHomeDashboard,
    parent1Color: "blue",
    parent1_color: "blue",

    parent2PersonId: "",
    parent2_person_id: "",
    parent2Name: "",
    parent2_name: "",
    parent2Email: "",
    parent2_email: "",
    parent2Role,
    parent2_role: parent2Role,
    parent2Relationship,
    parent2_relationship: parent2Relationship,
    parent2PersonType,
    parent2_person_type: parent2PersonType,
    parent2LivesHere,
    parent2_lives_here: parent2LivesHere,
    parent2ShowOnHomeDashboard,
    parent2_show_on_home_dashboard: parent2ShowOnHomeDashboard,
    parent2Color: "amber",
    parent2_color: "amber",

    children: [],

    members: [
      {
        id: parent1PersonId,
        personId: parent1PersonId,
        person_id: parent1PersonId,
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || userData?.name || "",
        displayName: firebaseUser.displayName || userData?.name || "",
        display_name: firebaseUser.displayName || userData?.name || "",
        role: parent1Role,
        type: parent1PersonType,
        personType: parent1PersonType,
        person_type: parent1PersonType,
        relationship: parent1Relationship,
        memberRelationship: parent1Relationship,
        member_relationship: parent1Relationship,
        appRole: "owner",
        app_role: "owner",
        livesHere: parent1LivesHere,
        lives_here: parent1LivesHere,
        showOnHomeDashboard: parent1ShowOnHomeDashboard,
        show_on_home_dashboard: parent1ShowOnHomeDashboard,
        homeDashboard: parent1ShowOnHomeDashboard,
        home_dashboard: parent1ShowOnHomeDashboard,
        colorId: "blue",
        color_id: "blue",
        color: "blue",
        isAdmin: true,
        permissions: DEFAULT_PERMS,
        modules: DEFAULT_PERMS,
      },
    ],

    memberIds: [firebaseUser.uid],
    memberEmails: [firebaseUser.email],
    adminIds: [firebaseUser.uid],
    adminEmails: [firebaseUser.email].filter(Boolean),
    viewerIds: [],
    viewerEmails: [],
    member_emails: [firebaseUser.email],

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const existingBootstrapFamily = await getDoc(familyRef);

  if (!existingBootstrapFamily.exists()) {
    await setDoc(familyRef, familyData);
  }

  await setDoc(
    userRef,
    {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName || userData?.name || "",
      email: firebaseUser.email,
      familyId: familyRef.id,
      familyIds: [familyRef.id],
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return familyRef.id;
}

export function FamilyProvider({ children }) {
  const { user, profile: authProfile, loading: authLoading } = useAuth();

  const [families, setFamilies] = useState([]);
  const [activeFamilyIdState, setActiveFamilyIdState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || null;
  });
  const [isLoading, setIsLoading] = useState(true);

  const myEmail = user?.email || authProfile?.email || null;

  const setActiveProfileId = (id) => {
    if (!id) return;
    localStorage.setItem(STORAGE_KEY, id);
    setActiveFamilyIdState(id);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadFamilies() {
      if (authLoading) return;

      if (!user) {
        setFamilies([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const ensuredFamilyId = await ensureUserHasFamily(user, authProfile);

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};

        const ids = new Set();

        if (ensuredFamilyId) ids.add(ensuredFamilyId);
        if (userData.familyId) ids.add(userData.familyId);
        if (authProfile?.familyId) ids.add(authProfile.familyId);

        if (Array.isArray(userData.familyIds)) {
          userData.familyIds.forEach((id) => id && ids.add(id));
        }

        if (Array.isArray(authProfile?.familyIds)) {
          authProfile.familyIds.forEach((id) => id && ids.add(id));
        }

        const loaded = [];

        for (const familyId of ids) {
          const familySnap = await getDoc(doc(db, "families", familyId));
          if (familySnap.exists()) {
            loaded.push({ id: familySnap.id, ...familySnap.data() });
          }
        }

        if (myEmail) {
          const memberFamilies = await getFamiliesByMemberEmail(myEmail);
          memberFamilies.forEach((family) => pushUniqueFamily(loaded, family));
        }

        if (!cancelled) {
          setFamilies(loaded);
        }
      } catch (error) {
        console.error("Error loading families:", error);
        if (!cancelled) setFamilies([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadFamilies();

    return () => {
      cancelled = true;
    };
  }, [user, authProfile, authLoading, myEmail]);

  const accessibleProfiles = useMemo(() => {
    if (!user) return [];
    return families.map((family) => normalizeFamilyProfile(family, user)).filter(Boolean);
  }, [families, user]);

  const myOwnProfile = accessibleProfiles.find((family) => {
    return (
      family.ownerId === user?.uid ||
      family.owner_id === user?.uid ||
      family.ownerEmail === myEmail ||
      family.owner_email === myEmail ||
      family.created_by === myEmail
    );
  });

  const activeProfile =
    accessibleProfiles.find((family) => family.id === activeFamilyIdState) ||
    myOwnProfile ||
    accessibleProfiles[0] ||
    null;

  const familyModel = useMemo(
    () => (activeProfile ? buildFamilyModel(activeProfile, user) : null),
    [activeProfile, user]
  );

  useEffect(() => {
    if (activeProfile?.id && activeProfile.id !== activeFamilyIdState) {
      localStorage.setItem(STORAGE_KEY, activeProfile.id);
      setActiveFamilyIdState(activeProfile.id);
    }
  }, [activeProfile?.id, activeFamilyIdState]);

  const memberEntry = useMemo(() => {
    if (!activeProfile || !myEmail) return null;
    return (activeProfile.members || []).find((member) => {
      return member.uid === user?.uid || normalizeEmail(member.email) === normalizeEmail(myEmail);
    });
  }, [activeProfile, myEmail, user?.uid]);

  const isOwner = activeProfile
    ? activeProfile.ownerId === user?.uid ||
      activeProfile.owner_id === user?.uid ||
      normalizeEmail(activeProfile.ownerEmail) === normalizeEmail(myEmail) ||
      normalizeEmail(activeProfile.owner_email) === normalizeEmail(myEmail) ||
      normalizeEmail(activeProfile.createdByEmail) === normalizeEmail(myEmail) ||
      normalizeEmail(activeProfile.created_by_email) === normalizeEmail(myEmail) ||
      normalizeEmail(activeProfile.created_by) === normalizeEmail(myEmail)
    : false;

  const isAdmin =
    isOwner ||
    memberHasAdminRole(memberEntry) ||
    listOrEmpty(activeProfile?.adminIds).includes(user?.uid) ||
    listOrEmpty(activeProfile?.admin_ids).includes(user?.uid) ||
    listOrEmpty(activeProfile?.adminEmails).map(normalizeEmail).includes(normalizeEmail(myEmail)) ||
    listOrEmpty(activeProfile?.admin_emails).map(normalizeEmail).includes(normalizeEmail(myEmail));
  const perms = isAdmin ? DEFAULT_PERMS : normalizePermissions(memberEntry);

  const dadName = activeProfile?.parent1_role === "dad" ? activeProfile?.parent1_name : activeProfile?.parent2_name;
  const momName = activeProfile?.parent1_role === "mom" ? activeProfile?.parent1_name : activeProfile?.parent2_name;
  const dadColor = activeProfile?.parent1_role === "dad" ? activeProfile?.parent1_color || activeProfile?.parent1Color || "blue" : activeProfile?.parent2_color || activeProfile?.parent2Color || "blue";
  const momColor = activeProfile?.parent1_role === "mom" ? activeProfile?.parent1_color || activeProfile?.parent1Color || "amber" : activeProfile?.parent2_color || activeProfile?.parent2Color || "amber";
  const familyChildren = normalizeFamilyChildren(activeProfile?.children || (activeProfile?.child_name ? [activeProfile.child_name] : []));

  const refreshFamilies = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : {};
      const ids = new Set();
      if (userData.familyId) ids.add(userData.familyId);
      if (Array.isArray(userData.familyIds)) userData.familyIds.forEach((id) => id && ids.add(id));

      const loaded = [];
      for (const familyId of ids) {
        const familySnap = await getDoc(doc(db, "families", familyId));
        if (familySnap.exists()) loaded.push({ id: familySnap.id, ...familySnap.data() });
      }

      if (myEmail) {
        const memberFamilies = await getFamiliesByMemberEmail(myEmail);
        memberFamilies.forEach((family) => pushUniqueFamily(loaded, family));
      }

      setFamilies(loaded);
    } catch (error) {
      console.error("Error refreshing families:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createFamily = async ({ familyName, parent2Name = "", parent2Email = "", children = [] } = {}) => {
    if (!user) throw new Error("You must be logged in to create a family.");

    const name = familyName?.trim() || `${user.displayName || "My"} Family`;
    const cleanChildren = normalizeFamilyChildren(children);
    const familyRef = doc(collection(db, "families"));
    const userRef = doc(db, "users", user.uid);
    const parent1PersonId = `user_${user.uid}`;
    const ownerEmail = normalizeInviteEmail(user.email);
    const parent1Role = normalizeMemberRole(authProfile?.role, "dad");
    const parent1Relationship =
      authProfile?.relationship ||
      authProfile?.memberRelationship ||
      authProfile?.member_relationship ||
      roleToRelationship(parent1Role);
    const parent1PersonType = authProfile?.personType || authProfile?.person_type || roleToPersonType(parent1Role);
    const parent1LivesHere =
      typeof authProfile?.livesHere === "boolean"
        ? authProfile.livesHere
        : roleDefaultLivesHere(parent1Role);
    const parent1ShowOnHomeDashboard =
      typeof authProfile?.showOnHomeDashboard === "boolean"
        ? authProfile.showOnHomeDashboard
        : roleDefaultShowOnHomeDashboard(parent1Role);
    const parent2Role = oppositeParentRole(parent1Role);
    const parent2Relationship = roleToRelationship(parent2Role);
    const parent2PersonType = roleToPersonType(parent2Role);
    const parent2LivesHere = roleDefaultLivesHere(parent2Role);
    const parent2ShowOnHomeDashboard = roleDefaultShowOnHomeDashboard(parent2Role);
    const cleanParent2Email = normalizeInviteEmail(parent2Email);
    const parent2PersonId = cleanParent2Email ? `email_${slugify(cleanParent2Email)}` : "";
    const pendingInvite = cleanParent2Email
      ? buildFamilyInvitation({
          familyId: familyRef.id,
          familyName: name,
          recipientName: parent2Name,
          recipientEmail: cleanParent2Email,
          role: parent2Role,
          relationship: parent2Relationship,
          personType: parent2PersonType,
          livesHere: parent2LivesHere,
          showOnHomeDashboard: parent2ShowOnHomeDashboard,
          createdBy: user.uid,
          createdByEmail: ownerEmail,
        })
      : null;

    const familyData = withPendingFamilyInvitation({
      familyId: familyRef.id,
      familyName: name,
      family_name: name,
      type: "household",
      ownerId: user.uid,
      ownerEmail,
      createdBy: user.uid,
      createdByEmail: ownerEmail,

      parent1PersonId,
      parent1_person_id: parent1PersonId,
      parent1Name: user.displayName || authProfile?.name || "",
      parent1_name: user.displayName || authProfile?.name || "",
      parent1Role,
      parent1_role: parent1Role,
      parent1Relationship,
      parent1_relationship: parent1Relationship,
      parent1PersonType,
      parent1_person_type: parent1PersonType,
      parent1LivesHere,
      parent1_lives_here: parent1LivesHere,
      parent1ShowOnHomeDashboard,
      parent1_show_on_home_dashboard: parent1ShowOnHomeDashboard,
      parent1Color: "blue",
      parent1_color: "blue",

      parent2PersonId,
      parent2_person_id: parent2PersonId,
      parent2Name: parent2Name.trim(),
      parent2_name: parent2Name.trim(),
      parent2Email: cleanParent2Email,
      parent2_email: cleanParent2Email,
      parent2Role,
      parent2_role: parent2Role,
      parent2Relationship,
      parent2_relationship: parent2Relationship,
      parent2PersonType,
      parent2_person_type: parent2PersonType,
      parent2LivesHere,
      parent2_lives_here: parent2LivesHere,
      parent2ShowOnHomeDashboard,
      parent2_show_on_home_dashboard: parent2ShowOnHomeDashboard,
      parent2Color: "amber",
      parent2_color: "amber",

      children: cleanChildren,

      members: [
        {
          id: parent1PersonId,
          personId: parent1PersonId,
          person_id: parent1PersonId,
          uid: user.uid,
          email: ownerEmail,
          name: user.displayName || authProfile?.name || "",
          displayName: user.displayName || authProfile?.name || "",
          display_name: user.displayName || authProfile?.name || "",
          role: parent1Role,
          type: parent1PersonType,
          personType: parent1PersonType,
          person_type: parent1PersonType,
          relationship: parent1Relationship,
          memberRelationship: parent1Relationship,
          member_relationship: parent1Relationship,
          appRole: "owner",
          app_role: "owner",
          livesHere: parent1LivesHere,
          lives_here: parent1LivesHere,
          showOnHomeDashboard: parent1ShowOnHomeDashboard,
          show_on_home_dashboard: parent1ShowOnHomeDashboard,
          homeDashboard: parent1ShowOnHomeDashboard,
          home_dashboard: parent1ShowOnHomeDashboard,
          colorId: "blue",
          color_id: "blue",
          color: "blue",
          isAdmin: true,
          permissions: DEFAULT_PERMS,
          modules: DEFAULT_PERMS,
        },
      ],
      memberIds: [user.uid],
      memberEmails: [ownerEmail].filter(Boolean),
      adminIds: [user.uid],
      adminEmails: [ownerEmail].filter(Boolean),
      viewerIds: [],
      viewerEmails: [],
      member_emails: [ownerEmail].filter(Boolean),

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, pendingInvite);

    await setDoc(familyRef, familyData);

    if (pendingInvite) {
      await setDoc(
        doc(db, "familyInvitations", familyInvitationId(familyRef.id, cleanParent2Email)),
        pendingInvite
      );
    }
    await setDoc(
      userRef,
      {
        uid: user.uid,
        name: user.displayName || authProfile?.name || "",
        email: ownerEmail,
        familyId: familyRef.id,
        familyIds: arrayUnion(familyRef.id),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    localStorage.setItem(STORAGE_KEY, familyRef.id);
    setActiveFamilyIdState(familyRef.id);
    await refreshFamilies();

    return familyRef.id;
  };

  const updateActiveFamily = async (data) => {
    if (!activeProfile?.id) return;

    const payload = { ...data, updatedAt: serverTimestamp() };

    if (data.children !== undefined) {
      payload.children = normalizeFamilyChildren(data.children);
    }

    if (data.family_name !== undefined) payload.familyName = data.family_name;
    if (data.parent1_person_id !== undefined) payload.parent1PersonId = data.parent1_person_id;
    if (data.parent1_name !== undefined) payload.parent1Name = data.parent1_name;
    if (data.parent1_role !== undefined) payload.parent1Role = data.parent1_role;
    if (data.parent1_relationship !== undefined) payload.parent1Relationship = data.parent1_relationship;
    if (data.parent1_color !== undefined) payload.parent1Color = data.parent1_color;
    if (data.parent2_person_id !== undefined) payload.parent2PersonId = data.parent2_person_id;
    if (data.parent2_name !== undefined) payload.parent2Name = data.parent2_name;
    if (data.parent2_email !== undefined) payload.parent2Email = data.parent2_email;
    if (data.parent2_role !== undefined) payload.parent2Role = data.parent2_role;
    if (data.parent2_relationship !== undefined) payload.parent2Relationship = data.parent2_relationship;
    if (data.parent2_color !== undefined) payload.parent2Color = data.parent2_color;

    if (data.familyName !== undefined) payload.family_name = data.familyName;
    if (data.parent1PersonId !== undefined) payload.parent1_person_id = data.parent1PersonId;
    if (data.parent1Name !== undefined) payload.parent1_name = data.parent1Name;
    if (data.parent1Role !== undefined) payload.parent1_role = data.parent1Role;
    if (data.parent1Relationship !== undefined) payload.parent1_relationship = data.parent1Relationship;
    if (data.parent1Color !== undefined) payload.parent1_color = data.parent1Color;
    if (data.parent2PersonId !== undefined) payload.parent2_person_id = data.parent2PersonId;
    if (data.parent2Name !== undefined) payload.parent2_name = data.parent2Name;
    if (data.parent2Email !== undefined) payload.parent2_email = data.parent2Email;
    if (data.parent2Role !== undefined) payload.parent2_role = data.parent2Role;
    if (data.parent2Relationship !== undefined) payload.parent2_relationship = data.parent2Relationship;
    if (data.parent2Color !== undefined) payload.parent2_color = data.parent2Color;

    await updateDoc(doc(db, "families", activeProfile.id), payload);
    await refreshFamilies();
  };

  const value = {
    user,
    myEmail,
    profile: activeProfile,
    familyModel,
    familyCore: familyModel?.family || null,
    familyPeople: familyModel?.people || [],
    familyAdults: familyModel?.adults || [],
    familyChildrenCore: familyModel?.children || [],
    familyOwner: familyModel?.owner || null,
    familyId: activeProfile?.id || null,
    actualFamilyId: activeProfile?.id || null,
    custodyScopeId: "",
    custodyModuleActive: false,
    isOwner,
    isAdmin,
    perms,
    dadName: dadName || "Papá",
    momName: momName || "Mamá",
    familyDadName: dadName || "Papá",
    familyMomName: momName || "Mamá",
    custodyParentOverride: null,
    dadColor,
    momColor,
    children: familyChildren,
    isLoading: isLoading || authLoading,
    allProfiles: accessibleProfiles,
    activeProfileId: activeProfile?.id || null,
    setActiveProfileId,
    refreshFamilies,
    createFamily,
    updateActiveFamily,
  };

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (!context) throw new Error("useFamily must be used inside FamilyProvider");
  return context;
}
