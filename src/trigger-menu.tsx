import { Portal } from '@solidjs/web'
import type { JSX } from '@solidjs/web'
import { createContext, createSignal, createUniqueId, omit, Show, useContext } from 'solid-js'

import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { useDismissLayer } from './foundation/dismissal'
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

export type TriggerMenuDataItem = { id?: string; value: string; label: string; disabled?: boolean }
export type TriggerMenuDataGroup = { label: string; items: Array<TriggerMenuDataItem> }
export type TriggerMenuData = Array<TriggerMenuDataItem | TriggerMenuDataGroup>
export type TriggerItemsLoader = (match: TriggerMatch) => TriggerMenuData | Promise<TriggerMenuData>

export type TriggerRule = {
  trigger?: string
  char?: string
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
export type TriggerMenuContentState = { open: boolean; side: Side; align: Align; query: string }
export type TriggerMenuItemProps = { value: string; disabled?: boolean }
export type TriggerMenuItemState = { disabled: boolean }
export type TriggerMenuItemIconProps = { mirror?: boolean }
export type TriggerMenuItemIconState = { disabled: boolean }
export type TriggerMenuEmptyState = { query: string }
export type TriggerMenuHintState = { open: boolean }
export type TriggerMenuStatusState = { open: boolean; query: string }

type TriggerMenuContextValue = {
  open: () => boolean
  query: () => string
  match: () => TriggerMatch | null
  contentId: string
  container: () => HTMLElement | null | undefined
  handleInputChange: (el: HTMLInputElement | HTMLTextAreaElement, event: Event) => void
  selectItem: (value: string, event?: Event) => void
  close: (reason: TriggerMenuOpenChangeReason, event?: Event) => void
  inputEl: () => HTMLInputElement | HTMLTextAreaElement | undefined
  setInputEl: (el: HTMLInputElement | HTMLTextAreaElement) => void
  contentEl: () => HTMLElement | undefined
  setContentEl: (el: HTMLElement) => void
  registerItem: (el: HTMLElement) => void
  getItems: () => Array<HTMLElement>
}

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

/**
 * Inline mention / slash-command trigger menu bound to a text input or editor.
 */
export function TriggerMenu(props: TriggerMenuProps) {
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
  const [inputEl, setInputEl] = createSignal<HTMLInputElement | HTMLTextAreaElement | undefined>(
    undefined,
  )
  const [contentEl, setContentEl] = createSignal<HTMLElement | undefined>(undefined)

  const triggerChars = (): Array<string> => {
    if (!props.triggers || props.triggers.length === 0) {
      return ['@', '/']
    }
    return props.triggers.map((t) => (typeof t === 'string' ? t : (t.trigger ?? t.char ?? '')))
  }

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
      applyOpen(true, 'input-change', event)
    } else {
      applyOpen(false, 'input-change', event)
    }
  }

  const selectItem = (value: string, event?: Event) => {
    const currentMatch = match()
    const el = inputEl()
    if (el && currentMatch) {
      textFieldAdapter(el).replace(currentMatch.range, `${value} `)
    }
    props.onSelect?.({ value, match: currentMatch })
    applyOpen(false, 'item-press', event)
  }

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
    getElements: () => [contentEl(), inputEl()],
    dismissOnEscape: () => true,
    dismissOnOutsidePress: () => true,
    onDismiss: (reason, event) => applyOpen(false, reason, event),
  })

  const reg = registerComponent({
    component: 'trigger-menu',
    getElements: () => [inputEl(), contentEl()],
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
        contentId,
        container: () => props.container,
        handleInputChange,
        selectItem,
        close: (reason, event) => applyOpen(false, reason, event),
        inputEl,
        setInputEl: (el) => setInputEl(el),
        contentEl,
        setContentEl: (el) => setContentEl(el),
        registerItem: (el) => items.add(el),
        getItems: () => Array.from(items).filter((el) => el.isConnected),
      }}
    >
      {props.children}
    </TriggerMenuContext>
  )
}

