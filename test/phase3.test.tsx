import { render } from '@solidjs/web'
import type { JSX } from '@solidjs/web'
import { flush } from 'solid-js'
import { describe, expect, it } from 'vitest'

import {
  Checkbox,
  CheckboxGroup,
  CheckboxIndicator,
  createFileInputController,
  createInputController,
  createNumberInputController,
  createOTPInputController,
  createPasswordInputController,
  createRatingController,
  createSegmentedControlController,
  createSliderController,
  createTokenInputController,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FileInput,
  FileInputDropzone,
  FileInputItem,
  FileInputItemRemove,
  FileInputList,
  formatFileSize,
  Input,
  InputClear,
  InputGroup,
  Meter,
  MeterIndicator,
  MeterLabel,
  MeterTrack,
  MeterValue,
  NumberInput,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
  OTPInput,
  OTPInputGroup,
  OTPInputSlot,
  PasswordInput,
  PasswordInputControl,
  PasswordInputToggle,
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
  Radio,
  RadioGroup,
  RadioIndicator,
  Rating,
  RatingItem,
  SegmentedControl,
  SegmentedControlIndicator,
  SegmentedControlItem,
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
  SliderValue,
  Textarea,
  TokenInput,
  TokenInputEditor,
  TokenInputToken,
  TokenInputTokenRemove,
  toText,
} from '../src/index'

function mount(fn: () => JSX.Element) {
  const container = document.createElement('div')
  document.body.append(container)
  const dispose = render(fn, container)
  flush()
  return {
    container,
    unmount() {
      dispose()
      container.remove()
    },
  }
}

