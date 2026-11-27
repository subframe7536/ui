import type { JSX } from '@solidjs/web'
import {
  untrack,
  createContext,
  createSignal,
  createUniqueId,
  For,
  merge,
  omit,
  Show,
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

export type ListItem<T extends string = string> = {
  type?: 'item'
  value: T
  label?: string
  description?: string
  keywords?: Array<string>
  disabled?: boolean
  icon?: JSX.Element
}

export type ListGroup<T extends string = string> = {
  type: 'group'
  label: string
  items: Array<ListItem<T> | ListSeparator>
}

export type ListSeparator = {
  type: 'separator'
}

export type ListData<T extends string = string> = Array<ListItem<T> | ListGroup<T> | ListSeparator>

export type ListHighlightDetails = {
  value: string | null
  reason: 'keyboard' | 'pointer' | 'filter' | 'programmatic'
}

export type MatchSegment = {
  text: string
  match: boolean
}

export type ListFilter = (label: string, query: string, keywords?: Array<string>) => boolean
export type SearchFilter = ListFilter
export type ListAnnouncement = {
  count: number
  query: string
  message: string
}

export function defaultListFilter(label: string, query: string, keywords?: Array<string>): boolean {
  const q = query.trim().toLowerCase()
  if (!q) {
    return true
  }
  if (label.toLowerCase().includes(q)) {
    return true
  }
  if (keywords?.some((k) => k.toLowerCase().includes(q))) {
    return true
  }
  return false
}

export function getMatchSegments(text: string, query: string): Array<MatchSegment> {
  const q = query.trim()
  if (!q) {
    return [{ text, match: false }]
  }
  const lower = text.toLowerCase()
  const idx = lower.indexOf(q.toLowerCase())
  if (idx === -1) {
    return [{ text, match: false }]
  }
  const segments: Array<MatchSegment> = []
  if (idx > 0) {
    segments.push({ text: text.slice(0, idx), match: false })
  }
  segments.push({ text: text.slice(idx, idx + q.length), match: true })
  if (idx + q.length < text.length) {
    segments.push({ text: text.slice(idx + q.length), match: false })
  }
  return segments
}

export type ListboxValue<T extends string = string> = T | Array<T> | null
export type ListboxValueChangeReason = 'click' | 'keyboard' | 'programmatic' | 'clear'
export type ListboxChangeOptions = ChangeOptions<ListboxValueChangeReason>

export type ListboxApi<T extends string = string> = {
  setValue: (value: ListboxValue<T>, options?: ListboxChangeOptions) => void
  select: (value: T, options?: ListboxChangeOptions) => void
  deselect: (value: T, options?: ListboxChangeOptions) => void
  toggle: (value: T, options?: ListboxChangeOptions) => void
  clear: (options?: ListboxChangeOptions) => void
  highlight: (value: T | null) => void
  getValue: () => ListboxValue<T>
}

export function createListboxController<T extends string = string>() {
  return createController<ListboxApi<T>>()
}

export type ListboxController<T extends string = string> = ListboxApi<T>

export type ListboxOptions<T extends string = string> = {
  value?: ListboxValue<T>
  defaultValue?: ListboxValue<T>
  onValueChange?: (value: ListboxValue<T>, details: ChangeDetails<ListboxValueChangeReason>) => void
  onHighlightChange?: (details: ListHighlightDetails) => void
  multiple?: boolean
  name?: string
  deselectable?: boolean
  disabled?: boolean
  readOnly?: boolean
  loop?: boolean
  orientation?: 'vertical' | 'horizontal'
  items?: ListData<T>
  controller?: ListboxController<T>
  debug?: boolean
}

export type ListboxState<T extends string = string> = {
  value: ListboxValue<T>
  highlightedValue: string | null
  multiple: boolean
  disabled: boolean
  readOnly: boolean
}

export type ListboxPrimitive = ListboxState

export type ListboxProps<T extends string = string> = ListboxOptions<T> &
  Omit<
    PartProps<'div', ListboxState<T>>,
    keyof ListboxOptions<T> | 'defaultValue' | 'onChange' | 'onSelect'
  >

export type ListboxItemProps<T extends string = string> = {
  value: T
  label?: string
  disabled?: boolean
}

export type ListboxItemState = {
  value: string
  selected: boolean
  highlighted: boolean
  disabled: boolean
}

export type ListboxItemIndicatorProps = { keepMounted?: boolean }
export type ListboxItemIndicatorState = ListboxItemState
export type ListboxItemIconProps = object
export type ListboxItemIconState = ListboxItemState

type RegisteredOption = {
  getValue: () => string
  getLabel: () => string
  getDisabled: () => boolean
  el: HTMLElement
}

type ListboxContextValue = {
  id: string
  state: () => ListboxState
  isSelected: (val: string) => boolean
  selectItem: (val: string, reason: ListboxValueChangeReason, event?: Event) => void
  setHighlighted: (val: string | null, reason?: ListHighlightDetails['reason']) => void
  focusedEl: () => HTMLElement | null
  setFocusedEl: (el: HTMLElement | null) => void
  claimInitialTabStop: (disabled: boolean) => boolean
  registerOption: (opt: RegisteredOption) => () => void
  items: () => ListData | undefined
}

const ListboxContext = createContext<ListboxContextValue | null>(null)
const ListboxItemContext = createContext<(() => ListboxItemState) | null>(null)
const ListboxGroupLabelIdContext = createContext<string | undefined>(undefined)

function useListbox(part: string): ListboxContextValue {
  const ctx = useContext(ListboxContext)
  if (!ctx) {
    throw new Error(`<Listbox${part}> must be used inside <Listbox>.`)
  }
  return ctx
}

export function Listbox<T extends string = string>(props: ListboxProps<T>) {
  const field = useFieldControl()
  const id = field?.controlId ?? `ui-listbox-${createUniqueId()}`

  const isMultiple = () => !!props.multiple
  const [value, setRawValue] = createControlledSignal<ListboxValue<T>>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? (isMultiple() ? ([] as Array<T>) : null),
  })
  const [highlighted, setHighlightedRaw] = createSignal<string | null>(null)
  const [focusedEl, setFocusedEl] = createSignal<HTMLElement | null>(null)
  let initialTabStopClaimed = false

  let rootEl: HTMLElement | null = null
  const options: Array<RegisteredOption> = []

  const disabled = () => !!props.disabled || !!field?.disabled()
  const readOnly = () => !!props.readOnly || !!field?.readOnly()

  const setHighlighted = (
    val: string | null,
    reason: ListHighlightDetails['reason'] = 'programmatic',
  ) => {
    setHighlightedRaw(val)
    props.onHighlightChange?.({ value: val, reason })
  }

  const isSelected = (val: string): boolean => {
    const cur = value()
    if (Array.isArray(cur)) {
      return cur.includes(val as T)
    }
    return cur === val
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

  const commit = (next: ListboxValue<T>, reason: ListboxValueChangeReason, event?: Event) => {
    const prev = value()
    const details = createChangeDetails(reason, event)
    props.onValueChange?.(next, details)
    if (details.canceled) {
      return
    }
    setRawValue(next)
    field?.setDirty(true)
    emitRef.fn?.({
      key: 'value',
      previous: prev,
      value: next,
      reason,
      source: details.source,
    })
  }

  const selectItem = (val: string, reason: ListboxValueChangeReason, event?: Event) => {
    if (disabled() || readOnly()) {
      return
    }
    const cur = value()
    if (isMultiple()) {
      const arr = Array.isArray(cur) ? cur : []
      const next = arr.includes(val as T) ? arr.filter((v) => v !== val) : [...arr, val as T]
      commit(next, reason, event)
    } else {
      const next = props.deselectable && cur === val ? null : (val as T)
      commit(next, reason, event)
    }
  }

  const api: ListboxApi<T> = {
    setValue: (next, opts) => commit(next, opts?.reason ?? 'programmatic', opts?.event),
    select: (val, opts) => {
      if (isMultiple()) {
        const cur = value()
        const arr = Array.isArray(cur) ? cur : []
        if (!arr.includes(val)) {
          commit([...arr, val], opts?.reason ?? 'programmatic', opts?.event)
        }
      } else {
        commit(val, opts?.reason ?? 'programmatic', opts?.event)
      }
    },
    deselect: (val, opts) => {
      const cur = value()
      if (isMultiple()) {
        const arr = Array.isArray(cur) ? cur : []
        commit(
          arr.filter((v) => v !== val),
          opts?.reason ?? 'programmatic',
          opts?.event,
        )
      } else if (cur === val) {
        commit(null, opts?.reason ?? 'programmatic', opts?.event)
      }
    },
    toggle: (val, opts) => selectItem(val, opts?.reason ?? 'programmatic', opts?.event),
    clear: (opts) => commit(isMultiple() ? [] : null, opts?.reason ?? 'clear', opts?.event),
    highlight: (val) => setHighlighted(val, 'programmatic'),
    getValue: () => value(),
  }

  useController(() => props.controller, api)

  const state = (): ListboxState<T> => ({
    value: value(),
    highlightedValue: highlighted(),
    multiple: isMultiple(),
    disabled: disabled(),
    readOnly: readOnly(),
  })

  const reg = registerComponent({
    component: 'listbox',
    getElements: () => [rootEl],
    getState: () => ({ value: value(), multiple: isMultiple(), disabled: disabled() }),
    getItems: () => options.map((o) => ({ value: o.getValue(), label: o.getLabel() })),
    getDisabled: disabled,
    actions: {
      select: (v) => api.select(String(v) as T),
      clear: () => api.clear(),
    },
  })
  emitRef.fn = reg.emit

  const registerOption = (opt: RegisteredOption) => {
    options.push(opt)
    return () => {
      const idx = options.indexOf(opt)
      if (idx >= 0) {
        options.splice(idx, 1)
      }
    }
  }

  const focusOption = (opt: RegisteredOption) => {
    setFocusedEl(opt.el)
    setHighlighted(opt.getValue(), 'keyboard')
    opt.el.focus()
  }

  const moveHighlight = (delta: 1 | -1 | 'first' | 'last') => {
    const enabled = options.filter((o) => !o.getDisabled() && o.el.isConnected)
    if (enabled.length === 0) {
      return
    }
    if (delta === 'first') {
      const first = enabled[0]
      if (first) {
        focusOption(first)
      }
      return
    }
    if (delta === 'last') {
      const last = enabled.at(-1)
      if (last) {
        focusOption(last)
      }
      return
    }
    const active =
      focusedEl() ??
      (typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null)
    let curIdx = active ? enabled.findIndex((o) => o.el === active) : -1
    if (curIdx === -1) {
      curIdx = enabled.findIndex((o) => o.getValue() === highlighted())
    }
    const loop = props.loop ?? true
    let nextIdx = curIdx === -1 ? (delta === 1 ? 0 : enabled.length - 1) : curIdx + delta
    if (nextIdx < 0) {
      nextIdx = loop ? enabled.length - 1 : 0
    }
    if (nextIdx >= enabled.length) {
      nextIdx = loop ? 0 : enabled.length - 1
    }
    const target = enabled[nextIdx]
    if (target) {
      focusOption(target)
    }
  }

  const rest = omit(
    props,
    'value',
    'defaultValue',
    'onValueChange',
    'onHighlightChange',
    'multiple',
    'name',
    'deselectable',
    'disabled',
    'readOnly',
    'loop',
    'orientation',
    'items',
    'controller',
    'debug',
  )

  return (
    <ListboxContext
      value={{
        id,
        state,
        isSelected,
        selectItem,
        setHighlighted,
        focusedEl,
        setFocusedEl,
        claimInitialTabStop: (isItemDisabled: boolean) => {
          if (isItemDisabled || initialTabStopClaimed) {
            return false
          }
          initialTabStopClaimed = true
          return true
        },
        registerOption,
        items: () => props.items,
      }}
    >
      {renderPart(
        'div',
        merge(rest, {
          get children() {
            return (
              <Show
                when={props.children !== undefined}
                fallback={
                  <Show when={props.items}>
                    <ListboxItems />
                  </Show>
                }
              >
                {typeof props.children === 'function' ? props.children(state()) : props.children}
              </Show>
            )
          },
        }),
        state,
        {
          ref: (el) => {
            rootEl = el
          },
          attrs: () => {
            const s = state()
            return {
              id,
              role: 'listbox',
              tabindex: s.disabled ? -1 : 0,
              'aria-multiselectable': s.multiple ? 'true' : undefined,
              'aria-disabled': s.disabled ? 'true' : undefined,
              'aria-orientation': props.orientation ?? 'vertical',
              'aria-labelledby': field?.labelId,
              'aria-describedby': field?.describedBy(),
              'data-disabled': s.disabled ? '' : undefined,
              'data-readonly': s.readOnly ? '' : undefined,
            }
          },
          handlers: {
            onKeyDown: (e: KeyboardEvent) => {
              if (disabled()) {
                return
              }
              const horiz = props.orientation === 'horizontal'
              if ((horiz && e.key === 'ArrowRight') || (!horiz && e.key === 'ArrowDown')) {
                e.preventDefault()
                moveHighlight(1)
              } else if ((horiz && e.key === 'ArrowLeft') || (!horiz && e.key === 'ArrowUp')) {
                e.preventDefault()
                moveHighlight(-1)
              } else if (e.key === 'Home') {
                e.preventDefault()
                moveHighlight('first')
              } else if (e.key === 'End') {
                e.preventDefault()
                moveHighlight('last')
              } else if (e.key === 'Enter' || e.key === ' ') {
                const cur = highlighted()
                if (cur !== null) {
                  e.preventDefault()
                  selectItem(cur, 'keyboard', e)
                }
              } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const ch = e.key.toLowerCase()
                const enabled = options.filter((o) => !o.getDisabled() && o.el.isConnected)
                if (enabled.length > 0) {
                  const curVal = highlighted()
                  const startIdx =
                    curVal !== null ? enabled.findIndex((o) => o.getValue() === curVal) : -1
                  for (let step = 1; step <= enabled.length; step++) {
                    const candidate = enabled[(startIdx + step + enabled.length) % enabled.length]
                    if (candidate && candidate.getLabel().toLowerCase().startsWith(ch)) {
                      e.preventDefault()
                      setHighlighted(candidate.getValue())
                      candidate.el.focus()
                      break
                    }
                  }
                }
              }
            },
          },
        },
      )}
      <Show when={props.name ?? field?.name()}>
        {(formName) => (
          <For
            each={(() => {
              const cur = value()
              if (Array.isArray(cur)) {
                return cur
              }
              return cur !== null ? [cur] : []
            })()}
          >
            {(v) => <input type="hidden" name={formName()} value={v} />}
          </For>
        )}
      </Show>
    </ListboxContext>
  )
}

