import { Portal, type JSX } from "@solidjs/web"
import {
  createContext,
  createSignal,
  createUniqueId,
  omit,
  onCleanup,
  Show,
  useContext,
} from "solid-js"
import {
  createController,
  useController,
  useControllerEntry,
  useControllerTarget,
} from "./foundation/controller"
import {
  createChangeDetails,
  type ChangeDetails,
  type ChangeOptions,
} from "./foundation/details"
import { useDismissLayer } from "./foundation/dismissal"
import {
  usePopupPosition,
  type Align,
  type PortalProps,
  type PositionProps,
  type Side,
} from "./foundation/popup"
import { registerComponent } from "./foundation/registry"
import { renderPart, type PartProps } from "./foundation/render"
import { createControlledSignal } from "./foundation/state"

export type HoverCardOpenChangeReason =
  | "trigger-hover"
  | "trigger-focus"
  | "escape-key"
  | "outside-press"
  | "imperative"

export type HoverCardPayloadChangeReason = "trigger-hover" | "trigger-focus" | "imperative"

export type HoverCardApi<Payload = unknown> = {
  open: (payload?: Payload, options?: ChangeOptions<HoverCardOpenChangeReason>) => void
  close: (options?: ChangeOptions<HoverCardOpenChangeReason>) => void
  setOpen: (open: boolean, options?: ChangeOptions<HoverCardOpenChangeReason>) => void
  isOpen: () => boolean
  getPayload: () => Payload | undefined
}

export function createHoverCardController<Payload = unknown>() {
  return createController<HoverCardApi<Payload>>()
}

export type HoverCardController<Payload = unknown> = ReturnType<
  typeof createHoverCardController<Payload>
>

export type HoverCardOptions<Payload = unknown> = PortalProps & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails<HoverCardOpenChangeReason>) => void
  openDelay?: number
  closeDelay?: number
  disabled?: boolean
  payload?: Payload
  controller?: HoverCardController<Payload>
  debug?: boolean
}

export type HoverCardProps<Payload = unknown> = HoverCardOptions<Payload> & {
  children?: JSX.Element
}

export type HoverCardTriggerProps<Payload = unknown> = {
  disabled?: boolean
  payload?: Payload
  controller?: HoverCardController<any>
}

export type HoverCardTriggerState = {
  open: boolean
  disabled: boolean
}

export type HoverCardContentProps = PortalProps &
  PositionProps & {
    keepMounted?: boolean
    inline?: boolean
  }

export type HoverCardContentState<Payload = unknown> = {
  open: boolean
  side: Side
  align: Align
  payload: Payload | undefined
}

export type HoverCardArrowState = {
  side: Side
  align: Align
}

