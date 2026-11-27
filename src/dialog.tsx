import type { JSX } from '@solidjs/web'
import {
  Show,
  createContext,
  createMemo,
  createSignal,
  createUniqueId,
  merge,
  omit,
  onSettled,
  untrack,
  useContext,
} from 'solid-js'

import { markPopupResult, runAction } from './foundation/action'
import type { ActionDetails } from './foundation/action'
import {
  createController,
  useController,
  useControllerEntry,
  useControllerTarget,
} from './foundation/controller'
import { createChangeDetails, inferSource } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { useDismissLayer } from './foundation/dismissal'
import { useFocusManagement } from './foundation/focus'
import type { FocusTarget } from './foundation/focus'
import type { PortalProps } from './foundation/popup'
import { registerComponent } from './foundation/registry'
import {
  SafePortal,
  formatAriaKeyShortcuts,
  formatDisplayShortcut,
  renderPart,
} from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type DialogOpenChangeReason =
  | 'trigger-press'
  | 'close-press'
  | 'escape-key'
  | 'outside-press'
  | 'action'
  | 'shortcut'
  | 'imperative'

export type DialogPayloadChangeReason = 'trigger-press' | 'shortcut' | 'imperative'
export type DialogDismissReason = 'escape-key' | 'outside-press'
export type DialogInitialFocus = FocusTarget
export type DialogFinalFocus = FocusTarget
export type DialogCloseActionDetails = ActionDetails

export type DialogOpenChangeDetails<Reason extends string = DialogOpenChangeReason> =
  ChangeDetails<Reason>

export type DialogApi<Payload = unknown, Result = string> = {
  open: (
    payload?: Payload,
    options?: ChangeOptions<DialogOpenChangeReason>,
  ) => Promise<Result | undefined>
  close: (options?: { returnValue?: Result } & ChangeOptions<DialogOpenChangeReason>) => void
  setOpen: (open: boolean, options?: ChangeOptions<DialogOpenChangeReason>) => void
  isOpen: () => boolean
  getPayload: () => Payload | undefined
}

export function createDialogController<Payload = unknown, Result = string>() {
  return createController<DialogApi<Payload, Result>>()
}

export type DialogController<Payload = unknown, Result = string> = ReturnType<
  typeof createDialogController<Payload, Result>
>

export type DialogOptions<Payload = unknown, Result = string> = PortalProps & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean, details: DialogOpenChangeDetails) => void
  modal?: boolean
  closeOnEscape?: boolean
  closeOnOutsidePress?: boolean
  initialFocus?: DialogInitialFocus
  finalFocus?: DialogFinalFocus
  payload?: Payload
  controller?: DialogController<Payload, Result>
  debug?: boolean
}

export type DialogProps<Payload = unknown, Result = string> = DialogOptions<Payload, Result> & {
  children?: JSX.Element
}

export type DialogTriggerProps<Payload = unknown, Result = string> = {
  disabled?: boolean
  focusableWhenDisabled?: boolean
  payload?: Payload
  shortcut?: string
  controller?: DialogController<Payload, Result>
}

export type DialogTriggerState = {
  open: boolean
  disabled: boolean
}

export type DialogBackdropState = {
  open: boolean
}

export type DialogContentProps = PortalProps & {
  keepMounted?: boolean
  initialFocus?: DialogInitialFocus
  finalFocus?: DialogFinalFocus
}

export type DialogContentState<Payload = unknown> = {
  open: boolean
  modal: boolean
  payload: Payload | undefined
}

export type DialogCloseProps<Result = string> = {
  disabled?: boolean
  returnValue?: Result
  action?: (details: DialogCloseActionDetails) => unknown
}

export type DialogCloseState = {
  disabled: boolean
  pending: boolean
  error: unknown
}

export type DialogShortcutProps = object
export type DialogShortcutState = { shortcut: string | undefined }

type DialogContextValue = {
  role: 'dialog' | 'alertdialog'
  open: () => boolean
  modal: () => boolean
  payload: () => unknown
  container: () => HTMLElement | null | undefined
  contentId: string
  titleId: string
  descriptionId: string
  hasTitle: () => boolean
  hasDescription: () => boolean
  setHasTitle: (v: boolean) => void
  setHasDescription: (v: boolean) => void
  openFromTrigger: (payload: unknown, event?: Event) => void
  close: (reason: DialogOpenChangeReason, event?: Event, returnValue?: unknown) => void
  setTriggerEl: (el: HTMLElement) => void
  setContentEl: (el: HTMLElement) => void
  getContentEl: () => HTMLElement | undefined
  initialFocus: () => DialogInitialFocus | undefined
  finalFocus: () => DialogFinalFocus | undefined
}

