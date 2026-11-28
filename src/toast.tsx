import type { JSX } from '@solidjs/web'
import {
  For,
  Show,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  merge,
  omit,
  onCleanup,
  useContext,
} from 'solid-js'

import { runAction } from './foundation/action'
import type { ActionDetails } from './foundation/action'
import { inferSource } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'

export type ToastType = 'default' | 'success' | 'error' | 'info' | 'warning' | 'loading'
export type ToastDismissReason = 'close-press' | 'timeout' | 'swipe' | 'escape-key' | 'imperative'
export type ToastPauseReason = 'pointer' | 'focus' | 'window-blur'
export type ToastActionDetails = ActionDetails

export type ToastDismissDetails = {
  id: string
  reason: ToastDismissReason
}

export type ToastActionData = {
  label: string
  href?: string
  dismiss?: boolean
  onClick?: (details: ToastActionDetails) => unknown
  onAction?: (event: Event | undefined, details: ToastActionDetails) => unknown
}

export type ToastCancel = {
  label: string
  onClick?: () => void
  onCancel?: (event: Event | undefined, details: ToastActionDetails) => unknown
}

export type ToastOptions = {
  id?: string
  title?: string
  description?: string
  type?: ToastType
  duration?: number
  dismissible?: boolean
  priority?: 'polite' | 'assertive'
  data?: unknown
  action?: ToastActionData
  cancel?: ToastCancel
  onDismiss?: (details: ToastDismissDetails) => void
}

export type ToastData = Required<Pick<ToastOptions, 'id' | 'type' | 'duration'>> &
  Omit<ToastOptions, 'id' | 'type' | 'duration'>

export type ToastItem = ToastData

export type ToastPromiseMessage<T> = string | ToastOptions | ((value: T) => string | ToastOptions)

export type Toaster = ((
  title: string | ToastOptions,
  options?: Omit<ToastOptions, 'title'>,
) => string) & {
  toasts: () => Array<ToastItem>
  add: (options: ToastOptions) => string
  update: (id: string, options: Partial<ToastOptions>) => boolean
  dismiss: (id?: string, reason?: ToastDismissReason) => void
  dismissAll: () => void
  pause: () => void
  resume: () => void
  success: (title: string, options?: Omit<ToastOptions, 'title' | 'type'>) => string
  error: (title: string, options?: Omit<ToastOptions, 'title' | 'type'>) => string
  info: (title: string, options?: Omit<ToastOptions, 'title' | 'type'>) => string
  warning: (title: string, options?: Omit<ToastOptions, 'title' | 'type'>) => string
  loading: (title: string, options?: Omit<ToastOptions, 'title' | 'type'>) => string
  promise: <T>(
    promise: Promise<T> | (() => Promise<T>),
    messages: {
      loading: string | ToastOptions
      success: ToastPromiseMessage<T>
      error: ToastPromiseMessage<unknown>
    },
  ) => Promise<T>
}

let toastSeq = 1

function normalizePromiseResult(
  res: string | ToastOptions,
  fallbackType: ToastType,
  defaultDuration: number,
): Partial<ToastOptions> {
  if (typeof res === 'string') {
    return { title: res, type: fallbackType, duration: defaultDuration }
  }
  return {
    ...res,
    type: res.type ?? fallbackType,
    duration: res.duration ?? defaultDuration,
  }
}

/**
 * Creates a reactive Solid 2 toaster store with auto-dismiss timers and promise helper.
 */
