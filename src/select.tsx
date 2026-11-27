import { Portal } from '@solidjs/web'
import type { JSX } from '@solidjs/web'
import {
  For,
  Show,
  createContext,
  createSignal,
  createUniqueId,
  merge,
  omit,
  useContext,
} from 'solid-js'

import { useFieldControl } from './field'
import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { useDismissLayer } from './foundation/dismissal'
import { usePopupPosition } from './foundation/popup'
import type { PortalProps, PositionProps, Side } from './foundation/popup'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
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

export type SelectValueData<T extends string = string> = T | Array<T> | null
export type SelectOpenChangeReason =
  | 'trigger-press'
  | 'item-press'
  | 'escape-key'
  | 'outside-press'
  | 'programmatic'
export type SelectDismissReason = 'escape-key' | 'outside-press'
export type SelectValueChangeReason = 'item-press' | 'clear' | 'select-all' | 'programmatic'
export type SelectQueryChangeReason = 'input' | 'clear' | 'programmatic'
export type SelectChangeOptions = ChangeOptions<SelectValueChangeReason>

export type SelectApi<T extends string = string> = {
  open: () => void
  close: () => void
  toggle: () => void
  setValue: (value: SelectValueData<T>, options?: SelectChangeOptions) => void
  select: (value: T) => void
  clear: () => void
  setQuery: (query: string) => void
  getValue: () => SelectValueData<T>
  isOpen: () => boolean
}

export function createSelectController<T extends string = string>() {
  return createController<SelectApi<T>>()
}

export type SelectController<T extends string = string> = SelectApi<T>

export type SelectOptions<T extends string = string> = {
  value?: SelectValueData<T>
  defaultValue?: SelectValueData<T>
  onValueChange?: (
    value: SelectValueData<T>,
    details: ChangeDetails<SelectValueChangeReason>,
  ) => void
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails<SelectOpenChangeReason>) => void
  query?: string
  defaultQuery?: string
  onQueryChange?: (query: string, details: ChangeDetails<SelectQueryChangeReason>) => void
  multiple?: boolean
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  invalid?: boolean
  placeholder?: string
  name?: string
  filter?: ListFilter
  items?: ListData<T>
  controller?: SelectController<T>
  debug?: boolean
}

export type SelectState<T extends string = string> = {
  value: SelectValueData<T>
  open: boolean
  query: string
  highlightedValue: string | null
  multiple: boolean
  empty: boolean
  disabled: boolean
  readOnly: boolean
  invalid: boolean
}

export type SelectPrimitive = SelectState
export type SelectProps<T extends string = string> = SelectOptions<T> & {
  children?: JSX.Element
}

export type SelectTriggerProps = { disabled?: boolean }
export type SelectTriggerState = SelectState
export type SelectValueProps = { placeholder?: string }
export type SelectValueState = SelectState & { text: string; hasValue: boolean }
export type SelectClearProps = { disabled?: boolean }
export type SelectClearState = SelectState
export type SelectContentProps = PositionProps & PortalProps & { keepMounted?: boolean }
export type SelectContentState = SelectState & { side: Side }
export type SelectArrowState = { side: Side }
export type SelectInputState = SelectState
export type SelectItemProps<T extends string = string> = {
  value: T
  label?: string
  keywords?: Array<string>
  disabled?: boolean
}
export type SelectItemState = {
  value: string
  label: string
  selected: boolean
  highlighted: boolean
  disabled: boolean
  visible: boolean
}
export type SelectItemTextState = SelectItemState
export type SelectItemIconProps = object
export type SelectItemIconState = SelectItemState
export type SelectItemIndicatorProps = { keepMounted?: boolean }
export type SelectItemIndicatorState = SelectItemState
export type SelectEmptyState = SelectState
export type SelectStatusState = SelectState & { count: number }
export type SelectSelectAllState = SelectState & { allSelected: boolean; someSelected: boolean }

type RegisteredSelectOption = {
  value: string
  label: string
  keywords?: Array<string>
  disabled: boolean
}

