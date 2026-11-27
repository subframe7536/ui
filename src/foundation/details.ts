/**
 * How the user or system caused a change.
 */
export type ChangeSource =
  | 'mouse'
  | 'touch'
  | 'pen'
  | 'keyboard'
  | 'virtual'
  | 'programmatic'
  | 'agent'

/**
 * Details passed to every `on<Key>Change` callback.
 */
export type ChangeDetails<
  Reason extends string = string,
  E extends Event | undefined = Event | undefined,
> = {
  /** Why the change happened. */
  reason: Reason
  /** How the change was triggered. */
  source: ChangeSource
  /** The DOM event behind the change, if any. */
  event?: E
  /** Prevent the component from applying the change in uncontrolled mode. */
  cancel: () => void
  /** Whether `cancel()` was called. */
  readonly canceled: boolean
}

/**
 * Options passed to imperative controller/API change methods.
 */
export type ChangeOptions<Reason extends string = string> = {
  reason?: Reason
  source?: ChangeSource
  event?: Event
}

let activeSource: ChangeSource | undefined

/**
 * Runs `fn` with `source` recorded as the active `ChangeSource` for any
 * component changes triggered synchronously inside `fn`.
 */
export function withSource<T>(source: ChangeSource, fn: () => T): T {
  const prev = activeSource
  activeSource = source
  try {
    return fn()
  } finally {
    activeSource = prev
  }
}

export function currentSource(): ChangeSource | undefined {
  return activeSource
}

export function inferSource(event?: Event, explicit?: ChangeSource): ChangeSource {
  if (explicit) {
    return explicit
  }
  if (activeSource) {
    return activeSource
  }
  if (!event) {
    return 'programmatic'
  }
  if (typeof PointerEvent !== 'undefined' && event instanceof PointerEvent) {
    if (event.pointerType === 'touch') {
      return 'touch'
    }
    if (event.pointerType === 'pen') {
      return 'pen'
    }
    if (event.pointerType === 'mouse') {
      return 'mouse'
    }
    return 'virtual'
  }
  if (typeof KeyboardEvent !== 'undefined' && event instanceof KeyboardEvent) {
    return 'keyboard'
  }
  if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent) {
    return 'touch'
  }
  if (typeof MouseEvent !== 'undefined' && event instanceof MouseEvent) {
    return event.detail === 0 ? 'virtual' : 'mouse'
  }
  return 'programmatic'
}

export function createChangeDetails<
  Reason extends string,
  E extends Event | undefined = Event | undefined,
>(reason: Reason, event?: E, source?: ChangeSource): ChangeDetails<Reason, E> {
  let isCanceled = false
  return {
    reason,
    source: inferSource(event, source),
    event,
    cancel() {
      isCanceled = true
    },
    get canceled() {
      return isCanceled
    },
  }
}
