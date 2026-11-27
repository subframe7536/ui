import { render } from '@solidjs/web'
import { flush, For } from 'solid-js'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { ColorPicker, ColorPickerSwatchItem, ColorPickerSwatches } from '../../src/color-picker'
import { Popover, PopoverContent, PopoverTrigger } from '../../src/popover'

beforeAll(() => {
  HTMLElement.prototype.showPopover ??= function () {}
  HTMLElement.prototype.hidePopover ??= function () {}
  Element.prototype.getAnimations ??= () => []
  Element.prototype.checkVisibility = () => true
  document.head.append(
    Object.assign(document.createElement('style'), {
      textContent: '[popover] { display: block !important }',
    }),
  )
})

let dispose = () => {}

afterEach(() => {
  dispose()
  document.body.replaceChildren()
})

const presets = ['#DC2626', '#EA580C', '#7C3AED', '#64748B']

async function open(value: string) {
  const root = document.createElement('div')
  document.body.append(root)
  dispose = render(
    () => (
      <ColorPicker aria-label="Design color" defaultValue={value}>
        <Popover>
          <PopoverTrigger>Recolor</PopoverTrigger>
          <PopoverContent aria-label="Recolor">
            <ColorPickerSwatches aria-label="Presets">
              <For each={presets}>{(preset) => <ColorPickerSwatchItem value={preset} />}</For>
            </ColorPickerSwatches>
          </PopoverContent>
        </Popover>
      </ColorPicker>
    ),
    root,
  )
  flush()
  await new Promise((resolve) => {
    setTimeout(resolve, 20)
  })
  root.querySelector('button')!.click()
  flush()
  await new Promise((resolve) => {
    setTimeout(resolve, 20)
  })
  flush()
  return document.activeElement as HTMLElement
}

it('a popover that opens on the presets focuses the selected one', async () => {
  const focused = await open('#7C3AED')
  expect(focused.getAttribute('role')).toBe('option')
  expect(focused.getAttribute('aria-selected')).toBe('true')
})

it('with no preset selected, it focuses the first', async () => {
  const focused = await open('#123456')
  expect(focused).toBe(document.querySelector('[role=option]'))
})
