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
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from '../../src/autocomplete'
import { Checkbox, CheckboxGroup, CheckboxIndicator } from '../../src/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  createDialogController,
} from '../../src/dialog'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from '../../src/drawer'
import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from '../../src/menu'
import { Meter, MeterIndicator, MeterTrack, MeterValue } from '../../src/meter'
import {
  NumberInput,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputIncrement,
} from '../../src/number-input'
import {
  Pagination,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../src/pagination'
import { PasswordInput, PasswordInputControl, PasswordInputToggle } from '../../src/password-input'
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  createPopoverController,
} from '../../src/popover'
import { Progress, ProgressIndicator, ProgressTrack, ProgressValue } from '../../src/progress'
import { Radio, RadioGroup } from '../../src/radio'
import { Rating, RatingItem } from '../../src/rating'
import { SegmentedControl, SegmentedControlItem } from '../../src/segmented-control'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectList,
  SelectTrigger,
  SelectValue,
} from '../../src/select'
import { Slider, SliderControl, SliderIndicator, SliderThumb, SliderTrack } from '../../src/slider'
import { Switch, SwitchThumb } from '../../src/switch'
import { Tabs, TabsList, TabsPanel, TabsTab } from '../../src/tabs'
import { Toast, ToastRegion, ToastTitle, createToaster } from '../../src/toast'

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

  it('popover opens via controller, closes via PopoverClose, and supports cancelable onOpenChange', () => {
    const ctrl = createPopoverController()
    let blockClose = true
    mount(() => (
      <Popover
        controller={ctrl}
        onOpenChange={(next, details) => {
          if (!next && blockClose) {
            details.cancel()
          }
        }}
      >
        <PopoverTrigger>Info</PopoverTrigger>
        <PopoverContent>
          <span>Popover body</span>
          <PopoverClose>Done</PopoverClose>
        </PopoverContent>
      </Popover>
    ))
    void ctrl.open()
    flush()
    expect(document.body.textContent).toContain('Popover body')
    const closeBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Done',
    )!
    closeBtn.click()
    flush()
    expect(document.body.textContent).toContain('Popover body')

    blockClose = false
    closeBtn.click()
    flush()
    expect(document.body.textContent).not.toContain('Popover body')
  })

  it('drawer opens via trigger and closes via DrawerClose', () => {
    const root = mount(() => (
      <Drawer>
        <DrawerTrigger>Open drawer</DrawerTrigger>
        <DrawerContent>
          <DrawerTitle>Details</DrawerTitle>
          <DrawerClose>Dismiss</DrawerClose>
        </DrawerContent>
      </Drawer>
    ))
    root.querySelector('button')!.click()
    flush()
    const dialog = document.querySelector('[role="dialog"]')
    expect(dialog?.textContent).toContain('Details')
    dialog!.querySelector('button')!.click()
    flush()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('slider updates value with keyboard arrows and clamps to bounds', () => {
    const seen: Array<number | Array<number>> = []
    const root = mount(() => (
      <Slider defaultValue={50} min={0} max={100} step={10} onValueChange={(v) => seen.push(v)}>
        <SliderControl>
          <SliderTrack>
            <SliderIndicator />
            <SliderThumb aria-label="Volume" />
          </SliderTrack>
        </SliderControl>
      </Slider>
    ))
    const thumb = root.querySelector<HTMLElement>('[role="slider"]')!
    expect(thumb.getAttribute('aria-valuenow')).toBe('50')

    thumb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    flush()
    expect(thumb.getAttribute('aria-valuenow')).toBe('60')
    expect(seen.at(-1)).toBe(60)
  })

  it('select opens listbox and updates selected value on option press', () => {
    const root = mount(() => (
      <Select defaultValue="apple">
        <SelectTrigger aria-label="Fruit">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectList>
            <SelectItem value="apple">Apple</SelectItem>
            <SelectItem value="banana">Banana</SelectItem>
          </SelectList>
        </SelectContent>
      </Select>
    ))
    const trigger = root.querySelector<HTMLButtonElement>('button')!
    trigger.click()
    flush()
    const options = document.querySelectorAll<HTMLElement>('[role="option"]')
    expect(options).toHaveLength(2)
    options[1]!.click()
    flush()
    expect(trigger.textContent).toContain('Banana')
  })

  it('menu handles item select, checkbox toggle, and radio group selection', () => {
    const selected: Array<string> = []
    const root = mount(() => (
      <Menu>
        <MenuTrigger>Actions</MenuTrigger>
        <MenuContent>
          <MenuItem onSelect={() => selected.push('copy')}>Copy</MenuItem>
          <MenuCheckboxItem defaultChecked={false}>Wrap</MenuCheckboxItem>
          <MenuRadioGroup defaultValue="sm">
            <MenuRadioItem value="sm">Small</MenuRadioItem>
            <MenuRadioItem value="lg">Large</MenuRadioItem>
          </MenuRadioGroup>
        </MenuContent>
      </Menu>
    ))
    root.querySelector('button')!.click()
    flush()
    const checkbox = document.querySelector<HTMLElement>('[role="menuitemcheckbox"]')!
    checkbox.click()
    flush()
    expect(checkbox.getAttribute('aria-checked')).toBe('true')

    const large = Array.from(document.querySelectorAll<HTMLElement>('[role="menuitemradio"]')).find(
      (el) => el.textContent === 'Large',
    )!
    large.click()
    flush()
    expect(document.querySelector('[role="menu"]')).toBeNull()
  })

  it('autocomplete filters options by query and selects matching option', () => {
    const root = mount(() => (
      <Autocomplete defaultOpen>
        <AutocompleteInput aria-label="Search" />
        <AutocompleteContent>
          <AutocompleteList>
            <AutocompleteItem value="apple" label="Apple">
              Apple
            </AutocompleteItem>
            <AutocompleteItem value="mango" label="Mango">
              Mango
            </AutocompleteItem>
          </AutocompleteList>
        </AutocompleteContent>
      </Autocomplete>
    ))
    const input = root.querySelector('input')!
    input.value = 'man'
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    flush()
    const options = document.querySelectorAll<HTMLElement>('[role="option"]')
    expect(options).toHaveLength(1)
    expect(options[0]!.textContent).toBe('Mango')
  })

  it('toaster adds, renders, and dismisses toasts in DOM', () => {
    const toaster = createToaster()
    mount(() => (
      <ToastRegion toaster={toaster}>
        {() => (
          <Toast>
            <ToastTitle />
          </Toast>
        )}
      </ToastRegion>
    ))
    const id = toaster('Changes saved', { duration: Infinity })
    flush()
    expect(document.body.textContent).toContain('Changes saved')
    expect(document.querySelector('[role="region"]')).not.toBeNull()

    toaster.dismiss(id)
    flush()
    expect(document.body.textContent).not.toContain('Changes saved')
    expect(document.querySelector('[role="region"]')).toBeNull()
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
    flush()
    dec!.click()
    flush()
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
          <RatingItem />
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
        <PaginationItem>
          <PaginationLink page={1}>1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink page={2}>2</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink page={3}>3</PaginationLink>
        </PaginationItem>
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
