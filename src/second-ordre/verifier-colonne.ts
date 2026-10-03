/**
 * Orchestration : poteau en beton arme sous effort normal et flexion,
 * EN 1992-1-1 §5.8, verification de section §6.1, flexion deviee §5.8.9.
 *
 * Unites : mm, kN, kN.m, MPa.
 *
 * Chaque direction est traitee separement (elancement, imperfection, second
 * ordre, moment resistant), puis la flexion deviee est verifiee — ou declaree
 * dispensee avec son motif. L'analyse P-delta est rendue en recoupement
 * numerique de la methode choisie.
 */

import type { DonneesColonne, DonneesDirection, ResultatColonne, ResultatDirection } from '../domaines/resultat';
import type { ProfilEc2 } from '../norms/profil';
import { exigerPositif, fr, verifierProfil } from '../norms/profil';
import { beton, fyd as fydDe, type Beton } from '../materiaux/materiaux';
import type { Axe } from '../section/geometrie';
import { aireAcier, aireBeton, hauteurFlexion, hauteurUtileCourbure, inertieAcier, inertieBeton, rayonDeGiration } from '../section/geometrie';
import { NRdDevie, compressionMaximale, momentResistant } from '../section/resistance';
import { elancementLimite, longueurEfficace, momentsOrdonnes } from './longueur-et-elancement';
import { excentriciteMinimale, fluageEffectif, imperfection } from './imperfections-et-fluage';
import { coefficientC0, courbureNominale, pDelta, rigiditeNominale, type FormeMoment } from './methodes';

interface Contexte {
  d: DonneesColonne;
  profil: ProfilEc2;
  b: Beton;
  f_yd: number;
  Ac: number;
  As: number;
  avert: string[];
}

