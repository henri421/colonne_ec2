import { describe, expect, it } from 'vitest';
import {
  coefficientC0,
  courbureNominale,
  ec2Recommande,
  elancementLimite,
  excentriciteMinimale,
  fluageEffectif,
  imperfection,
  longueurEfficace,
  momentsOrdonnes,
  pDelta,
  rigiditeNominale,
} from '../../src/index';

const P = ec2Recommande();

describe('longueur efficace, §5.8.3.2', () => {
  it('contrevente : biarticule l_0 = l, bi-encastre (k = 0,1) l_0 = 0,59 l', () => {
    const av: string[] = [];
    expect(longueurEfficace({ mode: 'calculee', contreventement: 'contrevente', tete: { mode: 'articule' }, pied: { mode: 'articule' } }, 4000, P, av).l0).toBeCloseTo(4000, 6);
    // 0,5 x (1 + 0,1/0,55) = 0,5909
    const r = longueurEfficace({ mode: 'calculee', contreventement: 'contrevente', tete: { mode: 'encastre' }, pied: { mode: 'encastre' } }, 4000, P, av);
    expect(r.l0).toBeCloseTo(2363.64, 1);
    expect(av.join(' ')).toContain('k = 0,10');
  });

  it('non contrevente : console (pied k = 0,1, tete articulee) l_0 = 2,2 l', () => {
    // max(sqrt(1 + 10 x 0,1) ; (1 + 0,1/1,1) x 2) = max(1,414 ; 2,1818) = 2,1818
    const r = longueurEfficace({ mode: 'calculee', contreventement: 'non-contrevente', tete: { mode: 'articule' }, pied: { mode: 'encastre' } }, 3000, P, []);
    expect(r.l0).toBeCloseTo(6545.45, 1);
  });

  it('non contrevente articule aux deux bouts : mecanisme, leve', () => {
    expect(() => longueurEfficace({ mode: 'calculee', contreventement: 'non-contrevente', tete: { mode: 'articule' }, pied: { mode: 'articule' } }, 3000, P, [])).toThrow('mecanisme');
  });

  it('souplesse sous le minimum : portee a 0,1 avec avertissement', () => {
    const av: string[] = [];
    longueurEfficace({ mode: 'calculee', contreventement: 'contrevente', tete: { mode: 'souple', k: 0.02 }, pied: { mode: 'articule' } }, 4000, P, av);
    expect(av).toHaveLength(1);
  });
});

describe('elancement limite, §5.8.3.1', () => {
  it('extremites, contrevente : C = 1,7 - r_m = 2,2 ; lambda_lim = 64,13', () => {
    const r = elancementLimite(1.5, 0.341477, 0.46875, { origine: 'extremites', M_tete: 60, M_pied: -30 }, true);
    expect(r.C).toBeCloseTo(2.2, 10);
    expect(r.origines.C).toBe('calcule');
    expect(r.lambda_lim).toBeCloseTo(64.132, 2);
  });

  it('charges transversales : C = 0,7 IMPOSE, r_m refuse', () => {
    const r = elancementLimite(1.5, 0.341477, 0.46875, { origine: 'transversales', M_0: 50, distribution: 'parabolique' }, true);
    expect(r.C).toBe(0.7);
    expect(r.origines.C).toBe('impose-par-la-norme');
    expect(r.motifC).toContain('r_m non employable');
  });

  it('non contrevente : C = 0,7 impose meme avec des moments d extremite de signes opposes', () => {
    const r = elancementLimite(0, 0.3, 0.5, { origine: 'extremites', M_tete: 50, M_pied: -50 }, false);
    expect(r.C).toBe(0.7);
  });

  it('moments ordonnes : |M_02| >= |M_01|, signe relatif conserve', () => {
    expect(momentsOrdonnes(60, -30)).toEqual({ M02: 60, M01: -30 });
    expect(momentsOrdonnes(-30, -60)).toEqual({ M02: 60, M01: 30 });
  });
});

