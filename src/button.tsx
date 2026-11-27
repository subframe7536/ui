import type { JSX } from '@solidjs/web'
import { createSignal, omit } from 'solid-js'

import { runAction } from './foundation/action'
import type { ActionDetails } from './foundation/action'
import { inferSource } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { callHandler, renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'

export type ButtonActionDetails = ActionDetails

export type ButtonOptions = {
  disabled?: boolean
  focusableWhenDisabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  pendingAnnouncement?: string
  debug?: boolean
}

export type ButtonState = {
  disabled: boolean
  pending: boolean
  error: unknown
}

export type ButtonApi = {
  press: () => void
  isPending: () => boolean
  isDisabled: () => boolean
}

type ButtonClickEvent = Parameters<JSX.EventHandler<HTMLElement, MouseEvent>>[0]

type ButtonClickHandlers = {
  handler: (event: ButtonClickEvent, details: ButtonActionDetails) => unknown
  bound: (data: any, event: ButtonClickEvent, details: ButtonActionDetails) => unknown
}

export type ButtonProps = Omit<PartProps<'button', ButtonState>, 'type' | 'onClick'> &
  ButtonOptions & {
    onClick?: ButtonClickHandlers['handler'] | { 0: ButtonClickHandlers['bound']; 1: any }
  }

export function Button(props: ButtonProps) {
  const [pending, setPending] = createSignal(false)
  const [error, setError] = createSignal<unknown>(undefined)
  let rootEl: HTMLElement | undefined

  const isDisabled = () => !!props.disabled
  const state = (): ButtonState => ({
    disabled: isDisabled(),
    pending: pending(),
    error: error(),
  })

  const executePress = (event: MouseEvent) => {
    if (isDisabled() || pending()) {
      event.preventDefault()
      return
    }
    if (!props.onClick) {
      return
    }
    setError(undefined)
    const source = inferSource(event)
    runAction((details) => callHandler(props.onClick, event, details), source, {
      pending: setPending,
      done: () => {},
      failed: setError,
    })
  }

  registerComponent({
    component: 'button',
    getElements: () => [rootEl],
    getState: () => ({
      ...(pending() ? { pending: true } : {}),
      ...(error() ? { error: String(error()) } : {}),
    }),
    getDisabled: () => isDisabled() || pending(),
    actions: {
      press: () => {
        if (isDisabled() || pending()) {
          return
        }
        const synthetic = new MouseEvent('click', { bubbles: true, cancelable: true })
        executePress(synthetic)
      },
    },
  })

  const rest = omit(
    props,
    'disabled',
    'focusableWhenDisabled',
    'type',
    'pendingAnnouncement',
    'debug',
    'onClick',
  )

  return renderPart('button', rest, state, {
    ref: (el: HTMLElement) => {
      rootEl = el
    },
    attrs: () => {
      const disabled = isDisabled()
      const isPending = pending()
      const nativeDisabled = disabled && !props.focusableWhenDisabled && !isPending
      const ariaDisabled = (disabled && props.focusableWhenDisabled) || isPending
      return {
        type: props.type ?? 'button',
        disabled: nativeDisabled || undefined,
        'aria-disabled': ariaDisabled ? 'true' : undefined,
        'aria-busy': isPending ? 'true' : undefined,
        'data-disabled': disabled ? '' : undefined,
        'data-pending': isPending ? '' : undefined,
      }
    },
    handlers: {
      onClick: executePress,
    },
  })
}
