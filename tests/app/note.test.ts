/**
 * Tests d'acceptation du lot 8.7 : la note de calcul passe sur la note
 * commune d'aedificium-ui (cartouche, sections dans l'ordre fixe, figures
 * dans la section qu'elles illustrent, conclusions sans verdict global).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { noteDeCalculHtml, texteVisible, type ElementNote } from 'aedificium-ui';
import { beton, ec2Recommande, fyd, verifierColonne } from '../../src/index';
import { donneesDepuisModele, modeleParDefaut, sectionDepuisModele, type ModeleSaisie } from '../../app/src/form';
import { courbeInteraction, dessinInteraction, dessinSection } from '../../app/src/dessins';
import { blocs } from '../../app/src/vue';
import { HYPOTHESES_NOTE, noteDuCalcul } from '../../app/src/note';
import { STYLES_TRACE } from '../../app/src/export';

const P = ec2Recommande();
const lire = (chemin: string): string => readFileSync(fileURLToPath(new URL(chemin, import.meta.url)), 'utf8');
const CARTOUCHE = { projet: 'Immeuble R+4', element: 'Poteau P1', date: '2026-10-27' };

function calculer(m: ModeleSaisie, cartouche = CARTOUCHE) {
  const r = verifierColonne(donneesDepuisModele(m), P);
  const s = sectionDepuisModele(m);
  const b = beton(m.fck, P);
  const f = fyd(m.fyk, P);
  const dessins = { section: dessinSection(s), interaction: dessinInteraction({ y: courbeInteraction(s, b, f, 'y'), z: courbeInteraction(s, b, f, 'z') }, r) };
  const note = noteDuCalcul(P, m, r, dessins, cartouche);
  return { r, dessins, note, html: noteDeCalculHtml(note, STYLES_TRACE) };
}

const titresDeBlocs = (els: ElementNote[] | undefined): string[] =>
  (els ?? []).flatMap((e) => (e.type === 'bloc' ? [e.bloc.titre] : []));
const symboles = (els: ElementNote[] | undefined): string[] =>
  (els ?? []).flatMap((e) => (e.type === 'bloc' ? e.bloc.lignes.map((l) => l.symbole) : []));
const figures = (els: ElementNote[] | undefined) => (els ?? []).flatMap((e) => (e.type === 'figure' ? [e] : []));

const DEFAUT = modeleParDefaut();
const INSTABLE: ModeleSaisie = {
  ...DEFAUT,
  methode: 'rigidite-nominale',
  z: { ...DEFAUT.z, l0Mode: 'saisie', l0: 16, origine: 'extremites', Mtete: 20, Mpied: 20 },
};
const MODELES: ModeleSaisie[] = [DEFAUT, { ...DEFAUT, methode: 'rigidite-nominale' }, { ...DEFAUT, forme: 'circulaire' }];

describe('cartouche', () => {
  const { note } = calculer(DEFAUT);

  it('projet, element, date, norme et outil', () => {
    expect(note.cartouche).toEqual({ ...CARTOUCHE, norme: 'EN 1992-1-1:2004', outil: 'colonne-ec2' });
  });

  it('element vide : dimensions du poteau', () => {
    expect(calculer(DEFAUT, { ...CARTOUCHE, element: '' }).note.cartouche.element).toBe('Poteau 400 x 400 mm');
    expect(calculer({ ...DEFAUT, forme: 'circulaire' }, { ...CARTOUCHE, element: ' ' }).note.cartouche.element).toBe('Poteau D = 450 mm');
  });

  it('le texte du cartouche est echappe', () => {
    const { html } = calculer(DEFAUT, { ...CARTOUCHE, projet: 'Immeuble <test>' });
    expect(html).toContain('Immeuble &lt;test&gt;');
    expect(html).not.toContain('Immeuble <test>');
  });
});

describe('sections', () => {
  it('ordre fixe, toutes les sections presentes', () => {
    const titres = [...calculer(DEFAUT).html.matchAll(/<h2>([^<]*)<\/h2>/g)].map((x) => x[1]);
    expect(titres).toEqual(['1. Géométrie', '2. Matériaux', '3. Hypothèses', '4. Cas de charges', '5. Calculs et vérifications', '6. Conclusions']);
  });

  it('geometrie : section, longueur libre, longueurs efficaces, puis la section dessinee', () => {
    const { note, dessins } = calculer(DEFAUT);
    expect(symboles(note.sections.geometrie)).toEqual(['section', 'l', 'l_0 (y)', 'l_0 (z)']);
    const f = figures(note.sections.geometrie);
    expect(f).toHaveLength(1);
    expect(f[0].svg).toBe(dessins.section);
  });

  it('longueur efficace calculee : conditions d appui ; saisie : sa valeur', () => {
    const g = calculer(INSTABLE).note.sections.geometrie ?? [];
    const lignes = g.flatMap((e) => (e.type === 'bloc' ? e.bloc.lignes : []));
    const ly = lignes.find((l) => l.symbole === 'l_0 (y)');
    const lz = lignes.find((l) => l.symbole === 'l_0 (z)');
    expect(ly?.valeur).toContain('contreventé');
    expect(ly?.valeur).toContain('articulée');
    expect(lz?.valeur).toBe('16 m');
  });

  it('materiaux : f_ck et f_yk', () => {
    expect(symboles(calculer(DEFAUT).note.sections.materiaux)).toEqual(['f_ck / f_yk']);
  });

  it('hypotheses : profil, methode, fluage, m, liste', () => {
    const h = calculer(DEFAUT).note.sections.hypotheses ?? [];
    expect(h.some((e) => e.type === 'texte' && e.texte.includes(P.nom))).toBe(true);
    expect(symboles(h)).toEqual(['méthode', 'phi(inf, t0)', 'm']);
    expect(h.flatMap((e) => (e.type === 'liste' ? [e.items] : []))).toEqual([HYPOTHESES_NOTE]);
  });

  it('cas de charges : N_Ed et les moments des deux directions', () => {
    const c = calculer(DEFAUT).note.sections.charges ?? [];
    expect(symboles(c)).toEqual(['N_Ed', 'M (y)', 'M (z)']);
  });

  it('charges transversales : M_0 et sa distribution', () => {
    const m: ModeleSaisie = { ...DEFAUT, y: { ...DEFAUT.y, origine: 'transversales', M0: 30, distribution: 'parabolique' } };
    const lignes = (calculer(m).note.sections.charges ?? []).flatMap((e) => (e.type === 'bloc' ? e.bloc.lignes : []));
    const l = lignes.find((x) => x.symbole === 'M_0 (y)');
    expect(l?.valeur).toBe('30 kN.m');
    expect(l?.libelle).toContain('parabolique');
  });
});

describe('calculs', () => {
  it('les blocs de l ecran, sans le verdict, et la compression centree', () => {
    const { note } = calculer(DEFAUT);
    expect(titresDeBlocs(note.sections.calculs)).toEqual([
      'Flexion autour de y (dimension h)',
      'Flexion autour de z (dimension b)',
      'Analyse P-delta, autour de y',
      'Analyse P-delta, autour de z',
      'Flexion déviée (§5.8.9)',
      'Compression centrée',
    ]);
  });

  it('les lignes des blocs sont celles de l ecran et du CSV', () => {
    const { r, note } = calculer(DEFAUT);
    const ecran = blocs(r);
    const calc = (note.sections.calculs ?? []).flatMap((e) => (e.type === 'bloc' ? [e.bloc] : []));
    for (let i = 0; i < 5; i++) expect(calc[i].lignes).toEqual(ecran[i].lignes);
    expect(symboles([{ type: 'bloc', bloc: calc[5] }])).toEqual(['N_Rd,max']);
  });

  it('le diagramme N-M suit les deux flexions', () => {
    const { note, dessins } = calculer(DEFAUT);
    const c = note.sections.calculs ?? [];
    expect(c[2].type).toBe('figure');
    if (c[2].type === 'figure') expect(c[2].svg).toBe(dessins.interaction);
    expect(figures(c)).toHaveLength(1);
  });

  it('avertissements du noyau repris', () => {
    const { r, note } = calculer(INSTABLE);
    expect(note.avertissements).toEqual(r.avertissements);
  });
});

describe('conclusions', () => {
  for (const m of MODELES) {
    it(`taux du noyau, ${m.methode}, ${m.forme}`, () => {
      const { r, note } = calculer(m);
      expect(note.verifications.slice(0, 2).map((v) => [v.nom, v.taux])).toEqual([
        ['Flexion autour de y', r.y.taux],
        ['Flexion autour de z', r.z.taux],
      ]);
      expect(note.verifications).toHaveLength(r.devie.taux === null ? 2 : 3);
      if (r.devie.taux !== null) expect(note.verifications[2]).toEqual({ nom: 'Flexion déviée', clause: '§5.8.9, (5.39)', taux: r.devie.taux, ok: r.devie.taux <= 1 });
      expect(note.verifications.every((v) => v.ok)).toBe(r.verdict === 'conforme');
    });
  }

  it('aucun verdict global', () => {
    const t = texteVisible(calculer(DEFAUT).html);
    expect(t).not.toContain('Conforme');
    expect(t).not.toContain('Non conforme');
    expect(t).toContain('Vérification déterminante');
  });

  it('non conforme : non satisfaite', () => {
    const m: ModeleSaisie = { ...DEFAUT, y: { ...DEFAUT.y, Mtete: 400, Mpied: 400 } };
    const { r, note } = calculer(m);
    expect(r.verdict).toBe('non-conforme');
    expect(note.verifications[0].ok).toBe(false);
  });

  it('instable : hors domaine, non satisfaite, pas de flexion deviee', () => {
    const { r, note, html } = calculer(INSTABLE);
    expect(r.verdict).toBe('instable');
    const z = note.verifications.find((v) => v.nom === 'Flexion autour de z');
    expect(z?.ok).toBe(false);
    expect(Number.isFinite(z?.taux)).toBe(false);
    expect(note.verifications.some((v) => v.nom === 'Flexion déviée')).toBe(false);
    expect(texteVisible(html)).toContain('hors domaine');
    expect(texteVisible(html)).not.toContain('Instable');
  });
});

describe('cablage', () => {
  const main = lire('../../app/src/main.ts');
  const page = lire('../../app/index.html');
  const sorties = page.slice(page.indexOf('id="sorties"'), page.indexOf('</section>', page.indexOf('id="sorties"')));

  it('la note passe par noteDuCalcul et la note commune', () => {
    expect(main).toContain('noteDuCalcul(');
    expect(main).toMatch(/import \{[^}]*\bnoteDeCalculHtml\b[^}]*\} from 'aedificium-ui'/);
    expect(main).not.toMatch(/import \{[^}]*\bnoteDeCalculHtml\b[^}]*\} from '\.\/export'/);
  });

  it('champs projet et element dans les sorties, memorises', () => {
    expect(sorties).toContain('data-role="projet"');
    expect(sorties).toContain('data-role="element"');
    expect(main).toContain("'colonne-ec2:cartouche'");
  });

  it('l ancienne note locale a disparu', () => {
    const exp = lire('../../app/src/export.ts');
    expect(exp).not.toContain('function noteDeCalculHtml');
    expect(exp).not.toContain('HYPOTHESES_NOTE');
    expect(exp).toContain('export const STYLES_TRACE');
  });
});
