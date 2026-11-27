import solid from '@solidjs/vite-plugin'
import { defineConfig } from 'tsdown'
import type { ExportsOptions } from 'tsdown'

const allEntries = {
  index: './src/index.ts',
  accordion: './src/accordion.tsx',
  agent: './src/agent.ts',
  'alert-dialog': './src/alert-dialog.tsx',
  button: './src/button.tsx',
  collapsible: './src/collapsible.tsx',
  dialog: './src/dialog.tsx',
  label: './src/label.tsx',
  observe: './src/observe.ts',
  popover: './src/popover.tsx',
  primitive: './src/primitive.ts',
  separator: './src/separator.tsx',
  switch: './src/switch.tsx',
  tabs: './src/tabs.tsx',
  toggle: './src/toggle.tsx',
}

const jsxEntries = {
  index: './src/index.ts',
  accordion: './src/accordion.tsx',
  'alert-dialog': './src/alert-dialog.tsx',
  button: './src/button.tsx',
  collapsible: './src/collapsible.tsx',
  dialog: './src/dialog.tsx',
  label: './src/label.tsx',
  popover: './src/popover.tsx',
  separator: './src/separator.tsx',
  switch: './src/switch.tsx',
  tabs: './src/tabs.tsx',
  toggle: './src/toggle.tsx',
}

const packageExports: ExportsOptions = {
  customExports(exports, { chunks }) {
    const solidChunks = new Set<string>()
    for (const group of Object.values(chunks)) {
      for (const chunk of group) {
        if (chunk.type !== 'chunk' || !chunk.isEntry || !chunk.fileName.endsWith('.jsx')) {
          continue
        }
        solidChunks.add(chunk.fileName.replaceAll('\\', '/').replace(/\.jsx$/, ''))
      }
    }

    for (const [key, value] of Object.entries(exports)) {
      if (typeof value !== 'string') {
        continue
      }
      const slashIndex = value.lastIndexOf('/')
      const fileName = value.slice(slashIndex + 1)
      if (!fileName.endsWith('.mjs') && !fileName.endsWith('.jsx')) {
        continue
      }
      const dir = value.slice(0, slashIndex + 1)
      const name = fileName.replace(/\.(?:mjs|jsx)$/, '')
      exports[key] = {
        types: `${dir}${name}.d.mts`,
        ...(solidChunks.has(name) ? { solid: `${dir}${name}.jsx` } : {}),
        default: `${dir}${name}.mjs`,
      }
    }

    return exports
  },
}

export default defineConfig([
  {
    entry: allEntries,
    plugins: [solid()],
    unbundle: true,
    clean: true,
    deps: {
      neverBundle: ['solid-js', '@solidjs/web', '@floating-ui/dom'],
    },
    dts: {
      generator: 'tsrs',
    },
    exports: packageExports,
  },
  {
    entry: jsxEntries,
    unbundle: true,
    clean: false,
    platform: 'neutral',
    deps: {
      neverBundle: ['solid-js', '@solidjs/web', '@floating-ui/dom'],
    },
    outExtensions: () => ({ js: '.jsx' }),
    dts: false,
    exports: packageExports,
  },
])
