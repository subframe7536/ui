import {
  arrow as arrowMiddleware,
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
} from '@floating-ui/dom'
import type { Placement } from '@floating-ui/dom'
import { createEffect, createSignal } from 'solid-js'

export type Side = 'top' | 'right' | 'bottom' | 'left'
export type Align = 'start' | 'center' | 'end'

export type PopupContainer = HTMLElement | null | undefined

export type PortalProps = {
  /** Element to render the popup inside. Defaults to `document.body`. */
  container?: PopupContainer
}

export type PositionProps = {
  /** Preferred side relative to the anchor. Defaults to `"bottom"`. */
  side?: Side
  /** Preferred alignment along the side. Defaults to `"center"`. */
  align?: Align
  /** Distance in pixels between anchor and popup. Defaults to `4`. */
  sideOffset?: number
  /** Offset in pixels along the alignment axis. Defaults to `0`. */
  alignOffset?: number
  /** Padding from viewport edges when flipping/shifting. Defaults to `8`. */
  collisionPadding?: number
  /** Padding from popup edges for the arrow. Defaults to `4`. */
  arrowPadding?: number
  /** Custom anchor element instead of the trigger. */
  anchor?: HTMLElement | null
}

function toPlacement(side: Side, align: Align): Placement {
  return align === 'center' ? side : (`${side}-${align}` as Placement)
}

function parsePlacement(placement: Placement): { side: Side; align: Align } {
  const [side, align] = placement.split('-') as [Side, Align | undefined]
  return { side, align: align ?? 'center' }
}

/**
 * Native Solid 2 positioning hook backed by `@floating-ui/dom`.
 */
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
  const [side, setSide] = createSignal<Side>(options.side?.() ?? 'bottom')
  const [align, setAlign] = createSignal<Align>(options.align?.() ?? 'center')
  const [style, setStyle] = createSignal<Record<string, string>>({
    position: 'fixed',
    left: '0px',
    top: '0px',
  })
  const [arrowStyle, setArrowStyle] = createSignal<Record<string, string>>({})

  createEffect(
    () =>
      [
        options.open(),
        options.reference(),
        options.floating(),
        options.arrow?.(),
        options.side?.() ?? 'bottom',
        options.align?.() ?? 'center',
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
      if (!isOpen || !refEl || !floatEl) {
        return
      }

      const update = () => {
        const middleware = [
          offset({ mainAxis: sideOffset, crossAxis: alignOffset }),
          flip({ padding: collisionPadding }),
          shift({ padding: collisionPadding }),
          size({
            padding: collisionPadding,
            apply({ availableWidth, availableHeight, rects }) {
              floatEl.style.setProperty('--available-width', `${Math.max(0, availableWidth)}px`)
              floatEl.style.setProperty('--available-height', `${Math.max(0, availableHeight)}px`)
              floatEl.style.setProperty('--anchor-width', `${rects.reference.width}px`)
              floatEl.style.setProperty('--anchor-height', `${rects.reference.height}px`)
            },
          }),
        ]
        if (arrowEl) {
          middleware.push(arrowMiddleware({ element: arrowEl, padding: arrowPadding }))
        }

        void computePosition(refEl, floatEl, {
          strategy: 'fixed',
          placement: toPlacement(prefSide, prefAlign),
          middleware,
        }).then(({ x, y, placement, middlewareData }) => {
          const parsed = parsePlacement(placement)
          setSide(parsed.side)
          setAlign(parsed.align)
          setStyle({
            position: 'fixed',
            left: `${Math.round(x)}px`,
            top: `${Math.round(y)}px`,
          })
          if (middlewareData.arrow) {
            const { x: ax, y: ay } = middlewareData.arrow
            const nextArrow: Record<string, string> = { position: 'absolute' }
            if (ax !== null && ax !== undefined) {
              nextArrow.left = `${Math.round(ax)}px`
            }
            if (ay !== null && ay !== undefined) {
              nextArrow.top = `${Math.round(ay)}px`
            }
            setArrowStyle(nextArrow)
          }
        })
      }

      return autoUpdate(refEl, floatEl, update)
    },
  )

  return {
    side,
    align,
    style,
    arrowStyle,
  }
}
