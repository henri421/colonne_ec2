/**
 * Cablage de l'interface du poteau. Ce module ne calcule RIEN : il lit les
 * champs, appelle le noyau et confie la mise en forme a `form`, `vue`,
 * `dessins` et `export`, tous purs.
 */

import { echapper, ouvrirOuTelecharger, resultatsEnCsv, svgAutonome, telecharger, type BlocResultat } from 'aedificium-ui';
import { beton, ec2Recommande, fyd, verifierColonne, type ResultatColonne } from '../../src/index';
import { champsDepuisModele, donneesDepuisModele, modeleDepuisChamps, modeleParDefaut, sectionDepuisModele, type ModeleSaisie } from './form';
import { courbeInteraction, dessinInteraction, dessinSection } from './dessins';
import { blocs, lignesDevie, lignesDirection, lignesPDelta, messageDErreur, tableHtml, verdictHtml } from './vue';
import { STYLES_TRACE, noteDeCalculHtml } from './export';
import './style.css';

function exige<T extends Element>(selecteur: string): T {
  const trouve = document.querySelector(selecteur);
  if (trouve === null) throw new Error(`element absent de la page : ${selecteur}`);
  return trouve as T;
}

const PROFIL = ec2Recommande();
const formulaire = exige<HTMLFormElement>('#formulaire');
const role = (nom: string): HTMLElement => exige<HTMLElement>(`[data-role="${nom}"]`);
const zones = {
  erreurSaisie: role('erreur-saisie'),
  erreur: role('erreur'),
  avertissements: role('avertissements'),
  verdict: role('verdict'),
  section: role('section'),
  interaction: role('interaction'),
  dirY: role('dir-y'),
  dirZ: role('dir-z'),
  pdY: role('pd-y'),
  pdZ: role('pd-z'),
  devie: role('devie'),
};

function champs(): (HTMLInputElement | HTMLSelectElement)[] {
  return Array.from(formulaire.querySelectorAll('[data-champ]'));
}

function valeursDesChamps(): Record<string, string> {
  const v: Record<string, string> = {};
  for (const el of champs()) {
    const nom = el.getAttribute('data-champ');
    if (nom !== null) v[nom] = el.value;
  }
  return v;
}

function ecrireModele(m: ModeleSaisie): void {
  const v = champsDepuisModele(m);
  for (const el of champs()) {
    const nom = el.getAttribute('data-champ');
    if (nom !== null && v[nom] !== undefined) el.value = v[nom];
  }
}

function ajusterLesGroupes(m: ModeleSaisie): void {
  const vis: Record<string, boolean> = {
    rectangulaire: m.forme === 'rectangulaire',
    circulaire: m.forme === 'circulaire',
  };
  for (const p of ['y', 'z'] as const) {
    const s = m[p];
    vis[`${p}-l0-saisie`] = s.l0Mode === 'saisie';
    vis[`${p}-l0-calculee`] = s.l0Mode === 'calculee';
    vis[`${p}-k-tete`] = s.tete === 'souple';
    vis[`${p}-k-pied`] = s.pied === 'souple';
    vis[`${p}-extremites`] = s.origine === 'extremites';
    vis[`${p}-transversales`] = s.origine === 'transversales';
  }
  for (const [g, visible] of Object.entries(vis)) exige<HTMLElement>(`[data-groupe="${g}"]`).hidden = !visible;
}

function montrer(el: HTMLElement, message: string | null): void {
  el.textContent = message ?? '';
  el.hidden = message === null;
}

interface Etat {
  modele: ModeleSaisie;
  resultat: ResultatColonne;
  dessins: string[];
}

let etat: Etat | null = null;

/**
 * Recalcule et repeint. En cas d'echec, l'erreur s'affiche et le dernier
 * resultat valide reste en place, sous elle.
 */
