import { untrack, createContext, createUniqueId, omit, useContext } from 'solid-js'

import { createController, useController } from './foundation/controller'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type TimelineOrientation = 'vertical' | 'horizontal'
export type TimelineStatus = 'complete' | 'current' | 'upcoming'

export type TimelineApi = {
  setActiveIndex: (index: number) => void
  getActiveIndex: () => number
}

export function createTimelineController() {
  return createController<TimelineApi>()
}

export type TimelineController = ReturnType<typeof createTimelineController>

export type TimelineOptions = {
  orientation?: TimelineOrientation
  activeIndex?: number
  defaultActiveIndex?: number
  onActiveIndexChange?: (index: number) => void
  controller?: TimelineController
  debug?: boolean
}

export type TimelineState = {
  orientation: TimelineOrientation
  activeIndex: number
}

export type TimelinePrimitive = TimelineState
export type TimelineItemProps = { index?: number; status?: TimelineStatus }
export type TimelineItemState = {
  index: number
  status: TimelineStatus
  orientation: TimelineOrientation
}
export type TimelineMarkerState = TimelineItemState
export type TimelineConnectorState = TimelineItemState
export type TimelineTitleState = TimelineItemState
export type TimelineDescriptionState = TimelineItemState
export type TimelineTimeState = TimelineItemState

type TimelineContextValue = {
  state: () => TimelineState
  nextIndex: () => number
}

const TimelineContext = createContext<TimelineContextValue | null>(null)
const TimelineItemContext = createContext<(() => TimelineItemState) | null>(null)

function useTimeline(part: string): TimelineContextValue {
  const ctx = useContext(TimelineContext)
  if (!ctx) {
    throw new Error(`<Timeline${part}> must be used inside <Timeline>.`)
  }
  return ctx
}

function useTimelineItem(part: string): () => TimelineItemState {
  const ctx = useContext(TimelineItemContext)
  if (!ctx) {
    throw new Error(`<Timeline${part}> must be used inside <TimelineItem>.`)
  }
  return ctx
}

export function Timeline(
  props: TimelineOptions & Omit<PartProps<'ol', TimelineState>, keyof TimelineOptions>,
) {
  const id = `ui-timeline-${createUniqueId()}`
  const [activeIndex, setRawActiveIndex] = createControlledSignal<number>({
    value: () => props.activeIndex,
    defaultValue: () => props.defaultActiveIndex ?? -1,
  })
  let rootEl: HTMLElement | null = null
  let seq = 0

  const orientation = (): TimelineOrientation => props.orientation ?? 'vertical'
  const state = (): TimelineState => ({
    orientation: orientation(),
    activeIndex: activeIndex(),
  })

  const api: TimelineApi = {
    setActiveIndex: (idx) => {
      props.onActiveIndexChange?.(idx)
      setRawActiveIndex(idx)
    },
    getActiveIndex: () => activeIndex(),
  }

  useController(() => props.controller, api)

  registerComponent({
    component: 'timeline',
    getElements: () => [rootEl],
    getState: () => ({ orientation: orientation(), activeIndex: activeIndex() }),
    actions: {
      setActiveIndex: (idx) => api.setActiveIndex(Number(idx ?? 0)),
    },
  })

  const rest = omit(
    props,
    'orientation',
    'activeIndex',
    'defaultActiveIndex',
    'onActiveIndexChange',
    'controller',
    'debug',
  )

  return (
    <TimelineContext value={{ state, nextIndex: () => seq++ }}>
      {renderPart('ol', rest, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => ({
          id,
          'data-orientation': orientation(),
        }),
      })}
    </TimelineContext>
  )
}

export function TimelineItem(
  props: TimelineItemProps & Omit<PartProps<'li', TimelineItemState>, keyof TimelineItemProps>,
) {
  const ctx = useTimeline('Item')
  const index = untrack(() => props.index) ?? ctx.nextIndex()

  const itemState = (): TimelineItemState => {
    const s = ctx.state()
    const derivedStatus: TimelineStatus =
      props.status ??
      (s.activeIndex < 0
        ? 'complete'
        : index < s.activeIndex
          ? 'complete'
          : index === s.activeIndex
            ? 'current'
            : 'upcoming')
    return {
      index,
      status: derivedStatus,
      orientation: s.orientation,
    }
  }
  const rest = omit(props, 'index', 'status')

  return (
    <TimelineItemContext value={itemState}>
      {renderPart('li', rest, itemState, {
        attrs: () => ({
          'aria-current': itemState().status === 'current' ? 'step' : undefined,
          'data-status': itemState().status,
          'data-orientation': itemState().orientation,
        }),
      })}
    </TimelineItemContext>
  )
}

export function TimelineMarker(props: PartProps<'span', TimelineMarkerState>) {
  const state = useTimelineItem('Marker')
  return renderPart('span', props, state, {
    attrs: () => ({ 'aria-hidden': true, 'data-status': state().status }),
  })
}

export function TimelineConnector(props: PartProps<'span', TimelineConnectorState>) {
  const state = useTimelineItem('Connector')
  return renderPart('span', props, state, {
    attrs: () => ({ 'aria-hidden': true, 'data-status': state().status }),
  })
}

export function TimelineTitle(props: PartProps<'div', TimelineTitleState>) {
  const state = useTimelineItem('Title')
  return renderPart('div', props, state)
}

export function TimelineDescription(props: PartProps<'p', TimelineDescriptionState>) {
  const state = useTimelineItem('Description')
  return renderPart('p', props, state)
}

export function TimelineTime(props: PartProps<'time', TimelineTimeState>) {
  const state = useTimelineItem('Time')
  return renderPart('time', props, state)
}