describe('phase 3 Form Controls, Inputs & Gauges', () => {
  it('field wires label, description, error, and Input', () => {
    const ctrl = createInputController()
    const { container, unmount } = mount(() => (
      <Field name="email" invalid error="Invalid email">
        <FieldLabel>Email</FieldLabel>
        <InputGroup>
          <Input defaultValue="hello" controller={ctrl} />
          <InputClear>Clear</InputClear>
        </InputGroup>
        <FieldDescription>Work email</FieldDescription>
        <FieldError />
      </Field>
    ))

    const input = container.querySelector('input')!
    expect(input.value).toBe('hello')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    ctrl.clear()
    flush()
    expect(ctrl.getValue()).toBe('')
    unmount()
  })

  it('checkbox and CheckboxGroup toggle values', () => {
    const { container, unmount } = mount(() => (
      <CheckboxGroup defaultValue={['a']}>
        <Checkbox value="a">
          <CheckboxIndicator />
        </Checkbox>
        <Checkbox value="b">
          <CheckboxIndicator />
        </Checkbox>
      </CheckboxGroup>
    ))

    const boxes = container.querySelectorAll<HTMLElement>('[role="checkbox"]')
    expect(boxes[0]?.getAttribute('aria-checked')).toBe('true')
    expect(boxes[1]?.getAttribute('aria-checked')).toBe('false')
    boxes[1]?.click()
    flush()
    expect(boxes[1]?.getAttribute('aria-checked')).toBe('true')
    unmount()
  })

  it('radioGroup selects radio items', () => {
    const { container, unmount } = mount(() => (
      <RadioGroup defaultValue="sm">
        <Radio value="sm">
          <RadioIndicator />
        </Radio>
        <Radio value="lg">
          <RadioIndicator />
        </Radio>
      </RadioGroup>
    ))

    const radios = container.querySelectorAll<HTMLElement>('[role="radio"]')
    expect(radios[0]?.getAttribute('aria-checked')).toBe('true')
    radios[1]?.click()
    flush()
    expect(radios[1]?.getAttribute('aria-checked')).toBe('true')
    expect(radios[0]?.getAttribute('aria-checked')).toBe('false')
    unmount()
  })

  it('textarea and PasswordInput toggle visibility', () => {
    const pwCtrl = createPasswordInputController()
    const { container, unmount } = mount(() => (
      <div>
        <Textarea defaultValue="bio" />
        <PasswordInput defaultValue="secret" controller={pwCtrl}>
          <PasswordInputControl />
          <PasswordInputToggle>Toggle</PasswordInputToggle>
        </PasswordInput>
      </div>
    ))

    const input = container.querySelector('input')!
    expect(input.type).toBe('password')
    pwCtrl.toggleVisible()
    flush()
    expect(input.type).toBe('text')
    unmount()
  })

  it('numberInput increments, decrements, and clamps', () => {
    const ctrl = createNumberInputController()
    const { container, unmount } = mount(() => (
      <NumberInput defaultValue={5} min={0} max={10} step={2} controller={ctrl}>
        <NumberInputGroup>
          <NumberInputDecrement>-</NumberInputDecrement>
          <NumberInputControl />
          <NumberInputIncrement>+</NumberInputIncrement>
        </NumberInputGroup>
      </NumberInput>
    ))

    ctrl.increment()
    flush()
    expect(ctrl.getValue()).toBe(7)
    ctrl.setValue(99)
    flush()
    expect(ctrl.getValue()).toBe(10)
    expect(container.querySelector('input')?.getAttribute('aria-valuenow')).toBe('10')
    unmount()
  })

  it('oTPInput populates slots and respects pattern', () => {
    const ctrl = createOTPInputController()
    const { container, unmount } = mount(() => (
      <OTPInput maxLength={4} controller={ctrl}>
        <OTPInputGroup>
          <OTPInputSlot index={0} />
          <OTPInputSlot index={1} />
          <OTPInputSlot index={2} />
          <OTPInputSlot index={3} />
        </OTPInputGroup>
      </OTPInput>
    ))

    ctrl.setValue('12a34')
    flush()
    expect(ctrl.getValue()).toBe('1234')
    expect(container.querySelectorAll('[data-slot-index]').length).toBe(4)
    unmount()
  })

  it('fileInput adds, validates, and formats file sizes', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
    const ctrl = createFileInputController()
    const file = new File(['hello'], 'doc.txt', { type: 'text/plain' })
    const { container, unmount } = mount(() => (
      <FileInput accept=".txt" controller={ctrl}>
        <FileInputDropzone>Drop here</FileInputDropzone>
        <FileInputList>
          {(f) => (
            <FileInputItem file={f}>
              {f.name}
              <FileInputItemRemove file={f}>x</FileInputItemRemove>
            </FileInputItem>
          )}
        </FileInputList>
      </FileInput>
    ))

    const res = ctrl.addFiles([file])
    flush()
    expect(res.accepted.length).toBe(1)
    expect(container.querySelectorAll('li').length).toBe(1)
    ctrl.clear()
    flush()
    expect(ctrl.getFiles().length).toBe(0)
    unmount()
  })

  it('slider, Rating, SegmentedControl, and TokenInput work via controllers', () => {
    const sliderCtrl = createSliderController()
    const ratingCtrl = createRatingController()
    const segCtrl = createSegmentedControlController<'day' | 'week'>()
    const tokCtrl = createTokenInputController()

    const { unmount } = mount(() => (
      <div>
        <Slider defaultValue={25} min={0} max={100} controller={sliderCtrl}>
          <SliderControl>
            <SliderTrack>
              <SliderIndicator />
              <SliderThumb />
            </SliderTrack>
          </SliderControl>
          <SliderValue />
        </Slider>
        <Rating defaultValue={3} max={5} controller={ratingCtrl}>
          <RatingItem>*</RatingItem>
        </Rating>
        <SegmentedControl defaultValue="day" controller={segCtrl}>
          <SegmentedControlIndicator />
          <SegmentedControlItem value="day">Day</SegmentedControlItem>
          <SegmentedControlItem value="week">Week</SegmentedControlItem>
        </SegmentedControl>
        <TokenInput controller={tokCtrl}>
          <TokenInputEditor>
            {(tok) => (
              <TokenInputToken token={tok}>
                {tok.label}
                <TokenInputTokenRemove token={tok}>x</TokenInputTokenRemove>
              </TokenInputToken>
            )}
          </TokenInputEditor>
        </TokenInput>
      </div>
    ))

    sliderCtrl.setValue(60)
    flush()
    expect(sliderCtrl.getValues()).toEqual([60])

    ratingCtrl.setValue(4)
    flush()
    expect(ratingCtrl.getValue()).toBe(4)

    segCtrl.setValue('week')
    flush()
    expect(segCtrl.getValue()).toBe('week')

    const tok = tokCtrl.insertToken({ id: 'u1', label: '@alice' })
    flush()
    tokCtrl.setText('hi')
    flush()
    expect(tok).toBeTruthy()
    expect(toText(tokCtrl.getValue())).toBe('@alice hi')

    unmount()
  })

  it('progress and Meter compute percent and status', () => {
    const { container, unmount } = mount(() => (
      <div>
        <Progress value={50} min={0} max={100}>
          <ProgressLabel>Upload</ProgressLabel>
          <ProgressTrack>
            <ProgressIndicator />
          </ProgressTrack>
          <ProgressValue />
        </Progress>
        <Meter value={80} min={0} max={100} low={25} high={75} optimum={20}>
          <MeterLabel>Storage</MeterLabel>
          <MeterTrack>
            <MeterIndicator />
          </MeterTrack>
          <MeterValue />
        </Meter>
      </div>
    ))

    expect(container.querySelector('[role="progressbar"]')?.getAttribute('data-status')).toBe(
      'progressing',
    )
    expect(container.querySelector('[role="meter"]')?.getAttribute('aria-valuenow')).toBe('80')
    unmount()
  })
})
