import { describe, expect, it } from 'vitest';
import { ec2Recommande, exposantDevie, verifierColonne } from '../../src/index';
import { poteau } from '../fixtures';

const P = ec2Recommande();

describe('verifierColonne, poteau de reference, courbure nominale', () => {
  const r = verifierColonne(poteau(), P);

  it('elancement 34,64, n = 0,46875, omega = 0,3415', () => {
    expect(r.y.lambda).toBeCloseTo(34.641, 2);
    expect(r.y.n).toBeCloseTo(0.46875, 6);
    expect(r.y.omega).toBeCloseTo(0.341477, 5);
  });

  it('autour de y : lambda <= lambda_lim = 64,13, second ordre negligeable, M_Ed = M_02 + N e_i = 75 kN.m', () => {
    expect(r.y.lambda_lim).toBeCloseTo(64.132, 2);
    expect(r.y.negligeable).toBe(true);
    expect(r.y.M_Ed).toBeCloseTo(75, 6);
    expect(r.y.courbure).toBeNull();
  });

  it('autour de z : C = 0,7, lambda_lim = 20,41, M_2 = 45,73, M_Ed = 35 + 45,73 = 80,73 kN.m', () => {
    expect(r.z.lambda_lim).toBeCloseTo(20.406, 2);
    expect(r.z.negligeable).toBe(false);
    expect(r.z.M_0Ed).toBeCloseTo(35, 6);
    expect(r.z.courbure?.M_2).toBeCloseTo(45.726, 2);
    expect(r.z.M_Ed).toBeCloseTo(80.726, 2);
  });

  it('taux = M_Ed / M_Rd(N_Ed), M_Rd = 269,9 kN.m', () => {
    expect(r.z.M_Rd).toBeCloseTo(269.9, 0);
    expect(r.z.taux).toBeCloseTo(80.726 / 269.9, 2);
    expect(r.verdict).toBe('conforme');
  });

  it('fluage non negligeable (phi > 2) : phi_ef = 1,5 et le motif le dit', () => {
    expect(r.z.phi_ef).toBeCloseTo(1.5, 10);
    expect(r.z.motifFluage).toContain('> 2');
  });

  it('P-delta rendue en recoupement, convergente', () => {
    expect(r.z.pDelta?.converge).toBe(true);
    // recoupement de la rigidite nominale : amplification de l'ordre de 1,34
    expect(r.z.pDelta?.amplification).toBeGreaterThan(1.3);
    expect(r.z.pDelta?.amplification).toBeLessThan(1.4);
  });

  it('flexion deviee : excentricites relatives comparables -> interaction (5.39)', () => {
    // e_y / e_z = 75 / 80,7 : ni <= 0,2 ni >= 5
    expect(r.devie.dispense).toBe(false);
    expect(r.devie.a).not.toBeNull();
    expect(r.devie.taux).toBeLessThan(1);
  });
});

