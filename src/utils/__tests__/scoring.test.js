import { describe, it, expect } from 'vitest';
import { factorVelocidad, puntosPregunta, calcularJuego, calcularPuestos, BASE } from '../scoring.js';

describe('factorVelocidad', () => {
  it('está acotado en [0.5, 1]', () => {
    expect(factorVelocidad(0, 30)).toBe(1);
    expect(factorVelocidad(30000, 30)).toBe(0.5);
    expect(factorVelocidad(999999, 30)).toBe(0.5);
  });
  it('sin dato de tiempo no penaliza', () => {
    expect(factorVelocidad(undefined, 30)).toBe(1);
    expect(factorVelocidad(-5, 30)).toBe(1);
  });
});

describe('puntosPregunta', () => {
  it('fallar da 0', () => {
    expect(puntosPregunta(false, 0, 30, 5)).toBe(0);
  });
  it('acierto instantáneo sin racha da BASE', () => {
    expect(puntosPregunta(true, 0, 30, 0)).toBe(BASE);
  });
  it('bonus de racha topado en 500', () => {
    // racha alta → bonus máximo 500.
    expect(puntosPregunta(true, 0, 30, 100)).toBe(BASE + 500);
  });
});

describe('calcularJuego', () => {
  const preguntas = [
    { tipo: 'seleccion_clasica', correcta: 0 },
    { tipo: 'seleccion_clasica', correcta: 0 },
    { tipo: 'seleccion_clasica', correcta: 0 },
  ];
  it('acumula puntos y racha hasta hastaIdx', () => {
    const est = { respuestas_registradas: { 0: 0, 1: 0, 2: 1 }, tiempos_respuesta: { 0: 0, 1: 0 } };
    const { puntos, racha } = calcularJuego(est, preguntas, 30, 2);
    expect(racha).toBe(0);          // la 3ª falló
    expect(puntos).toBeGreaterThan(0);
  });
  it('es idempotente (mismo resultado al recalcular)', () => {
    const est = { respuestas_registradas: { 0: 0, 1: 0 }, tiempos_respuesta: { 0: 0, 1: 0 } };
    const a = calcularJuego(est, preguntas, 30, 1);
    const b = calcularJuego(est, preguntas, 30, 1);
    expect(a).toEqual(b);
  });
});

describe('calcularPuestos', () => {
  it('ordena por puntos y desempata por nota', () => {
    const estudiantes = {
      a: { puntos_juego: 100, nota_acumulada: 3 },
      b: { puntos_juego: 200, nota_acumulada: 1 },
      c: { puntos_juego: 100, nota_acumulada: 5 },
    };
    const p = calcularPuestos(estudiantes);
    expect(p.b).toBe(1);  // más puntos
    expect(p.c).toBe(2);  // empate 100 pts, mejor nota
    expect(p.a).toBe(3);
  });
});
