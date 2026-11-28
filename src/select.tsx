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
  untrack,
  useContext,
  onSettled,
} from 'solid-js'

import { useFieldControl } from './field'
import {
  createController,
  useController,
  useControllerEntry,
  useControllerTarget,
} from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { useDismissLayer } from './foundation/dismissal'
import { usePopupPosition } from './foundation/popup'
import type { PortalProps, PositionProps, Side } from './foundation/popup'
import { registerComponent } from './foundation/registry'
import { renderPart, SafePortal } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'
import { matchesListFilter } from './listbox'
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
  onOpenChangeComplete?: (open: boolean) => void
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
  items?: Array<T | ListData<T>[number]>
  itemToLabel?: (value: T) => string
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
export type SelectValueState = SelectState & {
  text: string
  hasValue: boolean
  label: string
  labels: Array<string>
  placeholder: boolean
}
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
  updateLabel: (val: string, label: string) => void
  placeholder: () => string | undefined
  items: () => ListData | undefined
  triggerEl: () => HTMLElement | null
  setTriggerEl: (el: HTMLElement | null) => void
  contentEl: () => HTMLElement | null
  setContentEl: (el: HTMLElement | null) => void
  arrowEl: () => HTMLElement | null
  setArrowEl: (el: HTMLElement | null) => void
  field: ReturnType<typeof useFieldControl>
  registerExplicitContent: () => () => void
}
const AutoSelectContentContext = createContext(false)

const SelectContext = createContext<SelectContextValue | null>(null)
const SelectTargetContext = createContext<(() => SelectContextValue | null | undefined) | null>(
  null,
)
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
  const [labelVersion, setLabelVersion] = createSignal(0)
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

  const disabled = () => !!props.disabled || !!field?.disabled()
  const readOnly = () => !!props.readOnly || !!field?.readOnly()
  const invalid = () => !!props.invalid || !!field?.invalid()

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

  const isItemVisible = (label: string, keywords?: Array<string>) =>
    matchesListFilter(props.filter, { value: label, label, keywords }, query())

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
  let prevOpenForComplete = untrack(open)
  createEffect(open, (isOpen) => {
    if (isOpen === prevOpenForComplete) {
      return
    }
    prevOpenForComplete = isOpen
    queueMicrotask(() => props.onOpenChangeComplete?.(isOpen))
  })

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

  const updateLabel = (val: string, label: string) => {
    const trimmed = label.trim()
    if (!trimmed || labelMap.get(val) === trimmed) {
      return
    }
    labelMap.set(val, trimmed)
    setLabelVersion((v) => v + 1)
  }

  const registerOption = (opt: RegisteredSelectOption) => {
    optionList.push(opt)
    if (opt.label.trim()) {
      updateLabel(opt.value, opt.label)
    }
    return () => {
      const idx = optionList.indexOf(opt)
      if (idx >= 0) {
        optionList.splice(idx, 1)
      }
    }
  }

  const [explicitContentCount, setExplicitContentCount] = createSignal(0)
  let ssrExplicitContent = false
  const registerExplicitContent = () => {
    if (typeof window === 'undefined') {
      ssrExplicitContent = true
      return () => {}
    }
    setExplicitContentCount((c) => c + 1)
    return () => setExplicitContentCount((c) => Math.max(0, c - 1))
  }
  const findItemLabel = (val: string): string | undefined => {
    const raw = props.items
    if (!raw) {
      return undefined
    }
    for (const entry of raw) {
      if (typeof entry === 'string') {
        if (entry === val) {
          return entry
        }
      } else if ('items' in entry) {
        for (const sub of entry.items) {
          if (typeof sub === 'string') {
            if (sub === val) {
              return sub
            }
          } else if ('value' in sub && sub.value === val) {
            return sub.label ?? sub.value
          }
        }
      } else if ('value' in entry && entry.value === val) {
        return entry.label ?? entry.value
      }
    }
    return undefined
  }
  const getLabelFor = (val: string) => {
    labelVersion()
    return props.itemToLabel?.(val as T) ?? findItemLabel(val) ?? labelMap.get(val) ?? val
  }

  const selectCtx: SelectContextValue = {
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
    updateLabel,
    placeholder: () => props.placeholder,
    items: () =>
      props.items?.map((entry) =>
        typeof entry === 'string' ? { value: entry, label: entry } : entry,
      ),
    triggerEl,
    setTriggerEl,
    contentEl,
    setContentEl,
    arrowEl,
    setArrowEl,
    field,
    registerExplicitContent,
  }
  useControllerEntry(() => props.controller, selectCtx)
  return (
    <SelectContext value={selectCtx}>
      {props.children}
      <Show when={props.items && explicitContentCount() === 0 && !ssrExplicitContent}>
        <AutoSelectContentContext value={true}>
          <SelectContent>
            <SelectList>
              <SelectItems />
            </SelectList>
          </SelectContent>
        </AutoSelectContentContext>
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
    </SelectContext>
  )
}