function rafraichir(): void {
  const lecture = modeleDepuisChamps(valeursDesChamps());
  if (!lecture.ok) {
    montrer(zones.erreurSaisie, lecture.message);
    return;
  }
  montrer(zones.erreurSaisie, null);
  const m = lecture.modele;
  ajusterLesGroupes(m);
  try {
    const r = verifierColonne(donneesDepuisModele(m), PROFIL);
    const s = sectionDepuisModele(m);
    const b = beton(m.fck, PROFIL);
    const f = fyd(m.fyk, PROFIL);
    const svgSection = dessinSection(s);
    const svgInter = dessinInteraction({ y: courbeInteraction(s, b, f, 'y'), z: courbeInteraction(s, b, f, 'z') }, r);
    zones.verdict.innerHTML = verdictHtml(r);
    zones.avertissements.innerHTML = r.avertissements.map((a) => `<p class="alerte">${echapper(a)}</p>`).join('');
    zones.section.innerHTML = svgSection;
    zones.interaction.innerHTML = svgInter;
    zones.dirY.innerHTML = tableHtml(lignesDirection(r.y));
    zones.dirZ.innerHTML = tableHtml(lignesDirection(r.z));
    zones.pdY.innerHTML = tableHtml(lignesPDelta(r.y));
    zones.pdZ.innerHTML = tableHtml(lignesPDelta(r.z));
    zones.devie.innerHTML = tableHtml(lignesDevie(r));
    etat = { modele: m, resultat: r, dessins: [svgSection, svgInter] };
    montrer(zones.erreur, null);
  } catch (e) {
    montrer(zones.erreur, messageDErreur(e));
  }
}

function entrees(m: ModeleSaisie): BlocResultat {
  const section =
    m.forme === 'rectangulaire'
      ? `${m.b} x ${m.h} mm, ${2 * m.nb + 2 * m.nh - 4} HA${m.phi}, d' = ${m.enrobageAxe} mm`
      : `D = ${m.D} mm, ${m.n} HA${m.phi}, d' = ${m.enrobageAxe} mm`;
  return {
    titre: 'Donnees',
    lignes: [
      { symbole: 'section', libelle: m.forme, valeur: section },
      { symbole: 'f_ck / f_yk', libelle: 'materiaux', valeur: `${m.fck} / ${m.fyk} MPa` },
      { symbole: 'l, N_Ed', libelle: 'longueur libre, effort normal', valeur: `${m.l} m ; ${m.NEd} kN` },
      { symbole: 'phi(inf, t0)', libelle: `M_0Eqp / M_0Ed = ${m.rapport}`, valeur: String(m.phiInf) },
      { symbole: 'methode', libelle: 'second ordre', valeur: m.methode },
    ],
    note: null,
  };
}

document.addEventListener('click', (ev) => {
  const cible = ev.target;
  if (!(cible instanceof HTMLElement)) return;
  const action = cible.dataset.action;
  if (action === undefined || !action.startsWith('exporter-') || etat === null) return;
  const e = etat;
  if (action === 'exporter-dessins') {
    e.dessins.forEach((svg, i) => telecharger(`colonne-${i === 0 ? 'section' : 'interaction'}.svg`, svgAutonome(svg, STYLES_TRACE), 'image/svg+xml;charset=utf-8'));
  } else if (action === 'exporter-resultats') {
    telecharger('colonne-resultats.csv', resultatsEnCsv([entrees(e.modele), ...blocs(e.resultat)]), 'text/csv;charset=utf-8');
  } else if (action === 'exporter-note') {
    ouvrirOuTelecharger(
      'colonne-note.html',
      noteDeCalculHtml(
        {
          titre: `Poteau, N_Ed = ${e.modele.NEd} kN`,
          date: new Date().toISOString().slice(0, 10),
          profil: `${PROFIL.nom} (${PROFIL.date})`,
          entrees: [entrees(e.modele)],
          dessins: e.dessins,
          resultats: blocs(e.resultat),
          avertissements: e.resultat.avertissements,
          hypotheses: [
            'Element isole ; imperfection e_i = theta_i l_0 / 2 (§5.2(7)).',
            'Moments d extremite majores de N e_i ; moment equivalent M_0e = 0,6 M_02 + 0,4 M_01 >= 0,4 M_02 (§5.8.8.2(2)).',
            'Excentricite minimale e_0 = max(h/30 ; 20 mm) (§6.1(4)).',
            'Section : loi parabole-rectangle, acier a palier horizontal, beton deplace par les barres deduit.',
            'P-delta : barre biarticulee equivalente de longueur l_0, rigidite nominale EI.',
            'Valeurs recommandees de l EN 1992-1-1 ; aucune annexe nationale codee.',
          ],
        },
        STYLES_TRACE
      )
    );
  }
});

ecrireModele(modeleParDefaut());
formulaire.addEventListener('input', rafraichir);
formulaire.addEventListener('change', rafraichir);
rafraichir();

if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  void import('./pwa').then((m) => m.enregistrerServiceWorker());
}
