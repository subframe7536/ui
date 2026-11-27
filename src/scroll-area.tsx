import { createContext, createSignal, omit, Show, useContext } from 'solid-js'

import { createController, useController } from './foundation/controller'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'

export type ScrollAreaType = 'auto' | 'always' | 'scroll' | 'hover'

export type ScrollAreaScrollOptions = {
  top?: number
  left?: number
  behavior?: ScrollBehavior
}

export type ScrollAreaApi = {
  scrollTo: (options: ScrollAreaScrollOptions) => void
  scrollToTop: (behavior?: ScrollBehavior) => void
  scrollToBottom: (behavior?: ScrollBehavior) => void
}

export function createScrollAreaController() {
  return createController<ScrollAreaApi>()
}

export type ScrollAreaController = ReturnType<typeof createScrollAreaController>

export type ScrollAreaOptions = {
  type?: ScrollAreaType
  stickToEnd?: boolean
  controller?: ScrollAreaController
  debug?: boolean
}

export type ScrollAreaState = {
  type: ScrollAreaType
  scrolling: boolean
  atTop: boolean
  atBottom: boolean
  atLeft: boolean
  atRight: boolean
  hasVerticalOverflow: boolean
  hasHorizontalOverflow: boolean
}

export type ScrollAreaPrimitive = ScrollAreaState

export type ScrollAreaScrollbarProps = {
  orientation?: 'vertical' | 'horizontal'
}

export type ScrollAreaScrollbarState = ScrollAreaState & {
  orientation: 'vertical' | 'horizontal'
  visible: boolean
}

export type ScrollAreaThumbState = ScrollAreaScrollbarState
export type ScrollAreaScrollToEndState = ScrollAreaState & { visible: boolean }

type ScrollAreaContextValue = {
  state: () => ScrollAreaState
  api: ScrollAreaApi
  registerViewport: (el: HTMLElement | null) => void
  updateMetrics: () => void
}

const ScrollAreaContext = createContext<ScrollAreaContextValue | null>(null)
const ScrollbarContext = createContext<(() => ScrollAreaScrollbarState) | null>(null)

function useScrollArea(part: string): ScrollAreaContextValue {
  const ctx = useContext(ScrollAreaContext)
  if (!ctx) {
    throw new Error(`<ScrollArea${part}> must be used inside <ScrollArea>.`)
  }
  return ctx
}

export function ScrollArea(
  props: ScrollAreaOptions & Omit<PartProps<'div', ScrollAreaState>, keyof ScrollAreaOptions>,
) {
  let viewportEl: HTMLElement | null = null
  const [scrolling, setScrolling] = createSignal(false)
  const [atTop, setAtTop] = createSignal(true)
  const [atBottom, setAtBottom] = createSignal(true)
  const [atLeft, setAtLeft] = createSignal(true)
  const [atRight, setAtRight] = createSignal(true)
  const [vOverflow, setVOverflow] = createSignal(false)
  const [hOverflow, setHOverflow] = createSignal(false)

  let scrollTimer: ReturnType<typeof setTimeout> | undefined

  const updateMetrics = () => {
    if (!viewportEl) {
      return
    }
    const { scrollTop, scrollLeft, scrollHeight, scrollWidth, clientHeight, clientWidth } =
      viewportEl
    setAtTop(scrollTop <= 1)
    setAtBottom(scrollTop + clientHeight >= scrollHeight - 1)
    setAtLeft(scrollLeft <= 1)
    setAtRight(scrollLeft + clientWidth >= scrollWidth - 1)
    setVOverflow(scrollHeight > clientHeight + 1)
    setHOverflow(scrollWidth > clientWidth + 1)
    setScrolling(true)
    if (scrollTimer) {
      clearTimeout(scrollTimer)
    }
    scrollTimer = setTimeout(() => setScrolling(false), 300)
  }

  const state = (): ScrollAreaState => ({
    type: props.type ?? 'hover',
    scrolling: scrolling(),
    atTop: atTop(),
    atBottom: atBottom(),
    atLeft: atLeft(),
    atRight: atRight(),
    hasVerticalOverflow: vOverflow(),
    hasHorizontalOverflow: hOverflow(),
  })

  const api: ScrollAreaApi = {
    scrollTo: (opts) => viewportEl?.scrollTo?.(opts),
    scrollToTop: (behavior = 'smooth') => viewportEl?.scrollTo?.({ top: 0, behavior }),
    scrollToBottom: (behavior = 'smooth') =>
      viewportEl?.scrollTo?.({ top: viewportEl.scrollHeight, behavior }),
  }

  useController(() => props.controller, api)

  const rest = omit(props, 'type', 'stickToEnd', 'controller', 'debug')

  return (
    <ScrollAreaContext
      value={{
        state,
        api,
        registerViewport: (el) => {
          viewportEl = el
          updateMetrics()
        },
        updateMetrics,
      }}
    >
      {renderPart('div', rest, state, {
        attrs: () => ({
          'data-scrolling': scrolling() ? '' : undefined,
        }),
        style: () => ({ position: 'relative', overflow: 'hidden' }),
      })}
    </ScrollAreaContext>
  )
}

