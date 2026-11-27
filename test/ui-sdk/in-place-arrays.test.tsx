import { render } from '@solidjs/web'
import type { JSX } from '@solidjs/web'
// A Solid store's setter changes an array in place, like
// `setState((draft) => { draft.selected.push("b") })`, so a component given
// that array follows, in what it shows and in what its form submits.
import { createStore, flush, For } from 'solid-js'
import { afterEach, describe, expect, it } from 'vitest'

import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from '../../src/accordion'
import { Checkbox, CheckboxGroup } from '../../src/checkbox'
import { Combobox, ComboboxInput, ComboboxValue } from '../../src/combobox'
import { Listbox } from '../../src/listbox'
import { Select, SelectTrigger } from '../../src/select'
import { Toggle, ToggleGroup } from '../../src/toggle'
import { Tree } from '../../src/tree'

const fruits = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
]

let dispose: (() => void) | undefined
afterEach(() => {
  dispose?.()
  dispose = undefined
  document.body.replaceChildren()
})

function mount(code: () => JSX.Element) {
  const form = document.createElement('form')
  document.body.append(form)
  dispose = render(code, form)
  flush()
  return form
}

const labelsWhere = (el: HTMLElement, selector: string, attribute: string) =>
  [...el.querySelectorAll(selector)]
    .filter((item) => item.getAttribute(attribute) === 'true')
    .map((item) => item.textContent || item.getAttribute('aria-label'))

const labelsIn = (el: HTMLElement, selector: string) =>
  el.querySelector(selector)!.textContent.split(', ').filter(Boolean)

// `shownReversed`, for the components that submit in their list's order, is
// what they show once that list of all three is reversed in place.
const components = [
  {
    name: 'Listbox',
    render: (value: () => Array<string>) => (
      <Listbox multiple name="fruit" items={fruits} value={value()} />
    ),
    shown: (el: HTMLElement) => labelsWhere(el, '[role="option"]', 'aria-selected'),
    submits: true,
    // Its options keep their order on the page.
    shownReversed: ['Apple', 'Banana', 'Cherry'],
  },
  {
    name: 'Select',
    render: (value: () => Array<string>) => (
      <Select multiple name="fruit" items={fruits} value={value()}>
        <SelectTrigger />
      </Select>
    ),
    shown: (el: HTMLElement) => labelsIn(el, '[data-slot="select-value"]'),
    submits: true,
    shownReversed: ['Cherry', 'Banana', 'Apple'],
  },
  {
    name: 'Combobox',
    render: (value: () => Array<string>) => (
      <Combobox multiple name="fruit" items={fruits} value={value()}>
        <output>
          <ComboboxValue />
        </output>
        <ComboboxInput />
      </Combobox>
    ),
    shown: (el: HTMLElement) => labelsIn(el, 'output'),
    submits: true,
    shownReversed: ['Cherry', 'Banana', 'Apple'],
  },
  {
    name: 'ToggleGroup',
    render: (value: () => Array<string>) => (
      <ToggleGroup multiple value={value()}>
        <For each={fruits}>{(fruit) => <Toggle value={fruit.value}>{fruit.label}</Toggle>}</For>
      </ToggleGroup>
    ),
    shown: (el: HTMLElement) => labelsWhere(el, 'button', 'aria-pressed'),
    submits: false,
  },
  {
    name: 'CheckboxGroup',
    render: (value: () => Array<string>) => (
      <CheckboxGroup name="fruit" value={value()}>
        <For each={fruits}>
          {(fruit) => <Checkbox value={fruit.value} aria-label={fruit.label} />}
        </For>
      </CheckboxGroup>
    ),
    shown: (el: HTMLElement) => labelsWhere(el, '[role="checkbox"]', 'aria-checked'),
    submits: true,
  },
  {
    name: 'Accordion',
    render: (value: () => Array<string>) => (
      <Accordion multiple value={value()}>
        <For each={fruits}>
          {(fruit) => (
            <AccordionItem value={fruit.value}>
              <AccordionHeader>
                <AccordionTrigger>{fruit.label}</AccordionTrigger>
              </AccordionHeader>
              <AccordionPanel>{fruit.label} panel</AccordionPanel>
            </AccordionItem>
          )}
        </For>
      </Accordion>
    ),
    shown: (el: HTMLElement) => labelsWhere(el, 'button', 'aria-expanded'),
    submits: false,
  },
  {
    name: 'Tree',
    render: (expanded: () => Array<string>) => (
      <Tree
        aria-label="Fruit"
        items={fruits.map((fruit) => ({
          value: fruit.value,
          label: fruit.label,
          children: [{ value: `${fruit.value}-seed`, label: 'Seed' }],
        }))}
        expanded={expanded()}
      />
    ),
    shown: (el: HTMLElement) =>
      [...el.querySelectorAll('[role="treeitem"][aria-expanded="true"]')].map(
        (item) => item.querySelector('[data-slot="tree-label"]')!.textContent,
      ),
    submits: false,
  },
]

describe.each(components)('$name', ({ render, shown, submits }) => {
  it('follows an item pushed into its store list', () => {
    const [state, setState] = createStore({ selected: ['apple'] })
    // oxlint-disable-next-line subf/solid-reactivity
    const form = mount(() => render(() => state.selected))
    expect(shown(form)).toEqual(['Apple'])
    setState((draft) => {
      draft.selected.push('banana')
    })
    flush()
    expect(shown(form)).toEqual(['Apple', 'Banana'])
    if (submits) {
      // oxlint-disable-next-line vitest/no-conditional-expect
      expect(new FormData(form).getAll('fruit')).toEqual(['apple', 'banana'])
    }
  })

  it('follows an item spliced out of its store list', () => {
    const [state, setState] = createStore({ selected: ['apple', 'banana'] })
    // oxlint-disable-next-line subf/solid-reactivity
    const form = mount(() => render(() => state.selected))
    expect(shown(form)).toEqual(['Apple', 'Banana'])
    setState((draft) => {
      draft.selected.splice(0, 1)
    })
    flush()
    expect(shown(form)).toEqual(['Banana'])
    if (submits) {
      // oxlint-disable-next-line vitest/no-conditional-expect
      expect(new FormData(form).getAll('fruit')).toEqual(['banana'])
    }
  })

  it('follows its store list replaced by an equal one, then pushed into', () => {
    const [state, setState] = createStore({ selected: ['apple'] })
    // oxlint-disable-next-line subf/solid-reactivity
    const form = mount(() => render(() => state.selected))
    setState((draft) => {
      draft.selected.push('banana')
    })
    flush()
    setState((draft) => {
      draft.selected = [...draft.selected]
    })
    flush()
    setState((draft) => {
      draft.selected.push('cherry')
    })
    flush()
    expect(shown(form)).toEqual(['Apple', 'Banana', 'Cherry'])
    if (submits) {
      // oxlint-disable-next-line vitest/no-conditional-expect
      expect(new FormData(form).getAll('fruit')).toEqual(['apple', 'banana', 'cherry'])
    }
  })
})

describe.each(components.filter((component) => component.shownReversed))(
  '$name',
  ({ render, shown, shownReversed }) => {
    it('follows its store list reordered in place', () => {
      const [state, setState] = createStore({
        selected: ['apple', 'banana', 'cherry'],
      })
      // oxlint-disable-next-line subf/solid-reactivity
      const form = mount(() => render(() => state.selected))
      setState((draft) => {
        draft.selected.reverse()
      })
      flush()
      expect(shown(form)).toEqual(shownReversed)
      expect(new FormData(form).getAll('fruit')).toEqual(['cherry', 'banana', 'apple'])
    })
  },
)
