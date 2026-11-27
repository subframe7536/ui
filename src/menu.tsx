import { Portal, type JSX } from "@solidjs/web"
import {
  createContext,
  createSignal,
  createUniqueId,
  omit,
  Show,
  useContext,
} from "solid-js"
import { runAction, type ActionDetails } from "./foundation/action"
import {
  createController,
  useController,
  useControllerEntry,
  useControllerTarget,
} from "./foundation/controller"
import {
  createChangeDetails,
  inferSource,
  type ChangeDetails,
  type ChangeOptions,
} from "./foundation/details"
import { useDismissLayer } from "./foundation/dismissal"
import { navigateRoving, type FocusTarget } from "./foundation/focus"
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

export type MenuOpenChangeReason =
  | "trigger-press"
  | "item-press"
  | "escape-key"
  | "outside-press"
  | "submenu-switch"
  | "parent-close"
  | "shortcut"
  | "imperative"

export type MenuDismissReason = "escape-key" | "outside-press"
export type MenuPayloadChangeReason = "trigger-press" | "shortcut" | "imperative"
export type MenuCheckedChangeReason = "item-press" | "imperative"
export type MenuValueChangeReason = "item-press" | "imperative"
export type MenuFinalFocus = FocusTarget
export type MenuActionDetails = ActionDetails
export type MenuCheckedChangeDetails = ChangeDetails<MenuCheckedChangeReason>
export type MenuValueChangeDetails = ChangeDetails<MenuValueChangeReason>

export type MenuOpenOptions<Payload = unknown> = ChangeOptions<MenuOpenChangeReason> & {
  payload?: Payload
  point?: { x: number; y: number }
}

export type MenuApi<Payload = unknown> = {
  open: (options?: MenuOpenOptions<Payload>) => void
  close: (options?: ChangeOptions<MenuOpenChangeReason>) => void
  toggle: (options?: ChangeOptions<MenuOpenChangeReason>) => void
  setOpen: (open: boolean, options?: ChangeOptions<MenuOpenChangeReason>) => void
  isOpen: () => boolean
  getPayload: () => Payload | undefined
}

export function createMenuController<Payload = unknown>() {
  return createController<MenuApi<Payload>>()
}

export type MenuController<Payload = unknown> = ReturnType<typeof createMenuController<Payload>>

export type MenuOptions<Payload = unknown> = PortalProps & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails<MenuOpenChangeReason>) => void
  loop?: boolean
  modal?: boolean
  closeOnEscape?: boolean
  closeOnOutsidePress?: boolean
  payload?: Payload
  controller?: MenuController<Payload>
  debug?: boolean
}

export type MenuProps<Payload = unknown> = MenuOptions<Payload> & {
  children?: JSX.Element
}

export type MenuSubProps = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails<MenuOpenChangeReason>) => void
  children?: JSX.Element
}

export type MenuTriggerProps<Payload = unknown> = {
  disabled?: boolean
  focusableWhenDisabled?: boolean
  payload?: Payload
  shortcut?: string
  controller?: MenuController<any>
}

export type MenuTriggerState = { open: boolean; disabled: boolean }

export type MenuContextTriggerProps<Payload = unknown> = {
  disabled?: boolean
  payload?: Payload
  controller?: MenuController<any>
}

export type MenuContextTriggerState = { open: boolean; disabled: boolean }

export type MenuContentProps = PortalProps &
  PositionProps & {
    keepMounted?: boolean
    inline?: boolean
    finalFocus?: MenuFinalFocus
  }

export type MenuContentState<Payload = unknown> = {
  open: boolean
  side: Side
  align: Align
  payload: Payload | undefined
}

export type MenuItemProps = {
  disabled?: boolean
  closeOnSelect?: boolean
  onSelect?: (event: MouseEvent | KeyboardEvent, details: MenuActionDetails) => unknown
}

export type MenuItemState = {
  disabled: boolean
  pending: boolean
  error: unknown
}

export type MenuCheckboxItemProps = {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean, details: MenuCheckedChangeDetails) => void
  disabled?: boolean
  closeOnSelect?: boolean
}

export type MenuCheckboxItemState = {
  checked: boolean
  disabled: boolean
}

