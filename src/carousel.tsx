import {
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  omit,
  onCleanup,
  useContext,
} from "solid-js"
import { createController, useController } from "./foundation/controller"
import {
  createChangeDetails,
  type ChangeDetails,
  type ChangeOptions,
} from "./foundation/details"
import { registerComponent } from "./foundation/registry"
import { renderPart, type PartProps } from "./foundation/render"
import { createControlledSignal } from "./foundation/state"

export type CarouselOrientation = "horizontal" | "vertical"
export type CarouselAlign = "start" | "center" | "end"
export type CarouselSlidesPerPage = number | "auto"
export type CarouselPageChangeReason =
  | "next"
  | "previous"
  | "indicator"
  | "autoplay"
  | "keyboard"
  | "programmatic"
export type CarouselPlayingChangeReason = "toggle" | "hover" | "focus" | "programmatic"
export type CarouselPageOptions = ChangeOptions<CarouselPageChangeReason>
export type CarouselPlayingOptions = ChangeOptions<CarouselPlayingChangeReason>

export type CarouselApi = {
  goTo: (page: number, options?: CarouselPageOptions) => void
  next: () => void
  previous: () => void
  play: () => void
  pause: () => void
  togglePlaying: () => void
  getPage: () => number
  isPlaying: () => boolean
}

export function createCarouselController() {
  return createController<CarouselApi>()
}

export type CarouselController = ReturnType<typeof createCarouselController>

export type CarouselOptions = {
  page?: number
  defaultPage?: number
  onPageChange?: (page: number, details: ChangeDetails<CarouselPageChangeReason>) => void
  playing?: boolean
  defaultPlaying?: boolean
  onPlayingChange?: (
    playing: boolean,
    details: ChangeDetails<CarouselPlayingChangeReason>
  ) => void
  slideCount?: number
  slidesPerPage?: CarouselSlidesPerPage
  orientation?: CarouselOrientation
  align?: CarouselAlign
  loop?: boolean
  autoplayInterval?: number
  controller?: CarouselController
  debug?: boolean
}

export type CarouselState = {
  page: number
  pageCount: number
  orientation: CarouselOrientation
  playing: boolean
  canPrevious: boolean
  canNext: boolean
}

export type CarouselPrimitive = CarouselState
export type CarouselViewportState = CarouselState
export type CarouselContentState = CarouselState
export type CarouselItemState = { index: number; active: boolean }
export type CarouselControlProps = { disabled?: boolean }
export type CarouselStepState = CarouselState & { disabled: boolean }
export type CarouselPreviousState = CarouselStepState
export type CarouselNextState = CarouselStepState
export type CarouselPlayToggleState = CarouselState
export type CarouselIndicatorGroupState = CarouselState
export type CarouselIndicatorProps = { index: number; disabled?: boolean }
export type CarouselIndicatorState = { index: number; current: boolean; disabled: boolean }

type CarouselContextValue = {
  id: string
  state: () => CarouselState
  goTo: (page: number, reason: CarouselPageChangeReason, event?: Event) => void
  setPlaying: (playing: boolean, reason: CarouselPlayingChangeReason, event?: Event) => void
  registerSlide: () => { index: number; cleanup: () => void }
}

const CarouselContext = createContext<CarouselContextValue | null>(null)

function useCarousel(part: string): CarouselContextValue {
  const ctx = useContext(CarouselContext)
  if (!ctx) throw new Error(`<Carousel${part}> must be used inside <Carousel>.`)
  return ctx
}

