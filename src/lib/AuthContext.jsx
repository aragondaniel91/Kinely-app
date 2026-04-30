import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, collection } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

const AuthContext = createContext(null);

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

    const ref = doc(db, "users", firebaseUser.uid);
    const snap = await getDoc(ref);

    if (snap.exists()) {
      setProfile({ id: snap.id, ...snap.data() });
    }
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

const register = async ({ name, email, password }) => {
  const result = await createUserWithEmailAndPassword(auth, email, password);

  await updateProfile(result.user, {
    displayName: name,
  });

  const familyRef = doc(collection(db, "families"));

  await setDoc(familyRef, {
    familyName: `${name}'s Family`,
    ownerId: result.user.uid,
    members: [result.user.uid],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await setDoc(doc(db, "users", result.user.uid), {
    uid: result.user.uid,
    name,
    email,
    familyId: familyRef.id,
    role: "dad",
    createdAt: new Date().toISOString(),
  });

  await loadProfile(result.user);

  return result.user;
};

  const login = async ({ email, password }) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
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