export type MenuRadioGroupProps<T extends string = string> = {
  value?: T
  defaultValue?: T
  onValueChange?: (value: T, details: MenuValueChangeDetails) => void
}

export type MenuRadioGroupState<T extends string = string> = {
  value: T | undefined
}

export type MenuRadioItemProps<T extends string = string> = {
  value: T
  disabled?: boolean
  closeOnSelect?: boolean
}

export type MenuRadioItemState = {
  checked: boolean
  disabled: boolean
}

export type MenuSubTriggerProps = { disabled?: boolean }
export type MenuItemIconProps = { mirror?: boolean }
export type MenuItemIconState = { disabled: boolean }
export type MenuItemIndicatorProps = { keepMounted?: boolean }
export type MenuItemIndicatorState = { checked: boolean; disabled: boolean }

export type MenuDataItem = {
  id?: string
  label: string
  disabled?: boolean
  onSelect?: () => unknown
}
export type MenuData = MenuDataItem[]

type MenuContextValue = {
  open: () => boolean
  loop: () => boolean
  payload: () => unknown
  container: () => HTMLElement | null | undefined
  contentId: string
  openMenu: (reason: MenuOpenChangeReason, event?: Event, payload?: unknown) => void
  closeMenu: (reason: MenuOpenChangeReason, event?: Event) => void
  toggleMenu: (payload?: unknown, event?: Event) => void
  triggerEl: () => HTMLElement | undefined
  setTriggerEl: (el: HTMLElement) => void
  contentEl: () => HTMLElement | undefined
  setContentEl: (el: HTMLElement) => void
  registerItem: (el: HTMLElement) => void
  getItems: () => HTMLElement[]
  parent?: MenuContextValue | null
}

type RadioGroupContextValue = {
  value: () => string | undefined
  select: (value: string, event?: Event) => void
}

type ItemIndicatorContextValue = () => { checked: boolean; disabled: boolean }

const MenuContext = createContext<MenuContextValue | null>(null)
const MenuRadioGroupContext = createContext<RadioGroupContextValue | null>(null)
const MenuItemIndicatorContext = createContext<ItemIndicatorContextValue>(() => ({
  checked: false,
  disabled: false,
}))
const MenuShortcutContext = createContext<() => string | undefined>(() => undefined)

function useMenuContext(part: string): MenuContextValue {
  const ctx = useContext(MenuContext)
  if (!ctx) throw new Error(`<Menu${part}> must be used inside <Menu>.`)
  return ctx
}

