import type { JSX } from '@solidjs/web'
import {
  untrack,
  createMemo,
  onSettled,
  createContext,
  createSignal,
  createUniqueId,
  merge,
  omit,
  Show,
  useContext,
} from 'solid-js'

import { markPopupResult, runAction } from './foundation/action'
import type { ActionDetails } from './foundation/action'
import {
  createController,
  useController,
  useControllerEntry,
  useControllerTarget,
} from './foundation/controller'
import { createChangeDetails, inferSource } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { useDismissLayer } from './foundation/dismissal'
import { useFocusManagement } from './foundation/focus'
import type { FocusTarget } from './foundation/focus'
import type { PortalProps } from './foundation/popup'
import { registerComponent } from './foundation/registry'
import {
  formatAriaKeyShortcuts,
  formatDisplayShortcut,
  renderPart,
  SafePortal,
} from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type DrawerSide = 'top' | 'right' | 'bottom' | 'left' | 'start' | 'end'
export type SnapPoint = number | `${number}px`

export type SheetPhysics = {
  stiffness: number
  damping: number
  mass: number
}

export const sheetPhysics: SheetPhysics = {
  stiffness: 400,
  damping: 36,
  mass: 1,
}

export type DrawerOpenChangeReason =
  | 'trigger-press'
  | 'close-press'
  | 'escape-key'
  | 'outside-press'
  | 'swipe'
  | 'action'
  | 'shortcut'
  | 'imperative'

export type DrawerSnapPointChangeReason =
  | 'handle-press'
  | 'handle-key'
  | 'swipe'
  | 'content-resize'
  | 'imperative'

export type DrawerDismissReason = 'escape-key' | 'outside-press' | 'swipe'
export type DrawerPayloadChangeReason = 'trigger-press' | 'shortcut' | 'imperative'

export type DrawerApi<Payload = unknown, Result = string> = {
  open: (
    payload?: Payload,
    options?: ChangeOptions<DrawerOpenChangeReason>,
  ) => Promise<Result | undefined>
  close: (options?: { returnValue?: Result } & ChangeOptions<DrawerOpenChangeReason>) => void
  setOpen: (open: boolean, options?: ChangeOptions<DrawerOpenChangeReason>) => void
  isOpen: () => boolean
  setSnapPoint: (snapPoint: SnapPoint, options?: ChangeOptions<DrawerSnapPointChangeReason>) => void
  getSnapPoint: () => SnapPoint | undefined
  getPayload: () => Payload | undefined
}

export function createDrawerController<Payload = unknown, Result = string>() {
  return createController<DrawerApi<Payload, Result>>()
}

export type DrawerController<Payload = unknown, Result = string> = ReturnType<
  typeof createDrawerController<Payload, Result>
>

export type DrawerOptions<Payload = unknown, Result = string> = PortalProps & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails<DrawerOpenChangeReason>) => void
  side?: DrawerSide
  modal?: boolean
  modalAbove?: SnapPoint
  closeOnEscape?: boolean
  closeOnOutsidePress?: boolean
  snapPoints?: Array<SnapPoint>
  snapPoint?: SnapPoint
  defaultSnapPoint?: SnapPoint
  onSnapPointChange?: (
    snapPoint: SnapPoint,
    details: ChangeDetails<DrawerSnapPointChangeReason>,
  ) => void
  initialFocus?: FocusTarget
  finalFocus?: FocusTarget
  payload?: Payload
  controller?: DrawerController<Payload, Result>
  debug?: boolean
}

export type DrawerProps<Payload = unknown, Result = string> = DrawerOptions<Payload, Result> & {
  children?: JSX.Element
}

export type DrawerTriggerProps<Payload = unknown, Result = string> = {
  disabled?: boolean
  focusableWhenDisabled?: boolean
  payload?: Payload
  shortcut?: string
  controller?: DrawerController<Payload, Result>
}

export type DrawerBackdropState = { open: boolean; side: DrawerSide }

