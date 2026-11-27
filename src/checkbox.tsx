import { createContext, omit, Show, useContext } from 'solid-js'

import { useFieldControl } from './field'
import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type CheckedState = boolean | 'indeterminate'
export type CheckboxCheckedChangeReason = 'press' | 'imperative' | 'reset'
export type CheckboxChangeOptions = ChangeOptions<CheckboxCheckedChangeReason>

export type CheckboxApi = {
  setChecked: (checked: CheckedState, options?: CheckboxChangeOptions) => void
  toggle: (options?: CheckboxChangeOptions) => void
  isChecked: () => boolean
  isIndeterminate: () => boolean
}

export function createCheckboxController() {
  return createController<CheckboxApi>()
}

export type CheckboxController = ReturnType<typeof createCheckboxController>

export type CheckboxOptions = {
  checked?: CheckedState
  defaultChecked?: CheckedState
  onCheckedChange?: (checked: boolean, details: ChangeDetails<CheckboxCheckedChangeReason>) => void
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  name?: string
  value?: string
  form?: string
  parent?: boolean
  controller?: CheckboxController
  debug?: boolean
}

export type CheckboxState = {
  checked: boolean
  indeterminate: boolean
  disabled: boolean
  readOnly: boolean
  required: boolean
}

export type CheckboxIndicatorProps = { keepMounted?: boolean }
export type CheckboxIndicatorState = CheckboxState

export type CheckboxGroupValueChangeReason = 'press' | 'imperative' | 'reset'
export type CheckboxGroupChangeOptions = ChangeOptions<CheckboxGroupValueChangeReason>

export type CheckboxGroupApi<T extends string = string> = {
  setValue: (value: Array<T>, options?: CheckboxGroupChangeOptions) => void
  getValue: () => Array<T>
}

export function createCheckboxGroupController<T extends string = string>() {
  return createController<CheckboxGroupApi<T>>()
}

export type CheckboxGroupController<T extends string = string> = ReturnType<
  typeof createCheckboxGroupController<T>
>

export type CheckboxGroupOptions<T extends string = string> = {
  value?: Array<T>
  defaultValue?: Array<T>
  onValueChange?: (value: Array<T>, details: ChangeDetails<CheckboxGroupValueChangeReason>) => void
  disabled?: boolean
  readOnly?: boolean
  name?: string
  allValues?: Array<T>
  controller?: CheckboxGroupController<T>
  debug?: boolean
}

export type CheckboxGroupState<T extends string = string> = {
  value: Array<T>
  disabled: boolean
  readOnly: boolean
}

type GroupContextValue = {
  isChecked: (value: string) => boolean
  toggleValue: (value: string, event?: Event) => void
  parentState: () => CheckedState
  toggleAll: (event?: Event) => void
  disabled: () => boolean
  readOnly: () => boolean
  name: () => string | undefined
  field: ReturnType<typeof useFieldControl>
}

const CheckboxGroupContext = createContext<GroupContextValue | null>(null)
const CheckboxContext = createContext<() => CheckboxState>(() => ({
  checked: false,
  indeterminate: false,
  disabled: false,
  readOnly: false,
  required: false,
}))

