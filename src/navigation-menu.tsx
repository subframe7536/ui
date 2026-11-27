import { createContext, createSignal, createUniqueId, omit, Show, useContext } from 'solid-js'

import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { useDismissLayer } from './foundation/dismissal'
import { navigateRoving } from './foundation/focus'
import type { Orientation } from './foundation/focus'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type NavigationMenuOrientation = Orientation
export type NavigationMenuMotion = 'from-start' | 'from-end' | 'to-start' | 'to-end' | undefined
export type NavigationMenuValueChangeReason =
  | 'trigger-press'
  | 'trigger-hover'
  | 'link-press'
  | 'escape-key'
  | 'outside-press'
  | 'imperative'

export type NavigationMenuChangeOptions = ChangeOptions<NavigationMenuValueChangeReason>

export type NavigationMenuApi<T extends string = string> = {
  setValue: (value: T | undefined, options?: NavigationMenuChangeOptions) => void
  close: (options?: NavigationMenuChangeOptions) => void
  getValue: () => T | undefined
}

export function createNavigationMenuController<T extends string = string>() {
  return createController<NavigationMenuApi<T>>()
}

export type NavigationMenuController<T extends string = string> = ReturnType<
  typeof createNavigationMenuController<T>
>

export type NavigationMenuOptions<T extends string = string> = {
  value?: T
  defaultValue?: T
  onValueChange?: (
    value: T | undefined,
    details: ChangeDetails<NavigationMenuValueChangeReason>,
  ) => void
  orientation?: NavigationMenuOrientation
  loop?: boolean
  controller?: NavigationMenuController<T>
  debug?: boolean
}

export type NavigationMenuProps<T extends string = string> = NavigationMenuOptions<T> &
  Omit<PartProps<'nav', NavigationMenuState<T>>, 'defaultValue' | 'onChange'>

export type NavigationMenuState<T extends string = string> = {
  value: T | undefined
  orientation: NavigationMenuOrientation
}

export type NavigationMenuListState = { orientation: NavigationMenuOrientation }
export type NavigationMenuItemProps<T extends string = string> = { value?: T }
export type NavigationMenuItemState = { open: boolean }
export type NavigationMenuTriggerProps = { disabled?: boolean }
export type NavigationMenuTriggerState = { open: boolean; disabled: boolean }
export type NavigationMenuContentProps = { keepMounted?: boolean }
export type NavigationMenuContentState = { open: boolean; motion: NavigationMenuMotion }
export type NavigationMenuLinkProps = { active?: boolean; closeOnSelect?: boolean }
export type NavigationMenuLinkState = { active: boolean }
export type NavigationMenuLinkIconProps = { mirror?: boolean }
export type NavigationMenuLinkIconState = { active: boolean }
export type NavigationMenuIndicatorProps = { followHover?: boolean }
export type NavigationMenuIndicatorState = { open: boolean; orientation: NavigationMenuOrientation }
export type NavigationMenuViewportProps = {}
export type NavigationMenuViewportState = { open: boolean; orientation: NavigationMenuOrientation }

type NavContextValue = {
  baseId: string
  value: () => string | undefined
  orientation: () => NavigationMenuOrientation
  loop: () => boolean
  select: (next: string | undefined, reason: NavigationMenuValueChangeReason, event?: Event) => void
  registerTrigger: (el: HTMLElement) => void
  getTriggers: () => Array<HTMLElement>
  setRootEl: (el: HTMLElement) => void
  hoveredValue: () => string | undefined
  setHoveredValue: (v: string | undefined) => void
}

type NavItemContextValue = {
  value: () => string
  open: () => boolean
}

const NavigationMenuContext = createContext<NavContextValue | null>(null)
const NavigationMenuItemContext = createContext<NavItemContextValue | null>(null)
const NavigationMenuLinkContext = createContext<() => NavigationMenuLinkState>(() => ({
  active: false,
}))

function useNav(part: string): NavContextValue {
  const ctx = useContext(NavigationMenuContext)
  if (!ctx) {
    throw new Error(`<NavigationMenu${part}> must be used inside <NavigationMenu>.`)
  }
  return ctx
}

