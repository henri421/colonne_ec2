/**
 * Cablage de l'interface du poteau. Ce module ne calcule RIEN : il lit les
 * champs, appelle le noyau et confie la mise en forme a `form`, `vue`,
 * `dessins` et `export`, tous purs.
 */

import { blocsEnTexte, nombreAffiche, notationTexte, ouvrirOuTelecharger, resultatsEnCsv, svgAutonome, telecharger } from 'aedificium-ui';
import { beton, ec2Recommande, fyd, verifierColonne, type ResultatColonne } from '../../src/index';
import { champsDepuisModele, donneesDepuisModele, modeleDepuisChamps, modeleParDefaut, sectionDepuisModele, type ModeleSaisie } from './form';
import { courbeInteraction, dessinInteraction, dessinSection } from './dessins';
import { avertissementsHtml, blocEntrees, blocs, lignesDevie, lignesDirection, lignesPDelta, messageDErreur, tableHtml, verdictHtml } from './vue';
import { HYPOTHESES_NOTE, STYLES_TRACE, noteDeCalculHtml } from './export';
import './style.css';

function exige<T extends Element>(selecteur: string): T {
  const trouve = document.querySelector(selecteur);
  if (trouve === null) throw new Error(`élément absent de la page : ${selecteur}`);
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
  el.textContent = message === null ? '' : notationTexte(message);
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
    zones.avertissements.innerHTML = avertissementsHtml(r.avertissements);
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

document.addEventListener('click', (ev) => {
  const cible = ev.target;
  if (!(cible instanceof HTMLElement)) return;
  const action = cible.dataset.action;
  if (action === undefined || !action.startsWith('exporter-') || etat === null) return;
  const e = etat;
  // Un bouton par dessin : deux telechargements lances d'un meme clic, les
  // navigateurs bloquent le second, et le diagramme N-M ne sortait pas.
  if (action === 'exporter-section' || action === 'exporter-interaction') {
    const i = action === 'exporter-section' ? 0 : 1;
    const svg = e.dessins[i];
    if (svg !== undefined) telecharger(`colonne-${i === 0 ? 'section' : 'interaction'}.svg`, svgAutonome(svg, STYLES_TRACE), 'image/svg+xml;charset=utf-8');
  } else if (action === 'exporter-resultats') {
    telecharger('colonne-resultats.csv', resultatsEnCsv(blocsEnTexte([blocEntrees(e.modele), ...blocs(e.resultat)])), 'text/csv;charset=utf-8');
  } else if (action === 'exporter-note') {
    ouvrirOuTelecharger(
      'colonne-note.html',
      noteDeCalculHtml(
        {
          titre: `Poteau, N_Ed = ${nombreAffiche(e.modele.NEd)} kN`,
          date: new Date().toISOString().slice(0, 10),
          profil: `${PROFIL.nom} (${PROFIL.date})`,
          entrees: [blocEntrees(e.modele)],
          dessins: e.dessins,
          resultats: blocs(e.resultat),
          avertissements: e.resultat.avertissements,
          hypotheses: HYPOTHESES_NOTE,
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
