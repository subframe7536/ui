import {
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  omit,
  Show,
  useContext,
} from "solid-js"
import { createController, useController } from "./foundation/controller"
import {
  createChangeDetails,
  type ChangeDetails,
  type ChangeOptions,
} from "./foundation/details"
import {
  navigateRoving,
  type Direction,
  type Orientation,
} from "./foundation/focus"
import { registerComponent } from "./foundation/registry"
import { renderPart, type PartProps } from "./foundation/render"
import { createControlledSignal } from "./foundation/state"

export type TabsOrientation = Orientation
export type TabsDirection = Direction
export type TabsValueChangeReason =
  | "item-press"
  | "list-navigation"
  | "find-in-page"
  | "imperative"

export type TabsChangeOptions = ChangeOptions<TabsValueChangeReason>

export type TabsApi<T extends string = string> = {
  setValue: (value: T, options?: TabsChangeOptions) => void
  getValue: () => T | undefined
}

export function createTabsController<T extends string = string>() {
  return createController<TabsApi<T>>()
}

export type TabsController<T extends string = string> = ReturnType<
  typeof createTabsController<T>
>

export type TabsOptions<T extends string = string> = {
  value?: T
  defaultValue?: T
  onValueChange?: (
    value: T,
    details: ChangeDetails<TabsValueChangeReason>
  ) => void
  orientation?: TabsOrientation
  direction?: TabsDirection
  activationMode?: "automatic" | "manual"
  loop?: boolean
  disabled?: boolean
  controller?: TabsController<T>
  debug?: boolean
}

export type TabsState<T extends string = string> = {
  value: T | undefined
  orientation: TabsOrientation
  disabled: boolean
}

export type TabsListState = {
  orientation: TabsOrientation
}

export type TabsTabProps<T extends string = string> = {
  value: T
  disabled?: boolean
}

export type TabsTabState = {
  selected: boolean
  disabled: boolean
  orientation: TabsOrientation
}

export type TabsTabIconProps = {
  mirror?: boolean
}

export type TabsTabIconState = TabsTabState

export type TabsIndicatorProps = {
  followHover?: boolean
}

export type TabsIndicatorState = {
  orientation: TabsOrientation
}

export type TabsPanelProps<T extends string = string> = {
  value: T
  keepMounted?: boolean
  hiddenUntilFound?: boolean
}

export type TabsPanelState = {
  selected: boolean
  orientation: TabsOrientation
}

type TabsContextValue = {
  baseId: string
  value: () => string | undefined
  orientation: () => TabsOrientation
  direction: () => TabsDirection
  activationMode: () => "automatic" | "manual"
  loop: () => boolean
  disabled: () => boolean
  select: (value: string, reason: TabsValueChangeReason, event?: Event) => void
  registerTab: (value: string, el: HTMLElement) => void
  getTabs: () => Array<{ value: string; el: HTMLElement }>
  getTabElement: (value: string) => HTMLElement | undefined
  setListEl: (el: HTMLElement) => void
  getListEl: () => HTMLElement | undefined
  hoveredValue: () => string | undefined
  setHoveredValue: (v: string | undefined) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)
const TabStateContext = createContext<() => TabsTabState>(() => ({
  selected: false,
  disabled: false,
  orientation: "horizontal",
}))

function useTabs(part: string): TabsContextValue {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error(`<Tabs${part}> must be used inside <Tabs>.`)
  return ctx
}