export function NavigationMenu<T extends string = string>(props: NavigationMenuProps<T>) {
  const baseId = `ui-nav-${createUniqueId()}`
  let rootEl: HTMLElement | undefined
  const triggers = new Set<HTMLElement>()
  const [hoveredValue, setHoveredValue] = createSignal<string | undefined>(undefined)

  const [value, setValue] = createControlledSignal<T | undefined>({
    value: () => props.value,
    defaultValue: () => props.defaultValue,
  })

  const orientation = (): NavigationMenuOrientation => props.orientation ?? 'horizontal'

  const applyValue = (
    next: T | undefined,
    reason: NavigationMenuValueChangeReason,
    event?: Event,
    source?: ChangeOptions['source'],
  ) => {
    const prev = value()
    if (prev === next) {
      return
    }
    const details = createChangeDetails(reason, event, source)
    props.onValueChange?.(next, details)
    if (details.canceled) {
      return
    }
    setValue(next)
    reg.emit({
      key: 'value',
      previous: prev,
      value: next,
      reason: details.reason,
      source: details.source,
    })
  }

  const api: NavigationMenuApi<T> = {
    setValue: (next, opts) =>
      applyValue(next, opts?.reason ?? 'imperative', opts?.event, opts?.source),
    close: (opts) => applyValue(undefined, opts?.reason ?? 'imperative', opts?.event, opts?.source),
    getValue: value,
  }

  useController(() => props.controller, api)

  useDismissLayer({
    active: () => value() !== undefined,
    getElements: () => [rootEl],
    dismissOnEscape: () => true,
    dismissOnOutsidePress: () => true,
    onDismiss: (reason, event) => applyValue(undefined, reason, event),
  })

  const reg = registerComponent({
    component: 'navigation-menu',
    getElements: () => [rootEl],
    getState: () => ({ value: value() }),
    actions: {
      setValue: (v) => api.setValue(v === undefined ? undefined : (String(v) as T)),
      close: () => api.close(),
    },
  })

  const state = (): NavigationMenuState<T> => ({
    value: value(),
    orientation: orientation(),
  })

  const rest = omit(
    props,
    'value',
    'defaultValue',
    'onValueChange',
    'orientation',
    'loop',
    'controller',
    'debug',
  )

  return (
    <NavigationMenuContext
      value={{
        baseId,
        value,
        orientation,
        loop: () => props.loop ?? true,
        select: (next, reason, event) => applyValue(next as T | undefined, reason, event),
        registerTrigger: (el) => triggers.add(el),
        getTriggers: () => Array.from(triggers).filter((el) => el.isConnected),
        setRootEl: (el) => {
          rootEl = el
        },
        hoveredValue,
        setHoveredValue,
      }}
    >
      {renderPart('nav', rest, state, {
        ref: (el: HTMLElement) => {
          rootEl = el
        },
        attrs: () => ({
          'data-orientation': orientation(),
        }),
      })}
    </NavigationMenuContext>
  )
}

export function NavigationMenuList(props: PartProps<'ul', NavigationMenuListState>) {
  const nav = useNav('List')
  return renderPart('ul', props, () => ({ orientation: nav.orientation() }), {
    attrs: () => ({ 'data-orientation': nav.orientation() }),
    handlers: {
      onPointerLeave: () => nav.setHoveredValue(undefined),
    },
  })
}

export function NavigationMenuItem<T extends string = string>(
  props: NavigationMenuItemProps<T> & Omit<PartProps<'li', NavigationMenuItemState>, 'value'>,
) {
  const nav = useNav('Item')
  const fallbackValue = createUniqueId()
  const itemValue = () => props.value ?? fallbackValue
  const open = () => nav.value() === itemValue()
  const state = (): NavigationMenuItemState => ({ open: open() })
  const rest = omit(props, 'value')

  return (
    <NavigationMenuItemContext value={{ value: itemValue, open }}>
      {renderPart('li', rest, state, {
        attrs: () => ({
          'data-open': open() ? '' : undefined,
          'data-state': open() ? 'open' : 'closed',
        }),
      })}
    </NavigationMenuItemContext>
  )
}

