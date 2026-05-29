import { createContext, useContext, useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from '../firebase/config.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // undefined = todavía cargando; null = no autenticado
  const [user, setUser] = useState(undefined);
  const [role, setRole] = useState(null);
  const [userData, setUserData] = useState(null);

  async function readUserData(currentUser) {
    try {
      const snap = await get(ref(db, `usuarios/${currentUser.uid}`));
      if (snap.exists()) {
        const data = snap.val();
        setRole(data.rol ?? null);
        setUserData(data);
      } else {
        setRole(null);
        setUserData(null);
      }
    } catch {
      setRole(null);
      setUserData(null);
    }
  }

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && !currentUser.isAnonymous) {
        // Leer el rol ANTES de actualizar user para que loading se mantenga
        // true hasta tener ambos: usuario Y rol. Así ProtectedRoute nunca
        // ve el estado intermedio loading=false + role=null.
        await readUserData(currentUser);
        setUser(currentUser);
      } else {
        setUser(currentUser ?? null);
        setRole(null);
        setUserData(null);
      }
    });
  }, []);

  const refreshUserData = async () => {
    if (!auth.currentUser || auth.currentUser.isAnonymous) return;
    await readUserData(auth.currentUser);
  };

  const login = (email, password) =>
    signInWithEmailAndPassword(auth, email, password);

  const registrar = (email, password) =>
    createUserWithEmailAndPassword(auth, email, password);

  const logout = async () => {
    setRole(null);
    setUserData(null);
    await signOut(auth);
  };

  const cambiarMiPassword = (newPassword) =>
    updatePassword(user, newPassword);

  const loading = user === undefined;

  return (
    <AuthContext.Provider
      value={{ user, role, userData, loading, login, registrar, logout, cambiarMiPassword, refreshUserData }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