/** Traitement d'une direction ; `avecImperfection` sert a la flexion deviee (§5.8.9(2)). */
function direction(ctx: Contexte, axe: Axe, dd: DonneesDirection, avecImperfection: boolean): ResultatDirection {
  const { d, profil, b, f_yd, Ac, As } = ctx;
  const s = d.section;
  const H = hauteurFlexion(s, axe);
  const NEd = d.N_Ed;
  const nom = axe === 'y' ? 'flexion autour de y' : 'flexion autour de z';
  const avertDir: string[] = [];
  const { l0, origine: origineL0 } = longueurEfficace(dd.longueur, d.l, profil, avertDir);
  for (const a of avertDir) ctx.avert.push(`${nom}, ${a}`);
  const i = rayonDeGiration(s, axe);
  const lambda = l0 / i;
  const n = (NEd * 1000) / (Ac * b.fcd);
  const omega = (As * f_yd) / (Ac * b.fcd);

  // Moments du premier ordre, imperfection comprise (§5.2(7), element isole).
  const imp = imperfection(d.l, l0, d.m, profil);
  const e_i = avecImperfection ? imp.e_i : 0;
  const Mi = (NEd * e_i) / 1000;
  const e_0 = excentriciteMinimale(H);
  const Mmin = (NEd * e_0) / 1000;

  let M01 = 0;
  let M02 = 0;
  let M0Ed: number;
  let forme: FormeMoment;
  let M0premier: number;
  if (dd.moments.origine === 'extremites') {
    const o = momentsOrdonnes(dd.moments.M_tete, dd.moments.M_pied);
    M0premier = o.M02;
    M02 = o.M02 + Mi;
    M01 = o.M01 + Mi;
    // Moment equivalent, §5.8.8.2(2) : M_0e = 0,6 M_02 + 0,4 M_01 >= 0,4 M_02.
    M0Ed = Math.max(0.6 * M02 + 0.4 * M01, 0.4 * M02);
    forme = 'constante';
  } else {
    M0premier = Math.abs(dd.moments.M_0);
    M0Ed = M0premier + Mi;
    forme = dd.moments.distribution;
  }

  const fl = fluageEffectif(d.phi_inf, d.rapportQuasiPermanent, lambda, Math.max(M0premier, Mmin), NEd, H);
  const contrevente = dd.longueur.mode === 'saisie' || dd.longueur.contreventement === 'contrevente';
  const lim = elancementLimite(fl.phi_ef, omega, n, dd.moments, contrevente);
  const negligeable = lambda <= lim.lambda_lim;

  // Rigidite nominale : employee par la methode du meme nom, et toujours
  // pour la P-delta quand elle est definie.
  let rig: ReturnType<typeof rigiditeNominale> | null = null;
  let motifRig = '';
  try {
    rig = rigiditeNominale({
      fck: d.fck,
      Ecm: b.Ecm,
      gamma_cE: profil.gamma_cE.valeur,
      Ic: inertieBeton(s, axe),
      Is: inertieAcier(s, axe),
      rho: As / Ac,
      n,
      lambda,
      phi_ef: fl.phi_ef,
      l0,
      c0: dd.moments.origine === 'extremites' ? 8 : coefficientC0(dd.moments.distribution),
      NEd,
    });
  } catch (e) {
    motifRig = e instanceof Error ? e.message : String(e);
  }

  let courbure: ResultatDirection['courbure'] = null;
  let rigidite: ResultatDirection['rigidite'] = null;
  let instable = false;
  let M_Ed: number;
  let origineMEd: string;
  const candidats: Array<[number, string]> = [[Mmin, `excentricite minimale e_0 = ${fr(e_0, 0)} mm (§6.1(4))`]];
  if (dd.moments.origine === 'extremites') candidats.push([M02, 'moment d extremite M_02 + N e_i']);

  if (negligeable) {
    candidats.push([M0Ed, dd.moments.origine === 'extremites' ? 'M_0e + N e_i, second ordre negligeable' : 'M_0 + N e_i, second ordre negligeable']);
  } else if (d.methode === 'courbure-nominale') {
    courbure = courbureNominale({
      fyd: f_yd,
      d: hauteurUtileCourbure(s, axe),
      n,
      omega,
      fck: d.fck,
      lambda,
      phi_ef: fl.phi_ef,
      l0,
      c: profil.c_courbure.valeur,
      NEd,
    });
    candidats.push([M0Ed + courbure.M_2, 'M_0Ed + M_2, courbure nominale (5.31)']);
  } else {
    if (rig === null) throw new Error(motifRig);
    rigidite = { EI: rig.EI, N_B: rig.N_B, beta: rig.beta, amplification: rig.amplification };
    if (rig.instable) {
      instable = true;
    } else {
      candidats.push([M0Ed * rig.amplification, 'M_0Ed x amplification, rigidite nominale (5.28)']);
    }
  }
  [M_Ed, origineMEd] = candidats.reduce((a, c) => (c[0] > a[0] ? c : a));

  const pd =
    rig !== null && !rig.instable && !negligeable
      ? pDelta(M0Ed, forme, NEd, rig.EI, l0)
      : rig !== null && rig.instable && !negligeable
        ? { converge: false, iterations: 0, M_max: Infinity, amplification: Infinity, motif: `N_Ed >= N_B = ${fr(rig.N_B, 0)} kN : instable` }
        : null;

  const res = momentResistant(s, b, f_yd, axe, NEd);
  const M_Rd = Math.abs(res.M);
  return {
    axe,
    l0,
    origineL0,
    i,
    lambda,
    n,
    omega,
    phi_ef: fl.phi_ef,
    motifFluage: fl.motif,
    A: lim.A,
    B: lim.B,
    C: lim.C,
    origines: lim.origines,
    motifC: lim.motifC,
    lambda_lim: lim.lambda_lim,
    negligeable,
    e_i,
    e_0,
    M_01: M01,
    M_02: M02,
    M_0Ed: M0Ed,
    courbure,
    rigidite,
    pDelta: pd,
    instable,
    M_Ed: instable ? Infinity : M_Ed,
    origineMEd: instable ? 'instable : N_Ed >= N_B' : origineMEd,
    M_Rd,
    x: res.x,
    taux: instable ? Infinity : M_Ed / M_Rd,
  };
}

/** Exposant a de la flexion deviee, expression (5.39) : 1 a N/N_Rd = 0,1, 1,5 a 0,7, 2 a 1, interpolation ; 2 pour une section circulaire. */
export function exposantDevie(rapport: number, circulaire: boolean): number {
  if (circulaire) return 2;
  if (rapport <= 0.1) return 1;
  if (rapport <= 0.7) return 1 + ((rapport - 0.1) / 0.6) * 0.5;
  if (rapport <= 1) return 1.5 + ((rapport - 0.7) / 0.3) * 0.5;
  return 2;
}

