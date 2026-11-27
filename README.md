# @subframe7536/ui

SolidJS 2 native UI SDK — API-compatible with [`@ui-sdk/solid`](https://ui-sdk.dev/docs/solid) (`vercel-labs/ui`), rewritten directly on Solid 2 signals (`solid-js@^2.0.0`, `@solidjs/web@^2.0.0`) without the framework-agnostic `@ui-sdk/core` store/part bridge.

## Design Goals

- **100% Solid 2 Native Reactivity**: No dual reactive kernel, no `ownedWrite` tick bridges, no props proxies. Components use Solid 2 signals, memos, effects, context, and native JSX props directly.
- **Interface Parity with `@ui-sdk/solid`**: Same component names, sub-parts, subpath exports, `PartProps` (`class(state)`, `style(state)`, `render(props, state)`, `children(state)`), `create*Controller()`, `ChangeDetails`, `data-*` attributes, and ARIA semantics.
- **First-Class Agent & Observe Surface**: Native Solid 2 component registry powering `observe()`, `elementOf()`, `withSource()`, `createAgent()`, `agentTools`, and `registerTools()`.
- **Phased 51-Component Alignment**: See [ROADMAP.md](./ROADMAP.md) for the full 51-component rollout plan.

## Installation

```bash
pnpm add @subframe7536/ui solid-js@^2.0.0 @solidjs/web@^2.0.0
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
} from "@subframe7536/ui/dialog"

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
pnpm typecheck
pnpm test
pnpm build
```

## License

Apache-2.0 — API design inspired by [vercel-labs/ui](https://github.com/vercel-labs/ui).
