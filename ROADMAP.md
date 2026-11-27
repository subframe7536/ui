# Full Component Alignment Roadmap (`@subf/ui` — `@ui-sdk/solid` Parity Complete)

This roadmap tracks full interface parity with [`vercel-labs/ui`](https://github.com/vercel-labs/ui) (`@ui-sdk/solid`) using pure SolidJS 2 signals and zero `@ui-sdk/core` dependency.

- **Upstream Submodule**: `ref/ui-sdk` (`https://github.com/vercel-labs/ui.git`)
- **Pinned Baseline Commit**: [`ce26b934e0b3bec982e055340ed9c47574030bf3`](https://github.com/vercel-labs/ui/commit/ce26b934e0b3bec982e055340ed9c47574030bf3)
- **Status**: **All 5 phases (56 component modules + foundation/observe/agent) are implemented.**

## Phase 1 — Foundation, Agent/Observe & Core Primitives (Implemented)

### Foundation & Page Layer
- [x] `primitive` — `PartProps`, `RenderProp`, `renderPart`, `composeRefs`, `composeHandlers`, `createControlledSignal`, `createController`, `useControllerEntry`, `useControllerTarget`
- [x] `foundation/focus` — roving tabindex (`navigateRoving`), focus trap & restore (`useFocusManagement`)
- [x] `foundation/dismissal` — Escape key, outside click, layered dismiss stack (`useDismissLayer`)
- [x] `foundation/popup` — `@floating-ui/dom` positioning, portal container, CSS geometry variables (`usePopupPosition`)
- [x] `foundation/action` — async action pending state, `aria-busy`, `ActionDetails`
- [x] `observe` — `observe`, `elementOf`, `withSource`, `ObservedChange`, native Solid 2 component registry
- [x] `agent` — `createAgent`, `agentTools`, `registerTools`, `AgentComponent`, `AgentStep`, `AgentAction`, `AgentChange`

### Batch 1 Components (11 modules)
- [x] `Separator` (`./separator`)
- [x] `Label` (`./label`)
- [x] `Button` (`./button`)
- [x] `Toggle` & `ToggleGroup` (`./toggle`)
- [x] `Switch` (`./switch`)
- [x] `Collapsible` (`./collapsible`)
- [x] `Accordion` (`./accordion`)
- [x] `Tabs` (`./tabs`)
- [x] `Dialog` (`./dialog`)
- [x] `AlertDialog` (`./alert-dialog`)
- [x] `Popover` (`./popover`)

## Phase 2 — Overlays, Menus & Selection (10 modules — Implemented)
- [x] `Tooltip` (`./tooltip`)
- [x] `HoverCard` (`./hover-card`)
- [x] `Drawer` (`./drawer`)
- [x] `Menu` (`./menu`)
- [x] `Menubar` (`./menubar`)
- [x] `TriggerMenu` (`./trigger-menu`)
- [x] `NavigationMenu` (`./navigation-menu`)
- [x] `Toast` (`./toast`)
- [x] `Overlays` (`./overlays`)
- [x] `Toolbar` (`./toolbar`)

## Phase 3 — Form Controls, Inputs & Progress/Meter (15 modules — Implemented)
- [x] `Field` & `FieldSet` (`./field`)
- [x] `Checkbox` & `CheckboxGroup` (`./checkbox`)
- [x] `Radio` & `RadioGroup` (`./radio`)
- [x] `Input` (`./input`)
- [x] `Textarea` (`./textarea`)
- [x] `PasswordInput` (`./password-input`)
- [x] `NumberInput` (`./number-input`)
- [x] `OTPInput` (`./otp-input`)
- [x] `FileInput` (`./file-input`)
- [x] `Slider` (`./slider`)
- [x] `Rating` (`./rating`)
- [x] `SegmentedControl` (`./segmented-control`)
- [x] `TokenInput` (`./token-input`)
- [x] `Progress` (`./progress`)
- [x] `Meter` (`./meter`)

## Phase 4 — Lists, Combobox & Data Selection (7 modules — Implemented)
- [x] `Listbox` (`./listbox`)
- [x] `Select` (`./select`)
- [x] `Combobox` (`./combobox`)
- [x] `Autocomplete` (`./autocomplete`)
- [x] `Command` (`./command`)
- [x] `Tree` (`./tree`)
- [x] `Pagination` (`./pagination`)

## Phase 5 — Specialized & Rich Interactive Components (13 modules — Implemented)
- [x] `Avatar` (`./avatar`)
- [x] `Carousel` (`./carousel`)
- [x] `Resizable` (`./resizable`)
- [x] `ScrollArea` (`./scroll-area`)
- [x] `Preferences` (`./preferences`)
- [x] `Calendar` (`./calendar`)
- [x] `DateInput` (`./date-input`)
- [x] `TimeInput` (`./time-input`)
- [x] `DatePicker` (`./date-picker`)
- [x] `ColorPicker` (`./color-picker`)
- [x] `ImageCropper` (`./image-cropper`)
- [x] `Timeline` (`./timeline`)
- [x] `Waterfall` (`./waterfall`)
