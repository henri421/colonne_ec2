/**
 * Les sorties : styles du trace exporte.
 *
 * Tout ici est PUR — aucun `document`. Le telechargement vit dans
 * `aedificium-ui` (`telecharger`, `ouvrirOuTelecharger`), comme la note de
 * calcul commune (`noteDeCalculHtml`).
 */

import { JETONS } from 'aedificium-ui';

/**
 * Styles du trace, jetons compris : un document exporte ne voit pas la
 * feuille de la page, et les jetons seuls DEFINISSENT des couleurs sans en
 * appliquer aucune — le dessin sortirait en aplat noir. Les regles de
 * peinture de `style.css` sont donc recopiees ici ; toute evolution de l'une
 * doit etre reportee dans l'autre.
 */
export const STYLES_TRACE = `${JETONS}

svg { background: var(--surface); color-scheme: light; font-family: var(--sans); }
svg .beton { fill: var(--beton); stroke: var(--texte); stroke-width: 1.5; }
svg .acier { fill: var(--texte); }
svg .axe { stroke: var(--neutre); stroke-width: 1; stroke-dasharray: 5 4; }
svg .axe-nom { fill: var(--texte-faible); font-size: 12px; }
svg .cote { fill: var(--texte-doux); font-size: 11px; text-anchor: middle; font-family: var(--mono); }
svg .courbe-y { fill: none; stroke: var(--compression); stroke-width: 2; }
svg .courbe-z { fill: none; stroke: var(--accent); stroke-width: 2; stroke-dasharray: 6 4; }
svg .ned { stroke: var(--neutre); stroke-width: 1; stroke-dasharray: 2 3; }
svg .point-y { fill: var(--traction); }
svg .point-z { fill: var(--surface); stroke: var(--traction); stroke-width: 2; }
svg .legende { fill: var(--texte-doux); font-size: 11px; }
svg .legende-y { fill: var(--compression); font-size: 11px; }
svg .legende-z { fill: var(--accent); font-size: 11px; }`;
