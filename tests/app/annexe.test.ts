/**
 * Tests d'acceptation du lot E (audit R4) : profil luxembourgeois prerempli,
 * coefficients modifiables par l'utilisateur, note qui montre l'annexe retenue.
 */

import { describe, expect, it } from 'vitest';
import { noteDeCalculHtml, texteVisible } from 'aedificium-ui';
import { ec2Recommande, verifierColonne } from '../../src/index';
import { COEFS, ec2Lu, profilDeCalcul, profilDeLAnnexe } from '../../app/src/annexe';
import { champsDepuisModele, donneesDepuisModele, modeleDepuisChamps, modeleParDefaut } from '../../app/src/form';
import { noteDuCalcul } from '../../app/src/note';

describe('profil luxembourgeois', () => {
  it('alpha_cc = 0,85 avec sa source AN-LU, les autres coefficients a la valeur recommandee', () => {
    const lu = ec2Lu();
    const rec = ec2Recommande();
    expect(lu.alpha_cc.valeur).toBe(0.85);
    expect(lu.alpha_cc.source).toMatch(/^ILNAS-EN 1992-1-1\/AN-LU:2020, 3\.1\.6\(1\)P : valeur présumée/);
    for (const k of COEFS.filter((c) => c !== 'alpha_cc')) {
      expect(lu[k].valeur).toBe(rec[k].valeur);
      expect(lu[k].source).toMatch(/AN-LU:2020.*recommandée présumée retenue/);
    }
    expect(lu.nom).toMatch(/Luxembourg/);
    expect(profilDeLAnnexe('recommande')).toEqual(rec);
  });

  it('une valeur changee par l utilisateur est marquee imposee, les autres gardent leur source', () => {
    const coefs = Object.fromEntries(COEFS.map((k) => [k, ec2Lu()[k].valeur])) as Record<(typeof COEFS)[number], number>;
    const p = profilDeCalcul('lu', { ...coefs, gamma_C: 1.4 });
    expect(p.gamma_C.valeur).toBe(1.4);
    expect(p.gamma_C.source).toMatch(/imposée/);
    expect(p.alpha_cc).toEqual(ec2Lu().alpha_cc);
  });
});

describe('saisie', () => {
  it('par defaut : valeurs recommandees, annexe dans les champs et relue', () => {
    const m = modeleParDefaut();
    expect(m.annexe).toBe('recommande');
    expect(m.coefs.alpha_cc).toBe(1);
    const champs = champsDepuisModele({ ...m, annexe: 'lu', coefs: { ...m.coefs, alpha_cc: 0.85 } });
    expect(champs['annexe']).toBe('lu');
    expect(champs['coef_alpha_cc']).toBe('0,85');
    const lu = modeleDepuisChamps(champs);
    expect(lu.ok && lu.modele.annexe).toBe('lu');
    expect(lu.ok && lu.modele.coefs.alpha_cc).toBe(0.85);
  });

  it('alpha_cc = 0,85 reduit la resistance (f_cd plus faible, taux plus fort)', () => {
    const m = modeleParDefaut();
    const rec = verifierColonne(donneesDepuisModele(m), profilDeCalcul('recommande', m.coefs));
    const coefsLu = Object.fromEntries(COEFS.map((k) => [k, ec2Lu()[k].valeur])) as typeof m.coefs;
    const lu = verifierColonne(donneesDepuisModele(m), profilDeCalcul('lu', coefsLu));
    expect(lu.y.taux).toBeGreaterThan(rec.y.taux);
  });
});

describe('note', () => {
  it('annexe retenue, coefficients et sources, avertissement tant que l annexe n est pas lue', () => {
    const m = { ...modeleParDefaut(), annexe: 'lu' as const };
    m.coefs = Object.fromEntries(COEFS.map((k) => [k, ec2Lu()[k].valeur])) as typeof m.coefs;
    const p = profilDeCalcul('lu', m.coefs);
    const r = verifierColonne(donneesDepuisModele(m), p);
    const dessins = { section: '', interaction: '' };
    const note = noteDuCalcul(p, m, r, dessins, { projet: 'P', element: 'E', date: '2026-11-17' });
    expect(note.avertissements?.[0]).toMatch(/^Annexe nationale luxembourgeoise/);
    const texte = texteVisible(noteDeCalculHtml(note, ''));
    expect(texte).toContain('Luxembourg');
    expect(texte).toContain('αcc');
    expect(texte).toMatch(/0,85/);
    expect(texte).toContain('ILNAS-EN 1992-1-1/AN-LU:2020, 3.1.6(1)P');
  });
});
