import {
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  omit,
  untrack,
  useContext,
} from 'solid-js'

import { useFieldControl } from './field'
import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type SegmentedControlOrientation = 'horizontal' | 'vertical'
export type SegmentedControlDirection = 'ltr' | 'rtl'
export type SegmentedControlValueChangeReason = 'click' | 'keyboard' | 'programmatic'

export type SegmentedControlChangeOptions = ChangeOptions<SegmentedControlValueChangeReason>

export type SegmentedControlApi<T extends string = string> = {
  setValue: (value: T, options?: SegmentedControlChangeOptions) => void
  getValue: () => T | undefined
}

export function createSegmentedControlController<T extends string = string>() {
  return createController<SegmentedControlApi<T>>()
}

export type SegmentedControlController<T extends string = string> = SegmentedControlApi<T>

export type SegmentedControlOptions<T extends string = string> = {
  value?: T
  defaultValue?: T
  onValueChange?: (value: T, details: ChangeDetails<SegmentedControlValueChangeReason>) => void
  orientation?: SegmentedControlOrientation
  dir?: SegmentedControlDirection
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  name?: string
  form?: string
  loop?: boolean
  controller?: SegmentedControlController<T>
  debug?: boolean
}

export type SegmentedControlState = {
  value: string | undefined
  orientation: SegmentedControlOrientation
  disabled: boolean
  readOnly: boolean
}

export type SegmentedControlItemProps<T extends string = string> = {
  value: T
  disabled?: boolean
}

export type SegmentedControlItemState = {
  value: string
  checked: boolean
  disabled: boolean
}

export type SegmentedControlIndicatorProps = object

export type SegmentedControlIndicatorState = {
  ready: boolean
  x: number
  y: number
  width: number
  height: number
}

type SegmentedControlContextValue = {
  id: string
  state: () => SegmentedControlState
  select: (val: string, reason: SegmentedControlValueChangeReason, event?: Event) => void
  registerItem: (val: string, el: HTMLElement | null) => void
  moveFocus: (current: string, delta: 1 | -1) => void
  indicatorRect: () => SegmentedControlIndicatorState
}

const SegmentedControlContext = createContext<SegmentedControlContextValue | null>(null)

function useSegmentedControl(part: string): SegmentedControlContextValue {
  const ctx = useContext(SegmentedControlContext)
  if (!ctx) {
    throw new Error(`<SegmentedControl${part}> must be used inside <SegmentedControl>.`)
  }
  return ctx
}

export function SegmentedControl<T extends string = string>(
  props: SegmentedControlOptions<T> &
    Omit<
      PartProps<'div', SegmentedControlState>,
      keyof SegmentedControlOptions<T> | 'onChange' | 'onSelect'
    >,
) {
  const field = useFieldControl()
  const id = field?.controlId ?? `ui-segmented-${createUniqueId()}`

  const [value, setRawValue] = createControlledSignal<T | undefined>({
    value: () => props.value,
    defaultValue: () => props.defaultValue,
  })

  const itemEls = new Map<string, HTMLElement>()
  const [indicatorRect, setIndicatorRect] = createSignal<SegmentedControlIndicatorState>({
    ready: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  })
  let rootEl: HTMLElement | null = null

  const disabled = () => !!props.disabled || !!field?.disabled()
  const readOnly = () => !!props.readOnly || !!field?.readOnly()
  const orientation = (): SegmentedControlOrientation => props.orientation ?? 'horizontal'

  const state = (): SegmentedControlState => ({
    value: value(),
    orientation: orientation(),
    disabled: disabled(),
    readOnly: readOnly(),
  })

  const measureIndicator = (val: T | undefined = untrack(value)) => {
    const el = val ? itemEls.get(val) : undefined
    if (!el) {
      setIndicatorRect({ ready: false, x: 0, y: 0, width: 0, height: 0 })
      return
    }
    setIndicatorRect({
      ready: true,
      x: el.offsetLeft,
      y: el.offsetTop,
      width: el.offsetWidth,
      height: el.offsetHeight,
    })
  }

  createEffect(
    () => value(),
    (val) => measureIndicator(val),
  )

  const emitRef: {
    fn?: (change: {
      key: string
      previous: unknown
      value: unknown
      reason: string
      source: ChangeDetails['source']
    }) => void
  } = {}

  const select = (next: string, reason: SegmentedControlValueChangeReason, event?: Event) => {
    if (disabled() || readOnly()) {
      return
    }
    const prev = value()
    const details = createChangeDetails(reason, event)
    props.onValueChange?.(next as T, details)
    if (details.canceled) {
      return
    }
    setRawValue(next as T)
    field?.setDirty(true)
    emitRef.fn?.({
      key: 'value',
      previous: prev,
      value: next,
      reason,
      source: details.source,
    })
  }

  const api: SegmentedControlApi<T> = {
    setValue: (next, options) => select(next, options?.reason ?? 'programmatic', options?.event),
    getValue: () => value(),
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: 'segmented-control',
    getElements: () => [rootEl],
    getState: () => ({ value: value(), disabled: disabled() }),
    getDisabled: disabled,
    actions: {
      setValue: (v) => api.setValue(String(v) as T),
    },
  })
  emitRef.fn = reg.emit

  const moveFocus = (current: string, delta: 1 | -1) => {
    const entries = [...itemEls.entries()].filter(
      ([, el]) => !el.hasAttribute('data-disabled') && !(el as HTMLButtonElement).disabled,
    )
    if (entries.length === 0) {
      return
    }
    const idx = entries.findIndex(([v]) => v === current)
    const loop = props.loop ?? true
    let nextIdx = idx + delta
    if (nextIdx < 0) {
      nextIdx = loop ? entries.length - 1 : 0
    }
    if (nextIdx >= entries.length) {
      nextIdx = loop ? 0 : entries.length - 1
    }
    const target = entries[nextIdx]
    if (!target) {
      return
    }
    target[1].focus()
    select(target[0], 'keyboard')
  }

  const rest = omit(
    props,
    'value',
    'defaultValue',
    'onValueChange',
    'orientation',
    'dir',
    'disabled',
    'readOnly',
    'required',
    'name',
    'form',
    'loop',
    'controller',
    'debug',
  )

  return (
    <SegmentedControlContext
      value={{
        id,
        state,
        select,
        registerItem: (val, el) => {
          if (el) {
            itemEls.set(val, el)
          } else {
            itemEls.delete(val)
          }
          if (val === value()) {
            measureIndicator()
          }
        },
        moveFocus,
        indicatorRect,
      }}
    >
      {renderPart('div', rest, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => {
          const s = state()
          return {
            id,
            role: 'radiogroup',
            dir: props.dir,
            'aria-orientation': s.orientation,
            'aria-labelledby': field?.labelId,
            'aria-describedby': field?.describedBy(),
            'aria-disabled': s.disabled ? 'true' : undefined,
            'data-orientation': s.orientation,
            'data-disabled': s.disabled ? '' : undefined,
            'data-readonly': s.readOnly ? '' : undefined,
          }
        },
      })}
    </SegmentedControlContext>
  )
}

