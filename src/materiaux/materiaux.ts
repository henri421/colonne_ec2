/**
 * Lois de comportement et resistances, EN 1992-1-1 §3.1 et §3.2.
 *
 * Unites : MPa ; deformations sans dimension, compression positive.
 */

import type { ProfilEc2 } from '../norms/profil';
import { exigerPositif } from '../norms/profil';

/** Module de l'acier E_s, §3.2.7(4) (MPa). */
export const E_S = 200000;

export interface Beton {
  fck: number;
  fcd: number;
  fcm: number;
  /** Module secant E_cm, tableau 3.1 (MPa). */
  Ecm: number;
  epsC2: number;
  epsCu2: number;
  n: number;
}

/**
 * Beton : f_cd = alpha_cc f_ck / gamma_C ; E_cm = 22 000 (f_cm / 10)^0,3 ;
 * parametres de la loi parabole-rectangle, tableau 3.1 (y compris au-dela
 * de C50/60).
 */
export function beton(fck: number, profil: ProfilEc2): Beton {
  exigerPositif(fck, 'La resistance caracteristique du beton f_ck', 'MPa');
  if (fck > 90) throw new Error('f_ck > 90 MPa : hors du domaine du tableau 3.1.');
  const fcm = fck + 8;
  const haut = fck > 50;
  return {
    fck,
    fcd: (profil.alpha_cc.valeur * fck) / profil.gamma_C.valeur,
    fcm,
    Ecm: 22000 * (fcm / 10) ** 0.3,
    epsC2: haut ? (2.0 + 0.085 * (fck - 50) ** 0.53) / 1000 : 0.002,
    epsCu2: haut ? (2.6 + 35 * ((90 - fck) / 100) ** 4) / 1000 : 0.0035,
    n: haut ? 1.4 + 23.4 * ((90 - fck) / 100) ** 4 : 2,
  };
}

/** Contrainte du beton, loi parabole-rectangle, expressions (3.17) et (3.18) ; nulle en traction (MPa). */
export function contrainteBeton(b: Beton, eps: number): number {
  if (eps <= 0) return 0;
  if (eps >= b.epsC2) return b.fcd;
  return b.fcd * (1 - (1 - eps / b.epsC2) ** b.n);
}

/** f_yd = f_yk / gamma_S (MPa). */
export function fyd(fyk: number, profil: ProfilEc2): number {
  exigerPositif(fyk, 'La limite d elasticite f_yk', 'MPa');
  return fyk / profil.gamma_S.valeur;
}

/**
 * Contrainte de l'acier, diagramme bilineaire a palier horizontal, §3.2.7(2)b :
 * deformation non bornee. Signe de la deformation (MPa).
 */
export function contrainteAcier(f_yd: number, eps: number): number {
  return Math.max(-f_yd, Math.min(f_yd, E_S * eps));
}
