import type { JSX } from '@solidjs/web'
import { createSignal, For } from 'solid-js'

export type OverlayEntry<Result = unknown> = {
  id: string
  render: (close: (result?: Result) => void) => JSX.Element
  resolve: (result: Result | undefined) => void
}

export type Overlays = {
  entries: () => Array<OverlayEntry>
  open: <Result = unknown>(
    render: (close: (result?: Result) => void) => JSX.Element,
  ) => Promise<Result | undefined>
  close: (id: string, result?: unknown) => void
  closeAll: () => void
}

let overlayCounter = 1

export function createOverlays(): Overlays {
  const [entries, setEntries] = createSignal<Array<OverlayEntry>>([])

  const close = (id: string, result?: unknown) => {
    const current = entries()
    const target = current.find((e) => e.id === id)
    if (!target) {
      return
    }
    setEntries(current.filter((e) => e.id !== id))
    target.resolve(result)
  }

  const open = <Result = unknown,>(
    render: (closeFn: (result?: Result) => void) => JSX.Element,
  ): Promise<Result | undefined> => {
    const id = `ui-overlay-${overlayCounter++}`
    return new Promise<Result | undefined>((resolve) => {
      const entry: OverlayEntry = {
        id,
        render: (c) => render(c),
        resolve: (res) => resolve(res as Result | undefined),
      }
      setEntries((prev) => [...prev, entry])
    })
  }

  const closeAll = () => {
    const current = entries()
    setEntries([])
    for (const entry of current) {
      entry.resolve(undefined)
    }
  }

  return { entries, open, close, closeAll }
}

export const overlays = createOverlays()

export type OverlayHostProps = {
  manager?: Overlays
}

export function OverlayHost(props: OverlayHostProps) {
  const manager = () => props.manager ?? overlays
  return (
    <For each={manager().entries()}>
      {(entry) => entry.render((result) => manager().close(entry.id, result))}
    </For>
  )
}