type SelectContextValue = {
  id: string
  listId: string
  labelId: string
  state: () => SelectState
  api: SelectApi
  setOpen: (next: boolean, reason: SelectOpenChangeReason, event?: Event) => void
  setQuery: (next: string, reason: SelectQueryChangeReason, event?: Event) => void
  selectItem: (val: string, reason: SelectValueChangeReason, event?: Event) => void
  selectAll: (event?: Event) => void
  isSelected: (val: string) => boolean
  isItemVisible: (label: string, keywords?: Array<string>) => boolean
  setHighlighted: (val: string | null) => void
  moveHighlight: (delta: 1 | -1) => void
  registerOption: (opt: RegisteredSelectOption) => () => void
  getOptions: () => Array<RegisteredSelectOption>
  getLabelFor: (val: string) => string
  placeholder: () => string | undefined
  items: () => ListData | undefined
  triggerEl: () => HTMLElement | null
  setTriggerEl: (el: HTMLElement | null) => void
  contentEl: () => HTMLElement | null
  setContentEl: (el: HTMLElement | null) => void
  arrowEl: () => HTMLElement | null
  setArrowEl: (el: HTMLElement | null) => void
  field: ReturnType<typeof useFieldControl>
}

const SelectContext = createContext<SelectContextValue | null>(null)
const SelectItemContext = createContext<(() => SelectItemState) | null>(null)
const SelectGroupLabelIdContext = createContext<string | undefined>(undefined)

function useSelect(part: string): SelectContextValue {
  const ctx = useContext(SelectContext)
  if (!ctx) {
    throw new Error(`<Select${part}> must be used inside <Select>.`)
  }
  return ctx
}

