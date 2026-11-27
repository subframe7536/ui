import type { JSX } from '@solidjs/web'
import {
  Show,
  createContext,
  createMemo,
  createSignal,
  createUniqueId,
  merge,
  omit,
  onCleanup,
  untrack,
  useContext,
} from 'solid-js'

import {
  createController,
  useController,
  useControllerEntry,
  useControllerTarget,
} from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { useDismissLayer } from './foundation/dismissal'
import { usePopupPosition } from './foundation/popup'
import type { Align, PortalProps, PositionProps, Side } from './foundation/popup'
import { registerComponent } from './foundation/registry'
import {
  SafePortal,
  formatAriaKeyShortcuts,
  formatDisplayShortcut,
  renderPart,
} from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

const defaultTopSide = (): Side => 'top'
const defaultAlign = (): Align => 'center'

const emptyArrowStyle = (): Record<string, string> => ({})

export type TooltipOpenChangeReason =
  | 'trigger-hover'
  | 'trigger-focus'
  | 'trigger-press'
  | 'escape-key'
  | 'imperative'

export type TooltipPayloadChangeReason = 'trigger-hover' | 'trigger-focus' | 'imperative'

export type TooltipApi<Payload = unknown> = {
  open: (payload?: Payload, options?: ChangeOptions<TooltipOpenChangeReason>) => void
  close: (options?: ChangeOptions<TooltipOpenChangeReason>) => void
  setOpen: (open: boolean, options?: ChangeOptions<TooltipOpenChangeReason>) => void
  isOpen: () => boolean
  getPayload: () => Payload | undefined
}

export function createTooltipController<Payload = unknown>() {
  return createController<TooltipApi<Payload>>()
}

export type TooltipController<Payload = unknown> = ReturnType<
  typeof createTooltipController<Payload>
>

export type TooltipOptions<Payload = unknown> = PortalProps & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails<TooltipOpenChangeReason>) => void
  openDelay?: number
  closeDelay?: number
  disabled?: boolean
  shortcut?: string
  type?: 'description' | 'label'
  payload?: Payload
  controller?: TooltipController<Payload>
  debug?: boolean
}

export type TooltipProps<Payload = unknown> = TooltipOptions<Payload> & {
  children?: JSX.Element
}

export type TooltipTriggerProps<Payload = unknown> = {
  disabled?: boolean
  payload?: Payload
  shortcut?: string
  controller?: TooltipController
}

export type TooltipTriggerState = {
  open: boolean
  disabled: boolean
}

export type TooltipContentProps = PortalProps &
  PositionProps & {
    keepMounted?: boolean
    inline?: boolean
  }

export type TooltipContentState<Payload = unknown> = {
  open: boolean
  side: Side
  align: Align
  payload: Payload | undefined
}

export type TooltipArrowState = {
  side: Side
  align: Align
}

export type TooltipShortcutProps = object
export type TooltipShortcutState = { shortcut: string | undefined }

type TooltipContextValue = {
  open: () => boolean
  disabled: () => boolean
  shortcut: () => string | undefined
  type: () => 'description' | 'label'
  payload: () => unknown
  container: () => HTMLElement | null | undefined
  contentId: string
  scheduleOpen: (payload: unknown, reason: TooltipOpenChangeReason, event?: Event) => void
  scheduleClose: (reason: TooltipOpenChangeReason, event?: Event) => void
  closeImmediate: (reason: TooltipOpenChangeReason, event?: Event) => void
  cancelTimers: () => void
  triggerEl: () => HTMLElement | undefined
  setTriggerEl: (el: HTMLElement) => void
  contentEl: () => HTMLElement | undefined
  setContentEl: (el: HTMLElement) => void
  arrowEl: () => HTMLElement | undefined
  setArrowEl: (el: HTMLElement) => void
  arrowStyle: () => Record<string, string>
  setArrowStyleRef: (getter: () => Record<string, string>) => void
  side: () => Side
  align: () => Align
  setPlacementRefs: (side: () => Side, align: () => Align) => void
}