export function Menu<Payload = unknown>(props: MenuProps<Payload>) {
  const parent = useContext(MenuContext)
  const contentId = `ui-menu-${createUniqueId()}`
  const items = new Set<HTMLElement>()

  const [open, setOpen] = createControlledSignal<boolean>({
    value: () => props.open,
    defaultValue: () => !!props.defaultOpen,
  })
  const [payload, setPayload] = createSignal<Payload | undefined>(
    props.payload as Exclude<Payload, Function> | undefined
  )
  const [triggerEl, setTriggerEl] = createSignal<HTMLElement | undefined>(undefined)
  const [contentEl, setContentEl] = createSignal<HTMLElement | undefined>(undefined)

  const applyOpen = (
    next: boolean,
    reason: MenuOpenChangeReason,
    event?: Event,
    source?: ChangeOptions["source"]
  ) => {
    const prev = open()
    if (prev === next) return
    const details = createChangeDetails(reason, event, source)
    props.onOpenChange?.(next, details)
    if (details.canceled) return
    setOpen(next)
    if (next) {
      queueMicrotask(() => {
        getItems()[0]?.focus()
      })
    }
    reg.emit({
      key: "open",
      previous: prev,
      value: next,
      reason: details.reason,
      source: details.source,
    })
  }

  const getItems = () => Array.from(items).filter((el) => el.isConnected)

  const api: MenuApi<Payload> = {
    open: (opts) => {
      if (opts?.payload !== undefined) setPayload(() => opts.payload)
      applyOpen(true, opts?.reason ?? "imperative", opts?.event, opts?.source)
    },
    close: (opts) =>
      applyOpen(false, opts?.reason ?? "imperative", opts?.event, opts?.source),
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
    component: "menu",
    getElements: () => [contentEl(), triggerEl()],
    getState: () => ({ open: open() }),
    getItems: () =>
      getItems().map((el, idx) => ({
        value: el.textContent?.trim() || String(idx),
        label: el.textContent?.trim() || String(idx),
      })),
    actions: {
      open: () => api.open(),
      close: () => api.close(),
      toggle: () => api.toggle(),
      setOpen: (next) => api.setOpen(Boolean(next)),
      press: (label) => {
        if (!open()) api.open()
        const needle = String(label ?? "").trim().toLowerCase()
        const target = getItems().find(
          (el) => el.textContent?.trim().toLowerCase() === needle
        )
        target?.click()
      },
    },
  })

  const ctx: MenuContextValue = {
    open,
    loop: () => props.loop ?? true,
    payload: () => (props.payload !== undefined ? props.payload : payload()),
    container: () => props.container,
    contentId,
    openMenu: (reason, event, nextPayload) => {
      if (nextPayload !== undefined) setPayload(() => nextPayload as Payload)
      applyOpen(true, reason, event)
    },
    closeMenu: (reason, event) => {
      applyOpen(false, reason, event)
      if (reason === "item-press") {
        parent?.closeMenu("parent-close", event)
      }
    },
    toggleMenu: (nextPayload, event) => {
      if (nextPayload !== undefined) setPayload(() => nextPayload as Payload)
      applyOpen(!open(), "trigger-press", event)
    },
    triggerEl,
    setTriggerEl: (el) => setTriggerEl(el),
    contentEl,
    setContentEl: (el) => setContentEl(el),
    registerItem: (el) => items.add(el),
    getItems,
    parent,
  }

  useControllerEntry(() => props.controller, ctx)

  return <MenuContext value={ctx}>{props.children}</MenuContext>
}

export function MenuSub(props: MenuSubProps) {
  return (
    <Menu
      open={props.open}
      defaultOpen={props.defaultOpen}
      onOpenChange={props.onOpenChange}
    >
      {props.children}
    </Menu>
  )
}

export function MenuTrigger<Payload = unknown>(
  props: MenuTriggerProps<Payload> &
    Omit<PartProps<"button", MenuTriggerState>, "value" | "onChange" | "type">
) {
  const target = useControllerTarget(() => props.controller, useContext(MenuContext))
  const rest = omit(
    props,
    "disabled",
    "focusableWhenDisabled",
    "payload",
    "shortcut",
    "controller"
  )
  const state = (): MenuTriggerState => ({
    open: target()?.open() ?? false,
    disabled: !!props.disabled,
  })

  return (
    <MenuShortcutContext value={() => props.shortcut}>
      {renderPart("button", rest, state, {
        ref: (el: HTMLElement) => target()?.setTriggerEl(el),
        attrs: () => {
          const s = state()
          const ctx = target()
          return {
            type: "button",
            "aria-haspopup": "menu",
            "aria-expanded": s.open ? "true" : "false",
            "aria-controls": ctx?.contentId,
            disabled: s.disabled && !props.focusableWhenDisabled ? true : undefined,
            "aria-disabled": s.disabled && props.focusableWhenDisabled ? "true" : undefined,
            "data-open": s.open ? "" : undefined,
            "data-closed": !s.open ? "" : undefined,
            "data-state": s.open ? "open" : "closed",
          }
        },
        handlers: {
          onClick: (event: MouseEvent) => {
            if (props.disabled) return
            target()?.toggleMenu(props.payload, event)
          },
          onKeyDown: (event: KeyboardEvent) => {
            if (props.disabled) return
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault()
              target()?.openMenu("trigger-press", event, props.payload)
            }
          },
        },
      })}
    </MenuShortcutContext>
  )
}

