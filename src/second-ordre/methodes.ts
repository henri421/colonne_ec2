/**
 * Methodes simplifiees du second ordre, EN 1992-1-1 §5.8.7 (rigidite
 * nominale) et §5.8.8 (courbure nominale), et analyse P-delta iterative.
 *
 * Unites : longueurs en mm, efforts en kN, moments en kN.m, contraintes en
 * MPa ; EI en N.mm2 dans les calculs, rendu en kN.m2.
 */

import { E_S } from '../materiaux/materiaux';
import { exigerPositif } from '../norms/profil';
import type { PDelta } from '../domaines/resultat';

const N_PAR_KN = 1000;
const NMM_PAR_KNM = 1e6;
/** N.mm2 par kN.m2. */
export const NMM2_PAR_KNM2 = 1e9;

/** Equilibre normal balance n_bal, §5.8.8.3(3). */
const N_BAL = 0.4;

export interface Courbure {
  K_r: number;
  K_phi: number;
  inv_r: number;
  e_2: number;
  M_2: number;
}

/**
 * Courbure nominale :
 *   1/r_0 = eps_yd / (0,45 d) ; K_r = (n_u - n)/(n_u - n_bal) <= 1, n_u = 1 + omega ;
 *   K_phi = 1 + beta phi_ef >= 1, beta = 0,35 + f_ck/200 - lambda/150 ;
 *   e_2 = (1/r) l_0^2 / c ; M_2 = N_Ed e_2.
 * Ferraillage donne : K_r se calcule directement, sans iteration (l'iteration
 * n'est necessaire qu'en dimensionnement).
 */
export function courbureNominale(p: {
  fyd: number;
  d: number;
  n: number;
  omega: number;
  fck: number;
  lambda: number;
  phi_ef: number;
  l0: number;
  c: number;
  NEd: number;
}): Courbure {
  const eps_yd = p.fyd / E_S;
  const inv_r0 = eps_yd / (0.45 * p.d);
  const nu = 1 + p.omega;
  const K_r = Math.max(0, Math.min(1, (nu - p.n) / (nu - N_BAL)));
  const beta = 0.35 + p.fck / 200 - p.lambda / 150;
  const K_phi = Math.max(1, 1 + beta * p.phi_ef);
  const inv_r = K_r * K_phi * inv_r0;
  const e_2 = (inv_r * p.l0 * p.l0) / p.c;
  return { K_r, K_phi, inv_r, e_2, M_2: (p.NEd * e_2) / 1000 };
}

/** c_0 de l'expression (5.29), selon la distribution du moment du premier ordre. */
export function coefficientC0(distribution: 'constante' | 'parabolique' | 'triangulaire'): number {
  return distribution === 'constante' ? 8 : distribution === 'parabolique' ? 9.6 : 12;
}

export interface Rigidite {
  /** EI (kN.m2). */
  EI: number;
  /** Charge critique N_B (kN). */
  N_B: number;
  beta: number;
  /** Facteur 1 + beta / (N_B / N_Ed - 1) ; Infinity si instable. */
  amplification: number;
  instable: boolean;
  K_c: number;
}

/**
 * Rigidite nominale, §5.8.7.2 avec rho >= 0,002 :
 *   EI = K_c E_cd I_c + K_s E_s I_s, K_s = 1, K_c = k1 k2 / (1 + phi_ef),
 *   k1 = sqrt(f_ck / 20), k2 = n lambda / 170 <= 0,20, E_cd = E_cm / gamma_cE ;
 *   N_B = pi^2 EI / l_0^2 ; M_Ed = M_0Ed [1 + beta / (N_B / N_Ed - 1)], beta = pi^2 / c_0.
 * GARDE-FOU : N_Ed >= N_B rend « instable », jamais un nombre aberrant ni
 * un Infinity qui traverserait l'interface.
 */