export function Carousel(
  props: CarouselOptions & Omit<PartProps<"div", CarouselState>, keyof CarouselOptions>
) {
  const id = `ui-carousel-${createUniqueId()}`
  const [page, setRawPage] = createControlledSignal<number>({
    value: () => props.page,
    defaultValue: () => props.defaultPage ?? 0,
  })
  const [playing, setRawPlaying] = createControlledSignal<boolean>({
    value: () => props.playing,
    defaultValue: () => !!props.defaultPlaying,
  })
  const [registeredCount, setRegisteredCount] = createSignal(0)
  let rootEl: HTMLElement | null = null
  let slideSeq = 0

  const pageCount = () => Math.max(1, props.slideCount ?? registeredCount())
  const orientation = (): CarouselOrientation => props.orientation ?? "horizontal"
  const loop = () => !!props.loop

  const currentPage = () => Math.min(pageCount() - 1, Math.max(0, page()))

  const state = (): CarouselState => {
    const p = currentPage()
    const total = pageCount()
    return {
      page: p,
      pageCount: total,
      orientation: orientation(),
      playing: playing(),
      canPrevious: loop() || p > 0,
      canNext: loop() || p < total - 1,
    }
  }

  const goTo = (next: number, reason: CarouselPageChangeReason, event?: Event) => {
    const total = pageCount()
    let target = next
    if (loop()) {
      target = ((next % total) + total) % total
    } else {
      target = Math.min(total - 1, Math.max(0, next))
    }
    if (target === currentPage()) return
    const details = createChangeDetails(reason, event)
    props.onPageChange?.(target, details)
    if (details.canceled) return
    setRawPage(target)
  }

  const setPlaying = (next: boolean, reason: CarouselPlayingChangeReason, event?: Event) => {
    if (playing() === next) return
    const details = createChangeDetails(reason, event)
    props.onPlayingChange?.(next, details)
    if (details.canceled) return
    setRawPlaying(next)
  }

  createEffect(
    () => [playing(), props.autoplayInterval ?? 4000] as const,
    ([isPlaying, interval]) => {
      if (!isPlaying) return
      const timer = setInterval(() => goTo(currentPage() + 1, "autoplay"), interval)
      onCleanup(() => clearInterval(timer))
    }
  )

  const api: CarouselApi = {
    goTo: (p, opts) => goTo(p, opts?.reason ?? "programmatic", opts?.event),
    next: () => goTo(currentPage() + 1, "next"),
    previous: () => goTo(currentPage() - 1, "previous"),
    play: () => setPlaying(true, "programmatic"),
    pause: () => setPlaying(false, "programmatic"),
    togglePlaying: () => setPlaying(!playing(), "toggle"),
    getPage: currentPage,
    isPlaying: playing,
  }

  useController(() => props.controller, api)

  registerComponent({
    component: "carousel",
    getElements: () => [rootEl],
    getState: () => ({ page: currentPage(), pageCount: pageCount(), playing: playing() }),
    actions: {
      next: () => api.next(),
      previous: () => api.previous(),
      goTo: (p) => api.goTo(Number(p ?? 0)),
    },
  })

  const registerSlide = () => {
    const idx = slideSeq++
    setRegisteredCount((c) => c + 1)
    return {
      index: idx,
      cleanup: () => setRegisteredCount((c) => Math.max(0, c - 1)),
    }
  }

  const rest = omit(
    props,
    "page",
    "defaultPage",
    "onPageChange",
    "playing",
    "defaultPlaying",
    "onPlayingChange",
    "slideCount",
    "slidesPerPage",
    "orientation",
    "align",
    "loop",
    "autoplayInterval",
    "controller",
    "debug"
  )

  return (
    <CarouselContext value={{ id, state, goTo, setPlaying, registerSlide }}>
      {renderPart("div", rest, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => ({
          id,
          role: "region",
          "aria-roledescription": "carousel",
          "data-orientation": orientation(),
          "data-playing": playing() ? "" : undefined,
        }),
        handlers: {
          onKeyDown: (e: KeyboardEvent) => {
            const horiz = orientation() === "horizontal"
            if ((horiz && e.key === "ArrowRight") || (!horiz && e.key === "ArrowDown")) {
              e.preventDefault()
              goTo(currentPage() + 1, "keyboard", e)
            } else if ((horiz && e.key === "ArrowLeft") || (!horiz && e.key === "ArrowUp")) {
              e.preventDefault()
              goTo(currentPage() - 1, "keyboard", e)
            }
          },
        },
      })}
    </CarouselContext>
  )
}

export function CarouselViewport(props: PartProps<"div", CarouselViewportState>) {
  const ctx = useCarousel("Viewport")
  return renderPart("div", props, ctx.state, {
    style: () => ({ overflow: "hidden" }),
  })
}

