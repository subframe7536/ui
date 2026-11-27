import {
  Show,
  createContext,
  createSignal,
  createUniqueId,
  omit,
  onSettled,
  useContext,
} from 'solid-js'

import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'

export type ValidityKey =
  | 'valueMissing'
  | 'typeMismatch'
  | 'patternMismatch'
  | 'tooLong'
  | 'tooShort'
  | 'rangeUnderflow'
  | 'rangeOverflow'
  | 'stepMismatch'
  | 'badInput'
  | 'customError'
  | 'valid'

export type FieldOptions = {
  name?: string
  disabled?: boolean
  invalid?: boolean
  required?: boolean
  readOnly?: boolean
  error?: string
  debug?: boolean
}

export type FieldState = {
  disabled: boolean
  invalid: boolean
  required: boolean
  readOnly: boolean
  dirty: boolean
  touched: boolean
}

export type FieldApi = {
  setDirty: (dirty: boolean) => void
  setTouched: (touched: boolean) => void
}

export type FieldDescriptionState = FieldState
export type FieldErrorProps = { match?: boolean | ValidityKey; forceShow?: boolean }
export type FieldErrorState = FieldState & { message: string | undefined }
export type FieldSetOptions = { disabled?: boolean }
export type FieldSetState = { disabled: boolean }

export type FieldControlContextValue = {
  controlId: string
  labelId: string
  descriptionId: string
  errorId: string
  name: () => string | undefined
  disabled: () => boolean
  invalid: () => boolean
  required: () => boolean
  readOnly: () => boolean
  error: () => string | undefined
  state: () => FieldState
  describedBy: () => string | undefined
  setHasDescription: (v: boolean) => void
  registerDescription: (id: string) => () => void
  setHasError: (v: boolean) => void
  setDirty: (v: boolean) => void
  setTouched: (v: boolean) => void
}

const FieldContext = createContext<FieldControlContextValue | null>(null)
const FieldSetContext = createContext<() => boolean>(() => false)

/**
 * Reads the nearest `<Field>` context for form controls.
 */
export function useFieldControl(): FieldControlContextValue | null {
  return useContext(FieldContext)
}

export function Field(
  props: FieldOptions & Omit<PartProps<'div', FieldState>, keyof FieldOptions>,
) {
  const uid = createUniqueId()
  const controlId = `ui-field-${uid}`
  const labelId = `ui-field-label-${uid}`
  const descriptionId = `ui-field-desc-${uid}`
  const errorId = `ui-field-err-${uid}`

  const parentDisabled = useContext(FieldSetContext)
  const [hasDescription, setHasDescription] = createSignal(false)
  const [descriptionIds, setDescriptionIds] = createSignal<Array<string>>([])
  const [hasError, setHasError] = createSignal(false)
  const [dirty, setDirty] = createSignal(false)
  const [touched, setTouched] = createSignal(false)

  const registerDescription = (id: string) => {
    setDescriptionIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    return () => {
      setDescriptionIds((prev) => prev.filter((item) => item !== id))
    }
  }

  const disabled = () => !!props.disabled || parentDisabled()
  const invalid = () => !!props.invalid || !!props.error

  const state = (): FieldState => ({
    disabled: disabled(),
    invalid: invalid(),
    required: !!props.required,
    readOnly: !!props.readOnly,
    dirty: dirty(),
    touched: touched(),
  })

  const describedBy = () => {
    const ids: Array<string> = []
    const descList = descriptionIds()
    if (descList.length > 0) {
      ids.push(...descList)
    } else if (hasDescription()) {
      ids.push(descriptionId)
    }
    if (hasError() && invalid()) {
      ids.push(errorId)
    }
    return ids.length > 0 ? ids.join(' ') : undefined
  }

  const rest = omit(props, 'name', 'disabled', 'invalid', 'required', 'readOnly', 'error', 'debug')

  return (
    <FieldContext
      value={{
        controlId,
        labelId,
        descriptionId,
        errorId,
        name: () => props.name,
        disabled,
        invalid,
        required: () => !!props.required,
        readOnly: () => !!props.readOnly,
        error: () => props.error,
        state,
        describedBy,
        setHasDescription,
        registerDescription,
        setHasError,
        setDirty,
        setTouched,
      }}
    >
      {renderPart('div', rest, state, {
        attrs: () => {
          const s = state()
          return {
            'data-disabled': s.disabled ? '' : undefined,
            'data-invalid': s.invalid ? '' : undefined,
            'data-required': s.required ? '' : undefined,
            'data-readonly': s.readOnly ? '' : undefined,
            'data-dirty': s.dirty ? '' : undefined,
            'data-touched': s.touched ? '' : undefined,
          }
        },
      })}
    </FieldContext>
  )
}