const DialogContext = createContext<DialogContextValue | null>(null)
const TriggerShortcutContext = createContext<() => string | undefined>(() => undefined)

function useDialogContext(part: string): DialogContextValue {
  const ctx = useContext(DialogContext)
  if (!ctx) {
    throw new Error(`<Dialog${part}> must be used inside <Dialog>.`)
  }
  return ctx
}

/**
 * Internal shared root used by both `Dialog` and `AlertDialog`.
 */
export function createDialogRoot(role: 'dialog' | 'alertdialog', defaultCloseOnOutside: boolean) {
  return function DialogRoot<Payload = unknown, Result = string>(
    props: DialogProps<Payload, Result>,
  ) {
    const uid = createUniqueId()
    const contentId = `ui-${role}-${uid}`
    const titleId = `ui-${role}-title-${uid}`
    const descriptionId = `ui-${role}-desc-${uid}`

    const [open, setOpen] = createControlledSignal<boolean>({
      value: () => props.open,
      defaultValue: () => !!props.defaultOpen,
    })
    const [payload, setPayload] = createSignal<Payload | undefined>(
      untrack(() => props.payload) as never,
    )
    const [hasTitle, setHasTitle] = createSignal(false)
    const [hasDescription, setHasDescription] = createSignal(false)

    let triggerEl: HTMLElement | undefined
    let contentEl: HTMLElement | undefined
    let pendingResolve: ((result: Result | undefined) => void) | undefined

    const modal = () => props.modal ?? true

    const applyOpen = (
      next: boolean,
      reason: DialogOpenChangeReason,
      event?: Event,
      source?: ChangeOptions['source'],
      returnValue?: Result,
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
      if (!next && pendingResolve) {
        const resolve = pendingResolve
        pendingResolve = undefined
        resolve(returnValue)
      }
      reg.emit({
        key: 'open',
        previous: prev,
        value: next,
        reason: details.reason,
        source: details.source,
      })
    }

    const api: DialogApi<Payload, Result> = {
      open: (nextPayload, opts) => {
        if (nextPayload !== undefined) {
          setPayload(() => nextPayload)
        }
        applyOpen(true, opts?.reason ?? 'imperative', opts?.event, opts?.source)
        return markPopupResult(
          new Promise<Result | undefined>((resolve) => {
            pendingResolve = resolve
          }),
        )
      },
      close: (opts) =>
        applyOpen(
          false,
          opts?.reason ?? 'imperative',
          opts?.event,
          opts?.source,
          opts?.returnValue,
        ),
      setOpen: (next, opts) =>
        applyOpen(next, opts?.reason ?? 'imperative', opts?.event, opts?.source),
      isOpen: open,
      getPayload: () => (props.payload !== undefined ? props.payload : payload()),
    }

    useController(() => props.controller, api)

    useDismissLayer({
      active: open,
      getElements: () => [contentEl],
      dismissOnEscape: () => props.closeOnEscape ?? true,
      dismissOnOutsidePress: () => props.closeOnOutsidePress ?? defaultCloseOnOutside,
      onDismiss: (reason, event) => applyOpen(false, reason, event),
    })

    const reg = registerComponent({
      component: role,
      getElements: () => [contentEl, triggerEl],
      getState: () => ({ open: open() }),
      getText: () => {
        if (!contentEl) {
          return []
        }
        const title = document.getElementById(titleId)?.textContent?.trim()
        const desc = document.getElementById(descriptionId)?.textContent?.trim()
        return [title, desc].filter((t): t is string => !!t)
      },
      getButtons: () => {
        if (!contentEl) {
          return []
        }
        return Array.from(contentEl.querySelectorAll('button'))
          .map((btn) => btn.textContent?.trim())
          .filter((t): t is string => !!t)
      },
      actions: {
        open: (p) => api.open(p as Payload),
        close: () => api.close(),
        setOpen: (next) => api.setOpen(Boolean(next)),
        press: (buttonLabel) => {
          if (!contentEl) {
            return
          }
          const needle = (
            typeof buttonLabel === 'string'
              ? buttonLabel
              : typeof buttonLabel === 'number'
                ? String(buttonLabel)
                : ''
          )
            .trim()
            .toLowerCase()
          const target = Array.from(contentEl.querySelectorAll('button')).find(
            (btn) => btn.textContent?.trim().toLowerCase() === needle,
          )
          target?.click()
        },
      },
    })

    const ctx: DialogContextValue = {
      role,
      open,
      modal,
      payload: () => (props.payload !== undefined ? props.payload : payload()),
      container: () => props.container,
      contentId,
      titleId,
      descriptionId,
      hasTitle,
      hasDescription,
      setHasTitle,
      setHasDescription,
      openFromTrigger: (nextPayload, event) => {
        if (nextPayload !== undefined) {
          setPayload(() => nextPayload as Payload)
        }
        applyOpen(true, 'trigger-press', event)
      },
      close: (reason, event, returnValue) =>
        applyOpen(false, reason, event, undefined, returnValue as Result | undefined),
      setTriggerEl: (el) => {
        triggerEl = el
      },
      setContentEl: (el) => {
        contentEl = el
      },
      getContentEl: () => contentEl,
      initialFocus: () => props.initialFocus,
      finalFocus: () => props.finalFocus,
    }

    useControllerEntry(() => props.controller, ctx)

    return <DialogContext value={ctx}>{props.children}</DialogContext>
  }
}

