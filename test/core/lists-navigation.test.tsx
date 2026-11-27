import { render } from '@solidjs/web'
import { flush } from 'solid-js'
import { afterEach, describe, expect, it } from 'vitest'

import {
  Calendar,
  CalendarDay,
  CalendarGrid,
  CalendarHeading,
  CalendarNext,
  CalendarPrevious,
  CalendarWeeks,
} from '../../src/calendar'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselViewport,
} from '../../src/carousel'
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '../../src/combobox'
import { Command, CommandInput, CommandItem, CommandList } from '../../src/command'
import { Listbox, ListboxItem } from '../../src/listbox'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '../../src/navigation-menu'
import { Toolbar, ToolbarButton } from '../../src/toolbar'
import { Tree, TreeItems, treeFromPaths } from '../../src/tree'

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

describe('core lists and navigation migrated from ref/ui-sdk/packages/core/test', () => {
  it('tree expands branches on click/ArrowRight and collapses on ArrowLeft', () => {
    const items = treeFromPaths(['src/index.ts', 'src/utils.ts', 'README.md'])
    const root = mount(() => (
      <Tree items={items}>
        <TreeItems />
      </Tree>
    ))

    const rows = () => root.querySelectorAll<HTMLElement>('[role="treeitem"]')
    expect(rows()).toHaveLength(2)

    rows()[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    flush()
    expect(rows()).toHaveLength(4)

    rows()[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    flush()
    expect(rows()).toHaveLength(2)
  })

  it('listbox supports single and multiple selection', () => {
    const seen: Array<string | Array<string> | null> = []
    const root = mount(() => (
      <Listbox multiple defaultValue={['a']} onValueChange={(v) => seen.push(v)}>
        <ListboxItem value="a">Alpha</ListboxItem>
        <ListboxItem value="b">Beta</ListboxItem>
        <ListboxItem value="c" disabled>
          Gamma
        </ListboxItem>
      </Listbox>
    ))

    const opts = root.querySelectorAll<HTMLElement>('[role="option"]')
    expect(opts[0]!.getAttribute('aria-selected')).toBe('true')
    opts[1]!.click()
    flush()
    expect(seen.at(-1)).toEqual(['a', 'b'])

    opts[2]!.click()
    flush()
    expect(seen.at(-1)).toEqual(['a', 'b'])
  })

  it('combobox filters items by query and selects on item press', () => {
    const seen: Array<string | Array<string> | null> = []
    const root = mount(() => (
      <Combobox defaultOpen onValueChange={(v) => seen.push(v)}>
        <ComboboxInput aria-label="Language" />
        <ComboboxContent>
          <ComboboxList>
            <ComboboxItem value="ts" label="TypeScript">
              TypeScript
            </ComboboxItem>
            <ComboboxItem value="rs" label="Rust">
              Rust
            </ComboboxItem>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    ))

    const input = root.querySelector('input')!
    input.value = 'ru'
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    flush()
    const options = document.querySelectorAll<HTMLElement>('[role="option"]')
    expect(options).toHaveLength(1)
    options[0]!.click()
    flush()
    expect(seen.at(-1)).toBe('rs')
  })

  it('command filters items by search query and triggers onSelect', () => {
    const selected: Array<string> = []
    const root = mount(() => (
      <Command>
        <CommandInput aria-label="Search" />
        <CommandList>
          <CommandItem value="settings" label="Settings" onSelect={() => selected.push('settings')}>
            Settings
          </CommandItem>
          <CommandItem value="calendar" label="Calendar" onSelect={() => selected.push('calendar')}>
            Calendar
          </CommandItem>
        </CommandList>
      </Command>
    ))

    const input = root.querySelector('input')!
    input.value = 'set'
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    flush()
    const items = root.querySelectorAll<HTMLElement>('[role="option"]')
    expect(items).toHaveLength(1)
    items[0]!.click()
    flush()
    expect(selected).toEqual(['settings'])
  })

  it('calendar navigates months and selects a date cell', () => {
    const seen: Array<unknown> = []
    const root = mount(() => (
      <Calendar defaultMonth="2026-10" onValueChange={(v) => seen.push(v)}>
        <CalendarPrevious>Prev</CalendarPrevious>
        <CalendarHeading />
        <CalendarNext>Next</CalendarNext>
        <CalendarGrid>
          <CalendarWeeks>
            {(cell) => <CalendarDay cell={cell}>{cell.day}</CalendarDay>}
          </CalendarWeeks>
        </CalendarGrid>
      </Calendar>
    ))

    const next = Array.from(root.querySelectorAll('button')).find((b) => b.textContent === 'Next')!
    next.click()
    flush()
    expect(root.textContent).toContain('November')

    const day15 = root.querySelector<HTMLButtonElement>('[data-value="2026-11-15"]')!
    day15.click()
    flush()
    expect(seen.at(-1)).toBe('2026-11-15')
  })

  it('carousel advances pages with next and previous controls', () => {
    const pages: Array<number> = []
    const root = mount(() => (
      <Carousel defaultPage={0} onPageChange={(p) => pages.push(p)}>
        <CarouselViewport>
          <CarouselContent>
            <CarouselItem>Slide 1</CarouselItem>
            <CarouselItem>Slide 2</CarouselItem>
            <CarouselItem>Slide 3</CarouselItem>
          </CarouselContent>
        </CarouselViewport>
        <CarouselPrevious>Prev</CarouselPrevious>
        <CarouselNext>Next</CarouselNext>
      </Carousel>
    ))

    const next = Array.from(root.querySelectorAll('button')).find((b) => b.textContent === 'Next')!
    const prev = Array.from(root.querySelectorAll('button')).find((b) => b.textContent === 'Prev')!
    next.click()
    flush()
    expect(pages.at(-1)).toBe(1)
    prev.click()
    flush()
    expect(pages.at(-1)).toBe(0)
  })

  it('navigation menu opens content on trigger press and closes on link click', () => {
    const root = mount(() => (
      <NavigationMenu>
        <NavigationMenuList>
          <NavigationMenuItem value="docs">
            <NavigationMenuTrigger>Docs</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink href="#guide">Guide</NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    ))

    const trigger = root.querySelector('button')!
    trigger.click()
    flush()
    const link = root.querySelector('a')!
    expect(link.textContent).toBe('Guide')
    link.click()
    flush()
    expect(root.querySelector('a')).toBeNull()
  })

  it('toolbar moves focus across enabled buttons with ArrowRight', () => {
    const root = mount(() => (
      <Toolbar aria-label="Formatting">
        <ToolbarButton>Bold</ToolbarButton>
        <ToolbarButton disabled>Disabled</ToolbarButton>
        <ToolbarButton>Italic</ToolbarButton>
      </Toolbar>
    ))
    const buttons = root.querySelectorAll('button')
    buttons[0]!.focus()
    buttons[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    flush()
    expect(document.activeElement).toBe(buttons[2])
  })
})