export function CarouselContent(props: PartProps<"div", CarouselContentState>) {
  const ctx = useCarousel("Content")
  return renderPart("div", props, ctx.state, {
    attrs: () => ({ "data-orientation": ctx.state().orientation }),
    style: () => ({
      display: "flex",
      "flex-direction": ctx.state().orientation === "vertical" ? "column" : "row",
      transform:
        ctx.state().orientation === "vertical"
          ? `translateY(-${ctx.state().page * 100}%)`
          : `translateX(-${ctx.state().page * 100}%)`,
    }),
  })
}

export function CarouselItem(props: PartProps<"div", CarouselItemState>) {
  const ctx = useCarousel("Item")
  const reg = ctx.registerSlide()
  onCleanup(() => reg.cleanup())
  const itemState = (): CarouselItemState => ({
    index: reg.index,
    active: ctx.state().page === reg.index,
  })
  return renderPart("div", props, itemState, {
    attrs: () => ({
      role: "group",
      "aria-roledescription": "slide",
      "data-active": itemState().active ? "" : undefined,
      "data-index": reg.index,
    }),
  })
}

export function CarouselPrevious(
  props: CarouselControlProps &
    Omit<PartProps<"button", CarouselPreviousState>, keyof CarouselControlProps | "type">
) {
  const ctx = useCarousel("Previous")
  const stepState = (): CarouselPreviousState => ({
    ...ctx.state(),
    disabled: !!props.disabled || !ctx.state().canPrevious,
  })
  const rest = omit(props, "disabled")
  return renderPart("button", rest, stepState, {
    attrs: () => ({
      type: "button",
      disabled: stepState().disabled,
      "aria-label": "Previous slide",
    }),
    handlers: {
      onClick: (e: MouseEvent) => {
        if (!stepState().disabled) ctx.goTo(ctx.state().page - 1, "previous", e)
      },
    },
  })
}

export function CarouselNext(
  props: CarouselControlProps &
    Omit<PartProps<"button", CarouselNextState>, keyof CarouselControlProps | "type">
) {
  const ctx = useCarousel("Next")
  const stepState = (): CarouselNextState => ({
    ...ctx.state(),
    disabled: !!props.disabled || !ctx.state().canNext,
  })
  const rest = omit(props, "disabled")
  return renderPart("button", rest, stepState, {
    attrs: () => ({
      type: "button",
      disabled: stepState().disabled,
      "aria-label": "Next slide",
    }),
    handlers: {
      onClick: (e: MouseEvent) => {
        if (!stepState().disabled) ctx.goTo(ctx.state().page + 1, "next", e)
      },
    },
  })
}

export function CarouselPlayToggle(
  props: Omit<PartProps<"button", CarouselPlayToggleState>, "type">
) {
  const ctx = useCarousel("PlayToggle")
  return renderPart("button", props, ctx.state, {
    attrs: () => ({
      type: "button",
      "aria-pressed": ctx.state().playing ? "true" : "false",
      "aria-label": ctx.state().playing ? "Pause autoplay" : "Start autoplay",
    }),
    handlers: {
      onClick: (e: MouseEvent) => ctx.setPlaying(!ctx.state().playing, "toggle", e),
    },
  })
}

export function CarouselIndicatorGroup(props: PartProps<"div", CarouselIndicatorGroupState>) {
  const ctx = useCarousel("IndicatorGroup")
  return renderPart("div", props, ctx.state, {
    attrs: () => ({ role: "tablist" }),
  })
}

export function CarouselIndicator(
  props: CarouselIndicatorProps &
    Omit<PartProps<"button", CarouselIndicatorState>, keyof CarouselIndicatorProps | "type">
) {
  const ctx = useCarousel("Indicator")
  const indState = (): CarouselIndicatorState => ({
    index: props.index,
    current: ctx.state().page === props.index,
    disabled: !!props.disabled,
  })
  const rest = omit(props, "index", "disabled")
  return renderPart("button", rest, indState, {
    attrs: () => ({
      type: "button",
      role: "tab",
      disabled: indState().disabled,
      "aria-selected": indState().current ? "true" : "false",
      "aria-label": `Slide ${props.index + 1}`,
      "data-current": indState().current ? "" : undefined,
    }),
    handlers: {
      onClick: (e: MouseEvent) => {
        if (!indState().disabled) ctx.goTo(props.index, "indicator", e)
      },
    },
  })
}
