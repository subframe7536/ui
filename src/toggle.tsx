import { createContext, omit, useContext } from 'solid-js'

import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { navigateRoving } from './foundation/focus'
import type { Orientation } from './foundation/focus'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'
import { useOptionalToolbar } from './toolbar'

export type TogglePressedChangeReason = 'press' | 'imperative'
export type ToggleChangeOptions = ChangeOptions<TogglePressedChangeReason>

export type ToggleApi = {
  setPressed: (pressed: boolean, options?: ToggleChangeOptions) => void
  toggle: (options?: ToggleChangeOptions) => void
  isPressed: () => boolean
}

export function createToggleController() {
  return createController<ToggleApi>()
}

export type ToggleController = ReturnType<typeof createToggleController>

export type ToggleOptions = {
  pressed?: boolean
  defaultPressed?: boolean
  onPressedChange?: (pressed: boolean, details: ChangeDetails<TogglePressedChangeReason>) => void
  value?: string
  disabled?: boolean
  focusableWhenDisabled?: boolean
  controller?: ToggleController
  debug?: boolean
}

export type ToggleState = {
  pressed: boolean
  disabled: boolean
}

export type ToggleIconProps = {
  mirror?: boolean
}

export type ToggleIconState = {
  pressed: boolean
  disabled: boolean
}

export type ToggleGroupOrientation = Orientation
export type ToggleGroupValueChangeReason = 'press' | 'imperative'

export type ToggleGroupApi<T extends string = string> = {
  setValue: (
    value: T | Array<T> | undefined,
    options?: ChangeOptions<ToggleGroupValueChangeReason>,
  ) => void
  getValue: () => T | Array<T> | undefined
}

export function createToggleGroupController<T extends string = string>() {
  return createController<ToggleGroupApi<T>>()
}

export type ToggleGroupController<T extends string = string> = ReturnType<
  typeof createToggleGroupController<T>
>

export type ToggleGroupOptions<T extends string = string> = {
  value?: T | Array<T>
  defaultValue?: T | Array<T>
  onValueChange?: (
    value: T | Array<T> | undefined,
    details: ChangeDetails<ToggleGroupValueChangeReason>,
  ) => void
  multiple?: boolean
  deselectable?: boolean
  disabled?: boolean
  orientation?: ToggleGroupOrientation
  loop?: boolean
  controller?: ToggleGroupController<T>
  debug?: boolean
}

export type ToggleGroupState<T extends string = string> = {
  value: T | Array<T> | undefined
  multiple: boolean
  disabled: boolean
  orientation: ToggleGroupOrientation
}

type GroupContextValue = {
  isPressed: (value: string) => boolean
  hasValue: () => boolean
  claimTabStop: () => boolean
  toggleItem: (value: string, event?: Event) => void
  disabled: () => boolean
  orientation: () => ToggleGroupOrientation
  loop: () => boolean
  registerItem: (el: HTMLElement) => void
  unregisterItem: (el: HTMLElement) => void
  getItems: () => Array<HTMLElement>
}

const ToggleGroupContext = createContext<GroupContextValue | null>(null)
const ToggleContext = createContext<() => ToggleState>(() => ({
  pressed: false,
  disabled: false,
}))

export function Toggle(
  props: ToggleOptions &
    Omit<
      PartProps<'button', ToggleState>,
      'value' | 'defaultValue' | 'type' | 'onChange' | 'onSelect'
    >,
) {
  const group = useContext(ToggleGroupContext)
  const toolbar = useOptionalToolbar()
  let rootEl: HTMLElement | undefined
  let claimedStop: boolean | undefined

  const [ownPressed, setOwnPressed] = createControlledSignal<boolean>({
    value: () => props.pressed,
    defaultValue: () => !!props.defaultPressed,
  })

  const isDisabled = () =>
    !!props.disabled || (group?.disabled() ?? false) || (toolbar?.disabled() ?? false)
  const isPressed = () =>
    group && props.value !== undefined ? group.isPressed(props.value) : ownPressed()

  const applyPressed = (
    next: boolean,
    reason: TogglePressedChangeReason,
    event?: Event,
    source?: ChangeOptions['source'],
  ) => {
    if (isDisabled()) {
      return
    }
    const prev = isPressed()
    if (prev === next) {
      return
    }
    const details = createChangeDetails(reason, event, source)
    props.onPressedChange?.(next, details)
    if (details.canceled) {
      return
    }
    setOwnPressed(next)
    reg.emit({
      key: 'pressed',
      previous: prev,
      value: next,
      reason: details.reason,
      source: details.source,
    })
  }

  const api: ToggleApi = {
    setPressed: (next, options) =>
      applyPressed(next, options?.reason ?? 'imperative', options?.event, options?.source),
    toggle: (options) =>
      applyPressed(!isPressed(), options?.reason ?? 'imperative', options?.event, options?.source),
    isPressed,
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: 'toggle',
    getElements: () => [rootEl],
    getState: () => ({ pressed: isPressed() }),
    getDisabled: isDisabled,
    actions: {
      setPressed: (next) => api.setPressed(Boolean(next)),
      toggle: () => api.toggle(),
    },
  })

  const state = (): ToggleState => ({
    pressed: isPressed(),
    disabled: isDisabled(),
  })

  const rest = omit(
    props,
    'pressed',
    'defaultPressed',
    'onPressedChange',
    'value',
    'disabled',
    'focusableWhenDisabled',
    'controller',
    'debug',
  )

  return (
    <ToggleContext value={state}>
      {renderPart('button', rest, state, {
        ref: (el: HTMLElement) => {
          rootEl = el
          if (group && el) {
            group.registerItem(el)
          }
          if (toolbar && el) {
            toolbar.registerItem(el)
          }
        },
        attrs: () => {
          const pressed = isPressed()
          const disabled = isDisabled()
          const focusableDisabled = disabled && (props.focusableWhenDisabled || !!group)
          if (claimedStop === undefined) {
            if (toolbar) {
              claimedStop = !disabled && toolbar.claimTabStop()
            } else if (group) {
              claimedStop = group.hasValue()
                ? pressed && group.claimTabStop()
                : !disabled && group.claimTabStop()
            }
          }
          const rovingTabIndex = toolbar || group ? (claimedStop ? 0 : -1) : undefined
          return {
            type: 'button',
            tabindex: rovingTabIndex,
            'aria-pressed': pressed ? 'true' : 'false',
            disabled: disabled && !focusableDisabled ? true : undefined,
            'aria-disabled': focusableDisabled ? 'true' : undefined,
            'data-pressed': pressed ? '' : undefined,
            'data-state': pressed ? 'on' : 'off',
            'data-disabled': disabled ? '' : undefined,
          }
        },
        handlers: {
          onClick: (event: MouseEvent) => {
            if (isDisabled()) {
              return
            }
            if (group && props.value !== undefined) {
              group.toggleItem(props.value, event)
            } else {
              applyPressed(!isPressed(), 'press', event)
            }
          },
          onKeyDown: (event: KeyboardEvent) => {
            if (!rootEl) {
              return
            }
            if (toolbar) {
              navigateRoving(event, toolbar.getItems(), rootEl, {
                orientation: toolbar.orientation(),
                loop: toolbar.loop(),
              })
              return
            }
            if (!group) {
              return
            }
            navigateRoving(event, group.getItems(), rootEl, {
              orientation: group.orientation(),
              loop: group.loop(),
            })
          },
        },
      })}
    </ToggleContext>
  )
}