describe('verifierColonne, cas particuliers', () => {
  it('rigidite nominale : M_Ed,z = 35 x 1,3416 = 46,96 kN.m', () => {
    const r = verifierColonne(poteau({ methode: 'rigidite-nominale' }), P);
    expect(r.z.rigidite?.amplification).toBeCloseTo(1.3416, 3);
    expect(r.z.M_Ed).toBeCloseTo(46.956, 1);
  });

  it('les deux methodes donnent des moments du meme ordre, la courbure nominale etant plus severe ici', () => {
    const c = verifierColonne(poteau(), P).z.M_Ed;
    const k = verifierColonne(poteau({ methode: 'rigidite-nominale' }), P).z.M_Ed;
    expect(c).toBeGreaterThan(k);
    expect(c / k).toBeLessThan(2);
  });

  it('poteau tres elance en rigidite nominale : verdict instable', () => {
    const r = verifierColonne(
      poteau({
        methode: 'rigidite-nominale',
        z: { longueur: { mode: 'saisie', l0: 16000, contreventement: 'contrevente' }, moments: { origine: 'extremites', M_tete: 20, M_pied: 20 } },
      }),
      P
    );
    expect(r.verdict).toBe('instable');
    expect(r.z.instable).toBe(true);
    expect(Number.isFinite(r.z.M_Ed)).toBe(false);
  });

  it('excentricite minimale : petits moments -> M_Ed >= N e_0', () => {
    const r = verifierColonne(
      poteau({
        y: { longueur: { mode: 'saisie', l0: 2000, contreventement: 'contrevente' }, moments: { origine: 'extremites', M_tete: 0, M_pied: 0 } },
      }),
      P
    );
    expect(r.y.M_Ed).toBeGreaterThanOrEqual(30);
  });

  it('flexion deviee dispensee quand une excentricite domine', () => {
    const r = verifierColonne(
      poteau({
        y: { longueur: { mode: 'saisie', l0: 3000, contreventement: 'contrevente' }, moments: { origine: 'extremites', M_tete: 200, M_pied: 200 } },
        z: { longueur: { mode: 'saisie', l0: 3000, contreventement: 'contrevente' }, moments: { origine: 'extremites', M_tete: 0, M_pied: 0 } },
      }),
      P
    );
    expect(r.devie.dispense).toBe(true);
  });

  it('exposant a : 1 a 0,1, 1,5 a 0,7, 2 a 1, 2 pour une section circulaire', () => {
    expect(exposantDevie(0.05, false)).toBe(1);
    expect(exposantDevie(0.7, false)).toBeCloseTo(1.5, 10);
    expect(exposantDevie(0.4, false)).toBeCloseTo(1.25, 10);
    expect(exposantDevie(1, false)).toBeCloseTo(2, 10);
    expect(exposantDevie(0.3, true)).toBe(2);
  });

  it('N_Ed nul ou negatif : refuse', () => {
    expect(() => verifierColonne(poteau({ N_Ed: 0 }), P)).toThrow('N_Ed');
  });
});

describe('contreventement, moment equivalent et facteur c (corrections du 2026-10-03)', () => {
  const nonContrevente = { mode: 'saisie' as const, l0: 4000, contreventement: 'non-contrevente' as const };

  it('l_0 saisi, element non contrevente : C = 0,7 impose, meme avec r_m = -0,5', () => {
    const r = verifierColonne(poteau({ y: { longueur: nonContrevente, moments: { origine: 'extremites', M_tete: 60, M_pied: -30 } } }), P);
    expect(r.y.C).toBeCloseTo(0.7, 10);
    expect(r.y.origines.C).toBe('impose-par-la-norme');
    // 20 x 0,7692 x 1,2973 x 0,7 / sqrt(0,46875) = 20,41 < 34,64
    expect(r.y.lambda_lim).toBeCloseTo(20.406, 2);
    expect(r.y.negligeable).toBe(false);
  });

  it('non contrevente : M_0Ed = M_02 = 75 (et non M_0e = 39), M_Ed = 75 + 45,73 = 120,73 kN.m', () => {
    const r = verifierColonne(poteau({ y: { longueur: nonContrevente, moments: { origine: 'extremites', M_tete: 60, M_pied: -30 } } }), P);
    expect(r.y.M_0Ed).toBeCloseTo(75, 6);
    expect(r.y.courbure?.M_2).toBeCloseTo(45.726, 2);
    expect(r.y.M_Ed).toBeCloseTo(120.726, 2);
  });

  it('contrevente : M_0e conserve (35 kN.m autour de z)', () => {
    expect(verifierColonne(poteau(), P).z.M_0Ed).toBeCloseTo(35, 6);
  });

  it('charge transversale a moment constant : c = 8, M_2 = 45,73 x 10 / 8 = 57,16 kN.m', () => {
    const r = verifierColonne(
      poteau({ z: { longueur: { mode: 'saisie', l0: 4000, contreventement: 'contrevente' }, moments: { origine: 'transversales', M_0: 20, distribution: 'constante' } } }),
      P
    );
    expect(r.z.courbure?.M_2).toBeCloseTo(57.158, 2);
    expect(r.z.origineMEd).toContain('c = 8');
  });

  it('charge transversale parabolique : c = 10 conserve', () => {
    const r = verifierColonne(
      poteau({ z: { longueur: { mode: 'saisie', l0: 4000, contreventement: 'contrevente' }, moments: { origine: 'transversales', M_0: 20, distribution: 'parabolique' } } }),
      P
    );
    expect(r.z.courbure?.M_2).toBeCloseTo(45.726, 2);
  });
});
