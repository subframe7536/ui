import { createContext, createUniqueId, omit, Show, useContext } from 'solid-js'

import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type CollapsibleOpenChangeReason = 'trigger-press' | 'find-in-page' | 'imperative'
export type CollapsibleChangeOptions = ChangeOptions<CollapsibleOpenChangeReason>

export type CollapsibleApi = {
  open: (options?: CollapsibleChangeOptions) => void
  close: (options?: CollapsibleChangeOptions) => void
  toggle: (options?: CollapsibleChangeOptions) => void
  setOpen: (open: boolean, options?: CollapsibleChangeOptions) => void
  isOpen: () => boolean
}

export function createCollapsibleController() {
  return createController<CollapsibleApi>()
}

export type CollapsibleController = ReturnType<typeof createCollapsibleController>

export type CollapsibleOptions = {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: ChangeDetails<CollapsibleOpenChangeReason>) => void
  disabled?: boolean
  controller?: CollapsibleController
  debug?: boolean
}

export type CollapsibleState = {
  open: boolean
  disabled: boolean
}

export type CollapsibleTriggerProps = {}
export type CollapsibleTriggerState = CollapsibleState

export type CollapsiblePanelProps = {
  keepMounted?: boolean
  hiddenUntilFound?: boolean
}

export type CollapsiblePanelState = CollapsibleState

type CollapsibleContextValue = {
  state: () => CollapsibleState
  panelId: string
  toggle: (event?: Event) => void
  openFromFind: (event?: Event) => void
  setTriggerEl: (el: HTMLElement) => void
  setPanelEl: (el: HTMLElement) => void
}

const CollapsibleContext = createContext<CollapsibleContextValue | null>(null)

function useCollapsibleContext(part: string): CollapsibleContextValue {
  const ctx = useContext(CollapsibleContext)
  if (!ctx) {
    throw new Error(`<Collapsible${part}> must be used inside <Collapsible>.`)
  }
  return ctx
}

export function Collapsible(
  props: CollapsibleOptions & Omit<PartProps<'div', CollapsibleState>, keyof CollapsibleOptions>,
) {
  const panelId = `ui-collapsible-${createUniqueId()}`
  let rootEl: HTMLElement | undefined
  let triggerEl: HTMLElement | undefined
  let panelEl: HTMLElement | undefined

  const [open, setOpen] = createControlledSignal<boolean>({
    value: () => props.open,
    defaultValue: () => !!props.defaultOpen,
  })

  const state = (): CollapsibleState => ({
    open: open(),
    disabled: !!props.disabled,
  })

  const applyOpen = (
    next: boolean,
    reason: CollapsibleOpenChangeReason,
    event?: Event,
    source?: ChangeOptions['source'],
  ) => {
    if (props.disabled && reason !== 'imperative') {
      return
    }
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

  const api: CollapsibleApi = {
    open: (options) =>
      applyOpen(true, options?.reason ?? 'imperative', options?.event, options?.source),
    close: (options) =>
      applyOpen(false, options?.reason ?? 'imperative', options?.event, options?.source),
    toggle: (options) =>
      applyOpen(!open(), options?.reason ?? 'imperative', options?.event, options?.source),
    setOpen: (next, options) =>
      applyOpen(next, options?.reason ?? 'imperative', options?.event, options?.source),
    isOpen: open,
  }

  useController(() => props.controller, api)

  const reg = registerComponent({
    component: 'collapsible',
    getElements: () => [rootEl, triggerEl, panelEl],
    getState: () => ({ open: open() }),
    getDisabled: () => !!props.disabled,
    actions: {
      open: () => api.open(),
      close: () => api.close(),
      toggle: () => api.toggle(),
      setOpen: (next) => api.setOpen(Boolean(next)),
    },
  })

  const rest = omit(props, 'open', 'defaultOpen', 'onOpenChange', 'disabled', 'controller', 'debug')

  return (
    <CollapsibleContext
      value={{
        state,
        panelId,
        toggle: (event) => applyOpen(!open(), 'trigger-press', event),
        openFromFind: (event) => applyOpen(true, 'find-in-page', event),
        setTriggerEl: (el) => {
          triggerEl = el
        },
        setPanelEl: (el) => {
          panelEl = el
        },
      }}
    >
      {renderPart('div', rest, state, {
        ref: (el: HTMLElement) => {
          rootEl = el
        },
        attrs: () => {
          const s = state()
          return {
            'data-open': s.open ? '' : undefined,
            'data-closed': !s.open ? '' : undefined,
            'data-state': s.open ? 'open' : 'closed',
            'data-disabled': s.disabled ? '' : undefined,
          }
        },
      })}
    </CollapsibleContext>
  )
}

export function CollapsibleTrigger(
  props: CollapsibleTriggerProps & PartProps<'button', CollapsibleTriggerState>,
) {
  const ctx = useCollapsibleContext('Trigger')
  return renderPart('button', props, ctx.state, {
    ref: ctx.setTriggerEl,
    attrs: () => {
      const s = ctx.state()
      return {
        type: 'button',
        'aria-expanded': s.open ? 'true' : 'false',
        'aria-controls': ctx.panelId,
        disabled: s.disabled || undefined,
        'data-open': s.open ? '' : undefined,
        'data-closed': !s.open ? '' : undefined,
        'data-state': s.open ? 'open' : 'closed',
        'data-disabled': s.disabled ? '' : undefined,
      }
    },
    handlers: {
      onClick: (event: MouseEvent) => ctx.toggle(event),
    },
  })
}

export function CollapsiblePanel(
  props: CollapsiblePanelProps &
    Omit<PartProps<'div', CollapsiblePanelState>, keyof CollapsiblePanelProps>,
) {
  const ctx = useCollapsibleContext('Panel')
  const rest = omit(props, 'keepMounted', 'hiddenUntilFound')
  const shouldRender = () => ctx.state().open || !!props.keepMounted || !!props.hiddenUntilFound

  return (
    <Show when={shouldRender()}>
      {renderPart('div', rest, ctx.state, {
        ref: ctx.setPanelEl,
        attrs: () => {
          const s = ctx.state()
          return {
            id: props.id ?? ctx.panelId,
            hidden: s.open ? undefined : props.hiddenUntilFound ? 'until-found' : true,
            'data-open': s.open ? '' : undefined,
            'data-closed': !s.open ? '' : undefined,
            'data-state': s.open ? 'open' : 'closed',
            'data-disabled': s.disabled ? '' : undefined,
          }
        },
        handlers: {
          onBeforeMatch: (event: Event) => ctx.openFromFind(event),
        },
      })}
    </Show>
  )
}