export type DrawerContentProps = PortalProps & {
  keepMounted?: boolean
  initialFocus?: FocusTarget
  finalFocus?: FocusTarget
}

export type DrawerContentState<Payload = unknown> = {
  open: boolean
  side: DrawerSide
  modal: boolean
  snapPoint: SnapPoint | undefined
  payload: Payload | undefined
}

export type DrawerHandleState = {
  open: boolean
  side: DrawerSide
  snapPoint: SnapPoint | undefined
}

export type DrawerOutletProps = object
export type DrawerOutletState = { open: boolean; side: DrawerSide }

type DrawerContextValue = {
  open: () => boolean
  side: () => DrawerSide
  modal: () => boolean
  payload: () => unknown
  snapPoints: () => Array<SnapPoint> | undefined
  snapPoint: () => SnapPoint | undefined
  cycleSnapPoint: (event?: Event) => void
  container: () => HTMLElement | null | undefined
  contentId: string
  titleId: string
  descriptionId: string
  hasTitle: () => boolean
  hasDescription: () => boolean
  setHasTitle: (v: boolean) => void
  setHasDescription: (v: boolean) => void
  openFromTrigger: (payload: unknown, event?: Event) => void
  close: (reason: DrawerOpenChangeReason, event?: Event, returnValue?: unknown) => void
  setTriggerEl: (el: HTMLElement) => void
  setContentEl: (el: HTMLElement) => void
  getContentEl: () => HTMLElement | undefined
  initialFocus: () => FocusTarget | undefined
  finalFocus: () => FocusTarget | undefined
}

const DrawerContext = createContext<DrawerContextValue | null>(null)
const DrawerShortcutContext = createContext<() => string | undefined>(() => undefined)

function useDrawerContext(part: string): DrawerContextValue {
  const ctx = useContext(DrawerContext)
  if (!ctx) {
    throw new Error(`<Drawer${part}> must be used inside <Drawer>.`)
  }
  return ctx
}

/**
 * Slide-over sheet / drawer with optional snap points and full dialog accessibility.
 */
