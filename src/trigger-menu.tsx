import { Portal } from '@solidjs/web'
import type { JSX } from '@solidjs/web'
import {
  For,
  Show,
  createContext,
  createMemo,
  createSignal,
  createUniqueId,
  omit,
  onSettled,
  useContext,
} from 'solid-js'

import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { useDismissLayer } from './foundation/dismissal'
import { EditorContext } from './foundation/editor-context'
import { navigateRoving } from './foundation/focus'
import { usePopupPosition } from './foundation/popup'
import type { Align, PortalProps, PositionProps, Side } from './foundation/popup'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type TriggerMenuOpenChangeReason =
  | 'input-change'
  | 'item-press'
  | 'escape-key'
  | 'outside-press'
  | 'imperative'

export type TriggerMenuQueryChangeReason = 'input-change' | 'imperative'
export type TriggerMenuDismissReason = 'escape-key' | 'outside-press'
export type TriggerMenuChangeOptions = ChangeOptions<TriggerMenuOpenChangeReason>

export type TextRange = { start: number; end: number }
export type TextRect = { top: number; left: number; width: number; height: number }
export type TriggerBoundary = 'word' | 'whitespace' | 'any'
export type TriggerAfter = string | RegExp
export type TriggerArgument = { query: string; range: TextRange }
export type TriggerMatch = { trigger: string; query: string; range: TextRange }
export type Token = { id: string; label: string; value?: string; type?: string }
export type TokenInsert = string | Token

export type EditorChange = { value: string; caret: number }
export type EditorReplaceOptions = { select?: boolean }
export type TextEditorAdapter = {
  getValue: () => string
  getCaret: () => number
  replace: (range: TextRange, text: string, options?: EditorReplaceOptions) => void
}

export function textFieldAdapter(el: HTMLInputElement | HTMLTextAreaElement): TextEditorAdapter {
  return {
    getValue: () => el.value,
    getCaret: () => el.selectionStart ?? el.value.length,
    replace: (range, text) => {
      const before = el.value.slice(0, range.start)
      const after = el.value.slice(range.end)
      el.value = `${before}${text}${after}`
      const pos = before.length + text.length
      el.setSelectionRange(pos, pos)
      el.dispatchEvent(new Event('input', { bubbles: true }))
    },
  }
}

export type TriggerMenuDataItem = {
  id?: string
  value: string
  label: string
  disabled?: boolean
  keywords?: Array<string>
}
export type TriggerMenuDataGroup = { label: string; items: Array<TriggerMenuDataItem> }
export type TriggerMenuData = Array<TriggerMenuDataItem | TriggerMenuDataGroup>
export type TriggerItemsLoader = (match: TriggerMatch) => TriggerMenuData | Promise<TriggerMenuData>

export type TriggerRule = {
  trigger?: string
  char?: string
  type?: string
  boundary?: TriggerBoundary
}

export type TriggerDefinition = TriggerRule & {
  items?: TriggerMenuData | TriggerItemsLoader
}

export type TriggerMenuSelectDetails = {
  value: string
  match: TriggerMatch | null
}

export type TriggerMenuApi = {
  open: (options?: TriggerMenuChangeOptions) => void
  close: (options?: TriggerMenuChangeOptions) => void
  setOpen: (open: boolean, options?: TriggerMenuChangeOptions) => void
  isOpen: () => boolean
  setQuery: (query: string) => void
  getQuery: () => string
}

export function createTriggerMenuController() {
  return createController<TriggerMenuApi>()
}

export type TriggerMenuController = ReturnType<typeof createTriggerMenuController>

export type TriggerMenuOptions = PortalProps & {
  triggers?: Array<string> | Array<TriggerDefinition>
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails<TriggerMenuOpenChangeReason>) => void
  query?: string
  defaultQuery?: string
  onQueryChange?: (query: string, details: ChangeDetails<TriggerMenuQueryChangeReason>) => void
  onSelect?: (details: TriggerMenuSelectDetails) => void
  controller?: TriggerMenuController
  debug?: boolean
}

export type TriggerMenuProps = TriggerMenuOptions & { children?: JSX.Element }
export type TriggerMenuInputState = { open: boolean; query: string }
export type TriggerMenuContentProps = PortalProps &
  PositionProps & { keepMounted?: boolean; inline?: boolean }
