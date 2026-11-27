export type ChangeSource =
  | 'mouse'
  | 'touch'
  | 'pen'
  | 'keyboard'
  | 'virtual'
  | 'programmatic'
  | 'agent'

export type ChangeDetails<
  Reason extends string = string,
  E extends Event | undefined = Event | undefined,
> = {
  reason: Reason
  source: ChangeSource
  event?: E
  cancel: () => void
  readonly canceled: boolean
}

export type ChangeOptions<Reason extends string = string> = {
  reason?: Reason
  source?: ChangeSource
  event?: Event
}

let activeSource: ChangeSource | undefined

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
