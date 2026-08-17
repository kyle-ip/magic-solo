import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH || '/magic-solo/',
  server: {
    proxy: {
      // Browser → Vite → Scryfall (avoids CORS noise on error/challenge pages)
      '/scryfall-api': {
        target: 'https://api.scryfall.com',
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/scryfall-api/, ''),
      },
    },
  },
})