const TooltipContext = createContext<TooltipContextValue | null>(null)
const TooltipShortcutContext = createContext<() => string | undefined>(() => undefined)

function useTooltipContext(part: string): TooltipContextValue {
  const ctx = useContext(TooltipContext)
  if (!ctx) {
    throw new Error(`<Tooltip${part}> must be used inside <Tooltip>.`)
  }
  return ctx
}

/**
 * A small floating label describing a trigger on hover or focus.
 */
export function Tooltip<Payload = unknown>(props: TooltipProps<Payload>) {
  const contentId = `ui-tooltip-${createUniqueId()}-content`

  const [open, setOpen] = createControlledSignal<boolean>({
    value: () => props.open,
    defaultValue: () => !!props.defaultOpen,
  })
  const [payload, setPayload] = createSignal<Payload | undefined>(
    untrack(() => props.payload) as never,
  )
  const [triggerEl, setTriggerEl] = createSignal<HTMLElement | undefined>(undefined)
  const [contentEl, setContentEl] = createSignal<HTMLElement | undefined>(undefined)
  const [arrowEl, setArrowEl] = createSignal<HTMLElement | undefined>(undefined)

  let openTimer: ReturnType<typeof setTimeout> | undefined
  let closeTimer: ReturnType<typeof setTimeout> | undefined
  let arrowStyleGetter: () => Record<string, string> = emptyArrowStyle
  let sideGetter: () => Side = defaultTopSide
  let alignGetter: () => Align = defaultAlign

  const cancelTimers = () => {
    if (openTimer !== undefined) {
      clearTimeout(openTimer)
      openTimer = undefined
    }
    if (closeTimer !== undefined) {
      clearTimeout(closeTimer)
      closeTimer = undefined
    }
  }

  onCleanup(cancelTimers)

  const applyOpen = (
    next: boolean,
    reason: TooltipOpenChangeReason,
    event?: Event,
    source?: ChangeOptions['source'],
  ) => {
    if (props.disabled && next && reason !== 'imperative') {
      return
    }
    const prev = open()
    if (prev === next) {
      return
    }
    const details = createChangeDetails(reason, event, source)
    props.onOpenChange?.(next, details)
    if (details.canceled) {
      return
    }
    setOpen(next)
    reg.emit({
      key: 'open',
      previous: prev,
      value: next,
      reason: details.reason,
      source: details.source,
    })
  }

  const scheduleOpen = (nextPayload: unknown, reason: TooltipOpenChangeReason, event?: Event) => {
    cancelTimers()
    if (nextPayload !== undefined) {
      setPayload(() => nextPayload as Payload)
    }
    const delay = reason === 'trigger-focus' ? 0 : (props.openDelay ?? 300)
    if (delay <= 0) {
      applyOpen(true, reason, event)
    } else {
      openTimer = setTimeout(() => {
        openTimer = undefined
        applyOpen(true, reason, event)
      }, delay)
    }
  }

  const scheduleClose = (reason: TooltipOpenChangeReason, event?: Event) => {
    cancelTimers()
    const delay = props.closeDelay ?? 100
    if (delay <= 0) {
      applyOpen(false, reason, event)
    } else {
      closeTimer = setTimeout(() => {
        closeTimer = undefined
        applyOpen(false, reason, event)
      }, delay)
    }
  }

  const api: TooltipApi<Payload> = {
    open: (nextPayload, opts) => {
      cancelTimers()
      if (nextPayload !== undefined) {
        setPayload(() => nextPayload)
      }
      applyOpen(true, opts?.reason ?? 'imperative', opts?.event, opts?.source)
    },
    close: (opts) => {
      cancelTimers()
      applyOpen(false, opts?.reason ?? 'imperative', opts?.event, opts?.source)
    },
    setOpen: (next, opts) => {
      cancelTimers()
      applyOpen(next, opts?.reason ?? 'imperative', opts?.event, opts?.source)
    },
    isOpen: open,
    getPayload: () => (props.payload !== undefined ? props.payload : payload()),
  }

  useController(() => props.controller, api)

  useDismissLayer({
    active: open,
    getElements: () => [contentEl(), triggerEl()],
    dismissOnEscape: () => true,
    dismissOnOutsidePress: () => false,
    onDismiss: (reason, event) => {
      if (reason === 'escape-key') {
        cancelTimers()
        applyOpen(false, 'escape-key', event)
      }
    },
  })

  const reg = registerComponent({
    component: 'tooltip',
    getElements: () => [contentEl(), triggerEl()],
    getState: () => ({ open: open() }),
    getDisabled: () => !!props.disabled,
    actions: {
      open: (p) => api.open(p as Payload),
      close: () => api.close(),
      setOpen: (next) => api.setOpen(Boolean(next)),
    },
  })

  const ctx: TooltipContextValue = {
    open,
    disabled: () => !!props.disabled,
    shortcut: () => props.shortcut,
    type: () => props.type ?? 'description',
    payload: () => (props.payload !== undefined ? props.payload : payload()),
    container: () => props.container,
    contentId,
    scheduleOpen,
    scheduleClose,
    closeImmediate: (reason, event) => {
      cancelTimers()
      applyOpen(false, reason, event)
    },
    cancelTimers,
    triggerEl,
    setTriggerEl: (el) => setTriggerEl(el),
    contentEl,
    setContentEl: (el) => setContentEl(el),
    arrowEl,
    setArrowEl: (el) => setArrowEl(el),
    arrowStyle: () => arrowStyleGetter(),
    setArrowStyleRef: (g) => {
      arrowStyleGetter = g
    },
    side: () => sideGetter(),
    align: () => alignGetter(),
    setPlacementRefs: (s, a) => {
      sideGetter = s
      alignGetter = a
    },
  }

  useControllerEntry(() => props.controller, ctx)

  return <TooltipContext value={ctx}>{props.children}</TooltipContext>
}

