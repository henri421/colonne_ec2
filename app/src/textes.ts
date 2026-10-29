/**
 * Les textes affiches, en francais et en anglais. PUR.
 *
 * Deux sources :
 * - les textes de l'app (`FR`, `EN`), types : une cle oubliee en anglais ne
 *   compile pas ;
 * - les phrases du noyau (`src/`), ecrites en francais, traduites a
 *   l'affichage par `phrase`.
 *
 * ⚠ Aucun texte ne se lit au chargement d'un module : toujours `textes()` ou
 * `phrase()` AU MOMENT DU RENDU, apres `definirLangue` (main.ts).
 */

import { langueCourante, traducteur } from 'aedificium-ui';

type Axe = 'y' | 'z';

const FR = {
  origines: { calcule: 'calculé', 'impose-par-la-norme': 'imposé par la norme', defaut: 'défaut' } as Record<string, string>,
  instable: 'instable',
  /** Deux-points : espace avant en francais. */
  deuxPoints: ' : ',
  verdicts: { conforme: 'Conforme', 'non-conforme': 'Non conforme', instable: 'Instable' } as Record<string, string>,
  formes: { rectangulaire: 'rectangulaire', circulaire: 'circulaire' },
  methodes: { 'courbure-nominale': 'courbure nominale', 'rigidite-nominale': 'rigidité nominale' },
  direction: {
    lambda: (i: string) => `l_0 / i, i = ${i} mm`,
    secondOrdre: 'second ordre',
    negligeable: 'négligeable',
    aPrendre: 'à prendre en compte',
    imperfection: 'imperfection theta_i l_0 / 2 ; excentricité minimale max(h/30 ; 20 mm)',
    extremites: "moments d'extrémité majorés de N × e_i",
    equivalent: 'moment équivalent du premier ordre (§5.8.8.2(2)) ou M_0 + N × e_i',
    corrections: 'corrections de la courbure (5.36), (5.37)',
    courbure: 'K_r K_phi eps_yd / (0,45 d)',
    MRd: (x: string) => `sous N_Ed, axe neutre à ${x} mm`,
    taux: 'taux',
  },
  pDelta: {
    negligeable: 'second ordre négligeable : sans objet',
    rigidite: 'rigidité nominale non définie (rho < 0,2 %)',
    nonApplicable: 'non applicable',
    stabilisee: 'stabilisée',
    nonStabilisee: 'non stabilisée',
    Mmax: 'moment maximal M_0 + N_Ed y, barre biarticulée équivalente de longueur l_0, EI nominale',
  },
  devie: {
    symbole: 'flexion déviée',
    dispensee: 'dispensée',
    sansObjet: 'sans objet',
    verifiee: 'vérifiée',
    exposant: 'exposant de (5.39)',
    interaction: '(M_Edz / M_Rdz) puissance a + (M_Edy / M_Rdy) puissance a',
  },
  verdict: { constat: 'constat', libelle: 'verdict', compression: 'compression centrée' },
  blocs: {
    flexionY: 'Flexion autour de y (dimension h)',
    flexionZ: 'Flexion autour de z (dimension b)',
    pDeltaY: 'Analyse P-delta, autour de y',
    pDeltaZ: 'Analyse P-delta, autour de z',
    devie: 'Flexion déviée (§5.8.9)',
    verdict: 'Verdict',
    donnees: 'Données',
  },
  entrees: {
    section: 'section',
    materiaux: 'matériaux',
    longueurEffort: 'longueur libre, effort normal',
    methode: 'méthode',
    secondOrdre: 'second ordre',
  },
  note: {
    hypotheses: [
      'Élément isolé ; imperfection e_i = theta_i l_0 / 2 (§5.2(7)).',
      "Moments d'extrémité majorés de N × e_i ; moment équivalent M_0e = 0,6 M_02 + 0,4 M_01 >= 0,4 M_02 (§5.8.8.2(2)).",
      'Excentricité minimale e_0 = max(h/30 ; 20 mm) (§6.1(4)).',
      'Section : loi parabole-rectangle, acier à palier horizontal, béton déplacé par les barres déduit.',
      'P-delta : barre biarticulée équivalente de longueur l_0, rigidité nominale EI.',
      "Valeurs recommandées de l'EN 1992-1-1 ; aucune annexe nationale codée.",
    ],
    axes: { y: 'autour de y (dimension h)', z: 'autour de z (dimension b)' } as Record<Axe, string>,
    distributions: { parabolique: 'parabolique (c_0 = 9,6)', triangulaire: 'triangulaire (c_0 = 12)', constante: 'constante (c_0 = 8)' },
    souplesse: (k: string) => `souplesse k = ${k}`,
    encastree: 'encastrée (k = 0,1)',
    encastre: 'encastré (k = 0,1)',
    articulee: 'articulée',
    articule: 'articulé',
    l0Saisie: (axe: string) => `longueur efficace ${axe}, saisie`,
    l0Calculee: (axe: string) => `longueur efficace ${axe}, calculée (§5.8.3.2)`,
    contrevente: 'élément contreventé',
    nonContrevente: 'élément non contreventé',
    appuis: (element: string, tete: string, pied: string) => `${element}, tête ${tete}, pied ${pied}`,
    momentsExtremite: (axe: string) => `moments d'extrémité ${axe}, même signe = simple courbure`,
    valeursExtremite: (tete: string, pied: string) => `tête ${tete} ; pied ${pied} kN.m`,
    transversales: (axe: string, distribution: string) => `charges transversales ${axe}, distribution ${distribution}`,
    poteauRect: (b: string, h: string) => `Poteau ${b} x ${h} mm`,
    poteauCirc: (D: string) => `Poteau D = ${D} mm`,
    flexionY: 'Flexion autour de y',
    flexionZ: 'Flexion autour de z',
    flexionDeviee: 'Flexion déviée',
    clauseFlexion: '§5.8, §6.1',
    clauseDeviee: '§5.8.9, (5.39)',
    sectionLongueurs: 'Section et longueurs',
    longueurLibre: 'longueur libre du poteau',
    legendeSection: 'Section du poteau',
    materiaux: 'Matériaux',
    profil: (nom: string, date: string) => `Profil normatif : ${nom}, données consultées le ${date}.`,
    secondOrdreFluage: 'Second ordre et fluage',
    elementsVerticaux: "éléments verticaux contribuant à l'effet total (§5.2(5))",
    sollicitations: 'Sollicitations de calcul',
    effortNormal: 'effort normal de calcul, compression positive',
    legendeInteraction: "Diagramme d'interaction N-M et points de calcul",
    compression: 'Compression centrée',
  },
  dessins: {
    coupe: 'Coupe de la section',
    interaction: "Diagramme d'interaction",
    autourY: 'autour de y',
    autourZ: 'autour de z',
    compression: 'N (kN), compression vers le haut',
    point: 'M_Ed sous N_Ed',
    titrePoint: (nom: string, N: string, M: string) => `${nom} : N_Ed = ${N} kN, M_Ed = ${M} kN.m`,
  },
  messages: {
    valeurInattendue: 'Valeur inattendue dans le formulaire.',
    nombreAttendu: 'Un nombre est attendu dans le formulaire.',
    nouvelleVersion: 'Une nouvelle version est disponible. Recharger maintenant ?',
  },
};

