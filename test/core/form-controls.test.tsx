import { render } from '@solidjs/web'
import { flush } from 'solid-js'
import { afterEach, describe, expect, it } from 'vitest'

import { Checkbox, CheckboxGroup, CheckboxIndicator } from '../../src/checkbox'
import {
  ColorPicker,
  ColorPickerInput,
  ColorPickerSwatchItem,
  ColorPickerSwatches,
} from '../../src/color-picker'
import {
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldSet,
} from '../../src/field'
import { OTPInput, OTPInputGroup, OTPInputSlot } from '../../src/otp-input'
import { Radio, RadioGroup } from '../../src/radio'
import { Slider, SliderControl, SliderThumb, SliderTrack } from '../../src/slider'
import { Toggle, ToggleGroup } from '../../src/toggle'
import { TokenInput, TokenInputEditor, fromText } from '../../src/token-input'

let disposers: Array<() => void> = []

function mount(fn: () => any) {
  const root = document.createElement('div')
  document.body.append(root)
  const dispose = render(fn, root)
  flush()
  disposers.push(() => {
    dispose()
    root.remove()
  })
  return root
}

afterEach(() => {
  for (const dispose of disposers) {
    dispose()
  }
  disposers = []
  document.body.innerHTML = ''
})

describe('core form controls migrated from ref/ui-sdk/packages/core/test', () => {
  it('fieldset propagates disabled state to nested fields and controls', () => {
    const root = mount(() => (
      <FieldSet disabled>
        <Field error="Required">
          <FieldLabel>Email</FieldLabel>
          <FieldControl />
          <FieldDescription>Work address</FieldDescription>
          <FieldError>Required</FieldError>
        </Field>
      </FieldSet>
    ))
    const input = root.querySelector('input')!
    expect(input.disabled).toBe(true)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(root.querySelector('[role="alert"]')?.textContent).toBe('Required')
  })

  it('toggle and toggle group enforce single vs multiple selection and disabled items', () => {
    const root = mount(() => (
      <ToggleGroup defaultValue={['bold']}>
        <Toggle value="bold">Bold</Toggle>
        <Toggle value="italic">Italic</Toggle>
        <Toggle value="underline" disabled>
          Underline
        </Toggle>
      </ToggleGroup>
    ))
    const [bold, italic, underline] = root.querySelectorAll('button')
    expect(bold!.getAttribute('aria-pressed')).toBe('true')
    expect(italic!.getAttribute('aria-pressed')).toBe('false')

    italic!.click()
    flush()
    expect(bold!.getAttribute('aria-pressed')).toBe('false')
    expect(italic!.getAttribute('aria-pressed')).toBe('true')

    underline!.click()
    flush()
    expect(underline!.getAttribute('aria-pressed')).toBe('false')
  })

  it('checkbox supports indeterminate state and disabled guard', () => {
    const root = mount(() => (
      <CheckboxGroup defaultValue={['a']}>
        <Checkbox value="a" disabled>
          <CheckboxIndicator />
        </Checkbox>
        <Checkbox checked="indeterminate" aria-label="Mixed" />
      </CheckboxGroup>
    ))
    const [disabledBox, mixedBox] = root.querySelectorAll<HTMLButtonElement>('[role="checkbox"]')
    expect(mixedBox!.getAttribute('aria-checked')).toBe('mixed')
    disabledBox!.click()
    flush()
    expect(disabledBox!.getAttribute('aria-checked')).toBe('true')
  })

  it('radio group skips disabled options during keyboard navigation', () => {
    const root = mount(() => (
      <RadioGroup defaultValue="a" orientation="horizontal" aria-label="Size">
        <Radio value="a">A</Radio>
        <Radio value="b" disabled>
          B
        </Radio>
        <Radio value="c">C</Radio>
      </RadioGroup>
    ))
    const radios = root.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    radios[0]!.focus()
    radios[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    flush()
    expect(radios[2]!.getAttribute('aria-checked')).toBe('true')
  })

  it('slider supports range thumbs and Home/End keyboard jumps', () => {
    const root = mount(() => (
      <Slider defaultValue={[20, 80]} min={0} max={100} step={5}>
        <SliderControl>
          <SliderTrack>
            <SliderThumb index={0} aria-label="Min" />
            <SliderThumb index={1} aria-label="Max" />
          </SliderTrack>
        </SliderControl>
      </Slider>
    ))
    const thumbs = root.querySelectorAll<HTMLElement>('[role="slider"]')
    expect(thumbs[0]!.getAttribute('aria-valuenow')).toBe('20')
    expect(thumbs[1]!.getAttribute('aria-valuenow')).toBe('80')

    thumbs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    flush()
    thumbs[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    flush()
    expect(thumbs[0]!.getAttribute('aria-valuenow')).toBe('0')
    expect(thumbs[1]!.getAttribute('aria-valuenow')).toBe('100')
  })

  it('otp input fills digits across slots and fires onComplete', () => {
    const completed: Array<string> = []
    const root = mount(() => (
      <OTPInput maxLength={4} onComplete={(code) => completed.push(code)}>
        <OTPInputGroup>
          <OTPInputSlot index={0} />
          <OTPInputSlot index={1} />
          <OTPInputSlot index={2} />
          <OTPInputSlot index={3} />
        </OTPInputGroup>
      </OTPInput>
    ))
    const input = root.querySelector<HTMLInputElement>('input')!
    input.value = '1234'
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    flush()
    expect(completed).toEqual(['1234'])
  })

  it('color picker updates value when selecting a swatch preset', () => {
    const seen: Array<string> = []
    const root = mount(() => (
      <ColorPicker defaultValue="#ff0000" onValueChange={(v) => seen.push(v)}>
        <ColorPickerInput aria-label="Hex" />
        <ColorPickerSwatches>
          <ColorPickerSwatchItem value="#00ff00" label="Green" />
          <ColorPickerSwatchItem value="#0000ff" label="Blue" />
        </ColorPickerSwatches>
      </ColorPicker>
    ))
    const blue = root.querySelector<HTMLButtonElement>('button[aria-label="Blue"]')!
    blue.click()
    flush()
    expect(seen.at(-1)?.toLowerCase()).toBe('#0000ff')
  })

  it('token input editor updates text value on input', () => {
    const seen: Array<string> = []
    const root = mount(() => (
      <TokenInput defaultValue={fromText('hello')} onValueChange={(v) => seen.push(v.text)}>
        <TokenInputEditor aria-label="Prompt" />
      </TokenInput>
    ))
    const editor = root.querySelector<HTMLInputElement>('input')!
    expect(editor.value).toBe('hello')
    editor.value = 'hello world'
    editor.dispatchEvent(new InputEvent('input', { bubbles: true }))
    flush()
    expect(seen.at(-1)).toBe('hello world')
  })
})