export function SegmentedControlItem<T extends string = string>(
  props: SegmentedControlItemProps<T> &
    Omit<PartProps<'button', SegmentedControlItemState>, keyof SegmentedControlItemProps<T>>,
) {
  const ctx = useSegmentedControl('Item')
  const itemState = (): SegmentedControlItemState => {
    const s = ctx.state()
    return {
      value: props.value,
      checked: s.value === props.value,
      disabled: s.disabled || !!props.disabled,
    }
  }
  const rest = omit(props, 'value', 'disabled')

  return renderPart('button', rest, itemState, {
    ref: (el) => ctx.registerItem(props.value, el),
    attrs: () => {
      const s = itemState()
      const root = ctx.state()
      return {
        type: 'button',
        role: 'radio',
        tabindex: s.checked || !root.value ? 0 : -1,
        disabled: s.disabled,
        'aria-checked': s.checked ? 'true' : 'false',
        'data-checked': s.checked ? '' : undefined,
        'data-unchecked': !s.checked ? '' : undefined,
        'data-disabled': s.disabled ? '' : undefined,
      }
    },
    handlers: {
      onClick: (e: MouseEvent) => {
        if (itemState().disabled) {
          return
        }
        ctx.select(props.value, 'click', e)
      },
      onKeyDown: (e: KeyboardEvent) => {
        if (itemState().disabled) {
          return
        }
        const horiz = ctx.state().orientation === 'horizontal'
        if ((horiz && e.key === 'ArrowRight') || (!horiz && e.key === 'ArrowDown')) {
          e.preventDefault()
          ctx.moveFocus(props.value, 1)
        } else if ((horiz && e.key === 'ArrowLeft') || (!horiz && e.key === 'ArrowUp')) {
          e.preventDefault()
          ctx.moveFocus(props.value, -1)
        }
      },
    },
  })
}

export function SegmentedControlIndicator(
  props: SegmentedControlIndicatorProps & PartProps<'span', SegmentedControlIndicatorState>,
) {
  const ctx = useSegmentedControl('Indicator')
  return renderPart('span', props, ctx.indicatorRect, {
    attrs: () => ({
      'aria-hidden': true,
      'data-ready': ctx.indicatorRect().ready ? '' : undefined,
    }),
    style: () => {
      const r = ctx.indicatorRect()
      return r.ready
        ? {
            transform: `translate(${r.x}px, ${r.y}px)`,
            width: `${r.width}px`,
            height: `${r.height}px`,
            'pointer-events': 'none',
          }
        : { display: 'none' }
    },
  })
}
