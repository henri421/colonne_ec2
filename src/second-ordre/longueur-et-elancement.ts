/**
 * Longueur efficace, EN 1992-1-1 §5.8.3.2, et elancement limite, §5.8.3.1.
 *
 * Unites : mm ; coefficients sans dimension.
 */

import type { DonneesLongueur, Maintien, MomentsPremierOrdre, OrigineCoefficient } from '../domaines/resultat';
import type { ProfilEc2 } from '../norms/profil';
import { exigerPositif, exigerPositifOuNul, fr } from '../norms/profil';

/**
 * Souplesse relative retenue. Un encastrement parfait (k = 0) n'existe pas :
 * la norme recommande un minimum (0,1), applique AVEC un avertissement.
 */
function souplesse(m: Maintien, profil: ProfilEc2, nom: string, avert: string[]): number {
  const kmin = profil.k_min.valeur;
  if (m.mode === 'articule') return Infinity;
  if (m.mode === 'encastre') {
    avert.push(`${nom} : encastrement compte avec k = ${fr(kmin, 2)}, minimum recommande (§5.8.3.2(3)).`);
    return kmin;
  }
  exigerPositifOuNul(m.k, `La souplesse k (${nom})`, '-');
  if (m.k < kmin) {
    avert.push(`${nom} : k = ${m.k} porte au minimum recommande ${fr(kmin, 2)} (§5.8.3.2(3)).`);
    return kmin;
  }
  return m.k;
}

/** k / (a + k), avec la limite 1 pour k infini. */
function rapport(k: number, a: number): number {
  return k === Infinity ? 1 : k / (a + k);
}

/**
 * l_0 :
 *   contrevente     : 0,5 l sqrt[(1 + k1/(0,45 + k1)) (1 + k2/(0,45 + k2))]   (5.15)
 *   non contrevente : l max{ sqrt(1 + 10 k1 k2/(k1 + k2)) ; (1 + k1/(1 + k1)) (1 + k2/(1 + k2)) }   (5.16)
 * Une longueur saisie court-circuite le calcul, et le resultat le signale.
 */
export function longueurEfficace(
  d: DonneesLongueur,
  l: number,
  profil: ProfilEc2,
  avert: string[]
): { l0: number; origine: string } {
  exigerPositif(l, 'La longueur libre l', 'mm');
  if (d.mode === 'saisie') {
    return { l0: exigerPositif(d.l0, 'La longueur efficace l_0', 'mm'), origine: 'saisie par l utilisateur' };
  }
  const k1 = souplesse(d.tete, profil, 'tete', avert);
  const k2 = souplesse(d.pied, profil, 'pied', avert);
  if (d.contreventement === 'contrevente') {
    const l0 = 0.5 * l * Math.sqrt((1 + rapport(k1, 0.45)) * (1 + rapport(k2, 0.45)));
    return { l0, origine: `element contrevente, k1 = ${k1 === Infinity ? 'infini' : fr(k1, 2)}, k2 = ${k2 === Infinity ? 'infini' : fr(k2, 2)}, expression (5.15)` };
  }
  if (k1 === Infinity && k2 === Infinity) {
    throw new Error('Element non contrevente articule aux deux extremites : mecanisme, aucune longueur efficace.');
  }
  const produit = k1 === Infinity ? k2 : k2 === Infinity ? k1 : (k1 * k2) / (k1 + k2);
  const a = Math.sqrt(1 + 10 * produit);
  const b = (1 + rapport(k1, 1)) * (1 + rapport(k2, 1));
  return {
    l0: l * Math.max(a, b),
    origine: `element non contrevente, k1 = ${k1 === Infinity ? 'infini' : fr(k1, 2)}, k2 = ${k2 === Infinity ? 'infini' : fr(k2, 2)}, expression (5.16)`,
  };
}

export interface ElancementLimite {
  A: number;
  B: number;
  C: number;
  origines: Record<'A' | 'B' | 'C', OrigineCoefficient>;
  motifC: string;
  lambda_lim: number;
}

/**
 * lambda_lim = 20 A B C / sqrt(n), expression (5.13N).
 *   A = 1 / (1 + 0,2 phi_ef) ; B = sqrt(1 + 2 omega) ; C = 1,7 - r_m.
 *
 * C = 0,7 est IMPOSE — et non choisi — pour les moments dus a des charges
 * transversales et pour les elements non contreventes en general. r_m n'est
 * donc employe que pour des moments d'extremite d'un element contrevente :
 * un r_m = -1 donnant C = 2,7 hors de ce cadre serait dangereux.
 */
export function elancementLimite(
  phi_ef: number,
  omega: number,
  n: number,
  moments: MomentsPremierOrdre,
  contrevente: boolean
): ElancementLimite {
  const A = 1 / (1 + 0.2 * phi_ef);
  const B = Math.sqrt(1 + 2 * omega);
  let C: number;
  let origineC: OrigineCoefficient;
  let motifC: string;
  if (moments.origine === 'transversales') {
    C = 0.7;
    origineC = 'impose-par-la-norme';
    motifC = 'moments dus a des charges transversales : C = 0,7 impose, r_m non employable';
  } else if (!contrevente) {
    C = 0.7;
    origineC = 'impose-par-la-norme';
    motifC = 'element non contrevente : C = 0,7 impose, r_m non employable';
  } else {
    const { M01, M02 } = momentsOrdonnes(moments.M_tete, moments.M_pied);
    const rm = M02 === 0 ? 1 : M01 / M02;
    C = 1.7 - rm;
    origineC = 'calcule';
    motifC = `r_m = M_01 / M_02 = ${fr(rm, 3)}`;
  }
  return { A, B, C, origines: { A: 'calcule', B: 'calcule', C: origineC }, motifC, lambda_lim: (20 * A * B * C) / Math.sqrt(n) };
}

/**
 * Moments d'extremite ordonnes : |M_02| >= |M_01|, M_02 compte positif et
 * M_01 du meme signe en simple courbure, de signe oppose en double courbure.
 */
export function momentsOrdonnes(Mtete: number, Mpied: number): { M01: number; M02: number } {
  const [grand, petit] = Math.abs(Mtete) >= Math.abs(Mpied) ? [Mtete, Mpied] : [Mpied, Mtete];
  const signe = grand < 0 ? -1 : 1;
  return { M02: Math.abs(grand), M01: petit * signe };
}
