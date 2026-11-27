import {
  arrow as arrowMiddleware,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
  type Placement,
} from "@floating-ui/dom"
import { createEffect, createSignal, onCleanup } from "solid-js"

export type Side = "top" | "right" | "bottom" | "left"
export type Align = "start" | "center" | "end"

export type PopupContainer = HTMLElement | null | undefined

export type PortalProps = {
  container?: PopupContainer
}

export type PositionProps = {
  side?: Side
  align?: Align
  sideOffset?: number
  alignOffset?: number
  collisionPadding?: number
  arrowPadding?: number
  anchor?: HTMLElement | null
}

function toPlacement(side: Side, align: Align): Placement {
  return align === "center" ? side : (`${side}-${align}` as Placement)
}

function parsePlacement(placement: Placement): { side: Side; align: Align } {
  const [side, align] = placement.split("-") as [Side, Align | undefined]
  return { side, align: align ?? "center" }
}

export function usePopupPosition(options: {
  open: () => boolean
  reference: () => HTMLElement | undefined
  floating: () => HTMLElement | undefined
  arrow?: () => HTMLElement | undefined
  side?: () => Side | undefined
  align?: () => Align | undefined
  sideOffset?: () => number | undefined
  alignOffset?: () => number | undefined
  collisionPadding?: () => number | undefined
  arrowPadding?: () => number | undefined
}) {
  const [side, setSide] = createSignal<Side>(options.side?.() ?? "bottom")
  const [align, setAlign] = createSignal<Align>(options.align?.() ?? "center")
  const [style, setStyle] = createSignal<Record<string, string>>({
    position: "fixed",
    left: "0px",
    top: "0px",
  })
  const [arrowStyle, setArrowStyle] = createSignal<Record<string, string>>({})

  createEffect(
    () =>
      [
        options.open(),
        options.reference(),
        options.floating(),
        options.arrow?.(),
        options.side?.() ?? "bottom",
        options.align?.() ?? "center",
        options.sideOffset?.() ?? 4,
        options.alignOffset?.() ?? 0,
        options.collisionPadding?.() ?? 8,
        options.arrowPadding?.() ?? 4,
      ] as const,
    ([
      isOpen,
      refEl,
      floatEl,
      arrowEl,
      prefSide,
      prefAlign,
      sideOffset,
      alignOffset,
      collisionPadding,
      arrowPadding,
    ]) => {
      if (!isOpen || !refEl || !floatEl) return

      const update = () => {
        const middleware = [
          offset({ mainAxis: sideOffset, crossAxis: alignOffset }),
          flip({ padding: collisionPadding }),
          shift({ padding: collisionPadding }),
          size({
            padding: collisionPadding,
            apply({ availableWidth, availableHeight, rects }) {
              floatEl.style.setProperty("--available-width", `${Math.max(0, availableWidth)}px`)
              floatEl.style.setProperty("--available-height", `${Math.max(0, availableHeight)}px`)
              floatEl.style.setProperty("--anchor-width", `${rects.reference.width}px`)
              floatEl.style.setProperty("--anchor-height", `${rects.reference.height}px`)
            },
          }),
        ]
        if (arrowEl) {
          middleware.push(arrowMiddleware({ element: arrowEl, padding: arrowPadding }))
        }

        computePosition(refEl, floatEl, {
          strategy: "fixed",
          placement: toPlacement(prefSide, prefAlign),
          middleware,
        }).then(({ x, y, placement, middlewareData }) => {
          const parsed = parsePlacement(placement)
          setSide(parsed.side)
          setAlign(parsed.align)
          setStyle({
            position: "fixed",
            left: `${Math.round(x)}px`,
            top: `${Math.round(y)}px`,
          })
          if (middlewareData.arrow) {
            const { x: ax, y: ay } = middlewareData.arrow
            const nextArrow: Record<string, string> = { position: "absolute" }
            if (ax != null) nextArrow.left = `${Math.round(ax)}px`
            if (ay != null) nextArrow.top = `${Math.round(ay)}px`
            setArrowStyle(nextArrow)
          }
        })
      }

      const stop = autoUpdate(refEl, floatEl, update)
      onCleanup(stop)
    }
  )

  return {
    side,
    align,
    style,
    arrowStyle,
  }
}