export function createToaster(
  defaults: { duration?: number; limit?: number; overlays?: unknown } = {},
): Toaster {
  const defaultDuration = defaults.duration ?? 5000
  const limit = defaults.limit ?? 5
  const [toasts, setToasts] = createSignal<Array<ToastItem>>([])
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const remaining = new Map<string, { ms: number; startedAt: number }>()
  let isPaused = false

  const clearTimer = (id: string) => {
    const timer = timers.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      timers.delete(id)
    }
  }

  const scheduleDismiss = (id: string, duration: number) => {
    clearTimer(id)
    remaining.delete(id)
    if (duration <= 0 || !Number.isFinite(duration)) {
      return
    }
    remaining.set(id, { ms: duration, startedAt: Date.now() })
    if (isPaused) {
      return
    }
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id)
        remaining.delete(id)
        dismiss(id, 'timeout')
      }, duration),
    )
  }

  const pause = () => {
    if (isPaused) {
      return
    }
    isPaused = true
    const now = Date.now()
    for (const [id, info] of remaining.entries()) {
      clearTimer(id)
      const left = Math.max(200, info.ms - (now - info.startedAt))
      remaining.set(id, { ms: left, startedAt: now })
    }
  }

  const resume = () => {
    if (!isPaused) {
      return
    }
    isPaused = false
    const now = Date.now()
    for (const [id, info] of remaining.entries()) {
      remaining.set(id, { ms: info.ms, startedAt: now })
      timers.set(
        id,
        setTimeout(() => {
          timers.delete(id)
          remaining.delete(id)
          dismiss(id, 'timeout')
        }, info.ms),
      )
    }
  }

  const dismissAll = () => {
    const current = toasts()
    for (const item of current) {
      clearTimer(item.id)
      remaining.delete(item.id)
      item.onDismiss?.({ id: item.id, reason: 'imperative' })
    }
    setToasts([])
  }

  const dismiss = (id?: string, reason: ToastDismissReason = 'imperative') => {
    if (id === undefined) {
      dismissAll()
      return
    }
    clearTimer(id)
    remaining.delete(id)
    const current = toasts()
    const target = current.find((t) => t.id === id)
    if (!target) {
      return
    }
    setToasts(current.filter((t) => t.id !== id))
    target.onDismiss?.({ id, reason })
  }

  const add = (options: ToastOptions): string => {
    const id = options.id ?? `ui-toast-${toastSeq++}`
    if (typeof window === 'undefined') {
      return id
    }
    const item: ToastItem = {
      ...options,
      id,
      type: options.type ?? 'default',
      duration: options.duration ?? (options.type === 'loading' ? Infinity : defaultDuration),
    }
    setToasts((prev) => {
      const next = [...prev.filter((t) => t.id !== id), item]
      return next.length > limit ? next.slice(next.length - limit) : next
    })
    scheduleDismiss(id, item.duration)
    return id
  }

  const update = (id: string, patch: Partial<ToastOptions>): boolean => {
    let found = false
    setToasts((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item
        }
        found = true
        const nextDuration =
          patch.duration ??
          (patch.type && patch.type !== 'loading' && !Number.isFinite(item.duration)
            ? defaultDuration
            : item.duration)
        const next: ToastItem = { ...item, ...patch, id, duration: nextDuration }
        scheduleDismiss(id, next.duration)
        return next
      }),
    )
    return found
  }

  const promiseHelper = <T,>(
    promiseOrFn: Promise<T> | (() => Promise<T>),
    messages: {
      loading: string | ToastOptions
      success: ToastPromiseMessage<T>
      error: ToastPromiseMessage<unknown>
    },
  ): Promise<T> => {
    const loadingOpts: ToastOptions =
      typeof messages.loading === 'string'
        ? { title: messages.loading, type: 'loading', duration: Infinity }
        : { ...messages.loading, type: messages.loading.type ?? 'loading', duration: Infinity }
    const id = add(loadingOpts)
    const p = typeof promiseOrFn === 'function' ? promiseOrFn() : promiseOrFn
    return p.then(
      (value) => {
        const resolved =
          typeof messages.success === 'function' ? messages.success(value) : messages.success
        update(id, normalizePromiseResult(resolved, 'success', defaultDuration))
        return value
      },
      (error) => {
        const resolved =
          typeof messages.error === 'function' ? messages.error(error) : messages.error
        update(id, normalizePromiseResult(resolved, 'error', defaultDuration))
        throw error
      },
    )
  }

  const call = (title: string | ToastOptions, options?: Omit<ToastOptions, 'title'>): string =>
    typeof title === 'string' ? add({ ...options, title }) : add(title)

  return Object.assign(call, {
    toasts,
    add,
    update,
    dismiss,
    dismissAll,
    pause,
    resume,
    success: (title: string, opts?: Omit<ToastOptions, 'title' | 'type'>) =>
      add({ ...opts, title, type: 'success' }),
    error: (title: string, opts?: Omit<ToastOptions, 'title' | 'type'>) =>
      add({ ...opts, title, type: 'error' }),
    info: (title: string, opts?: Omit<ToastOptions, 'title' | 'type'>) =>
      add({ ...opts, title, type: 'info' }),
    warning: (title: string, opts?: Omit<ToastOptions, 'title' | 'type'>) =>
      add({ ...opts, title, type: 'warning' }),
    loading: (title: string, opts?: Omit<ToastOptions, 'title' | 'type'>) =>
      add({ ...opts, title, type: 'loading', duration: opts?.duration ?? Infinity }),
    promise: promiseHelper,
  })
}

