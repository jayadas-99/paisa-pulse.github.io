import { createContext, useEffect, useMemo, useState } from "react";
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile } from "firebase/auth";
import { auth, firebaseReady, googleProvider } from "../services/firebase";
import { getProfile, saveProfile } from "../services/transactionService";

export const AuthContext = createContext(null);

function withTimeout(promise, ms = 3500) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Profile request timed out.")), ms);
    }),
  ]);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      return undefined;
    }
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (!firebaseUser) {
        setProfile(null);
        return;
      }
      withTimeout(getProfile(firebaseUser.uid))
        .then((nextProfile) => setProfile(nextProfile))
        .catch(() => {
          setProfile({
            name: firebaseUser.displayName || "Paisa Coach user",
            email: firebaseUser.email,
            salaryDate: 1,
            monthlyIncome: 0,
          });
        });
    });
  }, []);

  function requireFirebase() {
    if (!firebaseReady) throw new Error("Firebase environment variables are missing.");
  }

  async function signup(email, password, name, salaryDate, monthlyIncome) {
    requireFirebase();
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    const nextProfile = { name, email, createdAt: Date.now(), salaryDate: Number(salaryDate), monthlyIncome: Number(monthlyIncome) };
    await saveProfile(credential.user.uid, nextProfile);
    setProfile(nextProfile);
  }

  async function login(email, password) {
    requireFirebase();
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function loginWithGoogle() {
    requireFirebase();
    const credential = await signInWithPopup(auth, googleProvider);
    const existing = await withTimeout(getProfile(credential.user.uid));
    if (!existing) {
      const nextProfile = {
        name: credential.user.displayName || "Paisa Coach user",
        email: credential.user.email,
        createdAt: Date.now(),
        salaryDate: 1,
        monthlyIncome: 0,
      };
      await saveProfile(credential.user.uid, nextProfile);
      setProfile(nextProfile);
    }
  }

  async function updateUserProfile(values) {
    requireFirebase();
    if (!user) return;
    const nextProfile = { ...(profile || {}), ...values };
    await saveProfile(user.uid, nextProfile);
    setProfile(nextProfile);
  }

  const value = useMemo(() => ({
    user,
    profile,
    loading,
    firebaseReady,
    signup,
    login,
    loginWithGoogle,
    logout: () => firebaseReady ? signOut(auth) : Promise.resolve(),
    updateUserProfile,
  }), [user, profile, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
