import { render } from '@solidjs/web'
import { createSignal, flush } from 'solid-js'
import { afterEach, describe, expect, it } from 'vitest'

import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from '../../src/accordion'
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../src/alert-dialog'
import { Checkbox, CheckboxGroup, CheckboxIndicator } from '../../src/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  createDialogController,
} from '../../src/dialog'
import { Meter, MeterIndicator, MeterTrack, MeterValue } from '../../src/meter'
import {
  NumberInput,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputIncrement,
} from '../../src/number-input'
import { Pagination, PaginationItem, PaginationNext, PaginationPrevious } from '../../src/pagination'
import { PasswordInput, PasswordInputControl, PasswordInputToggle } from '../../src/password-input'
import { Progress, ProgressIndicator, ProgressTrack, ProgressValue } from '../../src/progress'
import { Radio, RadioGroup } from '../../src/radio'
import { Rating, RatingItem } from '../../src/rating'
import { SegmentedControl, SegmentedControlItem } from '../../src/segmented-control'
import { Switch, SwitchThumb } from '../../src/switch'
import { Tabs, TabsList, TabsPanel, TabsTab } from '../../src/tabs'

let disposers: Array<() => void> = []

function mount(fn: () => any) {
  const container = document.createElement('div')
  document.body.append(container)
  const dispose = render(fn, container)
  flush()
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return container
}

afterEach(() => {
  for (const dispose of disposers) {
    dispose()
  }
  disposers = []
  document.body.innerHTML = ''
})