export function Select<T extends string = string>(props: SelectProps<T>) {
  const field = useFieldControl()
  const uid = createUniqueId()
  const id = field?.controlId ?? `ui-select-${uid}`
  const listId = `ui-select-list-${uid}`
  const labelId = field?.labelId ?? `ui-select-label-${uid}`

  const isMultiple = () => !!props.multiple
  const [value, setRawValue] = createControlledSignal<SelectValueData<T>>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? (isMultiple() ? ([] as Array<T>) : null),
  })
  const [open, setRawOpen] = createControlledSignal<boolean>({
    value: () => props.open,
    defaultValue: () => !!props.defaultOpen,
  })
  const [query, setRawQuery] = createControlledSignal<string>({
    value: () => props.query,
    defaultValue: () => props.defaultQuery ?? '',
  })
  const [highlighted, setHighlighted] = createSignal<string | null>(null)
  const [triggerEl, setTriggerEl] = createSignal<HTMLElement | null>(null)
  const [contentEl, setContentEl] = createSignal<HTMLElement | null>(null)
  const [arrowEl, setArrowEl] = createSignal<HTMLElement | null>(null)

  const optionList: Array<RegisteredSelectOption> = []
  const labelMap = new Map<string, string>()

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

  const state = (): SelectState<T> => ({
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

  const setOpen = (next: boolean, reason: SelectOpenChangeReason, event?: Event) => {
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
    if (!next) {
      setQuery('', 'clear')
    }
    emitRef.fn?.({ key: 'open', previous: prev, value: next, reason, source: details.source })
  }

  const setQuery = (next: string, reason: SelectQueryChangeReason, event?: Event) => {
    const details = createChangeDetails(reason, event)
    props.onQueryChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawQuery(next)
  }

  const commitValue = (
    next: SelectValueData<T>,
    reason: SelectValueChangeReason,
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

  const selectItem = (val: string, reason: SelectValueChangeReason, event?: Event) => {
    if (disabled() || readOnly()) {
      return
    }
    const cur = value()
    if (isMultiple()) {
      const arr = Array.isArray(cur) ? cur : []
      const next = arr.includes(val as T) ? arr.filter((v) => v !== val) : [...arr, val as T]
      commitValue(next, reason, event)
    } else {
      commitValue(val as T, reason, event)
      setOpen(false, 'item-press', event)
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

  const api: SelectApi<T> = {
    open: () => setOpen(true, 'programmatic'),
    close: () => setOpen(false, 'programmatic'),
    toggle: () => setOpen(!open(), 'programmatic'),
    setValue: (next, opts) => commitValue(next, opts?.reason ?? 'programmatic', opts?.event),
    select: (val) => selectItem(val, 'programmatic'),
    clear: () => commitValue(isMultiple() ? [] : null, 'clear'),
    setQuery: (q) => setQuery(q, 'programmatic'),
    getValue: () => value(),
    isOpen: () => open(),
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: 'select',
    getElements: () => [triggerEl(), contentEl()],
    getState: () => ({ value: value(), open: open(), disabled: disabled() }),
    getItems: () => optionList.map((o) => ({ value: o.value, label: o.label })),
    getDisabled: disabled,
    actions: {
      open: () => api.open(),
      close: () => api.close(),
      select: (v) => api.select(String(v) as T),
      clear: () => api.clear(),
    },
  })
  emitRef.fn = reg.emit

  useDismissLayer({
    active: open,
    getElements: () => [triggerEl(), contentEl()],
    onDismiss: (reason, event) => {
      setOpen(false, reason === 'escape-key' ? 'escape-key' : 'outside-press', event)
    },
  })

  const registerOption = (opt: RegisteredSelectOption) => {
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
    <SelectContext
      value={{
        id,
        listId,
        labelId,
        state,
        api: api as unknown as SelectApi,
        setOpen,
        setQuery,
        selectItem,
        selectAll,
        isSelected,
        isItemVisible,
        setHighlighted,
        moveHighlight,
        registerOption,
        getOptions: () => optionList,
        getLabelFor,
        placeholder: () => props.placeholder,
        items: () => props.items,
        triggerEl,
        setTriggerEl,
        contentEl,
        setContentEl,
        arrowEl,
        setArrowEl,
        field,
      }}
    >
      {props.children}
    </SelectContext>
  )
}

export function SelectLabel(props: PartProps<'label', SelectState>) {
  const ctx = useSelect('Label')
  return renderPart('label', props, ctx.state, {
    attrs: () => ({ id: props.id ?? ctx.labelId, for: ctx.id }),
  })
}

export function SelectTrigger(
  props: SelectTriggerProps &
    Omit<PartProps<'button', SelectTriggerState>, keyof SelectTriggerProps | 'type'>,
) {
  const ctx = useSelect('Trigger')
  const rest = omit(props, 'disabled')
  return renderPart('button', rest, ctx.state, {
    ref: (el: HTMLElement) => ctx.setTriggerEl(el),
    attrs: () => {
      const s = ctx.state()
      const isDisabled = !!props.disabled || s.disabled
      return {
        id: ctx.id,
        type: 'button',
        role: 'combobox',
        disabled: isDisabled,
        'aria-expanded': s.open ? 'true' : 'false',
        'aria-haspopup': 'listbox',
        'aria-controls': ctx.listId,
        'aria-labelledby': ctx.labelId,
        'aria-describedby': ctx.field?.describedBy(),
        'aria-invalid': s.invalid ? 'true' : undefined,
        'data-open': s.open ? '' : undefined,
        'data-empty': s.empty ? '' : undefined,
        'data-disabled': isDisabled ? '' : undefined,
      }
    },
    handlers: {
      onClick: (e: MouseEvent) => {
        if (props.disabled || ctx.state().disabled) {
          return
        }
        ctx.setOpen(!ctx.state().open, 'trigger-press', e)
      },
      onKeyDown: (e: KeyboardEvent) => {
        if (props.disabled || ctx.state().disabled) {
          return
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault()
          if (!ctx.state().open) {
            ctx.setOpen(true, 'trigger-press', e)
          }
          ctx.moveHighlight(e.key === 'ArrowDown' ? 1 : -1)
        } else if (e.key === 'Enter' && ctx.state().open) {
          const hv = ctx.state().highlightedValue
          if (hv) {
            e.preventDefault()
            ctx.selectItem(hv, 'item-press', e)
          }
        }
      },
    },
  })
}

export function SelectValue(
  props: SelectValueProps & Omit<PartProps<'span', SelectValueState>, keyof SelectValueProps>,
) {
  const ctx = useSelect('Value')
  const valState = (): SelectValueState => {
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
  const resolvedProps: PartProps<'span', SelectValueState> = merge(rest, {
    get children() {
      return props.children ?? ((s: SelectValueState) => s.text)
    },
  })

  return renderPart('span', resolvedProps, valState, {
    attrs: () => ({
      'data-placeholder': !valState().hasValue ? '' : undefined,
    }),
  })
}

export function SelectValueIcon(props: PartProps<'span', SelectState>) {
  const ctx = useSelect('ValueIcon')
  return renderPart('span', props, ctx.state, {
    attrs: () => ({ 'aria-hidden': true }),
  })
}

export function SelectClear(
  props: SelectClearProps &
    Omit<PartProps<'button', SelectClearState>, keyof SelectClearProps | 'type'>,
) {
  const ctx = useSelect('Clear')
  const rest = omit(props, 'disabled')
  return (
    <Show when={!ctx.state().empty}>
      {renderPart('button', rest, ctx.state, {
        attrs: () => ({
          type: 'button',
          disabled: !!props.disabled || ctx.state().disabled,
          'aria-label': 'Clear selection',
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

export function SelectContent(
  props: SelectContentProps & Omit<PartProps<'div', SelectContentState>, keyof SelectContentProps>,
) {
  const ctx = useSelect('Content')
  const pos = usePopupPosition({
    open: () => ctx.state().open,
    reference: () => ctx.triggerEl() ?? undefined,
    floating: () => ctx.contentEl() ?? undefined,
    arrow: () => ctx.arrowEl() ?? undefined,
    side: () => props.side ?? 'bottom',
    align: () => props.align ?? 'start',
    sideOffset: () => props.sideOffset ?? 4,
    alignOffset: () => props.alignOffset ?? 0,
    collisionPadding: () => props.collisionPadding ?? 8,
  })

  const contentState = (): SelectContentState => ({
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
      <Portal mount={props.container ?? undefined}>
        {renderPart('div', rest, contentState, {
          ref: (el: HTMLElement) => ctx.setContentEl(el),
          attrs: () => ({
            'data-open': ctx.state().open ? '' : undefined,
            'data-side': pos.side(),
          }),
          style: () => ({
            ...pos.style(),
            display: ctx.state().open ? undefined : 'none',
          }),
        })}
      </Portal>
    </Show>
  )
}

export function SelectArrow(props: PartProps<'div', SelectArrowState>) {
  const ctx = useSelect('Arrow')
  return renderPart('div', props, () => ({ side: 'bottom' as Side }), {
    ref: (el: HTMLElement) => ctx.setArrowEl(el),
    attrs: () => ({ 'aria-hidden': true }),
  })
}

export function SelectInput(props: Omit<PartProps<'input', SelectInputState>, 'type' | 'value'>) {
  const ctx = useSelect('Input')
  return renderPart('input', props, ctx.state, {
    attrs: () => ({
      type: 'text',
      value: ctx.state().query,
      autocomplete: 'off',
      'aria-controls': ctx.listId,
    }),
    handlers: {
      onInput: (e: InputEvent & { currentTarget: HTMLInputElement }) => {
        ctx.setQuery(e.currentTarget.value, 'input', e)
      },
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          ctx.moveHighlight(1)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          ctx.moveHighlight(-1)
        } else if (e.key === 'Enter') {
          const hv = ctx.state().highlightedValue
          if (hv) {
            e.preventDefault()
            ctx.selectItem(hv, 'item-press', e)
          }
        }
      },
    },
  })
}

export function SelectList(props: PartProps<'div', SelectState>) {
  const ctx = useSelect('List')
  return renderPart('div', props, ctx.state, {
    attrs: () => ({
      id: ctx.listId,
      role: 'listbox',
      'aria-multiselectable': ctx.state().multiple ? 'true' : undefined,
    }),
  })
}

export function SelectItems(props: {
  items?: ListData
  renderItem?: (item: ListItem) => JSX.Element
}) {
  const ctx = useSelect('Items')
  const list = () => props.items ?? ctx.items() ?? []
  return (
    <For each={list()}>
      {(entry) => {
        if (entry.type === 'separator') {
          return <SelectSeparator />
        }
        if (entry.type === 'group') {
          return (
            <SelectGroup>
              <SelectGroupLabel>{entry.label}</SelectGroupLabel>
              <For each={entry.items}>
                {(sub) => {
                  if (sub.type === 'separator') {
                    return <SelectSeparator />
                  }
                  return props.renderItem ? (
                    props.renderItem(sub)
                  ) : (
                    <SelectItem
                      value={sub.value}
                      label={sub.label}
                      keywords={sub.keywords}
                      disabled={sub.disabled}
                    >
                      <SelectItemText>{sub.label ?? sub.value}</SelectItemText>
                    </SelectItem>
                  )
                }}
              </For>
            </SelectGroup>
          )
        }
        return props.renderItem ? (
          props.renderItem(entry)
        ) : (
          <SelectItem
            value={entry.value}
            label={entry.label}
            keywords={entry.keywords}
            disabled={entry.disabled}
          >
            <SelectItemText>{entry.label ?? entry.value}</SelectItemText>
          </SelectItem>
        )
      }}
    </For>
  )
}

export function SelectGroup(props: PartProps<'div', SelectState>) {
  const ctx = useSelect('Group')
  const labelId = `ui-select-group-${createUniqueId()}`
  return (
    <SelectGroupLabelIdContext value={labelId}>
      {renderPart('div', props, ctx.state, {
        attrs: () => ({ role: 'group', 'aria-labelledby': labelId }),
      })}
    </SelectGroupLabelIdContext>
  )
}

export function SelectGroupLabel(props: PartProps<'div', SelectState>) {
  const ctx = useSelect('GroupLabel')
  const labelId = useContext(SelectGroupLabelIdContext)
  return renderPart('div', props, ctx.state, {
    attrs: () => ({ id: props.id ?? labelId, role: 'presentation' }),
  })
}

export function SelectSeparator(props: PartProps<'div', SelectState>) {
  const ctx = useSelect('Separator')
  return renderPart('div', props, ctx.state, {
    attrs: () => ({ role: 'separator' }),
  })
}

export function SelectItem<T extends string = string>(
  props: SelectItemProps<T> & Omit<PartProps<'div', SelectItemState>, keyof SelectItemProps<T>>,
) {
  const ctx = useSelect('Item')
  let cleanup: (() => void) | undefined
  const label = () => props.label ?? props.value

  const itemState = (): SelectItemState => ({
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
      <SelectItemContext value={itemState}>
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
      </SelectItemContext>
    </Show>
  )
}

export function SelectItemText(props: PartProps<'span', SelectItemTextState>) {
  const itemState = useContext(SelectItemContext)
  if (!itemState) {
    throw new Error('<SelectItemText> must be used inside <SelectItem>.')
  }
  return renderPart('span', props, itemState)
}

export function SelectItemIcon(
  props: SelectItemIconProps & PartProps<'span', SelectItemIconState>,
) {
  const itemState = useContext(SelectItemContext)
  if (!itemState) {
    throw new Error('<SelectItemIcon> must be used inside <SelectItem>.')
  }
  return renderPart('span', props, itemState, { attrs: () => ({ 'aria-hidden': true }) })
}

export function SelectItemIndicator(
  props: SelectItemIndicatorProps &
    Omit<PartProps<'span', SelectItemIndicatorState>, keyof SelectItemIndicatorProps>,
) {
  const itemState = useContext(SelectItemContext)
  if (!itemState) {
    throw new Error('<SelectItemIndicator> must be used inside <SelectItem>.')
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

export function SelectEmpty(props: PartProps<'div', SelectEmptyState>) {
  const ctx = useSelect('Empty')
  const hasVisible = () => ctx.getOptions().some((o) => ctx.isItemVisible(o.label, o.keywords))
  return (
    <Show when={!hasVisible()}>
      {renderPart('div', props, ctx.state, {
        attrs: () => ({ role: 'status' }),
      })}
    </Show>
  )
}

export function SelectStatus(props: PartProps<'div', SelectStatusState>) {
  const ctx = useSelect('Status')
  const statusState = (): SelectStatusState => ({
    ...ctx.state(),
    count: ctx.getOptions().filter((o) => ctx.isItemVisible(o.label, o.keywords)).length,
  })
  return renderPart('div', props, statusState, {
    attrs: () => ({ role: 'status', 'aria-live': 'polite' }),
  })
}

export function SelectSelectAll(props: Omit<PartProps<'button', SelectSelectAllState>, 'type'>) {
  const ctx = useSelect('SelectAll')
  const selectAllState = (): SelectSelectAllState => {
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
      'data-all-selected': selectAllState().allSelected ? '' : undefined,
    }),
    handlers: {
      onClick: (e: MouseEvent) => ctx.selectAll(e),
    },
  })
}
