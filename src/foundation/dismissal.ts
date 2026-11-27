import { createEffect, onCleanup } from "solid-js"

export type DismissReason = "escape-key" | "outside-press"

type LayerEntry = {
  id: symbol
  getElements: () => Array<HTMLElement | undefined | null>
  onDismiss: (reason: DismissReason, event: KeyboardEvent | MouseEvent) => void
  dismissOnEscape: () => boolean
  dismissOnOutsidePress: () => boolean
}

const layerStack: LayerEntry[] = []

function isTopLayer(id: symbol): boolean {
  return layerStack.at(-1)?.id === id
}

export function useDismissLayer(options: {
  active: () => boolean
  getElements: () => Array<HTMLElement | undefined | null>
  onDismiss: (reason: DismissReason, event: KeyboardEvent | MouseEvent) => void
  dismissOnEscape?: () => boolean
  dismissOnOutsidePress?: () => boolean
}): void {
  createEffect(options.active, (isActive) => {
    if (!isActive || typeof document === "undefined") return
    const id = Symbol("dismiss-layer")
    const entry: LayerEntry = {
      id,
      getElements: options.getElements,
      onDismiss: options.onDismiss,
      dismissOnEscape: options.dismissOnEscape ?? (() => true),
      dismissOnOutsidePress: options.dismissOnOutsidePress ?? (() => true),
    }
    layerStack.push(entry)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !isTopLayer(id) || !entry.dismissOnEscape()) return
      event.stopPropagation()
      entry.onDismiss("escape-key", event)
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!isTopLayer(id) || !entry.dismissOnOutsidePress()) return
      const target = event.target as Node | null
      if (!target) return
      const inside = entry
        .getElements()
        .some((el) => el != null && el.contains(target))
      if (!inside) {
        entry.onDismiss("outside-press", event)
      }
    }

    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("pointerdown", onPointerDown, true)
    onCleanup(() => {
      const idx = layerStack.findIndex((item) => item.id === id)
      if (idx >= 0) layerStack.splice(idx, 1)
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("pointerdown", onPointerDown, true)
    })
  })
}
