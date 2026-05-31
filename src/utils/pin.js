// Genera un código numérico de 6 dígitos (100000–999999).
// SEC-001: 6 dígitos reducen ~10x el espacio enumerable por fuerza bruta frente
// a 5. La unicidad se garantiza al insertar: si ya existe la sesión, se reintenta.
// El flujo del alumno acepta PIN de 5 o 6 dígitos (retrocompatibilidad).
export function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