/**
 * Default global toaster instance.
 */
export const toast = createToaster()

export type ToastRegionOptions = {
  toaster?: Toaster
  label?: string
  side?: 'top' | 'bottom'
  align?: 'start' | 'center' | 'end'
  maxVisible?: number
  expanded?: boolean
  shortcut?: string
  pendingAnnouncement?: string
  debug?: boolean
  container?: Element
  children?: JSX.Element | ((item: ToastItem) => JSX.Element)
}

export type ToastRegionState = {
  count: number
  paused: boolean
  side: 'top' | 'bottom'
  align: 'start' | 'center' | 'end'
  expanded: boolean
}

export type ToastRegionProps = ToastRegionOptions &
  Omit<PartProps<'section', ToastRegionState>, keyof ToastRegionOptions | 'children'>

export type ToastState = {
  type: ToastType
  open: boolean
  index: number
  front: boolean
  expanded: boolean
  leaving: boolean
}

export type ToastButtonState = {
  pending: boolean
  error: unknown
}

export type ToastActionProps = {
  action?: (details: ToastActionDetails) => unknown
  onAction?: (event: Event | undefined, details: ToastActionDetails) => unknown
  dismiss?: boolean
}

export type ToastCloseProps = {
  action?: (event: Event | undefined, details: ToastActionDetails) => unknown
}

type ToastLayoutEntry = {
  index: number
  offset: number
  height: number
  leaving: boolean
}

type LeavingSnapshot = {
  item: ToastItem
  index: number
  offset: number
  height: number
}

type ToastRegionContextValue = {
  toaster: () => Toaster
  side: () => 'top' | 'bottom'
  align: () => 'start' | 'center' | 'end'
  expanded: () => boolean
  registerHeight: (id: string, height: number) => void
  registerElement: (id: string, el: HTMLElement | undefined) => void
  getLayout: (id: string) => ToastLayoutEntry
}

const ToastRegionContext = createContext<ToastRegionContextValue | null>(null)
const ToastItemContext = createContext<{
  item: () => ToastItem
  index: () => number
  leaving: () => boolean
  dismiss: (reason: ToastDismissReason) => void
} | null>(null)

function getTransitionDurationMs(el: HTMLElement | undefined): number {
  if (!el || typeof getComputedStyle !== 'function') {
    return 0
  }
  const raw = getComputedStyle(el).transitionDuration || ''
  let maxMs = 0
  for (const part of raw.split(',')) {
    const trimmed = part.trim()
    if (trimmed.endsWith('ms')) {
      maxMs = Math.max(maxMs, Number.parseFloat(trimmed) || 0)
    } else if (trimmed.endsWith('s')) {
      maxMs = Math.max(maxMs, (Number.parseFloat(trimmed) || 0) * 1000)
    }
  }
  return maxMs
}

function measureNaturalHeight(el: HTMLElement): number {
  const prevHeight = el.style.getPropertyValue('height')
  const prevPriority = el.style.getPropertyPriority('height')
  el.style.setProperty('height', 'auto', 'important')
  const rect = el.getBoundingClientRect()
  const height = rect.height || el.offsetHeight || el.scrollHeight
  if (prevHeight) {
    el.style.setProperty('height', prevHeight, prevPriority)
  } else {
    el.style.removeProperty('height')
  }
  return Math.round(height)
}

