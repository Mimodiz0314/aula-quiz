// ---------------------------------------------------------------------------
// Configuración central de Firebase. Lee credenciales desde variables de
// entorno (Vite las inyecta como import.meta.env.VITE_*).
// ---------------------------------------------------------------------------
import { initializeApp } from 'firebase/app';
import { getDatabase, serverTimestamp } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let app, db, auth, functions;

try {
  app = initializeApp(firebaseConfig);
  db = getDatabase(app);
  auth = getAuth(app);
  functions = getFunctions(app);
} catch (error) {
  console.error("❌ ERROR CRÍTICO AL INICIALIZAR FIREBASE:", error.message);
  console.error("Asegúrate de que el archivo .env existe en la raíz del proyecto y de que has REINICIADO el servidor de desarrollo.");
}

export { app, db, auth, functions, serverTimestamp };
