// Genera un código numérico de 5 dígitos (10000–99999).
// La unicidad se garantiza al insertar: si ya existe la sesión, se reintenta.
export function generatePin() {
  return Math.floor(10000 + Math.random() * 90000).toString();
}
