import { render } from '@solidjs/web'
import { flush } from 'solid-js'
import { afterEach, describe, expect, it } from 'vitest'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  createDialogController,
} from '../../src/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHandle,
  DrawerTitle,
  createDrawerController,
} from '../../src/drawer'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  createHoverCardController,
} from '../../src/hover-card'
import { Toast, ToastRegion, ToastTitle, createToaster } from '../../src/toast'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  createTooltipController,
} from '../../src/tooltip'

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

describe('core disclosure and overlay behaviors migrated from ref/ui-sdk/packages/core/test', () => {
  it('dialog wires aria-labelledby and aria-describedby and closes on Escape', () => {
    const ctrl = createDialogController()
    mount(() => (
      <Dialog controller={ctrl}>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Manage preferences</DialogDescription>
          <DialogClose>Close</DialogClose>
        </DialogContent>
      </Dialog>
    ))

    void ctrl.open()
    flush()
    const dlg = document.querySelector('[role="dialog"]')!
    expect(dlg.getAttribute('aria-labelledby')).toBeTruthy()
    expect(dlg.getAttribute('aria-describedby')).toBeTruthy()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    flush()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('drawer cycles snap points via handle and closes via controller', () => {
    const ctrl = createDrawerController()
    const snaps: Array<unknown> = []
    mount(() => (
      <Drawer controller={ctrl} snapPoints={[0.5, 1]} onSnapPointChange={(s) => snaps.push(s)}>
        <DrawerContent>
          <DrawerHandle aria-label="Resize" />
          <DrawerTitle>Sheet</DrawerTitle>
        </DrawerContent>
      </Drawer>
    ))

    void ctrl.open()
    flush()
    const handle = document.querySelector<HTMLElement>('[aria-label="Resize"]')!
    handle.click()
    flush()
    expect(snaps.at(-1)).toBe(1)

    ctrl.close()
    flush()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })

  it('tooltip opens on focus and closes on Escape', () => {
    const ctrl = createTooltipController()
    const root = mount(() => (
      <Tooltip controller={ctrl} openDelay={0} closeDelay={0}>
        <TooltipTrigger>Save</TooltipTrigger>
        <TooltipContent>Save document</TooltipContent>
      </Tooltip>
    ))

    const trigger = root.querySelector('button')!
    trigger.dispatchEvent(new FocusEvent('focus', { bubbles: true }))
    flush()
    expect(document.querySelector('[role="tooltip"]')?.textContent).toContain('Save document')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    flush()
    expect(ctrl.isOpen()).toBe(false)
  })

  it('hover card opens with payload via controller and closes cleanly', () => {
    const ctrl = createHoverCardController<{ handle: string }>()
    mount(() => (
      <HoverCard controller={ctrl} openDelay={0} closeDelay={0}>
        <HoverCardTrigger href="/ada">@ada</HoverCardTrigger>
        <HoverCardContent<{ handle: string }>>
          {(state) => <span>Profile: {state.payload?.handle}</span>}
        </HoverCardContent>
      </HoverCard>
    ))

    ctrl.open({ handle: '@ada' })
    flush()
    expect(document.body.textContent).toContain('Profile: @ada')

    ctrl.close()
    flush()
    expect(document.body.textContent).not.toContain('Profile: @ada')
  })

  it('toaster enforces limit, supports update/dismissAll, and resolves promise helper', async () => {
    const toaster = createToaster({ limit: 2 })
    mount(() => (
      <ToastRegion toaster={toaster}>
        {() => (
          <Toast>
            <ToastTitle />
          </Toast>
        )}
      </ToastRegion>
    ))

    const id1 = toaster('First', { duration: Infinity })
    toaster('Second', { duration: Infinity })
    toaster('Third', { duration: Infinity })
    flush()
    expect(toaster.toasts().map((t) => t.title)).toEqual(['Second', 'Third'])

    toaster.update(id1, { title: 'Ignored' })
    const secondId = toaster.toasts()[0]!.id
    toaster.update(secondId, { title: 'Updated' })
    flush()
    expect(toaster.toasts()[0]!.title).toBe('Updated')

    toaster.dismissAll()
    flush()
    expect(toaster.toasts()).toHaveLength(0)

    const result = await toaster.promise(Promise.resolve('ok'), {
      loading: 'Saving...',
      success: (val) => `Saved ${val}`,
      error: 'Failed',
    })
    flush()
    expect(result).toBe('ok')
    expect(toaster.toasts().at(-1)?.title).toBe('Saved ok')
  })
})