export function NavigationMenuTrigger(
  props: NavigationMenuTriggerProps &
    Omit<PartProps<'button', NavigationMenuTriggerState>, 'disabled' | 'type'>,
) {
  const nav = useNav('Trigger')
  const item = useContext(NavigationMenuItemContext)
  if (!item) {
    throw new Error('<NavigationMenuTrigger> must be used inside <NavigationMenuItem>.')
  }
  let elRef: HTMLElement | undefined
  const state = (): NavigationMenuTriggerState => ({
    open: item.open(),
    disabled: !!props.disabled,
  })
  const rest = omit(props, 'disabled')

  return renderPart('button', rest, state, {
    ref: (el: HTMLElement) => {
      elRef = el
      if (el) {
        nav.registerTrigger(el)
      }
    },
    attrs: () => ({
      type: 'button',
      'aria-expanded': item.open() ? 'true' : 'false',
      'aria-controls': `${nav.baseId}-content-${item.value()}`,
      disabled: props.disabled || undefined,
      'data-open': item.open() ? '' : undefined,
      'data-state': item.open() ? 'open' : 'closed',
    }),
    handlers: {
      onClick: (event: MouseEvent) => {
        if (props.disabled) {
          return
        }
        nav.select(item.open() ? undefined : item.value(), 'trigger-press', event)
      },
      onPointerEnter: () => {
        if (!props.disabled) {
          nav.setHoveredValue(item.value())
        }
      },
      onKeyDown: (event: KeyboardEvent) => {
        if (!elRef) {
          return
        }
        navigateRoving(event, nav.getTriggers(), elRef, {
          orientation: nav.orientation(),
          loop: nav.loop(),
        })
      },
    },
  })
}

export function NavigationMenuContent(
  props: NavigationMenuContentProps &
    Omit<PartProps<'div', NavigationMenuContentState>, 'keepMounted'>,
) {
  const nav = useNav('Content')
  const item = useContext(NavigationMenuItemContext)
  if (!item) {
    throw new Error('<NavigationMenuContent> must be used inside <NavigationMenuItem>.')
  }
  const state = (): NavigationMenuContentState => ({ open: item.open(), motion: undefined })
  const rest = omit(props, 'keepMounted')

  return (
    <Show when={item.open() || !!props.keepMounted}>
      {renderPart('div', rest, state, {
        attrs: () => ({
          id: props.id ?? `${nav.baseId}-content-${item.value()}`,
          hidden: item.open() ? undefined : true,
          'data-open': item.open() ? '' : undefined,
          'data-state': item.open() ? 'open' : 'closed',
        }),
      })}
    </Show>
  )
}

export function NavigationMenuLink(
  props: NavigationMenuLinkProps &
    Omit<PartProps<'a', NavigationMenuLinkState>, 'active' | 'closeOnSelect'>,
) {
  const nav = useNav('Link')
  const state = (): NavigationMenuLinkState => ({ active: !!props.active })
  const rest = omit(props, 'active', 'closeOnSelect')

  return (
    <NavigationMenuLinkContext value={state}>
      {renderPart('a', rest, state, {
        attrs: () => ({
          'aria-current': props.active ? 'page' : undefined,
          'data-active': props.active ? '' : undefined,
        }),
        handlers: {
          onClick: (event: MouseEvent) => {
            if (props.closeOnSelect ?? true) {
              nav.select(undefined, 'link-press', event)
            }
          },
        },
      })}
    </NavigationMenuLinkContext>
  )
}

export function NavigationMenuLinkIcon(
  props: NavigationMenuLinkIconProps &
    Omit<PartProps<'span', NavigationMenuLinkIconState>, 'mirror'>,
) {
  const state = useContext(NavigationMenuLinkContext)
  const rest = omit(props, 'mirror')
  return renderPart('span', rest, state, {
    attrs: () => ({
      'aria-hidden': 'true',
      'data-mirror': props.mirror ? '' : undefined,
    }),
  })
}

export function NavigationMenuIndicator(
  props: NavigationMenuIndicatorProps &
    Omit<PartProps<'span', NavigationMenuIndicatorState>, 'followHover'>,
) {
  const nav = useNav('Indicator')
  const active = () =>
    (props.followHover ? (nav.hoveredValue() ?? nav.value()) : nav.value()) !== undefined
  const state = (): NavigationMenuIndicatorState => ({
    open: active(),
    orientation: nav.orientation(),
  })
  const rest = omit(props, 'followHover')
  return renderPart('span', rest, state, {
    attrs: () => ({
      'aria-hidden': 'true',
      'data-open': active() ? '' : undefined,
      'data-orientation': nav.orientation(),
    }),
  })
}

export function NavigationMenuViewport(
  props: NavigationMenuViewportProps & PartProps<'div', NavigationMenuViewportState>,
) {
  const nav = useNav('Viewport')
  const open = () => nav.value() !== undefined
  const state = (): NavigationMenuViewportState => ({
    open: open(),
    orientation: nav.orientation(),
  })
  return renderPart('div', props, state, {
    attrs: () => ({
      'data-open': open() ? '' : undefined,
      'data-state': open() ? 'open' : 'closed',
      'data-orientation': nav.orientation(),
    }),
  })
}
