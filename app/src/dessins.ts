/**
 * Dessins : coupe de la section avec ses barres, et diagramme d'interaction
 * N-M de chaque direction avec le point de calcul (N_Ed ; M_Ed).
 *
 * Module PUR : chaines SVG.
 */

import { echapper, nombreFr } from 'aedificium-ui';
import type { Axe, Beton, ResultatColonne, Section } from '../../src/index';
import { barres, efforts, hauteurFlexion } from '../../src/index';

/** Coupe de la section a l'echelle, axes y et z reperes. */
export function dessinSection(s: Section): string {
  const T = 260;
  const marge = 30;
  const L = s.forme === 'circulaire' ? s.D : Math.max(s.b, s.h);
  const e = (T - 2 * marge) / L;
  const cx = T / 2;
  const cy = T / 2;
  const forme =
    s.forme === 'circulaire'
      ? `<circle class="beton" cx="${cx}" cy="${cy}" r="${((s.D / 2) * e).toFixed(1)}"/>`
      : `<rect class="beton" x="${(cx - (s.b / 2) * e).toFixed(1)}" y="${(cy - (s.h / 2) * e).toFixed(1)}" width="${(s.b * e).toFixed(1)}" height="${(s.h * e).toFixed(1)}"/>`;
  const rayon = Math.max(2.5, (s.phi / 2) * e);
  const pts = barres(s)
    .map((b) => `<circle class="acier" cx="${(cx + b.y * e).toFixed(1)}" cy="${(cy - b.z * e).toFixed(1)}" r="${rayon.toFixed(1)}"/>`)
    .join('');
  const cotes =
    s.forme === 'circulaire'
      ? `<text class="cote" x="${cx}" y="${T - 6}">D = ${nombreFr(s.D, 0)} mm</text>`
      : `<text class="cote" x="${cx}" y="${T - 6}">b = ${nombreFr(s.b, 0)} mm (y)</text><text class="cote" x="12" y="${cy}" transform="rotate(-90 12 ${cy})">h = ${nombreFr(s.h, 0)} mm (z)</text>`;
  return `<svg class="schema-section" viewBox="0 0 ${T} ${T}" role="img" aria-label="Coupe de la section">${forme}${pts}<line class="axe" x1="${marge / 2}" y1="${cy}" x2="${T - marge / 2}" y2="${cy}"/><line class="axe" x1="${cx}" y1="${marge / 2}" x2="${cx}" y2="${T - marge / 2}"/><text class="axe-nom" x="${T - marge / 2 + 2}" y="${cy - 4}">y</text><text class="axe-nom" x="${cx + 4}" y="${marge / 2 + 2}">z</text>${cotes}</svg>`;
}

/** Courbe d'interaction (M >= 0) par balayage de l'axe neutre (kN, kN.m). */
export function courbeInteraction(s: Section, b: Beton, f_yd: number, axe: Axe): Array<{ N: number; M: number }> {
  const H = hauteurFlexion(s, axe);
  const pts: Array<{ N: number; M: number }> = [];
  for (let k = 0; k <= 240; k++) {
    const x = H * 10 ** (-3 + (6 * k) / 240);
    const r = efforts(s, b, f_yd, axe, x);
    pts.push({ N: r.N, M: Math.abs(r.M) });
  }
  return pts;
}

/** Diagramme N-M : une courbe par direction, et les points de calcul. */
export function dessinInteraction(courbes: Record<Axe, Array<{ N: number; M: number }>>, r: ResultatColonne): string {
  const W = 420;
  const H = 300;
  const g = 46;
  const tous = [...courbes.y, ...courbes.z];
  const Mmax = Math.max(...tous.map((p) => p.M), Number.isFinite(r.y.M_Ed) ? r.y.M_Ed : 0, Number.isFinite(r.z.M_Ed) ? r.z.M_Ed : 0) * 1.1;
  const Nmin = Math.min(...tous.map((p) => p.N));
  const Nmax = Math.max(...tous.map((p) => p.N)) * 1.05;
  const X = (M: number): number => g + (M / Mmax) * (W - g - 16);
  const Y = (N: number): number => H - g + -((N - Nmin) / (Nmax - Nmin)) * (H - g - 16);
  const trace = (pts: Array<{ N: number; M: number }>, cls: string): string =>
    `<polyline class="${cls}" points="${pts.map((p) => `${X(p.M).toFixed(1)},${Y(p.N).toFixed(1)}`).join(' ')}"/>`;
  const point = (M: number, cls: string, nom: string): string =>
    Number.isFinite(M)
      ? `<circle class="${cls}" cx="${X(M).toFixed(1)}" cy="${Y(r.N_Ed).toFixed(1)}" r="4.5"><title>${echapper(`${nom} : N_Ed = ${nombreFr(r.N_Ed, 0)} kN, M_Ed = ${nombreFr(M, 1)} kN.m`)}</title></circle>`
      : '';
  return `<svg class="schema-interaction" viewBox="0 0 ${W} ${H}" role="img" aria-label="Diagramme d interaction">
<line class="axe" x1="${g}" y1="${Y(0).toFixed(1)}" x2="${W - 10}" y2="${Y(0).toFixed(1)}"/>
<line class="axe" x1="${g}" y1="10" x2="${g}" y2="${H - g}"/>
${trace(courbes.y, 'courbe-y')}${trace(courbes.z, 'courbe-z')}
<line class="ned" x1="${g}" y1="${Y(r.N_Ed).toFixed(1)}" x2="${W - 10}" y2="${Y(r.N_Ed).toFixed(1)}"/>
${point(r.y.M_Ed, 'point-y', 'autour de y')}${point(r.z.M_Ed, 'point-z', 'autour de z')}
<text class="legende" x="${W - 12}" y="${(Y(0) - 6).toFixed(1)}" text-anchor="end">M (kN.m)</text>
<text class="legende" x="${g + 6}" y="20">N (kN), compression vers le haut</text>
<text class="legende" x="${g}" y="${H - g + 16}">0</text>
<text class="legende" x="${W - 12}" y="${H - g + 16}" text-anchor="end">${nombreFr(Mmax, 0)}</text>
<text class="legende" x="${g - 4}" y="${(Y(Nmax / 1.05) + 4).toFixed(1)}" text-anchor="end">${nombreFr(Nmax / 1.05, 0)}</text>
<text class="legende-y" x="${g + 6}" y="${H - 8}">— autour de y</text><text class="legende-z" x="${g + 120}" y="${H - 8}">— autour de z</text><text class="legende" x="${g + 234}" y="${H - 8}">● M_Ed sous N_Ed</text>
</svg>`;
}
