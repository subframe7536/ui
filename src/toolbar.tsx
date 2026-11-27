import { createContext, omit, useContext } from 'solid-js'

import { createController, useController } from './foundation/controller'
import { navigateRoving } from './foundation/focus'
import type { Orientation } from './foundation/focus'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'

export type ToolbarOrientation = Orientation

export type ToolbarApi = {
  focusFirst: () => void
  focusLast: () => void
}

export function createToolbarController() {
  return createController<ToolbarApi>()
}

export type ToolbarController = ReturnType<typeof createToolbarController>

export type ToolbarOptions = {
  orientation?: ToolbarOrientation
  loop?: boolean
  disabled?: boolean
  controller?: ToolbarController
  debug?: boolean
}

export type ToolbarState = {
  orientation: ToolbarOrientation
  disabled: boolean
}

export type ToolbarButtonProps = {
  disabled?: boolean
  focusableWhenDisabled?: boolean
}
export type ToolbarButtonState = { disabled: boolean }

export type ToolbarGroupProps = { disabled?: boolean }
export type ToolbarGroupState = { disabled: boolean; orientation: ToolbarOrientation }

export type ToolbarInputProps = { disabled?: boolean }
export type ToolbarInputState = { disabled: boolean }

export type ToolbarLinkState = { disabled: boolean }
export type ToolbarSeparatorState = { orientation: ToolbarOrientation }

export type ToolbarContextValue = {
  orientation: () => ToolbarOrientation
  loop: () => boolean
  disabled: () => boolean
  registerItem: (el: HTMLElement) => void
  getItems: () => Array<HTMLElement>
  claimTabStop: () => boolean
}

const ToolbarContext = createContext<ToolbarContextValue | null>(null)

export function useOptionalToolbar(): ToolbarContextValue | null {
  return useContext(ToolbarContext)
}

function useToolbar(part: string): ToolbarContextValue {
  const ctx = useContext(ToolbarContext)
  if (!ctx) {
    throw new Error(`<Toolbar${part}> must be used inside <Toolbar>.`)
  }
  return ctx
}

export function Toolbar(
  props: ToolbarOptions & Omit<PartProps<'div', ToolbarState>, keyof ToolbarOptions>,
) {
  let rootEl: HTMLElement | undefined
  let tabStopClaimed = false
  const items = new Set<HTMLElement>()

  const orientation = (): ToolbarOrientation => props.orientation ?? 'horizontal'
  const isDisabled = () => !!props.disabled
  const getItems = () => Array.from(items).filter((el) => el.isConnected)
  const claimTabStop = () => {
    if (tabStopClaimed) {
      return false
    }
    tabStopClaimed = true
    return true
  }

  const api: ToolbarApi = {
    focusFirst: () => getItems()[0]?.focus(),
    focusLast: () => getItems().at(-1)?.focus(),
  }

  useController(() => props.controller, api)

  registerComponent({
    component: 'toolbar',
    getElements: () => [rootEl],
    getState: () => ({ orientation: orientation() }),
    getDisabled: isDisabled,
    actions: {
      focusFirst: () => api.focusFirst(),
      focusLast: () => api.focusLast(),
    },
  })

  const state = (): ToolbarState => ({
    orientation: orientation(),
    disabled: isDisabled(),
  })

  const rest = omit(props, 'orientation', 'loop', 'disabled', 'controller', 'debug')

  return (
    <ToolbarContext
      value={{
        orientation,
        loop: () => props.loop ?? true,
        disabled: isDisabled,
        registerItem: (el) => items.add(el),
        getItems,
        claimTabStop,
      }}
    >
      {renderPart('div', rest, state, {
        ref: (el: HTMLElement) => {
          rootEl = el
        },
        attrs: () => ({
          role: 'toolbar',
          'aria-orientation': orientation(),
          'data-orientation': orientation(),
          'data-disabled': isDisabled() ? '' : undefined,
        }),
      })}
    </ToolbarContext>
  )
}