export function FieldLabel(props: PartProps<'label', FieldState>) {
  const ctx = useContext(FieldContext)
  const state = () =>
    ctx?.state() ?? {
      disabled: false,
      invalid: false,
      required: false,
      readOnly: false,
      dirty: false,
      touched: false,
    }
  return renderPart('label', props, state, {
    attrs: () => ({
      id: props.id ?? ctx?.labelId,
      for: (props as Record<string, unknown>).for ?? ctx?.controlId,
      'data-disabled': state().disabled ? '' : undefined,
      'data-invalid': state().invalid ? '' : undefined,
      'data-required': state().required ? '' : undefined,
    }),
  })
}

export function FieldControl(props: PartProps<'input', FieldState>) {
  const ctx = useContext(FieldContext)
  const state = () =>
    ctx?.state() ?? {
      disabled: false,
      invalid: false,
      required: false,
      readOnly: false,
      dirty: false,
      touched: false,
    }
  return renderPart('input', props, state, {
    attrs: () => ({
      id: props.id ?? ctx?.controlId,
      name: (props as Record<string, unknown>).name ?? ctx?.name(),
      disabled: state().disabled || undefined,
      required: state().required || undefined,
      readonly: state().readOnly || undefined,
      'aria-invalid': state().invalid ? 'true' : undefined,
      'aria-describedby': ctx?.describedBy(),
      'data-invalid': state().invalid ? '' : undefined,
    }),
    handlers: {
      onInput: () => ctx?.setDirty(true),
      onBlur: () => ctx?.setTouched(true),
    },
  })
}

export function FieldDescription(props: PartProps<'p', FieldDescriptionState>) {
  const ctx = useContext(FieldContext)
  const fallbackId = `ui-field-desc-${createUniqueId()}`
  const resolvedId = () => props.id ?? fallbackId
  onSettled(() => {
    const id = resolvedId()
    return ctx?.registerDescription(id)
  })
  const state = () =>
    ctx?.state() ?? {
      disabled: false,
      invalid: false,
      required: false,
      readOnly: false,
      dirty: false,
      touched: false,
    }
  return renderPart('p', props, state, {
    attrs: () => ({
      id: resolvedId(),
    }),
  })
}

export function FieldError(
  props: FieldErrorProps & Omit<PartProps<'p', FieldErrorState>, keyof FieldErrorProps>,
) {
  const ctx = useContext(FieldContext)
  onSettled(() => {
    ctx?.setHasError(true)
    return () => ctx?.setHasError(false)
  })
  const rest = omit(props, 'match', 'forceShow')
  const visible = () => !!props.forceShow || (ctx ? ctx.invalid() : true)
  const state = (): FieldErrorState => ({
    ...(ctx?.state() ?? {
      disabled: false,
      invalid: true,
      required: false,
      readOnly: false,
      dirty: false,
      touched: false,
    }),
    message: ctx?.error(),
  })

  return (
    <Show when={visible()}>
      {renderPart('p', rest, state, {
        attrs: () => ({
          id: props.id ?? ctx?.errorId,
          role: 'alert',
          'data-invalid': '',
        }),
      })}
    </Show>
  )
}

export function FieldSet(
  props: FieldSetOptions & Omit<PartProps<'fieldset', FieldSetState>, keyof FieldSetOptions>,
) {
  const parentDisabled = useContext(FieldSetContext)
  const disabled = () => !!props.disabled || parentDisabled()
  const rest = omit(props, 'disabled')
  return (
    <FieldSetContext value={disabled}>
      {renderPart('fieldset', rest, () => ({ disabled: disabled() }), {
        attrs: () => ({
          disabled: disabled() || undefined,
          'data-disabled': disabled() ? '' : undefined,
        }),
      })}
    </FieldSetContext>
  )
}

export function FieldLegend(props: PartProps<'legend', FieldSetState>) {
  const disabled = useContext(FieldSetContext)
  return renderPart('legend', props, () => ({ disabled: disabled() }), {
    attrs: () => ({
      'data-disabled': disabled() ? '' : undefined,
    }),
  })
}

export function FieldGroup(props: PartProps<'div'>) {
  return renderPart('div', props, () => ({}), {
    attrs: () => ({ role: 'group' }),
  })
}
