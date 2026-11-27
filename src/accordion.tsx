import { createContext, createUniqueId, omit, Show, useContext } from "solid-js"
import { createController, useController } from "./foundation/controller"
import {
  createChangeDetails,
  type ChangeDetails,
  type ChangeOptions,
} from "./foundation/details"
import { navigateRoving, type Orientation } from "./foundation/focus"
import { registerComponent } from "./foundation/registry"
import { renderPart, type PartProps } from "./foundation/render"
import { createControlledSignal } from "./foundation/state"

export type AccordionValueChangeReason = "trigger-press" | "find-in-page" | "imperative"
export type AccordionChangeOptions = ChangeOptions<AccordionValueChangeReason>

export type AccordionApi<T extends string = string> = {
  open: (value: T, options?: AccordionChangeOptions) => void
  close: (value: T, options?: AccordionChangeOptions) => void
  toggle: (value: T, options?: AccordionChangeOptions) => void
  setValue: (value: T | T[] | undefined, options?: AccordionChangeOptions) => void
  getValue: () => T | T[] | undefined
  isOpen: (value: T) => boolean
}

export function createAccordionController<T extends string = string>() {
  return createController<AccordionApi<T>>()
}

export type AccordionController<T extends string = string> = ReturnType<
  typeof createAccordionController<T>
>

export type AccordionOptions<T extends string = string> = {
  value?: T | T[]
  defaultValue?: T | T[]
  onValueChange?: (
    value: T | T[] | undefined,
    details: ChangeDetails<AccordionValueChangeReason>
  ) => void
  multiple?: boolean
  collapsible?: boolean
  disabled?: boolean
  orientation?: Orientation
  loop?: boolean
  controller?: AccordionController<T>
  debug?: boolean
}

export type AccordionState<T extends string = string> = {
  value: T | T[] | undefined
  multiple: boolean
  disabled: boolean
  orientation: Orientation
}

export type AccordionItemProps<T extends string = string> = {
  value: T
  disabled?: boolean
}

export type AccordionItemState = {
  open: boolean
  disabled: boolean
}

export type AccordionHeaderProps = {}
export type AccordionHeaderState = AccordionItemState
export type AccordionTriggerProps = {}
export type AccordionTriggerState = AccordionItemState
export type AccordionPanelProps = {
  keepMounted?: boolean
  hiddenUntilFound?: boolean
}
export type AccordionPanelState = AccordionItemState

type AccordionContextValue = {
  isOpen: (value: string) => boolean
  toggle: (value: string, event?: Event) => void
  openFromFind: (value: string, event?: Event) => void
  disabled: () => boolean
  orientation: () => Orientation
  loop: () => boolean
  registerTrigger: (el: HTMLElement) => void
  getTriggers: () => HTMLElement[]
}

type ItemContextValue = {
  value: () => string
  state: () => AccordionItemState
  triggerId: string
  panelId: string
}

const AccordionContext = createContext<AccordionContextValue | null>(null)
const AccordionItemContext = createContext<ItemContextValue | null>(null)

function useAccordion(part: string): AccordionContextValue {
  const ctx = useContext(AccordionContext)
  if (!ctx) throw new Error(`<Accordion${part}> must be used inside <Accordion>.`)
  return ctx
}

function useAccordionItem(part: string): ItemContextValue {
  const ctx = useContext(AccordionItemContext)
  if (!ctx) throw new Error(`<Accordion${part}> must be used inside <AccordionItem>.`)
  return ctx
}

