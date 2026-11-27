import { createContext, omit, Show, useContext } from 'solid-js'

import { useFieldControl } from './field'
import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { navigateRoving } from './foundation/focus'
import type { Orientation } from './foundation/focus'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type RadioGroupValueChangeReason = 'item-press' | 'list-navigation' | 'imperative' | 'reset'
export type RadioGroupChangeOptions = ChangeOptions<RadioGroupValueChangeReason>

export type RadioGroupApi<T extends string = string> = {
  setValue: (value: T, options?: RadioGroupChangeOptions) => void
  getValue: () => T | undefined
}

export function createRadioGroupController<T extends string = string>() {
  return createController<RadioGroupApi<T>>()
}

export type RadioGroupController<T extends string = string> = ReturnType<
  typeof createRadioGroupController<T>
>

export type RadioGroupOptions<T extends string = string> = {
  value?: T
  defaultValue?: T
  onValueChange?: (value: T, details: ChangeDetails<RadioGroupValueChangeReason>) => void
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  name?: string
  orientation?: Orientation
  loop?: boolean
  controller?: RadioGroupController<T>
  debug?: boolean
}

export type RadioGroupState<T extends string = string> = {
  value: T | undefined
  disabled: boolean
  readOnly: boolean
  required: boolean
  orientation: Orientation
}

export type RadioProps<T extends string = string> = {
  value: T
  disabled?: boolean
}

export type RadioState = {
  checked: boolean
  disabled: boolean
}

export type RadioIndicatorProps = { keepMounted?: boolean }
export type RadioIndicatorState = RadioState

type RadioGroupContextValue = {
  value: () => string | undefined
  name: () => string | undefined
  disabled: () => boolean
  readOnly: () => boolean
  required: () => boolean
  orientation: () => Orientation
  loop: () => boolean
  select: (value: string, reason: RadioGroupValueChangeReason, event?: Event) => void
  registerItem: (value: string, el: HTMLElement) => void
  getItems: () => Array<{ value: string; el: HTMLElement }>
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)
const RadioItemContext = createContext<() => RadioState>(() => ({
  checked: false,
  disabled: false,
}))

export function RadioGroup<T extends string = string>(
  props: RadioGroupOptions<T> &
    Omit<PartProps<'div', RadioGroupState<T>>, 'defaultValue' | 'onChange'>,
) {
  const field = useFieldControl()
  let rootEl: HTMLElement | undefined
  const itemMap = new Map<string, HTMLElement>()

  const [value, setValue] = createControlledSignal<T | undefined>({
    value: () => props.value,
    defaultValue: () => props.defaultValue,
  })

  const orientation = (): Orientation => props.orientation ?? 'vertical'
  const isDisabled = () => !!props.disabled || (field?.disabled() ?? false)
  const isReadOnly = () => !!props.readOnly || (field?.readOnly() ?? false)
  const isRequired = () => !!props.required || (field?.required() ?? false)

  const applyValue = (
    next: T,
    reason: RadioGroupValueChangeReason,
    event?: Event,
    source?: ChangeOptions['source'],
  ) => {
    if ((isDisabled() || isReadOnly()) && reason !== 'imperative') {
      return
    }
    const prev = value()
    if (prev === next) {
      return
    }
    const details = createChangeDetails(reason, event, source)
    props.onValueChange?.(next, details)
    if (details.canceled) {
      return
    }
    setValue(next)
    reg.emit({
      key: 'value',
      previous: prev,
      value: next,
      reason: details.reason,
      source: details.source,
    })
  }

  const api: RadioGroupApi<T> = {
    setValue: (next, opts) =>
      applyValue(next, opts?.reason ?? 'imperative', opts?.event, opts?.source),
    getValue: value,
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: 'radio-group',
    getElements: () => [rootEl],
    getState: () => ({ value: value(), required: isRequired() }),
    getItems: () =>
      Array.from(itemMap.entries())
        .filter(([, el]) => el.isConnected)
        .map(([val, el]) => ({ value: val, label: el.textContent?.trim() || val })),
    getDisabled: () => isDisabled() || isReadOnly(),
    actions: {
      setValue: (v) => api.setValue(String(v) as T),
    },
  })

  const state = (): RadioGroupState<T> => ({
    value: value(),
    disabled: isDisabled(),
    readOnly: isReadOnly(),
    required: isRequired(),
    orientation: orientation(),
  })

  const rest = omit(
    props,
    'value',
    'defaultValue',
    'onValueChange',
    'disabled',
    'readOnly',
    'required',
    'name',
    'orientation',
    'loop',
    'controller',
    'debug',
  )

  return (
    <RadioGroupContext
      value={{
        value,
        name: () => props.name ?? field?.name(),
        disabled: isDisabled,
        readOnly: isReadOnly,
        required: isRequired,
        orientation,
        loop: () => props.loop ?? true,
        select: (v, reason, event) => applyValue(v as T, reason, event),
        registerItem: (v, el) => itemMap.set(v, el),
        getItems: () =>
          Array.from(itemMap.entries())
            .filter(([, el]) => el.isConnected)
            .map(([v, el]) => ({ value: v, el })),
      }}
    >
      {renderPart('div', rest, state, {
        ref: (el: HTMLElement) => {
          rootEl = el
        },
        attrs: () => ({
          role: 'radiogroup',
          'aria-orientation': orientation(),
          'aria-required': isRequired() ? 'true' : undefined,
          'aria-describedby': field?.describedBy(),
          'data-orientation': orientation(),
          'data-disabled': isDisabled() ? '' : undefined,
        }),
      })}
    </RadioGroupContext>
  )
}

