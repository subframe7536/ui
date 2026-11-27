import { untrack, createContext, createSignal, createUniqueId, omit, useContext } from 'solid-js'

import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type ResizableSize = number
export type ResizableLayoutChangeReason =
  | 'drag'
  | 'keyboard'
  | 'collapse'
  | 'expand'
  | 'programmatic'
export type ResizableChangeOptions = ChangeOptions<ResizableLayoutChangeReason>
export type ResizableLayoutChangeDetails = ChangeDetails<ResizableLayoutChangeReason>
export type ResizableLayoutCommitDetails = ResizableLayoutChangeDetails

export type ResizableStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export function resizableStorageKey(id: string): string {
  return `ui-resizable:${id}`
}

export type ResizableApi = {
  setLayout: (layout: Array<number>, options?: ResizableChangeOptions) => void
  getLayout: () => Array<number>
  collapse: (index: number) => void
  expand: (index: number) => void
}

export function createResizableController() {
  return createController<ResizableApi>()
}

export type ResizableController = ReturnType<typeof createResizableController>

export type ResizableOptions = {
  layout?: Array<number>
  defaultLayout?: Array<number>
  onLayoutChange?: (layout: Array<number>, details: ResizableLayoutChangeDetails) => void
  onLayoutCommit?: (layout: Array<number>, details: ResizableLayoutCommitDetails) => void
  orientation?: 'horizontal' | 'vertical'
  autoSaveId?: string
  storage?: ResizableStorage
  disabled?: boolean
  controller?: ResizableController
  debug?: boolean
}

export type ResizableState = {
  layout: Array<number>
  orientation: 'horizontal' | 'vertical'
  dragging: boolean
  disabled: boolean
}

export type ResizablePrimitive = ResizableState

export type ResizablePanelProps = {
  index?: number
  defaultSize?: number
  minSize?: number
  maxSize?: number
  collapsible?: boolean
  collapsedSize?: number
}

export type ResizablePanelState = {
  index: number
  size: number
  collapsed: boolean
}

export type ResizableHandleProps = {
  index?: number
  disabled?: boolean
}

export type ResizableHandleState = {
  index: number
  dragging: boolean
  disabled: boolean
}

type ResizableContextValue = {
  state: () => ResizableState
  resizePair: (
    handleIndex: number,
    deltaPercent: number,
    reason: ResizableLayoutChangeReason,
    event?: Event,
  ) => void
  commitLayout: (reason: ResizableLayoutChangeReason, event?: Event) => void
  setDragging: (d: boolean) => void
  registerPanel: (opts: { minSize: number; maxSize: number; collapsedSize: number }) => number
  registerHandle: () => number
  getRootEl: () => HTMLElement | null
}

const ResizableContext = createContext<ResizableContextValue | null>(null)

function useResizable(part: string): ResizableContextValue {
  const ctx = useContext(ResizableContext)
  if (!ctx) {
    throw new Error(`<Resizable${part}> must be used inside <Resizable>.`)
  }
  return ctx
}