export function Drawer<Payload = unknown, Result = string>(props: DrawerProps<Payload, Result>) {
  const uid = createUniqueId()
  const contentId = `ui-drawer-${uid}`
  const titleId = `ui-drawer-title-${uid}`
  const descriptionId = `ui-drawer-desc-${uid}`

  const [open, setOpen] = createControlledSignal<boolean>({
    value: () => props.open,
    defaultValue: () => !!props.defaultOpen,
  })
  const [snapPoint, setSnapPoint] = createControlledSignal<SnapPoint | undefined>({
    value: () => props.snapPoint,
    defaultValue: () => props.defaultSnapPoint ?? props.snapPoints?.[0],
  })
  const [payload, setPayload] = createSignal<Payload | undefined>(
    untrack(() => props.payload) as never,
  )
  const [hasTitle, setHasTitle] = createSignal(false)
  const [hasDescription, setHasDescription] = createSignal(false)

  let triggerEl: HTMLElement | undefined
  let contentEl: HTMLElement | undefined
  let pendingResolve: ((result: Result | undefined) => void) | undefined

  const side = (): DrawerSide => {
    const raw = props.side ?? 'bottom'
    if (raw === 'start') {
      return 'left'
    }
    if (raw === 'end') {
      return 'right'
    }
    return raw
  }
  const modal = () => {
    if (props.modal !== undefined) {
      return props.modal
    }
    if (props.modalAbove !== undefined) {
      const sp = snapPoint()
      if (typeof sp === 'number' && typeof props.modalAbove === 'number') {
        return sp > props.modalAbove
      }
    }
    return true
  }

  const applyOpen = (
    next: boolean,
    reason: DrawerOpenChangeReason,
    event?: Event,
    source?: ChangeOptions['source'],
    returnValue?: Result,
  ) => {
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
    if (!next && pendingResolve) {
      const resolve = pendingResolve
      pendingResolve = undefined
      resolve(returnValue)
    }
    reg.emit({
      key: 'open',
      previous: prev,
      value: next,
      reason: details.reason,
      source: details.source,
    })
  }

  const applySnapPoint = (
    next: SnapPoint,
    reason: DrawerSnapPointChangeReason,
    event?: Event,
    source?: ChangeOptions['source'],
  ) => {
    const prev = snapPoint()
    if (prev === next) {
      return
    }
    const details = createChangeDetails(reason, event, source)
    props.onSnapPointChange?.(next, details)
    if (details.canceled) {
      return
    }
    setSnapPoint(next)
    reg.emit({
      key: 'snapPoint',
      previous: prev,
      value: next,
      reason: details.reason,
      source: details.source,
    })
  }

  const cycleSnapPoint = (event?: Event) => {
    const points = props.snapPoints
    if (!points || points.length === 0) {
      return
    }
    const cur = snapPoint()
    const idx = cur !== undefined ? points.indexOf(cur) : -1
    const next = points[(idx + 1) % points.length]
    if (next !== undefined) {
      applySnapPoint(next, 'handle-press', event)
    }
  }

  const api: DrawerApi<Payload, Result> = {
    open: (nextPayload, opts) => {
      if (nextPayload !== undefined) {
        setPayload(() => nextPayload)
      }
      applyOpen(true, opts?.reason ?? 'imperative', opts?.event, opts?.source)
      return markPopupResult(
        new Promise<Result | undefined>((resolve) => {
          pendingResolve = resolve
        }),
      )
    },
    close: (opts) =>
      applyOpen(false, opts?.reason ?? 'imperative', opts?.event, opts?.source, opts?.returnValue),
    setOpen: (next, opts) =>
      applyOpen(next, opts?.reason ?? 'imperative', opts?.event, opts?.source),
    isOpen: open,
    setSnapPoint: (sp, opts) =>
      applySnapPoint(sp, opts?.reason ?? 'imperative', opts?.event, opts?.source),
    getSnapPoint: snapPoint,
    getPayload: () => (props.payload !== undefined ? props.payload : payload()),
  }

  useController(() => props.controller, api)

  useDismissLayer({
    active: open,
    getElements: () => [contentEl],
    dismissOnEscape: () => props.closeOnEscape ?? true,
    dismissOnOutsidePress: () => props.closeOnOutsidePress ?? true,
    onDismiss: (reason, event) => applyOpen(false, reason, event),
  })

  const reg = registerComponent({
    component: 'drawer',
    getElements: () => [contentEl, triggerEl],
    getState: () => ({ open: open(), side: side(), snapPoint: snapPoint() }),
    actions: {
      open: (p) => api.open(p as Payload),
      close: () => api.close(),
      setOpen: (next) => api.setOpen(Boolean(next)),
      setSnapPoint: (sp) => api.setSnapPoint(sp as SnapPoint),
    },
  })

  const ctx: DrawerContextValue = {
    open,
    side,
    modal,
    payload: () => (props.payload !== undefined ? props.payload : payload()),
    snapPoints: () => props.snapPoints,
    snapPoint,
    cycleSnapPoint,
    container: () => props.container,
    contentId,
    titleId,
    descriptionId,
    hasTitle,
    hasDescription,
    setHasTitle,
    setHasDescription,
    openFromTrigger: (nextPayload, event) => {
      if (nextPayload !== undefined) {
        setPayload(() => nextPayload as Payload)
      }
      applyOpen(true, 'trigger-press', event)
    },
    close: (reason, event, returnValue) =>
      applyOpen(false, reason, event, undefined, returnValue as Result | undefined),
    setTriggerEl: (el) => {
      triggerEl = el
    },
    setContentEl: (el) => {
      contentEl = el
    },
    getContentEl: () => contentEl,
    initialFocus: () => props.initialFocus,
    finalFocus: () => props.finalFocus,
  }

  useControllerEntry(() => props.controller, ctx)

  return <DrawerContext value={ctx}>{props.children}</DrawerContext>
}

