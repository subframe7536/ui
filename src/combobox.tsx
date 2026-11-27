import type { JSX } from '@solidjs/web'
import {
  For,
  Show,
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  merge,
  omit,
  useContext,
  untrack,
  onSettled,
} from 'solid-js'

import { useFieldControl } from './field'
import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { useDismissLayer } from './foundation/dismissal'
import { usePopupPosition } from './foundation/popup'
import type { PortalProps, PositionProps, Side } from './foundation/popup'
import { registerComponent } from './foundation/registry'
import { renderPart, SafePortal } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'
import { defaultListFilter } from './listbox'
import type {
  ListAnnouncement,
  ListData,
  ListFilter,
  ListGroup,
  ListHighlightDetails,
  ListItem,
  ListSeparator,
  MatchSegment,
} from './listbox'

export type {
  ListAnnouncement,
  ListData,
  ListFilter,
  ListGroup,
  ListHighlightDetails,
  ListItem,
  ListSeparator,
  MatchSegment,
}

export type ComboboxValueData<T extends string = string> = T | Array<T> | null
export type ComboboxOpenChangeReason =
  | 'input-focus'
  | 'input-change'
  | 'trigger-press'
  | 'item-press'
  | 'escape-key'
  | 'outside-press'
  | 'programmatic'
export type ComboboxDismissReason = 'escape-key' | 'outside-press'
export type ComboboxValueChangeReason =
  | 'item-press'
  | 'create'
  | 'chip-remove'
  | 'clear'
  | 'select-all'
  | 'programmatic'
export type ComboboxQueryChangeReason = 'input' | 'item-press' | 'clear' | 'programmatic'
export type ComboboxChangeOptions = ChangeOptions<ComboboxValueChangeReason>

export type ComboboxApi<T extends string = string> = {
  open: () => void
  close: () => void
  toggle: () => void
  setValue: (value: ComboboxValueData<T>, options?: ComboboxChangeOptions) => void
  select: (value: T) => void
  remove: (value: T) => void
  clear: () => void
  setQuery: (query: string) => void
  focus: () => void
  getValue: () => ComboboxValueData<T>
  getQuery: () => string
  isOpen: () => boolean
}

export function createComboboxController<T extends string = string>() {
  return createController<ComboboxApi<T>>()
}

export type ComboboxController<T extends string = string> = ComboboxApi<T>

export type ComboboxOptions<T extends string = string> = {
  value?: ComboboxValueData<T>
  defaultValue?: ComboboxValueData<T>
  onValueChange?: (
    value: ComboboxValueData<T>,
    details: ChangeDetails<ComboboxValueChangeReason>,
  ) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails<ComboboxOpenChangeReason>) => void
  onOpenChangeComplete?: (open: boolean) => void
  query?: string
  defaultQuery?: string
  onQueryChange?: (query: string, details: ChangeDetails<ComboboxQueryChangeReason>) => void
  onCreate?: (query: string) => void
  multiple?: boolean
  creatable?: boolean
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  invalid?: boolean
  placeholder?: string
  name?: string
  filter?: ListFilter
  items?: Array<T | ListData<T>[number]>
  itemToLabel?: (value: T) => string
  controller?: ComboboxController<T>
  debug?: boolean
}

export type ComboboxState<T extends string = string> = {
  value: ComboboxValueData<T>
  open: boolean
  query: string
  highlightedValue: string | null
  multiple: boolean
  empty: boolean
  disabled: boolean
  readOnly: boolean
  invalid: boolean
}

export type ComboboxPrimitive = ComboboxState
export type ComboboxProps<T extends string = string> = ComboboxOptions<T> & {
  children?: JSX.Element
}

export type ComboboxInputState = ComboboxState
export type ComboboxTriggerState = ComboboxState
export type ComboboxValueProps = { placeholder?: string }
export type ComboboxValueState = ComboboxState & { text: string; hasValue: boolean }
export type ComboboxClearProps = { disabled?: boolean }
export type ComboboxClearState = ComboboxState
export type ComboboxContentProps = PositionProps & PortalProps & { keepMounted?: boolean }
export type ComboboxContentState = ComboboxState & { side: Side }
export type ComboboxArrowState = { side: Side }
export type ComboboxItemProps<T extends string = string> = {
  value: T
  label?: string
  keywords?: Array<string>
  disabled?: boolean
}
export type ComboboxItemState = {
  value: string
  label: string
  selected: boolean
  highlighted: boolean
  disabled: boolean
  visible: boolean
}
export type ComboboxItemTextState = ComboboxItemState
export type ComboboxItemIconProps = object
export type ComboboxItemIconState = ComboboxItemState
export type ComboboxItemIndicatorProps = { keepMounted?: boolean }
export type ComboboxItemIndicatorState = ComboboxItemState
export type ComboboxEmptyState = ComboboxState
export type ComboboxStatusState = ComboboxState & { count: number }
export type ComboboxSelectAllState = ComboboxState & { allSelected: boolean; someSelected: boolean }
export type ComboboxCreateProps = { disabled?: boolean }
export type ComboboxCreateState = ComboboxState & { query: string; canCreate: boolean }
export type ComboboxChipProps = { value: string; label?: string }
export type ComboboxChipState = { value: string; label: string; disabled: boolean }
export type ComboboxChipsOverflowState = { count: number; values: Array<string> }