export function TooltipTrigger<Payload = unknown>(
  props: TooltipTriggerProps<Payload> &
    Omit<PartProps<'button', TooltipTriggerState>, 'value' | 'onChange' | 'type'>,
) {
  const target = useControllerTarget(() => props.controller, useContext(TooltipContext))
  const rest = omit(props, 'disabled', 'payload', 'shortcut', 'controller')
  const state = (): TooltipTriggerState => ({
    open: target()?.open() ?? false,
    disabled: !!props.disabled || (target()?.disabled() ?? false),
  })

  const shortcut = createMemo(() => props.shortcut)
  return (
    <TooltipShortcutContext value={shortcut}>
      {renderPart('button', rest, state, {
        ref: (el: HTMLElement) => target()?.setTriggerEl(el),
        attrs: () => {
          const s = state()
          const ctx = target()
          const shortcutVal = props.shortcut ?? ctx?.shortcut()
          const isLabel = ctx?.type() === 'label'
          return {
            type: 'button',
            'aria-describedby': isLabel ? undefined : ctx?.contentId,
            'aria-labelledby': isLabel ? ctx?.contentId : undefined,
            'aria-keyshortcuts': formatAriaKeyShortcuts(shortcutVal),
            'data-open': s.open ? '' : undefined,
            'data-closed': !s.open ? '' : undefined,
            'data-state': s.open ? 'open' : 'closed',
          }
        },
        handlers: {
          onPointerEnter: (event: PointerEvent) => {
            if (state().disabled) {
              return
            }
            target()?.scheduleOpen(props.payload, 'trigger-hover', event)
          },
          onPointerLeave: (event: PointerEvent) => {
            target()?.scheduleClose('trigger-hover', event)
          },
          onFocus: (event: FocusEvent) => {
            if (state().disabled) {
              return
            }
            target()?.scheduleOpen(props.payload, 'trigger-focus', event)
          },
          onBlur: (event: FocusEvent) => {
            target()?.closeImmediate('trigger-focus', event)
          },
          onPointerDown: (event: PointerEvent) => {
            target()?.closeImmediate('trigger-press', event)
          },
        },
      })}
    </TooltipShortcutContext>
  )
}

