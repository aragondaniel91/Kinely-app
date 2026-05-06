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

const FamilyContext = createContext(null);

const STORAGE_KEY = "familywall_active_family_id";
const CUSTODY_PARENT_OVERRIDE_KEY = "familywall_custody_parent_override";

const DEFAULT_PERMS = {
  calendar: { read: true, write: true },
  tasks: { read: true, write: true },
  meals: { read: true, write: true },
  groceries: { read: true, write: true },
};

const READ_ONLY_PERMS = {
  calendar: { read: true, write: false },
  tasks: { read: true, write: false },
  meals: { read: true, write: false },
  groceries: { read: true, write: false },
};

function getCurrentPath() {
  if (typeof window === "undefined") return "";
  return window.location.pathname || "";
}

function readCustodyParentOverride() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CUSTODY_PARENT_OVERRIDE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Invalid custody parent override:", error);
    return null;
  }
}

function normalizePermissions(member) {
  if (!member) return READ_ONLY_PERMS;

  if (member.isAdmin || member.is_admin) {
    return DEFAULT_PERMS;
  }

  const legacy = {
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
  };

  if (!member.permissions) return legacy;

  return {
    calendar: {
      read: member.permissions.calendar?.read !== false,
      write: member.permissions.calendar?.write === true,
    },
    tasks: {
      read: member.permissions.tasks?.read !== false,
      write: member.permissions.tasks?.write === true,
    },
    meals: {
      read: member.permissions.meals?.read !== false,
      write: member.permissions.meals?.write === true,
    },
    groceries: {
      read: member.permissions.groceries?.read !== false,
      write: member.permissions.groceries?.write === true,
    },
  };
}