type Textes = typeof FR;

const EN: Textes = {
  origines: { calcule: 'calculated', 'impose-par-la-norme': 'imposed by the code', defaut: 'default' },
  instable: 'unstable',
  deuxPoints: ': ',
  verdicts: { conforme: 'Satisfied', 'non-conforme': 'Not satisfied', instable: 'Unstable' },
  formes: { rectangulaire: 'rectangular', circulaire: 'circular' },
  methodes: { 'courbure-nominale': 'nominal curvature', 'rigidite-nominale': 'nominal stiffness' },
  direction: {
    lambda: (i) => `l_0 / i, i = ${i} mm`,
    secondOrdre: 'second order',
    negligeable: 'negligible',
    aPrendre: 'to be taken into account',
    imperfection: 'imperfection theta_i l_0 / 2; minimum eccentricity max(h/30 ; 20 mm)',
    extremites: 'end moments increased by N × e_i',
    equivalent: 'equivalent first order moment (5.8.8.2(2)) or M_0 + N × e_i',
    corrections: 'curvature correction factors (5.36), (5.37)',
    courbure: 'K_r K_phi eps_yd / (0.45 d)',
    MRd: (x) => `under N_Ed, neutral axis at ${x} mm`,
    taux: 'ratio',
  },
  pDelta: {
    negligeable: 'second order negligible: not applicable',
    rigidite: 'nominal stiffness not defined (rho < 0.2 %)',
    nonApplicable: 'not applicable',
    stabilisee: 'converged',
    nonStabilisee: 'not converged',
    Mmax: 'maximum moment M_0 + N_Ed y, equivalent pin-ended member of length l_0, nominal EI',
  },
  devie: {
    symbole: 'biaxial bending',
    dispensee: 'not required',
    sansObjet: 'not applicable',
    verifiee: 'verified',
    exposant: 'exponent of (5.39)',
    interaction: '(M_Edz / M_Rdz) to the power a + (M_Edy / M_Rdy) to the power a',
  },
  verdict: { constat: 'finding', libelle: 'verdict', compression: 'centred compression' },
  blocs: {
    flexionY: 'Bending about y (dimension h)',
    flexionZ: 'Bending about z (dimension b)',
    pDeltaY: 'P-delta analysis, about y',
    pDeltaZ: 'P-delta analysis, about z',
    devie: 'Biaxial bending (5.8.9)',
    verdict: 'Verdict',
    donnees: 'Data',
  },
  entrees: {
    section: 'section',
    materiaux: 'materials',
    longueurEffort: 'clear length, axial force',
    methode: 'method',
    secondOrdre: 'second order',
  },
  note: {
    hypotheses: [
      'Isolated member; imperfection e_i = theta_i l_0 / 2 (5.2(7)).',
      'End moments increased by N × e_i; equivalent moment M_0e = 0.6 M_02 + 0.4 M_01 >= 0.4 M_02 (5.8.8.2(2)).',
      'Minimum eccentricity e_0 = max(h/30 ; 20 mm) (6.1(4)).',
      'Section: parabola-rectangle diagram, steel with a horizontal top branch, concrete displaced by the bars deducted.',
      'P-delta: equivalent pin-ended member of length l_0, nominal stiffness EI.',
      'Recommended values of EN 1992-1-1; no National Annex coded.',
    ],
    axes: { y: 'about y (dimension h)', z: 'about z (dimension b)' },
    distributions: { parabolique: 'parabolic (c_0 = 9.6)', triangulaire: 'triangular (c_0 = 12)', constante: 'constant (c_0 = 8)' },
    souplesse: (k) => `relative flexibility k = ${k}`,
    encastree: 'fixed (k = 0.1)',
    encastre: 'fixed (k = 0.1)',
    articulee: 'pinned',
    articule: 'pinned',
    l0Saisie: (axe) => `effective length ${axe}, entered`,
    l0Calculee: (axe) => `effective length ${axe}, calculated (5.8.3.2)`,
    contrevente: 'braced member',
    nonContrevente: 'unbraced member',
    appuis: (element, tete, pied) => `${element}, top ${tete}, bottom ${pied}`,
    momentsExtremite: (axe) => `end moments ${axe}, same sign = single curvature`,
    valeursExtremite: (tete, pied) => `top ${tete} ; bottom ${pied} kN.m`,
    transversales: (axe, distribution) => `transverse loads ${axe}, ${distribution} distribution`,
    poteauRect: (b, h) => `Column ${b} x ${h} mm`,
    poteauCirc: (D) => `Column D = ${D} mm`,
    flexionY: 'Bending about y',
    flexionZ: 'Bending about z',
    flexionDeviee: 'Biaxial bending',
    clauseFlexion: '5.8, 6.1',
    clauseDeviee: '5.8.9, (5.39)',
    sectionLongueurs: 'Section and lengths',
    longueurLibre: 'clear length of the column',
    legendeSection: 'Section of the column',
    materiaux: 'Materials',
    profil: (nom, date) => `Code profile: ${nom}, data checked on ${date}.`,
    secondOrdreFluage: 'Second order and creep',
    elementsVerticaux: 'vertical members contributing to the total effect (5.2(5))',
    sollicitations: 'Design action effects',
    effortNormal: 'design axial force, compression positive',
    legendeInteraction: 'N-M interaction diagram and design points',
    compression: 'Centred compression',
  },
  dessins: {
    coupe: 'Cross-section',
    interaction: 'Interaction diagram',
    autourY: 'about y',
    autourZ: 'about z',
    compression: 'N (kN), compression upwards',
    point: 'M_Ed under N_Ed',
    titrePoint: (nom, N, M) => `${nom}: N_Ed = ${N} kN, M_Ed = ${M} kN.m`,
  },
  messages: {
    valeurInattendue: 'Unexpected value in the form.',
    nombreAttendu: 'A number is expected in the form.',
    nouvelleVersion: 'A new version is available. Reload now?',
  },
};