type RegisteredComboboxOption = {
  value: string
  label: string
  keywords?: Array<string>
  disabled: boolean
}

type ComboboxContextValue = {
  id: string
  listId: string
  labelId: string
  state: () => ComboboxState
  api: ComboboxApi
  setOpen: (next: boolean, reason: ComboboxOpenChangeReason, event?: Event) => void
  setQuery: (next: string, reason: ComboboxQueryChangeReason, event?: Event) => void
  selectItem: (val: string, reason: ComboboxValueChangeReason, event?: Event) => void
  removeItem: (val: string, event?: Event) => void
  selectAll: (event?: Event) => void
  createFromQuery: (event?: Event) => void
  isSelected: (val: string) => boolean
  isItemVisible: (label: string, keywords?: Array<string>) => boolean
  setHighlighted: (val: string | null) => void
  moveHighlight: (delta: 1 | -1) => void
  registerOption: (opt: RegisteredComboboxOption) => () => void
  getOptions: () => Array<RegisteredComboboxOption>
  getLabelFor: (val: string) => string
  placeholder: () => string | undefined
  items: () => ListData | undefined
  creatable: () => boolean
  anchorEl: () => HTMLElement | null
  setInputEl: (el: HTMLInputElement | null) => void
  setContentEl: (el: HTMLElement | null) => void
  contentEl: () => HTMLElement | null
  arrowEl: () => HTMLElement | null
  setArrowEl: (el: HTMLElement | null) => void
  field: ReturnType<typeof useFieldControl>
  registerExplicitContent: () => () => void
}
const AutoComboboxContentContext = createContext(false)

const ComboboxContext = createContext<ComboboxContextValue | null>(null)
const ComboboxItemContext = createContext<(() => ComboboxItemState) | null>(null)
const ComboboxChipContext = createContext<(() => ComboboxChipState) | null>(null)
const ComboboxGroupLabelIdContext = createContext<string | undefined>(undefined)

function useCombobox(part: string): ComboboxContextValue {
  const ctx = useContext(ComboboxContext)
  if (!ctx) {
    throw new Error(`<Combobox${part}> must be used inside <Combobox>.`)
  }
  return ctx
}