export function DrawerTrigger<Payload = unknown, Result = string>(
  props: DrawerTriggerProps<Payload, Result> &
    Omit<PartProps<'button', { open: boolean; disabled: boolean }>, 'value' | 'onChange' | 'type'>,
) {
  const target = useControllerTarget(() => props.controller, useContext(DrawerContext))
  const rest = omit(props, 'disabled', 'focusableWhenDisabled', 'payload', 'shortcut', 'controller')
  const state = () => ({
    open: target()?.open() ?? false,
    disabled: !!props.disabled,
  })

  const shortcut = createMemo(() => props.shortcut)
  return (
    <DrawerShortcutContext value={shortcut}>
      {renderPart('button', rest, state, {
        ref: (el: HTMLElement) => target()?.setTriggerEl(el),
        attrs: () => {
          const s = state()
          const ctx = target()
          return {
            type: 'button',
            'aria-haspopup': 'dialog',
            'aria-expanded': s.open ? 'true' : 'false',
            'aria-controls': ctx?.contentId,
            'aria-keyshortcuts': props.shortcut
              ? formatAriaKeyShortcuts(props.shortcut)
              : undefined,
            disabled: s.disabled && !props.focusableWhenDisabled ? true : undefined,
            'aria-disabled': s.disabled && props.focusableWhenDisabled ? 'true' : undefined,
            'data-open': s.open ? '' : undefined,
            'data-closed': !s.open ? '' : undefined,
            'data-state': s.open ? 'open' : 'closed',
          }
        },
        handlers: {
          onClick: (event: MouseEvent) => {
            if (props.disabled) {
              return
            }
            target()?.openFromTrigger(props.payload, event)
          },
        },
      })}
    </DrawerShortcutContext>
  )
}

export function DrawerBackdrop(props: PartProps<'div', DrawerBackdropState>) {
  const ctx = useDrawerContext('Backdrop')
  const state = (): DrawerBackdropState => ({ open: ctx.open(), side: ctx.side() })
  return (
    <Show when={ctx.open()}>
      <SafePortal mount={ctx.container() ?? undefined}>
        {renderPart('div', props, state, {
          attrs: () => ({
            'aria-hidden': 'true',
            'data-open': ctx.open() ? '' : undefined,
            'data-state': ctx.open() ? 'open' : 'closed',
            'data-side': ctx.side(),
          }),
        })}
      </SafePortal>
    </Show>
  )
}

export function DrawerContent<Payload = unknown>(
  props: DrawerContentProps &
    Omit<PartProps<'div', DrawerContentState<Payload>>, keyof DrawerContentProps>,
) {
  const ctx = useDrawerContext('Content')
  const rest = omit(props, 'container', 'keepMounted', 'initialFocus', 'finalFocus')
  const state = (): DrawerContentState<Payload> => ({
    open: ctx.open(),
    side: ctx.side(),
    modal: ctx.modal(),
    snapPoint: ctx.snapPoint(),
    payload: ctx.payload() as Payload | undefined,
  })

  useFocusManagement({
    active: ctx.open,
    container: ctx.getContentEl,
    trap: ctx.modal,
    initialFocus: () => props.initialFocus ?? ctx.initialFocus(),
    finalFocus: () => props.finalFocus ?? ctx.finalFocus(),
  })

  return (
    <Show when={ctx.open() || !!props.keepMounted}>
      <SafePortal mount={props.container ?? ctx.container() ?? undefined}>
        {renderPart('div', rest, state, {
          ref: ctx.setContentEl,
          attrs: () => {
            const open = ctx.open()
            return {
              role: 'dialog',
              id: props.id ?? ctx.contentId,
              tabindex: -1,
              'aria-modal': ctx.modal() ? 'true' : undefined,
              'aria-labelledby': ctx.hasTitle() ? ctx.titleId : undefined,
              'aria-describedby': ctx.hasDescription() ? ctx.descriptionId : undefined,
              hidden: open ? undefined : true,
              'data-open': open ? '' : undefined,
              'data-closed': !open ? '' : undefined,
              'data-state': open ? 'open' : 'closed',
              'data-side': ctx.side(),
              'data-snap-point':
                ctx.snapPoint() !== undefined ? String(ctx.snapPoint()) : undefined,
              'data-interactive': !ctx.modal() ? '' : undefined,
            }
          },
        })}
      </SafePortal>
    </Show>
  )
}

