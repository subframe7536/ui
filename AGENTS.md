# AGENTS.md

This file contains definitive guidelines for coding agents working on `@subf/ui`, a pure SolidJS 2 native headless UI library maintaining full API parity with `@ui-sdk/solid` (`vercel-labs/ui`) without depending on `@ui-sdk/core`.
Agents must follow these instructions to ensure consistency, quality, and maintainability.

## Upstream Reference & Baseline Commit

API parity, component names, sub-part structures, `data-*` attributes, ARIA semantics, and `observe` / `agent` contracts are anchored to the upstream `vercel-labs/ui` repository checked out as a git submodule at `ref/ui-sdk`:

- **Upstream Repository**: `https://github.com/vercel-labs/ui.git`
- **Submodule Path**: `ref/ui-sdk`
- **Pinned Baseline Commit**: `ce26b934e0b3bec982e055340ed9c47574030bf3` (`fix(core): keep the view in place on a late stick-to-bottom prepend and drop it from the docs (#1335)`)

When verifying or updating component interfaces, compare against `ref/ui-sdk/packages/solid/src/` and `ref/ui-sdk/packages/core/src/components/`. Never import from `ref/ui-sdk`, `@ui-sdk/core`, or `@ui-sdk/solid` in `src/` or `test/`.

## Essential Commands

Use `pnpm` (`pnpm@12.18.0`, Node `24.20.0` per `.node-version`) for package management and script execution. Run all commands from the repository root.

### Build & Typecheck

- `pnpm run build` - Build all ESM (`.mjs`), Solid JSX (`.jsx`), and declaration (`.d.mts`) outputs to `dist/` via `tsdown` (`dts.generator: 'tsrs'`).
- `pnpm run typecheck` - Run strict TypeScript checking with `tsrs --noEmit --fast`.

### Linting & Formatting

- `pnpm run lint` - Run `oxlint --fix --max-warnings 0 --report-unused-disable-directives` (configured via `@subf/config/oxlint` with `solid: true` and `typeAware: true`).
- `pnpm run format` - Format code with `oxfmt` (configured via `@subf/config/oxfmt`).
- `pnpm run qa` - Run `lint`, `format`, and `typecheck` together. **Run this before every commit and ensure `git diff` is clean.**

### Testing

- `pnpm run test` - Build the library (`tsdown`), run consumer declaration type checks (`pnpm run test:types`), and run all Vitest projects (`pnpm run test:unit`).
- `pnpm run test:types` - Run `tsrs -p test/types/tsconfig.json` against the built `dist/` declarations using `@subf/ui` package imports.
- `pnpm run test:unit` - Run Vitest (`unit` project in `vmThreads` + `jsdom`, and `boundaries` project in `node`).
- `pnpm run test:watch` - Run Vitest in watch mode.
- `pnpm vitest run <test-file>` - Run a single test file (run `pnpm run build` first if testing `test/entry-boundaries.test.ts`).

### Commit Messages

- Follow Conventional Commits: `<type>(<scope>): <description>`. Omit the scope only when no single component or area describes the change.
- Use lowercase types: `feat`, `fix`, `refactor`, `docs`, `test`, `style`, `perf`, `build`, `ci`, `chore`, or `revert`.
- Write a concise English description in the imperative mood without a trailing period (e.g. `fix(dialog): restore trigger focus on escape`).

## Architecture & Source Structure

```text
├── src/
│   ├── index.ts            # Barrel re-export of all components, types, and controllers
│   ├── primitive.ts        # Low-level primitive helpers (renderPart, createControlledSignal, controller, registry)
│   ├── observe.ts          # Page-level state observation (observe, elementOf, withSource)
│   ├── agent.ts            # Agent inspection & action execution (createAgent, agentTools, registerTools)
│   ├── foundation/         # Internal Solid 2 native infrastructure
│   │   ├── action.ts       # Async action pending state and aria-busy handling
│   │   ├── controller.ts   # Imperative create*Controller() registry and target binding
│   │   ├── details.ts      # ChangeDetails and source ("user" | "agent" | "programmatic") tracking
│   │   ├── dismissal.ts    # Layered Escape / outside-click dismissal stack
│   │   ├── focus.ts        # Roving tabindex navigation, focus trap, and focus restore
│   │   ├── popup.ts        # @floating-ui/dom positioning and portal container helpers
│   │   ├── registry.ts     # Mounted component registry for observe() and createAgent()
│   │   ├── render.ts       # PartProps, class(state), style(state), render(props, state), children(state)
│   │   └── state.ts        # createControlledSignal for controlled/uncontrolled state
│   └── <component>.tsx     # 56 standalone Solid 2 component modules (one per subpath export)
├── test/
│   ├── setup.ts            # jsdom exit-animation CSS and browser API shims
│   ├── entry-boundaries.test.ts  # Verifies dist/ exports and dependency isolation
│   ├── types/              # Consumer-perspective type tests against dist/ declarations
│   └── *.test.tsx          # Component and observe/agent unit tests
└── ref/ui-sdk/             # Pinned upstream vercel-labs/ui git submodule (reference only)
```

## Coding & Reactivity Rules (SolidJS 2)

1. **Pure SolidJS 2 Native Reactivity**:
   - Build state directly on `solid-js@^2.0.3` and `@solidjs/web@^2.0.3` primitives (`createSignal`, `createMemo`, `createEffect`, `createContext`, `onCleanup`, `omit`, `merge`, `Show`, `For`, `Portal`).
   - Do not reintroduce a framework-agnostic store/kernel bridge or props proxy layer.
   - Keep `jsxImportSource` set to `"@solidjs/web"`.
2. **Part Rendering & API Parity**:
   - Every component slot must support `PartProps<Tag, State>`: static or `(state) => string` `class`, static or `(state) => JSX.CSSProperties` `style`, `render(props, state)`, and static or `(state) => JSX.Element` `children` via `renderPart`.
   - Maintain exact component names, sub-part names, prop names, `data-*` attributes, and `create*Controller()` signatures matching `ref/ui-sdk/packages/solid/src/`.
3. **Form Library Agnostic**:
   - Forms participate via native HTML `<form>`, `FormData`, hidden inputs, Constraint Validation, and `Field` / `FieldSet` / `FieldError` context.
   - Do **not** add third-party form libraries (such as `@formisch/solid`) to `dependencies`.
4. **Dependency & Entry Boundaries**:
   - The only runtime dependency in `package.json` is `@floating-ui/dom`.
   - Non-floating component entries (e.g., `button`, `checkbox`, `field`, `tabs`, `accordion`, `switch`, `slider`) must **never** pull in `@floating-ui/dom`.
   - Pure non-JSX entries (`agent`, `observe`, `primitive`) must **never** pull in `@solidjs/web`.
   - Published outputs must **never** reference `@formisch/solid`, `@ui-sdk/core`, or `@ui-sdk/solid`.
   - Keep `test/entry-boundaries.test.ts` passing after every build.
5. **Adding or Modifying Subpath Exports**:
   - Update `src/index.ts`, `tsdown.config.ts` (`allEntries` and `jsxEntries`), `package.json` (`exports`), and `test/types/index.tsx` together whenever adding or renaming an entry.

## CI Expectations

GitHub Actions (`.github/workflows/CI.yml`) runs two jobs on `push` to `main` and `pull_request`:

1. **QA**: Runs `pnpm run qa` and enforces `git diff --exit-code` so all lint/format fixes must be committed.
2. **Test**: Runs `pnpm run build`, `pnpm run test:types`, and `pnpm run test:unit` (using `--changed` when a base commit is available, or the full suite otherwise).