export function ToastRegion(props: ToastRegionProps) {
  let rootEl: HTMLElement | undefined
  const [hovered, setHovered] = createSignal(false)
  const [focused, setFocused] = createSignal(false)
  const [heights, setHeights] = createSignal<Record<string, number>>({})
  const [leavingMap, setLeavingMap] = createSignal<Record<string, LeavingSnapshot>>({})
  const leaveTimers = new Map<string, ReturnType<typeof setTimeout>>()
  const toastElements = new Map<string, HTMLElement>()
  let prevActive: Array<ToastItem> = []
  let prevLayout: Record<string, { index: number; offset: number; height: number }> = {}

  const toaster = () => props.toaster ?? toast
  const side = () => props.side ?? 'bottom'
  const align = () => props.align ?? 'end'
  const maxVisible = () => props.maxVisible ?? 3
  const paused = () => hovered() || focused()
  const expanded = () => !!props.expanded || paused()

  // Newest toast sits at index 0 (front).
  const orderedToasts = createMemo(() => {
    const list = toaster().toasts()
    const reversed = [...list].reverse()
    return reversed.slice(0, maxVisible())
  })

  const stackMetrics = createMemo(() => {
    const list = orderedToasts()
    const map = heights()
    let offset = 0
    let total = 0
    const layout: Record<string, { index: number; offset: number; height: number }> = {}
    for (const [i, item] of list.entries()) {
      const h = map[item.id] ?? 0
      layout[item.id] = { index: i, offset, height: h }
      offset += h
      total += h
    }
    const front = list[0] ? (map[list[0].id] ?? 0) : 0
    return { layout, total, front, count: list.length }
  })

  // Keep recently dismissed toasts mounted briefly with data-ending-style when CSS exit transitions exist.
  createEffect(
    () => ({ current: orderedToasts(), layout: stackMetrics().layout }),
    ({ current, layout }) => {
      const currentIds = new Set(current.map((t) => t.id))
      if (typeof window !== 'undefined') {
        const removed = prevActive.filter((item) => !currentIds.has(item.id))
        const animating: Array<{ item: ToastItem; durationMs: number }> = []
        for (const item of removed) {
          const durationMs = getTransitionDurationMs(toastElements.get(item.id))
          if (durationMs > 0) {
            animating.push({ item, durationMs })
          }
        }
        if (animating.length > 0) {
          setLeavingMap((prev) => {
            const next = { ...prev }
            for (const { item } of animating) {
              const snap = prevLayout[item.id] ?? { index: 0, offset: 0, height: 0 }
              next[item.id] = { item, ...snap }
            }
            return next
          })
          for (const { item, durationMs } of animating) {
            const existing = leaveTimers.get(item.id)
            if (existing !== undefined) {
              clearTimeout(existing)
            }
            leaveTimers.set(
              item.id,
              setTimeout(
                () => {
                  leaveTimers.delete(item.id)
                  setLeavingMap((prev) => {
                    if (!(item.id in prev)) {
                      return prev
                    }
                    const next = { ...prev }
                    delete next[item.id]
                    return next
                  })
                },
                Math.min(durationMs, 400) + 20,
              ),
            )
          }
        }
        // If a toast ID was re-added while leaving, cancel its leaving state.
        setLeavingMap((prev) => {
          let changed = false
          const next = { ...prev }
          for (const id of currentIds) {
            if (id in next) {
              delete next[id]
              const timer = leaveTimers.get(id)
              if (timer !== undefined) {
                clearTimeout(timer)
                leaveTimers.delete(id)
              }
              changed = true
            }
          }
          return changed ? next : prev
        })
      }
      prevActive = current
      prevLayout = layout
    },
  )

  const renderedToasts = createMemo(() => {
    const active = orderedToasts()
    const activeIds = new Set(active.map((t) => t.id))
    const leaving = Object.values(leavingMap()).filter((snap) => !activeIds.has(snap.item.id))
    return [...active, ...leaving.map((s) => s.item)]
  })

  const registerHeight = (id: string, height: number) => {
    if (!Number.isFinite(height) || height <= 0) {
      return
    }
    setHeights((prev) => (prev[id] === height ? prev : { ...prev, [id]: height }))
  }

  const getLayout = (id: string): ToastLayoutEntry => {
    const active = stackMetrics().layout[id]
    if (active) {
      return { ...active, leaving: false }
    }
    const leaving = leavingMap()[id]
    if (leaving) {
      return {
        index: leaving.index,
        offset: leaving.offset,
        height: leaving.height,
        leaving: true,
      }
    }
    return { index: 0, offset: 0, height: 0, leaving: false }
  }

  const state = (): ToastRegionState => ({
    count: orderedToasts().length,
    paused: paused(),
    side: side(),
    align: align(),
    expanded: expanded(),
  })

  registerComponent({
    component: 'toast',
    getElements: () => [rootEl],
    getState: () => ({ count: toaster().toasts().length }),
    getText: () =>
      toaster()
        .toasts()
        .map((t) => [t.title, t.description].filter(Boolean).join(' — '))
        .filter(Boolean),
    actions: {
      dismiss: (id) => {
        if (id) {
          toaster().dismiss(
            typeof id === 'string' ? id : typeof id === 'number' ? String(id) : '',
            'imperative',
          )
        } else {
          toaster().dismissAll()
        }
      },
      dismissAll: () => toaster().dismissAll(),
    },
  })

  onCleanup(() => {
    for (const timer of leaveTimers.values()) {
      clearTimeout(timer)
    }
    leaveTimers.clear()
    if (typeof window !== 'undefined') {
      toaster().resume()
    }
  })

  const rest = omit(
    props,
    'toaster',
    'label',
    'side',
    'align',
    'maxVisible',
    'expanded',
    'shortcut',
    'pendingAnnouncement',
    'debug',
    'container',
    'children',
  )

  const combinedProps: PartProps<'section', ToastRegionState> = merge(rest, {
    get children() {
      const renderChild = props.children
      const hasStaticChildren = renderChild !== undefined && typeof renderChild !== 'function'
      return (
        <ol
          data-slot="toast-list"
          style={{
            margin: '0',
            padding: '0',
            'list-style': 'none',
          }}
        >
          <Show when={!hasStaticChildren} fallback={renderChild as JSX.Element}>
            <For each={renderedToasts()} keyed={(item) => item.id}>
              {(item, idx) => (
                <ToastItemContext
                  value={{
                    item,
                    index: idx,
                    leaving: () => getLayout(item().id).leaving,
                    dismiss: (reason) => toaster().dismiss(item().id, reason),
                  }}
                >
                  <Show
                    when={typeof renderChild === 'function'}
                    fallback={
                      <Toast toast={item()}>
                        <div data-slot="stack">
                          <Show when={item().title}>
                            <ToastTitle>{item().title}</ToastTitle>
                          </Show>
                          <Show when={item().description}>
                            <ToastDescription>{item().description}</ToastDescription>
                          </Show>
                        </div>
                        <Show when={item().action}>
                          {(act) => <ToastAction>{act().label}</ToastAction>}
                        </Show>
                        <Show when={item().cancel}>
                          {(can) => (
                            <ToastClose
                              action={(event, details) => {
                                if (can().onCancel) {
                                  return can().onCancel?.(event, details)
                                }
                                can().onClick?.()
                                return undefined
                              }}
                            >
                              {can().label}
                            </ToastClose>
                          )}
                        </Show>
                      </Toast>
                    }
                  >
                    {typeof renderChild === 'function' ? renderChild(item()) : null}
                  </Show>
                </ToastItemContext>
              )}
            </For>
          </Show>
        </ol>
      )
    },
  })

  return (
    <ToastRegionContext
      value={{
        toaster,
        side,
        align,
        expanded,
        registerHeight,
        registerElement: (id, el) => {
          if (el) {
            toastElements.set(id, el)
          } else {
            toastElements.delete(id)
          }
        },
        getLayout,
      }}
    >
      {renderPart('section', combinedProps, state, {
        ref: (el: HTMLElement) => {
          rootEl = el
        },
        attrs: () => {
          const metrics = stackMetrics()
          const open = metrics.count > 0 || renderedToasts().length > 0
          return {
            role: open ? 'region' : undefined,
            'aria-label': open
              ? (props['aria-label'] ?? props.label ?? 'Notifications')
              : undefined,
            'aria-live': 'polite',
            'data-slot': 'toast-region',
            'data-side': side(),
            'data-align': align(),
            'data-expanded': expanded() ? '' : undefined,
            'data-count': String(metrics.count),
          }
        },
        style: () => {
          const metrics = stackMetrics()
          const s = side()
          const a = align()
          return {
            position: 'fixed',
            'z-index': 2_147_483_000,
            display: 'flex',
            'flex-direction': 'column',
            'max-width': '100vw',
            ...(s === 'top'
              ? { top: 'env(safe-area-inset-top, 0px)' }
              : { bottom: 'calc(var(--keyboard-inset, 0px) + env(safe-area-inset-bottom, 0px))' }),
            ...(a === 'start'
              ? { 'inset-inline-start': 'env(safe-area-inset-left, 0px)' }
              : a === 'center'
                ? { left: '50%', translate: '-50% 0' }
                : { 'inset-inline-end': 'env(safe-area-inset-right, 0px)' }),
            '--toast-count': String(metrics.count),
            '--toast-front-height': metrics.front > 0 ? `${metrics.front}px` : undefined,
            '--toast-stack-height': metrics.total > 0 ? `${metrics.total}px` : undefined,
          }
        },
        handlers: {
          onPointerEnter: (e: PointerEvent) => {
            if (e.pointerType !== 'touch') {
              setHovered(true)
              toaster().pause()
            }
          },
          onPointerLeave: (e: PointerEvent) => {
            if (e.pointerType !== 'touch') {
              setHovered(false)
              if (!focused()) {
                toaster().resume()
              }
            }
          },
          onFocusIn: () => {
            setFocused(true)
            toaster().pause()
          },
          onFocusOut: (e: FocusEvent) => {
            const next = e.relatedTarget as Node | null
            if (!next || !rootEl?.contains(next)) {
              setFocused(false)
              if (!hovered()) {
                toaster().resume()
              }
            }
          },
        },
      })}
    </ToastRegionContext>
  )
}

