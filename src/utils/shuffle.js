// Shuffle determinístico basado en un string seed.
// Garantiza que todos los estudiantes en la misma sesión/pregunta
// vean los mismos elementos en el mismo orden aleatorio.
export function deterministicShuffle(arr, seed) {
  function hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    }
    return h >>> 0;
  }
  const indexed = arr.map((item, origIdx) => ({ item, origIdx }));
  for (let i = indexed.length - 1; i > 0; i--) {
    const j = hash(seed + String(i)) % (i + 1);
    [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
  }
  return indexed; // [{item, origIdx}, ...]
}