export type TriggerMenuContentState = {
  open: boolean
  side: Side
  align: Align
  query: string
  trigger: string | null
  items: TriggerMenuData
  empty: boolean
}
export type TriggerMenuItemProps = { value: string; label?: string; disabled?: boolean }
export type TriggerMenuItemState = { disabled: boolean; highlighted: boolean }
export type TriggerMenuItemIconProps = { mirror?: boolean }
export type TriggerMenuItemIconState = { disabled: boolean }
export type TriggerMenuEmptyState = { query: string; empty: boolean }
export type TriggerMenuHintState = { open: boolean }
export type TriggerMenuStatusState = { open: boolean; query: string }

type TriggerMenuContextValue = {
  open: () => boolean
  query: () => string
  match: () => TriggerMatch | null
  filteredItems: () => TriggerMenuData
  flatItems: () => Array<TriggerMenuDataItem>
  activeValue: () => string | null
  setActiveValue: (val: string | null) => void
  contentId: string
  container: () => HTMLElement | null | undefined
  handleInputChange: (el: HTMLInputElement | HTMLTextAreaElement, event: Event) => void
  handleEditorKeyDown: (event: KeyboardEvent) => boolean
  selectItem: (value: string, event?: Event, label?: string) => void
  close: (reason: TriggerMenuOpenChangeReason, event?: Event) => void
  inputEl: () => HTMLInputElement | HTMLTextAreaElement | undefined
  anchorEl: () => HTMLElement | undefined
  setInputEl: (el: HTMLInputElement | HTMLTextAreaElement) => void
  contentEl: () => HTMLElement | undefined
  setContentEl: (el: HTMLElement) => void
  registerItem: (el: HTMLElement) => void
  getItems: () => Array<HTMLElement>
  triggers: () => Array<string | TriggerDefinition> | undefined
  registerExplicitContent: () => () => void
}
const AutoTriggerMenuContentContext = createContext(false)

const TriggerMenuContext = createContext<TriggerMenuContextValue | null>(null)

function useTriggerMenu(part: string): TriggerMenuContextValue {
  const ctx = useContext(TriggerMenuContext)
  if (!ctx) {
    throw new Error(`<TriggerMenu${part}> must be used inside <TriggerMenu>.`)
  }
  return ctx
}

function findTriggerMatch(
  text: string,
  caret: number,
  triggers: Array<string>,
): TriggerMatch | null {
  const before = text.slice(0, caret)
  for (const trigger of triggers) {
    if (!trigger) {
      continue
    }
    const idx = before.lastIndexOf(trigger)
    if (idx < 0) {
      continue
    }
    if (idx > 0 && !/\s/.test(before[idx - 1] ?? '')) {
      continue
    }
    const query = before.slice(idx + trigger.length)
    if (/\s/.test(query)) {
      continue
    }
    return { trigger, query, range: { start: idx, end: caret } }
  }
  return null
}

function matchesQuery(item: TriggerMenuDataItem, needle: string): boolean {
  if (!needle) {
    return true
  }
  const q = needle.toLowerCase()
  if (item.label.toLowerCase().includes(q) || item.value.toLowerCase().includes(q)) {
    return true
  }
  if (item.keywords?.some((kw) => kw.toLowerCase().includes(q))) {
    return true
  }
  return false
}

function filterTriggerData(data: TriggerMenuData, needle: string): TriggerMenuData {
  if (!needle) {
    return data
  }
  const result: TriggerMenuData = []
  for (const entry of data) {
    if ('items' in entry) {
      const matched = entry.items.filter((sub) => matchesQuery(sub, needle))
      if (matched.length > 0) {
        result.push({ ...entry, items: matched })
      }
    } else if (matchesQuery(entry, needle)) {
      result.push(entry)
    }
  }
  return result
}

function flattenTriggerData(data: TriggerMenuData): Array<TriggerMenuDataItem> {
  const out: Array<TriggerMenuDataItem> = []
  for (const entry of data) {
    if ('items' in entry) {
      out.push(...entry.items)
    } else {
      out.push(entry)
    }
  }
  return out
}

/**
 * Inline mention / slash-command trigger menu bound to a text input or editor.
 */
