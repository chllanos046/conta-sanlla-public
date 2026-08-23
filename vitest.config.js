import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: "node",
    environmentMatchGlobs: [["**/__tests__/components/**", "jsdom"]],
    globals: true,
    setupFiles: ["./vitest.setup.js"],
    include: ["__tests__/**/*.test.js", "__tests__/**/*.test.jsx"],
  },
});
