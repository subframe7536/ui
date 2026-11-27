import { onCleanup } from 'solid-js'

import type { ChangeSource } from './details'

/**
 * A change emitted by a live component to `observe()` listeners.
 */
export type ObservedChange = {
  /** Stable reference ID for the component while mounted. */
  ref: string
  /** Component kind, e.g. `"switch"`, `"tabs"`, `"dialog"`. */
  component: string
  /** Accessible label or name of the component, if available. */
  label?: string
  /** State key that changed, e.g. `"open"`, `"checked"`, `"value"`, `"pressed"`. */
  key: string
  /** Previous value before the change. */
  previous: unknown
  /** New value after the change. */
  value: unknown
  /** Why the change happened. */
  reason: string
  /** How the change was caused. */
  source: ChangeSource
}

export type RegisteredComponent = {
  ref: string
  component: string
  getElements: () => Array<HTMLElement | undefined | null>
  getLabel?: () => string | undefined
  getState: () => Record<string, unknown>
  getItems?: () => Array<{ value: string; label: string }>
  getText?: () => Array<string>
  getButtons?: () => Array<string>
  getDisabled?: () => boolean
  actions: Record<string, (...args: Array<unknown>) => unknown>
}

type ChangeListener = (change: ObservedChange, elements: Array<HTMLElement>) => void

let nextRefId = 1
const registry = new Map<string, RegisteredComponent>()
const listeners = new Set<ChangeListener>()

function isSecretElement(el: HTMLElement): boolean {
  if (el.closest('[data-agent-secret]')) {
    return true
  }
  if (el instanceof HTMLInputElement && el.type === 'password') {
    return true
  }
  return false
}

export function isHiddenFromAgent(elements: Array<HTMLElement>): boolean {
  return elements.some((el) => !!el.closest('[data-agent-hidden]'))
}

export function confirmMessageOf(elements: Array<HTMLElement>): string | undefined {
  for (const el of elements) {
    const carrier = el.closest<HTMLElement>('[data-agent-confirm]')
    if (carrier) {
      return carrier.getAttribute('data-agent-confirm') || 'Confirm action'
    }
  }
  return undefined
}

export function accessibleLabelOf(elements: Array<HTMLElement>): string | undefined {
  for (const el of elements) {
    const ariaLabel = el.getAttribute('aria-label')
    if (ariaLabel?.trim()) {
      return ariaLabel.trim()
    }
    const labelledBy = el.getAttribute('aria-labelledby')
    if (labelledBy && typeof document !== 'undefined') {
      const text = labelledBy
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim())
        .filter(Boolean)
        .join(' ')
      if (text) {
        return text
      }
    }
    const text = el.textContent?.trim()
    if (text && text.length <= 80) {
      return text
    }
  }
  return undefined
}

/**
 * Registers a Solid 2 component instance in the global observe/agent registry
 * and automatically unregisters it via `onCleanup`.
 */
export function registerComponent(spec: Omit<RegisteredComponent, 'ref'>): {
  ref: string
  emit: (change: Omit<ObservedChange, 'ref' | 'component' | 'label'>) => void
} {
  const ref = `${spec.component}-${nextRefId++}`
  const entry: RegisteredComponent = { ref, ...spec }
  registry.set(ref, entry)

  onCleanup(() => {
    registry.delete(ref)
  })

  const emit = (change: Omit<ObservedChange, 'ref' | 'component' | 'label'>) => {
    if (listeners.size === 0) {
      return
    }
    const els = entry
      .getElements()
      .filter((el): el is HTMLElement => el !== null && el !== undefined)
    if (isHiddenFromAgent(els)) {
      return
    }
    const redacted = els.some(isSecretElement)
    const payload: ObservedChange = {
      ref,
      component: entry.component,
      label: entry.getLabel?.() ?? accessibleLabelOf(els),
      ...change,
      previous: redacted ? '[redacted]' : change.previous,
      value: redacted ? '[redacted]' : change.value,
    }
    for (const listener of listeners) {
      listener(payload, els)
    }
  }

  return { ref, emit }
}

export function getRegisteredComponents(): Array<RegisteredComponent> {
  return Array.from(registry.values())
}

export function getRegisteredComponent(ref: string): RegisteredComponent | undefined {
  return registry.get(ref)
}

export function elementsOfRef(ref: string): Array<HTMLElement> {
  const entry = registry.get(ref)
  if (!entry) {
    return []
  }
  return entry.getElements().filter((el): el is HTMLElement => el !== null && el !== undefined)
}

export function addChangeListener(listener: ChangeListener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
