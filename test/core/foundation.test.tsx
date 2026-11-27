import { render } from '@solidjs/web'
import { createSignal, flush } from 'solid-js'
import { afterEach, describe, expect, it } from 'vitest'

import { createAgent } from '../../src/agent'
import {
  attachController,
  createController,
  detachController,
  isControllerAttached,
} from '../../src/foundation/controller'
import { createChangeDetails, inferSource, withSource } from '../../src/foundation/details'
import { useDismissLayer } from '../../src/foundation/dismissal'
import { getFocusableElements, navigateRoving } from '../../src/foundation/focus'
import { createControlledSignal } from '../../src/foundation/state'
import { elementOf, observe } from '../../src/observe'
import { Switch } from '../../src/switch'

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

describe('core foundation migrated from ref/ui-sdk/packages/core/test', () => {
  it('createChangeDetails tracks reason, source, and cancelable flag', () => {
    const details = createChangeDetails('trigger-press')
    expect(details.reason).toBe('trigger-press')
    expect(details.canceled).toBe(false)
    details.cancel()
    expect(details.canceled).toBe(true)

    const agentSource = withSource('agent', () => inferSource())
    expect(agentSource).toBe('agent')
  })

  it('createControlledSignal switches cleanly between uncontrolled and controlled values', () => {
    const [external, setExternal] = createSignal<string | undefined>(undefined)
    const [val, setVal] = createControlledSignal<string>({
      value: external,
      defaultValue: () => 'init',
    })
    expect(val()).toBe('init')
    setVal('local')
    flush()
    expect(val()).toBe('local')
    setExternal('controlled')
    flush()
    expect(val()).toBe('controlled')
    setVal('ignored-when-controlled')
    flush()
    expect(val()).toBe('controlled')
  })

  it('createController attaches, forwards calls, and detaches cleanly', () => {
    const ctrl = createController<{ ping: () => string }>()
    const api = { ping: () => 'pong' }
    expect(isControllerAttached(ctrl)).toBe(false)
    expect(ctrl.ping()).toBeUndefined()
    attachController(ctrl, api)
    expect(isControllerAttached(ctrl)).toBe(true)
    expect(ctrl.ping()).toBe('pong')
    detachController(ctrl, api)
    expect(isControllerAttached(ctrl)).toBe(false)
    expect(ctrl.ping()).toBeUndefined()
  })

  it('useDismissLayer closes topmost layer first on Escape and outside press', () => {
    const dismissed: Array<string> = []
    const [outerOpen, setOuterOpen] = createSignal(true)
    const [innerOpen, setInnerOpen] = createSignal(true)

    mount(() => {
      const outerEl = document.createElement('div')
      const innerEl = document.createElement('div')
      useDismissLayer({
        active: outerOpen,
        getElements: () => [outerEl],
        onDismiss: (reason) => {
          dismissed.push(`outer:${reason}`)
          setOuterOpen(false)
        },
      })
      useDismissLayer({
        active: innerOpen,
        getElements: () => [innerEl],
        onDismiss: (reason) => {
          dismissed.push(`inner:${reason}`)
          setInnerOpen(false)
        },
      })
      return (
        <div>
          <span>layers</span>
        </div>
      )
    })

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    flush()
    expect(dismissed).toEqual(['inner:escape-key'])

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    flush()
    expect(dismissed).toEqual(['inner:escape-key', 'outer:escape-key'])
  })

  it('navigateRoving moves focus across items with loop and Home/End', () => {
    const root = mount(() => (
      <div>
        <button type="button">A</button>
        <button type="button" disabled>
          B
        </button>
        <button type="button">C</button>
      </div>
    ))
    const focusables = getFocusableElements(root)
    expect(focusables.map((el) => el.textContent)).toEqual(['A', 'C'])

    focusables[0]!.focus()
    navigateRoving(
      new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }),
      focusables,
      focusables[0]!,
      { orientation: 'horizontal', loop: true },
    )
    expect(document.activeElement).toBe(focusables[1])

    navigateRoving(
      new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }),
      focusables,
      focusables[1]!,
      { orientation: 'horizontal', loop: true },
    )
    expect(document.activeElement).toBe(focusables[0])

    navigateRoving(
      new KeyboardEvent('keydown', { key: 'End', cancelable: true }),
      focusables,
      focusables[0]!,
      { orientation: 'horizontal', loop: false },
    )
    expect(document.activeElement).toBe(focusables[1])
  })

  it('observe and createAgent coordinate component snapshots and actions', async () => {
    const events: Array<{ component: string; source: string; value: unknown }> = []
    const root = mount(() => <Switch aria-label="Dark mode" />)
    const stop = observe(
      (change) => {
        events.push({ component: change.component, source: change.source, value: change.value })
      },
      { within: root },
    )

    const agent = createAgent()
    const snap = agent.snapshot({ within: root })
    expect(snap.length).toBeGreaterThanOrEqual(1)
    const sw = snap.find((c) => c.component === 'switch')!
    expect(elementOf(sw.ref)).toBe(root.querySelector('[role="switch"]'))

    const res = await agent.act({
      steps: [{ ref: sw.ref, action: 'setChecked', args: [true] }],
    })
    flush()
    expect(res.ok).toBe(true)
    expect(events.at(-1)?.component).toBe('switch')
    expect(events.at(-1)?.value).toBe(true)
    stop()
  })
})
