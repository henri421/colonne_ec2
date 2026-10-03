/**
 * Imperfections geometriques, EN 1992-1-1 §5.2, excentricite minimale,
 * §6.1(4), et fluage effectif, §5.8.4.
 *
 * Unites : longueurs en mm ; la longueur l de alpha_h est convertie en m par
 * une constante nommee.
 */

import type { ProfilEc2 } from '../norms/profil';
import { exigerPositif, exigerPositifOuNul, fr } from '../norms/profil';

/** La formule de alpha_h est ecrite en metres, la convention du depot est le millimetre. */
export const MM_PAR_M = 1000;

export interface Imperfection {
  alpha_h: number;
  alpha_m: number;
  theta_i: number;
  /** Excentricite e_i = theta_i l_0 / 2 (mm), element isole §5.2(7). */
  e_i: number;
}

/**
 * theta_i = theta_0 alpha_h alpha_m, expression (5.1) :
 *   alpha_h = 2 / sqrt(l), l en METRES, 2/3 <= alpha_h <= 1 ;
 *   alpha_m = sqrt(0,5 (1 + 1/m)).
 * Element isole : e_i = theta_i l_0 / 2, l etant la longueur reelle.
 */
export function imperfection(l: number, l0: number, m: number, profil: ProfilEc2): Imperfection {
  exigerPositif(l, 'La longueur l', 'mm');
  exigerPositif(l0, 'La longueur efficace l_0', 'mm');
  if (!Number.isFinite(m) || m < 1) throw new Error('Le nombre d elements m doit etre au moins 1 (-).');
  const alpha_h = Math.min(1, Math.max(2 / 3, 2 / Math.sqrt(l / MM_PAR_M)));
  const alpha_m = Math.sqrt(0.5 * (1 + 1 / m));
  const theta_i = profil.theta_0.valeur * alpha_h * alpha_m;
  return { alpha_h, alpha_m, theta_i, e_i: (theta_i * l0) / 2 };
}

/** Excentricite minimale e_0 = max(h/30 ; 20 mm), §6.1(4) (mm). */
export function excentriciteMinimale(h: number): number {
  return Math.max(h / 30, 20);
}

/**
 * phi_ef = phi(inf, t0) M_0Eqp / M_0Ed, expression (5.19).
 * Le fluage peut etre neglige (phi_ef = 0) si les TROIS conditions du
 * §5.8.4(4) sont remplies : phi(inf, t0) <= 2, lambda <= 75, M_0Ed / N_Ed >= h.
 * Le motif dit laquelle manque.
 */
export function fluageEffectif(
  phi_inf: number,
  rapport: number,
  lambda: number,
  M0Ed: number,
  NEd: number,
  h: number
): { phi_ef: number; motif: string } {
  exigerPositifOuNul(phi_inf, 'Le coefficient de fluage phi(inf, t0)', '-');
  exigerPositifOuNul(rapport, 'Le rapport M_0Eqp / M_0Ed', '-');
  if (rapport > 1) throw new Error('Le rapport M_0Eqp / M_0Ed ne peut pas depasser 1 (-).');
  const excentricite = (M0Ed / NEd) * MM_PAR_M;
  const manques: string[] = [];
  if (phi_inf > 2) manques.push(`phi(inf, t0) = ${fr(phi_inf, 2)} > 2`);
  if (lambda > 75) manques.push(`lambda = ${fr(lambda, 1)} > 75`);
  if (excentricite < h) manques.push(`M_0Ed / N_Ed = ${fr(excentricite, 0)} mm < h = ${fr(h, 0)} mm`);
  if (manques.length === 0) {
    return { phi_ef: 0, motif: 'fluage neglige : les trois conditions du §5.8.4(4) sont remplies' };
  }
  return {
    phi_ef: phi_inf * rapport,
    motif: `phi_ef = ${fr(phi_inf, 2)} x ${fr(rapport, 2)} ; fluage non negligeable (${manques.join(' ; ')})`,
  };
}
