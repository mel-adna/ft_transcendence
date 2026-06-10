import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  // Load VITE_* vars from repo root .env (shared with backend)
  envDir: path.resolve(__dirname, '..'),
  plugins: [react(), tailwindcss()],
})