export function ListboxItems(props: {
  items?: ListData
  renderItem?: (item: ListItem) => JSX.Element
}) {
  const ctx = useListbox('Items')
  const list = () => props.items ?? ctx.items() ?? []
  return (
    <For each={list()}>
      {(entry) => {
        if (entry.type === 'separator') {
          return <ListboxSeparator />
        }
        if (entry.type === 'group') {
          return (
            <ListboxGroup>
              <ListboxGroupLabel>{entry.label}</ListboxGroupLabel>
              <For each={entry.items}>
                {(sub) => {
                  if (sub.type === 'separator') {
                    return <ListboxSeparator />
                  }
                  return props.renderItem ? (
                    props.renderItem(sub)
                  ) : (
                    <ListboxItem value={sub.value} label={sub.label} disabled={sub.disabled}>
                      {sub.label ?? sub.value}
                    </ListboxItem>
                  )
                }}
              </For>
            </ListboxGroup>
          )
        }
        return props.renderItem ? (
          props.renderItem(entry)
        ) : (
          <ListboxItem value={entry.value} label={entry.label} disabled={entry.disabled}>
            {entry.label ?? entry.value}
          </ListboxItem>
        )
      }}
    </For>
  )
}

export function ListboxGroup(props: PartProps<'div', ListboxState>) {
  const ctx = useListbox('Group')
  const labelId = `ui-listbox-group-${createUniqueId()}`
  return (
    <ListboxGroupLabelIdContext value={labelId}>
      {renderPart('div', props, ctx.state, {
        attrs: () => ({
          role: 'group',
          'aria-labelledby': labelId,
        }),
      })}
    </ListboxGroupLabelIdContext>
  )
}