export function Accordion<T extends string = string>(
  props: AccordionOptions<T> &
    Omit<PartProps<"div", AccordionState<T>>, "defaultValue" | "onChange">
) {
  let rootEl: HTMLElement | undefined
  const triggers = new Set<HTMLElement>()

  const [value, setValue] = createControlledSignal<T | T[] | undefined>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? (props.multiple ? ([] as T[]) : undefined),
  })

  const orientation = () => props.orientation ?? "vertical"
  const isDisabled = () => !!props.disabled

  const isOpen = (itemValue: string) => {
    const current = value()
    if (Array.isArray(current)) return current.includes(itemValue as T)
    return current === itemValue
  }

  const applyValue = (
    next: T | T[] | undefined,
    reason: AccordionValueChangeReason,
    event?: Event,
    source?: ChangeOptions["source"]
  ) => {
    const prev = value()
    const details = createChangeDetails(reason, event, source)
    props.onValueChange?.(next, details)
    if (details.canceled) return
    setValue(next)
    reg.emit({
      key: "value",
      previous: prev,
      value: next,
      reason: details.reason,
      source: details.source,
    })
  }

  const openItem = (
    itemValue: T,
    reason: AccordionValueChangeReason,
    event?: Event,
    source?: ChangeOptions["source"]
  ) => {
    if (isOpen(itemValue)) return
    if (props.multiple) {
      const current = value()
      const list = Array.isArray(current) ? [...current] : current ? [current] : []
      list.push(itemValue)
      applyValue(list, reason, event, source)
    } else {
      applyValue(itemValue, reason, event, source)
    }
  }

  const closeItem = (
    itemValue: T,
    reason: AccordionValueChangeReason,
    event?: Event,
    source?: ChangeOptions["source"]
  ) => {
    if (!isOpen(itemValue)) return
    if (props.multiple) {
      const current = value()
      const list = Array.isArray(current) ? current.filter((v) => v !== itemValue) : []
      if (props.collapsible === false && list.length === 0) return
      applyValue(list, reason, event, source)
    } else {
      if (props.collapsible === false) return
      applyValue(undefined, reason, event, source)
    }
  }

  const toggleItem = (
    itemValue: T,
    reason: AccordionValueChangeReason,
    event?: Event,
    source?: ChangeOptions["source"]
  ) => {
    if (isOpen(itemValue)) {
      closeItem(itemValue, reason, event, source)
    } else {
      openItem(itemValue, reason, event, source)
    }
  }

  const api: AccordionApi<T> = {
    open: (v, opts) =>
      openItem(v, opts?.reason ?? "imperative", opts?.event, opts?.source),
    close: (v, opts) =>
      closeItem(v, opts?.reason ?? "imperative", opts?.event, opts?.source),
    toggle: (v, opts) =>
      toggleItem(v, opts?.reason ?? "imperative", opts?.event, opts?.source),
    setValue: (v, opts) =>
      applyValue(v, opts?.reason ?? "imperative", opts?.event, opts?.source),
    getValue: value,
    isOpen: (v) => isOpen(v),
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: "accordion",
    getElements: () => [rootEl],
    getState: () => ({ value: value(), multiple: !!props.multiple }),
    getDisabled: isDisabled,
    actions: {
      open: (v) => api.open(String(v) as T),
      close: (v) => api.close(String(v) as T),
      toggle: (v) => api.toggle(String(v) as T),
      setValue: (v) => api.setValue(v as T | T[] | undefined),
    },
  })

  const state = (): AccordionState<T> => ({
    value: value(),
    multiple: !!props.multiple,
    disabled: isDisabled(),
    orientation: orientation(),
  })

  const rest = omit(
    props,
    "value",
    "defaultValue",
    "onValueChange",
    "multiple",
    "collapsible",
    "disabled",
    "orientation",
    "loop",
    "controller",
    "debug"
  )

  return (
    <AccordionContext
      value={{
        isOpen,
        toggle: (v, event) => toggleItem(v as T, "trigger-press", event),
        openFromFind: (v, event) => openItem(v as T, "find-in-page", event),
        disabled: isDisabled,
        orientation,
        loop: () => props.loop ?? true,
        registerTrigger: (el) => triggers.add(el),
        getTriggers: () => Array.from(triggers).filter((el) => el.isConnected),
      }}
    >
      {renderPart("div", rest, state, {
        ref: (el: HTMLElement) => {
          rootEl = el
        },
        attrs: () => ({
          "data-orientation": orientation(),
          "data-disabled": isDisabled() ? "" : undefined,
        }),
      })}
    </AccordionContext>
  )
}

