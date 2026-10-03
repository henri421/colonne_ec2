/**
 * Poteau de reference : 400 x 400 mm, d' = 50 mm, 8 HA20 (3 barres par
 * face), C30/37, B500, l = l_0 = 4,00 m, N_Ed = 1 500 kN.
 *   autour de y : M_tete = 60, M_pied = -30 kN.m (double courbure, r_m = -0,5)
 *   autour de z : M_tete = M_pied = 20 kN.m (simple courbure, r_m = 1)
 *   phi(inf, t0) = 2,5, M_0Eqp / M_0Ed = 0,6.
 * Valeurs de reference calculees independamment : docs/validation/poteau-400.md.
 */

import type { DonneesColonne, Section } from '../src/index';

export const SECTION_400: Extract<Section, { forme: 'rectangulaire' }> = { forme: 'rectangulaire', b: 400, h: 400, enrobageAxe: 50, nb: 3, nh: 3, phi: 20 };

export function poteau(modifs: Partial<DonneesColonne> = {}): DonneesColonne {
  return {
    section: SECTION_400,
    fck: 30,
    fyk: 500,
    l: 4000,
    N_Ed: 1500,
    y: { longueur: { mode: 'saisie', l0: 4000 }, moments: { origine: 'extremites', M_tete: 60, M_pied: -30 } },
    z: { longueur: { mode: 'saisie', l0: 4000 }, moments: { origine: 'extremites', M_tete: 20, M_pied: 20 } },
    phi_inf: 2.5,
    rapportQuasiPermanent: 0.6,
    m: 1,
    methode: 'courbure-nominale',
    ...modifs,
  };
}
