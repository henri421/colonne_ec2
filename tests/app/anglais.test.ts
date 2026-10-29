/**
 * Version anglaise (lot 8.8) : page `en/index.html` de meme squelette que la
 * page francaise, et AUCUN reste de francais dans ce qui s'affiche en anglais
 * (ecran, dessins, note, CSV, messages). Le francais, lui, est couvert par
 * `finitions.test.ts`, inchange.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { blocsEnTexte, constatsAffichage, contenuBalise, definirLangue, noteDeCalculHtml, notationHtml, resultatsEnCsv, texteVisible } from 'aedificium-ui';
import { beton, ec2Recommande, fyd, verifierColonne } from '../../src/index';
import { champsDepuisModele, donneesDepuisModele, modeleDepuisChamps, modeleParDefaut, sectionDepuisModele, type ModeleSaisie } from '../../app/src/form';
import { courbeInteraction, dessinInteraction, dessinSection } from '../../app/src/dessins';
import { avertissementsHtml, blocEntrees, blocs, lignesDevie, lignesDirection, lignesPDelta, messageDErreur, tableHtml, verdictHtml } from '../../app/src/vue';
import { STYLES_TRACE } from '../../app/src/export';
import { noteDuCalcul } from '../../app/src/note';
import { textes } from '../../app/src/textes';
import { poteau } from '../fixtures';

const P = ec2Recommande();
const lire = (chemin: string): string => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), 'utf8');
const controler = (nom: string, html: string): string[] => constatsAffichage(texteVisible(html), { langue: 'en' }).map((c) => `${nom} : ${c}`);
/** CSV : la virgule y est le separateur, pas une virgule decimale. */
const controlerCsv = (nom: string, csv: string): string[] =>
  constatsAffichage(csv, { langue: 'en' })
    .filter((c) => !c.startsWith('virgule decimale'))
    .map((c) => `${nom} : ${c}`);

/** Squelette d'une page : les attributs que lit le script, dans l'ordre. */
function squelette(html: string): string[] {
  return [...html.matchAll(/\s(id|data-[a-z-]+|type|inputmode|accept|value)="([^"]*)"/g)].map((m) => `${m[1]}=${m[2]}`);
}

/** Les cas de `finitions.test.ts`, plus ceux qui passent par les autres phrases du noyau. */
function modeles(): ModeleSaisie[] {
  const d = modeleParDefaut();
  return [
    d,
    { ...d, methode: 'rigidite-nominale' },
    { ...d, forme: 'circulaire' },
    // Encastrements (avertissements), souplesse sous le minimum, non contreventement.
    { ...d, y: { ...d.y, tete: 'encastre', pied: 'souple', kPied: 0.05 }, z: { ...d.z, contreventement: 'non-contrevente', pied: 'encastre' } },
    // Charges transversales, fluage negligeable, second ordre negligeable.
    { ...d, NEd: 300, phiInf: 1.5, y: { ...d.y, origine: 'transversales', distribution: 'triangulaire', M0: 200 }, z: { ...d.z, origine: 'transversales', distribution: 'constante', M0: 5 } },
    // Flexion deviee calculee (elancements comparables, excentricites comparables).
    { ...d, y: { ...d.y, Mtete: 40, Mpied: 40 }, z: { ...d.z, Mtete: 40, Mpied: 40 } },
    // Longueur efficace saisie, rigidite nominale.
    { ...d, methode: 'rigidite-nominale', y: { ...d.y, l0Mode: 'saisie', l0: 6 } },
  ];
}

