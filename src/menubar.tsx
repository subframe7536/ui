import { createContext, omit } from "solid-js"
import { createController, useController } from "./foundation/controller"
import { navigateRoving, type Orientation } from "./foundation/focus"
import { registerComponent } from "./foundation/registry"
import { renderPart, type PartProps } from "./foundation/render"

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

const MenubarContext = createContext<{
  orientation: () => MenubarOrientation
  loop: () => boolean
} | null>(null)

export function Menubar(
  props: MenubarOptions & Omit<PartProps<"div", MenubarState>, keyof MenubarOptions>
) {
  let rootEl: HTMLElement | undefined
  const orientation = (): MenubarOrientation => props.orientation ?? "horizontal"
  const loop = () => props.loop ?? true

  const getTriggers = () =>
    rootEl
      ? Array.from(rootEl.querySelectorAll<HTMLElement>('[aria-haspopup="menu"]'))
      : []

  const api: MenubarApi = {
    focusFirst: () => getTriggers()[0]?.focus(),
    focusLast: () => getTriggers().at(-1)?.focus(),
  }

  useController(() => props.controller, api)

  registerComponent({
    component: "menubar",
    getElements: () => [rootEl],
    getState: () => ({ orientation: orientation() }),
    actions: {
      focusFirst: () => api.focusFirst(),
      focusLast: () => api.focusLast(),
    },
  })

  const state = (): MenubarState => ({ orientation: orientation() })
  const rest = omit(props, "orientation", "loop", "controller", "debug")

  return (
    <MenubarContext value={{ orientation, loop }}>
      {renderPart("div", rest, state, {
        ref: (el: HTMLElement) => {
          rootEl = el
        },
        attrs: () => ({
          role: "menubar",
          "aria-orientation": orientation(),
          "data-orientation": orientation(),
        }),
        handlers: {
          onKeyDown: (event: KeyboardEvent) => {
            const target = event.target as HTMLElement | null
            if (!target) return
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