export function textes(): Textes {
  return langueCourante() === 'en' ? EN : FR;
}

/** « infini », « hors domaine » dans un morceau de phrase du noyau. */
const mots = (t: string): string => t.replace(/\binfini\b/g, 'infinite').replace(/hors domaine/g, 'out of range');

/** « flexion autour de y » -> « bending about y ». */
const flexion = (t: string): string => t.replace(/flexion autour de ([yz])/g, 'bending about $1');

/** Nom d'une grandeur dans les messages d'erreur du noyau. */
const GRANDEURS: Record<string, string> = {
  'La résistance caractéristique du béton f_ck': 'The characteristic compressive strength of concrete f_ck',
  "La limite d'élasticité f_yk": 'The yield strength f_yk',
  'La longueur l': 'The length l',
  'La longueur libre l': 'The clear length l',
  'La longueur efficace l_0': 'The effective length l_0',
  'Le coefficient de fluage phi(inf, t0)': 'The creep coefficient phi(inf, t0)',
  'Le rapport M_0Eqp / M_0Ed': 'The ratio M_0Eqp / M_0Ed',
  'La rigidité EI': 'The stiffness EI',
  "L'effort normal de compression N_Ed": 'The compressive axial force N_Ed',
  'Le diamètre des barres phi': 'The bar diameter phi',
  "La distance à l'axe des barres d prime": 'The distance to the bar axis d prime',
  'Le diamètre D': 'The diameter D',
  'La largeur b': 'The width b',
  'La hauteur h': 'The depth h',
};
const grandeur = (nom: string): string =>
  GRANDEURS[nom] ?? nom.replace(/^La souplesse k \((tete|pied)\)$/, (_t, b: string) => `The relative flexibility k (${b === 'tete' ? 'top' : 'bottom'})`);

