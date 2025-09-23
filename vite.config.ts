import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    strictPort: true,
  },
  build: {
    target: "es2020",
    outDir: "dist",
  },
  publicDir: "public",
});
