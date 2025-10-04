// frontend/vite.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,         // expose on LAN
    port: 5173,         // Vite default
    proxy: {
      "/api": "http://localhost:8080",
      "/ws": { target: "http://localhost:8080", ws: true, changeOrigin: true },
    },
  },
  build: { outDir: "dist" },
});