/** « tete », « pied » : l'extremite dans les avertissements. */
const bout = (b: string): string => (b === 'tete' ? 'top' : 'bottom');

const EXACTES: Record<string, string> = {
  'Eurocode 2, valeurs recommandées': 'Eurocode 2, recommended values',
  'f_ck > 90 MPa : hors du domaine du tableau 3.1.': 'f_ck > 90 MPa: outside the range of Table 3.1.',
  "Le nombre d'éléments m doit être au moins 1 (-).": 'The number of members m must be at least 1 (-).',
  'Le rapport M_0Eqp / M_0Ed ne peut pas dépasser 1 (-).': 'The ratio M_0Eqp / M_0Ed cannot exceed 1 (-).',
  'fluage négligé : les trois conditions du §5.8.4(4) sont remplies': 'creep neglected: the three conditions of 5.8.4(4) are met',
  "saisie par l'utilisateur": 'entered by the user',
  'Élément non contreventé articulé aux deux extrémités : mécanisme, aucune longueur efficace.':
    'Unbraced member pinned at both ends: mechanism, no effective length.',
  'moments dus à des charges transversales : C = 0,7 imposé, r_m non employable': 'moments due to transverse loads: C = 0.7 imposed, r_m not applicable',
  'élément non contreventé : C = 0,7 imposé, r_m non employable': 'unbraced member: C = 0.7 imposed, r_m not applicable',
  'flèche divergente : instable sous la rigidité nominale': 'diverging deflection: unstable under the nominal stiffness',
  'sans objet : poteau instable': 'not applicable: unstable column',
  'Une section circulaire porte au moins 4 barres (-).': 'A circular section has at least 4 bars (-).',
  "La distance à l'axe des barres dépasse le rayon (mm).": 'The distance to the bar axis exceeds the radius (mm).',
  'Il faut au moins 2 barres par face (angles compris) (-).': 'At least 2 bars per face are required (corners included) (-).',
  "La distance à l'axe des barres dépasse la demi-dimension (mm).": 'The distance to the bar axis exceeds the half-dimension (mm).',
  "moment d'extrémité M_02 + N × e_i": 'end moment M_02 + N × e_i',
  'M_0Ed x amplification, rigidité nominale (5.28)': 'M_0Ed x amplification, nominal stiffness (5.28)',
  'instable : N_Ed >= N_B': 'unstable: N_Ed >= N_B',
};

/**
 * Traduit une phrase du noyau (motifs, origines, avertissements, erreurs).
 * En francais, la phrase sort intacte.
 */