export function AccordionItem<T extends string = string>(
  props: AccordionItemProps<T> & Omit<PartProps<"div", AccordionItemState>, "value">
) {
  const accordion = useAccordion("Item")
  const uid = createUniqueId()
  const triggerId = `ui-accordion-trigger-${uid}`
  const panelId = `ui-accordion-panel-${uid}`

  const state = (): AccordionItemState => ({
    open: accordion.isOpen(props.value),
    disabled: !!props.disabled || accordion.disabled(),
  })

  const rest = omit(props, "value", "disabled")

  return (
    <AccordionItemContext
      value={{
        value: () => props.value,
        state,
        triggerId,
        panelId,
      }}
    >
      {renderPart("div", rest, state, {
        attrs: () => {
          const s = state()
          return {
            "data-open": s.open ? "" : undefined,
            "data-closed": !s.open ? "" : undefined,
            "data-state": s.open ? "open" : "closed",
            "data-disabled": s.disabled ? "" : undefined,
            "data-orientation": accordion.orientation(),
          }
        },
      })}
    </AccordionItemContext>
  )
}

export function AccordionHeader(
  props: AccordionHeaderProps & PartProps<"h3", AccordionHeaderState>
) {
  const accordion = useAccordion("Header")
  const item = useAccordionItem("Header")
  return renderPart("h3", props, item.state, {
    attrs: () => {
      const s = item.state()
      return {
        "data-open": s.open ? "" : undefined,
        "data-closed": !s.open ? "" : undefined,
        "data-state": s.open ? "open" : "closed",
        "data-disabled": s.disabled ? "" : undefined,
        "data-orientation": accordion.orientation(),
      }
    },
  })
}

export function AccordionTrigger(
  props: AccordionTriggerProps & PartProps<"button", AccordionTriggerState>
) {
  const accordion = useAccordion("Trigger")
  const item = useAccordionItem("Trigger")
  let triggerEl: HTMLElement | undefined

  return renderPart("button", props, item.state, {
    ref: (el: HTMLElement) => {
      triggerEl = el
      if (el) accordion.registerTrigger(el)
    },
    attrs: () => {
      const s = item.state()
      return {
        type: "button",
        id: props.id ?? item.triggerId,
        "aria-expanded": s.open ? "true" : "false",
        "aria-controls": item.panelId,
        disabled: s.disabled || undefined,
        "data-open": s.open ? "" : undefined,
        "data-closed": !s.open ? "" : undefined,
        "data-state": s.open ? "open" : "closed",
        "data-disabled": s.disabled ? "" : undefined,
        "data-orientation": accordion.orientation(),
      }
    },
    handlers: {
      onClick: (event: MouseEvent) => {
        if (item.state().disabled) return
        accordion.toggle(item.value(), event)
      },
      onKeyDown: (event: KeyboardEvent) => {
        if (!triggerEl) return
        navigateRoving(event, accordion.getTriggers(), triggerEl, {
          orientation: accordion.orientation(),
          loop: accordion.loop(),
        })
      },
    },
  })
}

export function AccordionPanel(
  props: AccordionPanelProps &
    Omit<PartProps<"div", AccordionPanelState>, keyof AccordionPanelProps>
) {
  const accordion = useAccordion("Panel")
  const item = useAccordionItem("Panel")
  const rest = omit(props, "keepMounted", "hiddenUntilFound")
  const shouldRender = () =>
    item.state().open || !!props.keepMounted || !!props.hiddenUntilFound

  return (
    <Show when={shouldRender()}>
      {renderPart("div", rest, item.state, {
        attrs: () => {
          const s = item.state()
          return {
            role: "region",
            id: props.id ?? item.panelId,
            "aria-labelledby": item.triggerId,
            hidden: s.open
              ? undefined
              : props.hiddenUntilFound
                ? ("until-found" as unknown as boolean)
                : true,
            "data-open": s.open ? "" : undefined,
            "data-closed": !s.open ? "" : undefined,
            "data-state": s.open ? "open" : "closed",
            "data-disabled": s.disabled ? "" : undefined,
            "data-orientation": accordion.orientation(),
          }
        },
        handlers: {
          onBeforeMatch: (event: Event) => accordion.openFromFind(item.value(), event),
        },
      })}
    </Show>
  )
}
