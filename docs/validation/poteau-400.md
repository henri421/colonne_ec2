# Validation — poteau 400 × 400, 8 HA20, C30/37

Cas reproduit par `tests/second-ordre/verifier-colonne.test.ts`. Les valeurs ont été
recalculées indépendamment, formule par formule ; la résistance de section par une
intégration **analytique** de la parabole-rectangle, distincte de l'intégration par
bandes du code (écart inférieur à 0,2 %).

## Données

400 × 400 mm, d' = 50 mm, 8 HA20 (3 barres par face, A_s = 2 513 mm²), C30/37, B500,
l = l₀ = 4,00 m dans les deux directions, N_Ed = 1 500 kN, φ(∞, t₀) = 2,5,
M_0Eqp / M_0Ed = 0,6. Autour de y : M_tête = 60, M_pied = −30 kN·m (double courbure).
Autour de z : 20 et 20 kN·m (simple courbure).

## Grandeurs communes

- f_cd = 20 MPa, f_yd = 434,78 MPa ; i = 400 / √12 = 115,47 mm ; λ = 4 000 / 115,47 = **34,64**
- n = 1 500 000 / (160 000 × 20) = **0,46875** ; ω = 2 513 × 434,78 / (160 000 × 20) = **0,3415**
- l = 4 m : α_h = 2 / √4 = 1 ; θ_i = 1/200 ; e_i = 4 000 / 400 = **10 mm**, N e_i = 15 kN·m
- e₀ = max(400/30 ; 20) = 20 mm, N e₀ = 30 kN·m
- φ(∞, t₀) = 2,5 > 2 : fluage non négligeable, φ_ef = 2,5 × 0,6 = **1,5**
- A = 1 / (1 + 0,3) = 0,7692 ; B = √(1 + 2 × 0,3415) = 1,2973

## Autour de y

- r_m = −30 / 60 = −0,5 ; C = 1,7 + 0,5 = 2,2
- λ_lim = 20 × 0,7692 × 1,2973 × 2,2 / √0,46875 = **64,13** > 34,64 : second ordre négligeable
- M_02 = 60 + 15 = 75 ; M_01 = −30 + 15 = −15 ; M_Ed = max(75 ; M_0e = 39 ; 30) = **75 kN·m**

## Autour de z

- r_m = 1 : C = 0,7 ; λ_lim = **20,41** < 34,64 : second ordre à prendre en compte
- M_0e = 0,6 × 35 + 0,4 × 35 = 35 kN·m
- courbure nominale : d = h/2 + i_s = 200 + 129,90 = 329,90 mm ;
  K_r = (1,3415 − 0,46875) / (1,3415 − 0,4) = 0,9270 ;
  β = 0,35 + 0,15 − 34,64 / 150 = 0,2691 ; K_φ = 1 + 0,2691 × 1,5 = 1,4036 ;
  1/r = 0,9270 × 1,4036 × 0,002174 / (0,45 × 329,90) = 1,9052 × 10⁻⁵ /mm ;
  e₂ = 1,9052 × 10⁻⁵ × 4 000² / 10 = 30,48 mm ; M₂ = **45,73 kN·m** ;
  M_Ed = 35 + 45,73 = **80,73 kN·m**
- rigidité nominale : E_cm = 32 837 MPa, E_cd = 27 364 MPa ; k₁ = √1,5 = 1,2247 ;
  k₂ = 0,46875 × 34,64 / 170 = 0,0955 ; K_c = 1,2247 × 0,0955 / 2,5 = 0,0468 ;
  EI = 0,0468 × 27 364 × 2,133 × 10⁹ + 200 000 × 4,241 × 10⁷ = **11 214 kN·m²** ;
  N_B = π² × 11 214 / 16 = **6 917 kN** ; amplification = 1 + 1,2337 / (6 917 / 1 500 − 1) = **1,3416** ;
  M_Ed = 35 × 1,3416 = **46,96 kN·m**
- P-Δ itérative (EI nominale, barre biarticulée de 4 m, moment constant 35 kN·m) :
  amplification **1,344**, cohérente avec 1,3416 (l'expression 5.28 avec c₀ = 8 approche la
  solution exacte en sécante).

## Section

M_Rd sous N = 1 500 kN : **269,90 kN·m** (axe neutre à 223 mm). Taux autour de z en
courbure nominale : 80,73 / 269,90 = 0,299.

## Remarque

Les deux méthodes simplifiées donnent ici 80,7 et 47,0 kN·m. Elles ne sont pas censées
coïncider : la courbure nominale est connue pour être plus sévère sur les poteaux peu
élancés et fortement comprimés.