export function Combobox<T extends string = string>(props: ComboboxProps<T>) {
  const field = useFieldControl()
  const uid = createUniqueId()
  const id = field?.controlId ?? `ui-combobox-${uid}`
  const listId = `ui-combobox-list-${uid}`
  const labelId = field?.labelId ?? `ui-combobox-label-${uid}`

  const isMultiple = () => !!props.multiple
  const [value, setRawValue] = createControlledSignal<ComboboxValueData<T>>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? (isMultiple() ? ([] as Array<T>) : null),
  })
  const [open, setRawOpen] = createControlledSignal<boolean>({
    value: () => props.open,
    defaultValue: () => !!props.defaultOpen,
  })
  const labelMap = new Map<string, string>()
  const seedLabels = () => {
    const raw = props.items
    if (!raw) {
      return
    }
    for (const entry of raw) {
      if (typeof entry === 'string') {
        labelMap.set(entry, entry)
      } else if ('items' in entry) {
        for (const sub of entry.items) {
          if (typeof sub === 'string') {
            labelMap.set(sub, sub)
          } else if ('value' in sub) {
            labelMap.set(sub.value, sub.label ?? sub.value)
          }
        }
      } else if ('value' in entry) {
        labelMap.set(entry.value, entry.label ?? entry.value)
      }
    }
  }
  untrack(seedLabels)
  const resolveLabel = (val: string): string =>
    props.itemToLabel?.(val as T) ?? labelMap.get(val) ?? val

  const [query, setRawQuery] = createControlledSignal<string>({
    value: () => props.query,
    defaultValue: () => {
      if (props.defaultQuery !== undefined) {
        return props.defaultQuery
      }
      const cur = props.value ?? props.defaultValue
      if (!isMultiple() && typeof cur === 'string') {
        return resolveLabel(cur)
      }
      return ''
    },
  })
  const [highlighted, setHighlighted] = createSignal<string | null>(null)
  const [inputEl, setInputEl] = createSignal<HTMLInputElement | null>(null)
  const [contentEl, setContentEl] = createSignal<HTMLElement | null>(null)
  const [explicitContentCount, setExplicitContentCount] = createSignal(0)
  let ssrExplicitContent = false
  const [arrowEl, setArrowEl] = createSignal<HTMLElement | null>(null)

  const optionList: Array<RegisteredComboboxOption> = []

  const disabled = () => !!props.disabled || !!field?.disabled()
  const readOnly = () => !!props.readOnly || !!field?.readOnly()
  const invalid = () => !!props.invalid || !!field?.invalid()
  const filterFn = () => props.filter ?? defaultListFilter

  const isSelected = (val: string): boolean => {
    const cur = value()
    if (Array.isArray(cur)) {
      return cur.includes(val as T)
    }
    return cur === val
  }

  const isEmpty = () => {
    const cur = value()
    return cur === null || (Array.isArray(cur) && cur.length === 0)
  }

  const state = (): ComboboxState<T> => ({
    value: value(),
    open: open(),
    query: query(),
    highlightedValue: highlighted(),
    multiple: isMultiple(),
    empty: isEmpty(),
    disabled: disabled(),
    readOnly: readOnly(),
    invalid: invalid(),
  })

  const emitRef: {
    fn?: (change: {
      key: string
      previous: unknown
      value: unknown
      reason: string
      source: ChangeDetails['source']
    }) => void
  } = {}

  const setOpen = (next: boolean, reason: ComboboxOpenChangeReason, event?: Event) => {
    if (next && disabled()) {
      return
    }
    const prev = open()
    if (prev === next) {
      return
    }
    const details = createChangeDetails(reason, event)
    props.onOpenChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawOpen(next)
    emitRef.fn?.({ key: 'open', previous: prev, value: next, reason, source: details.source })
  }

  const setQuery = (next: string, reason: ComboboxQueryChangeReason, event?: Event) => {
    const details = createChangeDetails(reason, event)
    props.onQueryChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawQuery(next)
  }

  const commitValue = (
    next: ComboboxValueData<T>,
    reason: ComboboxValueChangeReason,
    event?: Event,
  ) => {
    const prev = value()
    const details = createChangeDetails(reason, event)
    props.onValueChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawValue(next)
    field?.setDirty(true)
    emitRef.fn?.({ key: 'value', previous: prev, value: next, reason, source: details.source })
  }

  const selectItem = (val: string, reason: ComboboxValueChangeReason, event?: Event) => {
    if (disabled() || readOnly()) {
      return
    }
    const cur = value()
    if (isMultiple()) {
      const arr = Array.isArray(cur) ? cur : []
      const next = arr.includes(val as T) ? arr.filter((v) => v !== val) : [...arr, val as T]
      commitValue(next, reason, event)
      setQuery('', 'item-press', event)
    } else {
      commitValue(val as T, reason, event)
      setQuery(getLabelFor(val), 'item-press', event)
      setOpen(false, 'item-press', event)
    }
  }

  const removeItem = (val: string, event?: Event) => {
    if (disabled() || readOnly()) {
      return
    }
    const cur = value()
    if (Array.isArray(cur)) {
      commitValue(
        cur.filter((v) => v !== val),
        'chip-remove',
        event,
      )
    } else if (cur === val) {
      commitValue(null, 'chip-remove', event)
    }
  }

  const isItemVisible = (label: string, keywords?: Array<string>) => {
    const q = query()
    if (!q) {
      return true
    }
    return filterFn()(label, q, keywords)
  }

  const selectAll = (event?: Event) => {
    if (!isMultiple() || disabled() || readOnly()) {
      return
    }
    const enabledVals = optionList
      .filter((o) => !o.disabled && isItemVisible(o.label, o.keywords))
      .map((o) => o.value as T)
    const cur = value()
    const arr = Array.isArray(cur) ? cur : []
    const allSelected = enabledVals.length > 0 && enabledVals.every((v) => arr.includes(v))
    commitValue(allSelected ? [] : enabledVals, 'select-all', event)
  }

  const createFromQuery = (event?: Event) => {
    const q = query().trim()
    if (!q || disabled() || readOnly()) {
      return
    }
    props.onCreate?.(q)
    selectItem(q, 'create', event)
  }

  const moveHighlight = (delta: 1 | -1) => {
    const visible = optionList.filter((o) => !o.disabled && isItemVisible(o.label, o.keywords))
    if (visible.length === 0) {
      return
    }
    const idx = visible.findIndex((o) => o.value === highlighted())
    let nextIdx = idx === -1 ? (delta === 1 ? 0 : visible.length - 1) : idx + delta
    if (nextIdx < 0) {
      nextIdx = visible.length - 1
    }
    if (nextIdx >= visible.length) {
      nextIdx = 0
    }
    setHighlighted(visible[nextIdx]?.value ?? null)
  }

  const api: ComboboxApi<T> = {
    open: () => setOpen(true, 'programmatic'),
    close: () => setOpen(false, 'programmatic'),
    toggle: () => setOpen(!open(), 'programmatic'),
    setValue: (next, opts) => commitValue(next, opts?.reason ?? 'programmatic', opts?.event),
    select: (val) => selectItem(val, 'programmatic'),
    remove: (val) => removeItem(val),
    clear: () => {
      commitValue(isMultiple() ? [] : null, 'clear')
      setQuery('', 'clear')
    },
    setQuery: (q) => setQuery(q, 'programmatic'),
    focus: () => inputEl()?.focus(),
    getValue: () => value(),
    getQuery: () => query(),
    isOpen: () => open(),
  }

  useController(() => props.controller, api)
  let prevOpenForComplete = untrack(open)
  createEffect(open, (isOpen) => {
    if (isOpen === prevOpenForComplete) {
      return
    }
    prevOpenForComplete = isOpen
    queueMicrotask(() => props.onOpenChangeComplete?.(isOpen))
  })

  const reg = registerComponent({
    component: 'combobox',
    getElements: () => [inputEl(), contentEl()],
    getState: () => ({ value: value(), query: query(), open: open(), disabled: disabled() }),
    getItems: () => optionList.map((o) => ({ value: o.value, label: o.label })),
    getDisabled: disabled,
    actions: {
      open: () => api.open(),
      close: () => api.close(),
      select: (v) => api.select(String(v) as T),
      setQuery: (q) =>
        api.setQuery(typeof q === 'string' ? q : typeof q === 'number' ? String(q) : ''),
      clear: () => api.clear(),
    },
  })
  emitRef.fn = reg.emit

  useDismissLayer({
    active: open,
    getElements: () => [inputEl(), contentEl()],
    onDismiss: (reason, event) => {
      setOpen(false, reason === 'escape-key' ? 'escape-key' : 'outside-press', event)
    },
  })

  const registerOption = (opt: RegisteredComboboxOption) => {
    optionList.push(opt)
    labelMap.set(opt.value, opt.label)
    return () => {
      const idx = optionList.indexOf(opt)
      if (idx >= 0) {
        optionList.splice(idx, 1)
      }
    }
  }

  const getLabelFor = (val: string) => labelMap.get(val) ?? val

  return (
    <ComboboxContext
      value={{
        id,
        listId,
        labelId,
        state,
        api: api as unknown as ComboboxApi,
        setOpen,
        setQuery,
        selectItem,
        removeItem,
        selectAll,
        createFromQuery,
        isSelected,
        isItemVisible,
        setHighlighted,
        moveHighlight,
        registerOption,
        getOptions: () => optionList,
        getLabelFor,
        placeholder: () => props.placeholder,
        items: () =>
          props.items?.map((entry) =>
            typeof entry === 'string' ? { value: entry, label: entry } : entry,
          ),
        creatable: () => !!props.creatable,
        anchorEl: () => inputEl(),
        setInputEl,
        setContentEl,
        contentEl,
        arrowEl,
        setArrowEl,
        field,
        registerExplicitContent: () => {
          if (typeof window === 'undefined') {
            ssrExplicitContent = true
            return () => {}
          }
          setExplicitContentCount((c) => c + 1)
          return () => setExplicitContentCount((c) => Math.max(0, c - 1))
        },
      }}
    >
      {props.children}
      <Show when={props.items && explicitContentCount() === 0 && !ssrExplicitContent}>
        <AutoComboboxContentContext value={true}>
          <ComboboxContent>
            <ComboboxList>
              <ComboboxItems />
            </ComboboxList>
          </ComboboxContent>
        </AutoComboboxContentContext>
      </Show>
      <Show when={props.name}>
        {(formName) => (
          <Show
            when={isMultiple()}
            fallback={
              <textarea
                name={formName()}
                required={props.required || undefined}
                readonly
                tabindex={-1}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  margin: '-1px',
                  padding: '0',
                  overflow: 'hidden',
                  border: '0',
                  clip: 'rect(0 0 0 0)',
                }}
              >
                {(() => {
                  const cur = value()
                  return typeof cur === 'string' ? cur : ''
                })()}
              </textarea>
            }
          >
            <For each={Array.isArray(value()) ? (value() as Array<T>) : []}>
              {(v) => <input type="hidden" name={formName()} value={v} />}
            </For>
          </Show>
        )}
      </Show>
    </ComboboxContext>
  )
}