/**
 * A modal or non-modal dialog window over the page.
 */
export const Dialog = createDialogRoot('dialog', true)

/**
 * Button that opens the dialog. Connects to an external dialog via `controller`.
 */
export function DialogTrigger<Payload = unknown>(
  props: DialogTriggerProps<Payload> &
    Omit<PartProps<'button', DialogTriggerState>, 'value' | 'onChange' | 'type'>,
) {
  const target = useControllerTarget(() => props.controller, useContext(DialogContext))
  const rest = omit(props, 'disabled', 'focusableWhenDisabled', 'payload', 'shortcut', 'controller')
  const state = (): DialogTriggerState => ({
    open: target()?.open() ?? false,
    disabled: !!props.disabled,
  })

  const shortcut = createMemo(() => props.shortcut)
  return (
    <TriggerShortcutContext value={shortcut}>
      {renderPart('button', rest, state, {
        ref: (el: HTMLElement) => target()?.setTriggerEl(el),
        attrs: () => {
          const s = state()
          const ctx = target()
          const focusableDisabled = s.disabled && !!props.focusableWhenDisabled
          const isModal = ctx ? ctx.modal() : true
          return {
            type: 'button',
            'data-slot': 'dialog-trigger',
            'aria-haspopup': 'dialog',
            'aria-expanded': isModal ? undefined : s.open ? 'true' : 'false',
            'aria-controls': ctx?.contentId,
            'aria-keyshortcuts': formatAriaKeyShortcuts(props.shortcut),
            disabled: s.disabled && !focusableDisabled ? true : undefined,
            'aria-disabled': focusableDisabled ? 'true' : undefined,
            'data-open': s.open ? '' : undefined,
            'data-closed': !s.open ? '' : undefined,
            'data-state': s.open ? 'open' : 'closed',
            'data-disabled': s.disabled ? '' : undefined,
          }
        },
        handlers: {
          onClick: (event: MouseEvent) => {
            if (props.disabled) {
              return
            }
            target()?.openFromTrigger(props.payload, event)
          },
        },
      })}
    </TriggerShortcutContext>
  )
}

/**
 * Optional backdrop dimmed behind the dialog content.
 */
export function DialogBackdrop(props: PartProps<'div', DialogBackdropState>) {
  const ctx = useDialogContext('Backdrop')
  const state = (): DialogBackdropState => ({ open: ctx.open() })

  return (
    <Show when={ctx.open()}>
      <SafePortal mount={ctx.container() ?? undefined}>
        {renderPart('div', props, state, {
          attrs: () => ({
            'data-slot': 'dialog-backdrop',
            'aria-hidden': 'true',
            'data-open': ctx.open() ? '' : undefined,
            'data-state': ctx.open() ? 'open' : 'closed',
          }),
        })}
      </SafePortal>
    </Show>
  )
}

/**
 * The dialog surface itself, with ARIA labeling and focus trapping.
 */
