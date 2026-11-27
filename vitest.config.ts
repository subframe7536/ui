import solid from '@solidjs/vite-plugin'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
  resolve: {
    dedupe: ['solid-js', '@solidjs/web'],
  },
  plugins: [solid()],
  test: {
    environment: 'jsdom',
    globals: true,
    passWithNoTests: true,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          pool: 'vmThreads',
          include: [
            'src/**/*.{test,spec}.?(c|m)[jt]s?(x)',
            'test/**/*.{test,spec}.?(c|m)[jt]s?(x)',
          ],
          exclude: ['test/entry-boundaries.test.ts'],
          setupFiles: ['./test/setup.ts'],
        },
      },
      {
        test: {
          name: 'boundaries',
          pool: 'vmThreads',
          environment: 'node',
          include: ['test/entry-boundaries.test.ts'],
        },
      },
    ],
    forceRerunTriggers: [
      ...configDefaults.forceRerunTriggers,
      '**/{vitest,vite}.config.*',
      '**/package.json',
      '**/tsconfig*.json',
      '**/tsdown.config.*',
      '**/test/setup.ts',
    ],
  },
})