export function ComboboxLabel(props: PartProps<'label', ComboboxState>) {
  const ctx = useCombobox('Label')
  return renderPart('label', props, ctx.state, {
    attrs: () => ({ id: props.id ?? ctx.labelId, for: ctx.id }),
  })
}

export function ComboboxInput(
  props: Omit<PartProps<'input', ComboboxInputState>, 'type' | 'value' | 'readonly'>,
) {
  const ctx = useCombobox('Input')
  const rest = omit(props, 'role')
  return renderPart('input', rest, ctx.state, {
    ref: (el: HTMLInputElement) => ctx.setInputEl(el),
    attrs: () => {
      const s = ctx.state()
      return {
        id: ctx.id,
        type: 'text',
        role: 'combobox',
        autocomplete: 'off',
        value: s.query,
        placeholder: props.placeholder ?? ctx.placeholder(),
        disabled: s.disabled,
        readonly: s.readOnly,
        'aria-expanded': s.open ? 'true' : 'false',
        'aria-autocomplete': 'list',
        'aria-controls': ctx.listId,
        'aria-labelledby': ctx.labelId,
        'aria-describedby': ctx.field?.describedBy(),
        'aria-invalid': s.invalid ? 'true' : undefined,
        'data-open': s.open ? '' : undefined,
        'data-disabled': s.disabled ? '' : undefined,
      }
    },
    handlers: {
      onFocus: (e: FocusEvent) => {
        if (!ctx.state().disabled) {
          ctx.setOpen(true, 'input-focus', e)
        }
      },
      onInput: (e: InputEvent & { currentTarget: HTMLInputElement }) => {
        ctx.setQuery(e.currentTarget.value, 'input', e)
        if (!ctx.state().open) {
          ctx.setOpen(true, 'input-change', e)
        }
      },
      onKeyDown: (e: KeyboardEvent) => {
        const s = ctx.state()
        if (s.disabled) {
          return
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          if (!s.open) {
            ctx.setOpen(true, 'input-change', e)
          }
          ctx.moveHighlight(1)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (!s.open) {
            ctx.setOpen(true, 'input-change', e)
          }
          ctx.moveHighlight(-1)
        } else if (e.key === 'Enter') {
          if (s.highlightedValue) {
            e.preventDefault()
            ctx.selectItem(s.highlightedValue, 'item-press', e)
          } else if (ctx.creatable() && s.query.trim()) {
            e.preventDefault()
            ctx.createFromQuery(e)
          }
        } else if (
          e.key === 'Backspace' &&
          s.multiple &&
          s.query === '' &&
          Array.isArray(s.value) &&
          s.value.length > 0
        ) {
          const last = s.value.at(-1)
          if (last) {
            ctx.removeItem(last, e)
          }
        }
      },
    },
  })
}

