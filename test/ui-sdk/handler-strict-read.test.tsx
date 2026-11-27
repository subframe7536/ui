import { render } from '@solidjs/web'
import { createSignal, flush, OBSERVE, Show } from 'solid-js'
import { afterEach, expect, it, vi } from 'vitest'

import { Tooltip, TooltipContent, TooltipTrigger } from '../../src/tooltip'

let dispose = () => {}

afterEach(() => {
  dispose()
  document.body.replaceChildren()
})

it("a part's handler that runs while another component renders reads its props untracked", () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const codes: Array<string> = []
  const off = OBSERVE!.diagnostics.subscribe((event) => codes.push(event.code))
  const [moving, setMoving] = createSignal(false)
  // oxlint-disable-next-line subf/solid-no-unused-signal
  const [payload] = createSignal('payload')
  const [onFocusOut] = createSignal<() => void>(() => () => {})
  function FocusesWhileRendering() {
    document.getElementById('target')?.focus()
    return <span>moved</span>
  }
  const root = document.createElement('div')
  document.body.append(root)
  dispose = render(
    () => (
      <>
        <input aria-label="Target" id="target" />
        <Tooltip>
          <TooltipTrigger payload={payload()} onFocusOut={onFocusOut()}>
            Move
          </TooltipTrigger>
          <TooltipContent>Moves focus</TooltipContent>
        </Tooltip>
        <Show when={moving()}>
          <FocusesWhileRendering />
        </Show>
      </>
    ),
    root,
  )
  flush()
  root.querySelector('button')!.focus()
  setMoving(true)
  flush()
  off()
  warn.mockRestore()
  expect(document.activeElement?.id).toBe('target')
  expect(codes).not.toContain('STRICT_READ_UNTRACKED')
})
