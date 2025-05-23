import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/apollo': {
        target: 'https://api.apollo.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/apollo/, '')
      },
      '/mails': {
        target: 'https://api.mails.so',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/mails/, '')
      }
    }
  }
})