import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  Area, AreaChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { DEFLECTION_LIMITS, LIMITS, MATERIALS, SAMPLE, type BeamInput } from "@/lib/beam-config";
import { analyze, type Check } from "@/lib/beam-calc";
import { BG, PageBackground } from "@/components/PageBackground";
import { useServerFn } from "@tanstack/react-start";
import { suggestBeamInputs } from "@/lib/ai/suggest.functions";

const HERO =
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=60";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BeamCheck - Beam Design Checker" },
      { name: "description", content: "Check your beam in seconds: bending, shear and deflection checks with SFD and BMD." },
      { property: "og:title", content: "BeamCheck - Beam Design Checker" },
      { property: "og:description", content: "Check your beam in seconds: bending, shear and deflection checks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: HERO },
      { name: "twitter:image", content: HERO },
    ],
  }),
  component: App,
});

const TOTAL = 7;
const fmt = (n: number, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");

function App() {
  const [step, setStep] = useState(0); // 0 landing, 1-5 inputs, 6 review, 7 results
  const [v, setV] = useState<BeamInput>(SAMPLE);
  const [err, setErr] = useState<Partial<Record<"project" | "L" | "load" | "a" | "b" | "d", string>>>({});
  const set = <K extends keyof BeamInput>(k: K, val: BeamInput[K]) => setV((p) => ({ ...p, [k]: val }));

  const num = (key: string, val: number, min: number, max: number, label: string) =>
    !Number.isFinite(val) ? `${label} is required` :
    val <= 0 ? `${label} must be positive` :
    val < min || val > max ? `${label} must be between ${min} and ${max}` : "";

  const validate = (s: number) => {
    const e: Partial<Record<"project" | "L" | "load" | "a" | "b" | "d", string>> = {};
    if (s === 1 && !v.project.trim()) e.project = "Project name is required";
    if (s === 1 && v.project.length > 100) e.project = "Max 100 characters";
    if (s === 2) e.L = num("L", v.L, LIMITS.span.min, LIMITS.span.max, "Span");
    if (s === 3) {
      e.load = num("load", v.load, LIMITS.load.min, LIMITS.load.max, "Load");
      if (v.loadType === "point")
        e.a = !Number.isFinite(v.a) || v.a <= 0 || v.a >= v.L ? `Distance must be between 0 and ${v.L} m (exclusive)` : "";
    }
    if (s === 4) {
      e.b = num("b", v.b, LIMITS.b.min, LIMITS.b.max, "Width");
      e.d = num("d", v.d, LIMITS.d.min, LIMITS.d.max, "Depth");
    }
    (Object.keys(e) as (keyof typeof e)[]).forEach((k) => !e[k] && delete e[k]);
    setErr(e);
    return Object.keys(e).length === 0;
  };
  const next = () => validate(step) && setStep(step + 1);
  const back = () => { setErr({}); setStep(step - 1); };

  if (step === 0) return <Landing onStart={() => setStep(1)} />;

  const bgImage =
    step === 1 ? BG.project : step === 2 ? BG.span : step === 3 ? BG.load : step === 4 ? BG.section :
    step === 5 ? BG[v.material] : step === 6 ? BG.review : BG.results;
  const unsafe = step === 7 && !analyze(v).safe;

  return (
    <div className="relative flex min-h-screen flex-col">
      <PageBackground image={bgImage} stepKey={`${step}-${v.material}`} tint={unsafe ? "danger" : "navy"} />
      <AppHeader step={step} onHome={() => setStep(0)} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:py-12">
        {step <= 5 && (
          <StepCard step={step} accent={ACCENTS[step]} title={TITLES[step] ?? ""} onBack={step > 1 ? back : undefined} onNext={next}>
            {step === 1 && <AiAssist onApply={(n) => { setV(n); setErr({}); }} />}
            {step === 1 && (
              <Field label="Project name" error={err.project}>
                <input className={inputCls} value={v.project} maxLength={100} onChange={(e) => set("project", e.target.value)} />
              </Field>
            )}
            {step === 2 && (
              <Field label="Span L (m)" error={err.L} hint="Simply supported span, 0.5 – 30 m">
                <NumInput value={v.L} onChange={(n) => set("L", n)} />
              </Field>
            )}
            {step === 3 && (
              <>
                <Field label="Load type">
                  <select className={inputCls} value={v.loadType} onChange={(e) => set("loadType", e.target.value as BeamInput["loadType"])}>
                    <option value="udl">Uniformly Distributed Load</option>
                    <option value="point">Point Load</option>
                  </select>
                </Field>
                <Field label={v.loadType === "udl" ? "Load w (kN/m)" : "Load P (kN)"} error={err.load}>
                  <NumInput value={v.load} onChange={(n) => set("load", n)} />
                </Field>
                {v.loadType === "point" && (
                  <Field label="Distance a from left support (m)" error={err.a}>
                    <NumInput value={v.a} onChange={(n) => set("a", n)} />
                  </Field>
                )}
              </>
            )}
            {step === 4 && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Width b (mm)" error={err.b}><NumInput value={v.b} onChange={(n) => set("b", n)} /></Field>
                <Field label="Depth d (mm)" error={err.d}><NumInput value={v.d} onChange={(n) => set("d", n)} /></Field>
              </div>
            )}
            {step === 5 && (
              <>
                <Field label="Material">
                  <select className={inputCls} value={v.material} onChange={(e) => set("material", e.target.value as BeamInput["material"])}>
                    {Object.entries(MATERIALS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                  </select>
                </Field>
                <p className="-mt-2 text-sm text-muted-foreground">
                  E = {MATERIALS[v.material].E} GPa · f<sub>b</sub> = {MATERIALS[v.material].fb} MPa · f<sub>v</sub> = {MATERIALS[v.material].fv} MPa
                </p>
                <Field label="Deflection limit">
                  <select className={inputCls} value={v.defl} onChange={(e) => set("defl", e.target.value as BeamInput["defl"])}>
                    {Object.entries(DEFLECTION_LIMITS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
                  </select>
                </Field>
              </>
            )}
          </StepCard>
        )}
        {step === 6 && (
          <StepCard step={6} accent={ACCENTS[6]} title="Review" onBack={back} onNext={() => setStep(7)} nextLabel="Check Beam">
            <ReviewRows v={v} go={setStep} />
          </StepCard>
        )}
        {step === 7 && (
          <div className="step-card overflow-hidden rounded-2xl border shadow-card print:shadow-none" style={cardVars(unsafe ? "unsafe" : "safe")}>
            <div className="p-4 md:p-6 print:p-0">
            <Results v={v} onEdit={() => setStep(6)} />
            </div>
          </div>
        )}
      </main>
      <footer className="pb-4 text-center text-[11px] text-primary-foreground/70 print:hidden">Photo: Unsplash</footer>
    </div>
  );
}

const TITLES = ["", "Project", "Span", "Loading", "Section", "Material & limits"];
const ACCENTS = ["", "var(--primary)", "var(--teal)", "var(--amber)", "var(--violet)", "var(--orange)", "var(--indigo)"];

const STEP_CARD: Record<string, [string, string, string]> = {
  landing: ["#0B1F3A", "#1D4F91", "#FFFFFF"],
  1: ["#1D6FE0", "#2B8CFF", "#FFFFFF"],
  2: ["#0D7C72", "#0F9D8F", "#FFFFFF"],
  3: ["#F59E0B", "#FBBF24", "#0B1F3A"],
  4: ["#6D28D9", "#7C3AED", "#FFFFFF"],
  5: ["#C2410C", "#EA580C", "#FFFFFF"],
  6: ["#3730A3", "#4F46E5", "#FFFFFF"],
  safe: ["#166534", "#15803D", "#FFFFFF"],
  unsafe: ["#B91C1C", "#DC2626", "#FFFFFF"],
};
function cardVars(key: string | number): React.CSSProperties {
  const [a, b, t] = STEP_CARD[String(key)] ?? STEP_CARD[1]!;
  return { "--step-card-solid": a, "--step-card-bg": `linear-gradient(135deg, ${a}, ${b})`, "--step-card-text": t } as React.CSSProperties;
}

const inputCls =
  "w-full rounded-lg border border-input bg-surface-blue px-3.5 py-2.5 text-base outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20";

function NumInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [txt, setTxt] = useState(Number.isFinite(value) ? String(value) : "");
  return (
    <input
      className={inputCls} inputMode="decimal" value={txt}
      onChange={(e) => { setTxt(e.target.value); onChange(e.target.value.trim() === "" ? NaN : Number(e.target.value)); }}
    />
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string | undefined; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      {children}
      {error ? <span className="step-err block text-sm text-destructive">{error}</span> : hint && <span className="step-hint block text-sm text-muted-foreground">{hint}</span>}
    </label>
  );
}

function Btn({ children, variant = "primary", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  return (
    <button
      {...p}
      className={`${variant === "primary" ? "btn-primary" : "btn-ghost"} inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
        variant === "primary" ? "bg-brand-gradient text-primary-foreground hover:shadow-glow" : "border border-primary bg-surface-blue text-primary hover:bg-muted"
      } ${p.className ?? ""}`}
    >
      {children}
    </button>
  );
}

function StepCard({ step, accent, title, children, onBack, onNext, nextLabel = "Next" }: { step: number; accent?: string | undefined; title: string; children: ReactNode; onBack?: (() => void) | undefined; onNext: () => void; nextLabel?: string }) {
  return (
    <form className="step-card mx-auto max-w-xl overflow-hidden rounded-2xl border shadow-card" style={cardVars(step)} onSubmit={(e) => { e.preventDefault(); onNext(); }}>
      <div className="p-6 md:p-8">
      <h1 className="mb-6 flex items-center gap-3 text-2xl font-bold tracking-tight">
        <span className="inline-block h-6 w-1.5 rounded-full" style={{ background: step === 3 ? "#0B1F3A" : "#FFFFFF" }} data-accent={accent} aria-hidden="true" />{title}
      </h1>
      <div className="space-y-5">{children}</div>
      <div className="mt-8 flex justify-between gap-3">
        {onBack ? <Btn type="button" variant="ghost" onClick={onBack}>Back</Btn> : <span />}
        <Btn type="submit">{nextLabel}</Btn>
      </div>
      </div>
    </form>
  );
}

function ReviewRows({ v, go, hideEdit }: { v: BeamInput; go: (s: number) => void; hideEdit?: boolean }) {
  const rows: [string, string, number][] = [
    ["Project", v.project, 1],
    ["Span L", `${v.L} m`, 2],
    ["Load", v.loadType === "udl" ? `UDL ${v.load} kN/m` : `Point ${v.load} kN at a = ${v.a} m`, 3],
    ["Section", `${v.b} × ${v.d} mm`, 4],
    ["Material", MATERIALS[v.material].label, 5],
    ["Deflection limit", DEFLECTION_LIMITS[v.defl].label, 5],
  ];
  return (
    <dl className="step-rows divide-y overflow-hidden rounded-xl border">
      {rows.map(([k, val, s]) => (
        <div key={k} className="flex items-center justify-between gap-4 step-row px-4 py-3 odd:bg-surface-blue even:bg-panel">
          <dt className="text-sm text-muted-foreground">{k}</dt>
          <dd className="flex items-center gap-4 text-right font-medium">
            {val}
            {!hideEdit && <button type="button" onClick={() => go(s)} className="step-link text-sm font-semibold text-primary hover:underline print:hidden">Edit</button>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen bg-page-fallback">
      <AppHeader step={0} />
      <section className="relative flex min-h-[92vh] items-center overflow-hidden">
        <img src={HERO} alt="Steel beam structure at a construction site" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="relative mx-auto w-full max-w-5xl px-6 text-primary-foreground">
          <div className="mb-6 w-full max-w-[220px] rounded-2xl bg-white p-4">
            <img src="/civil.logo.png" alt="Civil Tech - Build Smarter" width={188} height={188} className="h-auto w-full object-contain" />
          </div>
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] opacity-80">Welcome to the project</p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">BeamCheck - Beam Design Checker</h1>
          <p className="mt-5 text-xl opacity-90 md:text-2xl">Check your beam in seconds.</p>
          <Btn onClick={onStart} className="mt-8 px-7 py-3.5 text-base">Start New Check</Btn>
          <p className="mt-10 text-sm opacity-75">Created by Naisharaz Dey, Roll No. 24052790</p>
        </div>
      </section>
      <footer className="bg-navy py-6 text-center text-sm text-primary-foreground/80">Bending · Shear · Deflection checks for simply supported beams<span className="mt-1 block text-[11px] text-primary-foreground/60">Photo: Unsplash</span></footer>
    </div>
  );
}

function AppHeader({ step, onHome }: { step: number; onHome?: () => void }) {
  const brand = (
    <>
      <img src="/civil.logo.png" alt="Civil Tech logo" width={40} height={40} className="h-10 w-auto object-contain" />
      <span className="whitespace-nowrap"><span className="text-[#0B1F3A]">Beam</span><span className="text-[#1D6FE0]">Check</span></span>
    </>
  );

  return (
    <header className="border-b border-[#E2E8F0] bg-white shadow-sm print:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        {onHome ? (
          <button onClick={onHome} className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
            {brand}
          </button>
        ) : (
          <div className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
            {brand}
          </div>
        )}
        <span className="text-sm font-semibold text-[#475569]">Step {step} of {TOTAL}</span>
      </div>
      <div className="mx-auto h-1.5 max-w-5xl px-4 pb-2">
        <div className="h-1.5 rounded-full bg-[#E2E8F0]">
          <div className="h-1.5 rounded-full bg-brand-gradient transition-all" style={{ width: `${(step / TOTAL) * 100}%` }} />
        </div>
      </div>
    </header>
  );
}

function barColor(r: number) {
  return r > 1 ? "bg-destructive" : r >= 0.8 ? "bg-warning" : "bg-success";
}

const CHECK_TINT: Record<string, [string, string, string]> = {
  Bending: ["bg-surface-blue", "bg-primary", "M"],
  Shear: ["bg-surface-teal", "bg-teal", "V"],
  Deflection: ["bg-surface-amber", "bg-amber", "δ"],
};

function CheckCard({ c }: { c: Check }) {
  const pct = c.ratio * 100;
  const [bg, icon, sym] = CHECK_TINT[c.name] ?? ["bg-panel", "bg-primary", "•"];
  return (
    <div className={`rounded-2xl border ${bg} p-5 break-inside-avoid`}>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <span className={`grid h-7 w-7 place-items-center rounded-lg ${icon} text-sm font-bold text-primary-foreground`} aria-hidden="true">{sym}</span>{c.name}
        </h3>
        <span className={`text-sm font-bold ${c.ratio > 1 ? "text-destructive" : "text-success"}`}>{fmt(pct, 1)}%</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-primary-foreground">
        <div className={`h-2 rounded-full ${barColor(c.ratio)}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
        <div><dt className="text-muted-foreground">Actual</dt><dd className="font-medium">{fmt(c.actual)} {c.unit}</dd></div>
        <div><dt className="text-muted-foreground">Allowable</dt><dd className="font-medium">{fmt(c.allowable)} {c.unit}</dd></div>
      </dl>
    </div>
  );
}

function Diagram({ data, k, title, unit, color }: { data: { x: number; V: number; M: number }[]; k: "V" | "M"; title: string; unit: string; color: string }) {
  const max = data.reduce((p, c) => (Math.abs(c[k]) > Math.abs(p[k]) ? c : p));
  return (
    <div className="rounded-2xl border bg-surface-blue p-5 break-inside-avoid">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-sm text-muted-foreground">max {fmt(Math.abs(max[k]))} {unit} at x = {fmt(max.x)} m</span>
      </div>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 16, bottom: 20, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="x" type="number" domain={[0, "dataMax"]} tick={{ fontSize: 12 }} label={{ value: "x (m)", position: "insideBottom", offset: -10, fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} label={{ value: unit, angle: -90, position: "insideLeft", fontSize: 12 }} />
            <Tooltip formatter={(val) => [`${fmt(Number(val))} ${unit}`, k]} labelFormatter={(l) => `x = ${l} m`} />
            <Area type="linear" dataKey={k} stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} isAnimationActive={false} />
            <ReferenceDot x={max.x} y={max[k]} r={5} fill={color} stroke="var(--card)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BeamSketch({ v }: { v: BeamInput }) {
  const x0 = 40, x1 = 560, y = 90;
  const px = x0 + ((x1 - x0) * v.a) / v.L;
  return (
    <div className="rounded-2xl border bg-surface-blue p-5 break-inside-avoid">
      <h3 className="mb-2 font-semibold">Beam sketch</h3>
      <svg viewBox="0 0 600 150" className="w-full text-foreground">
        <rect x={x0} y={y} width={x1 - x0} height={10} className="fill-foreground" />
        <polygon points={`${x0},${y + 10} ${x0 - 12},${y + 32} ${x0 + 12},${y + 32}`} className="fill-none stroke-foreground" strokeWidth={2} />
        <polygon points={`${x1},${y + 10} ${x1 - 12},${y + 30} ${x1 + 12},${y + 30}`} className="fill-none stroke-foreground" strokeWidth={2} />
        <circle cx={x1 - 6} cy={y + 35} r={3} className="fill-foreground" /><circle cx={x1 + 6} cy={y + 35} r={3} className="fill-foreground" />
        {v.loadType === "udl" ? (
          <g className="stroke-primary fill-primary">
            <line x1={x0} y1={y - 40} x2={x1} y2={y - 40} strokeWidth={2} />
            {Array.from({ length: 14 }, (_, i) => {
              const xx = x0 + ((x1 - x0) * i) / 13;
              return <g key={i}><line x1={xx} y1={y - 40} x2={xx} y2={y - 6} strokeWidth={1.5} /><polygon points={`${xx},${y - 1} ${xx - 4},${y - 8} ${xx + 4},${y - 8}`} /></g>;
            })}
            <text x={300} y={y - 50} textAnchor="middle" fontSize={14} className="stroke-none">w = {v.load} kN/m</text>
          </g>
        ) : (
          <g className="stroke-primary fill-primary">
            <line x1={px} y1={y - 55} x2={px} y2={y - 6} strokeWidth={2.5} />
            <polygon points={`${px},${y - 1} ${px - 6},${y - 11} ${px + 6},${y - 11}`} />
            <text x={px} y={y - 62} textAnchor="middle" fontSize={14} className="stroke-none">P = {v.load} kN</text>
            <text x={(x0 + px) / 2} y={y + 28} textAnchor="middle" fontSize={12} className="stroke-none fill-muted-foreground">a = {v.a} m</text>
          </g>
        )}
        <text x={300} y={y + 52} textAnchor="middle" fontSize={13} className="fill-muted-foreground">L = {v.L} m</text>
      </svg>
    </div>
  );
}

function Results({ v, onEdit }: { v: BeamInput; onEdit: () => void }) {
  const r = useMemo(() => analyze(v), [v]);
  return (
    <div className="space-y-6">
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">BeamCheck Report — {v.project}</h1>
        <p className="text-sm text-muted-foreground">Generated {new Date().toLocaleString()}</p>
      </div>
      <div className={`rounded-2xl p-6 text-primary-foreground md:p-8 ${r.safe ? "bg-safe-gradient" : "bg-unsafe-gradient"}`}>
        <p className="text-sm font-medium opacity-90 print:hidden">{v.project}</p>
        <p className="text-4xl font-extrabold tracking-tight md:text-5xl">{r.safe ? "SAFE" : "UNSAFE"}</p>
        <p className="mt-2 opacity-90">Governing check: {r.governing.name} ({fmt(r.governing.ratio * 100, 1)}% utilization)</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">{r.checks.map((c) => <CheckCard key={c.name} c={c} />)}</div>

      <div className="rounded-2xl border bg-panel p-5">
        {r.safe ? (
          <p className="font-semibold text-success">Section is adequate.</p>
        ) : r.suggestedD ? (
          <p><span className="font-semibold">Suggested minimum section:</span> {v.b} × {r.suggestedD} mm (depth rounded up to nearest 25 mm).</p>
        ) : (
          <p>No practical depth found — consider a wider section or stronger material.</p>
        )}
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <Stat k="RA" v={`${fmt(r.RA)} kN`} /><Stat k="RB" v={`${fmt(r.RB)} kN`} />
          <Stat k="Mmax" v={`${fmt(r.Mmax)} kN·m`} /><Stat k="Vmax" v={`${fmt(r.Vmax)} kN`} />
          <Stat k="Z" v={`${(r.Z / 1e6).toFixed(3)} ×10⁶ mm³`} /><Stat k="I" v={`${(r.I / 1e6).toFixed(1)} ×10⁶ mm⁴`} />
        </dl>
      </div>

      <BeamSketch v={v} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Diagram data={r.points} k="V" title="Shear Force Diagram" unit="kN" color="var(--primary)" />
        <Diagram data={r.points} k="M" title="Bending Moment Diagram" unit="kN·m" color="var(--destructive)" />
      </div>

      <div className="hidden print:block"><ReviewRows v={v} go={() => {}} /></div>

      <p className="rounded-xl bg-surface-amber p-4 text-sm text-muted-foreground">
        Preliminary check for learning and planning. Final design must be verified by a qualified structural engineer.
      </p>
      <div className="flex flex-wrap gap-3 print:hidden">
        <Btn variant="ghost" onClick={onEdit}>Edit inputs</Btn>
        <Btn onClick={() => window.print()}>Download Report</Btn>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return <div className="rounded-lg border bg-surface-blue px-3 py-2"><dt className="text-xs font-semibold text-primary">{k}</dt><dd className="font-medium">{v}</dd></div>;
}

function AiAssist({ onApply }: { onApply: (v: BeamInput) => void }) {
  const run = useServerFn(suggestBeamInputs);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sug, setSug] = useState<{ input: BeamInput; notes: string } | null>(null);
  const go = async () => {
    if (text.trim().length < 10) { setError("Describe your beam in at least a few words."); return; }
    setBusy(true); setError(""); setSug(null);
    try {
      const r = await run({ data: { description: text } });
      if (r.ok) setSug({ input: r.input, notes: r.notes }); else setError(r.error);
    } catch { setError("Couldn't get suggestions. Please try again."); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-3 rounded-xl bg-surface-blue p-4">
      <p className="text-sm font-semibold">Describe your beam (optional, AI-powered)</p>
      <textarea
        className={`${inputCls} min-h-24`} value={text} maxLength={2000}
        placeholder="e.g. 6 m timber floor joist, 200 x 300 mm, carrying 5 kN/m"
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex justify-end">
        <Btn type="button" onClick={go} disabled={busy}>{busy ? "Thinking…" : "Suggest inputs"}</Btn>
      </div>
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      {sug && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">Suggested inputs — review before using</p>
          <ReviewRows v={sug.input} go={() => {}} hideEdit />
          {sug.notes && <p className="text-sm text-muted-foreground">{sug.notes}</p>}
          <div className="flex justify-end gap-3">
            <Btn type="button" variant="ghost" onClick={() => setSug(null)}>Discard</Btn>
            <Btn type="button" onClick={() => { onApply(sug.input); setSug(null); setText(""); }}>Use these inputs</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
