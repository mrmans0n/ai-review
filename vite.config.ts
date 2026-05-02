import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(async () => ({
  plugins: [react()],

  // Emit relative asset URLs so the production bundle works when loaded via
  // file:// from Electron's loadFile (default "/" would resolve to the
  // filesystem root inside the .app and assets would 404).
  base: "./",

  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },

  // Vitest configuration
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
}));
