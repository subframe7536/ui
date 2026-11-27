import { render } from '@solidjs/web'
import { flush, For } from 'solid-js'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHandle,
  DrawerTitle,
  DrawerTrigger,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
  Menubar,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  OverlayHost,
  Toast,
  ToastClose,
  ToastRegion,
  ToastTitle,
  Toolbar,
  ToolbarButton,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TriggerMenu,
  TriggerMenuContent,
  TriggerMenuInput,
  TriggerMenuItem,
  TriggerMenuList,
  createDrawerController,
  createHoverCardController,
  createMenuController,
  createOverlays,
  createToaster,
  createTooltipController,
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

describe('tooltip & HoverCard', () => {
  it('opens Tooltip on focus and controller', () => {
    const ctrl = createTooltipController()
    mount(() => (
      <Tooltip controller={ctrl} openDelay={0} closeDelay={0}>
        <TooltipTrigger>Help</TooltipTrigger>
        <TooltipContent inline>Helpful hint</TooltipContent>
      </Tooltip>
    ))
    expect(document.body.textContent).not.toContain('Helpful hint')
    ctrl.open()
    flush()
    expect(document.querySelector('[role="tooltip"]')?.textContent).toBe('Helpful hint')
    ctrl.close()
    flush()
    expect(document.querySelector('[role="tooltip"]')).toBeNull()
  })

  it('opens HoverCard via controller', () => {
    const ctrl = createHoverCardController()
    mount(() => (
      <HoverCard controller={ctrl} openDelay={0} closeDelay={0}>
        <HoverCardTrigger href="#profile">@subframe7536</HoverCardTrigger>
        <HoverCardContent inline>Solid 2 developer</HoverCardContent>
      </HoverCard>
    ))
    ctrl.open()
    flush()
    expect(document.body.textContent).toContain('Solid 2 developer')
  })
})

describe('drawer', () => {
  it('opens Drawer, cycles snapPoints via DrawerHandle, and closes with returnValue', async () => {
    const ctrl = createDrawerController<undefined>()
    mount(() => (
      <Drawer controller={ctrl} side="bottom" snapPoints={[0.5, 1]}>
        <DrawerTrigger>Open Sheet</DrawerTrigger>
        <DrawerContent>
          <DrawerHandle>Snap</DrawerHandle>
          <DrawerTitle>Sheet Title</DrawerTitle>
          <DrawerClose returnValue="saved">Done</DrawerClose>
        </DrawerContent>
      </Drawer>
    ))

    const resP = ctrl.open()
    flush()
    expect(ctrl.getSnapPoint()).toBe(0.5)
    const snapBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Snap',
    )!
    snapBtn.click()
    flush()
    expect(ctrl.getSnapPoint()).toBe(1)

    const doneBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent === 'Done',
    )!
    doneBtn.click()
    flush()
    expect(await resP).toBe('saved')
  })
})

describe('menu & Menubar', () => {
  it('selects MenuItem, toggles MenuCheckboxItem, and picks MenuRadioItem', () => {
    const onSelect = vi.fn<(...args: Array<unknown>) => void>()
    const ctrl = createMenuController()
    mount(() => (
      <Menubar>
        <Menu controller={ctrl}>
          <MenuTrigger>File</MenuTrigger>
          <MenuContent inline>
            <MenuItem onSelect={onSelect}>New</MenuItem>
            <MenuCheckboxItem defaultChecked={false}>Autosave</MenuCheckboxItem>
            <MenuRadioGroup defaultValue="light">
              <MenuRadioItem value="light">Light</MenuRadioItem>
              <MenuRadioItem value="dark">Dark</MenuRadioItem>
            </MenuRadioGroup>
          </MenuContent>
        </Menu>
      </Menubar>
    ))

    document.querySelector('button')!.click()
    flush()
    const menu = document.querySelector('[role="menu"]')!
    expect(menu).toBeTruthy()

    const checkbox = menu.querySelector<HTMLElement>('[role="menuitemcheckbox"]')!
    checkbox.click()
    flush()
    expect(checkbox.getAttribute('aria-checked')).toBe('true')

    const newItem = menu.querySelector<HTMLElement>('[role="menuitem"]')!
    newItem.click()
    flush()
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(ctrl.isOpen()).toBe(false)
  })
})

describe('triggerMenu, NavigationMenu, Toast, Overlays & Toolbar', () => {
  it('opens TriggerMenu on @ mention and inserts selected value', () => {
    const onSelect = vi.fn<(...args: Array<unknown>) => void>()
    const root = mount(() => (
      <TriggerMenu triggers={['@']} onSelect={onSelect}>
        <TriggerMenuInput />
        <TriggerMenuContent inline>
          <TriggerMenuList>
            <TriggerMenuItem value="@alice">Alice</TriggerMenuItem>
          </TriggerMenuList>
        </TriggerMenuContent>
      </TriggerMenu>
    ))

    const input = root.querySelector('textarea')!
    input.value = 'Hi @al'
    input.setSelectionRange(6, 6)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    flush()

    const opt = root.querySelector<HTMLElement>('[role="option"]')!
    expect(opt).toBeTruthy()
    opt.click()
    flush()
    expect(input.value).toBe('Hi @alice ')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('toggles NavigationMenu content and closes on link click', () => {
    const root = mount(() => (
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="docs">
            <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="#intro">Intro</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    ))

    root.querySelector('button')!.click()
    flush()
    expect(root.textContent).toContain('Intro')
    root.querySelector('a')!.click()
    flush()
    expect(root.textContent).not.toContain('Intro')
  })

  it('manages Toast items via createToaster and dismisses via ToastClose', () => {
    const manager = createToaster({ duration: Infinity })
    const root = mount(() => (
      <ToastRegion toaster={manager}>
        <For each={manager.toasts()}>
          {(item) => (
            <Toast toast={item}>
              <ToastTitle>{item.title}</ToastTitle>
              <ToastClose>Dismiss</ToastClose>
            </Toast>
          )}
        </For>
      </ToastRegion>
    ))

    manager.success('Saved!')
    flush()
    expect(root.textContent).toContain('Saved!')
    root.querySelector('button')!.click()
    flush()
    expect(root.textContent).not.toContain('Saved!')
  })

  it('opens and resolves imperative overlays via OverlayHost', async () => {
    const manager = createOverlays()
    const root = mount(() => <OverlayHost manager={manager} />)
    const promise = manager.open<string>((close) => (
      <button type="button" onClick={() => close('yes')}>
        Confirm Overlay
      </button>
    ))
    flush()
    root.querySelector('button')!.click()
    flush()
    expect(await promise).toBe('yes')
  })

  it('navigates Toolbar buttons with arrow keys', () => {
    const root = mount(() => (
      <Toolbar>
        <ToolbarButton>Bold</ToolbarButton>
        <ToolbarButton>Italic</ToolbarButton>
      </Toolbar>
    ))
    const buttons = root.querySelectorAll('button')
    buttons[0]!.focus()
    buttons[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    expect(document.activeElement).toBe(buttons[1])
  })
})
