// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import Inspect from 'vite-plugin-inspect'

export default defineConfig({
  plugins: [react(), Inspect()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '#server': path.resolve(__dirname, './server'), // Changed $ to #
    },
  },
  server: {
    allowedHosts: true, // Cho phép tất cả các host kết nối đến dev server
  }
})