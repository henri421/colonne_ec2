/**
 * Profil normatif : parametres de l'EN 1992-1-1 soumis a l'annexe nationale
 * et utiles aux poteaux. Valeurs RECOMMANDEES par defaut (`ec2Recommande`),
 * chacune avec sa source ; aucune annexe nationale codee.
 *
 * Sans dimension sauf mention.
 */

export interface ValeurSourcee {
  valeur: number;
  source: string;
}

export interface ProfilEc2 {
  nom: string;
  date: string;
  /** Coefficient partiel du beton, tableau 2.1N. */
  gamma_C: ValeurSourcee;
  /** Coefficient partiel de l'acier, tableau 2.1N. */
  gamma_S: ValeurSourcee;
  /** Effets a long terme en compression, §3.1.6(1)P. */
  alpha_cc: ValeurSourcee;
  /** Coefficient partiel du module du beton pour la rigidite nominale, §5.8.6(3). */
  gamma_cE: ValeurSourcee;
  /** Inclinaison de base des imperfections theta_0, §5.2(5). */
  theta_0: ValeurSourcee;
  /** Rigidite relative minimale d'un encastrement k, §5.8.3.2(3). */
  k_min: ValeurSourcee;
  /** Facteur c de la courbure nominale, §5.8.8.2(4) (10, environ pi^2). */
  c_courbure: ValeurSourcee;
}

export function verifierProfil(p: ProfilEc2): void {
  for (const [nom, v] of Object.entries(p)) {
    if (nom === 'nom' || nom === 'date') continue;
    const vs = v as ValeurSourcee;
    if (!Number.isFinite(vs.valeur) || vs.valeur <= 0) {
      throw new Error(`Profil « ${p.nom} » : ${nom} doit être un nombre strictement positif.`);
    }
    if (typeof vs.source !== 'string' || vs.source.trim() === '') {
      throw new Error(`Profil « ${p.nom} » : ${nom} n'a pas de source. Une valeur de provenance inconnue bloque le calcul.`);
    }
  }
}

const EN = 'EN 1992-1-1:2004, valeur recommandée';

export function ec2Recommande(): ProfilEc2 {
  return {
    nom: 'Eurocode 2, valeurs recommandées',
    date: '2026-10-03',
    gamma_C: { valeur: 1.5, source: `${EN}, tableau 2.1N` },
    gamma_S: { valeur: 1.15, source: `${EN}, tableau 2.1N` },
    alpha_cc: { valeur: 1.0, source: `${EN}, §3.1.6(1)P` },
    gamma_cE: { valeur: 1.2, source: `${EN}, §5.8.6(3)` },
    theta_0: { valeur: 1 / 200, source: `${EN}, §5.2(5)` },
    k_min: { valeur: 0.1, source: `${EN}, §5.8.3.2(3) note` },
    c_courbure: { valeur: 10, source: `${EN}, §5.8.8.2(4)` },
  };
}

export function exigerPositif(valeur: number, nom: string, unite: string): number {
  if (!Number.isFinite(valeur) || valeur <= 0) {
    throw new Error(`${nom} doit être un nombre strictement positif (${unite}).`);
  }
  return valeur;
}

export function exigerPositifOuNul(valeur: number, nom: string, unite: string): number {
  if (!Number.isFinite(valeur) || valeur < 0) {
    throw new Error(`${nom} doit être un nombre positif ou nul (${unite}).`);
  }
  return valeur;
}

/** Retire les zeros de fin de la partie decimale, puis la virgule restee seule. */
function sansZeros(texte: string): string {
  return texte.includes(',') ? texte.replace(/,?0+$/, '') : texte;
}

/**
 * Nombre a la francaise pour les motifs affiches : trois decimales au plus,
 * sans zeros inutiles (« 1,5 » et non « 1,500 »), meme tiret qu'a l'ecran
 * pour un NaN ou un infini.
 */
export function fr(x: number, d: number): string {
  if (!Number.isFinite(x)) return '—';
  const texte = x.toFixed(Math.min(d, 3)).replace('.', ',');
  return sansZeros(/^-0(,0*)?$/.test(texte) ? texte.slice(1) : texte);
}

/**
 * Taux de travail affiche : meme arrondi VERS LE VERDICT que l'ecran (sous 1
 * par defaut, par exces au-dessus), puis sans zeros inutiles. Un motif ne doit
 * pas afficher « 1 » a cote d'un verdict defavorable.
 */
export function tauxFr(x: number, d = 3): string {
  if (!Number.isFinite(x)) return 'hors domaine';
  const decimales = Math.min(d, 3);
  if (x === 1) return fr(1, decimales);
  const f = 10 ** decimales;
  return fr((x < 1 ? Math.floor(x * f) : Math.ceil(x * f)) / f, decimales);
}