export function Checkbox(
  props: CheckboxOptions & Omit<PartProps<'button', CheckboxState>, 'value' | 'onChange' | 'type'>,
) {
  const group = useContext(CheckboxGroupContext)
  const field = useFieldControl()
  let rootEl: HTMLElement | undefined

  const [ownState, setOwnState] = createControlledSignal<CheckedState>({
    value: () => props.checked,
    defaultValue: () => props.defaultChecked ?? false,
  })

  const rawChecked = (): CheckedState => {
    if (group && props.parent) {
      return group.parentState()
    }
    if (group && props.value !== undefined) {
      return group.isChecked(props.value)
    }
    return ownState()
  }

  const isDisabled = () =>
    !!props.disabled || (group?.disabled() ?? false) || (field?.disabled() ?? false)
  const isReadOnly = () =>
    !!props.readOnly || (group?.readOnly() ?? false) || (field?.readOnly() ?? false)
  const isRequired = () => !!props.required || (field?.required() ?? false)

  const state = (): CheckboxState => {
    const cur = rawChecked()
    return {
      checked: cur === true,
      indeterminate: cur === 'indeterminate',
      disabled: isDisabled(),
      readOnly: isReadOnly(),
      required: isRequired(),
    }
  }

  const applyChecked = (
    next: CheckedState,
    reason: CheckboxCheckedChangeReason,
    event?: Event,
    source?: ChangeOptions['source'],
  ) => {
    if (isDisabled() || isReadOnly()) {
      return
    }
    const prev = rawChecked()
    if (prev === next) {
      return
    }
    const details = createChangeDetails(reason, event, source)
    props.onCheckedChange?.(next === true, details)
    if (details.canceled) {
      return
    }
    setOwnState(next)
    reg.emit({
      key: 'checked',
      previous: prev,
      value: next,
      reason: details.reason,
      source: details.source,
    })
  }

  const api: CheckboxApi = {
    setChecked: (next, opts) =>
      applyChecked(next, opts?.reason ?? 'imperative', opts?.event, opts?.source),
    toggle: (opts) =>
      applyChecked(rawChecked() !== true, opts?.reason ?? 'imperative', opts?.event, opts?.source),
    isChecked: () => rawChecked() === true,
    isIndeterminate: () => rawChecked() === 'indeterminate',
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: 'checkbox',
    getElements: () => [rootEl],
    getState: () => ({ checked: rawChecked(), required: isRequired() }),
    getDisabled: () => isDisabled() || isReadOnly(),
    actions: {
      setChecked: (next) =>
        api.setChecked(next === 'indeterminate' ? 'indeterminate' : Boolean(next)),
      toggle: () => api.toggle(),
    },
  })

  const rest = omit(
    props,
    'checked',
    'defaultChecked',
    'onCheckedChange',
    'disabled',
    'readOnly',
    'required',
    'name',
    'value',
    'form',
    'parent',
    'controller',
    'debug',
  )

  return (
    <CheckboxContext value={state}>
      {renderPart('button', rest, state, {
        ref: (el: HTMLElement) => {
          rootEl = el
        },
        attrs: () => {
          const s = state()
          const ownField = field && field !== group?.field ? field : !group ? field : null
          return {
            type: 'button',
            role: 'checkbox',
            id: props.id ?? ownField?.controlId,
            'aria-checked': s.indeterminate ? 'mixed' : s.checked ? 'true' : 'false',
            'aria-disabled': s.disabled ? 'true' : undefined,
            'aria-readonly': s.readOnly ? 'true' : undefined,
            'aria-required': s.required ? 'true' : undefined,
            'aria-describedby': ownField?.describedBy(),
            disabled: s.disabled || undefined,
            'data-state': s.indeterminate ? 'indeterminate' : s.checked ? 'checked' : 'unchecked',
            'data-checked': s.checked ? '' : undefined,
            'data-indeterminate': s.indeterminate ? '' : undefined,
            'data-unchecked': !s.checked && !s.indeterminate ? '' : undefined,
            'data-disabled': s.disabled ? '' : undefined,
          }
        },
        handlers: {
          onClick: (event: MouseEvent) => {
            if (isDisabled() || isReadOnly()) {
              return
            }
            if (group && props.parent) {
              group.toggleAll(event)
            } else if (group && props.value !== undefined) {
              group.toggleValue(props.value, event)
            } else {
              applyChecked(rawChecked() !== true, 'press', event)
            }
          },
        },
      })}
      <Show when={!props.parent}>
        <input
          data-slot="checkbox-input"
          type="checkbox"
          aria-hidden="true"
          tabindex={-1}
          name={props.name ?? (group ? group.name() : field?.name())}
          value={props.value ?? 'on'}
          form={props.form}
          checked={state().checked}
          disabled={isDisabled()}
          required={isRequired()}
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
      </Show>
    </CheckboxContext>
  )
}

