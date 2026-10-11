import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const suggestBeamInputs = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ description: z.string().trim().min(10).max(2000) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["OPENAI_API_KEY"];
    if (!key) return { ok: false as const, error: "AI is not set up. Add OPENAI_API_KEY to a .env file, or fill the steps manually." };
    const { suggestInputs } = await import("./suggest.server");
    try {
      const r = await suggestInputs(data.description, key);
      return { ok: true as const, ...r };
    } catch (e: unknown) {
      const status = (e as { statusCode?: number })?.statusCode;
      const msg =
        status === 429 ? "Too many requests right now. Please wait a moment and try again." :
        status === 402 ? "Your OpenAI account has no credits left. Add credits to keep using suggestions." :
        status === 403 ? "AI access was refused. Check your OPENAI_API_KEY." :
        "Couldn't get suggestions. Please try again or fill the steps manually.";
      console.error("suggestBeamInputs failed", e);
      return { ok: false as const, error: msg };
    }
  });
