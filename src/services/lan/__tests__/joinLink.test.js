import { describe, it, expect } from 'vitest';
import {
  buildJoinUrl, buildShortCode, parseJoinFromSearch, parseShortCode, buildWsUrl,
} from '../joinLink.js';

describe('joinLink (round-trip enlace ↔ parseo)', () => {
  it('buildJoinUrl + parseJoinFromSearch conserva host/puerto/pin/token', () => {
    const url = buildJoinUrl('192.168.1.7', 8080, '123456', { token: 'abc123' });
    const search = new URL(url).search;
    expect(parseJoinFromSearch(search)).toEqual({
      host: '192.168.1.7', port: 8080, pin: '123456', token: 'abc123',
    });
  });

  it('sin token el parseo devuelve token null', () => {
    const url = buildJoinUrl('10.0.0.5', 8080, '99999');
    const r = parseJoinFromSearch(new URL(url).search);
    expect(r.token).toBeNull();
  });

  it('parseJoinFromSearch devuelve null si no hay parámetro lan', () => {
    expect(parseJoinFromSearch('?foo=bar')).toBeNull();
  });

  it('código corto round-trip', () => {
    const code = buildShortCode('192.168.1.7', 8080, '123456');
    expect(parseShortCode(code)).toEqual({ host: '192.168.1.7', port: 8080, pin: '123456' });
  });

  it('buildWsUrl construye ws:// por defecto', () => {
    expect(buildWsUrl('192.168.1.7', 8080)).toBe('ws://192.168.1.7:8080');
  });
});
