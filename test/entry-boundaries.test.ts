import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOT = resolve(__dirname, '..')
const DIST = resolve(ROOT, 'dist')
const IMPORT_PATTERN =
  /(?:(?:import|export)\s*(?:[^'"]*?\bfrom\s*)?|\bimport\s*\(\s*)['"]([^'"]+)['"]/g

// Disallowed dependencies that must never appear in any published entry.
const FORBIDDEN_IMPORTS = ['@formisch/solid', '@ui-sdk/core', '@ui-sdk/solid']

// Core non-floating entries must not pull in @floating-ui/dom.
const NON_FLOATING_ENTRIES = [
  'accordion.mjs',
  'agent.mjs',
  'avatar.mjs',
  'button.mjs',
  'checkbox.mjs',
  'collapsible.mjs',
  'field.mjs',
  'input.mjs',
  'label.mjs',
  'meter.mjs',
  'observe.mjs',
  'primitive.mjs',
  'progress.mjs',
  'radio.mjs',
  'separator.mjs',
  'slider.mjs',
  'switch.mjs',
  'tabs.mjs',
  'textarea.mjs',
  'toggle.mjs',
]

// Pure non-JSX runtime entries must not depend on @solidjs/web.
const PURE_TS_ENTRIES = ['agent.mjs', 'observe.mjs']

function collectBareImports(entry: string): Set<string> {
  const bare = new Set<string>()
  const seen = new Set<string>()
  const queue = [join(DIST, entry)]
  while (queue.length > 0) {
    const file = queue.pop()!
    if (seen.has(file) || !existsSync(file)) {
      continue
    }
    seen.add(file)
    for (const [, specifier] of readFileSync(file, 'utf8').matchAll(IMPORT_PATTERN)) {
      if (!specifier) {
        continue
      }
      if (specifier.startsWith('.')) {
        const target = file.endsWith('.d.mts') ? specifier.replace(/\.mjs$/, '.d.mts') : specifier
        queue.push(resolve(dirname(file), target))
      } else {
        bare.add(specifier)
      }
    }
  }
  return bare
}

describe.skipIf(!existsSync(join(DIST, 'index.mjs')))('package entry boundaries', () => {
  it('all package.json subpath exports exist in dist', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
      exports: Record<string, string | Record<string, string>>
    }

    const targets = Object.entries(pkg.exports).flatMap(([subpath, target]) =>
      typeof target === 'string'
        ? [{ label: `${subpath} -> ${target}`, file: target }]
        : Object.entries(target).map(([condition, file]) => ({
            label: `${subpath} (${condition}) -> ${file}`,
            file,
          })),
    )

    for (const { label, file } of targets) {
      expect(existsSync(resolve(ROOT, file)), label).toBe(true)
    }
  })

  it.each(['index.mjs', 'index.jsx', 'index.d.mts'])(
    '%s does not import forbidden packages',
    (entry) => {
      const imports = collectBareImports(entry)
      for (const pkg of FORBIDDEN_IMPORTS) {
        expect([...imports].filter((name) => name.startsWith(pkg))).toEqual([])
      }
    },
  )

  it.each(NON_FLOATING_ENTRIES)('%s does not pull in @floating-ui/dom', (entry) => {
    const imports = collectBareImports(entry)
    expect([...imports].filter((name) => name.startsWith('@floating-ui/dom'))).toEqual([])
  })

  it.each(PURE_TS_ENTRIES)('%s does not pull in @solidjs/web', (entry) => {
    const imports = collectBareImports(entry)
    expect([...imports].filter((name) => name.startsWith('@solidjs/web'))).toEqual([])
  })
})