export function ComboboxTrigger(props: Omit<PartProps<'button', ComboboxTriggerState>, 'type'>) {
  const ctx = useCombobox('Trigger')
  return renderPart('button', props, ctx.state, {
    attrs: () => ({
      type: 'button',
      tabindex: -1,
      disabled: ctx.state().disabled,
      'aria-expanded': ctx.state().open ? 'true' : 'false',
      'aria-controls': ctx.listId,
      'data-open': ctx.state().open ? '' : undefined,
    }),
    handlers: {
      onClick: (e: MouseEvent) => ctx.setOpen(!ctx.state().open, 'trigger-press', e),
    },
  })
}

export function ComboboxValue(
  props: ComboboxValueProps & Omit<PartProps<'span', ComboboxValueState>, keyof ComboboxValueProps>,
) {
  const ctx = useCombobox('Value')
  const valState = (): ComboboxValueState => {
    const s = ctx.state()
    const val = s.value
    const text = Array.isArray(val)
      ? val.map((v) => ctx.getLabelFor(v)).join(', ')
      : val !== null
        ? ctx.getLabelFor(val)
        : (props.placeholder ?? ctx.placeholder() ?? '')
    return { ...s, text, hasValue: !s.empty }
  }
  const rest = omit(props, 'placeholder')
  const resolvedProps: PartProps<'span', ComboboxValueState> = merge(rest, {
    get children() {
      return props.children ?? ((s: ComboboxValueState) => s.text)
    },
  })
  return renderPart('span', resolvedProps, valState)
}

export function ComboboxValueIcon(props: PartProps<'span', ComboboxState>) {
  const ctx = useCombobox('ValueIcon')
  return renderPart('span', props, ctx.state, { attrs: () => ({ 'aria-hidden': true }) })
}

