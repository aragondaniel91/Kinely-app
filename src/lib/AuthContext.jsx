import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { collection, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  buildFamilyInvitation,
  familyInvitationId,
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

const AuthContext = createContext(null);

const DEFAULT_PERMISSIONS = {
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

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
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

function normalizeChild(child, index = 0) {
  const name = typeof child === "string" ? child.trim() : String(child?.name || child?.childName || "").trim();
  if (!name) return null;

  const id = typeof child === "object" && child !== null
    ? child.id || child.childId || `child-${slugify(name) || index + 1}`
    : `child-${slugify(name) || index + 1}`;

  return {
    id,
    childId: id,
    name,
    childName: name,
    nameKey: slugify(name),
    color: typeof child === "object" && child !== null ? child.color || "green" : "green",
  };
}

function normalizeChildren(children = []) {
  if (!Array.isArray(children)) return [];
  return children.map(normalizeChild).filter(Boolean);
}

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const registrationInProgressRef = useRef(false);
  const loadProfilePromisesRef = useRef(new Map());

  const loadProfile = async (firebaseUser) => {
    if (!firebaseUser) {
      setProfile(null);
      return;
    }

    const existingLoad = loadProfilePromisesRef.current.get(firebaseUser.uid);
    if (existingLoad) return existingLoad;

    const loadPromise = (async () => {
    const userRef = doc(db, "users", firebaseUser.uid);
    const snap = await getDoc(userRef);
    const data = snap.exists()
      ? snap.data()
      : {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || "",
          email: normalizeEmail(firebaseUser.email),
          role: "dad",
          onboardingComplete: false,
        };
    const familyIds = [
      data.familyId,
      ...(Array.isArray(data.familyIds) ? data.familyIds : []),
    ].filter(Boolean);

    for (const familyId of [...new Set(familyIds)]) {
      let familySnap = null;

      try {
        familySnap = await getDoc(doc(db, "families", familyId));
      } catch {
        familySnap = null;
      }

      if (familySnap?.exists()) {
        const updatedProfile = {
          ...data,
          familyId,
          familyIds: [...new Set([...familyIds, familyId])],
        };

        if (data.familyId !== familyId) {
          await setDoc(
            userRef,
            {
              familyId,
              familyIds: updatedProfile.familyIds,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        setProfile({ id: firebaseUser.uid, ...updatedProfile });
        return;
      }
    }

    if (data.onboardingMode === "join") {
      const joinProfile = {
        ...data,
        uid: firebaseUser.uid,
        name: data.name || firebaseUser.displayName || "",
        email: data.email || normalizeEmail(firebaseUser.email),
        familyId: "",
        familyIds: [],
        onboardingMode: "join",
        onboardingComplete: true,
      };

      await setDoc(
        userRef,
        {
          ...joinProfile,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setProfile({ id: firebaseUser.uid, ...joinProfile });
      return;
    }

    const existingFamilyId = await findExistingFamilyIdForUser(db, firebaseUser, data);
    if (existingFamilyId) {
      const updatedProfile = {
        ...data,
        uid: firebaseUser.uid,
        name: data.name || firebaseUser.displayName || "",
        email: data.email || normalizeEmail(firebaseUser.email),
        familyId: existingFamilyId,
        familyIds: [...new Set([...familyIds, existingFamilyId])],
      };

      await setDoc(
        userRef,
        {
          ...updatedProfile,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setProfile({ id: firebaseUser.uid, ...updatedProfile });
      return;
    }

    const familyRef = doc(db, "families", bootstrapFamilyIdForUser(firebaseUser.uid));
    const ownerEmail = normalizeEmail(firebaseUser.email);
    const ownerName = data.name || firebaseUser.displayName || "Family";
    const familyName = `${ownerName}'s Family`;
    const parentRole = normalizeMemberRole(data.role, "dad");
    const parentRelationship = data.relationship || data.memberRelationship || data.member_relationship || roleToRelationship(parentRole);
    const parentPersonType = data.personType || data.person_type || roleToPersonType(parentRole);
    const parentLivesHere = typeof data.livesHere === "boolean" ? data.livesHere : roleDefaultLivesHere(parentRole);
    const parentShowOnHomeDashboard =
      typeof data.showOnHomeDashboard === "boolean"
        ? data.showOnHomeDashboard
        : roleDefaultShowOnHomeDashboard(parentRole);
    const parent2Role = oppositeParentRole(parentRole);
    const parent2Relationship = roleToRelationship(parent2Role);
    const ownerPersonId = `user_${firebaseUser.uid}`;
    const now = new Date().toISOString();

    const existingBootstrapFamily = await getDoc(familyRef);

    if (!existingBootstrapFamily.exists()) {
      await setDoc(familyRef, {
        familyId: familyRef.id,
        familyName,
        family_name: familyName,
        type: "household",
        ownerId: firebaseUser.uid,
        ownerEmail,
        owner_email: ownerEmail,
        createdBy: firebaseUser.uid,
        createdByEmail: ownerEmail,
        parent1PersonId: ownerPersonId,
        parent1Name: ownerName,
        parent1_name: ownerName,
        parent1Role: parentRole,
        parent1_role: parentRole,
        parent1Relationship: parentRelationship,
        parent1_relationship: parentRelationship,
        parent1PersonType: parentPersonType,
        parent1_person_type: parentPersonType,
        parent1LivesHere: parentLivesHere,
        parent1_lives_here: parentLivesHere,
        parent1ShowOnHomeDashboard: parentShowOnHomeDashboard,
        parent1_show_on_home_dashboard: parentShowOnHomeDashboard,
        parent1Color: parentRole === "mom" ? "amber" : "blue",
        parent1_color: parentRole === "mom" ? "amber" : "blue",
        parent2PersonId: "",
        parent2Name: "",
        parent2_name: "",
        parent2Email: "",
        parent2_email: "",
        parent2Role,
        parent2_role: parent2Role,
        parent2Relationship,
        parent2_relationship: parent2Relationship,
        parent2PersonType: roleToPersonType(parent2Role),
        parent2_person_type: roleToPersonType(parent2Role),
        parent2LivesHere: roleDefaultLivesHere(parent2Role),
        parent2_lives_here: roleDefaultLivesHere(parent2Role),
        parent2ShowOnHomeDashboard: roleDefaultShowOnHomeDashboard(parent2Role),
        parent2_show_on_home_dashboard: roleDefaultShowOnHomeDashboard(parent2Role),
        parent2Color: parentRole === "mom" ? "blue" : "amber",
        parent2_color: parentRole === "mom" ? "blue" : "amber",
        children: [],
        members: [
          {
            id: ownerPersonId,
            uid: firebaseUser.uid,
            personId: ownerPersonId,
            person_id: ownerPersonId,
            email: ownerEmail,
            name: ownerName,
            displayName: ownerName,
            display_name: ownerName,
            role: parentRole,
            type: parentPersonType,
            personType: parentPersonType,
            person_type: parentPersonType,
            relationship: parentRelationship,
            memberRelationship: parentRelationship,
            member_relationship: parentRelationship,
            appRole: "owner",
            app_role: "owner",
            livesHere: parentLivesHere,
            lives_here: parentLivesHere,
            showOnHomeDashboard: parentShowOnHomeDashboard,
            show_on_home_dashboard: parentShowOnHomeDashboard,
            homeDashboard: parentShowOnHomeDashboard,
            home_dashboard: parentShowOnHomeDashboard,
            isAdmin: true,
            permissions: DEFAULT_PERMISSIONS,
            modules: DEFAULT_PERMISSIONS,
          },
        ],
        memberIds: [firebaseUser.uid],
        memberEmails: [ownerEmail],
        adminIds: [firebaseUser.uid],
        adminEmails: [ownerEmail],
        viewerIds: [],
        viewerEmails: [],
        member_emails: [ownerEmail],
        createdAt: now,
        updatedAt: now,
      });
    }

    const updatedProfile = {
      ...data,
      uid: firebaseUser.uid,
      name: ownerName,
      email: ownerEmail,
      familyId: familyRef.id,
      familyIds: [familyRef.id],
      role: parentRole,
      relationship: parentRelationship,
      personType: parentPersonType,
      livesHere: parentLivesHere,
      showOnHomeDashboard: parentShowOnHomeDashboard,
      onboardingComplete: data.onboardingComplete ?? false,
      updatedAt: now,
    };

    await setDoc(userRef, updatedProfile, { merge: true });
    setProfile({ id: firebaseUser.uid, ...updatedProfile });
    })();

    loadProfilePromisesRef.current.set(firebaseUser.uid, loadPromise);

    try {
      return await loadPromise;
    } finally {
      loadProfilePromisesRef.current.delete(firebaseUser.uid);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (registrationInProgressRef.current) {
        return;
      }

      if (firebaseUser) {
        await loadProfile(firebaseUser);
      } else {
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  const register = async ({
    name,
    email,
    password,
    role = "dad",
    onboardingMode = "create",
    familyName = "",
    parent2Name = "",
    parent2Email = "",
    children = [],
    relationship = "",
    personType = "",
    livesHere,
    showOnHomeDashboard,
  }) => {
    const cleanEmail = normalizeEmail(email);
    const cleanParent2Email = normalizeEmail(parent2Email);
    const cleanName = String(name || "").trim();
    const cleanRole = normalizeMemberRole(role, "parent");
    const cleanRelationship = relationship || roleToRelationship(cleanRole);
    const cleanPersonType = personType || roleToPersonType(cleanRole);
    const cleanLivesHere = typeof livesHere === "boolean" ? livesHere : roleDefaultLivesHere(cleanRole);
    const cleanShowOnHomeDashboard =
      typeof showOnHomeDashboard === "boolean"
        ? showOnHomeDashboard
        : roleDefaultShowOnHomeDashboard(cleanRole);
    const parent2Role = oppositeParentRole(cleanRole);
    const parent2Relationship = roleToRelationship(parent2Role);
    const parent2PersonType = roleToPersonType(parent2Role);
    const parent2LivesHere = roleDefaultLivesHere(parent2Role);
    const parent2ShowOnHomeDashboard = roleDefaultShowOnHomeDashboard(parent2Role);
    const now = new Date().toISOString();
    registrationInProgressRef.current = true;
    setLoading(true);

    try {
      const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);

      await updateProfile(result.user, {
        displayName: cleanName,
      });

      if (onboardingMode === "join") {
        const joinProfile = {
          uid: result.user.uid,
          name: cleanName,
          email: cleanEmail,
          familyId: "",
          familyIds: [],
          role: cleanRole,
          relationship: cleanRelationship,
          personType: cleanPersonType,
          livesHere: cleanLivesHere,
          showOnHomeDashboard: cleanShowOnHomeDashboard,
          onboardingMode: "join",
          onboardingComplete: true,
          createdAt: now,
          updatedAt: now,
        };

        await setDoc(doc(db, "users", result.user.uid), joinProfile);
        setUser(result.user);
        setProfile({ id: result.user.uid, ...joinProfile });
        return result.user;
      }

      const familyRef = doc(collection(db, "families"));
      const resolvedFamilyName = String(familyName || "").trim() || `${cleanName || "My"} Family`;
      const ownerPersonId = `user_${result.user.uid}`;
      const cleanChildren = normalizeChildren(children);
      const memberEmails = [cleanEmail].filter(Boolean);
      const pendingInvite = cleanParent2Email
        ? buildFamilyInvitation({
            familyId: familyRef.id,
            familyName: resolvedFamilyName,
            recipientName: parent2Name,
            recipientEmail: cleanParent2Email,
            role: parent2Role,
            relationship: parent2Relationship,
            personType: parent2PersonType,
            livesHere: parent2LivesHere,
            showOnHomeDashboard: parent2ShowOnHomeDashboard,
            createdBy: result.user.uid,
            createdByEmail: cleanEmail,
            now,
          })
        : null;

      await setDoc(familyRef, withPendingFamilyInvitation({
        familyId: familyRef.id,
        familyName: resolvedFamilyName,
        family_name: resolvedFamilyName,
        type: "household",
        ownerId: result.user.uid,
        ownerEmail: cleanEmail,
        owner_email: cleanEmail,
        createdBy: result.user.uid,
        createdByEmail: cleanEmail,
        parent1PersonId: ownerPersonId,
        parent1Name: cleanName,
        parent1_name: cleanName,
        parent1Role: cleanRole,
        parent1_role: cleanRole,
        parent1Relationship: cleanRelationship,
        parent1_relationship: cleanRelationship,
        parent1PersonType: cleanPersonType,
        parent1_person_type: cleanPersonType,
        parent1LivesHere: cleanLivesHere,
        parent1_lives_here: cleanLivesHere,
        parent1ShowOnHomeDashboard: cleanShowOnHomeDashboard,
        parent1_show_on_home_dashboard: cleanShowOnHomeDashboard,
        parent1Color: cleanRole === "mom" ? "amber" : "blue",
        parent1_color: cleanRole === "mom" ? "amber" : "blue",
        parent2PersonId: cleanParent2Email ? `email_${cleanParent2Email.replace(/[^a-z0-9]+/g, "-")}` : "",
        parent2Name: String(parent2Name || "").trim(),
        parent2_name: String(parent2Name || "").trim(),
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
        parent2Color: cleanRole === "mom" ? "blue" : "amber",
        parent2_color: cleanRole === "mom" ? "blue" : "amber",
        children: cleanChildren,
        members: [
          {
            id: ownerPersonId,
            uid: result.user.uid,
            personId: ownerPersonId,
            person_id: ownerPersonId,
            email: cleanEmail,
            name: cleanName,
            displayName: cleanName,
            display_name: cleanName,
            role: cleanRole,
            type: cleanPersonType,
            personType: cleanPersonType,
            person_type: cleanPersonType,
            relationship: cleanRelationship,
            memberRelationship: cleanRelationship,
            member_relationship: cleanRelationship,
            appRole: "owner",
            app_role: "owner",
            livesHere: cleanLivesHere,
            lives_here: cleanLivesHere,
            showOnHomeDashboard: cleanShowOnHomeDashboard,
            show_on_home_dashboard: cleanShowOnHomeDashboard,
            homeDashboard: cleanShowOnHomeDashboard,
            home_dashboard: cleanShowOnHomeDashboard,
            isAdmin: true,
            permissions: DEFAULT_PERMISSIONS,
            modules: DEFAULT_PERMISSIONS,
          },
        ],
        memberIds: [result.user.uid],
        memberEmails,
        adminIds: [result.user.uid],
        adminEmails: memberEmails,
        viewerIds: [],
        viewerEmails: [],
        member_emails: memberEmails,
        createdAt: now,
        updatedAt: now,
      }, pendingInvite));

      if (pendingInvite) {
        await setDoc(
          doc(db, "familyInvitations", familyInvitationId(familyRef.id, cleanParent2Email)),
          pendingInvite
        );
      }

      const createdProfile = {
        uid: result.user.uid,
        name: cleanName,
        email: cleanEmail,
        familyId: familyRef.id,
        familyIds: [familyRef.id],
        role: cleanRole,
        relationship: cleanRelationship,
        personType: cleanPersonType,
        livesHere: cleanLivesHere,
        showOnHomeDashboard: cleanShowOnHomeDashboard,
        onboardingMode,
        onboardingComplete: true,
        createdAt: now,
        updatedAt: now,
      };

      await setDoc(doc(db, "users", result.user.uid), createdProfile);
      setUser(result.user);
      setProfile({ id: result.user.uid, ...createdProfile });
      return result.user;
    } finally {
      registrationInProgressRef.current = false;
      setLoading(false);
    }
  };

  const login = async ({ email, password }) => {
    const result = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
    await loadProfile(result.user);
    return result.user;
  };

  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
