// Central, editable engineering config.
export const MATERIALS = {
  steel: { label: "Structural Steel", E: 200, fb: 150, fv: 100 },
  timber: { label: "Timber", E: 10, fb: 10, fv: 1 },
  concrete: { label: "Concrete", E: 25, fb: 8, fv: 0.5 },
} as const; // E in GPa, allowable stresses in MPa

export const DEFLECTION_LIMITS = {
  "250": { label: "L/250", ratio: 250 },
  "360": { label: "L/360", ratio: 360 },
} as const;

export const LIMITS = {
  span: { min: 0.5, max: 30 }, // m
  load: { min: 0.1, max: 1000 }, // kN/m or kN
  b: { min: 50, max: 2000 }, // mm
  d: { min: 50, max: 3000 }, // mm
};

export type MaterialKey = keyof typeof MATERIALS;
export type DeflKey = keyof typeof DEFLECTION_LIMITS;
export type LoadType = "udl" | "point";

export interface BeamInput {
  project: string;
  L: number;
  loadType: LoadType;
  load: number;
  a: number;
  b: number;
  d: number;
  material: MaterialKey;
  defl: DeflKey;
}

export const SAMPLE: BeamInput = {
  project: "Sample Floor Beam",
  L: 5,
  loadType: "udl",
  load: 10,
  a: 2.5,
  b: 200,
  d: 400,
  material: "steel",
  defl: "360",
};
