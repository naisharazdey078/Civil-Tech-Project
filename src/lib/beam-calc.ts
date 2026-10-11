import { DEFLECTION_LIMITS, MATERIALS, type BeamInput } from "./beam-config";

export interface Check {
  name: "Bending" | "Shear" | "Deflection";
  actual: number;
  allowable: number;
  unit: string;
  ratio: number;
}

function core(inp: BeamInput, d: number) {
  const m = MATERIALS[inp.material];
  const Lmm = inp.L * 1000;
  const E = m.E * 1000; // N/mm²
  const I = (inp.b * d ** 3) / 12;
  const Z = (inp.b * d ** 2) / 6;
  let RA: number, RB: number, Mmax: number, Vmax: number, delta: number;
  if (inp.loadType === "udl") {
    const w = inp.load; // kN/m = N/mm
    RA = RB = (inp.load * inp.L) / 2; // kN
    Mmax = (inp.load * inp.L ** 2) / 8; // kNm
    Vmax = RA;
    delta = (5 * w * Lmm ** 4) / (384 * E * I);
  } else {
    const P = inp.load;
    const a = inp.a;
    const bb = inp.L - a;
    RA = (P * bb) / inp.L;
    RB = (P * a) / inp.L;
    Mmax = (P * a * bb) / inp.L;
    Vmax = Math.max(RA, RB);
    const c = Math.min(a, bb) * 1000;
    delta = (P * 1000 * c * (Lmm ** 2 - c ** 2) ** 1.5) / (9 * Math.sqrt(3) * Lmm * E * I);
  }
  const sb = (Mmax * 1e6) / Z;
  const tv = (1.5 * Vmax * 1000) / (inp.b * d);
  const dAllow = Lmm / DEFLECTION_LIMITS[inp.defl].ratio;
  const checks: Check[] = [
    { name: "Bending", actual: sb, allowable: m.fb, unit: "MPa", ratio: sb / m.fb },
    { name: "Shear", actual: tv, allowable: m.fv, unit: "MPa", ratio: tv / m.fv },
    { name: "Deflection", actual: delta, allowable: dAllow, unit: "mm", ratio: delta / dAllow },
  ];
  return { RA, RB, Mmax, Vmax, I, Z, checks };
}

export function analyze(inp: BeamInput) {
  const r = core(inp, inp.d);
  const points = Array.from({ length: 101 }, (_, i) => {
    const x = (inp.L * i) / 100;
    let V: number, M: number;
    if (inp.loadType === "udl") {
      V = r.RA - inp.load * x;
      M = r.RA * x - (inp.load * x * x) / 2;
    } else {
      V = x < inp.a ? r.RA : r.RA - inp.load;
      M = x < inp.a ? r.RA * x : r.RA * x - inp.load * (x - inp.a);
    }
    return { x: +x.toFixed(3), V: +V.toFixed(3), M: +M.toFixed(3) };
  });
  const governing = r.checks.reduce((p, c) => (c.ratio > p.ratio ? c : p));
  const safe = r.checks.every((c) => c.ratio <= 1);
  let suggestedD: number | null = null;
  if (!safe) {
    for (let d = 25; d <= 5000; d += 25) {
      if (core(inp, d).checks.every((c) => c.ratio <= 1)) {
        suggestedD = d;
        break;
      }
    }
  }
  return { ...r, points, governing, safe, suggestedD };
}