export function Resizable(
  props: ResizableOptions & Omit<PartProps<'div', ResizableState>, keyof ResizableOptions>,
) {
  const id = `ui-resizable-${createUniqueId()}`
  const loadSaved = (): Array<number> | undefined => {
    if (!props.autoSaveId) {
      return undefined
    }
    try {
      const store =
        props.storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined)
      const raw = store?.getItem(resizableStorageKey(props.autoSaveId))
      if (!raw) {
        return undefined
      }
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.map(Number) : undefined
    } catch {
      return undefined
    }
  }

  const [layout, setRawLayout] = createControlledSignal<Array<number>>({
    value: () => props.layout,
    defaultValue: () => loadSaved() ?? props.defaultLayout ?? [50, 50],
  })
  const [dragging, setDragging] = createSignal(false)
  let rootEl: HTMLElement | null = null
  let panelSeq = 0
  let handleSeq = 0
  const panelBounds: Array<{ minSize: number; maxSize: number; collapsedSize: number }> = []

  const orientation = () => props.orientation ?? 'horizontal'
  const disabled = () => !!props.disabled

  const state = (): ResizableState => ({
    layout: layout(),
    orientation: orientation(),
    dragging: dragging(),
    disabled: disabled(),
  })

  const saveLayout = (next: Array<number>) => {
    if (!props.autoSaveId) {
      return
    }
    try {
      const store =
        props.storage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined)
      store?.setItem(resizableStorageKey(props.autoSaveId), JSON.stringify(next))
    } catch {
      // ignore storage errors
    }
  }

  const updateLayout = (
    next: Array<number>,
    reason: ResizableLayoutChangeReason,
    event?: Event,
  ) => {
    const details = createChangeDetails(reason, event)
    props.onLayoutChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawLayout(next)
    saveLayout(next)
  }

  const commitLayout = (reason: ResizableLayoutChangeReason, event?: Event) => {
    props.onLayoutCommit?.(layout(), createChangeDetails(reason, event))
  }

  const resizePair = (
    handleIndex: number,
    deltaPercent: number,
    reason: ResizableLayoutChangeReason,
    event?: Event,
  ) => {
    if (disabled()) {
      return
    }
    const cur = [...layout()]
    const left = cur[handleIndex]
    const right = cur[handleIndex + 1]
    if (left === undefined || right === undefined) {
      return
    }
    const leftBounds = panelBounds[handleIndex] ?? { minSize: 5, maxSize: 95, collapsedSize: 0 }
    const rightBounds = panelBounds[handleIndex + 1] ?? {
      minSize: 5,
      maxSize: 95,
      collapsedSize: 0,
    }
    const total = left + right
    let nextLeft = Math.min(leftBounds.maxSize, Math.max(leftBounds.minSize, left + deltaPercent))
    let nextRight = total - nextLeft
    if (nextRight < rightBounds.minSize) {
      nextRight = rightBounds.minSize
      nextLeft = total - nextRight
    } else if (nextRight > rightBounds.maxSize) {
      nextRight = rightBounds.maxSize
      nextLeft = total - nextRight
    }
    cur[handleIndex] = Number(nextLeft.toFixed(2))
    cur[handleIndex + 1] = Number(nextRight.toFixed(2))
    updateLayout(cur, reason, event)
  }

  const api: ResizableApi = {
    setLayout: (next, opts) => updateLayout(next, opts?.reason ?? 'programmatic', opts?.event),
    getLayout: () => layout(),
    collapse: (index) => {
      const cur = [...layout()]
      const target = cur[index]
      if (target === undefined) {
        return
      }
      const collapsedSize = panelBounds[index]?.collapsedSize ?? 0
      const diff = target - collapsedSize
      const neighbor = index + 1 < cur.length ? index + 1 : index - 1
      if (neighbor < 0 || cur[neighbor] === undefined) {
        return
      }
      cur[index] = collapsedSize
      cur[neighbor] = cur[neighbor] + diff
      updateLayout(cur, 'collapse')
    },
    expand: (index) => {
      const cur = [...layout()]
      const min = panelBounds[index]?.minSize ?? 20
      const target = cur[index]
      if (target === undefined || target >= min) {
        return
      }
      const diff = min - target
      const neighbor = index + 1 < cur.length ? index + 1 : index - 1
      if (neighbor < 0 || cur[neighbor] === undefined) {
        return
      }
      cur[index] = min
      cur[neighbor] = Math.max(0, cur[neighbor] - diff)
      updateLayout(cur, 'expand')
    },
  }

  useController(() => props.controller, api)

  registerComponent({
    component: 'resizable',
    getElements: () => [rootEl],
    getState: () => ({ layout: layout(), orientation: orientation(), disabled: disabled() }),
    getDisabled: disabled,
    actions: {
      setLayout: (l) => {
        if (Array.isArray(l)) {
          api.setLayout(l.map(Number))
        }
      },
    },
  })

  const rest = omit(
    props,
    'layout',
    'defaultLayout',
    'onLayoutChange',
    'onLayoutCommit',
    'orientation',
    'autoSaveId',
    'storage',
    'disabled',
    'controller',
    'debug',
  )

  return (
    <ResizableContext
      value={{
        state,
        resizePair,
        commitLayout,
        setDragging,
        registerPanel: (opts) => {
          const idx = panelSeq++
          panelBounds[idx] = opts
          return idx
        },
        registerHandle: () => handleSeq++,
        getRootEl: () => rootEl,
      }}
    >
      {renderPart('div', rest, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => ({
          id,
          'data-orientation': orientation(),
          'data-dragging': dragging() ? '' : undefined,
          'data-disabled': disabled() ? '' : undefined,
        }),
        style: () => ({
          display: 'flex',
          'flex-direction': orientation() === 'vertical' ? 'column' : 'row',
        }),
      })}
    </ResizableContext>
  )
}