export function ToggleIcon(
  props: ToggleIconProps & Omit<PartProps<'span', ToggleIconState>, 'mirror'>,
) {
  const state = useContext(ToggleContext)
  const rest = omit(props, 'mirror')
  return renderPart('span', rest, state, {
    attrs: () => ({
      'aria-hidden': 'true',
      'data-mirror': props.mirror ? '' : undefined,
    }),
  })
}

export function ToggleGroup<T extends string = string>(
  props: ToggleGroupOptions<T> &
    Omit<PartProps<'div', ToggleGroupState<T>>, 'defaultValue' | 'onChange' | 'onSelect'>,
) {
  let rootEl: HTMLElement | undefined
  let tabStopClaimed = false
  const items = new Set<HTMLElement>()

  const [value, setValue] = createControlledSignal<T | Array<T> | undefined>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? (props.multiple ? ([] as Array<T>) : undefined),
  })

  const orientation = () => props.orientation ?? 'horizontal'
  const isDisabled = () => !!props.disabled
  const hasValue = () => {
    const current = value()
    return Array.isArray(current) ? current.length > 0 : current !== undefined
  }
  const claimTabStop = () => {
    if (tabStopClaimed) {
      return false
    }
    tabStopClaimed = true
    return true
  }

  const applyValue = (
    next: T | Array<T> | undefined,
    reason: ToggleGroupValueChangeReason,
    event?: Event,
    source?: ChangeOptions['source'],
  ) => {
    const prev = value()
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

  const isPressed = (itemValue: string) => {
    const current = value()
    if (Array.isArray(current)) {
      return current.includes(itemValue as T)
    }
    return current === itemValue
  }

  const toggleItem = (itemValue: string, event?: Event) => {
    if (isDisabled()) {
      return
    }
    const current = value()
    if (props.multiple) {
      const list = Array.isArray(current) ? [...current] : current ? [current] : []
      const idx = list.indexOf(itemValue as T)
      if (idx >= 0) {
        if (props.deselectable === false && list.length === 1) {
          return
        }
        list.splice(idx, 1)
      } else {
        list.push(itemValue as T)
      }
      applyValue(list, 'press', event)
    } else {
      if (current === itemValue) {
        if (props.deselectable === false) {
          return
        }
        applyValue(undefined, 'press', event)
      } else {
        applyValue(itemValue as T, 'press', event)
      }
    }
  }

  const api: ToggleGroupApi<T> = {
    setValue: (next, options) =>
      applyValue(next, options?.reason ?? 'imperative', options?.event, options?.source),
    getValue: value,
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: 'toggle-group',
    getElements: () => [rootEl],
    getState: () => ({ value: value(), multiple: !!props.multiple }),
    getDisabled: isDisabled,
    actions: {
      setValue: (next) => api.setValue(next as T | Array<T> | undefined),
    },
  })

  const state = (): ToggleGroupState<T> => ({
    value: value(),
    multiple: !!props.multiple,
    disabled: isDisabled(),
    orientation: orientation(),
  })

  const rest = omit(
    props,
    'value',
    'defaultValue',
    'onValueChange',
    'multiple',
    'deselectable',
    'disabled',
    'orientation',
    'loop',
    'controller',
    'debug',
  )

  return (
    <ToggleGroupContext
      value={{
        isPressed,
        hasValue,
        claimTabStop,
        toggleItem,
        disabled: isDisabled,
        orientation,
        loop: () => props.loop ?? true,
        registerItem: (el) => items.add(el),
        unregisterItem: (el) => items.delete(el),
        getItems: () => Array.from(items).filter((el) => el.isConnected),
      }}
    >
      {renderPart('div', rest, state, {
        ref: (el: HTMLElement) => {
          rootEl = el
        },
        attrs: () => ({
          role: 'group',
          'data-orientation': orientation(),
          'data-disabled': isDisabled() ? '' : undefined,
        }),
      })}
    </ToggleGroupContext>
  )
}
