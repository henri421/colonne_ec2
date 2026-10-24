/**
 * Mise en forme des resultats : lignes communes a la page, au CSV et a la
 * note. Module PUR. Unites : mm, kN, kN.m.
 */

import { echapper, notationHtml, nombreAffiche, tauxAffiche, type BlocResultat, type LigneResultat } from 'aedificium-ui';
import type { ResultatColonne, ResultatDirection } from '../../src/index';
import type { ModeleSaisie } from './form';

export function messageDErreur(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const L = (symbole: string, libelle: string, valeur: string): LigneResultat => ({ symbole, libelle, valeur });

/** Nombre affiche : trois decimales au plus, sans zeros inutiles. */
const aff = (v: number, d: number): string => nombreAffiche(v, Math.min(d, 3));

const ORIGINES: Record<string, string> = { calcule: 'calculé', 'impose-par-la-norme': 'imposé par la norme', defaut: 'défaut' };

function infini(x: number, d: number, unite: string): string {
  return Number.isFinite(x) ? `${aff(x, d)} ${unite}` : 'instable';
}

/** Lignes d'une direction, valeurs intermediaires comprises. */
export function lignesDirection(r: ResultatDirection): LigneResultat[] {
  const lignes: LigneResultat[] = [
    L('l_0', r.origineL0, `${aff(r.l0, 0)} mm`),
    L('lambda', `l_0 / i, i = ${aff(r.i, 1)} mm`, aff(r.lambda, 1)),
    L('n, omega', 'N_Ed / (A_c f_cd) ; A_s f_yd / (A_c f_cd)', `${aff(r.n, 3)} ; ${aff(r.omega, 3)}`),
    L('phi_ef', r.motifFluage, aff(r.phi_ef, 2)),
    L('A, B', `${ORIGINES[r.origines.A]} ; ${ORIGINES[r.origines.B]}`, `${aff(r.A, 3)} ; ${aff(r.B, 3)}`),
    L('C', `${ORIGINES[r.origines.C]} : ${r.motifC}`, aff(r.C, 3)),
    L('lambda_lim', '20 A B C / sqrt(n), expression (5.13N)', aff(r.lambda_lim, 1)),
    L('second ordre', r.negligeable ? 'lambda <= lambda_lim' : 'lambda > lambda_lim', r.negligeable ? 'négligeable' : 'à prendre en compte'),
    L('e_i, e_0', 'imperfection theta_i l_0 / 2 ; excentricité minimale max(h/30 ; 20 mm)', `${aff(r.e_i, 1)} ; ${aff(r.e_0, 1)} mm`),
    L('M_01, M_02', "moments d'extrémité majorés de N × e_i", `${aff(r.M_01, 1)} ; ${aff(r.M_02, 1)} kN.m`),
    L('M_0Ed', 'moment équivalent du premier ordre (§5.8.8.2(2)) ou M_0 + N × e_i', `${aff(r.M_0Ed, 1)} kN.m`),
  ];
  if (r.courbure !== null) {
    lignes.push(
      L('K_r, K_phi', 'corrections de la courbure (5.36), (5.37)', `${aff(r.courbure.K_r, 3)} ; ${aff(r.courbure.K_phi, 3)}`),
      L('1/r', 'K_r K_phi eps_yd / (0,45 d)', `${aff(r.courbure.inv_r * 1e6, 3)} x 10^-6 /mm`),
      L('e_2, M_2', '(1/r) l_0^2 / c ; N_Ed e_2', `${aff(r.courbure.e_2, 1)} mm ; ${aff(r.courbure.M_2, 1)} kN.m`)
    );
  }
  if (r.rigidite !== null) {
    lignes.push(
      L('EI', 'K_c E_cd I_c + K_s E_s I_s (5.21)', `${aff(r.rigidite.EI, 0)} kN.m2`),
      L('N_B', 'pi^2 EI / l_0^2', `${aff(r.rigidite.N_B, 0)} kN`),
      L('amplification', `1 + beta / (N_B / N_Ed - 1), beta = ${aff(r.rigidite.beta, 3)}`, Number.isFinite(r.rigidite.amplification) ? aff(r.rigidite.amplification, 3) : 'instable')
    );
  }
  lignes.push(
    L('M_Ed', r.origineMEd, infini(r.M_Ed, 1, 'kN.m')),
    L('M_Rd', `sous N_Ed, axe neutre à ${aff(r.x, 0)} mm`, `${aff(r.M_Rd, 1)} kN.m`),
    L('taux', 'M_Ed / M_Rd', Number.isFinite(r.taux) ? tauxAffiche(r.taux) : 'instable')
  );
  return lignes;
}

export function lignesPDelta(r: ResultatDirection): LigneResultat[] {
  if (r.pDelta === null) {
    return [L('P-delta', r.negligeable ? 'second ordre négligeable : sans objet' : 'rigidité nominale non définie (rho < 0,2 %)', 'non applicable')];
  }
  return [
    L('P-delta', r.pDelta.motif, r.pDelta.converge ? 'stabilisée' : 'non stabilisée'),
    L('M_max', 'moment maximal M_0 + N_Ed y, barre biarticulée équivalente de longueur l_0, EI nominale', infini(r.pDelta.M_max, 1, 'kN.m')),
    L('amplification', 'M_max / M_0Ed', Number.isFinite(r.pDelta.amplification) ? aff(r.pDelta.amplification, 3) : 'instable'),
  ];
}

export function lignesDevie(r: ResultatColonne): LigneResultat[] {
  return [
    L('flexion déviée', r.devie.motif, r.devie.dispense ? 'dispensée' : r.devie.taux === null ? 'sans objet' : 'vérifiée'),
    ...(r.devie.a === null || r.devie.taux === null
      ? []
      : [L('a', 'exposant de (5.39)', aff(r.devie.a, 3)), L('taux', '(M_Edz / M_Rdz) puissance a + (M_Edy / M_Rdy) puissance a', tauxAffiche(r.devie.taux))]),
  ];
}

/**
 * Le constat et la resistance en compression centree : les memes lignes a
 * l'ecran (`verdictHtml`) et dans la note. La note taisait le constat, l'ecran
 * taisait N_Rd,max.
 */
export function lignesVerdict(r: ResultatColonne): LigneResultat[] {
  return [
    L('constat', 'verdict', TITRES[r.verdict]),
    L('N_Rd,max', 'compression centrée', `${aff(r.N_Rd_max, 0)} kN`),
  ];
}

export function blocs(r: ResultatColonne): BlocResultat[] {
  return [
    { titre: 'Flexion autour de y (dimension h)', lignes: lignesDirection(r.y), note: null },
    { titre: 'Flexion autour de z (dimension b)', lignes: lignesDirection(r.z), note: null },
    { titre: 'Analyse P-delta, autour de y', lignes: lignesPDelta(r.y), note: null },
    { titre: 'Analyse P-delta, autour de z', lignes: lignesPDelta(r.z), note: null },
    { titre: 'Flexion déviée (§5.8.9)', lignes: lignesDevie(r), note: null },
    { titre: 'Verdict', lignes: lignesVerdict(r), note: r.motif },
  ];
}

export function tableHtml(lignes: readonly LigneResultat[]): string {
  return `<table class="grandeurs"><tbody>${lignes
    .map((l) => `<tr><th>${notationHtml(l.symbole)}</th><td class="libelle">${notationHtml(l.libelle)}</td><td class="valeur">${notationHtml(l.valeur)}</td></tr>`)
    .join('')}</tbody></table>`;
}

/** Avertissements du noyau, un bloc d'alerte par element. */
export function avertissementsHtml(liste: readonly string[]): string {
  return liste.map((a) => `<p class="alerte">${notationHtml(a)}</p>`).join('');
}

/** Libelles des valeurs d'union affichees, jamais leur identifiant. */
const FORMES: Record<ModeleSaisie['forme'], string> = {
  rectangulaire: 'rectangulaire',
  circulaire: 'circulaire',
};

const METHODES: Record<ModeleSaisie['methode'], string> = {
  'courbure-nominale': 'courbure nominale',
  'rigidite-nominale': 'rigidité nominale',
};

/** Bloc des donnees saisies, pour le CSV et la note. */
export function blocEntrees(m: ModeleSaisie): BlocResultat {
  const section =
    m.forme === 'rectangulaire'
      ? `${aff(m.b, 3)} x ${aff(m.h, 3)} mm, ${2 * m.nb + 2 * m.nh - 4} HA${aff(m.phi, 3)}, d' = ${aff(m.enrobageAxe, 3)} mm`
      : `D = ${aff(m.D, 3)} mm, ${m.n} HA${aff(m.phi, 3)}, d' = ${aff(m.enrobageAxe, 3)} mm`;
  return {
    titre: 'Données',
    lignes: [
      { symbole: 'section', libelle: FORMES[m.forme], valeur: section },
      { symbole: 'f_ck / f_yk', libelle: 'matériaux', valeur: `${aff(m.fck, 3)} / ${aff(m.fyk, 3)} MPa` },
      { symbole: 'l, N_Ed', libelle: 'longueur libre, effort normal', valeur: `${aff(m.l, 3)} m ; ${aff(m.NEd, 3)} kN` },
      { symbole: 'phi(inf, t0)', libelle: `M_0Eqp / M_0Ed = ${aff(m.rapport, 3)}`, valeur: aff(m.phiInf, 3) },
      { symbole: 'méthode', libelle: 'second ordre', valeur: METHODES[m.methode] },
    ],
    note: null,
  };
}

const TITRES: Record<string, string> = { conforme: 'Conforme', 'non-conforme': 'Non conforme', instable: 'Instable' };

export function verdictHtml(r: ResultatColonne): string {
  return (
    `<p class="verdict verdict-${echapper(r.verdict)}">${notationHtml(TITRES[r.verdict])}</p><p class="motif">${notationHtml(r.motif)}</p>` +
    tableHtml(lignesVerdict(r).slice(1))
  );
}
