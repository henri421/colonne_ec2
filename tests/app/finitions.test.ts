/**
 * Tests d'acceptation de l'etape 8.2 (finitions) : notations, arrondis,
 * accents, titre, phrases types, sur le texte VISIBLE (ecran, dessins, note,
 * CSV, page). Le controle lui-meme vit dans aedificium-ui (`constatsAffichage`).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { NOMS_GRECS, notationHtml, blocsEnTexte, constatsAffichage, contenuBalise, noteDeCalculHtml, resultatsEnCsv, texteVisible } from 'aedificium-ui';
import { beton, ec2Recommande, fyd, verifierColonne } from '../../src/index';
import { donneesDepuisModele, modeleParDefaut, sectionDepuisModele, type ModeleSaisie } from '../../app/src/form';
import { courbeInteraction, dessinInteraction, dessinSection } from '../../app/src/dessins';
import {
  avertissementsHtml,
  blocEntrees,
  blocs,
  lignesDevie,
  lignesDirection,
  lignesPDelta,
  tableHtml,
  verdictHtml,
} from '../../app/src/vue';
import { STYLES_TRACE } from '../../app/src/export';
import { noteDuCalcul } from '../../app/src/note';
import { poteau } from '../fixtures';

const P = ec2Recommande();
const TITRE = 'Poteaux en béton armé';
const lire = (chemin: string): string => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), 'utf8');
const controler = (nom: string, html: string): string[] => constatsAffichage(texteVisible(html)).map((c) => `${nom} : ${c}`);

const MODELES: ModeleSaisie[] = [
  modeleParDefaut(),
  { ...modeleParDefaut(), methode: 'rigidite-nominale' },
  { ...modeleParDefaut(), forme: 'circulaire' },
];

function sorties() {
  const ecran: string[] = [];
  const notes: string[] = [];
  const csv: string[] = [];
  for (const m of MODELES) {
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
    const entrees = blocEntrees(m);
    notes.push(
      noteDeCalculHtml(
        noteDuCalcul(P, m, r, { section: dessins[0], interaction: dessins[1] }, { projet: 'Immeuble', element: '', date: '2026-10-24' }),
        STYLES_TRACE
      )
    );
    csv.push(resultatsEnCsv(blocsEnTexte([entrees, ...blocs(r)])));
  }
  // Poteau instable : le texte « instable » et ses motifs.
  const ri = verifierColonne(
    poteau({ methode: 'rigidite-nominale', z: { longueur: { mode: 'saisie', l0: 16000, contreventement: 'contrevente' }, moments: { origine: 'extremites', M_tete: 20, M_pied: 20 } } }),
    P
  );
  ecran.push(verdictHtml(ri), avertissementsHtml(ri.avertissements), tableHtml(lignesDirection(ri.z)), tableHtml(lignesPDelta(ri.z)));
  return { ecran, notes, csv };
}

function messageDe(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  throw new Error('une erreur etait attendue');
}

describe('texte visible : notations, arrondis, accents, phrases types', () => {
  const s = sorties();

  it('ecran et dessins', () => {
    expect(s.ecran.flatMap((h, i) => controler(`ecran ${i}`, h))).toEqual([]);
  });

  it('note de calcul', () => {
    expect(s.notes.flatMap((h, i) => controler(`note ${i}`, h))).toEqual([]);
  });

  it('page (index.html)', () => {
    expect(controler('page', lire('../../app/index.html'))).toEqual([]);
  });

  it('messages d erreur affiches (rendus par notationHtml, comme a l ecran)', () => {
    const m = messageDe(() => verifierColonne(poteau({ N_Ed: 0 }), P));
    expect(constatsAffichage(texteVisible(notationHtml(m)))).toEqual([]);
  });

  it('CSV : texte brut, ni « _ » ni nom de lettre grecque ni balise', () => {
    for (const c of s.csv) {
      expect(c).not.toContain('_');
      expect(c).not.toMatch(NOMS_GRECS);
      expect(c).not.toContain('<');
    }
  });
});

describe('rendu', () => {
  it('avertissements de l ecran : notation rendue, texte echappe', () => {
    expect(avertissementsHtml(['N_Ed < 0'])).toBe('<p class="alerte">N<sub>Ed</sub> &lt; 0</p>');
  });
});

describe('titre', () => {
  const page = lire('../../app/index.html');

  it('titre de la page sans tiret, majuscule initiale', () => {
    expect(contenuBalise(page, 'h1')).toBe(TITRE);
    expect(contenuBalise(page, 'title')?.startsWith(TITRE)).toBe(true);
  });

  it('titre en grand', () => {
    const regle = /(^|\n)h1\s*\{([^}]*)\}/.exec(lire('../../app/src/style.css'))?.[2] ?? '';
    expect(regle).toMatch(/font-size:\s*1\.75rem/);
    expect(regle).toMatch(/font-weight:\s*600/);
  });
});

describe('main.ts passe par les fonctions testees', () => {
  it('avertissements, entrees, hypotheses et CSV', () => {
    const main = lire('../../app/src/main.ts');
    expect(main).not.toContain('class="alerte"');
    expect(main).toContain('avertissementsHtml(');
    expect(main).toContain('blocEntrees(');
    expect(main).toContain('noteDuCalcul(');
    expect(main).toContain('blocsEnTexte(');
  });
});
