import { describe, expect, it } from 'vitest';
import {
  aireAcier,
  barres,
  beton,
  compressionMaximale,
  ec2Recommande,
  fyd,
  hauteurUtileCourbure,
  inertieAcier,
  momentResistant,
  rayonDeGiration,
} from '../../src/index';
import { SECTION_400 } from '../fixtures';

const P = ec2Recommande();
const B = beton(30, P);
const FYD = fyd(500, P);

describe('geometrie', () => {
  it('8 barres pour 3 barres par face, angles comptes une fois', () => {
    expect(barres(SECTION_400)).toHaveLength(8);
    expect(aireAcier(SECTION_400)).toBeCloseTo(2513.274, 3);
  });

  it('i = h / sqrt(12), I_s et d = h/2 + i_s', () => {
    expect(rayonDeGiration(SECTION_400, 'y')).toBeCloseTo(115.4701, 4);
    // 6 barres a 150 mm de l'axe, 2 sur l'axe
    expect(inertieAcier(SECTION_400, 'y')).toBeCloseTo(6 * Math.PI * 100 * 150 * 150, 3);
    expect(hauteurUtileCourbure(SECTION_400, 'y')).toBeCloseTo(329.9038, 3);
  });

  it('barres concentrees sur deux faces : d = h - d prime', () => {
    const s = { ...SECTION_400, nh: 2 };
    expect(hauteurUtileCourbure(s, 'y')).toBeCloseTo(350, 6);
  });

  it('section circulaire : n barres sur le cercle', () => {
    const s = { forme: 'circulaire', D: 500, enrobageAxe: 50, n: 8, phi: 16 } as const;
    expect(barres(s)).toHaveLength(8);
    expect(rayonDeGiration(s, 'y')).toBeCloseTo(125, 6);
  });

  it('refus : moins de 2 barres par face, enrobage trop grand', () => {
    expect(() => barres({ ...SECTION_400, nb: 1 })).toThrow('au moins 2');
    expect(() => barres({ ...SECTION_400, enrobageAxe: 250 })).toThrow('demi-dimension');
  });
});

describe('resistance de section (pivot B, parabole-rectangle)', () => {
  it('N_Rd,max = (A_c - A_s) f_cd + A_s x 400 MPa = 4 155,0 kN', () => {
    expect(compressionMaximale(SECTION_400, B, FYD)).toBeCloseTo(4155.044, 2);
  });

  it('M_Rd sous N = 1 500 kN : 269,90 kN.m (integration analytique independante)', () => {
    const r = momentResistant(SECTION_400, B, FYD, 'y', 1500);
    expect(r.M).toBeCloseTo(269.9, 0);
    expect(Math.abs(r.M - 269.9009) / 269.9009).toBeLessThan(0.002);
    expect(r.x).toBeCloseTo(222.95, -1);
  });

  it('M_Rd a N = 0, 500, 2 500 kN : 173,09 / 236,98 / 210,90 kN.m', () => {
    for (const [N, M] of [
      [0, 173.0878],
      [500, 236.9785],
      [2500, 210.8974],
    ]) {
      const r = momentResistant(SECTION_400, B, FYD, 'y', N);
      expect(Math.abs(r.M - M) / M).toBeLessThan(0.002);
    }
  });

  it('section carree symetrique : meme M_Rd autour de y et de z', () => {
    expect(momentResistant(SECTION_400, B, FYD, 'z', 1500).M).toBeCloseTo(momentResistant(SECTION_400, B, FYD, 'y', 1500).M, 6);
  });

  it('N_Ed au-dela de N_Rd,max : leve, jamais un M_Rd nul', () => {
    expect(() => momentResistant(SECTION_400, B, FYD, 'y', 5000)).toThrow('N_Rd,max');
  });
});
