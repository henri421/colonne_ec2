# colonne-ec2

Poteaux en béton armé selon l'EN 1992-1-1 : **flambement et effets du second ordre**
(§5.8), **analyse P-Δ** itérative, **résistance de la section** à l'ELU et **flexion
déviée**.

Fait partie de la suite [Aedificium web](https://henri421.github.io/WebAedificium/).
Page publiée : <https://henri421.github.io/colonne_ec2/>.

> **Aide au calcul. L'outil constate, il ne prescrit pas** : il rend des moments de
> calcul et des taux de travail, jamais un ferraillage. Valeurs recommandées, sans
> annexe nationale. La vérification finale incombe à l'ingénieur du projet.

## Ce que l'outil rend, pour chaque direction

- **Longueur efficace** (§5.8.3.2), contreventé ou non, à partir des souplesses
  d'extrémité ; un encastrement est compté avec k = 0,1, **avertissement à l'appui** ; ou l₀ saisi.
- **Élancement limite** (§5.8.3.1) : A, B, C avec leur origine. L'origine des moments est
  **exigée** : des charges transversales ou un élément non contreventé **imposent C = 0,7**,
  et r_m n'est alors pas employé.
- **Imperfections** (§5.2) avec α_h calculé en mètres, **excentricité minimale** (§6.1(4)).
- **Fluage effectif** (§5.8.4) : les trois conditions de dispense sont testées, celle qui
  manque est nommée.
- **Courbure nominale** (§5.8.8) ou **rigidité nominale** (§5.8.7), au choix. N_Ed ≥ N_B rend
  un verdict **instable**, jamais un nombre aberrant.
- **P-Δ itérative** : barre biarticulée équivalente de longueur l₀, rigidité nominale, flèche
  recalculée jusqu'à stabilisation — recoupement numérique des méthodes simplifiées.
- **Résistance de section** M_Rd(N_Ed) : rectangulaire ou circulaire, loi parabole-rectangle,
  acier à palier horizontal, pivots B et C, béton déplacé par les barres déduit.
- **Flexion déviée** (§5.8.9) : dispense testée, sinon interaction (5.39), l'imperfection
  n'étant appliquée que dans la direction la plus défavorable.

Sorties : coupe de la section, diagramme d'interaction N-M avec les points de calcul, CSV,
note de calcul imprimable.

## Hors périmètre

Méthode générale (§5.8.6), effets globaux du second ordre des structures (§5.8.3.3),
sections autres que rectangulaires et circulaires, section variable, précontrainte,
dispositions constructives des poteaux (§9.5).

## Relation avec section-uls

Le plan d'origine plaçait le second ordre dans `section-uls`. Il vit dans son propre dépôt,
avec son propre calcul de résistance de section, limité à ce dont un poteau a besoin.

## Développement

```bash
npm install
npm run typecheck
npm test
npm run dev
```

Noyau pur dans `src/` (mm, kN, kN·m, MPa), interface dans `app/`. Cas validé :
[`docs/validation/poteau-400.md`](docs/validation/poteau-400.md).

## Licence

MIT — voir [LICENSE](LICENSE), sans garantie d'aucune sorte.
