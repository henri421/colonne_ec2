/**
 * Saisie : modele, lecture des champs, traduction vers le noyau. Module PUR.
 *
 * Unites de l'interface : longueurs en mm, sauf la longueur du poteau et
 * l_0 en m (plus naturel a saisir) ; efforts en kN, moments en kN.m.
 */

import { lireNombre } from 'aedificium-ui';
import type { DonneesColonne, DonneesDirection, Maintien, Section } from '../../src/index';

export type ModeMaintien = 'encastre' | 'articule' | 'souple';

export interface SaisieDirection {
  l0Mode: 'saisie' | 'calculee';
  /** l_0 saisi (m). */
  l0: number;
  contreventement: 'contrevente' | 'non-contrevente';
  tete: ModeMaintien;
  kTete: number;
  pied: ModeMaintien;
  kPied: number;
  origine: 'extremites' | 'transversales';
  Mtete: number;
  Mpied: number;
  M0: number;
  distribution: 'constante' | 'parabolique' | 'triangulaire';
}

export interface ModeleSaisie {
  forme: 'rectangulaire' | 'circulaire';
  b: number;
  h: number;
  D: number;
  enrobageAxe: number;
  nb: number;
  nh: number;
  n: number;
  phi: number;
  fck: number;
  fyk: number;
  /** Longueur libre (m). */
  l: number;
  NEd: number;
  m: number;
  phiInf: number;
  rapport: number;
  methode: 'courbure-nominale' | 'rigidite-nominale';
  y: SaisieDirection;
  z: SaisieDirection;
}

export type Lecture = { ok: true; modele: ModeleSaisie } | { ok: false; message: string };

/** Poteau de depart : 400 x 400, 8 HA20, C30/37, 4 m, 1 500 kN. */
export function modeleParDefaut(): ModeleSaisie {
  const dir = (Mtete: number, Mpied: number): SaisieDirection => ({
    l0Mode: 'calculee',
    l0: 4,
    contreventement: 'contrevente',
    tete: 'articule',
    kTete: 0.5,
    pied: 'articule',
    kPied: 0.5,
    origine: 'extremites',
    Mtete,
    Mpied,
    M0: 30,
    distribution: 'parabolique',
  });
  return {
    forme: 'rectangulaire',
    b: 400,
    h: 400,
    D: 450,
    enrobageAxe: 50,
    nb: 3,
    nh: 3,
    n: 8,
    phi: 20,
    fck: 30,
    fyk: 500,
    l: 4,
    NEd: 1500,
    m: 1,
    phiInf: 2.5,
    rapport: 0.6,
    methode: 'courbure-nominale',
    y: dir(60, -30),
    z: dir(20, 20),
  };
}

class ErreurDeSaisie extends Error {}

function choix<T extends string>(v: Record<string, string>, nom: string, permis: readonly T[]): T {
  const x = v[nom];
  if ((permis as readonly string[]).includes(x)) return x as T;
  throw new ErreurDeSaisie(`Valeur inattendue pour ${nom} : « ${x ?? ''} ».`);
}

function nombre(v: Record<string, string>, nom: string, requis: boolean, repli: number): number {
  const x = lireNombre(v[nom] ?? '');
  if (x === null) {
    if (requis) throw new ErreurDeSaisie(`${nom} : nombre attendu.`);
    return repli;
  }
  return x;
}

const MAINTIENS = ['encastre', 'articule', 'souple'] as const;

function lireDirection(v: Record<string, string>, p: 'y' | 'z', d: SaisieDirection): SaisieDirection {
  const l0Mode = choix(v, `${p}_l0_mode`, ['saisie', 'calculee'] as const);
  const tete = choix(v, `${p}_tete`, MAINTIENS);
  const pied = choix(v, `${p}_pied`, MAINTIENS);
  const origine = choix(v, `${p}_origine`, ['extremites', 'transversales'] as const);
  return {
    l0Mode,
    l0: nombre(v, `${p}_l0`, l0Mode === 'saisie', d.l0),
    contreventement: choix(v, `${p}_contreventement`, ['contrevente', 'non-contrevente'] as const),
    tete,
    kTete: nombre(v, `${p}_k_tete`, l0Mode === 'calculee' && tete === 'souple', d.kTete),
    pied,
    kPied: nombre(v, `${p}_k_pied`, l0Mode === 'calculee' && pied === 'souple', d.kPied),
    origine,
    Mtete: nombre(v, `${p}_m_tete`, origine === 'extremites', d.Mtete),
    Mpied: nombre(v, `${p}_m_pied`, origine === 'extremites', d.Mpied),
    M0: nombre(v, `${p}_m0`, origine === 'transversales', d.M0),
    distribution: choix(v, `${p}_distribution`, ['constante', 'parabolique', 'triangulaire'] as const),
  };
}

