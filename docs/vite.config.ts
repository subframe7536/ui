import { resolve } from 'node:path'

import solid from '@solidjs/vite-plugin'
import { defineConfig } from 'vite'
import type { Plugin } from 'vite'

const SLOT_OVERRIDES: Record<string, string> = {
  MenuSubTrigger: 'menu-trigger',
  TreeItemIndicator: 'tree-indicator',
  TreeItemLabel: 'tree-label',
  TreeItemCheckbox: 'tree-checkbox',
}

function toKebab(name: string): string {
  return name
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replaceAll(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

function splitCallArgs(
  src: string,
  openParenIdx: number,
): { args: Array<{ start: number; end: number; text: string }>; closeIdx: number } | null {
  const args: Array<{ start: number; end: number; text: string }> = []
  let depthParen = 0
  let depthBrace = 0
  let depthBracket = 0
  let inStr: string | null = null
  let escaped = false
  let inLineComment = false
  let inBlockComment = false
  let argStart = openParenIdx + 1

  for (let i = openParenIdx + 1; i < src.length; i++) {
    const ch = src[i]
    const next = src[i + 1]
    if (inLineComment) {
      if (ch === '\n') {
        inLineComment = false
      }
      continue
    }
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false
        i++
      }
      continue
    }
    if (inStr) {
      if (escaped) {
        escaped = false
      } else if (ch === '\\') {
        escaped = true
      } else if (ch === inStr) {
        inStr = null
      }
      continue
    }
    if (ch === '/' && next === '/') {
      inLineComment = true
      i++
      continue
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true
      i++
      continue
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inStr = ch
      continue
    }
    if (ch === '(') {
      depthParen++
    } else if (ch === ')') {
      if (depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
        args.push({ start: argStart, end: i, text: src.slice(argStart, i) })
        return { args, closeIdx: i }
      }
      depthParen--
    } else if (ch === '{') {
      depthBrace++
    } else if (ch === '}') {
      depthBrace--
    } else if (ch === '[') {
      depthBracket++
    } else if (ch === ']') {
      depthBracket--
    } else if (ch === ',' && depthParen === 0 && depthBrace === 0 && depthBracket === 0) {
      args.push({ start: argStart, end: i, text: src.slice(argStart, i) })
      argStart = i + 1
    }
  }
  return null
}

function injectDataSlots(code: string, id: string): string | null {
  const cleanId = (id.split('?')[0] ?? '').replaceAll('\\', '/')
  if (!/\/src\/[^/]+\.tsx$/.test(cleanId)) {
    return null
  }
  if (cleanId.endsWith('/src/dialog.tsx')) {
    let out = code.replace(
      "export function DialogShortcut(props: DialogShortcutProps & PartProps<'kbd', DialogShortcutState>) {",
      "export function DialogShortcut(props: DialogShortcutProps & PartProps<'kbd', DialogShortcutState>) {\n  const ctx = useContext(DialogContext)",
    )
    const pairs: Array<[string, string]> = [
      [
        "'data-slot': 'dialog-trigger',",
        "'data-slot': ctx?.role === 'alertdialog' ? 'alert-dialog-trigger' : 'dialog-trigger',",
      ],
      [
        "'data-slot': 'dialog-backdrop',",
        "'data-slot': ctx.role === 'alertdialog' ? 'alert-dialog-backdrop' : 'dialog-backdrop',",
      ],
      [
        "'data-slot': 'dialog-content',",
        "'data-slot': ctx.role === 'alertdialog' ? 'alert-dialog-content' : 'dialog-content',",
      ],
      [
        "'data-slot': 'dialog-title'",
        "'data-slot': ctx.role === 'alertdialog' ? 'alert-dialog-title' : 'dialog-title'",
      ],
      [
        "'data-slot': 'dialog-description'",
        "'data-slot': ctx.role === 'alertdialog' ? 'alert-dialog-description' : 'dialog-description'",
      ],
      [
        "'data-slot': 'dialog-close',",
        "'data-slot': ctx.role === 'alertdialog' ? 'alert-dialog-close' : 'dialog-close',",
      ],
      [
        "'data-slot': 'dialog-shortcut'",
        "'data-slot': ctx?.role === 'alertdialog' ? 'alert-dialog-shortcut' : 'dialog-shortcut'",
      ],
    ]
    for (const [from, to] of pairs) {
      out = out.replace(from, to)
    }
    return out === code ? null : out
  }

  const fnDecls: Array<{ idx: number; name: string }> = []
  for (const match of code.matchAll(/^export\s+function\s+([A-Z][A-Za-z0-9_]*)\s*[<(]/gm)) {
    if (match.index !== undefined && match[1]) {
      fnDecls.push({ idx: match.index, name: match[1] })
    }
  }
  const fnAt = (pos: number): string | null => {
    let current: string | null = null
    for (const decl of fnDecls) {
      if (decl.idx <= pos) {
        current = decl.name
      } else {
        break
      }
    }
    return current
  }

  const edits: Array<{ pos: number; insert: string }> = []
  const re = /\brenderPart\s*\(/g
  for (const match of code.matchAll(re)) {
    if (match.index === undefined) {
      continue
    }
    const openIdx = match.index + match[0].length - 1
    const parsed = splitCallArgs(code, openIdx)
    if (!parsed) {
      continue
    }
    const args = parsed.args.filter((arg) => arg.text.trim().length > 0)
    const fnName = fnAt(match.index)
    if (!fnName) {
      continue
    }
    const slot = SLOT_OVERRIDES[fnName] ?? toKebab(fnName)
    const callText = code.slice(match.index, parsed.closeIdx + 1)
    if (/['"]data-slot['"]/.test(callText) || /\bslot\s*:/.test(args[3]?.text ?? '')) {
      continue
    }
    if (args.length === 3) {
      const lastArg = args[2]
      if (!lastArg) {
        continue
      }
      const afterLast = code.slice(lastArg.end, parsed.closeIdx)
      if (afterLast.trim().startsWith(',')) {
        edits.push({ pos: parsed.closeIdx, insert: `{ slot: '${slot}' }` })
      } else {
        edits.push({ pos: lastArg.end, insert: `, { slot: '${slot}' }` })
      }
    } else if (args.length >= 4) {
      const fourth = args[3]
      if (!fourth) {
        continue
      }
      const braceOffset = fourth.text.indexOf('{')
      if (braceOffset !== -1) {
        edits.push({ pos: fourth.start + braceOffset + 1, insert: ` slot: '${slot}',` })
      }
    }
  }

  if (edits.length === 0) {
    return null
  }
  let out = code
  for (const edit of edits.toSorted((a, b) => b.pos - a.pos)) {
    out = out.slice(0, edit.pos) + edit.insert + out.slice(edit.pos)
  }
  return out
}

function injectDataSlotsPlugin(): Plugin {
  return {
    name: 'inject-data-slots',
    enforce: 'pre',
    transform(code, id) {
      const transformed = injectDataSlots(code, id)
      return transformed ? { code: transformed, map: null } : null
    },
  }
}

export default defineConfig({
  root: resolve(import.meta.dirname),
  base: './',
  plugins: [injectDataSlotsPlugin(), solid()],
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
