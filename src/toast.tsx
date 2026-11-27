import { createContext, createSignal, omit, onCleanup, useContext } from 'solid-js'

import { runAction } from './foundation/action'
import type { ActionDetails } from './foundation/action'
import { inferSource } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'

export type ToastType = 'default' | 'success' | 'error' | 'info' | 'warning' | 'loading'
export type ToastDismissReason = 'close-press' | 'timeout' | 'swipe' | 'imperative'
export type ToastPauseReason = 'pointer' | 'focus' | 'window-blur'
export type ToastActionDetails = ActionDetails

export type ToastDismissDetails = {
  id: string
  reason: ToastDismissReason
}

export type ToastActionData = {
  label: string
  onClick: (details: ToastActionDetails) => unknown
}

export type ToastCancel = {
  label: string
  onClick?: () => void
}

export type ToastOptions = {
  id?: string
  title?: string
  description?: string
  type?: ToastType
  duration?: number
  action?: ToastActionData
  cancel?: ToastCancel
  onDismiss?: (details: ToastDismissDetails) => void
}

export type ToastData = Required<Pick<ToastOptions, 'id' | 'type' | 'duration'>> &
  Omit<ToastOptions, 'id' | 'type' | 'duration'>

export type ToastItem = ToastData

export type Toaster = {
  toasts: () => Array<ToastItem>
  add: (options: ToastOptions) => string
  update: (id: string, options: Partial<ToastOptions>) => void
  dismiss: (id: string, reason?: ToastDismissReason) => void
  dismissAll: () => void
  success: (title: string, options?: Omit<ToastOptions, 'title' | 'type'>) => string
  error: (title: string, options?: Omit<ToastOptions, 'title' | 'type'>) => string
  info: (title: string, options?: Omit<ToastOptions, 'title' | 'type'>) => string
  warning: (title: string, options?: Omit<ToastOptions, 'title' | 'type'>) => string
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((value: T) => string)
      error: string | ((error: unknown) => string)
    },
  ) => Promise<T>
}

let toastSeq = 1

/**
 * Creates a reactive Solid 2 toaster store with auto-dismiss timers and promise helper.
 */