export function modeleDepuisChamps(v: Record<string, string>): Lecture {
  const d = modeleParDefaut();
  try {
    const forme = choix(v, 'forme', ['rectangulaire', 'circulaire'] as const);
    const rect = forme === 'rectangulaire';
    return {
      ok: true,
      modele: {
        forme,
        b: nombre(v, 'b', rect, d.b),
        h: nombre(v, 'h', rect, d.h),
        D: nombre(v, 'D', !rect, d.D),
        enrobageAxe: nombre(v, 'enrobage', true, d.enrobageAxe),
        nb: nombre(v, 'nb', rect, d.nb),
        nh: nombre(v, 'nh', rect, d.nh),
        n: nombre(v, 'n', !rect, d.n),
        phi: nombre(v, 'phi', true, d.phi),
        fck: nombre(v, 'fck', true, d.fck),
        fyk: nombre(v, 'fyk', true, d.fyk),
        l: nombre(v, 'l', true, d.l),
        NEd: nombre(v, 'ned', true, d.NEd),
        m: nombre(v, 'm', true, d.m),
        phiInf: nombre(v, 'phi_inf', true, d.phiInf),
        rapport: nombre(v, 'rapport', true, d.rapport),
        methode: choix(v, 'methode', ['courbure-nominale', 'rigidite-nominale'] as const),
        y: lireDirection(v, 'y', d.y),
        z: lireDirection(v, 'z', d.z),
      },
    };
  } catch (e) {
    if (e instanceof ErreurDeSaisie) return { ok: false, message: e.message };
    throw e;
  }
}

export function champsDepuisModele(m: ModeleSaisie): Record<string, string> {
  const n = (x: number): string => String(x).replace('.', ',');
  const dir = (p: 'y' | 'z', s: SaisieDirection): Record<string, string> => ({
    [`${p}_l0_mode`]: s.l0Mode,
    [`${p}_l0`]: n(s.l0),
    [`${p}_contreventement`]: s.contreventement,
    [`${p}_tete`]: s.tete,
    [`${p}_k_tete`]: n(s.kTete),
    [`${p}_pied`]: s.pied,
    [`${p}_k_pied`]: n(s.kPied),
    [`${p}_origine`]: s.origine,
    [`${p}_m_tete`]: n(s.Mtete),
    [`${p}_m_pied`]: n(s.Mpied),
    [`${p}_m0`]: n(s.M0),
    [`${p}_distribution`]: s.distribution,
  });
  return {
    forme: m.forme,
    b: n(m.b),
    h: n(m.h),
    D: n(m.D),
    enrobage: n(m.enrobageAxe),
    nb: n(m.nb),
    nh: n(m.nh),
    n: n(m.n),
    phi: n(m.phi),
    fck: n(m.fck),
    fyk: n(m.fyk),
    l: n(m.l),
    ned: n(m.NEd),
    m: n(m.m),
    phi_inf: n(m.phiInf),
    rapport: n(m.rapport),
    methode: m.methode,
    ...dir('y', m.y),
    ...dir('z', m.z),
  };
}

export function sectionDepuisModele(m: ModeleSaisie): Section {
  return m.forme === 'rectangulaire'
    ? { forme: 'rectangulaire', b: m.b, h: m.h, enrobageAxe: m.enrobageAxe, nb: m.nb, nh: m.nh, phi: m.phi }
    : { forme: 'circulaire', D: m.D, enrobageAxe: m.enrobageAxe, n: m.n, phi: m.phi };
}

function maintien(mode: ModeMaintien, k: number): Maintien {
  return mode === 'souple' ? { mode: 'souple', k } : { mode };
}

/** Facteur m vers mm pour les longueurs saisies en metres. */
const MM_PAR_M = 1000;

function direction(s: SaisieDirection): DonneesDirection {
  return {
    longueur:
      s.l0Mode === 'saisie'
        ? { mode: 'saisie', l0: s.l0 * MM_PAR_M }
        : { mode: 'calculee', contreventement: s.contreventement, tete: maintien(s.tete, s.kTete), pied: maintien(s.pied, s.kPied) },
    moments:
      s.origine === 'extremites'
        ? { origine: 'extremites', M_tete: s.Mtete, M_pied: s.Mpied }
        : { origine: 'transversales', M_0: s.M0, distribution: s.distribution },
  };
}

export function donneesDepuisModele(m: ModeleSaisie): DonneesColonne {
  return {
    section: sectionDepuisModele(m),
    fck: m.fck,
    fyk: m.fyk,
    l: m.l * MM_PAR_M,
    N_Ed: m.NEd,
    y: direction(m.y),
    z: direction(m.z),
    phi_inf: m.phiInf,
    rapportQuasiPermanent: m.rapport,
    m: m.m,
    methode: m.methode,
  };
}
