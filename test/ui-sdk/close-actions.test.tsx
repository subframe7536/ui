// A dialog's Close action and a toast's buttons hear how they were pressed,
// like Button's handler, for the changes they make after an `await`.
import { render } from '@solidjs/web'
import { flush } from 'solid-js'
import { afterEach, expect, it } from 'vitest'

import { Dialog, DialogClose, DialogContent, DialogTitle } from '../../src/dialog'
import type { DialogCloseActionDetails } from '../../src/dialog'
import { withSource } from '../../src/observe'
import { createToaster, ToastRegion } from '../../src/toast'

// jsdom has no ResizeObserver, which a toast measures itself with.
/* oxlint-disable eslint/class-methods-use-this */
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
}
/* oxlint-enable eslint/class-methods-use-this */

let dispose = () => {}
afterEach(() => {
  dispose()
  document.body.replaceChildren()
})

function mount(code: () => any) {
  const root = document.createElement('div')
  document.body.append(root)
  dispose = render(code, root)
  flush()
}

const buttonNamed = (name: string) =>
  [...document.querySelectorAll('button')].find((button) => button.textContent === name)!

it("a dialog's Close action hears how it was pressed", () => {
  const sources: Array<string> = []
  const save = (_event: Event | undefined, { source }: DialogCloseActionDetails) =>
    sources.push(source)
  mount(() => (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogTitle>Draft</DialogTitle>
        <DialogClose action={save}>Save</DialogClose>
      </DialogContent>
    </Dialog>
  ))
  withSource('agent', () => buttonNamed('Save').click())
  expect(sources).toEqual(['agent'])
})

it("a toast's action and cancel buttons hear how they were pressed", () => {
  const sources: Array<string> = []
  const toaster = createToaster()
  mount(() => <ToastRegion toaster={toaster} />)
  toaster('Deleted', {
    duration: Infinity,
    action: {
      label: 'Undo',
      onAction: (_event, { source }) => sources.push(`undo:${source}`),
    },
  })
  toaster('Saved', {
    duration: Infinity,
    cancel: {
      label: 'Keep',
      onCancel: (_event, { source }) => sources.push(`keep:${source}`),
    },
  })
  flush()
  withSource('agent', () => buttonNamed('Undo').click())
  withSource('keyboard', () => buttonNamed('Keep').click())
  expect(sources).toEqual(['undo:agent', 'keep:keyboard'])
})
