import type { JSX } from '@solidjs/web'
import { createContext, createSignal, createUniqueId, For, omit, useContext } from 'solid-js'

import { useFieldControl } from './field'
import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type RatingValueChangeReason = 'click' | 'keyboard' | 'clear' | 'programmatic'

export type RatingChangeOptions = ChangeOptions<RatingValueChangeReason>

export type RatingApi = {
  setValue: (value: number, options?: RatingChangeOptions) => void
  clear: () => void
  getValue: () => number
}

export function createRatingController() {
  return createController<RatingApi>()
}

export type RatingController = ReturnType<typeof createRatingController>

export type RatingOptions = {
  value?: number
  defaultValue?: number
  onValueChange?: (value: number, details: ChangeDetails<RatingValueChangeReason>) => void
  max?: number
  step?: 0.5 | 1
  deselectable?: boolean
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  invalid?: boolean
  name?: string
  form?: string
  loop?: boolean
  controller?: RatingController
  debug?: boolean
}

export type RatingState = {
  value: number
  hoverValue: number | null
  displayValue: number
  max: number
  step: 0.5 | 1
  disabled: boolean
  readOnly: boolean
  invalid: boolean
}

export type RatingItemProps = {
  index?: number
}

export type RatingItemState = {
  index: number
  value: number
  fill: 'empty' | 'half' | 'full'
  checked: boolean
  highlighted: boolean
  disabled: boolean
}

type RatingContextValue = {
  id: string
  state: () => RatingState
  api: RatingApi
  setHoverValue: (v: number | null) => void
  selectValue: (v: number, reason: RatingValueChangeReason, event?: Event) => void
  deselectable: () => boolean
  loop: () => boolean
  name: () => string | undefined
  field: ReturnType<typeof useFieldControl>
}

const RatingContext = createContext<RatingContextValue | null>(null)
const RatingItemIndexContext = createContext<number | null>(null)

function useRating(part: string): RatingContextValue {
  const ctx = useContext(RatingContext)
  if (!ctx) {
    throw new Error(`<Rating${part}> must be used inside <Rating>.`)
  }
  return ctx
}

export function Rating(
  props: RatingOptions &
    Omit<
      PartProps<'div', RatingState>,
      keyof RatingOptions | 'onChange' | 'onSelect' | 'children'
    > & {
      children?: JSX.Element
    },
) {
  const field = useFieldControl()
  const id = field?.controlId ?? `ui-rating-${createUniqueId()}`
  const max = () => Math.max(1, Math.floor(props.max ?? 5))
  const step = (): 0.5 | 1 => (props.step === 0.5 ? 0.5 : 1)

  const [value, setRawValue] = createControlledSignal<number>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? 0,
  })
  const [hoverValue, setHoverValue] = createSignal<number | null>(null)
  let rootEl: HTMLElement | null = null

  const disabled = () => !!props.disabled || !!field?.disabled()
  const readOnly = () => !!props.readOnly || !!field?.readOnly()
  const invalid = () => !!props.invalid || !!field?.invalid()

  const state = (): RatingState => {
    const val = value()
    const hv = hoverValue()
    return {
      value: val,
      hoverValue: hv,
      displayValue: hv ?? val,
      max: max(),
      step: step(),
      disabled: disabled(),
      readOnly: readOnly(),
      invalid: invalid(),
    }
  }

  const emitRef: {
    fn?: (change: {
      key: string
      previous: unknown
      value: unknown
      reason: string
      source: ChangeDetails['source']
    }) => void
  } = {}

  const selectValue = (next: number, reason: RatingValueChangeReason, event?: Event) => {
    if (disabled() || readOnly()) {
      return
    }
    const prev = value()
    const clamped = Math.min(max(), Math.max(0, next))
    const finalVal = props.deselectable && clamped === prev && reason === 'click' ? 0 : clamped
    const details = createChangeDetails(reason, event)
    props.onValueChange?.(finalVal, details)
    if (details.canceled) {
      return
    }
    setRawValue(finalVal)
    field?.setDirty(true)
    emitRef.fn?.({
      key: 'value',
      previous: prev,
      value: finalVal,
      reason,
      source: details.source,
    })
  }

  const api: RatingApi = {
    setValue: (next, options) =>
      selectValue(next, options?.reason ?? 'programmatic', options?.event),
    clear: () => selectValue(0, 'clear'),
    getValue: () => value(),
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: 'rating',
    getElements: () => [rootEl],
    getState: () => ({ value: value(), max: max(), disabled: disabled() }),
    getDisabled: disabled,
    actions: {
      setValue: (v) => api.setValue(Number(v ?? 0)),
      clear: () => api.clear(),
    },
  })
  emitRef.fn = reg.emit

  const indices = () => Array.from({ length: max() }, (_, i) => i + 1)

  const rest = omit(
    props,
    'value',
    'defaultValue',
    'onValueChange',
    'max',
    'step',
    'deselectable',
    'disabled',
    'readOnly',
    'required',
    'invalid',
    'name',
    'form',
    'loop',
    'controller',
    'debug',
    'children',
  )

  const combinedProps: PartProps<'div', RatingState> = {
    ...rest,
    get children() {
      return (
        <For each={indices()}>
          {(starIndex) => (
            <RatingItemIndexContext value={starIndex}>{props.children}</RatingItemIndexContext>
          )}
        </For>
      )
    },
  }

  return (
    <RatingContext
      value={{
        id,
        state,
        api,
        setHoverValue,
        selectValue,
        deselectable: () => !!props.deselectable,
        loop: () => props.loop ?? false,
        name: () => props.name ?? field?.name(),
        field,
      }}
    >
      {renderPart('div', combinedProps, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => {
          const s = state()
          return {
            id,
            role: 'radiogroup',
            'aria-labelledby': field?.labelId,
            'aria-describedby': field?.describedBy(),
            'aria-disabled': s.disabled ? 'true' : undefined,
            'aria-readonly': s.readOnly ? 'true' : undefined,
            'aria-invalid': s.invalid ? 'true' : undefined,
            'data-disabled': s.disabled ? '' : undefined,
            'data-readonly': s.readOnly ? '' : undefined,
            'data-invalid': s.invalid ? '' : undefined,
          }
        },
        handlers: {
          onPointerLeave: () => setHoverValue(null),
          onKeyDown: (e: KeyboardEvent) => {
            const s = state()
            if (s.disabled || s.readOnly) {
              return
            }
            if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
              e.preventDefault()
              const next = s.value + s.step
              selectValue(next > s.max ? (props.loop ? s.step : s.max) : next, 'keyboard', e)
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
              e.preventDefault()
              const next = s.value - s.step
              selectValue(next < 0 ? (props.loop ? s.max : 0) : next, 'keyboard', e)
            } else if (e.key === 'Home') {
              e.preventDefault()
              selectValue(props.deselectable ? 0 : s.step, 'keyboard', e)
            } else if (e.key === 'End') {
              e.preventDefault()
              selectValue(s.max, 'keyboard', e)
            }
          },
        },
      })}
    </RatingContext>
  )
}

