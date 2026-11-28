import { createEffect, createSignal } from 'solid-js'

export type ShortcutHandler = (event: KeyboardEvent) => void

export type ShortcutOptions = {
  scope?: string
  enabled?: boolean
  preventDefault?: boolean
  ignoreInputs?: boolean
  label?: string
}

export type MaybeAccessor<T> = T | (() => T)

type Entry = {
  keys: string
  handler: ShortcutHandler
  options: ShortcutOptions
}

const entries = new Set<Entry>()
const activeScopes = new Set<string>(['global'])
let listenerAttached = false

function isApplePlatform(): boolean {
  if (typeof navigator === 'undefined') {
    return false
  }
  return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent)
}

function matchesCombo(event: KeyboardEvent, combo: string): boolean {
  const parts = combo
    .toLowerCase()
    .split('+')
    .map((p) => p.trim())
  const key = parts[parts.length - 1]
  const needMod = parts.includes('mod')
  const needCtrl = parts.includes('ctrl') || parts.includes('control')
  const needMeta = parts.includes('meta') || parts.includes('cmd')
  const needAlt = parts.includes('alt') || parts.includes('option')
  const needShift = parts.includes('shift')

  const apple = isApplePlatform()
  const modOk = needMod ? (apple ? event.metaKey : event.ctrlKey) : true
  const ctrlOk = needCtrl ? event.ctrlKey : needMod && !apple ? true : !event.ctrlKey
  const metaOk = needMeta ? event.metaKey : needMod && apple ? true : !event.metaKey
  const altOk = needAlt ? event.altKey : !event.altKey
  const shiftOk = needShift ? event.shiftKey : true

  if (!modOk || !ctrlOk || !metaOk || !altOk || !shiftOk) {
    return false
  }
  const evKey = event.key.toLowerCase()
  if (key === 'space') {
    return evKey === ' '
  }
  if (key === 'esc' || key === 'escape') {
    return evKey === 'escape'
  }
  return evKey === key
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

function handleGlobalKeyDown(event: KeyboardEvent) {
  for (const entry of entries) {
    if (entry.options.enabled === false) {
      continue
    }
    if (entry.options.scope && !activeScopes.has(entry.options.scope)) {
      continue
    }
    if (entry.options.ignoreInputs !== false && isEditableTarget(event.target)) {
      continue
    }
    const combos = entry.keys.split(',').map((s) => s.trim())
    if (combos.some((c) => matchesCombo(event, c))) {
      if (entry.options.preventDefault !== false) {
        event.preventDefault()
      }
      entry.handler(event)
      return
    }
  }
}

function ensureListener() {
  if (listenerAttached || typeof window === 'undefined') {
    return
  }
  listenerAttached = true
  window.addEventListener('keydown', handleGlobalKeyDown)
}

export const shortcuts = {
  register(keys: string, handler: ShortcutHandler, options: ShortcutOptions = {}): () => void {
    ensureListener()
    const entry: Entry = { keys, handler, options }
    entries.add(entry)
    return () => {
      entries.delete(entry)
    }
  },
  scope(name: string): () => void {
    activeScopes.add(name)
    return () => {
      activeScopes.delete(name)
    }
  },
  enterScope(name: string) {
    activeScopes.add(name)
  },
  leaveScope(name: string) {
    activeScopes.delete(name)
  },
  list() {
    return [...entries].map((e) => ({
      keys: e.keys,
      label: e.options.label,
      scope: e.options.scope,
    }))
  },
}

export function registerShortcut(
  keys: string,
  handler: ShortcutHandler,
  options: ShortcutOptions = {},
): () => void {
  return shortcuts.register(keys, handler, options)
}

export function formatShortcut(keys: string, apple = isApplePlatform()): string {
  const first = keys.split(',')[0]?.trim() ?? keys
  const tokens = first.split('+').map((part) => {
    const p = part.trim().toLowerCase()
    if (p === 'mod') {
      return apple ? '⌘' : 'Ctrl'
    }
    if (p === 'shift') {
      return apple ? '⇧' : 'Shift'
    }
    if (p === 'alt' || p === 'option') {
      return apple ? '⌥' : 'Alt'
    }
    if (p === 'ctrl' || p === 'control') {
      return apple ? '⌃' : 'Ctrl'
    }
    if (p === 'meta' || p === 'cmd') {
      return apple ? '⌘' : 'Meta'
    }
    if (p === 'enter') {
      return '↵'
    }
    if (p === 'escape' || p === 'esc') {
      return 'Esc'
    }
    return p.length === 1 ? p.toUpperCase() : p
  })
  return `\u2066${tokens.join(apple ? '' : '+')}\u2069`
}

export function ariaKeyshortcuts(keys: string, apple = isApplePlatform()): string {
  return keys
    .split(',')
    .map((combo) =>
      combo
        .trim()
        .split('+')
        .map((p) => {
          const low = p.trim().toLowerCase()
          if (low === 'mod') {
            return apple ? 'Meta' : 'Control'
          }
          if (low === 'shift') {
            return 'Shift'
          }
          if (low === 'alt' || low === 'option') {
            return 'Alt'
          }
          if (low === 'ctrl' || low === 'control') {
            return 'Control'
          }
          return low.length === 1 ? low.toUpperCase() : low
        })
        .join('+'),
    )
    .join(' ')
}

const read = <T,>(value: MaybeAccessor<T>): T =>
  typeof value === 'function' ? (value as () => T)() : value

export function useShortcut(
  keys: MaybeAccessor<string | null | undefined>,
  handler: ShortcutHandler,
  options: MaybeAccessor<ShortcutOptions> = {},
) {
  createEffect(
    () => ({ keys: read(keys), options: read(options) }),
    ({ keys: k, options: opts }) => {
      if (!k) {
        return
      }
      return shortcuts.register(k, handler, opts)
    },
  )
}

export function useShortcutHint(keys: MaybeAccessor<string>) {
  const [apple, setApple] = createSignal(false)
  createEffect(
    () => 0,
    () => {
      setApple(isApplePlatform())
    },
  )
  return {
    text: () => formatShortcut(read(keys), apple()),
    ariaKeyshortcuts: () => ariaKeyshortcuts(read(keys), apple()),
  }
}
