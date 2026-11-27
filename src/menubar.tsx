import { createContext, omit, useContext } from 'solid-js'

import { createController, useController } from './foundation/controller'
import { navigateRoving } from './foundation/focus'
import type { Orientation } from './foundation/focus'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'

export type MenubarOrientation = Orientation
export type MenubarMember = { id: string; element: HTMLElement }

export type MenubarApi = {
  focusFirst: () => void
  focusLast: () => void
}

export function createMenubarController() {
  return createController<MenubarApi>()
}

export type MenubarController = ReturnType<typeof createMenubarController>

export type MenubarOptions = {
  orientation?: MenubarOrientation
  loop?: boolean
  controller?: MenubarController
  debug?: boolean
}

export type MenubarState = {
  orientation: MenubarOrientation
}

type MenubarContextValue = {
  orientation: () => MenubarOrientation
  loop: () => boolean
  claimTabStop: (disabled: boolean) => boolean
}

const MenubarContext = createContext<MenubarContextValue | null>(null)

export function useOptionalMenubar(): MenubarContextValue | null {
  return useContext(MenubarContext)
}

export function Menubar(
  props: MenubarOptions & Omit<PartProps<'div', MenubarState>, keyof MenubarOptions>,
) {
  let rootEl: HTMLElement | undefined
  let claimedInitialStop = false
  const claimTabStop = (disabled: boolean) => {
    if (disabled || claimedInitialStop) {
      return false
    }
    claimedInitialStop = true
    return true
  }
  const orientation = (): MenubarOrientation => props.orientation ?? 'horizontal'
  const loop = () => props.loop ?? true

  const getTriggers = () =>
    rootEl ? Array.from(rootEl.querySelectorAll<HTMLElement>('[aria-haspopup="menu"]')) : []

  const api: MenubarApi = {
    focusFirst: () => getTriggers()[0]?.focus(),
    focusLast: () => getTriggers().at(-1)?.focus(),
  }

  useController(() => props.controller, api)

  registerComponent({
    component: 'menubar',
    getElements: () => [rootEl],
    getState: () => ({ orientation: orientation() }),
    actions: {
      focusFirst: () => api.focusFirst(),
      focusLast: () => api.focusLast(),
    },
  })

  const state = (): MenubarState => ({ orientation: orientation() })
  const rest = omit(props, 'orientation', 'loop', 'controller', 'debug')

  return (
    <MenubarContext value={{ orientation, loop, claimTabStop }}>
      {renderPart('div', rest, state, {
        ref: (el: HTMLElement) => {
          rootEl = el
        },
        attrs: () => ({
          role: 'menubar',
          'aria-orientation': orientation(),
          'data-orientation': orientation(),
        }),
        handlers: {
          onKeyDown: (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null
            if (!target) {
              return
            }
            const triggers = getTriggers()
            if (triggers.includes(target)) {
              navigateRoving(event, triggers, target, {
                orientation: orientation(),
                loop: loop(),
              })
            }
          },
        },
      })}
    </MenubarContext>
  )
}