export function MenuContextTrigger<Payload = unknown>(
  props: MenuContextTriggerProps<Payload> &
    Omit<PartProps<"div", MenuContextTriggerState>, "value" | "onChange">
) {
  const target = useControllerTarget(() => props.controller, useContext(MenuContext))
  const rest = omit(props, "disabled", "payload", "controller")
  const state = (): MenuContextTriggerState => ({
    open: target()?.open() ?? false,
    disabled: !!props.disabled,
  })

  return renderPart("div", rest, state, {
    ref: (el: HTMLElement) => target()?.setTriggerEl(el),
    attrs: () => ({
      "data-open": state().open ? "" : undefined,
      "data-state": state().open ? "open" : "closed",
    }),
    handlers: {
      onContextMenu: (event: MouseEvent) => {
        if (props.disabled) return
        event.preventDefault()
        target()?.openMenu("trigger-press", event, props.payload)
      },
    },
  })
}

export function MenuContent<Payload = unknown>(
  props: MenuContentProps &
    Omit<PartProps<"div", MenuContentState<Payload>>, keyof MenuContentProps>
) {
  const ctx = useMenuContext("Content")
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
    "inline",
    "finalFocus"
  )

  const pos = usePopupPosition({
    open: ctx.open,
    reference: () => props.anchor ?? ctx.triggerEl(),
    floating: ctx.contentEl,
    side: () => props.side ?? (ctx.parent ? "right" : "bottom"),
    align: () => props.align ?? "start",
    sideOffset: () => props.sideOffset ?? 4,
    alignOffset: () => props.alignOffset,
    collisionPadding: () => props.collisionPadding,
    arrowPadding: () => props.arrowPadding,
  })

  const state = (): MenuContentState<Payload> => ({
    open: ctx.open(),
    side: pos.side(),
    align: pos.align(),
    payload: ctx.payload() as Payload | undefined,
  })

  const renderSurface = () =>
    renderPart("div", rest, state, {
      ref: ctx.setContentEl,
      attrs: () => {
        const open = ctx.open()
        return {
          role: "menu",
          id: props.id ?? ctx.contentId,
          tabindex: -1,
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
    <Show when={ctx.open() || !!props.keepMounted}>
      <Show when={!props.inline} fallback={renderSurface()}>
        <Portal mount={(props.container ?? ctx.container()) ?? undefined}>
          {renderSurface()}
        </Portal>
      </Show>
    </Show>
  )
}

export const MenuSubContent = MenuContent

export function MenuItems(props: PartProps<"div", {}>) {
  return renderPart("div", props, () => ({}))
}

export function MenuItem(
  props: MenuItemProps & Omit<PartProps<"div", MenuItemState>, keyof MenuItemProps>
) {
  const ctx = useMenuContext("Item")
  const [pending, setPending] = createSignal(false)
  const [error, setError] = createSignal<unknown>(undefined)
  let elRef: HTMLElement | undefined

  const state = (): MenuItemState => ({
    disabled: !!props.disabled,
    pending: pending(),
    error: error(),
  })

  const triggerSelect = (event: MouseEvent | KeyboardEvent) => {
    if (props.disabled || pending()) return
    const closeAfter = props.closeOnSelect ?? true
    if (!props.onSelect) {
      if (closeAfter) ctx.closeMenu("item-press", event)
      return
    }
    setError(undefined)
    runAction((details) => props.onSelect?.(event, details), inferSource(event), {
      pending: setPending,
      done: () => {
        if (closeAfter) ctx.closeMenu("item-press", event)
      },
      failed: setError,
    })
  }

  const rest = omit(props, "disabled", "closeOnSelect", "onSelect")

  return renderPart("div", rest, state, {
    ref: (el: HTMLElement) => {
      elRef = el
      if (el) ctx.registerItem(el)
    },
    attrs: () => ({
      role: "menuitem",
      tabindex: props.disabled ? undefined : -1,
      "aria-disabled": props.disabled ? "true" : undefined,
      "aria-busy": pending() ? "true" : undefined,
      "data-disabled": props.disabled ? "" : undefined,
      "data-pending": pending() ? "" : undefined,
    }),
    handlers: {
      onClick: triggerSelect,
      onKeyDown: (event: KeyboardEvent) => {
        if (!elRef) return
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          triggerSelect(event)
          return
        }
        if (event.key === "ArrowLeft" && ctx.parent) {
          event.preventDefault()
          ctx.closeMenu("escape-key", event)
          ctx.triggerEl()?.focus()
          return
        }
        navigateRoving(event, ctx.getItems(), elRef, {
          orientation: "vertical",
          loop: ctx.loop(),
        })
      },
    },
  })
}

export function MenuSubTrigger(
  props: MenuSubTriggerProps & Omit<PartProps<"div", MenuTriggerState>, "disabled">
) {
  const ctx = useMenuContext("SubTrigger")
  let elRef: HTMLElement | undefined
  const state = (): MenuTriggerState => ({
    open: ctx.open(),
    disabled: !!props.disabled,
  })
  const rest = omit(props, "disabled")

  return renderPart("div", rest, state, {
    ref: (el: HTMLElement) => {
      elRef = el
      ctx.setTriggerEl(el)
      if (el) ctx.parent?.registerItem(el)
    },
    attrs: () => ({
      role: "menuitem",
      tabindex: props.disabled ? undefined : -1,
      "aria-haspopup": "menu",
      "aria-expanded": ctx.open() ? "true" : "false",
      "aria-controls": ctx.contentId,
      "aria-disabled": props.disabled ? "true" : undefined,
      "data-open": ctx.open() ? "" : undefined,
      "data-state": ctx.open() ? "open" : "closed",
    }),
    handlers: {
      onClick: (event: MouseEvent) => {
        if (props.disabled) return
        ctx.openMenu("trigger-press", event)
      },
      onPointerEnter: (event: PointerEvent) => {
        if (props.disabled) return
        ctx.openMenu("submenu-switch", event)
      },
      onKeyDown: (event: KeyboardEvent) => {
        if (props.disabled || !elRef) return
        if (event.key === "ArrowRight" || event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          ctx.openMenu("trigger-press", event)
          return
        }
        if (ctx.parent) {
          navigateRoving(event, ctx.parent.getItems(), elRef, {
            orientation: "vertical",
            loop: ctx.parent.loop(),
          })
        }
      },
    },
  })
}

export function MenuCheckboxItem(
  props: MenuCheckboxItemProps &
    Omit<PartProps<"div", MenuCheckboxItemState>, keyof MenuCheckboxItemProps>
) {
  const ctx = useMenuContext("CheckboxItem")
  let elRef: HTMLElement | undefined
  const [checked, setChecked] = createControlledSignal<boolean>({
    value: () => props.checked,
    defaultValue: () => !!props.defaultChecked,
  })

  const state = (): MenuCheckboxItemState => ({
    checked: checked(),
    disabled: !!props.disabled,
  })

  const toggle = (event: MouseEvent | KeyboardEvent) => {
    if (props.disabled) return
    const next = !checked()
    const details = createChangeDetails<MenuCheckedChangeReason>("item-press", event)
    props.onCheckedChange?.(next, details)
    if (details.canceled) return
    setChecked(next)
    if (props.closeOnSelect) ctx.closeMenu("item-press", event)
  }

  const rest = omit(props, "checked", "defaultChecked", "onCheckedChange", "disabled", "closeOnSelect")

  return (
    <MenuItemIndicatorContext value={state}>
      {renderPart("div", rest, state, {
        ref: (el: HTMLElement) => {
          elRef = el
          if (el) ctx.registerItem(el)
        },
        attrs: () => {
          const s = state()
          return {
            role: "menuitemcheckbox",
            tabindex: s.disabled ? undefined : -1,
            "aria-checked": s.checked ? "true" : "false",
            "aria-disabled": s.disabled ? "true" : undefined,
            "data-checked": s.checked ? "" : undefined,
            "data-state": s.checked ? "checked" : "unchecked",
          }
        },
        handlers: {
          onClick: toggle,
          onKeyDown: (event: KeyboardEvent) => {
            if (!elRef) return
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              toggle(event)
              return
            }
            navigateRoving(event, ctx.getItems(), elRef, {
              orientation: "vertical",
              loop: ctx.loop(),
            })
          },
        },
      })}
    </MenuItemIndicatorContext>
  )
}

