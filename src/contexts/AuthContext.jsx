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

  useEffect(() => {
    return onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && !currentUser.isAnonymous) {
        setUser(currentUser);
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
      } else {
        setUser(currentUser ?? null);
        setRole(null);
        setUserData(null);
      }
    });
  }, []);

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
      value={{ user, role, userData, loading, login, registrar, logout, cambiarMiPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
