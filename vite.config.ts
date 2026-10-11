// BeamCheck – Vite configuration (TanStack Start + React + Tailwind).
import { defineConfig, type PluginOption } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(async ({ command }) => {
  const plugins: PluginOption[] = [
    tsConfigPaths(), // makes the "@/..." import alias work
    // src/server.ts wraps server-side rendering errors with a friendly error page
    tanstackStart({ server: { entry: "server" } }),
    viteReact(),
    tailwindcss(),
  ];

  // Production server output (only needed for `npm run build`)
  if (command === "build") {
    try {
      const { nitro } = await import("nitro/vite");
      plugins.push(nitro());
    } catch {
      /* nitro is optional – the dev server does not need it */
    }
  }

  return {
    plugins,
    resolve: {
      dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start", "@tanstack/react-query"],
    },
    server: { port: 8080 }, // open http://localhost:8080
  };
});