export function Radio<T extends string = string>(
  props: RadioProps<T> & Omit<PartProps<'button', RadioState>, 'value' | 'type'>,
) {
  const group = useContext(RadioGroupContext)
  if (!group) {
    throw new Error('<Radio> must be used inside <RadioGroup>.')
  }
  let elRef: HTMLElement | undefined

  const state = (): RadioState => ({
    checked: group.value() === props.value,
    disabled: !!props.disabled || group.disabled(),
  })

  const rest = omit(props, 'value', 'disabled')

  return (
    <RadioItemContext value={state}>
      {renderPart('button', rest, state, {
        ref: (el: HTMLElement) => {
          elRef = el
          if (el) {
            group.registerItem(props.value, el)
          }
        },
        attrs: () => {
          const s = state()
          return {
            type: 'button',
            role: 'radio',
            'aria-checked': s.checked ? 'true' : 'false',
            tabindex: s.checked || group.value() === undefined ? 0 : -1,
            disabled: s.disabled || undefined,
            'data-state': s.checked ? 'checked' : 'unchecked',
            'data-checked': s.checked ? '' : undefined,
            'data-unchecked': !s.checked ? '' : undefined,
            'data-disabled': s.disabled ? '' : undefined,
          }
        },
        handlers: {
          onClick: (event: MouseEvent) => {
            if (state().disabled) {
              return
            }
            group.select(props.value, 'item-press', event)
          },
          onKeyDown: (event: KeyboardEvent) => {
            if (!elRef) {
              return
            }
            const entries = group.getItems()
            const target = navigateRoving(
              event,
              entries.map((e) => e.el),
              elRef,
              { orientation: group.orientation(), loop: group.loop() },
            )
            if (target) {
              const matched = entries.find((e) => e.el === target)
              if (matched) {
                group.select(matched.value, 'list-navigation', event)
              }
            }
          },
        },
      })}
      <input
        type="radio"
        aria-hidden="true"
        tabindex={-1}
        name={group.name()}
        value={props.value}
        checked={state().checked}
        disabled={state().disabled}
        required={group.required()}
        readonly
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          margin: '-1px',
          padding: '0',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          'white-space': 'nowrap',
          border: '0',
          'pointer-events': 'none',
        }}
      />
    </RadioItemContext>
  )
}

export function RadioIndicator(
  props: RadioIndicatorProps & Omit<PartProps<'span', RadioIndicatorState>, 'keepMounted'>,
) {
  const state = useContext(RadioItemContext)
  const rest = omit(props, 'keepMounted')
  return (
    <Show when={state().checked || !!props.keepMounted}>
      {renderPart('span', rest, state, {
        attrs: () => ({
          'aria-hidden': 'true',
          'data-state': state().checked ? 'checked' : 'unchecked',
          'data-checked': state().checked ? '' : undefined,
        }),
      })}
    </Show>
  )
}
