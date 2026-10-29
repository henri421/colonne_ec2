/**
 * Mise en forme des resultats : lignes communes a la page, au CSV et a la
 * note. Module PUR. Unites : mm, kN, kN.m.
 */

import { echapper, notationHtml, nombreAffiche, tauxAffiche, type BlocResultat, type LigneResultat } from 'aedificium-ui';
import type { ResultatColonne, ResultatDirection } from '../../src/index';
import type { ModeleSaisie } from './form';
import { phrase, textes } from './textes';

export function messageDErreur(e: unknown): string {
  return phrase(e instanceof Error ? e.message : String(e));
}

const L = (symbole: string, libelle: string, valeur: string): LigneResultat => ({ symbole, libelle, valeur });

/** Nombre affiche : trois decimales au plus, sans zeros inutiles. */
const aff = (v: number, d: number): string => nombreAffiche(v, Math.min(d, 3));

function infini(x: number, d: number, unite: string): string {
  return Number.isFinite(x) ? `${aff(x, d)} ${unite}` : textes().instable;
}

/** Lignes d'une direction, valeurs intermediaires comprises. */
export function lignesDirection(r: ResultatDirection): LigneResultat[] {
  const t = textes();
  const o = t.origines;
  const d = t.direction;
  const lignes: LigneResultat[] = [
    L('l_0', phrase(r.origineL0), `${aff(r.l0, 0)} mm`),
    L('lambda', d.lambda(aff(r.i, 1)), aff(r.lambda, 1)),
    L('n, omega', 'N_Ed / (A_c f_cd) ; A_s f_yd / (A_c f_cd)', `${aff(r.n, 3)} ; ${aff(r.omega, 3)}`),
    L('phi_ef', phrase(r.motifFluage), aff(r.phi_ef, 2)),
    L('A, B', `${o[r.origines.A]} ; ${o[r.origines.B]}`, `${aff(r.A, 3)} ; ${aff(r.B, 3)}`),
    L('C', `${o[r.origines.C]}${t.deuxPoints}${phrase(r.motifC)}`, aff(r.C, 3)),
    L('lambda_lim', '20 A B C / sqrt(n), expression (5.13N)', aff(r.lambda_lim, 1)),
    L(d.secondOrdre, r.negligeable ? 'lambda <= lambda_lim' : 'lambda > lambda_lim', r.negligeable ? d.negligeable : d.aPrendre),
    L('e_i, e_0', d.imperfection, `${aff(r.e_i, 1)} ; ${aff(r.e_0, 1)} mm`),
    L('M_01, M_02', d.extremites, `${aff(r.M_01, 1)} ; ${aff(r.M_02, 1)} kN.m`),
    L('M_0Ed', d.equivalent, `${aff(r.M_0Ed, 1)} kN.m`),
  ];
  if (r.courbure !== null) {
    lignes.push(
      L('K_r, K_phi', d.corrections, `${aff(r.courbure.K_r, 3)} ; ${aff(r.courbure.K_phi, 3)}`),
      L('1/r', d.courbure, `${aff(r.courbure.inv_r * 1e6, 3)} x 10^-6 /mm`),
      L('e_2, M_2', '(1/r) l_0^2 / c ; N_Ed e_2', `${aff(r.courbure.e_2, 1)} mm ; ${aff(r.courbure.M_2, 1)} kN.m`)
    );
  }
  if (r.rigidite !== null) {
    lignes.push(
      L('EI', 'K_c E_cd I_c + K_s E_s I_s (5.21)', `${aff(r.rigidite.EI, 0)} kN.m2`),
      L('N_B', 'pi^2 EI / l_0^2', `${aff(r.rigidite.N_B, 0)} kN`),
      L('amplification', `1 + beta / (N_B / N_Ed - 1), beta = ${aff(r.rigidite.beta, 3)}`, Number.isFinite(r.rigidite.amplification) ? aff(r.rigidite.amplification, 3) : t.instable)
    );
  }
  lignes.push(
    L('M_Ed', phrase(r.origineMEd), infini(r.M_Ed, 1, 'kN.m')),
    L('M_Rd', d.MRd(aff(r.x, 0)), `${aff(r.M_Rd, 1)} kN.m`),
    L(d.taux, 'M_Ed / M_Rd', Number.isFinite(r.taux) ? tauxAffiche(r.taux) : t.instable)
  );
  return lignes;
}