export function verifierColonne(d: DonneesColonne, profil: ProfilEc2): ResultatColonne {
  verifierProfil(profil);
  exigerPositif(d.N_Ed, 'L effort normal de compression N_Ed', 'kN');
  const b = beton(d.fck, profil);
  const f_yd = fydDe(d.fyk, profil);
  const ctx: Contexte = { d, profil, b, f_yd, Ac: aireBeton(d.section), As: aireAcier(d.section), avert: [] };
  const N_Rd_max = compressionMaximale(d.section, b, f_yd);

  const y = direction(ctx, 'y', d.y, true);
  const z = direction(ctx, 'z', d.z, true);

  // Flexion deviee, §5.8.9 : dispense (5.38a) et (5.38b), sinon (5.39).
  const ly = y.lambda;
  const lz = z.lambda;
  const ey = y.M_Ed / d.N_Ed / hauteurFlexion(d.section, 'y');
  const ez = z.M_Ed / d.N_Ed / hauteurFlexion(d.section, 'z');
  const elancements = ly / lz <= 2 && lz / ly <= 2;
  const rapportEx = ez === 0 ? Infinity : ey / ez;
  const excentricites = rapportEx <= 0.2 || rapportEx >= 5;
  let devie: ResultatColonne['devie'];
  if (y.instable || z.instable) {
    devie = { dispense: false, motif: 'sans objet : poteau instable', a: null, taux: null };
  } else if (elancements && excentricites) {
    devie = {
      dispense: true,
      motif: `lambda_y / lambda_z = ${fr(ly / lz, 2)} dans [0,5 ; 2] et rapport des excentricites relatives ${Number.isFinite(rapportEx) ? fr(rapportEx, 2) : 'infini'} hors de ]0,2 ; 5[ : verifications separees (§5.8.9(3))`,
      a: null,
      taux: null,
    };
  } else {
    // Imperfection dans la seule direction la plus defavorable (§5.8.9(2)) :
    // les deux cas sont evalues, le plus defavorable est retenu.
    const ySans = direction({ ...ctx, avert: [] }, 'y', d.y, false);
    const zSans = direction({ ...ctx, avert: [] }, 'z', d.z, false);
    const NRd = NRdDevie(d.section, b, f_yd);
    const a = exposantDevie(d.N_Ed / NRd, d.section.forme === 'circulaire');
    const t1 = (y.M_Ed / y.M_Rd) ** a + (zSans.M_Ed / z.M_Rd) ** a;
    const t2 = (ySans.M_Ed / y.M_Rd) ** a + (z.M_Ed / z.M_Rd) ** a;
    devie = {
      dispense: false,
      motif: `${!elancements ? 'rapport des elancements hors de [0,5 ; 2]' : 'excentricites relatives comparables'} : interaction (5.39), N_Ed / N_Rd = ${fr(d.N_Ed / NRd, 3)}, imperfection dans la direction la plus defavorable`,
      a,
      taux: Math.max(t1, t2),
    };
  }

  let verdict: ResultatColonne['verdict'];
  let motif: string;
  if (y.instable || z.instable) {
    verdict = 'instable';
    motif = `N_Ed atteint la charge critique nominale N_B (${y.instable ? 'flexion autour de y' : 'flexion autour de z'}) : aucun moment de calcul fini.`;
  } else {
    const tauxMax = Math.max(y.taux, z.taux, devie.taux ?? 0);
    verdict = tauxMax <= 1 ? 'conforme' : 'non-conforme';
    motif = `Taux maximal ${fr(tauxMax, 3)} : M_Ed / M_Rd = ${fr(y.taux, 3)} autour de y, ${fr(z.taux, 3)} autour de z${devie.taux === null ? '' : `, flexion deviee ${fr(devie.taux, 3)}`}.`;
  }
  return { verdict, motif, methode: d.methode, N_Ed: d.N_Ed, N_Rd_max, y, z, devie, avertissements: ctx.avert };
}