export function ToolbarButton(
  props: ToolbarButtonProps &
    Omit<PartProps<'button', ToolbarButtonState>, keyof ToolbarButtonProps | 'type'>,
) {
  const toolbar = useToolbar('Button')
  let elRef: HTMLElement | undefined
  let isTabStop: boolean | undefined
  const state = (): ToolbarButtonState => ({
    disabled: !!props.disabled || toolbar.disabled(),
  })
  const rest = omit(props, 'disabled', 'focusableWhenDisabled')

  return renderPart('button', rest, state, {
    ref: (el: HTMLElement) => {
      elRef = el
      if (el) {
        toolbar.registerItem(el)
      }
    },
    attrs: () => {
      const disabled = state().disabled
      const focusable = disabled && !!props.focusableWhenDisabled
      if (isTabStop === undefined) {
        isTabStop = (!disabled || focusable) && toolbar.claimTabStop()
      }
      return {
        type: 'button',
        tabindex: disabled && !focusable ? undefined : isTabStop ? 0 : -1,
        disabled: disabled && !focusable ? true : undefined,
        'aria-disabled': focusable ? 'true' : undefined,
        'data-disabled': disabled ? '' : undefined,
      }
    },
    handlers: {
      onKeyDown: (event: KeyboardEvent) => {
        if (!elRef) {
          return
        }
        navigateRoving(event, toolbar.getItems(), elRef, {
          orientation: toolbar.orientation(),
          loop: toolbar.loop(),
        })
      },
    },
  })
}

export function ToolbarLink(props: PartProps<'a', ToolbarLinkState>) {
  const toolbar = useToolbar('Link')
  let elRef: HTMLElement | undefined
  let isTabStop: boolean | undefined
  const state = (): ToolbarLinkState => ({ disabled: toolbar.disabled() })

  return renderPart('a', props, state, {
    ref: (el: HTMLElement) => {
      elRef = el
      if (el) {
        toolbar.registerItem(el)
      }
    },
    attrs: () => {
      const disabled = state().disabled
      if (isTabStop === undefined) {
        isTabStop = !disabled && toolbar.claimTabStop()
      }
      return {
        tabindex: isTabStop ? 0 : -1,
        'aria-disabled': disabled ? 'true' : undefined,
        'data-disabled': disabled ? '' : undefined,
      }
    },
    handlers: {
      onKeyDown: (event: KeyboardEvent) => {
        if (!elRef) {
          return
        }
        navigateRoving(event, toolbar.getItems(), elRef, {
          orientation: toolbar.orientation(),
          loop: toolbar.loop(),
        })
      },
    },
  })
}

export function ToolbarInput(
  props: ToolbarInputProps & Omit<PartProps<'input', ToolbarInputState>, 'disabled'>,
) {
  const toolbar = useToolbar('Input')
  let isTabStop: boolean | undefined
  const state = (): ToolbarInputState => ({
    disabled: !!props.disabled || toolbar.disabled(),
  })
  const rest = omit(props, 'disabled')
  return renderPart('input', rest, state, {
    ref: (el: HTMLElement) => {
      if (el) {
        toolbar.registerItem(el)
      }
    },
    attrs: () => {
      const disabled = state().disabled
      if (isTabStop === undefined) {
        isTabStop = !disabled && toolbar.claimTabStop()
      }
      return {
        tabindex: disabled ? undefined : isTabStop ? 0 : -1,
        disabled: disabled || undefined,
        'data-disabled': disabled ? '' : undefined,
      }
    },
  })
}

export function ToolbarGroup(
  props: ToolbarGroupProps & Omit<PartProps<'div', ToolbarGroupState>, 'disabled'>,
) {
  const toolbar = useToolbar('Group')
  const isDisabled = () => !!props.disabled || toolbar.disabled()
  const state = (): ToolbarGroupState => ({
    disabled: isDisabled(),
    orientation: toolbar.orientation(),
  })
  const rest = omit(props, 'disabled')
  return (
    <ToolbarContext
      value={{
        ...toolbar,
        disabled: isDisabled,
      }}
    >
      {renderPart('div', rest, state, {
        attrs: () => ({
          role: 'group',
          'data-orientation': toolbar.orientation(),
          'data-disabled': state().disabled ? '' : undefined,
        }),
      })}
    </ToolbarContext>
  )
}

export function ToolbarSeparator(props: PartProps<'div', ToolbarSeparatorState>) {
  const toolbar = useToolbar('Separator')
  const orientation = (): ToolbarOrientation =>
    toolbar.orientation() === 'horizontal' ? 'vertical' : 'horizontal'
  const state = (): ToolbarSeparatorState => ({ orientation: orientation() })

  return renderPart('div', props, state, {
    attrs: () => ({
      role: 'separator',
      'aria-orientation': orientation(),
      'data-orientation': orientation(),
    }),
  })
}
