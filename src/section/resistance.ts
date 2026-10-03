/**
 * Resistance de la section a l'ELU en flexion composee droite, EN 1992-1-1
 * §6.1 : moment resistant M_Rd sous un effort normal N_Ed donne.
 *
 * Unites : N_Ed en kN (compression positive), M_Rd en kN.m, longueurs en mm,
 * contraintes en MPa.
 *
 * Methode : integration par bandes (beton, loi parabole-rectangle) et barres
 * discretes (acier a palier horizontal, beton deplace deduit). Diagramme des
 * deformations de la figure 6.1 : pivot B (epsilon_cu2 en fibre la plus
 * comprimee) tant que l'axe neutre est dans la section, pivot C au-dela.
 * Le palier horizontal de l'acier ne borne pas sa deformation : le pivot A
 * n'intervient pas.
 */

import type { Beton } from '../materiaux/materiaux';
import { contrainteAcier, contrainteBeton } from '../materiaux/materiaux';
import type { Axe, Section } from './geometrie';
import { aireAcier, aireBeton, barres, coordonnee, hauteurFlexion, largeurA } from './geometrie';

const N_PAR_KN = 1000;
const NMM_PAR_KNM = 1e6;
const BANDES = 400;

export interface EtatSection {
  /** Profondeur de l'axe neutre depuis la fibre la plus comprimee (mm). */
  x: number;
  N: number;
  M: number;
}

/** Deformation a la profondeur s depuis la fibre comprimee, pour un axe neutre a x (compression positive). */
function deformation(b: Beton, H: number, x: number, s: number): number {
  if (x <= H) return (b.epsCu2 * (x - s)) / x;
  const sC = (1 - b.epsC2 / b.epsCu2) * H;
  return (b.epsC2 * (x - s)) / (x - sC);
}

/** Efforts resultants (kN, kN.m autour du centre de gravite) pour un axe neutre a x. */
export function efforts(s: Section, b: Beton, f_yd: number, axe: Axe, x: number): EtatSection {
  const H = hauteurFlexion(s, axe);
  const ds = H / BANDES;
  let N = 0;
  let M = 0;
  for (let i = 0; i < BANDES; i++) {
    const sMil = (i + 0.5) * ds;
    const u = H / 2 - sMil;
    const sigma = contrainteBeton(b, deformation(b, H, x, sMil));
    const dF = sigma * largeurA(s, axe, u) * ds;
    N += dF;
    M += dF * u;
  }
  for (const barre of barres(s)) {
    const u = coordonnee(barre, axe);
    const eps = deformation(b, H, x, H / 2 - u);
    // Le beton deplace par la barre est deduit : sans cela, l'acier comprime
    // serait compte deux fois.
    const dF = (contrainteAcier(f_yd, eps) - contrainteBeton(b, eps)) * barre.A;
    N += dF;
    M += dF * u;
  }
  return { x, N: N / N_PAR_KN, M: M / NMM_PAR_KNM };
}

/** Effort normal resistant en compression centree N_Rd,max = A_c f_cd + A_s sigma_s(epsilon_c2) (kN). */
export function compressionMaximale(s: Section, b: Beton, f_yd: number): number {
  const As = aireAcier(s);
  return ((aireBeton(s) - As) * b.fcd + As * contrainteAcier(f_yd, b.epsC2)) / N_PAR_KN;
}

/** Effort normal resistant en traction centree -A_s f_yd (kN). */
export function tractionMaximale(s: Section, f_yd: number): number {
  return (-aireAcier(s) * f_yd) / N_PAR_KN;
}

/**
 * N_Rd = A_c f_cd + A_s f_yd, §5.8.9(4) : reference du rapport N_Ed / N_Rd
 * qui fixe l'exposant a de la flexion deviee (kN).
 */
export function NRdDevie(s: Section, b: Beton, f_yd: number): number {
  return (aireBeton(s) * b.fcd + aireAcier(s) * f_yd) / N_PAR_KN;
}

/**
 * Moment resistant sous N_Ed. Leve si N_Ed sort de [traction max ;
 * compression max] : aucun moment n'est alors resistable, et le dire par
 * une erreur vaut mieux qu'un M_Rd nul pris pour un resultat.
 */
export function momentResistant(s: Section, b: Beton, f_yd: number, axe: Axe, NEd: number): EtatSection {
  const nMax = compressionMaximale(s, b, f_yd);
  const nMin = tractionMaximale(s, f_yd);
  if (NEd > nMax) {
    throw new Error(`N_Ed = ${NEd.toFixed(0)} kN depasse la compression centree resistante N_Rd,max = ${nMax.toFixed(0)} kN.`);
  }
  if (NEd < nMin) {
    throw new Error(`N_Ed = ${NEd.toFixed(0)} kN depasse la traction centree resistante ${nMin.toFixed(0)} kN.`);
  }
  const H = hauteurFlexion(s, axe);
  // N(x) est croissant : dichotomie sur log(x), de presque nul a tres grand.
  let lo = Math.log(1e-4 * H);
  let hi = Math.log(1e4 * H);
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    if (efforts(s, b, f_yd, axe, Math.exp(mid)).N < NEd) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-10) break;
  }
  return efforts(s, b, f_yd, axe, Math.exp((lo + hi) / 2));
}
