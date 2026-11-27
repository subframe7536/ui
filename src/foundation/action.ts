import { withSource } from './details'
import type { ChangeSource } from './details'

export const DEFAULT_PENDING_ANNOUNCEMENT = 'Loading'
export const PENDING_ANNOUNCE_DELAY = 1000

export type ActionDetails = {
  source: ChangeSource
}

const popupResults = new WeakSet<object>()

export function markPopupResult<T extends object>(promise: T): T {
  popupResults.add(promise)
  return promise
}

function isPendingPromise(value: unknown): value is PromiseLike<unknown> {
  return (
    !!value &&
    typeof (value as PromiseLike<unknown>).then === 'function' &&
    !popupResults.has(value)
  )
}

export function runAction(
  action: (details: ActionDetails) => unknown,
  source: ChangeSource,
  handlers: {
    pending: (pending: boolean) => void
    done: () => void
    failed: (error: unknown) => void
  },
): void {
  let result: unknown
  try {
    result = action({ source })
  } catch (error) {
    handlers.failed(error)
    return
  }

  if (!isPendingPromise(result)) {
    withSource(source, handlers.done)
    return
  }

  handlers.pending(true)
  Promise.resolve(result).then(
    () => {
      handlers.pending(false)
      withSource(source, handlers.done)
    },
    (error) => {
      handlers.pending(false)
      handlers.failed(error)
    },
  )
}
