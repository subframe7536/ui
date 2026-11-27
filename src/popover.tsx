import { Portal, type JSX } from "@solidjs/web"
import {
  createContext,
  createSignal,
  createUniqueId,
  omit,
  Show,
  useContext,
} from "solid-js"
import { markPopupResult } from "./foundation/action"
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
import { useFocusManagement, type FocusTarget } from "./foundation/focus"
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

export type PopoverOpenChangeReason =
  | "trigger-press"
  | "close-press"
  | "escape-key"
  | "outside-press"
  | "shortcut"
  | "imperative"

export type PopoverDismissReason = "escape-key" | "outside-press"
export type PopoverPayloadChangeReason = "trigger-press" | "shortcut" | "imperative"
export type PopoverInitialFocus = FocusTarget
export type PopoverFinalFocus = FocusTarget

export type PopoverApi<Payload = unknown, Result = string> = {
  open: (payload?: Payload, options?: ChangeOptions<PopoverOpenChangeReason>) => Promise<Result | undefined>
  close: (options?: { returnValue?: Result } & ChangeOptions<PopoverOpenChangeReason>) => void
  toggle: (options?: ChangeOptions<PopoverOpenChangeReason>) => void
  setOpen: (open: boolean, options?: ChangeOptions<PopoverOpenChangeReason>) => void
  isOpen: () => boolean
  getPayload: () => Payload | undefined
}

export function createPopoverController<Payload = unknown, Result = string>() {
  return createController<PopoverApi<Payload, Result>>()
}

export type PopoverController<Payload = unknown, Result = string> = ReturnType<
  typeof createPopoverController<Payload, Result>
>

export type PopoverOptions<Payload = unknown, Result = string> = PortalProps & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails<PopoverOpenChangeReason>) => void
  modal?: boolean
  closeOnEscape?: boolean
  closeOnOutsidePress?: boolean
  payload?: Payload
  controller?: PopoverController<Payload, Result>
  debug?: boolean
}

export type PopoverProps<Payload = unknown, Result = string> = PopoverOptions<
  Payload,
  Result
> & {
  children?: JSX.Element
}

export type PopoverTriggerProps<Payload = unknown> = {
  disabled?: boolean
  focusableWhenDisabled?: boolean
  payload?: Payload
  shortcut?: string
  controller?: PopoverController<any, any>
}

export type PopoverTriggerState = {
  open: boolean
  disabled: boolean
}

export type PopoverContentProps = PortalProps &
  PositionProps & {
    initialFocus?: PopoverInitialFocus
    finalFocus?: PopoverFinalFocus
    keepMounted?: boolean
    inline?: boolean
  }

export type PopoverContentState<Payload = unknown> = {
  open: boolean
  side: Side
  align: Align
  payload: Payload | undefined
}

export type PopoverArrowState = {
  side: Side
  align: Align
}

export type PopoverShortcutProps = {}
export type PopoverShortcutState = { shortcut: string | undefined }