export function TriggerMenuInput(props: PartProps<'textarea', TriggerMenuInputState>) {
  const ctx = useTriggerMenu('Input')
  const state = (): TriggerMenuInputState => ({ open: ctx.open(), query: ctx.query() })

  return renderPart('textarea', props, state, {
    ref: (el: HTMLTextAreaElement) => ctx.setInputEl(el),
    attrs: () => ({
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
        if (!ctx.open()) {
          return
        }
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          ctx.getItems()[0]?.focus()
        }
      },
    },
  })
}

export function TriggerMenuContent(
  props: TriggerMenuContentProps &
    Omit<PartProps<'div', TriggerMenuContentState>, keyof TriggerMenuContentProps>,
) {
  const ctx = useTriggerMenu('Content')
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
    reference: () => props.anchor ?? ctx.inputEl(),
    floating: ctx.contentEl,
    side: () => props.side ?? 'bottom',
    align: () => props.align ?? 'start',
    sideOffset: () => props.sideOffset ?? 4,
    alignOffset: () => props.alignOffset,
    collisionPadding: () => props.collisionPadding,
    arrowPadding: () => props.arrowPadding,
  })

  const state = (): TriggerMenuContentState => ({
    open: ctx.open(),
    side: pos.side(),
    align: pos.align(),
    query: ctx.query(),
  })

  const renderSurface = () =>
    renderPart('div', rest, state, {
      ref: ctx.setContentEl,
      attrs: () => ({
        id: props.id ?? ctx.contentId,
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
        <Portal mount={props.container ?? ctx.container() ?? undefined}>{renderSurface()}</Portal>
      </Show>
    </Show>
  )
}

export function TriggerMenuList(props: PartProps<'div'>) {
  return renderPart('div', props, () => ({}), {
    attrs: () => ({ role: 'listbox' }),
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
  const state = (): TriggerMenuItemState => ({ disabled: !!props.disabled })
  const rest = omit(props, 'value', 'disabled')

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
      'aria-disabled': props.disabled ? 'true' : undefined,
      'data-disabled': props.disabled ? '' : undefined,
    }),
    handlers: {
      onClick: (event: MouseEvent) => {
        if (props.disabled) {
          return
        }
        ctx.selectItem(props.value, event)
      },
      onKeyDown: (event: KeyboardEvent) => {
        if (!elRef) {
          return
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          if (!props.disabled) {
            ctx.selectItem(props.value, event)
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
      'aria-hidden': 'true',
      'data-mirror': props.mirror ? '' : undefined,
    }),
  })
}

export function TriggerMenuGroup(props: PartProps<'div'>) {
  return renderPart('div', props, () => ({}), { attrs: () => ({ role: 'group' }) })
}

export function TriggerMenuGroupLabel(props: PartProps<'div'>) {
  return renderPart('div', props, () => ({}), { attrs: () => ({ role: 'presentation' }) })
}

export function TriggerMenuSeparator(props: PartProps<'div'>) {
  return renderPart('div', props, () => ({}), { attrs: () => ({ role: 'separator' }) })
}

export function TriggerMenuEmpty(props: PartProps<'div', TriggerMenuEmptyState>) {
  const ctx = useTriggerMenu('Empty')
  return renderPart('div', props, () => ({ query: ctx.query() }))
}

export function TriggerMenuHint(props: PartProps<'div', TriggerMenuHintState>) {
  const ctx = useTriggerMenu('Hint')
  return renderPart('div', props, () => ({ open: ctx.open() }))
}

export function TriggerMenuStatus(props: PartProps<'div', TriggerMenuStatusState>) {
  const ctx = useTriggerMenu('Status')
  return renderPart('div', props, () => ({ open: ctx.open(), query: ctx.query() }), {
    attrs: () => ({ role: 'status', 'aria-live': 'polite' }),
  })
}
