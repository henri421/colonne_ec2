/**
 * Contenu de la note de calcul commune (`noteDeCalculHtml` d'aedificium-ui).
 *
 * Module PUR. Les lignes de calcul viennent des memes fonctions que l'ecran
 * et le CSV (`blocEntrees`, `blocs`) ; elles ne sont ici que rangees.
 */

import { nombreAffiche, type ElementNote, type LigneResultat, type NoteDeCalcul, type VerificationNote } from 'aedificium-ui';
import type { ResultatColonne } from '../../src/index';
import type { ModeleSaisie, ModeMaintien, SaisieDirection } from './form';
import { blocEntrees, blocs } from './vue';
import { phrase, textes } from './textes';

/** Hypotheses et limites, en francais (tests) ; la note lit `textes().note.hypotheses`. */
export const HYPOTHESES_NOTE: string[] = textes().note.hypotheses;

const aff = (v: number, d = 3): string => nombreAffiche(v, Math.min(d, 3));
const L = (symbole: string, libelle: string, valeur: string): LigneResultat => ({ symbole, libelle, valeur });
const bloc = (titre: string, lignes: LigneResultat[]): ElementNote => ({ type: 'bloc', bloc: { titre, lignes, note: null } });

function maintien(mode: ModeMaintien, k: number, feminin: boolean): string {
  const t = textes().note;
  if (mode === 'souple') return t.souplesse(aff(k));
  if (mode === 'encastre') return feminin ? t.encastree : t.encastre;
  return feminin ? t.articulee : t.articule;
}

/** Longueur efficace saisie, ou ses conditions d'appui. */
export function ligneLongueurEfficace(axe: 'y' | 'z', d: SaisieDirection): LigneResultat {
  const t = textes().note;
  if (d.l0Mode === 'saisie') return L(`l_0 (${axe})`, t.l0Saisie(t.axes[axe]), `${aff(d.l0)} m`);
  const element = d.contreventement === 'contrevente' ? t.contrevente : t.nonContrevente;
  return L(`l_0 (${axe})`, t.l0Calculee(t.axes[axe]), t.appuis(element, maintien(d.tete, d.kTete, true), maintien(d.pied, d.kPied, false)));
}

/** Moments du premier ordre saisis d'une direction. */
export function ligneMoments(axe: 'y' | 'z', d: SaisieDirection): LigneResultat {
  const t = textes().note;
  if (d.origine === 'extremites') {
    return L(`M (${axe})`, t.momentsExtremite(t.axes[axe]), t.valeursExtremite(aff(d.Mtete), aff(d.Mpied)));
  }
  return L(`M_0 (${axe})`, t.transversales(t.axes[axe], t.distributions[d.distribution]), `${aff(d.M0)} kN.m`);
}

/** Nom du poteau quand l'element n'est pas renseigne. */
export function nomDuPoteau(m: ModeleSaisie): string {
  const t = textes().note;
  return m.forme === 'rectangulaire' ? t.poteauRect(aff(m.b), aff(m.h)) : t.poteauCirc(aff(m.D));
}

/**
 * Verifications : flexion autour de chaque axe (instable : taux infini,
 * « hors domaine »), puis flexion deviee quand elle est calculee. Une
 * dispense (§5.8.9(3)) ou un poteau instable ne donnent pas de ligne.
 */
export function verificationsDeLaNote(r: ResultatColonne): VerificationNote[] {
  const t = textes().note;
  const v: VerificationNote[] = [
    { nom: t.flexionY, clause: t.clauseFlexion, taux: r.y.taux, ok: Number.isFinite(r.y.taux) && r.y.taux <= 1 },
    { nom: t.flexionZ, clause: t.clauseFlexion, taux: r.z.taux, ok: Number.isFinite(r.z.taux) && r.z.taux <= 1 },
  ];
  if (r.devie.taux !== null) v.push({ nom: t.flexionDeviee, clause: t.clauseDeviee, taux: r.devie.taux, ok: r.devie.taux <= 1 });
  return v;
}

/**
 * Note du calcul courant. `dessins` : la section puis le diagramme N-M, tels
 * qu'ils sont a l'ecran.
 */
export function noteDuCalcul(
  profil: { nom: string; date: string },
  m: ModeleSaisie,
  r: ResultatColonne,
  dessins: { section: string; interaction: string },
  cartouche: { projet: string; element: string; date: string }
): NoteDeCalcul {
  const t = textes().note;
  const [section, materiaux, , fluage, methode] = blocEntrees(m).lignes;
  const [flexY, flexZ, pdY, pdZ, devie, verdict] = blocs(r);

  return {
    cartouche: {
      projet: cartouche.projet,
      element: cartouche.element.trim() === '' ? nomDuPoteau(m) : cartouche.element,
      date: cartouche.date,
      norme: 'EN 1992-1-1:2004',
      outil: 'colonne-ec2',
    },
    sections: {
      geometrie: [
        bloc(t.sectionLongueurs, [section, L('l', t.longueurLibre, `${aff(m.l)} m`), ligneLongueurEfficace('y', m.y), ligneLongueurEfficace('z', m.z)]),
        { type: 'figure', svg: dessins.section, legende: t.legendeSection },
      ],
      materiaux: [bloc(t.materiaux, [materiaux])],
      hypotheses: [
        { type: 'texte', texte: t.profil(phrase(profil.nom), profil.date) },
        bloc(t.secondOrdreFluage, [methode, fluage, L('m', t.elementsVerticaux, aff(m.m))]),
        { type: 'liste', items: t.hypotheses },
      ],
      charges: [bloc(t.sollicitations, [L('N_Ed', t.effortNormal, `${aff(m.NEd)} kN`), ligneMoments('y', m.y), ligneMoments('z', m.z)])],
      calculs: [
        { type: 'bloc', bloc: flexY },
        { type: 'bloc', bloc: flexZ },
        { type: 'figure', svg: dessins.interaction, legende: t.legendeInteraction },
        { type: 'bloc', bloc: pdY },
        { type: 'bloc', bloc: pdZ },
        { type: 'bloc', bloc: devie },
        // Du bloc Verdict de l'ecran, la note ne garde que N_Rd,max.
        bloc(t.compression, verdict.lignes.filter((l) => l.symbole === 'N_Rd,max')),
      ],
    },
    verifications: verificationsDeLaNote(r),
    avertissements: r.avertissements.map(phrase),
  };
}