type HoverCardContextValue = {
  open: () => boolean
  disabled: () => boolean
  payload: () => unknown
  container: () => HTMLElement | null | undefined
  contentId: string
  scheduleOpen: (payload: unknown, reason: HoverCardOpenChangeReason, event?: Event) => void
  scheduleClose: (reason: HoverCardOpenChangeReason, event?: Event) => void
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

const HoverCardContext = createContext<HoverCardContextValue | null>(null)

function useHoverCardContext(part: string): HoverCardContextValue {
  const ctx = useContext(HoverCardContext)
  if (!ctx) throw new Error(`<HoverCard${part}> must be used inside <HoverCard>.`)
  return ctx
}

export function HoverCard<Payload = unknown>(props: HoverCardProps<Payload>) {
  const contentId = `ui-hover-card-${createUniqueId()}`

  const [open, setOpen] = createControlledSignal<boolean>({
    value: () => props.open,
    defaultValue: () => !!props.defaultOpen,
  })
  const [payload, setPayload] = createSignal<Payload | undefined>(
    props.payload as Exclude<Payload, Function> | undefined
  )
  const [triggerEl, setTriggerEl] = createSignal<HTMLElement | undefined>(undefined)
  const [contentEl, setContentEl] = createSignal<HTMLElement | undefined>(undefined)
  const [arrowEl, setArrowEl] = createSignal<HTMLElement | undefined>(undefined)

  let openTimer: ReturnType<typeof setTimeout> | undefined
  let closeTimer: ReturnType<typeof setTimeout> | undefined
  let arrowStyleGetter: () => Record<string, string> = () => ({})
  let sideGetter: () => Side = () => "bottom"
  let alignGetter: () => Align = () => "center"

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
    reason: HoverCardOpenChangeReason,
    event?: Event,
    source?: ChangeOptions["source"]
  ) => {
    if (props.disabled && next && reason !== "imperative") return
    const prev = open()
    if (prev === next) return
    const details = createChangeDetails(reason, event, source)
    props.onOpenChange?.(next, details)
    if (details.canceled) return
    setOpen(next)
    reg.emit({
      key: "open",
      previous: prev,
      value: next,
      reason: details.reason,
      source: details.source,
    })
  }

  const scheduleOpen = (
    nextPayload: unknown,
    reason: HoverCardOpenChangeReason,
    event?: Event
  ) => {
    cancelTimers()
    if (nextPayload !== undefined) setPayload(() => nextPayload as Payload)
    const delay = props.openDelay ?? 400
    if (delay <= 0) {
      applyOpen(true, reason, event)
    } else {
      openTimer = setTimeout(() => {
        openTimer = undefined
        applyOpen(true, reason, event)
      }, delay)
    }
  }

  const scheduleClose = (reason: HoverCardOpenChangeReason, event?: Event) => {
    cancelTimers()
    const delay = props.closeDelay ?? 200
    if (delay <= 0) {
      applyOpen(false, reason, event)
    } else {
      closeTimer = setTimeout(() => {
        closeTimer = undefined
        applyOpen(false, reason, event)
      }, delay)
    }
  }

  const api: HoverCardApi<Payload> = {
    open: (nextPayload, opts) => {
      cancelTimers()
      if (nextPayload !== undefined) setPayload(() => nextPayload)
      applyOpen(true, opts?.reason ?? "imperative", opts?.event, opts?.source)
    },
    close: (opts) => {
      cancelTimers()
      applyOpen(false, opts?.reason ?? "imperative", opts?.event, opts?.source)
    },
    setOpen: (next, opts) => {
      cancelTimers()
      applyOpen(next, opts?.reason ?? "imperative", opts?.event, opts?.source)
    },
    isOpen: open,
    getPayload: () => (props.payload !== undefined ? props.payload : payload()),
  }

  useController(() => props.controller, api)

  useDismissLayer({
    active: open,
    getElements: () => [contentEl(), triggerEl()],
    dismissOnEscape: () => true,
    dismissOnOutsidePress: () => true,
    onDismiss: (reason, event) => {
      cancelTimers()
      applyOpen(false, reason, event)
    },
  })

  const reg = registerComponent({
    component: "hover-card",
    getElements: () => [contentEl(), triggerEl()],
    getState: () => ({ open: open() }),
    getDisabled: () => !!props.disabled,
    actions: {
      open: (p) => api.open(p as Payload),
      close: () => api.close(),
      setOpen: (next) => api.setOpen(Boolean(next)),
    },
  })

  const ctx: HoverCardContextValue = {
    open,
    disabled: () => !!props.disabled,
    payload: () => (props.payload !== undefined ? props.payload : payload()),
    container: () => props.container,
    contentId,
    scheduleOpen,
    scheduleClose,
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

  return <HoverCardContext value={ctx}>{props.children}</HoverCardContext>
}

export function HoverCardTrigger<Payload = unknown>(
  props: HoverCardTriggerProps<Payload> &
    Omit<PartProps<"a", HoverCardTriggerState>, "value" | "onChange">
) {
  const target = useControllerTarget(
    () => props.controller,
    useContext(HoverCardContext)
  )
  const rest = omit(props, "disabled", "payload", "controller")
  const state = (): HoverCardTriggerState => ({
    open: target()?.open() ?? false,
    disabled: !!props.disabled || (target()?.disabled() ?? false),
  })

  return renderPart("a", rest, state, {
    ref: (el: HTMLElement) => target()?.setTriggerEl(el),
    attrs: () => {
      const s = state()
      return {
        "data-open": s.open ? "" : undefined,
        "data-closed": !s.open ? "" : undefined,
        "data-state": s.open ? "open" : "closed",
      }
    },
    handlers: {
      onPointerEnter: (event: PointerEvent) => {
        if (state().disabled) return
        target()?.scheduleOpen(props.payload, "trigger-hover", event)
      },
      onPointerLeave: (event: PointerEvent) => {
        target()?.scheduleClose("trigger-hover", event)
      },
      onFocus: (event: FocusEvent) => {
        if (state().disabled) return
        target()?.scheduleOpen(props.payload, "trigger-focus", event)
      },
      onBlur: (event: FocusEvent) => {
        target()?.scheduleClose("trigger-focus", event)
      },
    },
  })
}

export function HoverCardContent<Payload = unknown>(
  props: HoverCardContentProps &
    Omit<PartProps<"div", HoverCardContentState<Payload>>, keyof HoverCardContentProps>
) {
  const ctx = useHoverCardContext("Content")
  const rest = omit(
    props,
    "container",
    "side",
    "align",
    "sideOffset",
    "alignOffset",
    "collisionPadding",
    "arrowPadding",
    "anchor",
    "keepMounted",
    "inline"
  )

  const pos = usePopupPosition({
    open: ctx.open,
    reference: () => props.anchor ?? ctx.triggerEl(),
    floating: ctx.contentEl,
    arrow: ctx.arrowEl,
    side: () => props.side ?? "bottom",
    align: () => props.align,
    sideOffset: () => props.sideOffset ?? 6,
    alignOffset: () => props.alignOffset,
    collisionPadding: () => props.collisionPadding,
    arrowPadding: () => props.arrowPadding,
  })

  ctx.setArrowStyleRef(pos.arrowStyle)
  ctx.setPlacementRefs(pos.side, pos.align)

  const state = (): HoverCardContentState<Payload> => ({
    open: ctx.open(),
    side: pos.side(),
    align: pos.align(),
    payload: ctx.payload() as Payload | undefined,
  })

  const shouldRender = () => ctx.open() || !!props.keepMounted

  const renderSurface = () =>
    renderPart("div", rest, state, {
      ref: ctx.setContentEl,
      attrs: () => {
        const open = ctx.open()
        return {
          id: props.id ?? ctx.contentId,
          hidden: open ? undefined : true,
          "data-open": open ? "" : undefined,
          "data-closed": !open ? "" : undefined,
          "data-state": open ? "open" : "closed",
          "data-side": pos.side(),
          "data-align": pos.align(),
        }
      },
      style: pos.style,
      handlers: {
        onPointerEnter: () => ctx.cancelTimers(),
        onPointerLeave: (event: PointerEvent) => ctx.scheduleClose("trigger-hover", event),
      },
    })

  return (
    <Show when={shouldRender()}>
      <Show when={!props.inline} fallback={renderSurface()}>
        <Portal mount={(props.container ?? ctx.container()) ?? undefined}>
          {renderSurface()}
        </Portal>
      </Show>
    </Show>
  )
}

export function HoverCardArrow(props: PartProps<"div", HoverCardArrowState>) {
  const ctx = useHoverCardContext("Arrow")
  const state = (): HoverCardArrowState => ({ side: ctx.side(), align: ctx.align() })
  return renderPart("div", props, state, {
    ref: ctx.setArrowEl,
    attrs: () => ({
      "aria-hidden": "true",
      "data-side": ctx.side(),
      "data-align": ctx.align(),
    }),
    style: ctx.arrowStyle,
  })
}
