import React, { createContext, useContext, useEffect, useState } from "react";
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

const AuthContext = createContext(null);

const DEFAULT_PERMISSIONS = {
  calendar: { read: true, write: true },
  tasks: { read: true, write: true },
  meals: { read: true, write: true },
  groceries: { read: true, write: true },
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

function oppositeParentRole(role) {
  if (role === "mom") return "dad";
  if (role === "dad") return "mom";
  return "parent";
}

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (firebaseUser) => {
    if (!firebaseUser) {
      setProfile(null);
      return;
    }

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
      const familySnap = await getDoc(doc(db, "families", familyId));
      if (familySnap.exists()) {
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

    const familyRef = doc(collection(db, "families"));
    const ownerEmail = normalizeEmail(firebaseUser.email);
    const ownerName = data.name || firebaseUser.displayName || "Family";
    const familyName = `${ownerName}'s Family`;
    const parentRole = data.role || "dad";
    const ownerPersonId = `user_${firebaseUser.uid}`;
    const now = new Date().toISOString();

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
      parent1Color: parentRole === "mom" ? "amber" : "blue",
      parent1_color: parentRole === "mom" ? "amber" : "blue",
      parent2PersonId: "",
      parent2Name: "",
      parent2_name: "",
      parent2Email: "",
      parent2_email: "",
      parent2Role: oppositeParentRole(parentRole),
      parent2_role: oppositeParentRole(parentRole),
      parent2Color: parentRole === "mom" ? "blue" : "amber",
      parent2_color: parentRole === "mom" ? "blue" : "amber",
      children: [],
      members: [
        {
          uid: firebaseUser.uid,
          personId: ownerPersonId,
          email: ownerEmail,
          name: ownerName,
          displayName: ownerName,
          role: "owner",
          isAdmin: true,
          permissions: DEFAULT_PERMISSIONS,
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

    const updatedProfile = {
      ...data,
      uid: firebaseUser.uid,
      name: ownerName,
      email: ownerEmail,
      familyId: familyRef.id,
      familyIds: [familyRef.id],
      role: parentRole,
      onboardingComplete: data.onboardingComplete ?? false,
      updatedAt: now,
    };

    await setDoc(userRef, updatedProfile, { merge: true });
    setProfile({ id: firebaseUser.uid, ...updatedProfile });
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

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
  }) => {
    const cleanEmail = normalizeEmail(email);
    const cleanParent2Email = normalizeEmail(parent2Email);
    const cleanName = String(name || "").trim();
    const cleanRole = role || "parent";
    const now = new Date().toISOString();
    const result = await createUserWithEmailAndPassword(auth, cleanEmail, password);

    await updateProfile(result.user, {
      displayName: cleanName,
    });

    const familyRef = doc(collection(db, "families"));
    const resolvedFamilyName = String(familyName || "").trim() || `${cleanName || "My"} Family`;
    const ownerPersonId = `user_${result.user.uid}`;
    const cleanChildren = onboardingMode === "create" ? normalizeChildren(children) : [];
    const memberEmails = [cleanEmail].filter(Boolean);
    const pendingInvite = cleanParent2Email
      ? buildFamilyInvitation({
          familyId: familyRef.id,
          familyName: resolvedFamilyName,
          recipientName: parent2Name,
          recipientEmail: cleanParent2Email,
          role: oppositeParentRole(cleanRole),
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
      parent1Color: cleanRole === "mom" ? "amber" : "blue",
      parent1_color: cleanRole === "mom" ? "amber" : "blue",
      parent2PersonId: cleanParent2Email ? `email_${cleanParent2Email.replace(/[^a-z0-9]+/g, "-")}` : "",
      parent2Name: String(parent2Name || "").trim(),
      parent2_name: String(parent2Name || "").trim(),
      parent2Email: cleanParent2Email,
      parent2_email: cleanParent2Email,
      parent2Role: oppositeParentRole(cleanRole),
      parent2_role: oppositeParentRole(cleanRole),
      parent2Color: cleanRole === "mom" ? "blue" : "amber",
      parent2_color: cleanRole === "mom" ? "blue" : "amber",
      children: cleanChildren,
      members: [
        {
          uid: result.user.uid,
          personId: ownerPersonId,
          email: cleanEmail,
          name: cleanName,
          displayName: cleanName,
          role: "owner",
          isAdmin: true,
          permissions: DEFAULT_PERMISSIONS,
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

    await setDoc(doc(db, "users", result.user.uid), {
      uid: result.user.uid,
      name: cleanName,
      email: cleanEmail,
      familyId: familyRef.id,
      familyIds: [familyRef.id],
      role: cleanRole,
      onboardingMode,
      onboardingComplete: true,
      createdAt: now,
      updatedAt: now,
    });

    await loadProfile(result.user);
    return result.user;
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
