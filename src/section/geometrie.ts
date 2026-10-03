/**
 * Geometrie de la section du poteau : rectangulaire ou circulaire, barres
 * longitudinales identiques.
 *
 * Unites : mm, mm2, mm4.
 *
 * Repere : origine au centre de gravite du beton ; y le long de b, z le long
 * de h. La flexion autour de y (moment M_y) sollicite la dimension h ; la
 * flexion autour de z (moment M_z) sollicite la dimension b.
 */

import { exigerPositif } from '../norms/profil';

export type Axe = 'y' | 'z';

export type Section =
  | {
      forme: 'rectangulaire';
      /** Largeur, le long de y (mm). */
      b: number;
      /** Hauteur, le long de z (mm). */
      h: number;
      /** Distance du parement a l'axe des barres d' (mm). */
      enrobageAxe: number;
      /** Barres par face parallele a b (faces z = +-h/2), angles compris. */
      nb: number;
      /** Barres par face parallele a h (faces y = +-b/2), angles compris. */
      nh: number;
      /** Diametre des barres (mm). */
      phi: number;
    }
  | {
      forme: 'circulaire';
      /** Diametre (mm). */
      D: number;
      enrobageAxe: number;
      /** Nombre de barres reparties sur le cercle. */
      n: number;
      phi: number;
    };

export interface Barre {
  y: number;
  z: number;
  A: number;
}

/** Barres de la section, coordonnees de leur centre (mm). */
export function barres(s: Section): Barre[] {
  exigerPositif(s.phi, 'Le diametre des barres phi', 'mm');
  exigerPositif(s.enrobageAxe, 'La distance a l axe des barres d prime', 'mm');
  const A = (Math.PI * s.phi * s.phi) / 4;
  if (s.forme === 'circulaire') {
    exigerPositif(s.D, 'Le diametre D', 'mm');
    if (!Number.isInteger(s.n) || s.n < 4) throw new Error('Une section circulaire porte au moins 4 barres (-).');
    const r = s.D / 2 - s.enrobageAxe;
    if (r <= 0) throw new Error('La distance a l axe des barres depasse le rayon (mm).');
    return Array.from({ length: s.n }, (_, i) => {
      const t = (2 * Math.PI * i) / s.n;
      return { y: r * Math.cos(t), z: r * Math.sin(t), A };
    });
  }
  exigerPositif(s.b, 'La largeur b', 'mm');
  exigerPositif(s.h, 'La hauteur h', 'mm');
  if (!Number.isInteger(s.nb) || !Number.isInteger(s.nh) || s.nb < 2 || s.nh < 2) {
    throw new Error('Il faut au moins 2 barres par face (angles compris) (-).');
  }
  const ys = s.b / 2 - s.enrobageAxe;
  const zs = s.h / 2 - s.enrobageAxe;
  if (ys <= 0 || zs <= 0) throw new Error('La distance a l axe des barres depasse la demi-dimension (mm).');
  const res: Barre[] = [];
  // Faces z = +-zs : nb barres, angles compris.
  for (let i = 0; i < s.nb; i++) {
    const y = -ys + (2 * ys * i) / (s.nb - 1);
    res.push({ y, z: zs, A }, { y, z: -zs, A });
  }
  // Faces y = +-ys : nh - 2 barres intermediaires.
  for (let j = 1; j < s.nh - 1; j++) {
    const z = -zs + (2 * zs * j) / (s.nh - 1);
    res.push({ y: ys, z, A }, { y: -ys, z, A });
  }
  return res;
}

/** Aire de beton brute A_c (mm2). */
export function aireBeton(s: Section): number {
  return s.forme === 'circulaire' ? (Math.PI * s.D * s.D) / 4 : s.b * s.h;
}

/** Dimension de la section dans la direction de flexion (mm) : h pour M_y, b pour M_z. */
export function hauteurFlexion(s: Section, axe: Axe): number {
  if (s.forme === 'circulaire') return s.D;
  return axe === 'y' ? s.h : s.b;
}

/** Moment d'inertie brut du beton I_c autour de l'axe (mm4). */
export function inertieBeton(s: Section, axe: Axe): number {
  if (s.forme === 'circulaire') return (Math.PI * s.D ** 4) / 64;
  return axe === 'y' ? (s.b * s.h ** 3) / 12 : (s.h * s.b ** 3) / 12;
}

/** Coordonnee d'une barre dans la direction de flexion (mm). */
export function coordonnee(b: Barre, axe: Axe): number {
  return axe === 'y' ? b.z : b.y;
}

/** Moment d'inertie des armatures I_s autour de l'axe (mm4). */
export function inertieAcier(s: Section, axe: Axe): number {
  return barres(s).reduce((t, b) => t + b.A * coordonnee(b, axe) ** 2, 0);
}

/** Aire totale des armatures A_s (mm2). */
export function aireAcier(s: Section): number {
  return barres(s).reduce((t, b) => t + b.A, 0);
}

/** Rayon de giration du beton brut i = sqrt(I_c / A_c) (mm). */
export function rayonDeGiration(s: Section, axe: Axe): number {
  return Math.sqrt(inertieBeton(s, axe) / aireBeton(s));
}

/**
 * Hauteur utile pour la courbure nominale, §5.8.8.3(2) : d = h/2 + i_s, i_s
 * etant le rayon de giration de l'ensemble des armatures. Pour des barres
 * concentrees sur deux faces opposees, d = h - d'.
 */
export function hauteurUtileCourbure(s: Section, axe: Axe): number {
  const is = Math.sqrt(inertieAcier(s, axe) / aireAcier(s));
  return hauteurFlexion(s, axe) / 2 + is;
}

/** Largeur de la section a la cote u de la direction de flexion (mm), u depuis le centre. */
export function largeurA(s: Section, axe: Axe, u: number): number {
  if (s.forme === 'circulaire') {
    const r = s.D / 2;
    return Math.abs(u) >= r ? 0 : 2 * Math.sqrt(r * r - u * u);
  }
  return axe === 'y' ? s.b : s.h;
}