export const phrase = traducteur(EXACTES, [
  [/^(.+) doit être un nombre strictement positif \((.+)\)\.$/, (_t, nom: string, u: string) => `${grandeur(nom)} must be a strictly positive number (${u}).`],
  [/^(.+) doit être un nombre positif ou nul \((.+)\)\.$/, (_t, nom: string, u: string) => `${grandeur(nom)} must be a positive number or zero (${u}).`],
  [
    /^flexion autour de ([yz]), (tete|pied) : encastrement compté avec k = (.+), minimum recommandé \(§(.+)\)\.$/,
    (_t, axe: string, b: string, k: string, clause: string) => `bending about ${axe}, ${bout(b)}: fixity taken with k = ${k}, recommended minimum (${clause}).`,
  ],
  [
    /^flexion autour de ([yz]), (tete|pied) : k = (.+) porté au minimum recommandé (.+) \(§(.+)\)\.$/,
    (_t, axe: string, b: string, k: string, kmin: string, clause: string) =>
      `bending about ${axe}, ${bout(b)}: k = ${k} raised to the recommended minimum ${kmin} (${clause}).`,
  ],
  [
    /^phi_ef = (.+) x (.+) ; fluage non négligeable \((.+)\)$/,
    (_t, a: string, b: string, manques: string) =>
      `phi_ef = ${a} x ${b}; creep not negligible (${manques.replace(/, plus petit que h = /g, ', smaller than h = ')})`,
  ],
  [
    /^élément (non )?contreventé, k1 = (.+), k2 = (.+), expression \((5\.1[56])\)$/,
    (_t, non: string | undefined, k1: string, k2: string, e: string) => `${non ? 'unbraced' : 'braced'} member, k1 = ${mots(k1)}, k2 = ${mots(k2)}, expression (${e})`,
  ],
  [/^rho = (.+) % < 0,2 % : la rigidité nominale du §5\.8\.7\.2\(2\) ne s'applique pas\.$/, 'rho = $1 % < 0.2 %: the nominal stiffness of 5.8.7.2(2) does not apply.'],
  [/^stabilisée en (\d+) itérations, flèche (.+) mm$/, 'converged in $1 iterations, deflection $2 mm'],
  [/^non stabilisée après (\d+) itérations$/, 'not converged after $1 iterations'],
  [/^N_Ed >= N_B = (.+) kN : instable$/, 'N_Ed >= N_B = $1 kN: unstable'],
  [/^excentricité minimale e_0 = (.+) mm \(§6\.1\(4\)\)$/, 'minimum eccentricity e_0 = $1 mm (6.1(4))'],
  [/^M_0Ed \+ M_2, courbure nominale \(5\.31\), c = (.+)$/, 'M_0Ed + M_2, nominal curvature (5.31), c = $1'],
  [/^(M_0e?|M_02) \+ N × e_i, second ordre négligeable$/, '$1 + N × e_i, second order negligible'],
  [
    /^lambda_y \/ lambda_z = (.+) dans \[0,5 ; 2\] et rapport des excentricités relatives (.+) hors de \]0,2 ; 5\[ : vérifications séparées \(§5\.8\.9\(3\)\)$/,
    (_t, a: string, b: string) => `lambda_y / lambda_z = ${a} within [0.5 ; 2] and ratio of the relative eccentricities ${mots(b)} outside ]0.2 ; 5[: separate checks (5.8.9(3))`,
  ],
  [
    /^(rapport des élancements hors de \[0,5 ; 2\]|excentricités relatives comparables) : interaction \(5\.39\), N_Ed \/ N_Rd = (.+), imperfection dans la direction la plus défavorable$/,
    (_t, cause: string, n: string) =>
      `${cause.startsWith('rapport') ? 'slenderness ratio outside [0.5 ; 2]' : 'comparable relative eccentricities'}: interaction (5.39), N_Ed / N_Rd = ${n}, imperfection in the most unfavourable direction`,
  ],
  [
    /^N_Ed atteint la charge critique nominale N_B \((flexion autour de [yz])\) : aucun moment de calcul fini\.$/,
    (_t, f: string) => `N_Ed reaches the nominal buckling load N_B (${flexion(f)}): no finite design moment.`,
  ],
  [
    /^Taux maximal (.+) : M_Ed \/ M_Rd = (.+) autour de y, (.+) autour de z(?:, flexion déviée (.+))?\.$/,
    (_t, max: string, y: string, z: string, devie?: string) =>
      `Maximum ratio ${mots(max)}: M_Ed / M_Rd = ${mots(y)} about y, ${mots(z)} about z${devie ? `, biaxial bending ${mots(devie)}` : ''}.`,
  ],
  [/^N_Ed = (.+) kN dépasse la compression centrée résistante N_Rd,max = (.+) kN\.$/, 'N_Ed = $1 kN exceeds the resistance to centred compression N_Rd,max = $2 kN.'],
  [/^N_Ed = (.+) kN dépasse la traction centrée résistante (.+) kN\.$/, 'N_Ed = $1 kN exceeds the resistance to centred tension $2 kN.'],
  [/^EN 1992-1-1:2004, valeur recommandée, (?:tableau )?(.+)$/, (_t, c: string) => `EN 1992-1-1:2004, recommended value, ${c.startsWith('§') ? c.slice(1) : `Table ${c}`}`],
]);