export function ComboboxClear(
  props: ComboboxClearProps &
    Omit<PartProps<'button', ComboboxClearState>, keyof ComboboxClearProps | 'type'>,
) {
  const ctx = useCombobox('Clear')
  const rest = omit(props, 'disabled')
  return (
    <Show when={!ctx.state().empty || ctx.state().query.length > 0}>
      {renderPart('button', rest, ctx.state, {
        attrs: () => ({
          type: 'button',
          disabled: !!props.disabled || ctx.state().disabled,
          'aria-label': 'Clear',
        }),
        handlers: {
          onClick: (e: MouseEvent) => {
            e.stopPropagation()
            ctx.api.clear()
          },
        },
      })}
    </Show>
  )
}

export function ComboboxChips(props: PartProps<'div', ComboboxState>) {
  const ctx = useCombobox('Chips')
  return renderPart('div', props, ctx.state, {
    attrs: () => ({ role: 'list' }),
  })
}

export function ComboboxChip(
  props: ComboboxChipProps & Omit<PartProps<'span', ComboboxChipState>, keyof ComboboxChipProps>,
) {
  const ctx = useCombobox('Chip')
  const chipState = (): ComboboxChipState => ({
    value: props.value,
    label: props.label ?? ctx.getLabelFor(props.value),
    disabled: ctx.state().disabled,
  })
  const rest = omit(props, 'value', 'label')
  const resolvedChip: PartProps<'span', ComboboxChipState> = merge(rest, {
    get children() {
      return props.children ?? ((s: ComboboxChipState) => s.label)
    },
  })
  return (
    <ComboboxChipContext value={chipState}>
      {renderPart('span', resolvedChip, chipState, {
        attrs: () => ({
          role: 'listitem',
          'data-slot': 'combobox-chip',
          'data-value': props.value,
          'data-disabled': chipState().disabled ? '' : undefined,
        }),
      })}
    </ComboboxChipContext>
  )
}

export function ComboboxChipRemove(props: Omit<PartProps<'button', ComboboxChipState>, 'type'>) {
  const ctx = useCombobox('ChipRemove')
  const chipState = useContext(ComboboxChipContext)
  if (!chipState) {
    throw new Error('<ComboboxChipRemove> must be used inside <ComboboxChip>.')
  }
  return renderPart('button', props, chipState, {
    attrs: () => ({
      type: 'button',
      disabled: chipState().disabled || ctx.state().readOnly,
      'aria-label': `Remove ${chipState().label}`,
    }),
    handlers: {
      onClick: (e: MouseEvent) => {
        e.stopPropagation()
        ctx.removeItem(chipState().value, e)
      },
    },
  })
}

export function ComboboxChipsOverflow(
  props: { maxVisible?: number } & PartProps<'span', ComboboxChipsOverflowState>,
) {
  const ctx = useCombobox('ChipsOverflow')
  const overflowState = (): ComboboxChipsOverflowState => {
    const val = ctx.state().value
    const arr = Array.isArray(val) ? val : val ? [val] : []
    const max = props.maxVisible ?? arr.length
    const hidden = arr.slice(max)
    return { count: hidden.length, values: hidden }
  }
  const rest = omit(props, 'maxVisible')
  return <Show when={overflowState().count > 0}>{renderPart('span', rest, overflowState)}</Show>
}

export function ComboboxContent(
  props: ComboboxContentProps &
    Omit<PartProps<'div', ComboboxContentState>, keyof ComboboxContentProps>,
) {
  const ctx = useCombobox('Content')
  const isAuto = useContext(AutoComboboxContentContext)
  if (!isAuto) {
    if (typeof window === 'undefined') {
      ctx.registerExplicitContent()
    } else {
      onSettled(() => ctx.registerExplicitContent())
    }
  }
  const pos = usePopupPosition({
    open: () => ctx.state().open,
    reference: () => ctx.anchorEl() ?? undefined,
    floating: () => ctx.contentEl() ?? undefined,
    arrow: () => ctx.arrowEl() ?? undefined,
    side: () => props.side ?? 'bottom',
    align: () => props.align ?? 'start',
    sideOffset: () => props.sideOffset ?? 4,
    alignOffset: () => props.alignOffset ?? 0,
    collisionPadding: () => props.collisionPadding ?? 8,
  })

  const contentState = (): ComboboxContentState => ({
    ...ctx.state(),
    side: pos.side(),
  })

  const rest = omit(
    props,
    'side',
    'align',
    'sideOffset',
    'alignOffset',
    'collisionPadding',
    'container',
    'keepMounted',
  )

  return (
    <Show when={ctx.state().open || !!props.keepMounted}>
      <SafePortal mount={props.container ?? undefined}>
        {renderPart('div', rest, contentState, {
          ref: (el: HTMLElement) => ctx.setContentEl(el),
          attrs: () => ({
            'data-slot': 'combobox-content',
            'data-open': ctx.state().open ? '' : undefined,
            'data-side': pos.side(),
          }),
          style: () => ({
            ...pos.style(),
            display: ctx.state().open ? undefined : 'none',
          }),
        })}
      </SafePortal>
    </Show>
  )
}

