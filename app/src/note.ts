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

/** Hypotheses et limites rappelees dans la note de calcul. */
export const HYPOTHESES_NOTE: string[] = [
  'Élément isolé ; imperfection e_i = theta_i l_0 / 2 (§5.2(7)).',
  "Moments d'extrémité majorés de N × e_i ; moment équivalent M_0e = 0,6 M_02 + 0,4 M_01 >= 0,4 M_02 (§5.8.8.2(2)).",
  'Excentricité minimale e_0 = max(h/30 ; 20 mm) (§6.1(4)).',
  'Section : loi parabole-rectangle, acier à palier horizontal, béton déplacé par les barres déduit.',
  'P-delta : barre biarticulée équivalente de longueur l_0, rigidité nominale EI.',
  "Valeurs recommandées de l'EN 1992-1-1 ; aucune annexe nationale codée.",
];

const aff = (v: number, d = 3): string => nombreAffiche(v, Math.min(d, 3));
const L = (symbole: string, libelle: string, valeur: string): LigneResultat => ({ symbole, libelle, valeur });
const bloc = (titre: string, lignes: LigneResultat[]): ElementNote => ({ type: 'bloc', bloc: { titre, lignes, note: null } });

const AXES = { y: 'autour de y (dimension h)', z: 'autour de z (dimension b)' } as const;
const DISTRIBUTIONS: Record<SaisieDirection['distribution'], string> = {
  parabolique: 'parabolique (c_0 = 9,6)',
  triangulaire: 'triangulaire (c_0 = 12)',
  constante: 'constante (c_0 = 8)',
};

function maintien(mode: ModeMaintien, k: number, feminin: boolean): string {
  if (mode === 'souple') return `souplesse k = ${aff(k)}`;
  if (mode === 'encastre') return feminin ? 'encastrée (k = 0,1)' : 'encastré (k = 0,1)';
  return feminin ? 'articulée' : 'articulé';
}

/** Longueur efficace saisie, ou ses conditions d'appui. */
export function ligneLongueurEfficace(axe: 'y' | 'z', d: SaisieDirection): LigneResultat {
  if (d.l0Mode === 'saisie') return L(`l_0 (${axe})`, `longueur efficace ${AXES[axe]}, saisie`, `${aff(d.l0)} m`);
  const element = d.contreventement === 'contrevente' ? 'élément contreventé' : 'élément non contreventé';
  return L(
    `l_0 (${axe})`,
    `longueur efficace ${AXES[axe]}, calculée (§5.8.3.2)`,
    `${element}, tête ${maintien(d.tete, d.kTete, true)}, pied ${maintien(d.pied, d.kPied, false)}`
  );
}

/** Moments du premier ordre saisis d'une direction. */
export function ligneMoments(axe: 'y' | 'z', d: SaisieDirection): LigneResultat {
  if (d.origine === 'extremites') {
    return L(`M (${axe})`, `moments d'extrémité ${AXES[axe]}, même signe = simple courbure`, `tête ${aff(d.Mtete)} ; pied ${aff(d.Mpied)} kN.m`);
  }
  return L(`M_0 (${axe})`, `charges transversales ${AXES[axe]}, distribution ${DISTRIBUTIONS[d.distribution]}`, `${aff(d.M0)} kN.m`);
}

/** Nom du poteau quand l'element n'est pas renseigne. */
export function nomDuPoteau(m: ModeleSaisie): string {
  return m.forme === 'rectangulaire' ? `Poteau ${aff(m.b)} x ${aff(m.h)} mm` : `Poteau D = ${aff(m.D)} mm`;
}

/**
 * Verifications : flexion autour de chaque axe (instable : taux infini,
 * « hors domaine »), puis flexion deviee quand elle est calculee. Une
 * dispense (§5.8.9(3)) ou un poteau instable ne donnent pas de ligne.
 */
export function verificationsDeLaNote(r: ResultatColonne): VerificationNote[] {
  const v: VerificationNote[] = [
    { nom: 'Flexion autour de y', clause: '§5.8, §6.1', taux: r.y.taux, ok: Number.isFinite(r.y.taux) && r.y.taux <= 1 },
    { nom: 'Flexion autour de z', clause: '§5.8, §6.1', taux: r.z.taux, ok: Number.isFinite(r.z.taux) && r.z.taux <= 1 },
  ];
  if (r.devie.taux !== null) v.push({ nom: 'Flexion déviée', clause: '§5.8.9, (5.39)', taux: r.devie.taux, ok: r.devie.taux <= 1 });
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
        bloc('Section et longueurs', [
          section,
          L('l', 'longueur libre du poteau', `${aff(m.l)} m`),
          ligneLongueurEfficace('y', m.y),
          ligneLongueurEfficace('z', m.z),
        ]),
        { type: 'figure', svg: dessins.section, legende: 'Section du poteau' },
      ],
      materiaux: [bloc('Matériaux', [materiaux])],
      hypotheses: [
        { type: 'texte', texte: `Profil normatif : ${profil.nom}, données consultées le ${profil.date}.` },
        bloc('Second ordre et fluage', [methode, fluage, L('m', "éléments verticaux contribuant à l'effet total (§5.2(5))", aff(m.m))]),
        { type: 'liste', items: HYPOTHESES_NOTE },
      ],
      charges: [bloc('Sollicitations de calcul', [L('N_Ed', 'effort normal de calcul, compression positive', `${aff(m.NEd)} kN`), ligneMoments('y', m.y), ligneMoments('z', m.z)])],
      calculs: [
        { type: 'bloc', bloc: flexY },
        { type: 'bloc', bloc: flexZ },
        { type: 'figure', svg: dessins.interaction, legende: "Diagramme d'interaction N-M et points de calcul" },
        { type: 'bloc', bloc: pdY },
        { type: 'bloc', bloc: pdZ },
        { type: 'bloc', bloc: devie },
        // Du bloc Verdict de l'ecran, la note ne garde que N_Rd,max.
        bloc('Compression centrée', verdict.lignes.filter((l) => l.symbole === 'N_Rd,max')),
      ],
    },
    verifications: verificationsDeLaNote(r),
    avertissements: r.avertissements,
  };
}