export function ResizablePanel(
  props: ResizablePanelProps &
    Omit<PartProps<'div', ResizablePanelState>, keyof ResizablePanelProps>,
) {
  const ctx = useResizable('Panel')
  const index = untrack(
    () =>
      props.index ??
      ctx.registerPanel({
        minSize: props.minSize ?? 5,
        maxSize: props.maxSize ?? 95,
        collapsedSize: props.collapsedSize ?? 0,
      }),
  )

  const panelState = (): ResizablePanelState => {
    const size = ctx.state().layout[index] ?? props.defaultSize ?? 50
    return {
      index,
      size,
      collapsed: size <= (props.collapsedSize ?? 0),
    }
  }

  const rest = omit(
    props,
    'index',
    'defaultSize',
    'minSize',
    'maxSize',
    'collapsible',
    'collapsedSize',
  )

  return renderPart('div', rest, panelState, {
    attrs: () => ({
      'data-panel-index': index,
      'data-collapsed': panelState().collapsed ? '' : undefined,
    }),
    style: () => ({
      flex: `${panelState().size} 1 0px`,
    }),
  })
}

export function ResizableHandle(
  props: ResizableHandleProps &
    Omit<PartProps<'div', ResizableHandleState>, keyof ResizableHandleProps>,
) {
  const ctx = useResizable('Handle')
  const index = untrack(() => props.index) ?? ctx.registerHandle()
  const [localDrag, setLocalDrag] = createSignal(false)

  const handleState = (): ResizableHandleState => ({
    index,
    dragging: localDrag(),
    disabled: ctx.state().disabled || !!props.disabled,
  })

  const rest = omit(props, 'index', 'disabled')

  return renderPart('div', rest, handleState, {
    attrs: () => {
      const s = handleState()
      const root = ctx.state()
      return {
        role: 'separator',
        tabindex: s.disabled ? -1 : 0,
        'aria-orientation': root.orientation === 'horizontal' ? 'vertical' : 'horizontal',
        'aria-valuenow': root.layout[index] ?? 50,
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'data-dragging': s.dragging ? '' : undefined,
        'data-disabled': s.disabled ? '' : undefined,
      }
    },
    handlers: {
      onPointerDown: (e: PointerEvent) => {
        if (handleState().disabled || e.button !== 0) {
          return
        }
        e.preventDefault()
        setLocalDrag(true)
        ctx.setDragging(true)
        let lastX = e.clientX
        let lastY = e.clientY

        const onMove = (ev: PointerEvent) => {
          const root = ctx.getRootEl()
          const rect = root?.getBoundingClientRect()
          const totalPx =
            ctx.state().orientation === 'vertical' ? rect?.height || 100 : rect?.width || 100
          const deltaPx =
            ctx.state().orientation === 'vertical' ? ev.clientY - lastY : ev.clientX - lastX
          lastX = ev.clientX
          lastY = ev.clientY
          ctx.resizePair(index, (deltaPx / totalPx) * 100, 'drag', ev)
        }
        const onUp = (ev: PointerEvent) => {
          setLocalDrag(false)
          ctx.setDragging(false)
          ctx.commitLayout('drag', ev)
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
      },
      onKeyDown: (e: KeyboardEvent) => {
        if (handleState().disabled) {
          return
        }
        const horiz = ctx.state().orientation === 'horizontal'
        const step = e.shiftKey ? 10 : 2
        if ((horiz && e.key === 'ArrowRight') || (!horiz && e.key === 'ArrowDown')) {
          e.preventDefault()
          ctx.resizePair(index, step, 'keyboard', e)
          ctx.commitLayout('keyboard', e)
        } else if ((horiz && e.key === 'ArrowLeft') || (!horiz && e.key === 'ArrowUp')) {
          e.preventDefault()
          ctx.resizePair(index, -step, 'keyboard', e)
          ctx.commitLayout('keyboard', e)
        }
      },
    },
  })
}