export function TooltipContent<Payload = unknown>(
  props: TooltipContentProps &
    Omit<PartProps<'div', TooltipContentState<Payload>>, keyof TooltipContentProps>,
) {
  const ctx = useTooltipContext('Content')
  const rest = omit(
    props,
    'container',
    'side',
    'align',
    'sideOffset',
    'alignOffset',
    'collisionPadding',
    'arrowPadding',
    'anchor',
    'keepMounted',
    'inline',
  )

  const pos = usePopupPosition({
    open: ctx.open,
    reference: () => props.anchor ?? ctx.triggerEl(),
    floating: ctx.contentEl,
    arrow: ctx.arrowEl,
    side: () => props.side ?? 'top',
    align: () => props.align,
    sideOffset: () => props.sideOffset ?? 6,
    alignOffset: () => props.alignOffset,
    collisionPadding: () => props.collisionPadding,
    arrowPadding: () => props.arrowPadding,
  })

  ctx.setArrowStyleRef(pos.arrowStyle)
  ctx.setPlacementRefs(pos.side, pos.align)

  const state = (): TooltipContentState<Payload> => ({
    open: ctx.open(),
    side: pos.side(),
    align: pos.align(),
    payload: ctx.payload() as Payload | undefined,
  })

  const shouldRender = () => typeof window === 'undefined' || ctx.open() || !!props.keepMounted

  const renderSurface = () =>
    renderPart('div', rest, state, {
      ref: ctx.setContentEl,
      attrs: () => {
        const open = ctx.open()
        return {
          role: 'tooltip',
          id: props.id ?? ctx.contentId,
          hidden: open ? undefined : true,
          'data-open': open ? '' : undefined,
          'data-closed': !open ? '' : undefined,
          'data-state': open ? 'open' : 'closed',
          'data-side': pos.side(),
          'data-align': pos.align(),
        }
      },
      style: pos.style,
      handlers: {
        onPointerEnter: () => ctx.cancelTimers(),
        onPointerLeave: (event: PointerEvent) => ctx.scheduleClose('trigger-hover', event),
      },
    })

  return (
    <Show when={shouldRender()}>
      <Show when={!props.inline} fallback={renderSurface()}>
        <SafePortal mount={props.container ?? ctx.container() ?? undefined}>
          {renderSurface()}
        </SafePortal>
      </Show>
    </Show>
  )
}

export function TooltipArrow(props: PartProps<'div', TooltipArrowState>) {
  const ctx = useTooltipContext('Arrow')
  const state = (): TooltipArrowState => ({ side: ctx.side(), align: ctx.align() })
  return renderPart('div', props, state, {
    ref: ctx.setArrowEl,
    attrs: () => ({
      'aria-hidden': 'true',
      'data-side': ctx.side(),
      'data-align': ctx.align(),
    }),
    style: ctx.arrowStyle,
  })
}

export function TooltipShortcut(
  props: TooltipShortcutProps & PartProps<'kbd', TooltipShortcutState>,
) {
  const triggerShortcut = useContext(TooltipShortcutContext)
  const tooltipCtx = useContext(TooltipContext)
  const resolved = () => triggerShortcut() ?? tooltipCtx?.shortcut()
  const resolvedProps: PartProps<'kbd', TooltipShortcutState> = merge(props, {
    get children() {
      return props.children ?? formatDisplayShortcut(resolved())
    },
  })
  return (
    <Show when={resolved()}>
      {renderPart('kbd', resolvedProps, () => ({ shortcut: resolved() }), {
        attrs: () => ({ 'aria-hidden': 'true', 'data-slot': 'tooltip-shortcut' }),
      })}
    </Show>
  )
}