export function MenuRadioGroup<T extends string = string>(
  props: MenuRadioGroupProps<T> &
    Omit<PartProps<"div", MenuRadioGroupState<T>>, "value" | "defaultValue" | "onValueChange">
) {
  const [value, setValue] = createControlledSignal<T | undefined>({
    value: () => props.value,
    defaultValue: () => props.defaultValue,
  })

  const select = (next: string, event?: Event) => {
    const details = createChangeDetails<MenuValueChangeReason>("item-press", event)
    props.onValueChange?.(next as T, details)
    if (details.canceled) return
    setValue(next as T)
  }

  const state = (): MenuRadioGroupState<T> => ({ value: value() })
  const rest = omit(props, "value", "defaultValue", "onValueChange")

  return (
    <MenuRadioGroupContext value={{ value, select }}>
      {renderPart("div", rest, state, {
        attrs: () => ({ role: "group" }),
      })}
    </MenuRadioGroupContext>
  )
}

export function MenuRadioItem<T extends string = string>(
  props: MenuRadioItemProps<T> &
    Omit<PartProps<"div", MenuRadioItemState>, "value" | "disabled" | "closeOnSelect">
) {
  const ctx = useMenuContext("RadioItem")
  const radio = useContext(MenuRadioGroupContext)
  let elRef: HTMLElement | undefined

  const state = (): MenuRadioItemState => ({
    checked: radio?.value() === props.value,
    disabled: !!props.disabled,
  })

  const select = (event: MouseEvent | KeyboardEvent) => {
    if (props.disabled) return
    radio?.select(props.value, event)
    if (props.closeOnSelect ?? true) ctx.closeMenu("item-press", event)
  }

  const rest = omit(props, "value", "disabled", "closeOnSelect")

  return (
    <MenuItemIndicatorContext value={state}>
      {renderPart("div", rest, state, {
        ref: (el: HTMLElement) => {
          elRef = el
          if (el) ctx.registerItem(el)
        },
        attrs: () => {
          const s = state()
          return {
            role: "menuitemradio",
            tabindex: s.disabled ? undefined : -1,
            "aria-checked": s.checked ? "true" : "false",
            "aria-disabled": s.disabled ? "true" : undefined,
            "data-checked": s.checked ? "" : undefined,
            "data-state": s.checked ? "checked" : "unchecked",
          }
        },
        handlers: {
          onClick: select,
          onKeyDown: (event: KeyboardEvent) => {
            if (!elRef) return
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              select(event)
              return
            }
            navigateRoving(event, ctx.getItems(), elRef, {
              orientation: "vertical",
              loop: ctx.loop(),
            })
          },
        },
      })}
    </MenuItemIndicatorContext>
  )
}