export function CheckboxIndicator(
  props: CheckboxIndicatorProps & Omit<PartProps<'span', CheckboxIndicatorState>, 'keepMounted'>,
) {
  const state = useContext(CheckboxContext)
  const rest = omit(props, 'keepMounted')
  const visible = () => state().checked || state().indeterminate || !!props.keepMounted
  return (
    <Show when={visible()}>
      {renderPart('span', rest, state, {
        attrs: () => {
          const s = state()
          return {
            'data-slot': 'checkbox-indicator',
            'aria-hidden': 'true',
            'data-state': s.indeterminate ? 'indeterminate' : s.checked ? 'checked' : 'unchecked',
            'data-checked': s.checked ? '' : undefined,
            'data-indeterminate': s.indeterminate ? '' : undefined,
          }
        },
      })}
    </Show>
  )
}

export function CheckboxGroup<T extends string = string>(
  props: CheckboxGroupOptions<T> &
    Omit<PartProps<'div', CheckboxGroupState<T>>, 'defaultValue' | 'onChange'>,
) {
  const field = useFieldControl()
  let rootEl: HTMLElement | undefined
  const [value, setValue] = createControlledSignal<Array<T>>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? [],
  })

  const applyValue = (
    next: Array<T>,
    reason: CheckboxGroupValueChangeReason,
    event?: Event,
    source?: ChangeOptions['source'],
  ) => {
    const prev = value()
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

  const toggleValue = (itemValue: string, event?: Event) => {
    const current = value()
    const exists = current.includes(itemValue as T)
    const next = exists ? current.filter((v) => v !== itemValue) : [...current, itemValue as T]
    applyValue(next, 'press', event)
  }

  const api: CheckboxGroupApi<T> = {
    setValue: (next, opts) =>
      applyValue(next, opts?.reason ?? 'imperative', opts?.event, opts?.source),
    getValue: value,
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: 'checkbox-group',
    getElements: () => [rootEl],
    getState: () => ({ value: value() }),
    getDisabled: () => !!props.disabled || !!props.readOnly,
    actions: {
      setValue: (next) => api.setValue(Array.isArray(next) ? (next as Array<T>) : []),
    },
  })

  const state = (): CheckboxGroupState<T> => ({
    value: value(),
    disabled: !!props.disabled,
    readOnly: !!props.readOnly,
  })

  const rest = omit(
    props,
    'value',
    'defaultValue',
    'onValueChange',
    'disabled',
    'readOnly',
    'name',
    'allValues',
    'controller',
    'debug',
  )

  return (
    <CheckboxGroupContext
      value={{
        isChecked: (v) => value().includes(v as T),
        toggleValue,
        parentState: () => {
          const all = props.allValues ?? []
          const cur = value()
          if (all.length === 0 || cur.length === 0) {
            return false
          }
          const count = all.filter((v) => cur.includes(v)).length
          if (count === 0) {
            return false
          }
          return count === all.length ? true : 'indeterminate'
        },
        toggleAll: (event) => {
          const all = props.allValues ?? []
          const cur = value()
          const allChecked = all.length > 0 && all.every((v) => cur.includes(v))
          applyValue(allChecked ? [] : [...all], 'press', event)
        },
        disabled: () => !!props.disabled,
        readOnly: () => !!props.readOnly,
        name: () => props.name,
        field,
      }}
    >
      {renderPart('div', rest, state, {
        ref: (el: HTMLElement) => {
          rootEl = el
        },
        attrs: () => ({
          role: 'group',
          'aria-labelledby': field?.hasLabel() ? field.getLabelId() : undefined,
          'data-disabled': props.disabled ? '' : undefined,
        }),
      })}
    </CheckboxGroupContext>
  )
}