export function ScrollAreaViewport(props: PartProps<'div', ScrollAreaState>) {
  const ctx = useScrollArea('Viewport')
  return renderPart('div', props, ctx.state, {
    ref: (el: HTMLElement | null) => ctx.registerViewport(el),
    attrs: () => ({ 'data-slot': 'scroll-area-viewport' }),
    style: () => ({ overflow: 'auto', 'scrollbar-width': 'none' }),
    handlers: {
      onScroll: () => ctx.updateMetrics(),
    },
  })
}

export function ScrollAreaContent(props: PartProps<'div', ScrollAreaState>) {
  const ctx = useScrollArea('Content')
  return renderPart('div', props, ctx.state, {
    style: () => ({
      '--scroll-area-overflow-y-start': 'initial',
      '--scroll-area-overflow-y-end': 'initial',
      '--scroll-area-overflow-x-start': 'initial',
      '--scroll-area-overflow-x-end': 'initial',
    }),
  })
}

export function ScrollAreaScrollbar(
  props: ScrollAreaScrollbarProps &
    Omit<PartProps<'div', ScrollAreaScrollbarState>, keyof ScrollAreaScrollbarProps>,
) {
  const ctx = useScrollArea('Scrollbar')
  const orientation = () => props.orientation ?? 'vertical'
  const barState = (): ScrollAreaScrollbarState => {
    const s = ctx.state()
    const hasOverflow =
      orientation() === 'vertical' ? s.hasVerticalOverflow : s.hasHorizontalOverflow
    return {
      ...s,
      orientation: orientation(),
      visible: s.type === 'always' || hasOverflow,
    }
  }
  const rest = omit(props, 'orientation')
  return (
    <ScrollbarContext value={barState}>
      <Show when={barState().visible || typeof window === 'undefined'}>
        {renderPart('div', rest, barState, {
          attrs: () => ({
            'data-slot': 'scroll-area-scrollbar',
            'aria-hidden': 'true',
            'data-orientation': orientation(),
            'data-scrolling': barState().scrolling ? '' : undefined,
          }),
          style: () => ({
            display: barState().visible ? undefined : 'none',
          }),
        })}
      </Show>
    </ScrollbarContext>
  )
}

export function ScrollAreaThumb(props: PartProps<'div', ScrollAreaThumbState>) {
  const barState = useContext(ScrollbarContext)
  if (!barState) {
    throw new Error('<ScrollAreaThumb> must be used inside <ScrollAreaScrollbar>.')
  }
  return renderPart('div', props, barState, {
    attrs: () => ({ 'data-orientation': barState().orientation }),
  })
}

export function ScrollAreaCorner(props: PartProps<'div', ScrollAreaState>) {
  const ctx = useScrollArea('Corner')
  return (
    <Show when={ctx.state().hasVerticalOverflow && ctx.state().hasHorizontalOverflow}>
      {renderPart('div', props, ctx.state)}
    </Show>
  )
}

export function ScrollAreaScrollToEnd(
  props: Omit<PartProps<'button', ScrollAreaScrollToEndState>, 'type'>,
) {
  const ctx = useScrollArea('ScrollToEnd')
  const endState = (): ScrollAreaScrollToEndState => ({
    ...ctx.state(),
    visible: !ctx.state().atBottom,
  })
  return (
    <Show when={endState().visible || typeof window === 'undefined'}>
      {renderPart('button', props, endState, {
        attrs: () => ({
          type: 'button',
          'aria-label': 'Scroll to bottom',
        }),
        handlers: {
          onClick: () => ctx.api.scrollToBottom(),
        },
      })}
    </Show>
  )
}