export function TriggerMenu(props: TriggerMenuProps) {
  const inheritedEditor = useContext(EditorContext)
  const contentId = `ui-trigger-menu-${createUniqueId()}`
  const items = new Set<HTMLElement>()

  const [open, setOpen] = createControlledSignal<boolean>({
    value: () => props.open,
    defaultValue: () => !!props.defaultOpen,
  })
  const [query, setQuery] = createControlledSignal<string>({
    value: () => props.query,
    defaultValue: () => props.defaultQuery ?? '',
  })
  const [match, setMatch] = createSignal<TriggerMatch | null>(null)
  const [activeValue, setActiveValue] = createSignal<string | null>(null)
  const [inputEl, setInputEl] = createSignal<HTMLInputElement | HTMLTextAreaElement | undefined>(
    undefined,
  )
  const [contentEl, setContentEl] = createSignal<HTMLElement | undefined>(undefined)
  const [explicitContentCount, setExplicitContentCount] = createSignal(0)
  let ssrExplicitContent = false

  const triggerChars = (): Array<string> => {
    if (!props.triggers || props.triggers.length === 0) {
      return ['@', '/']
    }
    return props.triggers.map((t) => (typeof t === 'string' ? t : (t.trigger ?? t.char ?? '')))
  }

  const activeTriggerDef = createMemo((): TriggerDefinition | undefined => {
    if (!props.triggers || props.triggers.length === 0) {
      return undefined
    }
    const m = match()
    const found = m
      ? props.triggers.find(
          (t): t is TriggerDefinition =>
            typeof t !== 'string' && (t.char === m.trigger || t.trigger === m.trigger),
        )
      : props.triggers.find((t): t is TriggerDefinition => typeof t !== 'string')
    return found
  })

  const filteredItems = createMemo<TriggerMenuData>(() => {
    const def = activeTriggerDef()
    if (!def || !Array.isArray(def.items)) {
      return []
    }
    return filterTriggerData(def.items, query())
  })

  const flatItems = createMemo(() => flattenTriggerData(filteredItems()))

  const resolvedInputEl = () => inputEl() ?? inheritedEditor?.()?.getElement() ?? undefined
  const resolvedAnchorEl = () => inheritedEditor?.()?.getAnchorElement() ?? inputEl() ?? undefined

  const applyOpen = (
    next: boolean,
    reason: TriggerMenuOpenChangeReason,
    event?: Event,
    source?: ChangeOptions['source'],
  ) => {
    const prev = open()
    if (prev === next) {
      return
    }
    const details = createChangeDetails(reason, event, source)
    props.onOpenChange?.(next, details)
    if (details.canceled) {
      return
    }
    setOpen(next)
    reg.emit({
      key: 'open',
      previous: prev,
      value: next,
      reason: details.reason,
      source: details.source,
    })
  }

  const applyQuery = (next: string, reason: TriggerMenuQueryChangeReason, event?: Event) => {
    const prev = query()
    if (prev === next) {
      return
    }
    const details = createChangeDetails(reason, event)
    props.onQueryChange?.(next, details)
    if (details.canceled) {
      return
    }
    setQuery(next)
  }

  const handleInputChange = (el: HTMLInputElement | HTMLTextAreaElement, event: Event) => {
    const caret = el.selectionStart ?? el.value.length
    const found = findTriggerMatch(el.value, caret, triggerChars())
    setMatch(found)
    if (found) {
      applyQuery(found.query, 'input-change', event)
      const first = flatItems().find((it) => !it.disabled)
      setActiveValue(first?.value ?? null)
      applyOpen(true, 'input-change', event)
    } else {
      setActiveValue(null)
      applyOpen(false, 'input-change', event)
    }
  }

  const selectItem = (value: string, event?: Event, label?: string) => {
    const currentMatch = match()
    const binding = inheritedEditor?.()
    const def = activeTriggerDef()
    const matchedItem = flatItems().find((it) => it.value === value)
    const resolvedLabel = label ?? matchedItem?.label ?? value
    if (binding?.insertToken && currentMatch) {
      binding.insertToken(currentMatch.range, {
        label: resolvedLabel,
        value,
        type: def?.type,
      })
    } else {
      const el = resolvedInputEl()
      if (el && currentMatch) {
        textFieldAdapter(el).replace(currentMatch.range, `${value} `)
      }
    }
    props.onSelect?.({ value, match: currentMatch })
    setMatch(null)
    setActiveValue(null)
    applyOpen(false, 'item-press', event)
  }

  const handleEditorKeyDown = (event: KeyboardEvent): boolean => {
    if (!open()) {
      return false
    }
    const enabled = flatItems().filter((it) => !it.disabled)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (enabled.length > 0) {
        const curIdx = enabled.findIndex((it) => it.value === activeValue())
        const nextIdx = curIdx < 0 ? 0 : (curIdx + 1) % enabled.length
        setActiveValue(enabled[nextIdx]?.value ?? null)
      }
      return true
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (enabled.length > 0) {
        const curIdx = enabled.findIndex((it) => it.value === activeValue())
        const prevIdx = curIdx <= 0 ? enabled.length - 1 : curIdx - 1
        setActiveValue(enabled[prevIdx]?.value ?? null)
      }
      return true
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      const target = enabled.find((it) => it.value === activeValue()) ?? enabled[0]
      if (target) {
        event.preventDefault()
        selectItem(target.value, event, target.label)
        return true
      }
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      applyOpen(false, 'escape-key', event)
      return true
    }
    return false
  }

  onSettled(() => {
    const binding = inheritedEditor?.()
    if (!binding) {
      return
    }
    const unsubInput = binding.subscribeInput(handleInputChange)
    const unsubKey = binding.subscribeKeyDown(handleEditorKeyDown)
    return () => {
      unsubInput()
      unsubKey()
    }
  })

  const api: TriggerMenuApi = {
    open: (opts) => applyOpen(true, opts?.reason ?? 'imperative', opts?.event, opts?.source),
    close: (opts) => applyOpen(false, opts?.reason ?? 'imperative', opts?.event, opts?.source),
    setOpen: (next, opts) =>
      applyOpen(next, opts?.reason ?? 'imperative', opts?.event, opts?.source),
    isOpen: open,
    setQuery: (q) => applyQuery(q, 'imperative'),
    getQuery: query,
  }

  useController(() => props.controller, api)

  useDismissLayer({
    active: open,
    getElements: () => [contentEl(), resolvedAnchorEl(), resolvedInputEl()],
    dismissOnEscape: () => true,
    dismissOnOutsidePress: () => true,
    onDismiss: (reason, event) => applyOpen(false, reason, event),
  })

  const reg = registerComponent({
    component: 'trigger-menu',
    getElements: () => [resolvedInputEl(), contentEl()],
    getState: () => ({ open: open(), query: query() }),
    actions: {
      open: () => api.open(),
      close: () => api.close(),
      setQuery: (q) =>
        api.setQuery(typeof q === 'string' ? q : typeof q === 'number' ? String(q) : ''),
    },
  })

  return (
    <TriggerMenuContext
      value={{
        open,
        query,
        match,
        filteredItems,
        flatItems,
        activeValue,
        setActiveValue,
        contentId,
        container: () => props.container,
        handleInputChange,
        handleEditorKeyDown,
        selectItem,
        close: (reason, event) => applyOpen(false, reason, event),
        inputEl: resolvedInputEl,
        anchorEl: resolvedAnchorEl,
        setInputEl: (el) => setInputEl(el),
        contentEl,
        setContentEl: (el) => setContentEl(el),
        registerItem: (el) => items.add(el),
        getItems: () => Array.from(items).filter((el) => el.isConnected),
        triggers: () => props.triggers,
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
      <Show
        when={
          props.triggers &&
          props.triggers.length > 0 &&
          explicitContentCount() === 0 &&
          !ssrExplicitContent
        }
      >
        <AutoTriggerMenuContentContext value={true}>
          <TriggerMenuContent>
            <TriggerMenuList>
              <For each={filteredItems()}>
                {(entry) => (
                  <Show
                    when={!('items' in entry)}
                    fallback={
                      <TriggerMenuGroup>
                        <TriggerMenuGroupLabel>
                          {(entry as TriggerMenuDataGroup).label}
                        </TriggerMenuGroupLabel>
                        <For each={(entry as TriggerMenuDataGroup).items}>
                          {(sub) => (
                            <TriggerMenuItem
                              value={sub.value}
                              label={sub.label}
                              disabled={sub.disabled}
                            >
                              {sub.label ?? sub.value}
                            </TriggerMenuItem>
                          )}
                        </For>
                      </TriggerMenuGroup>
                    }
                  >
                    <TriggerMenuItem
                      value={(entry as TriggerMenuDataItem).value}
                      label={(entry as TriggerMenuDataItem).label}
                      disabled={(entry as TriggerMenuDataItem).disabled}
                    >
                      {(entry as TriggerMenuDataItem).label ?? (entry as TriggerMenuDataItem).value}
                    </TriggerMenuItem>
                  </Show>
                )}
              </For>
            </TriggerMenuList>
          </TriggerMenuContent>
        </AutoTriggerMenuContentContext>
      </Show>
    </TriggerMenuContext>
  )
}

export function TriggerMenuInput(props: PartProps<'textarea', TriggerMenuInputState>) {
  const ctx = useTriggerMenu('Input')
  const state = (): TriggerMenuInputState => ({ open: ctx.open(), query: ctx.query() })

  return renderPart('textarea', props, state, {
    ref: (el: HTMLTextAreaElement) => ctx.setInputEl(el),
    attrs: () => ({
      'data-slot': 'trigger-menu-input',
      'aria-autocomplete': 'list',
      'aria-haspopup': 'listbox',
      'aria-controls': ctx.open() ? ctx.contentId : undefined,
    }),
    handlers: {
      onInput: (event: Event) => {
        const el = event.currentTarget as HTMLInputElement | HTMLTextAreaElement
        ctx.handleInputChange(el, event)
      },
      onKeyDown: (event: KeyboardEvent) => {
        ctx.handleEditorKeyDown(event)
      },
    },
  })
}

export function TriggerMenuContent(
  props: TriggerMenuContentProps &
    Omit<PartProps<'div', TriggerMenuContentState>, keyof TriggerMenuContentProps>,
) {
  const ctx = useTriggerMenu('Content')
  const isAuto = useContext(AutoTriggerMenuContentContext)
  if (!isAuto) {
    if (typeof window === 'undefined') {
      ctx.registerExplicitContent()
    } else {
      onSettled(() => ctx.registerExplicitContent())
    }
  }
  const rest = omit(
    props,
    'container',
    'side',
    'align',
    'sideOffset',
    'alignOffset',
    'collisionPadding',
    'arrowPadding',
    'anchor',
    'keepMounted',
    'inline',
  )

  const pos = usePopupPosition({
    open: ctx.open,
    reference: () => props.anchor ?? ctx.anchorEl() ?? ctx.inputEl(),
    floating: ctx.contentEl,
    side: () => props.side ?? 'bottom',
    align: () => props.align ?? 'start',
    sideOffset: () => props.sideOffset ?? 4,
    alignOffset: () => props.alignOffset,
    collisionPadding: () => props.collisionPadding,
    arrowPadding: () => props.arrowPadding,
  })

  const state = (): TriggerMenuContentState => {
    const list = ctx.filteredItems()
    return {
      open: ctx.open(),
      side: pos.side(),
      align: pos.align(),
      query: ctx.query(),
      trigger: ctx.match()?.trigger ?? null,
      items: list,
      empty: list.length === 0,
    }
  }

  const portalMount = () =>
    props.container ??
    ctx.container() ??
    (ctx.anchorEl()?.closest('[data-example]') as HTMLElement | null) ??
    undefined

  const renderSurface = () =>
    renderPart('div', rest, state, {
      ref: ctx.setContentEl,
      attrs: () => ({
        id: props.id ?? ctx.contentId,
        'data-slot': 'trigger-menu-content',
        'data-trigger': ctx.match()?.trigger,
        hidden: ctx.open() ? undefined : true,
        'data-open': ctx.open() ? '' : undefined,
        'data-state': ctx.open() ? 'open' : 'closed',
        'data-side': pos.side(),
        'data-align': pos.align(),
      }),
      style: pos.style,
    })

  return (
    <Show when={ctx.open() || !!props.keepMounted}>
      <Show when={!props.inline} fallback={renderSurface()}>
        <Portal mount={portalMount()}>{renderSurface()}</Portal>
      </Show>
    </Show>
  )
}

export function TriggerMenuList(props: PartProps<'div', TriggerMenuContentState>) {
  const ctx = useTriggerMenu('List')
  const state = (): TriggerMenuContentState => {
    const list = ctx.filteredItems()
    return {
      open: ctx.open(),
      side: 'bottom',
      align: 'start',
      query: ctx.query(),
      trigger: ctx.match()?.trigger ?? null,
      items: list,
      empty: list.length === 0,
    }
  }
  return renderPart('div', props, state, {
    attrs: () => ({
      role: 'listbox',
      'data-slot': 'trigger-menu-list',
    }),
  })
}

export function TriggerMenuItems(props: PartProps<'div'>) {
  return renderPart('div', props, () => ({}))
}

export function TriggerMenuItem(
  props: TriggerMenuItemProps &
    Omit<PartProps<'div', TriggerMenuItemState>, keyof TriggerMenuItemProps>,
) {
  const ctx = useTriggerMenu('Item')
  let elRef: HTMLElement | undefined
  const highlighted = () => !props.disabled && ctx.activeValue() === props.value
  const state = (): TriggerMenuItemState => ({
    disabled: !!props.disabled,
    highlighted: highlighted(),
  })
  const rest = omit(props, 'value', 'label', 'disabled')

  return renderPart('div', rest, state, {
    ref: (el: HTMLElement) => {
      elRef = el
      if (el) {
        ctx.registerItem(el)
      }
    },
    attrs: () => ({
      role: 'option',
      tabindex: props.disabled ? undefined : -1,
      'data-slot': 'trigger-menu-item',
      'aria-disabled': props.disabled ? 'true' : undefined,
      'aria-selected': highlighted() ? 'true' : undefined,
      'data-disabled': props.disabled ? '' : undefined,
      'data-highlighted': highlighted() ? '' : undefined,
    }),
    handlers: {
      onPointerMove: () => {
        if (!props.disabled) {
          ctx.setActiveValue(props.value)
        }
      },
      onMouseDown: (event: MouseEvent) => {
        event.preventDefault()
      },
      onClick: (event: MouseEvent) => {
        if (props.disabled) {
          return
        }
        ctx.selectItem(props.value, event, props.label)
      },
      onKeyDown: (event: KeyboardEvent) => {
        if (!elRef) {
          return
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          if (!props.disabled) {
            ctx.selectItem(props.value, event, props.label)
          }
          return
        }
        navigateRoving(event, ctx.getItems(), elRef, { orientation: 'vertical', loop: true })
      },
    },
  })
}

export function TriggerMenuItemIcon(
  props: TriggerMenuItemIconProps & Omit<PartProps<'span', TriggerMenuItemIconState>, 'mirror'>,
) {
  const rest = omit(props, 'mirror')
  return renderPart('span', rest, () => ({ disabled: false }), {
    attrs: () => ({
      'data-slot': 'trigger-menu-item-icon',
      'aria-hidden': 'true',
      'data-mirror': props.mirror ? '' : undefined,
    }),
  })
}

export function TriggerMenuGroup(props: PartProps<'div'>) {
  return renderPart('div', props, () => ({}), {
    attrs: () => ({ role: 'group', 'data-slot': 'trigger-menu-group' }),
  })
}

export function TriggerMenuGroupLabel(props: PartProps<'div'>) {
  return renderPart('div', props, () => ({}), {
    attrs: () => ({ role: 'presentation', 'data-slot': 'trigger-menu-group-label' }),
  })
}

export function TriggerMenuSeparator(props: PartProps<'div'>) {
  return renderPart('div', props, () => ({}), {
    attrs: () => ({ role: 'separator', 'data-slot': 'trigger-menu-separator' }),
  })
}

export function TriggerMenuEmpty(props: PartProps<'div', TriggerMenuEmptyState>) {
  const ctx = useTriggerMenu('Empty')
  return (
    <Show when={ctx.filteredItems().length === 0}>
      {renderPart('div', props, () => ({ query: ctx.query(), empty: true }), {
        attrs: () => ({ 'data-slot': 'trigger-menu-empty' }),
      })}
    </Show>
  )
}

export function TriggerMenuHint(props: PartProps<'div', TriggerMenuHintState>) {
  const ctx = useTriggerMenu('Hint')
  return renderPart('div', props, () => ({ open: ctx.open() }), {
    attrs: () => ({ 'data-slot': 'trigger-menu-hint' }),
  })
}

export function TriggerMenuStatus(props: PartProps<'div', TriggerMenuStatusState>) {
  const ctx = useTriggerMenu('Status')
  return renderPart('div', props, () => ({ open: ctx.open(), query: ctx.query() }), {
    attrs: () => ({
      role: 'status',
      'aria-live': 'polite',
      'data-slot': 'trigger-menu-status',
    }),
  })
}
