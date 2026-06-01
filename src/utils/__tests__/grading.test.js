import { describe, it, expect } from 'vitest';
import { esAcierto, contarAciertos, calcularNota, evaluarEstudiante } from '../grading.js';

describe('esAcierto', () => {
  it('selección clásica: acierta por índice', () => {
    expect(esAcierto({ tipo: 'seleccion_clasica', correcta: 2 }, 2)).toBe(true);
    expect(esAcierto({ tipo: 'seleccion_clasica', correcta: 2 }, 1)).toBe(false);
  });
  it('sin tipo se trata como selección clásica', () => {
    expect(esAcierto({ correcta: 0 }, 0)).toBe(true);
  });
  it('verdad/mito y real/inventado comparan el valor', () => {
    expect(esAcierto({ tipo: 'verdad_mito', correcto: 'mito' }, 'mito')).toBe(true);
    expect(esAcierto({ tipo: 'real_inventado', correcto: 'real' }, 'inventado')).toBe(false);
  });
  it('respuesta nula nunca es acierto', () => {
    expect(esAcierto({ tipo: 'seleccion_clasica', correcta: 0 }, null)).toBe(false);
    expect(esAcierto({ tipo: 'seleccion_clasica', correcta: 0 }, undefined)).toBe(false);
  });
  it('rompecabezas con orden barajado: correcto solo si reconstruye el orden', () => {
    // orden[pubIdx] = posición correcta. Si orden=[2,0,1], el alumno correcto elige
    // los índices públicos cuyo orden da 0,1,2 → pos0=pub1, pos1=pub2, pos2=pub0.
    const act = { tipo: 'rompecabezas_ideas', orden: [2, 0, 1] };
    expect(esAcierto(act, [1, 2, 0])).toBe(true);
    expect(esAcierto(act, [0, 1, 2])).toBe(false);
  });
  it('palabras perdidas: case-insensitive y por longitud', () => {
    const act = { tipo: 'palabras_perdidas', respuestas: ['Sol', 'Luna'] };
    expect(esAcierto(act, JSON.stringify(['sol', 'luna']))).toBe(true);
    expect(esAcierto(act, JSON.stringify(['sol']))).toBe(false);
  });
});

describe('calcularNota', () => {
  it('escala 1.0–5.0 con piso en 1.0', () => {
    expect(calcularNota(0, 10)).toBe(1.0);
    expect(calcularNota(10, 10)).toBe(5.0);
    expect(calcularNota(5, 10)).toBe(2.5);
  });
  it('total 0 devuelve 1.0', () => {
    expect(calcularNota(0, 0)).toBe(1.0);
  });
});

describe('contarAciertos / evaluarEstudiante', () => {
  const preguntas = [
    { tipo: 'seleccion_clasica', correcta: 0 },
    { tipo: 'seleccion_clasica', correcta: 1 },
  ];
  it('cuenta aciertos por índice de respuesta', () => {
    expect(contarAciertos(preguntas, { 0: 0, 1: 0 })).toBe(1);
  });
  it('evaluarEstudiante devuelve aciertos/total/nota', () => {
    const r = evaluarEstudiante({ respuestas_registradas: { 0: 0, 1: 1 } }, preguntas);
    expect(r).toEqual({ aciertos: 2, total: 2, nota: 5.0 });
  });
});