type PopoverContextValue = {
  open: () => boolean
  modal: () => boolean
  payload: () => unknown
  container: () => HTMLElement | null | undefined
  contentId: string
  titleId: string
  descriptionId: string
  hasTitle: () => boolean
  hasDescription: () => boolean
  setHasTitle: (v: boolean) => void
  setHasDescription: (v: boolean) => void
  toggleFromTrigger: (payload: unknown, event?: Event) => void
  close: (reason: PopoverOpenChangeReason, event?: Event, returnValue?: unknown) => void
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

const PopoverContext = createContext<PopoverContextValue | null>(null)
const PopoverShortcutContext = createContext<() => string | undefined>(() => undefined)

function usePopoverContext(part: string): PopoverContextValue {
  const ctx = useContext(PopoverContext)
  if (!ctx) throw new Error(`<Popover${part}> must be used inside <Popover>.`)
  return ctx
}

export function Popover<Payload = unknown, Result = string>(
  props: PopoverProps<Payload, Result>
) {
  const uid = createUniqueId()
  const contentId = `ui-popover-${uid}`
  const titleId = `ui-popover-title-${uid}`
  const descriptionId = `ui-popover-desc-${uid}`

  const [open, setOpen] = createControlledSignal<boolean>({
    value: () => props.open,
    defaultValue: () => !!props.defaultOpen,
  })
  const [payload, setPayload] = createSignal<Payload | undefined>(
    props.payload as Exclude<Payload, Function> | undefined
  )
  const [hasTitle, setHasTitle] = createSignal(false)
  const [hasDescription, setHasDescription] = createSignal(false)
  const [triggerEl, setTriggerEl] = createSignal<HTMLElement | undefined>(undefined)
  const [contentEl, setContentEl] = createSignal<HTMLElement | undefined>(undefined)
  const [arrowEl, setArrowEl] = createSignal<HTMLElement | undefined>(undefined)

  let arrowStyleGetter: () => Record<string, string> = () => ({})
  let sideGetter: () => Side = () => "bottom"
  let alignGetter: () => Align = () => "center"
  let pendingResolve: ((result: Result | undefined) => void) | undefined

  const modal = () => !!props.modal

  const applyOpen = (
    next: boolean,
    reason: PopoverOpenChangeReason,
    event?: Event,
    source?: ChangeOptions["source"],
    returnValue?: Result
  ) => {
    const prev = open()
    if (prev === next) return
    const details = createChangeDetails(reason, event, source)
    props.onOpenChange?.(next, details)
    if (details.canceled) return
    setOpen(next)
    if (!next && pendingResolve) {
      const resolve = pendingResolve
      pendingResolve = undefined
      resolve(returnValue)
    }
    reg.emit({
      key: "open",
      previous: prev,
      value: next,
      reason: details.reason,
      source: details.source,
    })
  }

  const api: PopoverApi<Payload, Result> = {
    open: (nextPayload, opts) => {
      if (nextPayload !== undefined) setPayload(() => nextPayload)
      applyOpen(true, opts?.reason ?? "imperative", opts?.event, opts?.source)
      return markPopupResult(
        new Promise<Result | undefined>((resolve) => {
          pendingResolve = resolve
        })
      )
    },
    close: (opts) =>
      applyOpen(
        false,
        opts?.reason ?? "imperative",
        opts?.event,
        opts?.source,
        opts?.returnValue
      ),
    toggle: (opts) =>
      applyOpen(!open(), opts?.reason ?? "imperative", opts?.event, opts?.source),
    setOpen: (next, opts) =>
      applyOpen(next, opts?.reason ?? "imperative", opts?.event, opts?.source),
    isOpen: open,
    getPayload: () => (props.payload !== undefined ? props.payload : payload()),
  }

  useController(() => props.controller, api)

  useDismissLayer({
    active: open,
    getElements: () => [contentEl(), triggerEl()],
    dismissOnEscape: () => props.closeOnEscape ?? true,
    dismissOnOutsidePress: () => props.closeOnOutsidePress ?? true,
    onDismiss: (reason, event) => applyOpen(false, reason, event),
  })

  const reg = registerComponent({
    component: "popover",
    getElements: () => [contentEl(), triggerEl()],
    getState: () => ({ open: open() }),
    actions: {
      open: (p) => api.open(p as Payload),
      close: () => api.close(),
      toggle: () => api.toggle(),
      setOpen: (next) => api.setOpen(Boolean(next)),
    },
  })

  const ctx: PopoverContextValue = {
    open,
    modal,
    payload: () => (props.payload !== undefined ? props.payload : payload()),
    container: () => props.container,
    contentId,
    titleId,
    descriptionId,
    hasTitle,
    hasDescription,
    setHasTitle,
    setHasDescription,
    toggleFromTrigger: (nextPayload, event) => {
      if (nextPayload !== undefined) setPayload(() => nextPayload as Payload)
      applyOpen(!open(), "trigger-press", event)
    },
    close: (reason, event, returnValue) =>
      applyOpen(false, reason, event, undefined, returnValue as Result | undefined),
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

  return <PopoverContext value={ctx}>{props.children}</PopoverContext>
}

export function PopoverTrigger<Payload = unknown>(
  props: PopoverTriggerProps<Payload> &
    Omit<PartProps<"button", PopoverTriggerState>, "value" | "onChange" | "type">
) {
  const target = useControllerTarget(
    () => props.controller,
    useContext(PopoverContext)
  )
  const rest = omit(
    props,
    "disabled",
    "focusableWhenDisabled",
    "payload",
    "shortcut",
    "controller"
  )
  const state = (): PopoverTriggerState => ({
    open: target()?.open() ?? false,
    disabled: !!props.disabled,
  })

  return (
    <PopoverShortcutContext value={() => props.shortcut}>
      {renderPart("button", rest, state, {
        ref: (el: HTMLElement) => target()?.setTriggerEl(el),
        attrs: () => {
          const s = state()
          const ctx = target()
          const focusableDisabled = s.disabled && !!props.focusableWhenDisabled
          return {
            type: "button",
            "aria-haspopup": "dialog",
            "aria-expanded": s.open ? "true" : "false",
            "aria-controls": ctx?.contentId,
            "aria-keyshortcuts": props.shortcut,
            disabled: s.disabled && !focusableDisabled ? true : undefined,
            "aria-disabled": focusableDisabled ? "true" : undefined,
            "data-open": s.open ? "" : undefined,
            "data-closed": !s.open ? "" : undefined,
            "data-state": s.open ? "open" : "closed",
            "data-disabled": s.disabled ? "" : undefined,
          }
        },
        handlers: {
          onClick: (event: MouseEvent) => {
            if (props.disabled) return
            target()?.toggleFromTrigger(props.payload, event)
          },
        },
      })}
    </PopoverShortcutContext>
  )
}

export function PopoverContent<Payload = unknown>(
  props: PopoverContentProps &
    Omit<PartProps<"div", PopoverContentState<Payload>>, keyof PopoverContentProps>
) {
  const ctx = usePopoverContext("Content")
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
    "initialFocus",
    "finalFocus",
    "keepMounted",
    "inline"
  )

  const pos = usePopupPosition({
    open: ctx.open,
    reference: () => props.anchor ?? ctx.triggerEl(),
    floating: ctx.contentEl,
    arrow: ctx.arrowEl,
    side: () => props.side,
    align: () => props.align,
    sideOffset: () => props.sideOffset,
    alignOffset: () => props.alignOffset,
    collisionPadding: () => props.collisionPadding,
    arrowPadding: () => props.arrowPadding,
  })

  ctx.setArrowStyleRef(pos.arrowStyle)
  ctx.setPlacementRefs(pos.side, pos.align)

  useFocusManagement({
    active: ctx.open,
    container: ctx.contentEl,
    trap: ctx.modal,
    initialFocus: () => props.initialFocus ?? false,
    finalFocus: () => props.finalFocus,
  })

  const state = (): PopoverContentState<Payload> => ({
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
          role: "dialog",
          id: props.id ?? ctx.contentId,
          tabindex: -1,
          "aria-labelledby": ctx.hasTitle() ? ctx.titleId : undefined,
          "aria-describedby": ctx.hasDescription() ? ctx.descriptionId : undefined,
          hidden: open ? undefined : true,
          "data-open": open ? "" : undefined,
          "data-closed": !open ? "" : undefined,
          "data-state": open ? "open" : "closed",
          "data-side": pos.side(),
          "data-align": pos.align(),
        }
      },
      style: pos.style,
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

export function PopoverTitle(props: PartProps<"h2", {}>) {
  const ctx = usePopoverContext("Title")
  ctx.setHasTitle(true)
  return renderPart("h2", props, () => ({}), {
    attrs: () => ({ id: props.id ?? ctx.titleId }),
  })
}

export function PopoverDescription(props: PartProps<"p", {}>) {
  const ctx = usePopoverContext("Description")
  ctx.setHasDescription(true)
  return renderPart("p", props, () => ({}), {
    attrs: () => ({ id: props.id ?? ctx.descriptionId }),
  })
}

export function PopoverClose(props: Omit<PartProps<"button", {}>, "type">) {
  const ctx = usePopoverContext("Close")
  return renderPart("button", props, () => ({}), {
    attrs: () => ({ type: "button" }),
    handlers: {
      onClick: (event: MouseEvent) => ctx.close("close-press", event),
    },
  })
}

export function PopoverArrow(props: PartProps<"div", PopoverArrowState>) {
  const ctx = usePopoverContext("Arrow")
  const state = (): PopoverArrowState => ({
    side: ctx.side(),
    align: ctx.align(),
  })
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

export function PopoverShortcut(
  props: PopoverShortcutProps & PartProps<"kbd", PopoverShortcutState>
) {
  const shortcut = useContext(PopoverShortcutContext)
  return renderPart("kbd", props, () => ({ shortcut: shortcut() }), {
    attrs: () => ({ "aria-hidden": "true" }),
  })
}