export function ComboboxArrow(props: PartProps<'div', ComboboxArrowState>) {
  const ctx = useCombobox('Arrow')
  return renderPart('div', props, () => ({ side: 'bottom' as Side }), {
    ref: (el: HTMLElement) => ctx.setArrowEl(el),
    attrs: () => ({ 'aria-hidden': true }),
  })
}

export function ComboboxList(props: PartProps<'div', ComboboxState>) {
  const ctx = useCombobox('List')
  return renderPart('div', props, ctx.state, {
    attrs: () => ({
      id: ctx.listId,
      role: 'listbox',
      'aria-multiselectable': ctx.state().multiple ? 'true' : undefined,
    }),
  })
}

export function ComboboxItems(props: {
  items?: ListData
  renderItem?: (item: ListItem) => JSX.Element
}) {
  const ctx = useCombobox('Items')
  const list = () => props.items ?? ctx.items() ?? []
  return (
    <For each={list()}>
      {(entry) => {
        if (entry.type === 'separator') {
          return <ComboboxSeparator />
        }
        if (entry.type === 'group') {
          return (
            <ComboboxGroup>
              <ComboboxGroupLabel>{entry.label}</ComboboxGroupLabel>
              <For each={entry.items}>
                {(sub) => {
                  if (sub.type === 'separator') {
                    return <ComboboxSeparator />
                  }
                  return props.renderItem ? (
                    props.renderItem(sub)
                  ) : (
                    <ComboboxItem
                      value={sub.value}
                      label={sub.label}
                      keywords={sub.keywords}
                      disabled={sub.disabled}
                    >
                      <ComboboxItemText>{sub.label ?? sub.value}</ComboboxItemText>
                    </ComboboxItem>
                  )
                }}
              </For>
            </ComboboxGroup>
          )
        }
        return props.renderItem ? (
          props.renderItem(entry)
        ) : (
          <ComboboxItem
            value={entry.value}
            label={entry.label}
            keywords={entry.keywords}
            disabled={entry.disabled}
          >
            <ComboboxItemText>{entry.label ?? entry.value}</ComboboxItemText>
          </ComboboxItem>
        )
      }}
    </For>
  )
}

export function ComboboxGroup(props: PartProps<'div', ComboboxState>) {
  const ctx = useCombobox('Group')
  const labelId = `ui-combobox-group-${createUniqueId()}`
  return (
    <ComboboxGroupLabelIdContext value={labelId}>
      {renderPart('div', props, ctx.state, {
        attrs: () => ({ role: 'group', 'aria-labelledby': labelId }),
      })}
    </ComboboxGroupLabelIdContext>
  )
}

export function ComboboxGroupLabel(props: PartProps<'div', ComboboxState>) {
  const ctx = useCombobox('GroupLabel')
  const labelId = useContext(ComboboxGroupLabelIdContext)
  return renderPart('div', props, ctx.state, {
    attrs: () => ({ id: props.id ?? labelId, role: 'presentation' }),
  })
}

export function ComboboxSeparator(props: PartProps<'div', ComboboxState>) {
  const ctx = useCombobox('Separator')
  return renderPart('div', props, ctx.state, {
    attrs: () => ({ role: 'separator' }),
  })
}

export function ComboboxItem<T extends string = string>(
  props: ComboboxItemProps<T> &
    Omit<PartProps<'div', ComboboxItemState>, keyof ComboboxItemProps<T>>,
) {
  const ctx = useCombobox('Item')
  let cleanup: (() => void) | undefined
  const label = () => props.label ?? props.value

  const itemState = (): ComboboxItemState => ({
    value: props.value,
    label: label(),
    selected: ctx.isSelected(props.value),
    highlighted: ctx.state().highlightedValue === props.value,
    disabled: ctx.state().disabled || !!props.disabled,
    visible: ctx.isItemVisible(label(), props.keywords),
  })

  const rest = omit(props, 'value', 'label', 'keywords', 'disabled')

  return (
    <Show when={itemState().visible}>
      <ComboboxItemContext value={itemState}>
        {renderPart('div', rest, itemState, {
          ref: (el: HTMLElement | null) => {
            cleanup?.()
            if (el) {
              cleanup = ctx.registerOption({
                value: props.value,
                label: props.label ?? el.textContent?.trim() ?? props.value,
                keywords: props.keywords,
                disabled: !!props.disabled,
              })
            }
          },
          attrs: () => {
            const s = itemState()
            return {
              role: 'option',
              'aria-selected': s.selected ? 'true' : 'false',
              'aria-disabled': s.disabled ? 'true' : undefined,
              'data-value': s.value,
              'data-selected': s.selected ? '' : undefined,
              'data-highlighted': s.highlighted ? '' : undefined,
              'data-disabled': s.disabled ? '' : undefined,
            }
          },
          handlers: {
            onPointerMove: () => {
              if (!itemState().disabled) {
                ctx.setHighlighted(props.value)
              }
            },
            onClick: (e: MouseEvent) => {
              if (itemState().disabled) {
                return
              }
              ctx.selectItem(props.value, 'item-press', e)
            },
          },
        })}
      </ComboboxItemContext>
    </Show>
  )
}