export function rigiditeNominale(p: {
  fck: number;
  Ecm: number;
  gamma_cE: number;
  Ic: number;
  Is: number;
  rho: number;
  n: number;
  lambda: number;
  phi_ef: number;
  l0: number;
  c0: number;
  NEd: number;
}): Rigidite {
  if (p.rho < 0.002) {
    throw new Error(`rho = ${(p.rho * 100).toFixed(2)} % < 0,2 % : la rigidite nominale du §5.8.7.2(2) ne s applique pas.`);
  }
  const k1 = Math.sqrt(p.fck / 20);
  const k2 = Math.min(0.2, (p.n * p.lambda) / 170);
  const K_c = (k1 * k2) / (1 + p.phi_ef);
  const Ecd = p.Ecm / p.gamma_cE;
  const EI = K_c * Ecd * p.Ic + E_S * p.Is;
  const N_B = (Math.PI ** 2 * EI) / (p.l0 * p.l0) / N_PAR_KN;
  const beta = Math.PI ** 2 / p.c0;
  const instable = p.NEd >= N_B;
  return {
    EI: EI / NMM2_PAR_KNM2,
    N_B,
    beta,
    amplification: instable ? Infinity : 1 + beta / (N_B / p.NEd - 1),
    instable,
    K_c,
  };
}

/** Forme du moment du premier ordre le long de la barre, valeur 1 au maximum. */
export type FormeMoment = 'constante' | 'parabolique' | 'triangulaire';

function formeEn(forme: FormeMoment, t: number): number {
  if (forme === 'constante') return 1;
  if (forme === 'parabolique') return 4 * t * (1 - t);
  return 1 - Math.abs(2 * t - 1);
}

/**
 * Analyse P-delta iterative de la barre biarticulee equivalente de longueur
 * l_0, de rigidite EI constante :
 *   M(x) = M_0(x) + N_Ed y(x) ; y'' = -M / EI ; y(0) = y(l_0) = 0,
 * jusqu'a stabilisation de la fleche. Pas de formule d'amplification : la
 * fleche est recalculee, ce qui recoupe numeriquement les methodes
 * simplifiees. Si la fleche ne se stabilise pas, le poteau est instable sous
 * cette rigidite, et le resultat le dit.
 */
export function pDelta(M0: number, forme: FormeMoment, NEd: number, EI_kNm2: number, l0: number): PDelta {
  exigerPositif(EI_kNm2, 'La rigidite EI', 'kN.m2');
  const N = 80;
  const L = l0 / 1000; // m
  const h = L / N;
  const M0x = Array.from({ length: N + 1 }, (_, i) => M0 * formeEn(forme, i / N));
  let y = new Array<number>(N + 1).fill(0);
  let Mmax = Math.max(...M0x.map(Math.abs));
  const ITER_MAX = 200;
  for (let it = 1; it <= ITER_MAX; it++) {
    const M = M0x.map((m, i) => m + NEd * y[i]); // kN.m
    const kappa = M.map((m) => m / EI_kNm2); // 1/m
    // Double integration de y'' = -kappa, puis correction lineaire pour y(L) = 0.
    const pente = new Array<number>(N + 1).fill(0);
    const brut = new Array<number>(N + 1).fill(0);
    for (let i = 1; i <= N; i++) {
      pente[i] = pente[i - 1] - ((kappa[i - 1] + kappa[i]) / 2) * h;
      brut[i] = brut[i - 1] + ((pente[i - 1] + pente[i]) / 2) * h;
    }
    const nouveau = brut.map((v, i) => v - (brut[N] * i) / N);
    const ecart = Math.max(...nouveau.map((v, i) => Math.abs(v - y[i])));
    const fleche = Math.max(...nouveau.map(Math.abs));
    y = nouveau;
    Mmax = Math.max(...M0x.map((m, i) => Math.abs(m + NEd * y[i])));
    if (!Number.isFinite(fleche) || fleche > 10 * L) {
      return { converge: false, iterations: it, M_max: Infinity, amplification: Infinity, motif: 'fleche divergente : instable sous la rigidite nominale' };
    }
    if (ecart <= 1e-9 * Math.max(1, fleche) || ecart < 1e-12) {
      return {
        converge: true,
        iterations: it,
        M_max: Mmax,
        amplification: M0 === 0 ? 1 : Mmax / Math.abs(M0),
        motif: `stabilisee en ${it} iterations, fleche ${(fleche * 1000).toFixed(1).replace('.', ',')} mm`,
      };
    }
  }
  return { converge: false, iterations: ITER_MAX, M_max: Mmax, amplification: M0 === 0 ? 1 : Mmax / Math.abs(M0), motif: `non stabilisee apres ${ITER_MAX} iterations` };
}

export { NMM_PAR_KNM };