export function createToaster(defaults: { duration?: number; limit?: number } = {}): Toaster {
  const defaultDuration = defaults.duration ?? 5000
  const limit = defaults.limit ?? 5
  const [toasts, setToasts] = createSignal<Array<ToastItem>>([])
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  const clearTimer = (id: string) => {
    const timer = timers.get(id)
    if (timer !== undefined) {
      clearTimeout(timer)
      timers.delete(id)
    }
  }

  const scheduleDismiss = (id: string, duration: number) => {
    clearTimer(id)
    if (duration <= 0 || !Number.isFinite(duration)) {
      return
    }
    timers.set(
      id,
      setTimeout(() => {
        timers.delete(id)
        dismiss(id, 'timeout')
      }, duration),
    )
  }

  const dismiss = (id: string, reason: ToastDismissReason = 'imperative') => {
    clearTimer(id)
    const current = toasts()
    const target = current.find((t) => t.id === id)
    if (!target) {
      return
    }
    setToasts(current.filter((t) => t.id !== id))
    target.onDismiss?.({ id, reason })
  }

  const dismissAll = () => {
    const current = toasts()
    for (const item of current) {
      clearTimer(item.id)
      item.onDismiss?.({ id: item.id, reason: 'imperative' })
    }
    setToasts([])
  }

  const add = (options: ToastOptions): string => {
    const id = options.id ?? `ui-toast-${toastSeq++}`
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

  const update = (id: string, patch: Partial<ToastOptions>) => {
    setToasts((prev) =>
      prev.map((item) => {
        if (item.id !== id) {
          return item
        }
        const next: ToastItem = { ...item, ...patch, id }
        scheduleDismiss(id, next.duration)
        return next
      }),
    )
  }

  const promiseHelper = <T,>(
    p: Promise<T>,
    messages: {
      loading: string
      success: string | ((value: T) => string)
      error: string | ((error: unknown) => string)
    },
  ): Promise<T> => {
    const id = add({ title: messages.loading, type: 'loading', duration: Infinity })
    return p.then(
      (value) => {
        const title =
          typeof messages.success === 'function' ? messages.success(value) : messages.success
        update(id, { title, type: 'success', duration: defaultDuration })
        return value
      },
      (error) => {
        const title = typeof messages.error === 'function' ? messages.error(error) : messages.error
        update(id, { title, type: 'error', duration: defaultDuration })
        throw error
      },
    )
  }

  return {
    toasts,
    add,
    update,
    dismiss,
    dismissAll,
    success: (title, opts) => add({ ...opts, title, type: 'success' }),
    error: (title, opts) => add({ ...opts, title, type: 'error' }),
    info: (title, opts) => add({ ...opts, title, type: 'info' }),
    warning: (title, opts) => add({ ...opts, title, type: 'warning' }),
    promise: promiseHelper,
  }
}

/**
 * Default global toaster instance.
 */
export const toast = createToaster()

export type ToastRegionOptions = {
  toaster?: Toaster
  label?: string
}

export type ToastRegionState = {
  count: number
  paused: boolean
}

export type ToastRegionProps = ToastRegionOptions &
  Omit<PartProps<'section', ToastRegionState>, keyof ToastRegionOptions>

export type ToastState = {
  type: ToastType
  open: boolean
}

export type ToastButtonState = {
  pending: boolean
  error: unknown
}

export type ToastActionProps = {
  action?: (details: ToastActionDetails) => unknown
}

export type ToastCloseProps = object
const ToastRegionContext = createContext<{ toaster: () => Toaster } | null>(null)
const ToastItemContext = createContext<{
  item: () => ToastItem
  dismiss: (reason: ToastDismissReason) => void
} | null>(null)

export function ToastRegion(props: ToastRegionProps) {
  let rootEl: HTMLElement | undefined
  const [paused, setPaused] = createSignal(false)
  const toaster = () => props.toaster ?? toast

  const state = (): ToastRegionState => ({
    count: toaster().toasts().length,
    paused: paused(),
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

  onCleanup(() => setPaused(false))

  const rest = omit(props, 'toaster', 'label')

  return (
    <ToastRegionContext value={{ toaster }}>
      {renderPart('section', rest, state, {
        ref: (el: HTMLElement) => {
          rootEl = el
        },
        attrs: () => ({
          role: 'region',
          'aria-label': props.label ?? 'Notifications',
          'aria-live': 'polite',
          'data-count': String(toaster().toasts().length),
        }),
        handlers: {
          onPointerEnter: () => setPaused(true),
          onPointerLeave: () => setPaused(false),
        },
      })}
    </ToastRegionContext>
  )
}

export function Toast(props: { toast: ToastItem } & Omit<PartProps<'div', ToastState>, 'toast'>) {
  const region = useContext(ToastRegionContext)
  const state = (): ToastState => ({
    type: props.toast.type,
    open: true,
  })
  const dismiss = (reason: ToastDismissReason) => {
    ;(region?.toaster() ?? toast).dismiss(props.toast.id, reason)
  }
  const rest = omit(props, 'toast')

  return (
    <ToastItemContext value={{ item: () => props.toast, dismiss }}>
      {renderPart('div', rest, state, {
        attrs: () => ({
          role: props.toast.type === 'error' ? 'alert' : 'status',
          'data-type': props.toast.type,
          'data-open': '',
        }),
      })}
    </ToastItemContext>
  )
}

export function ToastTitle(props: PartProps<'div'>) {
  return renderPart('div', props, () => ({}))
}

export function ToastDescription(props: PartProps<'div'>) {
  return renderPart('div', props, () => ({}))
}

export function ToastAction(
  props: ToastActionProps & Omit<PartProps<'button', ToastButtonState>, 'action' | 'type'>,
) {
  const ctx = useContext(ToastItemContext)
  const [pending, setPending] = createSignal(false)
  const [error, setError] = createSignal<unknown>(undefined)
  const state = (): ToastButtonState => ({ pending: pending(), error: error() })
  const rest = omit(props, 'action')

  return renderPart('button', rest, state, {
    attrs: () => ({
      type: 'button',
      'aria-busy': pending() ? 'true' : undefined,
      'data-pending': pending() ? '' : undefined,
    }),
    handlers: {
      onClick: (event: MouseEvent) => {
        if (pending()) {
          return
        }
        const fn = props.action ?? ctx?.item().action?.onClick
        if (!fn) {
          return
        }
        setError(undefined)
        runAction(fn, inferSource(event), {
          pending: setPending,
          done: () => ctx?.dismiss('close-press'),
          failed: setError,
        })
      },
    },
  })
}

export function ToastClose(props: ToastCloseProps & Omit<PartProps<'button'>, 'type'>) {
  const ctx = useContext(ToastItemContext)
  return renderPart('button', props, () => ({}), {
    attrs: () => ({ type: 'button', 'aria-label': 'Close' }),
    handlers: {
      onClick: () => ctx?.dismiss('close-press'),
    },
  })
}
