// Balance multipliers per fighter (D25), on top of each fighter's own data. Tuned by scripts/tune-balance.mjs against
// CPU round robins (every pairing, both sides, every stage; CPU level 9 with and without ultimates, and level 6) and
// checked with `npm run balance`. Applied once when the fighters are compiled (sim/data.ts), so the sim stays
// deterministic and every machine in an online match has the same numbers.
//   power:    all of this fighter's damage (and so knockback), multiplies FighterDef.power
//   reach:    attack range: every hitbox's radius and forward offset, grab boxes and projectile hitboxes
//   recovery: getting back to the stage: up-special lift and drift, air-jump speed, air speed
//   weight:   multiplies FighterDef.weight (heavier = flies less far, survives longer)

export interface Tuning {
  power?: number;
  reach?: number;
  recovery?: number;
  weight?: number;
}

export const TUNING: Record<string, Tuning> = {
  amp: { power: 1.015, reach: 1.023 },
  bouldar: { power: 0.94, reach: 1.005, recovery: 1.013 },
  chef: { power: 1.057, reach: 1.053 },
  clank: { power: 0.956, reach: 1.111, recovery: 1.229 },
  coral: { power: 1.065, reach: 1.044 },
  echo: { power: 0.985, reach: 1.005 },
  granny: { power: 0.985, reach: 1.007, recovery: 1.017 },
  hoot: { power: 0.997, reach: 1.012, recovery: 1.031 },
  inverta: { power: 1.025, reach: 1.026, recovery: 1.066 },
  kit: { power: 1.011, reach: 1.018 },
  nimbus: { power: 0.96, reach: 1.105, weight: 1.2 },
  ruby: { power: 1.002, reach: 1.016 },
  smudge: { power: 1.04, reach: 1.043 },
  tempo: { power: 0.965, reach: 1.002 },
  vesper: { power: 1.039, reach: 1.034 },
  zippy: { power: 0.984, reach: 1.001 },
};