describe('imperfections, fluage, excentricite minimale', () => {
  it('l = 4 m : alpha_h = 1, theta_i = 1/200, e_i = l_0 / 400 = 10 mm', () => {
    const r = imperfection(4000, 4000, 1, P);
    expect(r.alpha_h).toBe(1);
    expect(r.e_i).toBeCloseTo(10, 10);
  });

  it('alpha_h avec l en METRES : l = 9 m -> 2/3', () => {
    expect(imperfection(9000, 9000, 1, P).alpha_h).toBeCloseTo(2 / 3, 10);
    // l = 6,25 m -> 2 / 2,5 = 0,8
    expect(imperfection(6250, 6250, 1, P).alpha_h).toBeCloseTo(0.8, 10);
  });

  it('e_0 = max(h/30 ; 20 mm) : 20 mm gouverne pour h = 400, h/30 pour h = 900', () => {
    expect(excentriciteMinimale(400)).toBe(20);
    expect(excentriciteMinimale(900)).toBe(30);
  });

  it('fluage : neglige si les trois conditions sont remplies, sinon dit laquelle manque', () => {
    expect(fluageEffectif(2, 0.6, 50, 300, 500, 400).phi_ef).toBe(0);
    const r = fluageEffectif(2.5, 0.6, 50, 300, 500, 400);
    expect(r.phi_ef).toBeCloseTo(1.5, 10);
    expect(r.motif).toContain('> 2');
  });
});

describe('methodes', () => {
  it('courbure nominale, direction z du poteau de reference : M_2 = 45,73 kN.m', () => {
    const c = courbureNominale({ fyd: 434.7826, d: 329.9038, n: 0.46875, omega: 0.341477, fck: 30, lambda: 34.641, phi_ef: 1.5, l0: 4000, c: 10, NEd: 1500 });
    expect(c.K_r).toBeCloseTo(0.926976, 5);
    expect(c.K_phi).toBeCloseTo(1.40359, 4);
    expect(c.e_2).toBeCloseTo(30.484, 2);
    expect(c.M_2).toBeCloseTo(45.726, 2);
  });

  it('rigidite nominale : EI = 11 213,9 kN.m2, N_B = 6 917,3 kN, amplification 1,3416', () => {
    const r = rigiditeNominale({ fck: 30, Ecm: 32836.568, gamma_cE: 1.2, Ic: 400 ** 4 / 12, Is: 6 * Math.PI * 100 * 150 * 150, rho: 0.0157, n: 0.46875, lambda: 34.641, phi_ef: 1.5, l0: 4000, c0: 8, NEd: 1500 });
    expect(r.EI).toBeCloseTo(11213.94, 0);
    expect(r.N_B).toBeCloseTo(6917.32, 0);
    expect(r.amplification).toBeCloseTo(1.3416, 3);
  });

  it('N_Ed >= N_B : instable, jamais un nombre aberrant', () => {
    const r = rigiditeNominale({ fck: 30, Ecm: 32836.568, gamma_cE: 1.2, Ic: 400 ** 4 / 12, Is: 6 * Math.PI * 100 * 150 * 150, rho: 0.0157, n: 0.46875, lambda: 34.641, phi_ef: 1.5, l0: 4000, c0: 8, NEd: 8000 });
    expect(r.instable).toBe(true);
  });

  it('rho < 0,2 % : la rigidite nominale refuse', () => {
    expect(() => rigiditeNominale({ fck: 30, Ecm: 33000, gamma_cE: 1.2, Ic: 1e9, Is: 1e6, rho: 0.001, n: 0.4, lambda: 40, phi_ef: 0, l0: 4000, c0: 8, NEd: 500 })).toThrow('0,2 %');
  });

  it('c_0 : 8, 9,6, 12', () => {
    expect([coefficientC0('constante'), coefficientC0('parabolique'), coefficientC0('triangulaire')]).toEqual([8, 9.6, 12]);
  });

  it('P-delta : moment constant, N = N_cr / 4 -> amplification exacte sec(pi/4) = 1,4142... proche de 1 + (pi^2/8)/(4 - 1) = 1,411', () => {
    // EI = 1000 kN.m2, l0 = 4 m : N_cr = pi^2 x 1000 / 16 = 616,85 kN
    const Ncr = (Math.PI ** 2 * 1000) / 16;
    const r = pDelta(10, 'constante', Ncr / 4, 1000, 4000);
    expect(r.converge).toBe(true);
    // solution exacte : M_max = M0 / cos(pi/2 sqrt(N/Ncr)) = M0 / cos(pi/4)
    expect(r.amplification).toBeCloseTo(1 / Math.cos(Math.PI / 4), 2);
  });

  it('P-delta au-dela de la charge critique : non convergent, signale', () => {
    const Ncr = (Math.PI ** 2 * 1000) / 16;
    const r = pDelta(10, 'constante', Ncr * 1.1, 1000, 4000);
    expect(r.converge).toBe(false);
  });
});
