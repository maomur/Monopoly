/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    testTimeout: 120_000,
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