export function DialogContent<Payload = unknown>(
  props: DialogContentProps &
    Omit<PartProps<'div', DialogContentState<Payload>>, keyof DialogContentProps>,
) {
  const ctx = useDialogContext('Content')
  const rest = omit(props, 'container', 'keepMounted', 'initialFocus', 'finalFocus')
  const state = (): DialogContentState<Payload> => ({
    open: ctx.open(),
    modal: ctx.modal(),
    payload: ctx.payload() as Payload | undefined,
  })

  useFocusManagement({
    active: ctx.open,
    container: ctx.getContentEl,
    trap: ctx.modal,
    initialFocus: () => props.initialFocus ?? ctx.initialFocus(),
    finalFocus: () => props.finalFocus ?? ctx.finalFocus(),
  })

  const shouldRender = () => ctx.open() || !!props.keepMounted

  return (
    <Show when={shouldRender()}>
      <SafePortal mount={props.container ?? ctx.container() ?? undefined}>
        {renderPart('div', rest, state, {
          ref: ctx.setContentEl,
          attrs: () => {
            const open = ctx.open()
            return {
              role: ctx.role,
              'data-slot': 'dialog-content',
              id: props.id ?? ctx.contentId,
              tabindex: -1,
              'aria-modal': ctx.modal() ? 'true' : undefined,
              'aria-labelledby': ctx.hasTitle() ? ctx.titleId : undefined,
              'aria-describedby': ctx.hasDescription() ? ctx.descriptionId : undefined,
              hidden: open ? undefined : true,
              'data-open': open ? '' : undefined,
              'data-closed': !open ? '' : undefined,
              'data-state': open ? 'open' : 'closed',
            }
          },
        })}
      </SafePortal>
    </Show>
  )
}

/**
 * Accessible title of the dialog (`h2` by default).
 */
export function DialogTitle(props: PartProps<'h2'>) {
  const ctx = useDialogContext('Title')
  onSettled(() => {
    ctx.setHasTitle(true)
    return () => ctx.setHasTitle(false)
  })
  return renderPart('h2', props, () => ({}), {
    attrs: () => ({ id: props.id ?? ctx.titleId, 'data-slot': 'dialog-title' }),
  })
}

/**
 * Accessible description of the dialog (`p` by default).
 */
export function DialogDescription(props: PartProps<'p'>) {
  const ctx = useDialogContext('Description')
  onSettled(() => {
    ctx.setHasDescription(true)
    return () => ctx.setHasDescription(false)
  })
  return renderPart('p', props, () => ({}), {
    attrs: () => ({ id: props.id ?? ctx.descriptionId, 'data-slot': 'dialog-description' }),
  })
}

/**
 * Button that closes the dialog, optionally running an async `action` before closing.
 */
export function DialogClose<Result = string>(
  props: DialogCloseProps<Result> &
    Omit<PartProps<'button', DialogCloseState>, keyof DialogCloseProps<Result> | 'type'>,
) {
  const ctx = useDialogContext('Close')
  const [pending, setPending] = createSignal(false)
  const [error, setError] = createSignal<unknown>(undefined)

  const state = (): DialogCloseState => ({
    disabled: !!props.disabled,
    pending: pending(),
    error: error(),
  })

  const rest = omit(props, 'disabled', 'returnValue', 'action')

  return renderPart('button', rest, state, {
    attrs: () => ({
      type: 'button',
      'data-slot': 'dialog-close',
      disabled: props.disabled || undefined,
      'aria-busy': pending() ? 'true' : undefined,
      'aria-disabled': pending() ? 'true' : undefined,
      'data-pending': pending() ? '' : undefined,
      'data-disabled': props.disabled ? '' : undefined,
    }),
    handlers: {
      onClick: (event: MouseEvent) => {
        if (props.disabled || pending()) {
          return
        }
        if (!props.action) {
          ctx.close('close-press', event, props.returnValue)
          return
        }
        setError(undefined)
        runAction(props.action, inferSource(event), {
          pending: setPending,
          done: () => ctx.close('action', event, props.returnValue),
          failed: setError,
        })
      },
    },
  })
}

/**
 * Displays a trigger's keyboard shortcut visually while staying hidden from screen readers.
 */
export function DialogShortcut(props: DialogShortcutProps & PartProps<'kbd', DialogShortcutState>) {
  const shortcut = useContext(TriggerShortcutContext)
  const formatted = () => formatDisplayShortcut(shortcut())
  const merged = merge(omit(props, 'children'), {
    get children() {
      return props.children !== undefined ? props.children : formatted()
    },
  })
  return renderPart('kbd', merged, () => ({ shortcut: formatted() }), {
    attrs: () => ({ 'aria-hidden': 'true', 'data-slot': 'dialog-shortcut' }),
  })
}
