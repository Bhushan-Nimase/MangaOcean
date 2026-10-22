import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Backend address (https profile in Visual Studio)
const API = 'https://localhost:7197'

// `npm run build` writes the finished frontend straight into the ASP.NET project's wwwroot,
// so the backend serves the whole site (pages + API) from one origin.
const WWWROOT = fileURLToPath(new URL('../MangaDump/wwwroot', import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],

  build: {
    outDir: WWWROOT,
    emptyOutDir: false, // wwwroot also holds /uploads and other files - never wipe it
    assetsDir: 'assets',
  },

  // `npm run dev` (hot reload on :5173): forward API + uploads to the backend so the
  // HttpOnly refresh cookie stays same-origin and no CORS is involved.
  server: {
    port: 5173,
    proxy: {
      '/api': { target: API, changeOrigin: true, secure: false },
      '/uploads': { target: API, changeOrigin: true, secure: false },
    },
  },
})