export function MenuGroup(props: PartProps<"div", {}>) {
  return renderPart("div", props, () => ({}), {
    attrs: () => ({ role: "group" }),
  })
}

export function MenuGroupLabel(props: PartProps<"div", {}>) {
  return renderPart("div", props, () => ({}), {
    attrs: () => ({ role: "presentation" }),
  })
}

export function MenuSeparator(props: PartProps<"div", {}>) {
  return renderPart("div", props, () => ({}), {
    attrs: () => ({ role: "separator" }),
  })
}

export function MenuItemIcon(
  props: MenuItemIconProps & Omit<PartProps<"span", MenuItemIconState>, "mirror">
) {
  const rest = omit(props, "mirror")
  return renderPart("span", rest, () => ({ disabled: false }), {
    attrs: () => ({
      "aria-hidden": "true",
      "data-mirror": props.mirror ? "" : undefined,
    }),
  })
}

export function MenuItemIndicator(
  props: MenuItemIndicatorProps &
    Omit<PartProps<"span", MenuItemIndicatorState>, "keepMounted">
) {
  const state = useContext(MenuItemIndicatorContext)
  const rest = omit(props, "keepMounted")
  return (
    <Show when={state().checked || !!props.keepMounted}>
      {renderPart("span", rest, state, {
        attrs: () => ({
          "aria-hidden": "true",
          "data-checked": state().checked ? "" : undefined,
        }),
      })}
    </Show>
  )
}

export function MenuShortcut(props: PartProps<"kbd", { shortcut: string | undefined }>) {
  const shortcut = useContext(MenuShortcutContext)
  return renderPart("kbd", props, () => ({ shortcut: shortcut() }), {
    attrs: () => ({ "aria-hidden": "true" }),
  })
}
