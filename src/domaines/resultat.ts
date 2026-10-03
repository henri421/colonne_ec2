/**
 * Donnees et resultats du poteau, EN 1992-1-1 §5.2, §5.8 et §6.1.
 *
 * Unites : longueurs en mm, efforts en kN (compression positive), moments
 * en kN.m, contraintes en MPa, rigidites en kN.m2.
 */

import type { Axe, Section } from '../section/geometrie';

/** Condition d'extremite pour la longueur efficace, §5.8.3.2(3). */
export type Maintien =
  | { mode: 'encastre' }
  | { mode: 'articule' }
  | {
      mode: 'souple';
      /** Souplesse relative k = (theta / M) (EI / l), 0 rigide, infini articule (-). */
      k: number;
    };

export type DonneesLongueur =
  | { mode: 'saisie'; l0: number }
  | {
      mode: 'calculee';
      contreventement: 'contrevente' | 'non-contrevente';
      tete: Maintien;
      pied: Maintien;
    };

/**
 * Moments du premier ordre. L'ORIGINE est exigee : elle decide si r_m peut
 * etre employe (§5.8.3.1(1)). Des charges transversales imposent C = 0,7.
 */
export type MomentsPremierOrdre =
  | {
      origine: 'extremites';
      /** Moments d'extremite (kN.m) ; de meme signe s'ils tendent la meme face (simple courbure). */
      M_tete: number;
      M_pied: number;
    }
  | {
      origine: 'transversales';
      /** Moment maximal du premier ordre le long du poteau (kN.m). */
      M_0: number;
      /** Distribution, qui fixe c_0 de la rigidite nominale (§5.8.7.3(2)). */
      distribution: 'constante' | 'parabolique' | 'triangulaire';
    };

export interface DonneesDirection {
  longueur: DonneesLongueur;
  moments: MomentsPremierOrdre;
}

export interface DonneesColonne {
  section: Section;
  fck: number;
  fyk: number;
  /** Longueur libre du poteau l (mm). */
  l: number;
  /** Effort normal de calcul N_Ed, compression positive (kN). */
  N_Ed: number;
  /** Flexion autour de y (sollicite h). */
  y: DonneesDirection;
  /** Flexion autour de z (sollicite b). */
  z: DonneesDirection;
  /** Coefficient de fluage final phi(inf, t0) (-). */
  phi_inf: number;
  /** Rapport M_0Eqp / M_0Ed du moment quasi permanent au moment de calcul (-). */
  rapportQuasiPermanent: number;
  /** Nombre d'elements verticaux contribuant a l'effet total, m (§5.2(5)) ; 1 pour un element isole. */
  m: number;
  methode: 'courbure-nominale' | 'rigidite-nominale';
}

export type OrigineCoefficient = 'calcule' | 'impose-par-la-norme' | 'defaut';

export interface PDelta {
  converge: boolean;
  iterations: number;
  /** Moment maximal du second ordre trouve par iteration (kN.m). */
  M_max: number;
  amplification: number;
  motif: string;
}

export interface ResultatDirection {
  axe: Axe;
  l0: number;
  origineL0: string;
  i: number;
  lambda: number;
  n: number;
  omega: number;
  phi_ef: number;
  motifFluage: string;
  A: number;
  B: number;
  C: number;
  origines: Record<'A' | 'B' | 'C', OrigineCoefficient>;
  motifC: string;
  lambda_lim: number;
  negligeable: boolean;
  e_i: number;
  e_0: number;
  /** Moments du premier ordre majores de N e_i, et moment equivalent (kN.m). */
  M_01: number;
  M_02: number;
  M_0Ed: number;
  /** Methode de la courbure nominale. */
  courbure: { K_r: number; K_phi: number; inv_r: number; e_2: number; M_2: number } | null;
  /** Methode de la rigidite nominale. */
  rigidite: { EI: number; N_B: number; beta: number; amplification: number } | null;
  pDelta: PDelta | null;
  instable: boolean;
  M_Ed: number;
  /** Ce qui gouverne M_Ed. */
  origineMEd: string;
  M_Rd: number;
  x: number;
  taux: number;
}

export type VerdictColonne = 'conforme' | 'non-conforme' | 'instable';

export interface ResultatColonne {
  verdict: VerdictColonne;
  motif: string;
  methode: DonneesColonne['methode'];
  N_Ed: number;
  N_Rd_max: number;
  y: ResultatDirection;
  z: ResultatDirection;
  devie: {
    dispense: boolean;
    motif: string;
    a: number | null;
    taux: number | null;
  };
  avertissements: string[];
}
