import { resolve } from 'node:path'

import solid from '@solidjs/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  root: resolve(import.meta.dirname),
  base: './',
  plugins: [solid()],
  resolve: {
    alias: {
      '@subf/ui': resolve(import.meta.dirname, '../src'),
    },
  },
  build: {
    outDir: resolve(import.meta.dirname, 'dist'),
    emptyOutDir: true,
    target: 'es2023',
  },
})
