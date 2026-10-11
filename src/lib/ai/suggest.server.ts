import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";
import { LIMITS, type BeamInput } from "@/lib/beam-config";

// Uses your own OpenAI key (OPENAI_API_KEY). Change MODEL if you prefer another one.
const MODEL = "gpt-4o-mini";

const schema = z.object({
  project: z.string(),
  L: z.number(),
  loadType: z.enum(["udl", "point"]),
  load: z.number(),
  a: z.number().nullable(),
  b: z.number(),
  d: z.number(),
  material: z.enum(["steel", "timber", "concrete"]),
  defl: z.enum(["250", "360"]),
  notes: z.string(),
});

const INSTRUCTIONS = `You help structural engineering students set up a simply supported beam check.
From the user's plain-language description, suggest inputs:
- project: short project name (max 60 chars)
- L: span in metres (${LIMITS.span.min}-${LIMITS.span.max})
- loadType: "udl" (kN/m) or "point" (kN)
- load: load magnitude (${LIMITS.load.min}-${LIMITS.load.max})
- a: distance of point load from left support in m (strictly between 0 and L), or null for udl
- b: section width mm (${LIMITS.b.min}-${LIMITS.b.max}); d: section depth mm (${LIMITS.d.min}-${LIMITS.d.max})
- material: steel, timber or concrete
- defl: "360" for floors/brittle finishes, "250" otherwise
- notes: 1-3 short sentences explaining assumptions you made for values not stated.
Use stated values exactly (convert units). Estimate reasonable values when missing.`;

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export async function suggestInputs(description: string, apiKey: string): Promise<{ input: BeamInput; notes: string }> {
  const provider = createOpenAI({ apiKey });
  const result = streamText({
    model: provider.responses(MODEL),
    instructions: INSTRUCTIONS,
    messages: [{ role: "user", content: description }],
    output: Output.object({ schema }),
    providerOptions: { openai: { store: false } },
  });
  const o = await result.output;
  const L = clamp(o.L, LIMITS.span.min, LIMITS.span.max);
  const a = o.loadType === "point" ? clamp(o.a ?? L / 2, 0.01, L - 0.01) : L / 2;
  return {
    notes: o.notes,
    input: {
      project: o.project.slice(0, 100) || "New Beam",
      L,
      loadType: o.loadType,
      load: clamp(o.load, LIMITS.load.min, LIMITS.load.max),
      a: Math.round(a * 100) / 100,
      b: Math.round(clamp(o.b, LIMITS.b.min, LIMITS.b.max)),
      d: Math.round(clamp(o.d, LIMITS.d.min, LIMITS.d.max)),
      material: o.material,
      defl: o.defl,
    },
  };
}
