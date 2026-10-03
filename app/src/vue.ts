/**
 * Mise en forme des resultats : lignes communes a la page, au CSV et a la
 * note. Module PUR. Unites : mm, kN, kN.m.
 */

import { echapper, nombreFr, tauxFr, type BlocResultat, type LigneResultat } from 'aedificium-ui';
import type { ResultatColonne, ResultatDirection } from '../../src/index';

export function messageDErreur(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const L = (symbole: string, libelle: string, valeur: string): LigneResultat => ({ symbole, libelle, valeur });

const ORIGINES: Record<string, string> = { calcule: 'calcule', 'impose-par-la-norme': 'impose par la norme', defaut: 'defaut' };

function infini(x: number, d: number, unite: string): string {
  return Number.isFinite(x) ? `${nombreFr(x, d)} ${unite}` : 'instable';
}

/** Lignes d'une direction, valeurs intermediaires comprises. */
export function lignesDirection(r: ResultatDirection): LigneResultat[] {
  const lignes: LigneResultat[] = [
    L('l_0', r.origineL0, `${nombreFr(r.l0, 0)} mm`),
    L('lambda', `l_0 / i, i = ${nombreFr(r.i, 1)} mm`, nombreFr(r.lambda, 1)),
    L('n, omega', 'N_Ed / (A_c f_cd) ; A_s f_yd / (A_c f_cd)', `${nombreFr(r.n, 3)} ; ${nombreFr(r.omega, 3)}`),
    L('phi_ef', r.motifFluage, nombreFr(r.phi_ef, 2)),
    L('A, B', `${ORIGINES[r.origines.A]} ; ${ORIGINES[r.origines.B]}`, `${nombreFr(r.A, 3)} ; ${nombreFr(r.B, 3)}`),
    L('C', `${ORIGINES[r.origines.C]} : ${r.motifC}`, nombreFr(r.C, 3)),
    L('lambda_lim', '20 A B C / sqrt(n), expression (5.13N)', nombreFr(r.lambda_lim, 1)),
    L('second ordre', r.negligeable ? 'lambda <= lambda_lim' : 'lambda > lambda_lim', r.negligeable ? 'negligeable' : 'a prendre en compte'),
    L('e_i, e_0', 'imperfection theta_i l_0 / 2 ; excentricite minimale max(h/30 ; 20 mm)', `${nombreFr(r.e_i, 1)} ; ${nombreFr(r.e_0, 1)} mm`),
    L('M_01, M_02', 'moments d extremite majores de N e_i', `${nombreFr(r.M_01, 1)} ; ${nombreFr(r.M_02, 1)} kN.m`),
    L('M_0Ed', 'moment equivalent du premier ordre (§5.8.8.2(2)) ou M_0 + N e_i', `${nombreFr(r.M_0Ed, 1)} kN.m`),
  ];
  if (r.courbure !== null) {
    lignes.push(
      L('K_r, K_phi', 'corrections de la courbure (5.36), (5.37)', `${nombreFr(r.courbure.K_r, 3)} ; ${nombreFr(r.courbure.K_phi, 3)}`),
      L('1/r', 'K_r K_phi eps_yd / (0,45 d)', `${nombreFr(r.courbure.inv_r * 1e6, 3)} x 10^-6 /mm`),
      L('e_2, M_2', '(1/r) l_0^2 / c ; N_Ed e_2', `${nombreFr(r.courbure.e_2, 1)} mm ; ${nombreFr(r.courbure.M_2, 1)} kN.m`)
    );
  }
  if (r.rigidite !== null) {
    lignes.push(
      L('EI', 'K_c E_cd I_c + K_s E_s I_s (5.21)', `${nombreFr(r.rigidite.EI, 0)} kN.m2`),
      L('N_B', 'pi^2 EI / l_0^2', `${nombreFr(r.rigidite.N_B, 0)} kN`),
      L('amplification', `1 + beta / (N_B / N_Ed - 1), beta = ${nombreFr(r.rigidite.beta, 3)}`, Number.isFinite(r.rigidite.amplification) ? nombreFr(r.rigidite.amplification, 3) : 'instable')
    );
  }
  lignes.push(
    L('M_Ed', r.origineMEd, infini(r.M_Ed, 1, 'kN.m')),
    L('M_Rd', `sous N_Ed, axe neutre a ${nombreFr(r.x, 0)} mm`, `${nombreFr(r.M_Rd, 1)} kN.m`),
    L('taux', 'M_Ed / M_Rd', Number.isFinite(r.taux) ? tauxFr(r.taux) : 'instable')
  );
  return lignes;
}

export function lignesPDelta(r: ResultatDirection): LigneResultat[] {
  if (r.pDelta === null) {
    return [L('P-delta', r.negligeable ? 'second ordre negligeable : sans objet' : 'rigidite nominale non definie (rho < 0,2 %)', 'non applicable')];
  }
  return [
    L('P-delta', r.pDelta.motif, r.pDelta.converge ? 'stabilisee' : 'non stabilisee'),
    L('M_max', 'moment maximal M_0 + N_Ed y, barre biarticulee equivalente de longueur l_0, EI nominale', infini(r.pDelta.M_max, 1, 'kN.m')),
    L('amplification', 'M_max / M_0Ed', Number.isFinite(r.pDelta.amplification) ? nombreFr(r.pDelta.amplification, 3) : 'instable'),
  ];
}

export function lignesDevie(r: ResultatColonne): LigneResultat[] {
  return [
    L('flexion deviee', r.devie.motif, r.devie.dispense ? 'dispensee' : r.devie.taux === null ? 'sans objet' : 'verifiee'),
    ...(r.devie.a === null || r.devie.taux === null
      ? []
      : [L('a', 'exposant de (5.39)', nombreFr(r.devie.a, 3)), L('taux', '(M_Edz/M_Rdz)^a + (M_Edy/M_Rdy)^a', tauxFr(r.devie.taux))]),
  ];
}

export function blocs(r: ResultatColonne): BlocResultat[] {
  return [
    { titre: 'Flexion autour de y (dimension h)', lignes: lignesDirection(r.y), note: null },
    { titre: 'Flexion autour de z (dimension b)', lignes: lignesDirection(r.z), note: null },
    { titre: 'Analyse P-delta, autour de y', lignes: lignesPDelta(r.y), note: null },
    { titre: 'Analyse P-delta, autour de z', lignes: lignesPDelta(r.z), note: null },
    { titre: 'Flexion deviee (§5.8.9)', lignes: lignesDevie(r), note: null },
    { titre: 'Verdict', lignes: [L('N_Rd,max', 'compression centree', `${nombreFr(r.N_Rd_max, 0)} kN`)], note: r.motif },
  ];
}

export function tableHtml(lignes: readonly LigneResultat[]): string {
  return `<table class="grandeurs"><tbody>${lignes
    .map((l) => `<tr><th>${echapper(l.symbole)}</th><td class="libelle">${echapper(l.libelle)}</td><td class="valeur">${echapper(l.valeur)}</td></tr>`)
    .join('')}</tbody></table>`;
}

const TITRES: Record<string, string> = { conforme: 'Conforme', 'non-conforme': 'Non conforme', instable: 'Instable' };

export function verdictHtml(r: ResultatColonne): string {
  return `<p class="verdict verdict-${echapper(r.verdict)}">${echapper(TITRES[r.verdict])}</p><p class="motif">${echapper(r.motif)}</p>`;
}