export function Toast(props: { toast?: ToastItem } & Omit<PartProps<'li', ToastState>, 'toast'>) {
  const region = useContext(ToastRegionContext)
  const inherited = useContext(ToastItemContext)
  const [starting, setStarting] = createSignal(typeof window !== 'undefined')
  const [swipeX, setSwipeX] = createSignal(0)
  const [swipeY, setSwipeY] = createSignal(0)
  const [swiping, setSwiping] = createSignal(false)
  const [swipeDir, setSwipeDir] = createSignal<'left' | 'right' | 'up' | 'down' | undefined>(
    undefined,
  )

  const currentItem = () =>
    props.toast ??
    inherited?.item() ?? {
      id: '',
      type: 'default' as ToastType,
      duration: 5000,
    }

  const layout = (): ToastLayoutEntry => {
    const id = currentItem().id
    return region && id
      ? region.getLayout(id)
      : { index: inherited?.index() ?? 0, offset: 0, height: 0, leaving: false }
  }

  const state = (): ToastState => {
    const l = layout()
    return {
      type: currentItem().type,
      open: !l.leaving,
      index: l.index,
      front: l.index === 0,
      expanded: region?.expanded() ?? false,
      leaving: l.leaving,
    }
  }

  const dismiss = (reason: ToastDismissReason) => {
    const item = currentItem()
    if (item.id) {
      ;(region?.toaster() ?? toast).dismiss(item.id, reason)
    }
  }

  let elRef: HTMLElement | undefined
  let ro: ResizeObserver | undefined
  let enterFrame1: number | undefined
  let enterFrame2: number | undefined

  const measure = () => {
    const id = currentItem().id
    if (elRef && id && region) {
      const h = measureNaturalHeight(elRef)
      if (h > 0) {
        region.registerHeight(id, h)
      }
    }
  }

  onCleanup(() => {
    const id = currentItem().id
    if (id) {
      region?.registerElement(id, undefined)
    }
    ro?.disconnect()
    if (enterFrame1 !== undefined) {
      cancelAnimationFrame(enterFrame1)
    }
    if (enterFrame2 !== undefined) {
      cancelAnimationFrame(enterFrame2)
    }
  })

  const rest = omit(props, 'toast')

  return (
    <ToastItemContext
      value={{
        item: currentItem,
        index: () => layout().index,
        leaving: () => layout().leaving,
        dismiss,
      }}
    >
      {renderPart('li', rest, state, {
        ref: (el: HTMLElement) => {
          elRef = el
          const id = currentItem().id
          if (id) {
            region?.registerElement(id, el)
          }
          if (typeof window !== 'undefined') {
            measure()
            if (starting()) {
              enterFrame1 = requestAnimationFrame(() => {
                measure()
                if (elRef) {
                  void elRef.offsetHeight
                }
                enterFrame2 = requestAnimationFrame(() => {
                  setStarting(false)
                })
              })
            }
            if (typeof ResizeObserver !== 'undefined') {
              ro?.disconnect()
              ro = new ResizeObserver(measure)
              ro.observe(el)
            }
          }
        },
        attrs: () => {
          const s = state()
          return {
            role: s.type === 'error' ? 'alert' : 'status',
            tabindex: 0,
            'data-slot': 'toast',
            'data-type': s.type,
            'data-open': s.leaving ? undefined : '',
            'data-front': s.front ? '' : undefined,
            'data-expanded': s.expanded ? '' : undefined,
            'data-starting-style': starting() ? '' : undefined,
            'data-ending-style': s.leaving ? '' : undefined,
            'data-swiping': swiping() ? '' : undefined,
            'data-swipe-direction': swipeDir(),
          }
        },
        style: () => {
          const l = layout()
          const item = currentItem()
          return {
            'touch-action': item.dismissible === false ? undefined : 'none',
            '--toast-index': String(l.index),
            '--toast-offset': `${l.offset}px`,
            '--toast-height': l.height > 0 ? `${l.height}px` : undefined,
            '--toast-swipe-x': swiping() ? `${swipeX()}px` : undefined,
            '--toast-swipe-y': swiping() ? `${swipeY()}px` : undefined,
          }
        },
        handlers: {
          onKeyDown: (e: KeyboardEvent) => {
            if (e.key === 'Escape' && currentItem().dismissible !== false) {
              e.preventDefault()
              dismiss('escape-key')
            }
          },
          onPointerDown: (e: PointerEvent) => {
            if (currentItem().dismissible === false || e.button !== 0) {
              return
            }
            const target = e.target as HTMLElement | null
            if (target?.closest('button, a, input, select, textarea')) {
              return
            }
            const startX = e.clientX
            const startY = e.clientY
            const side = region?.side() ?? 'bottom'
            const align = region?.align() ?? 'end'
            let axis: 'x' | 'y' | null = null

            const onMove = (ev: PointerEvent) => {
              const dx = ev.clientX - startX
              const dy = ev.clientY - startY
              if (!axis && Math.hypot(dx, dy) > 6) {
                axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y'
                setSwiping(true)
              }
              if (!axis) {
                return
              }
              if (axis === 'x') {
                const clampedX =
                  align === 'end' ? Math.max(0, dx) : align === 'start' ? Math.min(0, dx) : dx
                setSwipeX(clampedX)
                setSwipeY(0)
                setSwipeDir(clampedX >= 0 ? 'right' : 'left')
              } else {
                const clampedY = side === 'bottom' ? Math.max(0, dy) : Math.min(0, dy)
                setSwipeX(0)
                setSwipeY(clampedY)
                setSwipeDir(clampedY >= 0 ? 'down' : 'up')
              }
            }

            const onUp = () => {
              const dist = axis === 'x' ? Math.abs(swipeX()) : Math.abs(swipeY())
              setSwiping(false)
              setSwipeX(0)
              setSwipeY(0)
              window.removeEventListener('pointermove', onMove)
              window.removeEventListener('pointerup', onUp)
              window.removeEventListener('pointercancel', onUp)
              if (dist > 60) {
                dismiss('swipe')
              } else {
                setSwipeDir(undefined)
              }
            }

            window.addEventListener('pointermove', onMove)
            window.addEventListener('pointerup', onUp)
            window.addEventListener('pointercancel', onUp)
          },
        },
      })}
    </ToastItemContext>
  )
}