export function Tabs<T extends string = string>(
  props: TabsOptions<T> &
    Omit<PartProps<"div", TabsState<T>>, "defaultValue" | "onChange">
) {
  const baseId = `ui-tabs-${createUniqueId()}`
  let rootEl: HTMLElement | undefined
  let listEl: HTMLElement | undefined
  const tabMap = new Map<string, HTMLElement>()
  const [hoveredValue, setHoveredValue] = createSignal<string | undefined>(undefined)

  const [value, setValue] = createControlledSignal<T | undefined>({
    value: () => props.value,
    defaultValue: () => props.defaultValue,
  })

  const orientation = () => props.orientation ?? "horizontal"
  const direction = () => props.direction ?? "ltr"
  const activationMode = () => props.activationMode ?? "automatic"
  const isDisabled = () => !!props.disabled

  const applyValue = (
    next: T,
    reason: TabsValueChangeReason,
    event?: Event,
    source?: ChangeOptions["source"]
  ) => {
    if (isDisabled() && reason !== "imperative") return
    const prev = value()
    if (prev === next) return
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

  const api: TabsApi<T> = {
    setValue: (next, opts) =>
      applyValue(next, opts?.reason ?? "imperative", opts?.event, opts?.source),
    getValue: value,
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: "tabs",
    getElements: () => [rootEl],
    getState: () => ({ value: value() }),
    getItems: () =>
      Array.from(tabMap.entries())
        .filter(([, el]) => el.isConnected)
        .map(([val, el]) => ({ value: val, label: el.textContent?.trim() || val })),
    getDisabled: isDisabled,
    actions: {
      setValue: (v) => api.setValue(String(v) as T),
    },
  })

  const state = (): TabsState<T> => ({
    value: value(),
    orientation: orientation(),
    disabled: isDisabled(),
  })

  const rest = omit(
    props,
    "value",
    "defaultValue",
    "onValueChange",
    "orientation",
    "direction",
    "activationMode",
    "loop",
    "disabled",
    "controller",
    "debug"
  )

  return (
    <TabsContext
      value={{
        baseId,
        value,
        orientation,
        direction,
        activationMode,
        loop: () => props.loop ?? true,
        disabled: isDisabled,
        select: (v, reason, event) => applyValue(v as T, reason, event),
        registerTab: (v, el) => {
          tabMap.set(v, el)
        },
        getTabs: () =>
          Array.from(tabMap.entries())
            .filter(([, el]) => el.isConnected)
            .map(([v, el]) => ({ value: v, el })),
        getTabElement: (v) => tabMap.get(v),
        setListEl: (el) => {
          listEl = el
        },
        getListEl: () => listEl,
        hoveredValue,
        setHoveredValue,
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
    </TabsContext>
  )
}

export function TabsList(props: PartProps<"div", TabsListState>) {
  const tabs = useTabs("List")
  const state = (): TabsListState => ({ orientation: tabs.orientation() })
  return renderPart("div", props, state, {
    ref: tabs.setListEl,
    attrs: () => ({
      role: "tablist",
      "aria-orientation": tabs.orientation(),
      "data-orientation": tabs.orientation(),
    }),
    handlers: {
      onPointerLeave: () => tabs.setHoveredValue(undefined),
    },
  })
}

export function TabsTab<T extends string = string>(
  props: TabsTabProps<T> & Omit<PartProps<"button", TabsTabState>, "value" | "type">
) {
  const tabs = useTabs("Tab")
  let tabEl: HTMLElement | undefined

  const state = (): TabsTabState => ({
    selected: tabs.value() === props.value,
    disabled: !!props.disabled || tabs.disabled(),
    orientation: tabs.orientation(),
  })

  const rest = omit(props, "value", "disabled")

  return (
    <TabStateContext value={state}>
      {renderPart("button", rest, state, {
        ref: (el: HTMLElement) => {
          tabEl = el
          if (el) tabs.registerTab(props.value, el)
        },
        attrs: () => {
          const s = state()
          return {
            type: "button",
            role: "tab",
            id: props.id ?? `${tabs.baseId}-tab-${props.value}`,
            "aria-selected": s.selected ? "true" : "false",
            "aria-controls": `${tabs.baseId}-panel-${props.value}`,
            tabindex: s.selected ? 0 : -1,
            disabled: s.disabled || undefined,
            "data-selected": s.selected ? "" : undefined,
            "data-state": s.selected ? "active" : "inactive",
            "data-disabled": s.disabled ? "" : undefined,
            "data-orientation": s.orientation,
          }
        },
        handlers: {
          onClick: (event: MouseEvent) => {
            if (state().disabled) return
            tabs.select(props.value, "item-press", event)
          },
          onPointerEnter: () => {
            if (!state().disabled) tabs.setHoveredValue(props.value)
          },
          onKeyDown: (event: KeyboardEvent) => {
            if (!tabEl) return
            const entries = tabs.getTabs()
            const target = navigateRoving(
              event,
              entries.map((e) => e.el),
              tabEl,
              {
                orientation: tabs.orientation(),
                direction: tabs.direction(),
                loop: tabs.loop(),
              }
            )
            if (target && tabs.activationMode() === "automatic") {
              const matched = entries.find((e) => e.el === target)
              if (matched) {
                tabs.select(matched.value, "list-navigation", event)
              }
            }
          },
        },
      })}
    </TabStateContext>
  )
}

export function TabsTabIcon(
  props: TabsTabIconProps & Omit<PartProps<"span", TabsTabIconState>, "mirror">
) {
  const state = useContext(TabStateContext)
  const rest = omit(props, "mirror")
  return renderPart("span", rest, state, {
    attrs: () => ({
      "aria-hidden": "true",
      "data-mirror": props.mirror ? "" : undefined,
    }),
  })
}

export function TabsIndicator(
  props: TabsIndicatorProps & Omit<PartProps<"span", TabsIndicatorState>, "followHover">
) {
  const tabs = useTabs("Indicator")
  const [vars, setVars] = createSignal<Record<string, string>>({})

  createEffect(
    () => (props.followHover ? tabs.hoveredValue() ?? tabs.value() : tabs.value()),
    (active) => {
      if (!active) return
      const tabEl = tabs.getTabElement(active)
      if (!tabEl) return
      setVars({
        "--active-tab-left": `${tabEl.offsetLeft}px`,
        "--active-tab-top": `${tabEl.offsetTop}px`,
        "--active-tab-width": `${tabEl.offsetWidth}px`,
        "--active-tab-height": `${tabEl.offsetHeight}px`,
      })
    }
  )

  const state = (): TabsIndicatorState => ({ orientation: tabs.orientation() })
  const rest = omit(props, "followHover")

  return renderPart("span", rest, state, {
    attrs: () => ({
      "aria-hidden": "true",
      "data-orientation": tabs.orientation(),
    }),
    style: vars,
  })
}

export function TabsPanel<T extends string = string>(
  props: TabsPanelProps<T> &
    Omit<PartProps<"div", TabsPanelState>, "value" | "keepMounted" | "hiddenUntilFound">
) {
  const tabs = useTabs("Panel")
  const state = (): TabsPanelState => ({
    selected: tabs.value() === props.value,
    orientation: tabs.orientation(),
  })
  const rest = omit(props, "value", "keepMounted", "hiddenUntilFound")
  const shouldRender = () =>
    state().selected || !!props.keepMounted || !!props.hiddenUntilFound

  return (
    <Show when={shouldRender()}>
      {renderPart("div", rest, state, {
        attrs: () => {
          const s = state()
          return {
            role: "tabpanel",
            id: props.id ?? `${tabs.baseId}-panel-${props.value}`,
            "aria-labelledby": `${tabs.baseId}-tab-${props.value}`,
            tabindex: s.selected ? 0 : -1,
            hidden: s.selected
              ? undefined
              : props.hiddenUntilFound
                ? ("until-found" as unknown as boolean)
                : true,
            "data-selected": s.selected ? "" : undefined,
            "data-state": s.selected ? "active" : "inactive",
            "data-orientation": s.orientation,
          }
        },
        handlers: {
          onBeforeMatch: (event: Event) => tabs.select(props.value, "find-in-page", event),
        },
      })}
    </Show>
  )
}
