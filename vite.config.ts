import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    strictPort: true // Don't try other ports if 3000 is busy
  },
  build: {
    target: 'es2020',
    outDir: 'dist'
  },
  publicDir: 'public'
})
