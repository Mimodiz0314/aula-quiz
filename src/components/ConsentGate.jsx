import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.js';

// ConsentGate (LEGAL-001): antes de usar la plataforma con estudiantes, el
// docente confirma que cuenta con la autorización de los acudientes para tratar
// datos de menores (Ley 1581 / COPPA). Se guarda una sola vez por cuenta.
const KEY = (uid) => `aula_consent_${uid || 'anon'}`;

export default function ConsentGate() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [aceptado, setAceptado] = useState(() => {
    try { return localStorage.getItem(KEY(uid)) === '1'; } catch { return true; }
  });
  const [check, setCheck] = useState(false);

  if (aceptado || !uid) return null;

  function aceptar() {
    try { localStorage.setItem(KEY(uid), '1'); } catch { /* ignore */ }
    setAceptado(true);
  }

  return (
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-scale-in">
        <h2 className="font-black text-2xl mb-3 text-ink">Antes de empezar 🛡️</h2>
        <p className="font-bold text-ink/70 text-sm leading-relaxed mb-4">
          Esta plataforma trata datos de estudiantes (nombre y curso) para evaluar.
          Para proteger a los menores, necesitamos tu confirmación:
        </p>
        <label className="flex items-start gap-3 bg-mist/20 p-4 rounded-2xl cursor-pointer mb-2">
          <input
            type="checkbox"
            checked={check}
            onChange={(e) => setCheck(e.target.checked)}
            className="mt-1 w-5 h-5 accent-brandPrimary"
          />
          <span className="font-bold text-ink/80 text-sm">
            Confirmo que cuento con la autorización del establecimiento educativo y/o de
            los padres/acudientes para usar esta herramienta con mis estudiantes, y que
            usaré preferentemente nombres de pila o seudónimos.
          </span>
        </label>
        <a href="/privacidad" target="_blank" rel="noreferrer"
           className="block text-brandPrimary font-bold text-sm underline mb-6">
          Leer la Política de Privacidad
        </a>
        <button
          onClick={aceptar}
          disabled={!check}
          className="btn-primary w-full bg-ink disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Aceptar y continuar
        </button>
      </div>
    </div>
  );
}
