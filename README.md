# @subf/ui

SolidJS 2 native UI SDK — API-compatible with [`@ui-sdk/solid`](https://ui-sdk.dev/docs/solid) ([`vercel-labs/ui`](https://github.com/vercel-labs/ui)), rewritten directly on Solid 2 signals (`solid-js@^2.0.3`, `@solidjs/web@^2.0.3`) without the framework-agnostic `@ui-sdk/core` store/part bridge.

## Upstream Reference

API parity is tracked against the [`vercel-labs/ui`](https://github.com/vercel-labs/ui) git submodule at `ref/ui-sdk`:

- **Pinned Commit**: [`ce26b934e0b3bec982e055340ed9c47574030bf3`](https://github.com/vercel-labs/ui/commit/ce26b934e0b3bec982e055340ed9c47574030bf3) (`fix(core): keep the view in place on a late stick-to-bottom prepend and drop it from the docs (#1335)`)

## Design Goals

- **100% Solid 2 Native Reactivity**: No dual reactive kernel, no `ownedWrite` tick bridges, no props proxies. Components use Solid 2 signals, memos, effects, context, and native JSX props directly.
- **Interface Parity with `@ui-sdk/solid`**: Same component names, sub-parts, subpath exports, `PartProps` (`class(state)`, `style(state)`, `render(props, state)`, `children(state)`), `create*Controller()`, `ChangeDetails`, `data-*` attributes, and ARIA semantics.
- **First-Class Agent & Observe Surface**: Native Solid 2 component registry powering `observe()`, `elementOf()`, `withSource()`, `createAgent()`, `agentTools`, and `registerTools()`.
- **Complete 56-Module Coverage**: All 5 phases implemented. See [ROADMAP.md](./ROADMAP.md) for the full component inventory.

## Installation

```bash
pnpm add @subf/ui solid-js@^2.0.3 @solidjs/web@^2.0.3
```

## Quick Example

```tsx
import {
  Dialog,
  DialogTrigger,
  DialogBackdrop,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
  createDialogController,
} from '@subf/ui/dialog'

const controller = createDialogController()

export function Example() {
  return (
    <Dialog controller={controller}>
      <DialogTrigger>Open</DialogTrigger>
      <DialogBackdrop />
      <DialogContent>
        <DialogTitle>Confirm action</DialogTitle>
        <DialogDescription>This runs natively on Solid 2 signals.</DialogDescription>
        <DialogClose>Close</DialogClose>
      </DialogContent>
    </Dialog>
  )
}
```

## Development

```bash
pnpm install
pnpm run qa
pnpm run test
pnpm run build
```

## License

Apache-2.0 — API design inspired by [vercel-labs/ui](https://github.com/vercel-labs/ui).
