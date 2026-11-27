export type GuideSection = {
  id: string
  heading: string
  paragraphs: Array<string>
  code?: { title: string; content: string }
  callout?: string
}

export type GuideDoc = {
  slug: string
  group: 'Get Started' | 'Using Components' | 'Architecture'
  title: string
  description: string
  sections: Array<GuideSection>
}

export const GUIDES: Array<GuideDoc> = [
  {
    slug: 'index',
    group: 'Get Started',
    title: 'Introduction',
    description:
      '@subf/ui is a pure SolidJS 2 native headless UI SDK with API parity to @ui-sdk/solid — built directly on Solid 2 signals without a framework-agnostic kernel.',
    sections: [
      {
        id: 'why-solid2-native',
        heading: 'Why Solid 2 Native?',
        paragraphs: [
          'Instead of wrapping a framework-agnostic state machine kernel and bridging updates across subscriptions, every component in @subf/ui is written directly with SolidJS 2 primitives: createSignal, createMemo, createEffect, merge, omit, and isStatic.',
          'You get full API parity with @ui-sdk/solid (56 component entry points, imperative controllers, predictable data-* state attributes, and the agent/observe runtime) with zero kernel overhead and only @floating-ui/dom as a runtime dependency.',
        ],
        callout:
          'Reference baseline: vercel-labs/ui (@ui-sdk/solid) pinned at ref/ui-sdk (commit ce26b934e0b3bec982e055340ed9c47574030bf3).',
      },
      {
        id: 'whats-included',
        heading: 'What Is Included',
        paragraphs: [
          '56 tree-shakeable component subpaths (@subf/ui/dialog, @subf/ui/select, @subf/ui/combobox, @subf/ui/tabs, @subf/ui/tree, @subf/ui/waterfall, and more) alongside @subf/ui/agent, @subf/ui/observe, and @subf/ui/primitive.',
          'Every part supports reactive class, style, children, and custom render props while preserving DOM node identity via fine-grained Solid 2 merge() proxies.',
        ],
      },
    ],
  },
  {
    slug: 'installation',
    group: 'Get Started',
    title: 'Installation',
    description:
      'Install @subf/ui alongside SolidJS 2 and start importing individual component modules.',
    sections: [
      {
        id: 'install-package',
        heading: 'Install Package',
        paragraphs: [
          '@subf/ui targets SolidJS 2 (solid-js@^2.0.3 and @solidjs/web@^2.0.3). Install the package with pnpm, npm, or bun:',
        ],
        code: {
          title: 'Terminal',
          content: `pnpm add @subf/ui solid-js @solidjs/web`,
        },
      },
      {
        id: 'subpath-imports',
        heading: 'Subpath Imports',
        paragraphs: [
          'Import from dedicated subpaths for optimal tree-shaking, or from the root entry point when prototyping:',
        ],
        code: {
          title: 'src/App.tsx',
          content: `import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogClose } from '@subf/ui/dialog'
import { Switch, SwitchThumb } from '@subf/ui/switch'`,
        },
      },
    ],
  },
  {
    slug: 'first-component',
    group: 'Get Started',
    title: 'Your First Component',
    description:
      'Compose headless parts, bind state-aware styles, and control overlays declaratively or imperatively.',
    sections: [
      {
        id: 'compose-dialog',
        heading: 'Compose a Dialog',
        paragraphs: [
          'Every component is split into semantic parts. @subf/ui handles ARIA roles, focus restoration, Escape dismissal, and outside-press layering automatically.',
        ],
        code: {
          title: 'DeleteConfirmDialog.tsx',
          content: `import {
  Dialog,
  DialogTrigger,
  DialogBackdrop,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@subf/ui/dialog'

export function DeleteConfirmDialog() {
  return (
    <Dialog>
      <DialogTrigger class="btn">Delete project</DialogTrigger>
      <DialogBackdrop class="backdrop" />
      <DialogContent class="dialog">
        <DialogTitle>Delete project?</DialogTitle>
        <DialogDescription>This action cannot be undone.</DialogDescription>
        <div class="actions">
          <DialogClose class="btn">Cancel</DialogClose>
          <DialogClose returnValue="confirmed" class="btn-danger">
            Delete
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}`,
        },
      },
    ],
  },
  {
    slug: 'parts-and-composition',
    group: 'Using Components',
    title: 'Parts & Composition',
    description:
      'How renderPart composes internal ARIA attributes, user props, array refs, and custom render functions.',
    sections: [
      {
        id: 'render-prop',
        heading: 'Custom render Prop',
        paragraphs: [
          'Every part accepts a render={(props, state) => ...} prop to swap the underlying element or wrap a router link without losing event handlers, refs, or ARIA bindings.',
          'Because renderPart passes a reactive Solid 2 merge() proxy for both props and state, state updates patch attributes in place without recreating the DOM element.',
        ],
        code: {
          title: 'CustomRender.tsx',
          content: `import { Toggle } from '@subf/ui/toggle'

export function CustomToggle() {
  return (
    <Toggle
      render={(props, state) => (
        <button {...props} data-label={state.pressed ? 'active' : 'idle'} />
      )}
    >
      {(state) => (state.pressed ? 'On' : 'Off')}
    </Toggle>
  )
}`,
        },
      },
      {
        id: 'array-refs',
        heading: 'Native Solid 2 Array Refs',
        paragraphs: [
          'You can pass a single callback ref or a Solid 2 native array of refs (ref={[refA, refB]}). Internal element refs and user refs compose automatically.',
        ],
      },
    ],
  },
  {
    slug: 'state-and-events',
    group: 'Using Components',
    title: 'State & Events',
    description: 'Controlled and uncontrolled state patterns with cancelable ChangeDetails.',
    sections: [
      {
        id: 'controlled-uncontrolled',
        heading: 'Controlled vs Uncontrolled',
        paragraphs: [
          'Stateful components accept defaultValue / defaultOpen / defaultChecked for uncontrolled mode, or reactive value / open / checked props paired with onValueChange / onOpenChange / onCheckedChange for controlled mode.',
          'Every change handler receives a details object ({ reason, event, source, cancel() }) so you can inspect why a change happened or call details.cancel() to veto it.',
        ],
        code: {
          title: 'CancelableChange.tsx',
          content: `import { createSignal } from 'solid-js'
import { Switch, SwitchThumb } from '@subf/ui/switch'

export function GuardedSwitch() {
  const [checked, setChecked] = createSignal(false)
  return (
    <Switch
      checked={checked()}
      onCheckedChange={(next, details) => {
        if (details.reason === 'click') {
          setChecked(next)
        }
      }}
    >
      <SwitchThumb />
    </Switch>
  )
}`,
        },
      },
    ],
  },
  {
    slug: 'styling-and-animation',
    group: 'Using Components',
    title: 'Styling & Animation',
    description: 'Style components with data-* attributes or reactive class/style functions.',
    sections: [
      {
        id: 'data-attributes',
        heading: 'Data Attributes',
        paragraphs: [
          'Components expose predictable boolean and enum data-* attributes such as data-open, data-closed, data-checked, data-selected, data-highlighted, data-disabled, and data-side.',
          'You can style parts with plain CSS, Tailwind CSS, UnoCSS, or reactive class={(state) => ...} callbacks.',
        ],
        code: {
          title: 'styles.css',
          content: `.switch[data-checked] {
  background: var(--blue-solid);
}
.accordion-trigger[data-open] svg {
  transform: rotate(180deg);
}`,
        },
      },
    ],
  },
  {
    slug: 'controllers',
    group: 'Using Components',
    title: 'Imperative Controllers',
    description: 'Drive any component from outside its JSX tree using typed controllers.',
    sections: [
      {
        id: 'using-controllers',
        heading: 'External Triggers & Promise APIs',
        paragraphs: [
          'Create a controller with createDialogController(), createTabsController(), createPopoverController(), or any component controller factory and pass it to the controller prop.',
          'Dialog and Drawer controllers return a Promise from controller.open(payload) that resolves to the returnValue passed to DialogClose or controller.close(value).',
        ],
        code: {
          title: 'ImperativeDialog.tsx',
          content: `import { createDialogController, Dialog, DialogContent, DialogClose } from '@subf/ui/dialog'

const dialog = createDialogController<string>()

async function askUser() {
  const result = await dialog.open('project-alpha')
  console.log('Closed with:', result)
}`,
        },
      },
    ],
  },
  {
    slug: 'agents',
    group: 'Architecture',
    title: 'Agents & Observe Runtime',
    description:
      'Discover mounted components, read live state, invoke actions, and observe changes programmatically.',
    sections: [
      {
        id: 'agent-runtime',
        heading: 'Agent Discovery & Actions',
        paragraphs: [
          'Every interactive component registers itself in the lightweight @subf/ui/agent registry on mount and cleans up automatically on unmount. AI agents or test harnesses can inspect createAgent().snapshot(), read live state, and invoke registered actions via agent.act(...).',
        ],
        code: {
          title: 'agent-example.ts',
          content: `import { createAgent } from '@subf/ui/agent'
import { observe } from '@subf/ui/observe'

const agent = createAgent()
const snapshot = agent.snapshot()
console.log(snapshot.map((c) => ({ ref: c.ref, component: c.component, state: c.state })))

const stop = observe((record) => {
  console.log(record.component, record.key, record.previous, '->', record.value)
})`,
        },
      },
    ],
  },
]