export function ListboxGroupLabel(props: PartProps<'div', ListboxState>) {
  const ctx = useListbox('GroupLabel')
  const labelId = useContext(ListboxGroupLabelIdContext)
  return renderPart('div', props, ctx.state, {
    attrs: () => ({
      id: props.id ?? labelId,
      role: 'presentation',
    }),
  })
}

export function ListboxSeparator(props: PartProps<'div', ListboxState>) {
  const ctx = useListbox('Separator')
  return renderPart('div', props, ctx.state, {
    attrs: () => ({ role: 'separator' }),
  })
}

export function ListboxItem<T extends string = string>(
  props: ListboxItemProps<T> & Omit<PartProps<'div', ListboxItemState>, keyof ListboxItemProps<T>>,
) {
  const ctx = useListbox('Item')
  let cleanup: (() => void) | undefined
  let elRef: HTMLElement | null = null
  const isInitialStop = ctx.claimInitialTabStop(
    untrack(() => ctx.state().disabled || !!props.disabled),
  )

  const itemState = (): ListboxItemState => ({
    value: props.value,
    selected: ctx.isSelected(props.value),
    highlighted: ctx.state().highlightedValue === props.value,
    disabled: ctx.state().disabled || !!props.disabled,
  })

  const rest = omit(props, 'value', 'label', 'disabled')

  return (
    <ListboxItemContext value={itemState}>
      {renderPart('div', rest, itemState, {
        ref: (el: HTMLElement | null) => {
          elRef = el
          cleanup?.()
          if (el) {
            cleanup = ctx.registerOption({
              getValue: () => props.value,
              getLabel: () => props.label ?? el.textContent?.trim() ?? props.value,
              getDisabled: () => !!props.disabled,
              el,
            })
          }
        },
        attrs: () => {
          const s = itemState()
          const focused = ctx.focusedEl()
          const isTabStop = !s.disabled && (focused ? focused === elRef : isInitialStop)
          return {
            role: 'option',
            tabindex: s.disabled ? undefined : isTabStop ? 0 : -1,
            'aria-selected': s.selected ? 'true' : 'false',
            'aria-disabled': s.disabled ? 'true' : undefined,
            'data-value': s.value,
            'data-selected': s.selected ? '' : undefined,
            'data-highlighted': s.highlighted ? '' : undefined,
            'data-disabled': s.disabled ? '' : undefined,
          }
        },
        handlers: {
          onFocus: () => {
            if (!itemState().disabled && elRef) {
              ctx.setFocusedEl(elRef)
              ctx.setHighlighted(props.value, 'keyboard')
            }
          },
          onPointerMove: () => {
            if (!itemState().disabled) {
              ctx.setHighlighted(props.value, 'pointer')
            }
          },
          onClick: (e: MouseEvent) => {
            if (itemState().disabled) {
              return
            }
            ctx.selectItem(props.value, 'click', e)
          },
        },
      })}
    </ListboxItemContext>
  )
}

export function ListboxItemIndicator(
  props: ListboxItemIndicatorProps &
    Omit<PartProps<'span', ListboxItemIndicatorState>, keyof ListboxItemIndicatorProps>,
) {
  const itemState = useContext(ListboxItemContext)
  if (!itemState) {
    throw new Error('<ListboxItemIndicator> must be used inside <ListboxItem>.')
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

export function ListboxItemIcon(
  props: ListboxItemIconProps & PartProps<'span', ListboxItemIconState>,
) {
  const itemState = useContext(ListboxItemContext)
  if (!itemState) {
    throw new Error('<ListboxItemIcon> must be used inside <ListboxItem>.')
  }
  return renderPart('span', props, itemState, {
    attrs: () => ({ 'aria-hidden': true }),
  })
}
