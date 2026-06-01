import { describe, it, expect } from 'vitest';
import { separarClave, fusionarClave, separarLista, fusionarLista } from '../clave.js';
import { esAcierto } from '../grading.js';

describe('separarClave / fusionarClave (round-trip)', () => {
  it('tipo escalar: la pública no expone la respuesta y se reconstruye al fusionar', () => {
    const original = { tipo: 'seleccion_clasica', pregunta: 'P', opciones: ['a', 'b'], correcta: 1 };
    const { publica, clave } = separarClave(original);
    expect('correcta' in publica).toBe(false);   // seguridad: no se expone
    expect(clave).toEqual({ correcta: 1 });
    expect(fusionarClave(publica, clave)).toEqual(original);
  });

  it('tipo de orden: barajado en público + clave permite calificar correctamente', () => {
    const original = { tipo: 'paso_a_paso', pasos: ['1', '2', '3', '4'] };
    const { publica, clave } = separarClave(original);
    // La respuesta correcta del alumno: el orden público que reconstruye el original.
    // clave.orden[pubIdx] = posición correcta de ese ítem público.
    const completa = fusionarClave(publica, clave);
    const correcto = [];
    clave.orden.forEach((pos, pubIdx) => { correcto[pos] = pubIdx; });
    expect(esAcierto(completa, correcto)).toBe(true);
  });
});

describe('separarLista / fusionarLista', () => {
  it('mantiene arrays paralelos y reconstruye la lista completa', () => {
    const lista = [
      { tipo: 'verdad_mito', enunciado: 'X', correcto: 'verdad', explicacion: 'e' },
      { tipo: 'seleccion_clasica', pregunta: 'Q', opciones: ['a', 'b'], correcta: 0 },
    ];
    const { publicas, claves } = separarLista(lista);
    expect(publicas).toHaveLength(2);
    expect(claves).toHaveLength(2);
    expect('correcto' in publicas[0]).toBe(false);
    const reconstruida = fusionarLista(publicas, claves);
    expect(reconstruida[0].correcto).toBe('verdad');
    expect(reconstruida[1].correcta).toBe(0);
  });
  it('sin claves (sesión vieja) devuelve las públicas tal cual', () => {
    const publicas = [{ tipo: 'seleccion_clasica', pregunta: 'Q', correcta: 0 }];
    expect(fusionarLista(publicas, null)).toEqual(publicas);
  });
});
