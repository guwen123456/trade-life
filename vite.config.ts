import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

// GitHub Pages serves this repo at https://guwen123456.github.io/trade-life/,
// so production assets must be prefixed with /trade-life/.
export default defineConfig(({ mode }) => ({
  base: mode === "production" ? "/trade-life/" : "/",
  plugins: [
    TanStackRouterVite({ target: "react", autoCodeSplitting: false }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
}));
