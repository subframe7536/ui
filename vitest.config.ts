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
          exclude: ['test/entry-boundaries.test.ts', 'test/**/*-ssr.test.?(c|m)[jt]s?(x)'],
          setupFiles: ['./test/setup.ts'],
        },
      },
      {
        extends: false,
        define: {
          'process.env.NODE_ENV': JSON.stringify('test'),
        },
        resolve: {
          dedupe: ['solid-js', '@solidjs/web'],
        },
        plugins: [solid({ ssr: true })],
        test: {
          name: 'ssr',
          environment: 'node',
          globals: true,
          include: ['test/**/*-ssr.test.?(c|m)[jt]s?(x)'],
        },
      },
      {
        extends: false,
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