export function DrawerTitle(props: PartProps<'h2'>) {
  const ctx = useDrawerContext('Title')
  onSettled(() => {
    ctx.setHasTitle(true)
    return () => ctx.setHasTitle(false)
  })
  return renderPart('h2', props, () => ({}), {
    attrs: () => ({ id: props.id ?? ctx.titleId }),
  })
}

export function DrawerDescription(props: PartProps<'p'>) {
  const ctx = useDrawerContext('Description')
  onSettled(() => {
    ctx.setHasDescription(true)
    return () => ctx.setHasDescription(false)
  })
  return renderPart('p', props, () => ({}), {
    attrs: () => ({ id: props.id ?? ctx.descriptionId }),
  })
}

export function DrawerHandle(props: PartProps<'button', DrawerHandleState>) {
  const ctx = useDrawerContext('Handle')
  const state = (): DrawerHandleState => ({
    open: ctx.open(),
    side: ctx.side(),
    snapPoint: ctx.snapPoint(),
  })
  return renderPart('button', props, state, {
    attrs: () => ({
      type: 'button',
      'data-side': ctx.side(),
    }),
    handlers: {
      onClick: (event: MouseEvent) => ctx.cycleSnapPoint(event),
    },
  })
}

export function DrawerOutlet(props: DrawerOutletProps & PartProps<'div', DrawerOutletState>) {
  const ctx = useDrawerContext('Outlet')
  const state = (): DrawerOutletState => ({ open: ctx.open(), side: ctx.side() })
  return renderPart('div', props, state, {
    attrs: () => ({
      'data-open': ctx.open() ? '' : undefined,
      'data-side': ctx.side(),
    }),
  })
}

export function DrawerClose<Result = string>(
  props: {
    disabled?: boolean
    returnValue?: Result
    action?: (details: ActionDetails) => unknown
  } & Omit<
    PartProps<'button', { disabled: boolean; pending: boolean; error: unknown }>,
    'disabled' | 'type'
  >,
) {
  const ctx = useDrawerContext('Close')
  const [pending, setPending] = createSignal(false)
  const [error, setError] = createSignal<unknown>(undefined)
  const state = () => ({ disabled: !!props.disabled, pending: pending(), error: error() })
  const rest = omit(props, 'disabled', 'returnValue', 'action')

  return renderPart('button', rest, state, {
    attrs: () => ({
      type: 'button',
      disabled: props.disabled || undefined,
      'aria-busy': pending() ? 'true' : undefined,
      'data-pending': pending() ? '' : undefined,
    }),
    handlers: {
      onClick: (event: MouseEvent) => {
        if (props.disabled || pending()) {
          return
        }
        if (!props.action) {
          ctx.close('close-press', event, props.returnValue)
          return
        }
        setError(undefined)
        runAction(props.action, inferSource(event), {
          pending: setPending,
          done: () => ctx.close('action', event, props.returnValue),
          failed: setError,
        })
      },
    },
  })
}

export function DrawerShortcut(props: PartProps<'span', { shortcut: string | undefined }>) {
  const drawerCtx = useContext(DrawerContext)
  const shortcut = useContext(DrawerShortcutContext)
  const text = () => {
    const sc = shortcut()
    return drawerCtx && sc ? `⁦${formatDisplayShortcut(sc)}⁩` : undefined
  }
  const resolvedProps: PartProps<'span', { shortcut: string | undefined }> = merge(props, {
    get children() {
      return props.children ?? (() => text())
    },
  })
  return (
    <Show when={drawerCtx && shortcut()}>
      {renderPart('span', resolvedProps, () => ({ shortcut: shortcut() }), {
        attrs: () => ({ 'aria-hidden': 'true', 'data-slot': 'drawer-shortcut' }),
      })}
    </Show>
  )
}
