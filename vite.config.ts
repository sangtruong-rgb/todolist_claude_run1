/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The app always runs on this port so its localStorage (keyed by origin)
// survives between runs; strictPort stops with an error instead of moving
// to another port when it is taken.
const PORT = Number(process.env.PORT ?? 5173)

export default defineConfig({
  plugins: [react()],
  server: { port: PORT, strictPort: true, host: '127.0.0.1' },
  preview: { port: PORT, strictPort: true, host: '127.0.0.1' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
