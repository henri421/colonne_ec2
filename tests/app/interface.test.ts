import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { JETONS, valeursDesJetons } from 'aedificium-ui';
import { beton, ec2Recommande, fyd, verifierColonne } from '../../src/index';
import { champsDepuisModele, donneesDepuisModele, modeleDepuisChamps, modeleParDefaut } from '../../app/src/form';
import { courbeInteraction, dessinInteraction, dessinSection } from '../../app/src/dessins';
import { blocs, lignesDirection, lignesPDelta } from '../../app/src/vue';
import { STYLES_TRACE, noteDeCalculHtml } from '../../app/src/export';
import { SECTION_400, poteau } from '../fixtures';

const P = ec2Recommande();

describe('saisie', () => {
  it('aller-retour champs -> modele -> champs', () => {
    const c = champsDepuisModele(modeleParDefaut());
    const l = modeleDepuisChamps(c);
    expect(l.ok).toBe(true);
    if (l.ok) expect(champsDepuisModele(l.modele)).toEqual(c);
  });

  it('longueurs saisies en metres, converties en mm pour le noyau', () => {
    const l = modeleDepuisChamps({ ...champsDepuisModele(modeleParDefaut()), l: '3,5', y_l0_mode: 'saisie', y_l0: '2,8' });
    if (!l.ok) throw new Error(l.message);
    const d = donneesDepuisModele(l.modele);
    expect(d.l).toBe(3500);
    expect(d.y.longueur).toEqual({ mode: 'saisie', l0: 2800 });
  });

  it('le modele par defaut se calcule', () => {
    expect(() => verifierColonne(donneesDepuisModele(modeleParDefaut()), P)).not.toThrow();
  });

  it('refus motive', () => {
    expect(modeleDepuisChamps({ ...champsDepuisModele(modeleParDefaut()), ned: 'abc' }).ok).toBe(false);
  });
});

describe('vues et dessins', () => {
  const r = verifierColonne(poteau(), P);

  it('les lignes disent si C est impose ou calcule', () => {
    expect(lignesDirection(r.y).find((l) => l.symbole === 'C')?.libelle).toContain('calcule');
  });

  it('P-delta sans objet quand le second ordre est negligeable', () => {
    expect(lignesPDelta(r.y)[0].valeur).toBe('non applicable');
    expect(lignesPDelta(r.z)[0].valeur).toBe('stabilisee');
  });

  it('un instable s ecrit « instable », jamais Infinity', () => {
    const ri = verifierColonne(poteau({ methode: 'rigidite-nominale', z: { longueur: { mode: 'saisie', l0: 16000 }, moments: { origine: 'extremites', M_tete: 20, M_pied: 20 } } }), P);
    const texte = JSON.stringify(blocs(ri));
    expect(texte).toContain('instable');
    expect(texte).not.toContain('Infinity');
  });

  it('courbe d interaction : de la traction centree a la compression centree', () => {
    const c = courbeInteraction(SECTION_400, beton(30, P), fyd(500, P), 'y');
    expect(Math.min(...c.map((p) => p.N))).toBeLessThan(-1000);
    expect(Math.max(...c.map((p) => p.N))).toBeGreaterThan(4000);
  });

  it('dessins sans NaN', () => {
    const b = beton(30, P);
    const f = fyd(500, P);
    const svg = dessinInteraction({ y: courbeInteraction(SECTION_400, b, f, 'y'), z: courbeInteraction(SECTION_400, b, f, 'z') }, r);
    expect(svg).not.toContain('NaN');
    expect(dessinSection(SECTION_400).match(/class="acier"/g)).toHaveLength(8);
  });

  it('le :root de style.css concorde avec les jetons communs', () => {
    const css = readFileSync(fileURLToPath(new URL('../../app/src/style.css', import.meta.url)), 'utf8');
    const page = valeursDesJetons(css);
    for (const [nom, valeur] of valeursDesJetons(JETONS)) expect(page.get(nom)).toBe(valeur);
  });

  it('la note porte le titre du poteau', () => {
    const html = noteDeCalculHtml({ titre: 'P1', date: '2026-10-03', profil: P.nom, entrees: [], dessins: [], resultats: blocs(r), avertissements: [], hypotheses: [] }, STYLES_TRACE);
    expect(html).toContain('poteau en beton arme');
  });
});