export function RatingItem(
  props: RatingItemProps & Omit<PartProps<'span', RatingItemState>, keyof RatingItemProps>,
) {
  const ctx = useRating('Item')
  const ctxIndex = useContext(RatingItemIndexContext)
  const index = () => props.index ?? ctxIndex ?? 1

  const itemState = (): RatingItemState => {
    const s = ctx.state()
    const idx = index()
    const display = s.displayValue
    const fill: 'empty' | 'half' | 'full' =
      display >= idx ? 'full' : display >= idx - 0.5 && s.step === 0.5 ? 'half' : 'empty'
    return {
      index: idx,
      value: idx,
      fill,
      checked: s.value === idx || (s.step === 0.5 && s.value === idx - 0.5),
      highlighted: fill !== 'empty',
      disabled: s.disabled,
    }
  }

  const rest = omit(props, 'index')

  const pickFromPointer = (e: MouseEvent, el: HTMLElement): number => {
    const idx = index()
    if (ctx.state().step === 0.5) {
      const rect = el.getBoundingClientRect()
      if (rect.width > 0 && e.clientX - rect.left < rect.width / 2) {
        return idx - 0.5
      }
    }
    return idx
  }

  return renderPart('span', rest, itemState, {
    attrs: () => {
      const s = itemState()
      const root = ctx.state()
      const isFocusable = !root.disabled && (s.checked || (root.value === 0 && s.index === 1))
      return {
        role: 'radio',
        tabindex: isFocusable ? 0 : -1,
        'aria-checked': s.checked ? 'true' : 'false',
        'aria-label': `${s.index} of ${root.max}`,
        'aria-disabled': s.disabled ? 'true' : undefined,
        'data-index': s.index,
        'data-fill': s.fill,
        'data-checked': s.checked ? '' : undefined,
        'data-highlighted': s.highlighted ? '' : undefined,
        'data-disabled': s.disabled ? '' : undefined,
      }
    },
    handlers: {
      onPointerMove: (e: PointerEvent & { currentTarget: HTMLSpanElement }) => {
        const root = ctx.state()
        if (root.disabled || root.readOnly) {
          return
        }
        ctx.setHoverValue(pickFromPointer(e, e.currentTarget))
      },
      onClick: (e: MouseEvent & { currentTarget: HTMLSpanElement }) => {
        const root = ctx.state()
        if (root.disabled || root.readOnly) {
          return
        }
        ctx.selectValue(pickFromPointer(e, e.currentTarget), 'click', e)
      },
    },
  })
}
