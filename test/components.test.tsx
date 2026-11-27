import { render } from '@solidjs/web'
import { flush } from 'solid-js'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Label,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Switch,
  SwitchThumb,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
  Toggle,
  ToggleGroup,
  createCollapsibleController,
  createDialogController,
  createPopoverController,
  createSwitchController,
  createTabsController,
} from '../src'

let disposers: Array<() => void> = []

function mount(fn: () => any) {
  const container = document.createElement('div')
  document.body.append(container)
  const dispose = render(fn, container)
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

describe('separator & Label', () => {
  it('renders Separator with ARIA orientation and decorative mode', () => {
    const root = mount(() => (
      <>
        <Separator orientation="vertical" />
        <Separator decorative />
      </>
    ))
    const divs = root.querySelectorAll('div')
    expect(divs[0]!.getAttribute('role')).toBe('separator')
    expect(divs[0]!.getAttribute('aria-orientation')).toBe('vertical')
    expect(divs[0]!.getAttribute('data-orientation')).toBe('vertical')
    expect(divs[1]!.getAttribute('role')).toBe('none')
    expect(divs[1]!.getAttribute('aria-orientation')).toBeNull()
  })

  it('renders Label with custom render prop', () => {
    const root = mount(() => (
      <Label for="ctrl-1" render={(props) => <span {...props} data-custom="yes" />}>
        Email
      </Label>
    ))
    const el = root.querySelector('span')!
    expect(el.getAttribute('data-custom')).toBe('yes')
    expect(el.textContent).toBe('Email')
  })

  it('preserves DOM node identity with fine-grained custom render prop and array refs', () => {
    let refA: HTMLButtonElement | undefined
    let refB: HTMLButtonElement | undefined
    let renderCalls = 0

    const root = mount(() => (
      <Toggle
        ref={[
          (el) => {
            refA = el
          },
          (el) => {
            refB = el
          },
        ]}
        render={(props, state) => {
          renderCalls += 1
          return <button {...props} data-pressed-flag={state.pressed ? 'yes' : 'no'} />
        }}
      >
        {(state) => (state.pressed ? 'On' : 'Off')}
      </Toggle>
    ))

    const elBefore = root.querySelector('button')!
    expect(renderCalls).toBe(1)
    expect(refA).toBe(elBefore)
    expect(refB).toBe(elBefore)
    expect(elBefore.getAttribute('data-pressed-flag')).toBe('no')
    expect(elBefore.getAttribute('aria-pressed')).toBe('false')
    expect(elBefore.textContent).toBe('Off')

    elBefore.click()
    flush()

    const elAfter = root.querySelector('button')!
    expect(elAfter).toBe(elBefore)
    expect(renderCalls).toBe(1)
    expect(elAfter.getAttribute('data-pressed-flag')).toBe('yes')
    expect(elAfter.getAttribute('aria-pressed')).toBe('true')
    expect(elAfter.textContent).toBe('On')
  })
})

describe('button', () => {
  it('handles async onClick pending state and prevents double press', async () => {
    let resolveAction!: () => void
    const onClick = vi.fn<(...args: Array<unknown>) => unknown>(
      () =>
        new Promise<void>((resolve) => {
          resolveAction = resolve
        }),
    )

    const root = mount(() => (
      <Button onClick={onClick} class={(s) => (s.pending ? 'is-pending' : 'idle')}>
        {(s) => (s.pending ? 'Saving...' : 'Save')}
      </Button>
    ))

    const btn = root.querySelector('button')!
    expect(btn.textContent).toBe('Save')
    expect(btn.className).toBe('idle')

    btn.click()
    flush()
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(btn.getAttribute('aria-busy')).toBe('true')
    expect(btn.getAttribute('data-pending')).toBe('')
    expect(btn.className).toBe('is-pending')
    expect(btn.textContent).toBe('Saving...')

    // Duplicate click while pending is ignored
    btn.click()
    expect(onClick).toHaveBeenCalledTimes(1)

    resolveAction()
    await Promise.resolve()
    flush()
    expect(btn.getAttribute('aria-busy')).toBeNull()
    expect(btn.textContent).toBe('Save')
  })
})

describe('toggle & ToggleGroup', () => {
  it('toggles pressed state and manages single selection in ToggleGroup', () => {
    const onValueChange = vi.fn<(...args: Array<unknown>) => void>()
    const root = mount(() => (
      <ToggleGroup defaultValue="left" onValueChange={onValueChange}>
        <Toggle value="left">Left</Toggle>
        <Toggle value="center">Center</Toggle>
        <Toggle value="right">Right</Toggle>
      </ToggleGroup>
    ))

    const buttons = root.querySelectorAll('button')
    expect(buttons[0]!.getAttribute('aria-pressed')).toBe('true')
    expect(buttons[1]!.getAttribute('aria-pressed')).toBe('false')

    buttons[1]!.click()
    flush()
    expect(buttons[0]!.getAttribute('aria-pressed')).toBe('false')
    expect(buttons[1]!.getAttribute('aria-pressed')).toBe('true')
    expect(onValueChange).toHaveBeenCalledWith(
      'center',
      expect.objectContaining({ reason: 'press' }),
    )
  })
})

describe('switch', () => {
  it('toggles checked state via click and imperative controller', () => {
    const controller = createSwitchController()
    const root = mount(() => (
      <Switch defaultChecked={false} controller={controller} name="notifications">
        <SwitchThumb />
      </Switch>
    ))

    const btn = root.querySelector('button')!
    const input = root.querySelector('input')!
    expect(btn.getAttribute('role')).toBe('switch')
    expect(btn.getAttribute('aria-checked')).toBe('false')
    expect(input.checked).toBe(false)

    btn.click()
    flush()
    expect(btn.getAttribute('aria-checked')).toBe('true')
    expect(input.checked).toBe(true)

    controller.setChecked(false)
    flush()
    expect(btn.getAttribute('aria-checked')).toBe('false')
    expect(controller.isChecked()).toBe(false)
  })
})

describe('collapsible & Accordion', () => {
  it('opens and closes Collapsible via trigger and controller', () => {
    const controller = createCollapsibleController()
    const root = mount(() => (
      <Collapsible controller={controller}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsiblePanel>Panel Body</CollapsiblePanel>
      </Collapsible>
    ))

    expect(root.textContent).not.toContain('Panel Body')
    root.querySelector('button')!.click()
    flush()
    expect(root.textContent).toContain('Panel Body')

    controller.close()
    flush()
    expect(root.textContent).not.toContain('Panel Body')
  })

  it('supports single-mode Accordion switching', () => {
    const root = mount(() => (
      <Accordion defaultValue="a">
        <AccordionItem value="a">
          <AccordionHeader>
            <AccordionTrigger>Item A</AccordionTrigger>
          </AccordionHeader>
          <AccordionPanel>Content A</AccordionPanel>
        </AccordionItem>
        <AccordionItem value="b">
          <AccordionHeader>
            <AccordionTrigger>Item B</AccordionTrigger>
          </AccordionHeader>
          <AccordionPanel>Content B</AccordionPanel>
        </AccordionItem>
      </Accordion>
    ))

    expect(root.textContent).toContain('Content A')
    expect(root.textContent).not.toContain('Content B')

    const triggers = root.querySelectorAll('button')
    triggers[1]!.click()
    flush()
    expect(root.textContent).not.toContain('Content A')
    expect(root.textContent).toContain('Content B')
  })
})

describe('tabs', () => {
  it('switches tabs on click, arrow keys, and controller', () => {
    const controller = createTabsController<'one' | 'two'>()
    const root = mount(() => (
      <Tabs defaultValue="one" controller={controller}>
        <TabsList>
          <TabsTab value="one">One</TabsTab>
          <TabsTab value="two">Two</TabsTab>
        </TabsList>
        <TabsPanel value="one">Panel One</TabsPanel>
        <TabsPanel value="two">Panel Two</TabsPanel>
      </Tabs>
    ))

    const tabs = root.querySelectorAll<HTMLButtonElement>('[role="tab"]')
    expect(root.textContent).toContain('Panel One')
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true')

    tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    flush()
    expect(tabs[1]!.getAttribute('aria-selected')).toBe('true')
    expect(root.textContent).toContain('Panel Two')

    controller.setValue('one')
    flush()
    expect(controller.getValue()).toBe('one')
    expect(root.textContent).toContain('Panel One')
  })
})

describe('dialog, AlertDialog & Popover', () => {
  it('opens Dialog with external controller trigger, resolves returnValue, and closes on Escape', async () => {
    const controller = createDialogController<string>()
    mount(() => (
      <>
        <DialogTrigger controller={controller} payload="row-42">
          External Open
        </DialogTrigger>
        <Dialog controller={controller}>
          <DialogContent<string>>
            {(state) => (
              <>
                <DialogTitle>Edit {state.payload}</DialogTitle>
                <DialogDescription>Details</DialogDescription>
                <DialogClose returnValue="confirmed">Confirm</DialogClose>
              </>
            )}
          </DialogContent>
        </Dialog>
      </>
    ))

    const trigger = document.querySelector('button')!
    trigger.click()
    flush()

    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog).toBeTruthy()
    expect(dialog.textContent).toContain('Edit row-42')

    // Escape closes it
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    flush()
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    // Imperative open resolves with returnValue on close
    const resultPromise = controller.open('row-99')
    flush()
    const confirmBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Confirm',
    )!
    confirmBtn.click()
    flush()
    expect(await resultPromise).toBe('confirmed')
  })

  it('renders AlertDialog with alertdialog role and ignores outside press by default', () => {
    mount(() => (
      <AlertDialog>
        <AlertDialogTrigger>Delete</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogClose>Cancel</AlertDialogClose>
        </AlertDialogContent>
      </AlertDialog>
    ))

    document.querySelector('button')!.click()
    flush()
    expect(document.querySelector('[role="alertdialog"]')).toBeTruthy()

    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    flush()
    expect(document.querySelector('[role="alertdialog"]')).toBeTruthy()
  })

  it('opens and closes Popover via trigger and controller', () => {
    const controller = createPopoverController()
    mount(() => (
      <Popover controller={controller}>
        <PopoverTrigger>Info</PopoverTrigger>
        <PopoverContent inline>
          <span>Popover Body</span>
          <PopoverClose>Done</PopoverClose>
        </PopoverContent>
      </Popover>
    ))

    expect(document.body.textContent).not.toContain('Popover Body')
    document.querySelector('button')!.click()
    flush()
    expect(document.body.textContent).toContain('Popover Body')

    controller.close()
    flush()
    expect(document.body.textContent).not.toContain('Popover Body')
  })
})