function sorties(): { ecran: string[]; notes: string[]; csv: string[] } {
  const ecran: string[] = [];
  const notes: string[] = [];
  const csv: string[] = [];
  for (const m of modeles()) {
    const r = verifierColonne(donneesDepuisModele(m), P);
    const s = sectionDepuisModele(m);
    const b = beton(m.fck, P);
    const f = fyd(m.fyk, P);
    const dessins = [dessinSection(s), dessinInteraction({ y: courbeInteraction(s, b, f, 'y'), z: courbeInteraction(s, b, f, 'z') }, r)];
    ecran.push(
      ...dessins,
      verdictHtml(r),
      avertissementsHtml(r.avertissements),
      tableHtml(lignesDirection(r.y)),
      tableHtml(lignesDirection(r.z)),
      tableHtml(lignesPDelta(r.y)),
      tableHtml(lignesPDelta(r.z)),
      tableHtml(lignesDevie(r))
    );
    notes.push(noteDeCalculHtml(noteDuCalcul(P, m, r, { section: dessins[0], interaction: dessins[1] }, { projet: 'Building', element: '', date: '2026-10-29' }), STYLES_TRACE));
    csv.push(resultatsEnCsv(blocsEnTexte([blocEntrees(m), ...blocs(r)])));
  }
  // Poteau instable : rigidite nominale, l_0 = 16 m.
  const ri = verifierColonne(
    poteau({ methode: 'rigidite-nominale', z: { longueur: { mode: 'saisie', l0: 16000, contreventement: 'contrevente' }, moments: { origine: 'extremites', M_tete: 20, M_pied: 20 } } }),
    P
  );
  ecran.push(verdictHtml(ri), avertissementsHtml(ri.avertissements), tableHtml(lignesDirection(ri.z)), tableHtml(lignesPDelta(ri.z)), tableHtml(lignesDevie(ri)));
  // Courbure nominale, poteau tres elance : P-delta sans stabilisation.
  const rc = verifierColonne(poteau({ z: { longueur: { mode: 'saisie', l0: 16000, contreventement: 'contrevente' }, moments: { origine: 'extremites', M_tete: 20, M_pied: 20 } } }), P);
  ecran.push(verdictHtml(rc), tableHtml(lignesPDelta(rc.z)), tableHtml(lignesDevie(rc)));
  return { ecran, notes, csv };
}

function erreur(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    return messageDErreur(e);
  }
  throw new Error('une erreur etait attendue');
}

describe('page anglaise', () => {
  const fr = lire('../../app/index.html');
  const en = lire('../../app/en/index.html');

  it('meme squelette que la page francaise', () => {
    expect(squelette(en)).toEqual(squelette(fr));
  });

  it('langue, script commun, liens entre les deux versions', () => {
    expect(en).toContain('<html lang="en">');
    expect(en).toContain('src="../src/main.ts"');
    expect(en).toMatch(/class="barre-langue" href="\.\.\/"/);
    expect(fr).toMatch(/class="barre-langue" href="en\/"/);
  });

  it('titre anglais, aucun reste de francais', () => {
    expect(contenuBalise(en, 'h1')).toBe('Reinforced concrete columns');
    expect(controler('page', en.replace(/lang="fr"[^>]*>FR</, '>'))).toEqual([]);
  });
});