export function SelectLabel(props: PartProps<'label', SelectState>) {
  const ctx = useSelect('Label')
  return renderPart('label', props, ctx.state, {
    attrs: () => ({
      id: props.id ?? ctx.labelId,
      for: ctx.id,
      'data-slot': 'select-label',
      'data-disabled': ctx.state().disabled ? '' : undefined,
    }),
  })
}

export function SelectTrigger<T extends string = string>(
  props: SelectTriggerProps & { controller?: SelectController<T> } & Omit<
      PartProps<'button', SelectTriggerState>,
      keyof SelectTriggerProps | 'type' | 'controller'
    >,
) {
  const directCtx = useContext(SelectContext)
  const target = useControllerTarget<SelectContextValue>(() => props.controller, directCtx)
  const triggerState = (): SelectTriggerState => {
    const ctx = target()
    if (ctx) {
      return ctx.state()
    }
    return {
      open: false,
      value: null,
      highlightedValue: null,
      query: '',
      multiple: false,
      disabled: !!props.disabled,
      readOnly: false,
      invalid: false,
      empty: true,
    }
  }
  const rest = omit(props, 'disabled', 'controller')
  const resolvedTrigger: PartProps<'button', SelectTriggerState> = merge(rest, {
    get children() {
      return (
        <Show when={props.children !== undefined} fallback={<SelectValue />}>
          {typeof props.children === 'function' ? props.children(triggerState()) : props.children}
        </Show>
      )
    },
  })
  return (
    <SelectTargetContext value={target}>
      {renderPart('button', resolvedTrigger, triggerState, {
        ref: (el: HTMLElement) => target()?.setTriggerEl(el),
        attrs: () => {
          const ctx = target()
          const s = triggerState()
          const isDisabled = !!props.disabled || s.disabled
          return {
            id: ctx?.id,
            type: 'button',
            role: 'combobox',
            'data-slot': 'select-trigger',
            'data-readonly': s.readOnly ? '' : undefined,
            'data-invalid': s.invalid ? '' : undefined,
            'data-placeholder': s.empty ? '' : undefined,
            disabled: isDisabled || undefined,
            'aria-expanded': s.open ? 'true' : 'false',
            'aria-haspopup': 'listbox',
            'aria-controls': ctx?.listId,
            'aria-labelledby': ctx?.labelId,
            'aria-describedby':
              ctx?.field?.describedBy() ??
              (typeof window === 'undefined' && ctx?.field ? ctx.field.descriptionId : undefined),
            'aria-invalid': s.invalid ? 'true' : undefined,
            'data-open': s.open ? '' : undefined,
            'data-empty': s.empty ? '' : undefined,
            'data-disabled': isDisabled ? '' : undefined,
          }
        },
        handlers: {
          onClick: (e: MouseEvent) => {
            const ctx = target()
            if (!ctx || props.disabled || ctx.state().disabled) {
              return
            }
            ctx.setOpen(!ctx.state().open, 'trigger-press', e)
          },
          onKeyDown: (e: KeyboardEvent) => {
            const ctx = target()
            if (!ctx || props.disabled || ctx.state().disabled) {
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
      })}
    </SelectTargetContext>
  )
}

export function SelectValue(
  props: SelectValueProps & Omit<PartProps<'span', SelectValueState>, keyof SelectValueProps>,
) {
  const directCtx = useContext(SelectContext)
  const targetCtx = useContext(SelectTargetContext)
  const valState = (): SelectValueState => {
    const ctx = targetCtx ? targetCtx() : directCtx
    if (!ctx) {
      const ph = props.placeholder ?? ''
      return {
        open: false,
        value: null,
        highlightedValue: null,
        query: '',
        multiple: false,
        disabled: false,
        readOnly: false,
        invalid: false,
        empty: true,
        text: ph,
        label: '',
        labels: [],
        placeholder: true,
        hasValue: false,
      }
    }
    const s = ctx.state()
    const val = s.value
    const labels = Array.isArray(val)
      ? val.map((v) => ctx.getLabelFor(v))
      : val !== null
        ? [ctx.getLabelFor(val)]
        : []
    const label = labels.join(', ')
    const text = labels.length > 0 ? label : (props.placeholder ?? ctx.placeholder() ?? '')
    return { ...s, text, label, labels, placeholder: s.empty, hasValue: !s.empty }
  }
  const rest = omit(props, 'placeholder')
  const resolvedProps: PartProps<'span', SelectValueState> = merge(rest, {
    get children() {
      return props.children ?? ((s: SelectValueState) => s.text)
    },
  })

  return renderPart('span', resolvedProps, valState, {
    attrs: () => ({
      'data-slot': 'select-value',
      'data-placeholder': !valState().hasValue ? '' : undefined,
    }),
  })
}

export function SelectValueIcon(props: PartProps<'span', SelectState>) {
  const ctx = useSelect('ValueIcon')
  return renderPart('span', props, ctx.state, {
    attrs: () => ({ 'aria-hidden': true, 'data-slot': 'select-value-icon' }),
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
          'data-slot': 'select-clear',
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
  const isAuto = useContext(AutoSelectContentContext)
  if (!isAuto) {
    if (typeof window === 'undefined') {
      ctx.registerExplicitContent()
    } else {
      onSettled(() => ctx.registerExplicitContent())
    }
  }
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

  const portalMount = () =>
    props.container ??
    (ctx.triggerEl()?.closest('[data-example]') as HTMLElement | null) ??
    undefined

  return (
    <Show when={ctx.state().open || !!props.keepMounted}>
      <SafePortal mount={portalMount()}>
        {renderPart('div', rest, contentState, {
          ref: (el: HTMLElement) => ctx.setContentEl(el),
          attrs: () => ({
            'data-slot': 'select-content',
            'data-open': ctx.state().open ? '' : undefined,
            'data-side': pos.side(),
            'data-align': pos.align(),
          }),
          style: () => ({
            ...pos.style(),
            'z-index': 50,
            display: ctx.state().open ? undefined : 'none',
          }),
        })}
      </SafePortal>
    </Show>
  )
}

export function SelectArrow(props: PartProps<'div', SelectArrowState>) {
  const ctx = useSelect('Arrow')
  return renderPart('div', props, () => ({ side: 'bottom' as Side }), {
    ref: (el: HTMLElement) => ctx.setArrowEl(el),
    attrs: () => ({ 'aria-hidden': true, 'data-slot': 'select-arrow' }),
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
      'data-slot': 'select-input',
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
      'data-slot': 'select-list',
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
        attrs: () => ({ role: 'group', 'data-slot': 'select-group', 'aria-labelledby': labelId }),
      })}
    </SelectGroupLabelIdContext>
  )
}

export function SelectGroupLabel(props: PartProps<'div', SelectState>) {
  const ctx = useSelect('GroupLabel')
  const labelId = useContext(SelectGroupLabelIdContext)
  return renderPart('div', props, ctx.state, {
    attrs: () => ({
      id: props.id ?? labelId,
      role: 'presentation',
      'data-slot': 'select-group-label',
    }),
  })
}

export function SelectSeparator(props: PartProps<'div', SelectState>) {
  const ctx = useSelect('Separator')
  return renderPart('div', props, ctx.state, {
    attrs: () => ({ role: 'separator', 'data-slot': 'select-separator' }),
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
              const readText = () => props.label || el.textContent?.trim() || props.value
              const opt: RegisteredSelectOption = {
                value: props.value,
                label: readText(),
                keywords: props.keywords,
                disabled: !!props.disabled,
              }
              cleanup = ctx.registerOption(opt)
              queueMicrotask(() => {
                const text = readText()
                if (text && text !== opt.label) {
                  opt.label = text
                  ctx.updateLabel(props.value, text)
                }
              })
            }
          },
          attrs: () => {
            const s = itemState()
            return {
              role: 'option',
              'data-slot': 'select-item',
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
  return renderPart('span', props, itemState, {
    attrs: () => ({ 'data-slot': 'select-item-text' }),
  })
}

export function SelectItemIcon(
  props: SelectItemIconProps & PartProps<'span', SelectItemIconState>,
) {
  const itemState = useContext(SelectItemContext)
  if (!itemState) {
    throw new Error('<SelectItemIcon> must be used inside <SelectItem>.')
  }
  return renderPart('span', props, itemState, {
    attrs: () => ({ 'aria-hidden': true, 'data-slot': 'select-item-icon' }),
  })
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
          'data-slot': 'select-item-indicator',
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
        attrs: () => ({ role: 'status', 'data-slot': 'select-empty' }),
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
    attrs: () => ({ role: 'status', 'aria-live': 'polite', 'data-slot': 'select-status' }),
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
      role: 'option',
      'data-slot': 'select-select-all',
      'aria-selected': selectAllState().allSelected ? 'true' : 'false',
      'data-all-selected': selectAllState().allSelected ? '' : undefined,
    }),
    handlers: {
      onClick: (e: MouseEvent) => ctx.selectAll(e),
    },
  })
}