describe('core behaviors migrated from ref/ui-sdk', () => {
  it('accordion enforces single vs multiple mode and cancelable ChangeDetails', () => {
    const reasons: Array<string> = []
    let cancelNext = false
    const root = mount(() => (
      <Accordion
        defaultValue={['a']}
        onValueChange={(_val, details) => {
          reasons.push(details.reason)
          if (cancelNext) {
            details.cancel()
          }
        }}
      >
        <AccordionItem value="a">
          <AccordionHeader>
            <AccordionTrigger>Item A</AccordionTrigger>
          </AccordionHeader>
          <AccordionPanel>Panel A</AccordionPanel>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionHeader>
            <AccordionTrigger>Item B</AccordionTrigger>
          </AccordionHeader>
          <AccordionPanel>Panel B</AccordionPanel>
        </AccordionItem>
      </Accordion>
    ))

    const triggers = root.querySelectorAll('button')
    expect(triggers[0]!.getAttribute('aria-expanded')).toBe('true')
    expect(triggers[1]!.getAttribute('aria-expanded')).toBe('false')

    triggers[1]!.click()
    flush()
    expect(triggers[0]!.getAttribute('aria-expanded')).toBe('false')
    expect(triggers[1]!.getAttribute('aria-expanded')).toBe('true')
    expect(reasons).toEqual(['trigger-press'])

    cancelNext = true
    triggers[0]!.click()
    flush()
    expect(triggers[1]!.getAttribute('aria-expanded')).toBe('true')
  })

  it('switch supports controlled state and cancelable onCheckedChange', () => {
    const [checked, setChecked] = createSignal(false)
    let allow = false
    const root = mount(() => (
      <Switch
        checked={checked()}
        onCheckedChange={(next, details) => {
          if (!allow) {
            details.cancel()
            return
          }
          setChecked(next)
        }}
      >
        <SwitchThumb />
      </Switch>
    ))
    const btn = root.querySelector<HTMLButtonElement>('[role="switch"]')!
    expect(btn.getAttribute('aria-checked')).toBe('false')

    btn.click()
    flush()
    expect(btn.getAttribute('aria-checked')).toBe('false')

    allow = true
    btn.click()
    flush()
    expect(btn.getAttribute('aria-checked')).toBe('true')
  })

  it('checkbox group tracks multi-selection and individual toggles', () => {
    const seen: Array<Array<string>> = []
    const root = mount(() => (
      <CheckboxGroup defaultValue={['a']} onValueChange={(v) => seen.push([...v])}>
        <Checkbox value="a">
          <CheckboxIndicator />
        </Checkbox>
        <Checkbox value="b">
          <CheckboxIndicator />
        </Checkbox>
      </CheckboxGroup>
    ))
    const boxes = root.querySelectorAll<HTMLButtonElement>('[role="checkbox"]')
    expect(boxes[0]!.getAttribute('aria-checked')).toBe('true')
    expect(boxes[1]!.getAttribute('aria-checked')).toBe('false')

    boxes[1]!.click()
    flush()
    expect(seen.at(-1)).toEqual(['a', 'b'])

    boxes[0]!.click()
    flush()
    expect(seen.at(-1)).toEqual(['b'])
  })

  it('radio group updates selection on click and arrow key navigation', () => {
    const root = mount(() => (
      <RadioGroup defaultValue="one" aria-label="Options">
        <Radio value="one">One</Radio>
        <Radio value="two">Two</Radio>
        <Radio value="three">Three</Radio>
      </RadioGroup>
    ))
    const radios = root.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    expect(radios[0]!.getAttribute('aria-checked')).toBe('true')

    radios[1]!.click()
    flush()
    expect(radios[0]!.getAttribute('aria-checked')).toBe('false')
    expect(radios[1]!.getAttribute('aria-checked')).toBe('true')
  })

  it('tabs switch panels and update aria-selected', () => {
    const root = mount(() => (
      <Tabs defaultValue="t1">
        <TabsList>
          <TabsTab value="t1">Tab 1</TabsTab>
          <TabsTab value="t2">Tab 2</TabsTab>
        </TabsList>
        <TabsPanel value="t1">Body 1</TabsPanel>
        <TabsPanel value="t2">Body 2</TabsPanel>
      </Tabs>
    ))
    const tabs = root.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true')
    expect(root.textContent).toContain('Body 1')

    tabs[1]!.click()
    flush()
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true')
    expect(root.textContent).toContain('Body 2')
  })

  it('dialog controller opens with payload and resolves returnValue on close', async () => {
    const ctrl = createDialogController<{ id: number }, string>()
    mount(() => (
      <Dialog controller={ctrl}>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent<{ id: number }>>
          {(state) => (
            <>
              <DialogTitle>Item {state.payload?.id}</DialogTitle>
              <DialogClose returnValue="confirmed">Confirm</DialogClose>
            </>
          )}
        </DialogContent>
      </Dialog>
    ))
    const pending = ctrl.open({ id: 42 })
    flush()
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Item 42')
    const confirmBtn = document.querySelector<HTMLButtonElement>('[data-slot="dialog-close"]')!
    confirmBtn.click()
    flush()
    await expect(pending).resolves.toBe('confirmed')
  })

  it('alert dialog renders alertdialog role and closes via AlertDialogClose', () => {
    const root = mount(() => (
      <AlertDialog>
        <AlertDialogTrigger>Delete</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogClose>Cancel</AlertDialogClose>
        </AlertDialogContent>
      </AlertDialog>
    ))
    root.querySelector('button')!.click()
    flush()
    const dialog = document.querySelector('[role="alertdialog"]')
    expect(dialog).not.toBeNull()
    dialog!.querySelector('button')!.click()
    flush()
    expect(document.querySelector('[role="alertdialog"]')).toBeNull()
  })

  it('number input increments, decrements, and clamps to min/max', () => {
    const root = mount(() => (
      <NumberInput defaultValue={5} min={4} max={6} step={1}>
        <NumberInputDecrement>-</NumberInputDecrement>
        <NumberInputControl />
        <NumberInputIncrement>+</NumberInputIncrement>
      </NumberInput>
    ))
    const [dec, inc] = root.querySelectorAll('button')
    const input = root.querySelector('input')!
    expect(input.value).toBe('5')

    inc!.click()
    flush()
    expect(input.value).toBe('6')
    inc!.click()
    flush()
    expect(input.value).toBe('6')

    dec!.click()
    dec!.click()
    dec!.click()
    flush()
    expect(input.value).toBe('4')
  })

  it('password input toggles input type between password and text', () => {
    const root = mount(() => (
      <PasswordInput>
        <PasswordInputControl />
        <PasswordInputToggle>Toggle</PasswordInputToggle>
      </PasswordInput>
    ))
    const input = root.querySelector('input')!
    const toggle = root.querySelector('button')!
    expect(input.type).toBe('password')

    toggle.click()
    flush()
    expect(input.type).toBe('text')

    toggle.click()
    flush()
    expect(input.type).toBe('password')
  })

  it('rating and segmented control update value on item press', () => {
    const root = mount(() => (
      <>
        <Rating defaultValue={2} max={5}>
          <RatingItem value={1}>1</RatingItem>
          <RatingItem value={2}>2</RatingItem>
          <RatingItem value={3}>3</RatingItem>
          <RatingItem value={4}>4</RatingItem>
        </Rating>
        <SegmentedControl defaultValue="day">
          <SegmentedControlItem value="day">Day</SegmentedControlItem>
          <SegmentedControlItem value="week">Week</SegmentedControlItem>
        </SegmentedControl>
      </>
    ))
    const ratingItems = root.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    ratingItems[3]!.click()
    flush()
    expect(ratingItems[3]!.getAttribute('aria-checked')).toBe('true')

    const weekBtn = Array.from(root.querySelectorAll('button')).find(
      (b) => b.textContent === 'Week',
    )!
    weekBtn.click()
    flush()
    expect(weekBtn.hasAttribute('data-checked')).toBe(true)
  })

  it('pagination navigates pages within bounds', () => {
    const root = mount(() => (
      <Pagination count={3} defaultPage={1}>
        <PaginationPrevious>Prev</PaginationPrevious>
        <PaginationItem page={1}>1</PaginationItem>
        <PaginationItem page={2}>2</PaginationItem>
        <PaginationItem page={3}>3</PaginationItem>
        <PaginationNext>Next</PaginationNext>
      </Pagination>
    ))
    const nextBtn = Array.from(root.querySelectorAll('button')).find(
      (b) => b.textContent === 'Next',
    )!
    const page2 = Array.from(root.querySelectorAll('button')).find((b) => b.textContent === '2')!
    expect(page2.getAttribute('aria-current')).toBeNull()

    nextBtn.click()
    flush()
    expect(page2.getAttribute('aria-current')).toBe('page')
  })

  it('progress and meter clamp values and expose aria-valuenow / aria-valuetext', () => {
    const root = mount(() => (
      <>
        <Progress value={150} min={0} max={100} locale="en">
          <ProgressValue />
          <ProgressTrack>
            <ProgressIndicator />
          </ProgressTrack>
        </Progress>
        <Meter value={-5} min={0} max={10} locale="en">
          <MeterValue />
          <MeterTrack>
            <MeterIndicator />
          </MeterTrack>
        </Meter>
      </>
    ))
    const prog = root.querySelector('[role="progressbar"]')!
    const meter = root.querySelector('[role="meter"]')!
    expect(prog.getAttribute('aria-valuenow')).toBe('100')
    expect(prog.getAttribute('aria-valuetext')).toBe('100%')
    expect(meter.getAttribute('aria-valuenow')).toBe('0')
    expect(meter.getAttribute('aria-valuetext')).toBe('0%')
  })
})