describe('affichage en anglais', () => {
  beforeEach(() => definirLangue('en'));
  afterEach(() => definirLangue('fr'));

  it('ecran et dessins', () => {
    expect(sorties().ecran.flatMap((h, i) => controler(`ecran ${i}`, h))).toEqual([]);
  });

  it('note de calcul', () => {
    expect(sorties().notes.flatMap((h, i) => controler(`note ${i}`, h))).toEqual([]);
  });

  it('CSV', () => {
    expect(sorties().csv.flatMap((c, i) => controlerCsv(`csv ${i}`, c))).toEqual([]);
  });

  it('champs a point decimal', () => {
    expect(champsDepuisModele({ ...modeleParDefaut(), phiInf: 2.5 }).phi_inf).toBe('2.5');
  });

  it('messages et erreurs', () => {
    const champs = champsDepuisModele(modeleParDefaut());
    const sansNombre = modeleDepuisChamps({ ...champs, fck: '' });
    const inattendu = modeleDepuisChamps({ ...champs, forme: 'carree' });
    const messages = [
      sansNombre.ok ? '' : sansNombre.message,
      inattendu.ok ? '' : inattendu.message,
      erreur(() => verifierColonne(poteau({ N_Ed: 0 }), P)),
      erreur(() => verifierColonne(poteau({ N_Ed: 1e6 }), P)),
      erreur(() => verifierColonne(poteau({ fck: 100 }), P)),
      erreur(() => verifierColonne(poteau({ fck: -1 }), P)),
      erreur(() => verifierColonne(poteau({ fyk: 0 }), P)),
      erreur(() => verifierColonne(poteau({ l: 0 }), P)),
      erreur(() => verifierColonne(poteau({ m: 0 }), P)),
      erreur(() => verifierColonne(poteau({ phi_inf: -1 }), P)),
      erreur(() => verifierColonne(poteau({ rapportQuasiPermanent: 2 }), P)),
      erreur(() => verifierColonne(poteau({ rapportQuasiPermanent: -1 }), P)),
      erreur(() => verifierColonne(poteau({ section: { forme: 'rectangulaire', b: 0, h: 400, enrobageAxe: 50, nb: 3, nh: 3, phi: 20 } }), P)),
      erreur(() => verifierColonne(poteau({ section: { forme: 'rectangulaire', b: 400, h: 0, enrobageAxe: 50, nb: 3, nh: 3, phi: 20 } }), P)),
      erreur(() => verifierColonne(poteau({ section: { forme: 'rectangulaire', b: 400, h: 400, enrobageAxe: 50, nb: 1, nh: 3, phi: 20 } }), P)),
      erreur(() => verifierColonne(poteau({ section: { forme: 'rectangulaire', b: 400, h: 400, enrobageAxe: 250, nb: 3, nh: 3, phi: 20 } }), P)),
      erreur(() => verifierColonne(poteau({ section: { forme: 'rectangulaire', b: 400, h: 400, enrobageAxe: 50, nb: 3, nh: 3, phi: 0 } }), P)),
      erreur(() => verifierColonne(poteau({ section: { forme: 'rectangulaire', b: 400, h: 400, enrobageAxe: 0, nb: 3, nh: 3, phi: 20 } }), P)),
      erreur(() => verifierColonne(poteau({ section: { forme: 'circulaire', D: 0, enrobageAxe: 50, n: 8, phi: 20 } }), P)),
      erreur(() => verifierColonne(poteau({ section: { forme: 'circulaire', D: 400, enrobageAxe: 50, n: 3, phi: 20 } }), P)),
      erreur(() => verifierColonne(poteau({ section: { forme: 'circulaire', D: 400, enrobageAxe: 250, n: 8, phi: 20 } }), P)),
      erreur(() => verifierColonne(poteau({ y: { longueur: { mode: 'saisie', l0: 0, contreventement: 'contrevente' }, moments: { origine: 'extremites', M_tete: 0, M_pied: 0 } } }), P)),
      erreur(() =>
        verifierColonne(
          poteau({
            y: {
              longueur: { mode: 'calculee', contreventement: 'non-contrevente', tete: { mode: 'articule' }, pied: { mode: 'articule' } },
              moments: { origine: 'extremites', M_tete: 0, M_pied: 0 },
            },
          }),
          P
        )
      ),
      erreur(() =>
        verifierColonne(
          poteau({
            y: {
              longueur: { mode: 'calculee', contreventement: 'contrevente', tete: { mode: 'souple', k: -1 }, pied: { mode: 'articule' } },
              moments: { origine: 'extremites', M_tete: 0, M_pied: 0 },
            },
          }),
          P
        )
      ),
      erreur(() =>
        verifierColonne(
          poteau({
            methode: 'rigidite-nominale',
            section: { forme: 'rectangulaire', b: 800, h: 800, enrobageAxe: 50, nb: 2, nh: 2, phi: 12 },
            y: { longueur: { mode: 'saisie', l0: 16000, contreventement: 'contrevente' }, moments: { origine: 'extremites', M_tete: 60, M_pied: 60 } },
          }),
          P
        )
      ),
      textes().messages.nouvelleVersion,
    ];
    expect(messages.flatMap((m, i) => controler(`message ${i}`, notationHtml(m)))).toEqual([]);
  });
});