export function ToastTitle(props: PartProps<'div'>) {
  const ctx = useContext(ToastItemContext)
  const resolvedProps: PartProps<'div'> = merge(props, {
    get children() {
      return props.children ?? ctx?.item().title
    },
  })
  return (
    <Show when={'children' in props || ctx?.item().title !== undefined}>
      {renderPart('div', resolvedProps, () => ({}), {
        attrs: () => ({ 'data-slot': 'toast-title' }),
      })}
    </Show>
  )
}

export function ToastDescription(props: PartProps<'div'>) {
  const ctx = useContext(ToastItemContext)
  const resolvedProps: PartProps<'div'> = merge(props, {
    get children() {
      return props.children ?? ctx?.item().description
    },
  })
  return (
    <Show when={'children' in props || ctx?.item().description !== undefined}>
      {renderPart('div', resolvedProps, () => ({}), {
        attrs: () => ({ 'data-slot': 'toast-description' }),
      })}
    </Show>
  )
}

export function ToastAction(
  props: ToastActionProps &
    Omit<PartProps<'button', ToastButtonState>, 'action' | 'onAction' | 'type'>,
) {
  const ctx = useContext(ToastItemContext)
  const [pending, setPending] = createSignal(false)
  const [error, setError] = createSignal<unknown>(undefined)
  const state = (): ToastButtonState => ({ pending: pending(), error: error() })
  const rest = omit(props, 'action', 'onAction', 'dismiss')

  const itemAction = () => ctx?.item().action
  const hasAction = () => Boolean(itemAction() || props.action || props.onAction || props.children)

  const resolvedProps: PartProps<'button', ToastButtonState> = merge(rest, {
    get children() {
      return props.children ?? itemAction()?.label
    },
  })

  return (
    <Show when={hasAction()}>
      <Show
        when={itemAction()?.href}
        fallback={renderPart('button', resolvedProps, state, {
          attrs: () => ({
            type: 'button',
            'data-slot': 'toast-action',
            'aria-busy': pending() ? 'true' : undefined,
            'aria-disabled': pending() ? 'true' : undefined,
            'data-pending': pending() ? '' : undefined,
          }),
          handlers: {
            onClick: (event: MouseEvent) => {
              if (pending()) {
                return
              }
              const act = itemAction()
              const shouldDismiss = props.dismiss ?? act?.dismiss ?? true
              const fn = props.onAction ?? props.action ?? act?.onAction ?? act?.onClick
              if (!fn) {
                if (shouldDismiss) {
                  ctx?.dismiss('close-press')
                }
                return
              }
              const isActionWithEvent = fn === props.onAction || fn === act?.onAction
              const wrapped = (details: ToastActionDetails) =>
                isActionWithEvent
                  ? fn(event, details)
                  : (fn as (d: ToastActionDetails) => unknown)(details)
              setError(undefined)
              runAction(wrapped, inferSource(event), {
                pending: setPending,
                done: () => {
                  if (shouldDismiss) {
                    ctx?.dismiss('close-press')
                  }
                },
                failed: setError,
              })
            },
          },
        })}
      >
        {(href) =>
          renderPart(
            'a',
            merge(resolvedProps as unknown as PartProps<'a', ToastButtonState>, {
              get href() {
                return href()
              },
            }),
            state,
            {
              attrs: () => ({
                'data-slot': 'toast-action',
              }),
              handlers: {
                onClick: () => {
                  if (props.dismiss ?? itemAction()?.dismiss ?? true) {
                    ctx?.dismiss('close-press')
                  }
                },
              },
            },
          )
        }
      </Show>
    </Show>
  )
}

export function ToastClose(
  props: ToastCloseProps & Omit<PartProps<'button', ToastButtonState>, 'action' | 'type'>,
) {
  const ctx = useContext(ToastItemContext)
  const [pending, setPending] = createSignal(false)
  const [error, setError] = createSignal<unknown>(undefined)
  const state = (): ToastButtonState => ({ pending: pending(), error: error() })
  const rest = omit(props, 'action')

  return renderPart('button', rest, state, {
    attrs: () => ({
      type: 'button',
      'data-slot': 'toast-close',
      'aria-label': props['aria-label'] ?? (props.children ? undefined : 'Close'),
      'aria-busy': pending() ? 'true' : undefined,
      'aria-disabled': pending() ? 'true' : undefined,
      'data-pending': pending() ? '' : undefined,
    }),
    handlers: {
      onClick: (event: MouseEvent) => {
        if (pending()) {
          return
        }
        const fn = props.action
        if (!fn) {
          ctx?.dismiss('close-press')
          return
        }
        setError(undefined)
        runAction((details) => fn(event, details), inferSource(event), {
          pending: setPending,
          done: () => ctx?.dismiss('close-press'),
          failed: setError,
        })
      },
    },
  })
}