export function ComboboxItemText(props: PartProps<'span', ComboboxItemTextState>) {
  const itemState = useContext(ComboboxItemContext)
  if (!itemState) {
    throw new Error('<ComboboxItemText> must be used inside <ComboboxItem>.')
  }
  return renderPart('span', props, itemState)
}

export function ComboboxItemIcon(
  props: ComboboxItemIconProps & PartProps<'span', ComboboxItemIconState>,
) {
  const itemState = useContext(ComboboxItemContext)
  if (!itemState) {
    throw new Error('<ComboboxItemIcon> must be used inside <ComboboxItem>.')
  }
  return renderPart('span', props, itemState, { attrs: () => ({ 'aria-hidden': true }) })
}

export function ComboboxItemIndicator(
  props: ComboboxItemIndicatorProps &
    Omit<PartProps<'span', ComboboxItemIndicatorState>, keyof ComboboxItemIndicatorProps>,
) {
  const itemState = useContext(ComboboxItemContext)
  if (!itemState) {
    throw new Error('<ComboboxItemIndicator> must be used inside <ComboboxItem>.')
  }
  const rest = omit(props, 'keepMounted')
  return (
    <Show when={itemState().selected || !!props.keepMounted}>
      {renderPart('span', rest, itemState, {
        attrs: () => ({
          'aria-hidden': true,
          'data-selected': itemState().selected ? '' : undefined,
        }),
      })}
    </Show>
  )
}

export function ComboboxCreate(
  props: ComboboxCreateProps &
    Omit<PartProps<'div', ComboboxCreateState>, keyof ComboboxCreateProps>,
) {
  const ctx = useCombobox('Create')
  const createState = (): ComboboxCreateState => {
    const q = ctx.state().query.trim()
    const exactExists = ctx
      .getOptions()
      .some(
        (o) =>
          o.label.toLowerCase() === q.toLowerCase() || o.value.toLowerCase() === q.toLowerCase(),
      )
    return {
      ...ctx.state(),
      query: q,
      canCreate: q.length > 0 && !exactExists && !props.disabled,
    }
  }
  const rest = omit(props, 'disabled')
  return (
    <Show when={createState().canCreate}>
      {renderPart('div', rest, createState, {
        attrs: () => ({ role: 'option', 'data-create': '' }),
        handlers: {
          onClick: (e: MouseEvent) => ctx.createFromQuery(e),
        },
      })}
    </Show>
  )
}

export function ComboboxEmpty(props: PartProps<'div', ComboboxEmptyState>) {
  const ctx = useCombobox('Empty')
  const hasVisible = () => ctx.getOptions().some((o) => ctx.isItemVisible(o.label, o.keywords))
  return (
    <Show when={!hasVisible()}>
      {renderPart('div', props, ctx.state, { attrs: () => ({ role: 'status' }) })}
    </Show>
  )
}

export function ComboboxStatus(props: PartProps<'div', ComboboxStatusState>) {
  const ctx = useCombobox('Status')
  const statusState = (): ComboboxStatusState => ({
    ...ctx.state(),
    count: ctx.getOptions().filter((o) => ctx.isItemVisible(o.label, o.keywords)).length,
  })
  return renderPart('div', props, statusState, {
    attrs: () => ({ role: 'status', 'aria-live': 'polite' }),
  })
}

export function ComboboxSelectAll(
  props: Omit<PartProps<'button', ComboboxSelectAllState>, 'type'>,
) {
  const ctx = useCombobox('SelectAll')
  const selectAllState = (): ComboboxSelectAllState => {
    const s = ctx.state()
    const enabled = ctx
      .getOptions()
      .filter((o) => !o.disabled && ctx.isItemVisible(o.label, o.keywords))
    const selectedCount = enabled.filter((o) => ctx.isSelected(o.value)).length
    return {
      ...s,
      allSelected: enabled.length > 0 && selectedCount === enabled.length,
      someSelected: selectedCount > 0 && selectedCount < enabled.length,
    }
  }
  return renderPart('button', props, selectAllState, {
    attrs: () => ({
      type: 'button',
      role: 'option',
      'data-all-selected': selectAllState().allSelected ? '' : undefined,
    }),
    handlers: {
      onClick: (e: MouseEvent) => ctx.selectAll(e),
    },
  })
}