function normalizeFamilyProfile(family, user) {
  if (!family) return null;

  const parent1Role = family.parent1Role || family.parent1_role || "dad";

  const parent2Role =
    family.parent2Role ||
    family.parent2_role ||
    (parent1Role === "dad" ? "mom" : "dad");

  const familyName =
    family.familyName ||
    family.family_name ||
    `${user?.displayName || "Family"}'s Family`;

  const children =
    family.children ||
    (family.childName ? [family.childName] : []) ||
    (family.child_name ? [family.child_name] : []);

  return {
    ...family,

    familyId: family.id,
    familyName,
    ownerId: family.ownerId || family.owner_id,
    ownerEmail: family.ownerEmail || family.owner_email,

    parent1Name:
      family.parent1Name || family.parent1_name || user?.displayName || "",
    parent1Role,
    parent1Color: family.parent1Color || family.parent1_color || "blue",

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

  if (userData?.familyId) {
    return userData.familyId;
  }

  const familyRef = doc(collection(db, "families"));

  const familyData = {
    familyName: `${firebaseUser.displayName || userData?.name || "Family"}'s Family`,
    family_name: `${firebaseUser.displayName || userData?.name || "Family"}'s Family`,
    ownerId: firebaseUser.uid,
    ownerEmail: firebaseUser.email,
    createdBy: firebaseUser.uid,
    createdByEmail: firebaseUser.email,

    parent1Name: firebaseUser.displayName || userData?.name || "",
    parent1_name: firebaseUser.displayName || userData?.name || "",
    parent1Role: userData?.role === "mom" ? "mom" : "dad",
    parent1_role: userData?.role === "mom" ? "mom" : "dad",
    parent1Color: "blue",
    parent1_color: "blue",

    parent2Name: "",
    parent2_name: "",
    parent2Email: "",
    parent2_email: "",
    parent2Role: userData?.role === "mom" ? "dad" : "mom",
    parent2_role: userData?.role === "mom" ? "dad" : "mom",
    parent2Color: "amber",
    parent2_color: "amber",

    children: [],

    members: [
      {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || userData?.name || "",
        role: "owner",
        isAdmin: true,
        permissions: DEFAULT_PERMS,
      },
    ],

    memberEmails: [firebaseUser.email],
    member_emails: [firebaseUser.email],

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(familyRef, familyData);

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
  const [currentPath, setCurrentPath] = useState(() => getCurrentPath());
  const [custodyParentOverride, setCustodyParentOverride] = useState(() => readCustodyParentOverride());

  const myEmail = user?.email || authProfile?.email || null;

  const setActiveProfileId = (id) => {
    if (!id) return;
    localStorage.setItem(STORAGE_KEY, id);
    setActiveFamilyIdState(id);
  };

  useEffect(() => {
    const updatePath = () => setCurrentPath(getCurrentPath());
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;

    window.history.pushState = function patchedPushState(...args) {
      originalPushState.apply(this, args);
      updatePath();
    };

    window.history.replaceState = function patchedReplaceState(...args) {
      originalReplaceState.apply(this, args);
      updatePath();
    };

    window.addEventListener("popstate", updatePath);

    return () => {
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
      window.removeEventListener("popstate", updatePath);
    };
  }, []);

  useEffect(() => {
    const handleCustodyOverride = (event) => {
      setCustodyParentOverride(event.detail || readCustodyParentOverride());
    };

    window.addEventListener("familywall:custody-parent-override", handleCustodyOverride);

    return () => {
      window.removeEventListener("familywall:custody-parent-override", handleCustodyOverride);
    };
  }, []);

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
          const memberQuery = query(
            collection(db, "families"),
            where("memberEmails", "array-contains", myEmail)
          );
          const memberSnap = await getDocs(memberQuery);
          memberSnap.docs.forEach((familyDoc) => {
            if (!loaded.some((f) => f.id === familyDoc.id)) {
              loaded.push({ id: familyDoc.id, ...familyDoc.data() });
            }
          });
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

  useEffect(() => {
    if (activeProfile?.id && activeProfile.id !== activeFamilyIdState) {
      localStorage.setItem(STORAGE_KEY, activeProfile.id);
      setActiveFamilyIdState(activeProfile.id);
    }
  }, [activeProfile?.id, activeFamilyIdState]);

  const memberEntry = useMemo(() => {
    if (!activeProfile || !myEmail) return null;
    return (activeProfile.members || []).find((member) => {
      return member.uid === user?.uid || member.email?.toLowerCase() === myEmail?.toLowerCase();
    });
  }, [activeProfile, myEmail, user?.uid]);

  const isOwner = activeProfile
    ? activeProfile.ownerId === user?.uid ||
      activeProfile.owner_id === user?.uid ||
      activeProfile.ownerEmail === myEmail ||
      activeProfile.owner_email === myEmail ||
      activeProfile.created_by === myEmail
    : false;

  const isAdmin = isOwner || memberEntry?.isAdmin === true || memberEntry?.is_admin === true;
  const perms = isAdmin ? DEFAULT_PERMS : normalizePermissions(memberEntry);

  const dadName = activeProfile?.parent1_role === "dad" ? activeProfile?.parent1_name : activeProfile?.parent2_name;
  const momName = activeProfile?.parent1_role === "mom" ? activeProfile?.parent1_name : activeProfile?.parent2_name;
  const dadColor = activeProfile?.parent1_role === "dad" ? activeProfile?.parent1_color || activeProfile?.parent1Color || "blue" : activeProfile?.parent2_color || activeProfile?.parent2Color || "blue";
  const momColor = activeProfile?.parent1_role === "mom" ? activeProfile?.parent1_color || activeProfile?.parent1Color || "amber" : activeProfile?.parent2_color || activeProfile?.parent2Color || "amber";
  const familyChildren = activeProfile?.children || (activeProfile?.child_name ? [activeProfile.child_name] : []);

  const custodyModuleActive = currentPath.startsWith("/custody");
  const custodyScopeId = custodyModuleActive ? custodyParentOverride?.custodyGroupId || "" : "";

  const resolvedDadName = custodyModuleActive && custodyParentOverride?.dadName ? custodyParentOverride.dadName : dadName || "Papá";
  const resolvedMomName = custodyModuleActive && custodyParentOverride?.momName ? custodyParentOverride.momName : momName || "Mamá";

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
        const memberQuery = query(collection(db, "families"), where("memberEmails", "array-contains", myEmail));
        const memberSnap = await getDocs(memberQuery);
        memberSnap.docs.forEach((familyDoc) => {
          if (!loaded.some((f) => f.id === familyDoc.id)) loaded.push({ id: familyDoc.id, ...familyDoc.data() });
        });
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
    const cleanChildren = Array.isArray(children) ? children.map((child) => String(child).trim()).filter(Boolean) : [];
    const familyRef = doc(collection(db, "families"));
    const userRef = doc(db, "users", user.uid);

    const familyData = {
      familyName: name,
      family_name: name,
      type: "household",
      ownerId: user.uid,
      ownerEmail: user.email,
      createdBy: user.uid,
      createdByEmail: user.email,

      parent1Name: user.displayName || authProfile?.name || "",
      parent1_name: user.displayName || authProfile?.name || "",
      parent1Role: authProfile?.role === "mom" ? "mom" : "dad",
      parent1_role: authProfile?.role === "mom" ? "mom" : "dad",
      parent1Color: "blue",
      parent1_color: "blue",

      parent2Name: parent2Name.trim(),
      parent2_name: parent2Name.trim(),
      parent2Email: parent2Email.trim().toLowerCase(),
      parent2_email: parent2Email.trim().toLowerCase(),
      parent2Role: authProfile?.role === "mom" ? "dad" : "mom",
      parent2_role: authProfile?.role === "mom" ? "dad" : "mom",
      parent2Color: "amber",
      parent2_color: "amber",

      children: cleanChildren,

      members: [
        {
          uid: user.uid,
          email: user.email,
          name: user.displayName || authProfile?.name || "",
          role: "owner",
          isAdmin: true,
          permissions: DEFAULT_PERMS,
        },
      ],
      memberEmails: [user.email, parent2Email.trim().toLowerCase()].filter(Boolean),
      member_emails: [user.email, parent2Email.trim().toLowerCase()].filter(Boolean),

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(familyRef, familyData);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        name: user.displayName || authProfile?.name || "",
        email: user.email,
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

    if (data.family_name !== undefined) payload.familyName = data.family_name;
    if (data.parent1_name !== undefined) payload.parent1Name = data.parent1_name;
    if (data.parent1_role !== undefined) payload.parent1Role = data.parent1_role;
    if (data.parent1_color !== undefined) payload.parent1Color = data.parent1_color;
    if (data.parent2_name !== undefined) payload.parent2Name = data.parent2_name;
    if (data.parent2_email !== undefined) payload.parent2Email = data.parent2_email;
    if (data.parent2_role !== undefined) payload.parent2Role = data.parent2_role;
    if (data.parent2_color !== undefined) payload.parent2Color = data.parent2_color;

    if (data.familyName !== undefined) payload.family_name = data.familyName;
    if (data.parent1Name !== undefined) payload.parent1_name = data.parent1Name;
    if (data.parent1Role !== undefined) payload.parent1_role = data.parent1Role;
    if (data.parent1Color !== undefined) payload.parent1_color = data.parent1Color;
    if (data.parent2Name !== undefined) payload.parent2_name = data.parent2Name;
    if (data.parent2Email !== undefined) payload.parent2_email = data.parent2Email;
    if (data.parent2Role !== undefined) payload.parent2_role = data.parent2Role;
    if (data.parent2Color !== undefined) payload.parent2_color = data.parent2Color;

    await updateDoc(doc(db, "families", activeProfile.id), payload);
    await refreshFamilies();
  };

  const value = {
    user,
    myEmail,
    profile: activeProfile,
    familyId: activeProfile?.id || null,
    actualFamilyId: activeProfile?.id || null,
    custodyScopeId,
    custodyModuleActive,
    isOwner,
    isAdmin,
    perms,
    dadName: resolvedDadName,
    momName: resolvedMomName,
    familyDadName: dadName || "Papá",
    familyMomName: momName || "Mamá",
    custodyParentOverride,
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