export function lignesPDelta(r: ResultatDirection): LigneResultat[] {
  const t = textes();
  const p = t.pDelta;
  if (r.pDelta === null) {
    return [L('P-delta', r.negligeable ? p.negligeable : p.rigidite, p.nonApplicable)];
  }
  return [
    L('P-delta', phrase(r.pDelta.motif), r.pDelta.converge ? p.stabilisee : p.nonStabilisee),
    L('M_max', p.Mmax, infini(r.pDelta.M_max, 1, 'kN.m')),
    L('amplification', 'M_max / M_0Ed', Number.isFinite(r.pDelta.amplification) ? aff(r.pDelta.amplification, 3) : t.instable),
  ];
}

export function lignesDevie(r: ResultatColonne): LigneResultat[] {
  const t = textes();
  const d = t.devie;
  return [
    L(d.symbole, phrase(r.devie.motif), r.devie.dispense ? d.dispensee : r.devie.taux === null ? d.sansObjet : d.verifiee),
    ...(r.devie.a === null || r.devie.taux === null
      ? []
      : [L('a', d.exposant, aff(r.devie.a, 3)), L(t.direction.taux, d.interaction, tauxAffiche(r.devie.taux))]),
  ];
}

/**
 * Le constat et la resistance en compression centree : les memes lignes a
 * l'ecran (`verdictHtml`) et dans la note. La note taisait le constat, l'ecran
 * taisait N_Rd,max.
 */
export function lignesVerdict(r: ResultatColonne): LigneResultat[] {
  const t = textes();
  return [
    L(t.verdict.constat, t.verdict.libelle, t.verdicts[r.verdict]),
    L('N_Rd,max', t.verdict.compression, `${aff(r.N_Rd_max, 0)} kN`),
  ];
}

export function blocs(r: ResultatColonne): BlocResultat[] {
  const b = textes().blocs;
  return [
    { titre: b.flexionY, lignes: lignesDirection(r.y), note: null },
    { titre: b.flexionZ, lignes: lignesDirection(r.z), note: null },
    { titre: b.pDeltaY, lignes: lignesPDelta(r.y), note: null },
    { titre: b.pDeltaZ, lignes: lignesPDelta(r.z), note: null },
    { titre: b.devie, lignes: lignesDevie(r), note: null },
    { titre: b.verdict, lignes: lignesVerdict(r), note: phrase(r.motif) },
  ];
}

export function tableHtml(lignes: readonly LigneResultat[]): string {
  return `<table class="grandeurs"><tbody>${lignes
    .map((l) => `<tr><th>${notationHtml(l.symbole)}</th><td class="libelle">${notationHtml(l.libelle)}</td><td class="valeur">${notationHtml(l.valeur)}</td></tr>`)
    .join('')}</tbody></table>`;
}

/** Avertissements du noyau, un bloc d'alerte par element. */
export function avertissementsHtml(liste: readonly string[]): string {
  return liste.map((a) => `<p class="alerte">${notationHtml(phrase(a))}</p>`).join('');
}

/** Bloc des donnees saisies, pour le CSV et la note. */
export function blocEntrees(m: ModeleSaisie): BlocResultat {
  const t = textes();
  const e = t.entrees;
  const section =
    m.forme === 'rectangulaire'
      ? `${aff(m.b, 3)} x ${aff(m.h, 3)} mm, ${2 * m.nb + 2 * m.nh - 4} HA${aff(m.phi, 3)}, d' = ${aff(m.enrobageAxe, 3)} mm`
      : `D = ${aff(m.D, 3)} mm, ${m.n} HA${aff(m.phi, 3)}, d' = ${aff(m.enrobageAxe, 3)} mm`;
  return {
    titre: t.blocs.donnees,
    lignes: [
      { symbole: e.section, libelle: t.formes[m.forme], valeur: section },
      { symbole: 'f_ck / f_yk', libelle: e.materiaux, valeur: `${aff(m.fck, 3)} / ${aff(m.fyk, 3)} MPa` },
      { symbole: 'l, N_Ed', libelle: e.longueurEffort, valeur: `${aff(m.l, 3)} m ; ${aff(m.NEd, 3)} kN` },
      { symbole: 'phi(inf, t0)', libelle: `M_0Eqp / M_0Ed = ${aff(m.rapport, 3)}`, valeur: aff(m.phiInf, 3) },
      { symbole: e.methode, libelle: e.secondOrdre, valeur: t.methodes[m.methode] },
    ],
    note: null,
  };
}

export function verdictHtml(r: ResultatColonne): string {
  return (
    `<p class="verdict verdict-${echapper(r.verdict)}">${notationHtml(textes().verdicts[r.verdict])}</p><p class="motif">${notationHtml(phrase(r.motif))}</p>` +
    tableHtml(lignesVerdict(r).slice(1))
  );
}
