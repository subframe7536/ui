import { createEffect, untrack } from 'solid-js'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function getFocusableElements(container: HTMLElement): Array<HTMLElement> {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) =>
      !el.hasAttribute('disabled') &&
      el.getAttribute('aria-hidden') !== 'true' &&
      el.getAttribute('tabindex') !== '-1',
  )
}

export type FocusTarget = boolean | HTMLElement | null | (() => HTMLElement | null | undefined)

function resolveFocusTarget(target: FocusTarget | undefined): HTMLElement | null {
  if (!target || target === true) {
    return null
  }
  if (typeof target === 'function') {
    return target() ?? null
  }
  return target
}

/**
 * Manages initial focus, Tab focus trapping (when `trap` is true), and final focus restoration.
 */
export function useFocusManagement(options: {
  active: () => boolean
  container: () => HTMLElement | undefined
  trap?: () => boolean
  initialFocus?: () => FocusTarget | undefined
  finalFocus?: () => FocusTarget | undefined
}): void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab' || !options.trap?.()) {
      return
    }
    const container = options.container()
    if (!container) {
      return
    }
    const focusables = getFocusableElements(container)
    if (focusables.length === 0) {
      event.preventDefault()
      container.focus()
      return
    }
    const first = focusables[0]
    const last = focusables.at(-1)
    const activeEl = document.activeElement
    if (event.shiftKey) {
      if (activeEl === first || !container.contains(activeEl)) {
        event.preventDefault()
        last?.focus()
      }
    } else if (activeEl === last || !container.contains(activeEl)) {
      event.preventDefault()
      first?.focus()
    }
  }

  createEffect(options.active, (isActive) => {
    if (!isActive || typeof document === 'undefined') {
      return
    }
    const previousFocus = document.activeElement as HTMLElement | null

    queueMicrotask(() => {
      const container = options.container()
      if (!container) {
        return
      }
      const initial = options.initialFocus?.()
      if (initial === false) {
        return
      }
      const explicit = resolveFocusTarget(initial)
      if (explicit) {
        explicit.focus()
        return
      }
      const focusables = getFocusableElements(container)
      if (focusables.length > 0) {
        const preferred =
          focusables.find((el) => el.getAttribute('aria-selected') === 'true') ?? focusables[0]
        preferred?.focus()
      } else {
        if (!container.hasAttribute('tabindex')) {
          container.setAttribute('tabindex', '-1')
        }
        container.focus()
      }
    })

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      const finalTarget = untrack(() => options.finalFocus?.())
      if (finalTarget === false) {
        return
      }
      const explicit = resolveFocusTarget(finalTarget)
      const toFocus = explicit ?? previousFocus
      if (toFocus && typeof toFocus.focus === 'function' && document.contains(toFocus)) {
        toFocus.focus()
      }
    }
  })
}

export type Orientation = 'horizontal' | 'vertical'
export type Direction = 'ltr' | 'rtl'

/**
 * Computes the next focusable element index for roving tabindex keyboard navigation.
 */
export function navigateRoving(
  event: KeyboardEvent,
  items: Array<HTMLElement>,
  currentEl: HTMLElement,
  options: {
    orientation?: Orientation
    direction?: Direction
    loop?: boolean
  } = {},
): HTMLElement | undefined {
  const { orientation = 'horizontal', direction = 'ltr', loop = true } = options
  const enabled = items.filter(
    (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true',
  )
  if (enabled.length === 0) {
    return undefined
  }
  const index = enabled.indexOf(currentEl)
  if (index < 0) {
    return undefined
  }

  const prevKey =
    orientation === 'horizontal' ? (direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft') : 'ArrowUp'
  const nextKey =
    orientation === 'horizontal' ? (direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown'

  let nextIndex: number
  if (event.key === nextKey) {
    nextIndex = index + 1 < enabled.length ? index + 1 : loop ? 0 : index
  } else if (event.key === prevKey) {
    nextIndex = index - 1 >= 0 ? index - 1 : loop ? enabled.length - 1 : index
  } else if (event.key === 'Home') {
    nextIndex = 0
  } else if (event.key === 'End') {
    nextIndex = enabled.length - 1
  } else {
    return undefined
  }

  event.preventDefault()
  const target = enabled[nextIndex]
  target?.focus()
  return target
}
