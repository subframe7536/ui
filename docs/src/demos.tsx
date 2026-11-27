import type { JSX } from '@solidjs/web'
import { createSignal, For } from 'solid-js'

import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
  Avatar,
  AvatarFallback,
  Button,
  Calendar,
  CalendarDay,
  CalendarGrid,
  CalendarHeading,
  CalendarNext,
  CalendarPrevious,
  CalendarWeekdays,
  CalendarWeeks,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselViewport,
  Checkbox,
  CheckboxIndicator,
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
  Drawer,
  DrawerBackdrop,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
  Field,
  FieldDescription,
  FieldLabel,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Input,
  InputClear,
  InputGroup,
  Label,
  Listbox,
  ListboxItem,
  Menu,
  MenuContent,
  MenuItem,
  MenuTrigger,
  Meter,
  MeterIndicator,
  MeterTrack,
  MeterValue,
  NumberInput,
  NumberInputControl,
  NumberInputDecrement,
  NumberInputGroup,
  NumberInputIncrement,
  OTPInput,
  OTPInputGroup,
  OTPInputSlot,
  Pagination,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PasswordInput,
  PasswordInputControl,
  PasswordInputToggle,
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
  Progress,
  ProgressIndicator,
  ProgressTrack,
  ProgressValue,
  Radio,
  RadioGroup,
  RadioIndicator,
  Rating,
  RatingItem,
  SegmentedControl,
  SegmentedControlItem,
  Select,
  SelectContent,
  SelectItem,
  SelectList,
  SelectTrigger,
  SelectValue,
  Separator,
  Slider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
  Switch,
  SwitchThumb,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
  Textarea,
  Timeline,
  TimelineDescription,
  TimelineItem,
  TimelineMarker,
  TimelineTime,
  TimelineTitle,
  Toast,
  ToastClose,
  ToastDescription,
  ToastRegion,
  ToastTitle,
  Toggle,
  ToggleGroup,
  Toolbar,
  ToolbarButton,
  ToolbarSeparator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Autocomplete,
  AutocompleteClear,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  ColorPicker,
  ColorPickerInput,
  ColorPickerSlider,
  ColorPickerSliderThumb,
  ColorPickerSwatch,
  ColorPickerSwatchItem,
  ColorPickerSwatches,
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  DateInput,
  DateInputSegment,
  DatePicker,
  DatePickerClear,
  DatePickerContent,
  DatePickerPreset,
  DatePickerTrigger,
  FileInput,
  FileInputDropzone,
  FileInputItem,
  FileInputItemRemove,
  FileInputList,
  FileInputTrigger,
  ImageCropper,
  ImageCropperFlip,
  ImageCropperGrid,
  ImageCropperHandle,
  ImageCropperImage,
  ImageCropperRotate,
  ImageCropperSelection,
  ImageCropperViewport,
  Menubar,
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  OverlayHost,
  Preferences,
  Resizable,
  ResizableHandle,
  ResizablePanel,
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaScrollToEnd,
  ScrollAreaViewport,
  TimeInput,
  TimeInputSegment,
  TokenInput,
  TokenInputEditor,
  TokenInputToken,
  TokenInputTokenRemove,
  Tree,
  TreeItem,
  TreeItemIndicator,
  TreeItemLabel,
  TreeItems,
  TriggerMenu,
  TriggerMenuContent,
  TriggerMenuEmpty,
  TriggerMenuInput,
  TriggerMenuItem,
  TriggerMenuList,
  Waterfall,
  WaterfallAxis,
  WaterfallBar,
  WaterfallCell,
  WaterfallColumnHeader,
  WaterfallHeaderRow,
  WaterfallRow,
  WaterfallRowHeader,
  createOverlays,
  formatFileSize,
  toText,
  treeFromPaths,
  usePreference,
  createToaster,
} from '../../src'

function ButtonDemo() {
  const [count, setCount] = createSignal(0)
  const handleSave = async () => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 450)
    })
    setCount((c) => c + 1)
  }
  return (
    <div class="ui-row">
      <Button class="ui-btn ui-btn-solid" onClick={handleSave}>
        {(s) => (s.pending ? 'Saving...' : `Async Save (${count()})`)}
      </Button>
      <Button class="ui-btn" disabled>
        Disabled
      </Button>
    </div>
  )
}

function SwitchDemo() {
  const [checked, setChecked] = createSignal(true)
  return (
    <div class="ui-row">
      <Switch class="ui-switch" checked={checked()} onCheckedChange={(v) => setChecked(v)}>
        <SwitchThumb class="ui-switch-thumb" />
      </Switch>
      <span class="ui-state-pill">checked: {String(checked())}</span>
    </div>
  )
}

function ToggleDemo() {
  const [align, setAlign] = createSignal<string | undefined>('left')
  return (
    <div class="ui-col">
      <ToggleGroup
        class="ui-toggle-group"
        value={align()}
        onValueChange={(v) => setAlign(v as string | undefined)}
      >
        <Toggle class="ui-toggle" value="left">
          Left
        </Toggle>
        <Toggle class="ui-toggle" value="center">
          Center
        </Toggle>
        <Toggle class="ui-toggle" value="right">
          Right
        </Toggle>
      </ToggleGroup>
      <span class="ui-state-pill">align: {align() ?? 'none'}</span>
    </div>
  )
}

function SegmentedDemo() {
  const [view, setView] = createSignal<'day' | 'week' | 'month'>('week')
  return (
    <div class="ui-col">
      <SegmentedControl class="ui-segmented" value={view()} onValueChange={(v) => setView(v)}>
        <SegmentedControlItem class="ui-segmented-item" value="day">
          Day
        </SegmentedControlItem>
        <SegmentedControlItem class="ui-segmented-item" value="week">
          Week
        </SegmentedControlItem>
        <SegmentedControlItem class="ui-segmented-item" value="month">
          Month
        </SegmentedControlItem>
      </SegmentedControl>
      <span class="ui-state-pill">selected: {view()}</span>
    </div>
  )
}

function TabsDemo() {
  return (
    <Tabs defaultValue="signals" class="ui-col">
      <TabsList class="ui-tabs-list">
        <TabsTab class="ui-tab" value="signals">
          Signals
        </TabsTab>
        <TabsTab class="ui-tab" value="refs">
          Array Refs
        </TabsTab>
        <TabsTab class="ui-tab" value="agents">
          Agent API
        </TabsTab>
      </TabsList>
      <TabsPanel class="ui-tab-panel" value="signals">
        Fine-grained Solid 2 signals update DOM attributes directly with zero VDOM diffing.
      </TabsPanel>
      <TabsPanel class="ui-tab-panel" value="refs">
        Native Solid 2 array refs compose internal and user refs without extra closures.
      </TabsPanel>
      <TabsPanel class="ui-tab-panel" value="agents">
        Every interactive component registers live state &amp; actions in @subf/ui/agent.
      </TabsPanel>
    </Tabs>
  )
}

function AccordionDemo() {
  return (
    <Accordion defaultValue="a" class="ui-accordion">
      <AccordionItem value="a" class="ui-accordion-item">
        <AccordionHeader>
          <AccordionTrigger class="ui-accordion-trigger">
            <span>Why SolidJS 2 native?</span>
            <span>↕</span>
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionPanel class="ui-accordion-panel">
          Zero framework-agnostic kernel overhead — built directly on Solid 2 signals and merge().
        </AccordionPanel>
      </AccordionItem>
      <AccordionItem value="b" class="ui-accordion-item">
        <AccordionHeader>
          <AccordionTrigger class="ui-accordion-trigger">
            <span>API compatibility</span>
            <span>↕</span>
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionPanel class="ui-accordion-panel">
          56 component subpaths matching @ui-sdk/solid with imperative controllers and data-* hooks.
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  )
}

function CollapsibleDemo() {
  return (
    <Collapsible class="ui-col">
      <CollapsibleTrigger class="ui-btn">
        {(s) => (s.open ? 'Hide technical details' : 'Show technical details')}
      </CollapsibleTrigger>
      <CollapsiblePanel class="ui-accordion-panel">
        Runtime dependencies: only @floating-ui/dom. Peer dependencies: solid-js &amp; @solidjs/web.
      </CollapsiblePanel>
    </Collapsible>
  )
}

function SliderDemo() {
  const [val, setVal] = createSignal(64)
  return (
    <div class="ui-col">
      <Slider
        class="ui-slider"
        value={val()}
        min={0}
        max={100}
        onValueChange={(v) => setVal(typeof v === 'number' ? v : (v[0] ?? 0))}
      >
        <SliderControl>
          <SliderTrack class="ui-slider-track">
            <SliderIndicator class="ui-slider-indicator" />
            <SliderThumb class="ui-slider-thumb" />
          </SliderTrack>
        </SliderControl>
      </Slider>
      <span class="ui-state-pill">volume: {val()}%</span>
    </div>
  )
}

function NumberInputDemo() {
  const [val, setVal] = createSignal<number | null>(24)
  return (
    <div class="ui-row">
      <NumberInput value={val()} min={0} max={100} step={4} onValueChange={(v) => setVal(v)}>
        <NumberInputGroup class="ui-number-group">
          <NumberInputDecrement>−</NumberInputDecrement>
          <NumberInputControl />
          <NumberInputIncrement>+</NumberInputIncrement>
        </NumberInputGroup>
      </NumberInput>
      <span class="ui-state-pill">value: {val() ?? 'null'}</span>
    </div>
  )
}

function OTPDemo() {
  const [code, setCode] = createSignal('204')
  return (
    <div class="ui-col">
      <OTPInput maxLength={6} value={code()} onValueChange={(v) => setCode(v)}>
        <OTPInputGroup class="ui-otp-group">
          <For each={[0, 1, 2, 3, 4, 5]}>
            {(index) => <OTPInputSlot class="ui-otp-slot" index={index} />}
          </For>
        </OTPInputGroup>
      </OTPInput>
      <span class="ui-state-pill">code: &quot;{code()}&quot;</span>
    </div>
  )
}

function RatingDemo() {
  const [score, setScore] = createSignal(4)
  return (
    <div class="ui-row">
      <Rating class="ui-rating" value={score()} max={5} onValueChange={(v) => setScore(v)}>
        <RatingItem class="ui-rating-item">★</RatingItem>
      </Rating>
      <span class="ui-state-pill">{score()} / 5</span>
    </div>
  )
}

function DialogDemo() {
  const [lastResult, setLastResult] = createSignal<string>('none')
  return (
    <div class="ui-row">
      <Dialog
        onOpenChange={(open, details) => {
          if (!open) {
            setLastResult(details.reason)
          }
        }}
      >
        <DialogTrigger class="ui-btn ui-btn-solid">Open Dialog</DialogTrigger>
        <DialogBackdrop class="ui-backdrop" />
        <DialogContent class="ui-dialog">
          <DialogTitle style={{ margin: 0, 'font-size': '18px' }}>Confirm deployment</DialogTitle>
          <DialogDescription style={{ margin: 0, color: 'var(--subtle)', 'font-size': '14px' }}>
            Press Escape, click outside, or use the action buttons below to dismiss.
          </DialogDescription>
          <div class="ui-row" style={{ 'justify-content': 'flex-end', 'margin-top': '8px' }}>
            <DialogClose class="ui-btn">Cancel</DialogClose>
            <DialogClose class="ui-btn ui-btn-solid" returnValue="deployed">
              Deploy
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
      <span class="ui-state-pill">last close: {lastResult()}</span>
    </div>
  )
}

function AlertDialogDemo() {
  return (
    <AlertDialog>
      <AlertDialogTrigger class="ui-btn">Delete Workspace</AlertDialogTrigger>
      <AlertDialogBackdrop class="ui-backdrop" />
      <AlertDialogContent class="ui-dialog">
        <AlertDialogTitle style={{ margin: 0, 'font-size': '18px' }}>
          Delete workspace?
        </AlertDialogTitle>
        <AlertDialogDescription style={{ margin: 0, color: 'var(--subtle)', 'font-size': '14px' }}>
          Outside presses are ignored by default on AlertDialog to prevent accidental dismissal.
        </AlertDialogDescription>
        <div class="ui-row" style={{ 'justify-content': 'flex-end', 'margin-top': '8px' }}>
          <AlertDialogClose class="ui-btn">Keep</AlertDialogClose>
          <AlertDialogClose class="ui-btn ui-btn-solid">Confirm Delete</AlertDialogClose>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DrawerDemo() {
  return (
    <Drawer side="right">
      <DrawerTrigger class="ui-btn">Open Right Drawer</DrawerTrigger>
      <DrawerBackdrop class="ui-backdrop" />
      <DrawerContent class="ui-drawer">
        <DrawerTitle style={{ margin: 0, 'font-size': '18px' }}>Inspector Drawer</DrawerTitle>
        <DrawerDescription style={{ margin: 0, color: 'var(--subtle)', 'font-size': '14px' }}>
          Edge-anchored drawer with focus management and Escape dismissal.
        </DrawerDescription>
        <DrawerClose class="ui-btn">Close Drawer</DrawerClose>
      </DrawerContent>
    </Drawer>
  )
}

function PopoverDemo() {
  return (
    <Popover>
      <PopoverTrigger class="ui-btn">Open Popover</PopoverTrigger>
      <PopoverContent class="ui-popover">
        <div style={{ 'font-weight': 500, 'margin-bottom': '6px' }}>Anchored via Floating UI</div>
        <div style={{ color: 'var(--subtle)', 'font-size': '13px', 'margin-bottom': '10px' }}>
          Automatically flips and shifts within viewport bounds.
        </div>
        <PopoverClose class="ui-btn">Dismiss</PopoverClose>
      </PopoverContent>
    </Popover>
  )
}

function TooltipDemo() {
  return (
    <Tooltip openDelay={120}>
      <TooltipTrigger class="ui-btn">Hover or Focus</TooltipTrigger>
      <TooltipContent class="ui-tooltip">SolidJS 2 native tooltip</TooltipContent>
    </Tooltip>
  )
}

function HoverCardDemo() {
  return (
    <HoverCard openDelay={150}>
      <HoverCardTrigger class="ui-btn">@subf/ui</HoverCardTrigger>
      <HoverCardContent class="ui-popover">
        <div style={{ 'font-weight': 600 }}>@subf/ui</div>
        <div style={{ color: 'var(--subtle)', 'font-size': '13px', 'margin-top': '4px' }}>
          56 headless SolidJS 2 components with full @ui-sdk/solid API parity.
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

function MenuDemo() {
  const [picked, setPicked] = createSignal('none')
  return (
    <div class="ui-row">
      <Menu>
        <MenuTrigger class="ui-btn">Actions ▾</MenuTrigger>
        <MenuContent class="ui-menu-content">
          <MenuItem class="ui-menu-item" onSelect={() => setPicked('Duplicate')}>
            <span>Duplicate</span>
            <span class="ui-state-pill">⌘D</span>
          </MenuItem>
          <MenuItem class="ui-menu-item" onSelect={() => setPicked('Archive')}>
            <span>Archive</span>
            <span class="ui-state-pill">⌘E</span>
          </MenuItem>
        </MenuContent>
      </Menu>
      <span class="ui-state-pill">selected: {picked()}</span>
    </div>
  )
}

function SelectDemo() {
  const [val, setVal] = createSignal<string>('solid')
  return (
    <div class="ui-row">
      <Select value={val()} onValueChange={(v) => setVal(String(v ?? ''))}>
        <SelectTrigger
          class="ui-btn"
          style={{ 'min-width': '160px', 'justify-content': 'space-between' }}
        >
          <SelectValue placeholder="Choose..." />
          <span>▾</span>
        </SelectTrigger>
        <SelectContent class="ui-select-content">
          <SelectList>
            <SelectItem class="ui-select-item" value="solid">
              SolidJS 2
            </SelectItem>
            <SelectItem class="ui-select-item" value="vite">
              Vite 8
            </SelectItem>
            <SelectItem class="ui-select-item" value="tsdown">
              tsdown
            </SelectItem>
          </SelectList>
        </SelectContent>
      </Select>
      <span class="ui-state-pill">value: {val()}</span>
    </div>
  )
}

function ListboxDemo() {
  const [val, setVal] = createSignal<string>('ts')
  return (
    <div class="ui-col">
      <Listbox class="ui-listbox" value={val()} onValueChange={(v) => setVal(String(v ?? ''))}>
        <ListboxItem class="ui-listbox-item" value="ts">
          TypeScript
        </ListboxItem>
        <ListboxItem class="ui-listbox-item" value="rs">
          Rust
        </ListboxItem>
        <ListboxItem class="ui-listbox-item" value="go">
          Go
        </ListboxItem>
      </Listbox>
      <span class="ui-state-pill">selected: {val()}</span>
    </div>
  )
}

function CommandDemo() {
  const [last, setLast] = createSignal('none')
  return (
    <div class="ui-col" style={{ 'max-width': '320px' }}>
      <Command class="ui-listbox" style={{ 'max-width': '100%' }}>
        <CommandInput
          class="ui-input"
          style={{ width: '100%', 'margin-bottom': '6px' }}
          placeholder="Filter commands..."
        />
        <CommandList>
          <CommandItem
            class="ui-command-item"
            value="build"
            onSelect={() => setLast('pnpm run build')}
          >
            Build package
          </CommandItem>
          <CommandItem class="ui-command-item" value="qa" onSelect={() => setLast('pnpm run qa')}>
            Run QA checks
          </CommandItem>
          <CommandItem
            class="ui-command-item"
            value="test"
            onSelect={() => setLast('pnpm run test')}
          >
            Run Vitest suite
          </CommandItem>
          <CommandEmpty class="ui-state-pill">No matching commands</CommandEmpty>
        </CommandList>
      </Command>
      <span class="ui-state-pill">executed: {last()}</span>
    </div>
  )
}

function CheckboxDemo() {
  const [checked, setChecked] = createSignal(true)
  return (
    <div class="ui-row">
      <Checkbox class="ui-checkbox" checked={checked()} onCheckedChange={(v) => setChecked(v)}>
        <CheckboxIndicator>✓</CheckboxIndicator>
      </Checkbox>
      <span>Enable Solid 2 strict mode ({String(checked())})</span>
    </div>
  )
}

function RadioDemo() {
  const [plan, setPlan] = createSignal('oss')
  return (
    <RadioGroup class="ui-row" value={plan()} onValueChange={(v) => setPlan(v)}>
      <For each={['oss', 'pro', 'team']}>
        {(item) => (
          <label class="ui-row" style={{ gap: '6px', cursor: 'pointer' }}>
            <Radio class="ui-radio" value={item}>
              <RadioIndicator>●</RadioIndicator>
            </Radio>
            <span>{item.toUpperCase()}</span>
          </label>
        )}
      </For>
    </RadioGroup>
  )
}

function InputDemo() {
  const [text, setText] = createSignal('@subf/ui')
  return (
    <InputGroup class="ui-row">
      <Input
        class="ui-input"
        value={text()}
        onValueChange={(v) => setText(v)}
        placeholder="Package name"
      />
      <InputClear class="ui-btn">Clear</InputClear>
    </InputGroup>
  )
}

function PasswordDemo() {
  return (
    <PasswordInput class="ui-row">
      <PasswordInputControl class="ui-input" defaultValue="solid2-native" />
      <PasswordInputToggle class="ui-btn">
        {(s) => (s.visible ? 'Hide' : 'Show')}
      </PasswordInputToggle>
    </PasswordInput>
  )
}

function FieldDemo() {
  return (
    <Field name="repo" class="ui-col" style={{ 'max-width': '280px' }}>
      <FieldLabel style={{ 'font-weight': 500, 'font-size': '13.5px' }}>Repository</FieldLabel>
      <Input class="ui-input" defaultValue="subframe7536/ui" />
      <FieldDescription style={{ 'font-size': '12.5px', color: 'var(--subtle)' }}>
        Connected automatically via FieldContext.
      </FieldDescription>
    </Field>
  )
}

function ProgressDemo() {
  const [val, setVal] = createSignal(68)
  return (
    <div class="ui-col">
      <Progress value={val()} max={100} class="ui-col">
        <ProgressTrack class="ui-progress-track">
          <ProgressIndicator class="ui-progress-indicator" />
        </ProgressTrack>
        <ProgressValue class="ui-state-pill" />
      </Progress>
      <div class="ui-row">
        <button type="button" class="ui-btn" onClick={() => setVal((v) => Math.max(0, v - 15))}>
          -15%
        </button>
        <button type="button" class="ui-btn" onClick={() => setVal((v) => Math.min(100, v + 15))}>
          +15%
        </button>
      </div>
    </div>
  )
}

function MeterDemo() {
  return (
    <Meter value={74} min={0} max={100} class="ui-col">
      <MeterTrack class="ui-progress-track">
        <MeterIndicator class="ui-progress-indicator" />
      </MeterTrack>
      <MeterValue class="ui-state-pill" />
    </Meter>
  )
}

function PaginationDemo() {
  const [page, setPage] = createSignal(2)
  return (
    <Pagination class="ui-pagination" count={5} page={page()} onPageChange={(p) => setPage(p)}>
      <PaginationPrevious class="ui-page-btn">←</PaginationPrevious>
      <For each={[1, 2, 3, 4, 5]}>
        {(p) => (
          <PaginationLink class="ui-page-btn" page={p}>
            {p}
          </PaginationLink>
        )}
      </For>
      <PaginationNext class="ui-page-btn">→</PaginationNext>
    </Pagination>
  )
}

function CalendarDemo() {
  const [date, setDate] = createSignal<string | null>('2026-11-27')
  return (
    <div class="ui-col">
      <Calendar
        class="ui-calendar"
        value={date()}
        onValueChange={(v) => setDate(typeof v === 'string' ? v : null)}
      >
        <div class="ui-calendar-head">
          <CalendarPrevious class="ui-page-btn">‹</CalendarPrevious>
          <CalendarHeading />
          <CalendarNext class="ui-page-btn">›</CalendarNext>
        </div>
        <CalendarGrid class="ui-calendar-grid">
          <CalendarWeekdays />
          <CalendarWeeks>
            <CalendarDay class="ui-calendar-day" />
          </CalendarWeeks>
        </CalendarGrid>
      </Calendar>
      <span class="ui-state-pill">selected: {date() ?? 'none'}</span>
    </div>
  )
}

function CarouselDemo() {
  return (
    <Carousel loop class="ui-col" style={{ 'max-width': '300px' }}>
      <CarouselViewport style={{ border: '1px solid var(--border)' }}>
        <CarouselContent>
          <CarouselItem style={{ 'min-width': '100%', padding: '24px', 'text-align': 'center' }}>
            Slide 1 — Solid 2 Signals
          </CarouselItem>
          <CarouselItem style={{ 'min-width': '100%', padding: '24px', 'text-align': 'center' }}>
            Slide 2 — Zero Kernel
          </CarouselItem>
          <CarouselItem style={{ 'min-width': '100%', padding: '24px', 'text-align': 'center' }}>
            Slide 3 — Agent Ready
          </CarouselItem>
        </CarouselContent>
      </CarouselViewport>
      <div class="ui-row">
        <CarouselPrevious class="ui-btn">Prev</CarouselPrevious>
        <CarouselNext class="ui-btn">Next</CarouselNext>
      </div>
    </Carousel>
  )
}

function TimelineDemo() {
  return (
    <Timeline class="ui-timeline">
      <TimelineItem class="ui-timeline-item" status="complete">
        <TimelineMarker class="ui-timeline-marker" />
        <div>
          <TimelineTitle style={{ 'font-weight': 500 }}>56 Components Ported</TimelineTitle>
          <TimelineDescription style={{ color: 'var(--subtle)', 'font-size': '13px' }}>
            Full @ui-sdk/solid API parity built natively on Solid 2.
          </TimelineDescription>
          <TimelineTime class="ui-state-pill">Step 1</TimelineTime>
        </div>
      </TimelineItem>
      <TimelineItem class="ui-timeline-item" status="current">
        <TimelineMarker class="ui-timeline-marker" />
        <div>
          <TimelineTitle style={{ 'font-weight': 500 }}>
            Docs Deployed to GitHub Pages
          </TimelineTitle>
          <TimelineTime class="ui-state-pill">Step 2</TimelineTime>
        </div>
      </TimelineItem>
    </Timeline>
  )
}

function ToastDemo() {
  const toaster = createToaster()
  return (
    <div class="ui-row">
      <button
        type="button"
        class="ui-btn ui-btn-solid"
        onClick={() =>
          toaster.add({
            title: 'Deployment queued',
            description: 'GitHub Pages artifact ready.',
          })
        }
      >
        Trigger Toast
      </button>
      <ToastRegion toaster={toaster} class="ui-toast-region">
        <For each={toaster.toasts()}>
          {(t) => (
            <Toast toast={t} class="ui-toast">
              <div>
                <ToastTitle style={{ 'font-weight': 600, 'font-size': '13.5px' }} />
                <ToastDescription style={{ color: 'var(--subtle)', 'font-size': '12.5px' }} />
              </div>
              <ToastClose class="ui-btn" style={{ height: '26px', padding: '0 8px' }}>
                ×
              </ToastClose>
            </Toast>
          )}
        </For>
      </ToastRegion>
    </div>
  )
}

function ToolbarDemo() {
  const [action, setAction] = createSignal('ready')
  return (
    <div class="ui-col">
      <Toolbar class="ui-row">
        <ToolbarButton class="ui-btn" onClick={() => setAction('Bold')}>
          B
        </ToolbarButton>
        <ToolbarButton class="ui-btn" onClick={() => setAction('Italic')}>
          I
        </ToolbarButton>
        <ToolbarSeparator class="ui-separator" />
        <ToolbarButton class="ui-btn" onClick={() => setAction('Code')}>
          {'</>'}
        </ToolbarButton>
      </Toolbar>
      <span class="ui-state-pill">last action: {action()}</span>
    </div>
  )
}

function AvatarDemo() {
  return (
    <div class="ui-row">
      <Avatar class="ui-avatar">
        <AvatarFallback>SU</AvatarFallback>
      </Avatar>
      <Avatar class="ui-avatar">
        <AvatarFallback>S2</AvatarFallback>
      </Avatar>
    </div>
  )
}

function SeparatorDemo() {
  return (
    <div class="ui-col" style={{ 'max-width': '260px' }}>
      <span>Above</span>
      <Separator class="ui-separator" orientation="horizontal" />
      <span>Below</span>
    </div>
  )
}

function TextareaDemo() {
  return <Textarea class="ui-textarea" placeholder="Write SolidJS 2 notes..." />
}

function LabelDemo() {
  return (
    <div class="ui-row">
      <Label for="demo-label-input" style={{ 'font-weight': 500 }}>
        Package
      </Label>
      <input id="demo-label-input" class="ui-input" value="@subf/ui" readonly />
    </div>
  )
}

function TokenInputDemo() {
  const [textPreview, setTextPreview] = createSignal('solid vite')
  return (
    <div class="ui-col" style={{ 'max-width': '340px' }}>
      <TokenInput
        defaultValue={[
          { id: 't1', value: 'solid', label: 'solid' },
          { id: 't2', value: 'vite', label: 'vite' },
        ]}
        onValueChange={(next) => {
          setTextPreview(toText(next) || '(empty)')
        }}
      >
        <TokenInputEditor class="ui-token-editor" placeholder="Type and press Enter...">
          {(token) => (
            <TokenInputToken token={token} class="ui-chip">
              <span>{token.label}</span>
              <TokenInputTokenRemove token={token} class="ui-token-remove" aria-label="Remove">
                ×
              </TokenInputTokenRemove>
            </TokenInputToken>
          )}
        </TokenInputEditor>
      </TokenInput>
      <span class="ui-state-pill">serialized: {textPreview()}</span>
    </div>
  )
}

function FileInputDemo() {
  const [count, setCount] = createSignal(0)
  return (
    <FileInput
      class="ui-col"
      accept="image/*,.txt,.md,.json"
      multiple
      maxFiles={4}
      onValueChange={(files) => setCount(files.length)}
    >
      <FileInputDropzone class="ui-dropzone">
        <span>Drop files here or browse ({count()} selected)</span>
        <FileInputTrigger class="ui-btn">Choose Files</FileInputTrigger>
      </FileInputDropzone>
      <FileInputList class="ui-file-list">
        {(file) => (
          <FileInputItem file={file} class="ui-file-item">
            <span>
              {file.name} ({formatFileSize(file.size)})
            </span>
            <FileInputItemRemove
              file={file}
              class="ui-btn"
              style={{ height: '24px', padding: '0 8px' }}
            >
              ×
            </FileInputItemRemove>
          </FileInputItem>
        )}
      </FileInputList>
    </FileInput>
  )
}

function DateInputDemo() {
  const [val, setVal] = createSignal<string | null>('2026-11-27')
  return (
    <div class="ui-row">
      <DateInput class="ui-segment-group" value={val()} onValueChange={(v) => setVal(v)}>
        <DateInputSegment class="ui-segment" segment="year" style={{ width: '48px' }} />
        <span class="ui-segment-sep">-</span>
        <DateInputSegment class="ui-segment" segment="month" style={{ width: '30px' }} />
        <span class="ui-segment-sep">-</span>
        <DateInputSegment class="ui-segment" segment="day" style={{ width: '30px' }} />
      </DateInput>
      <span class="ui-state-pill">iso: {val() ?? 'null'}</span>
    </div>
  )
}

function TimeInputDemo() {
  const [val, setVal] = createSignal<string | null>('09:30')
  return (
    <div class="ui-row">
      <TimeInput class="ui-segment-group" value={val()} onValueChange={(v) => setVal(v)}>
        <TimeInputSegment class="ui-segment" segment="hour" />
        <span class="ui-segment-sep">:</span>
        <TimeInputSegment class="ui-segment" segment="minute" />
      </TimeInput>
      <span class="ui-state-pill">time: {val() ?? 'null'}</span>
    </div>
  )
}

function ComboboxDemo() {
  const [val, setVal] = createSignal<string | undefined>('solid')
  return (
    <div class="ui-col" style={{ 'max-width': '260px' }}>
      <Combobox value={val()} onValueChange={(v) => setVal(typeof v === 'string' ? v : undefined)}>
        <div class="ui-row" style={{ gap: '6px' }}>
          <ComboboxInput class="ui-input" placeholder="Search tools..." />
          <ComboboxTrigger class="ui-btn" style={{ padding: '0 10px' }}>
            ▾
          </ComboboxTrigger>
        </div>
        <ComboboxContent class="ui-select-content">
          <ComboboxList>
            <ComboboxItem class="ui-select-item" value="solid">
              SolidJS 2
            </ComboboxItem>
            <ComboboxItem class="ui-select-item" value="vite">
              Vite 8
            </ComboboxItem>
            <ComboboxItem class="ui-select-item" value="tsdown">
              tsdown
            </ComboboxItem>
            <ComboboxItem class="ui-select-item" value="oxlint">
              Oxlint
            </ComboboxItem>
            <ComboboxEmpty class="ui-state-pill" style={{ padding: '6px 10px' }}>
              No match
            </ComboboxEmpty>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <span class="ui-state-pill">selected: {val() ?? 'none'}</span>
    </div>
  )
}

function AutocompleteDemo() {
  const [val, setVal] = createSignal('')
  return (
    <div class="ui-col" style={{ 'max-width': '280px' }}>
      <Autocomplete value={val()} onValueChange={(v) => setVal(v)}>
        <div class="ui-row" style={{ gap: '6px' }}>
          <AutocompleteInput class="ui-input" placeholder="Type a city..." />
          <AutocompleteClear class="ui-btn">Clear</AutocompleteClear>
        </div>
        <AutocompleteContent class="ui-select-content">
          <AutocompleteList>
            <AutocompleteItem class="ui-select-item" value="Tokyo">
              Tokyo
            </AutocompleteItem>
            <AutocompleteItem class="ui-select-item" value="San Francisco">
              San Francisco
            </AutocompleteItem>
            <AutocompleteItem class="ui-select-item" value="Zurich">
              Zurich
            </AutocompleteItem>
            <AutocompleteItem class="ui-select-item" value="London">
              London
            </AutocompleteItem>
            <AutocompleteEmpty class="ui-state-pill" style={{ padding: '6px 10px' }}>
              No suggestions
            </AutocompleteEmpty>
          </AutocompleteList>
        </AutocompleteContent>
      </Autocomplete>
      <span class="ui-state-pill">input: {val() || '(empty)'}</span>
    </div>
  )
}

function DatePickerDemo() {
  const [val, setVal] = createSignal<string | null>('2026-11-27')
  return (
    <div class="ui-col">
      <DatePicker value={val()} onValueChange={(v) => setVal(typeof v === 'string' ? v : null)}>
        <div class="ui-row">
          <DatePickerTrigger class="ui-btn">{val() ?? 'Pick a date'} ▾</DatePickerTrigger>
          <DatePickerPreset class="ui-btn" value="2026-11-27">
            Today
          </DatePickerPreset>
          <DatePickerClear class="ui-btn">Clear</DatePickerClear>
        </div>
        <DatePickerContent class="ui-popover" style={{ 'max-width': '300px', padding: '10px' }}>
          <Calendar
            class="ui-calendar"
            style={{ border: 'none', padding: 0 }}
            value={val()}
            onValueChange={(v) => setVal(typeof v === 'string' ? v : null)}
          >
            <div class="ui-calendar-head">
              <CalendarPrevious class="ui-page-btn">‹</CalendarPrevious>
              <CalendarHeading />
              <CalendarNext class="ui-page-btn">›</CalendarNext>
            </div>
            <CalendarGrid class="ui-calendar-grid">
              <CalendarWeekdays />
              <CalendarWeeks>
                <CalendarDay class="ui-calendar-day" />
              </CalendarWeeks>
            </CalendarGrid>
          </Calendar>
        </DatePickerContent>
      </DatePicker>
      <span class="ui-state-pill">date: {val() ?? 'none'}</span>
    </div>
  )
}

function ColorPickerDemo() {
  const [color, setColor] = createSignal('#006bff')
  return (
    <ColorPicker class="ui-col" value={color()} onValueChange={(v) => setColor(v)}>
      <div class="ui-row">
        <ColorPickerSwatch class="ui-color-swatch" />
        <ColorPickerInput class="ui-input" style={{ 'max-width': '130px' }} />
      </div>
      <ColorPickerSlider channel="hue" class="ui-color-slider">
        <ColorPickerSliderThumb class="ui-color-slider-thumb" />
      </ColorPickerSlider>
      <ColorPickerSwatches class="ui-swatches">
        <For each={['#006bff', '#111111', '#16a34a', '#dc2626', '#d97706']}>
          {(hex) => (
            <ColorPickerSwatchItem class="ui-swatch-item" value={hex} style={{ background: hex }} />
          )}
        </For>
      </ColorPickerSwatches>
    </ColorPicker>
  )
}

const CROPPER_SAMPLE_SVG = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#006bff"/><stop offset="100%" stop-color="#111827"/></linearGradient></defs><rect width="320" height="180" fill="url(#g)"/><circle cx="160" cy="90" r="46" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2"/><text x="160" y="95" text-anchor="middle" fill="#ffffff" font-family="monospace" font-size="14">@subf/ui</text></svg>',
)}`

function ImageCropperDemo() {
  const [crop, setCrop] = createSignal({ x: 15, y: 15, width: 70, height: 70 })
  return (
    <ImageCropper class="ui-col" crop={crop()} onCropChange={(next) => setCrop(next)}>
      <ImageCropperViewport class="ui-cropper-viewport">
        <ImageCropperImage class="ui-cropper-image" src={CROPPER_SAMPLE_SVG} alt="Sample crop" />
        <ImageCropperSelection class="ui-cropper-selection">
          <ImageCropperGrid class="ui-cropper-grid" />
          <ImageCropperHandle class="ui-cropper-handle" position="nw" />
          <ImageCropperHandle class="ui-cropper-handle" position="ne" />
          <ImageCropperHandle class="ui-cropper-handle" position="sw" />
          <ImageCropperHandle class="ui-cropper-handle" position="se" />
        </ImageCropperSelection>
      </ImageCropperViewport>
      <div class="ui-row">
        <ImageCropperRotate class="ui-btn" degrees={90}>
          Rotate 90°
        </ImageCropperRotate>
        <ImageCropperFlip class="ui-btn" direction="horizontal">
          Flip H
        </ImageCropperFlip>
        <span class="ui-state-pill">
          {Math.round(crop().width)}% × {Math.round(crop().height)}%
        </span>
      </div>
    </ImageCropper>
  )
}

function TriggerMenuDemo() {
  return (
    <div class="ui-col" style={{ 'max-width': '320px' }}>
      <TriggerMenu triggers={['@']}>
        <TriggerMenuInput
          class="ui-textarea"
          style={{ 'min-height': '64px' }}
          placeholder="Type @ to mention ada, grace, or linus..."
        />
        <TriggerMenuContent class="ui-menu-content">
          <TriggerMenuList>
            <TriggerMenuItem class="ui-menu-item" value="ada">
              @ada — Ada Lovelace
            </TriggerMenuItem>
            <TriggerMenuItem class="ui-menu-item" value="grace">
              @grace — Grace Hopper
            </TriggerMenuItem>
            <TriggerMenuItem class="ui-menu-item" value="linus">
              @linus — Linus Torvalds
            </TriggerMenuItem>
            <TriggerMenuEmpty class="ui-state-pill" style={{ padding: '6px 10px' }}>
              No matching handle
            </TriggerMenuEmpty>
          </TriggerMenuList>
        </TriggerMenuContent>
      </TriggerMenu>
      <span class="ui-state-pill">trigger: &quot;@&quot;</span>
    </div>
  )
}

function OverlaysDemo() {
  const manager = createOverlays()
  const [result, setResult] = createSignal('none')

  const openConfirm = async () => {
    const res = await manager.open<string>((close) => (
      <>
        <div class="ui-backdrop" onClick={() => close('backdrop')} />
        <div class="ui-dialog" role="dialog" aria-modal="true">
          <div style={{ 'font-size': '17px', 'font-weight': 600 }}>Programmatic Overlay</div>
          <div style={{ color: 'var(--subtle)', 'font-size': '13.5px' }}>
            Launched imperatively via createOverlays().open() and awaited as a Promise.
          </div>
          <div class="ui-row" style={{ 'justify-content': 'flex-end', 'margin-top': '8px' }}>
            <button type="button" class="ui-btn" onClick={() => close('canceled')}>
              Cancel
            </button>
            <button type="button" class="ui-btn ui-btn-solid" onClick={() => close('confirmed')}>
              Confirm
            </button>
          </div>
        </div>
      </>
    ))
    setResult(res ?? 'dismissed')
  }

  return (
    <div class="ui-row">
      <button type="button" class="ui-btn ui-btn-solid" onClick={() => void openConfirm()}>
        Launch Overlay
      </button>
      <span class="ui-state-pill">result: {result()}</span>
      <OverlayHost manager={manager} />
    </div>
  )
}

function MenubarDemo() {
  const [cmd, setCmd] = createSignal('none')
  return (
    <div class="ui-col">
      <Menubar class="ui-menubar">
        <Menu>
          <MenuTrigger class="ui-btn" style={{ border: 'none', height: '28px' }}>
            File
          </MenuTrigger>
          <MenuContent class="ui-menu-content">
            <MenuItem class="ui-menu-item" onSelect={() => setCmd('File → New')}>
              New File
            </MenuItem>
            <MenuItem class="ui-menu-item" onSelect={() => setCmd('File → Save')}>
              Save
            </MenuItem>
          </MenuContent>
        </Menu>
        <Menu>
          <MenuTrigger class="ui-btn" style={{ border: 'none', height: '28px' }}>
            Edit
          </MenuTrigger>
          <MenuContent class="ui-menu-content">
            <MenuItem class="ui-menu-item" onSelect={() => setCmd('Edit → Undo')}>
              Undo
            </MenuItem>
            <MenuItem class="ui-menu-item" onSelect={() => setCmd('Edit → Redo')}>
              Redo
            </MenuItem>
          </MenuContent>
        </Menu>
      </Menubar>
      <span class="ui-state-pill">command: {cmd()}</span>
    </div>
  )
}

function NavigationMenuDemo() {
  return (
    <NavigationMenu>
      <NavigationMenuList class="ui-nav-list">
        <NavigationMenuItem value="guides">
          <NavigationMenuTrigger class="ui-btn">Guides ▾</NavigationMenuTrigger>
          <NavigationMenuContent class="ui-nav-content">
            <NavigationMenuLink class="ui-menu-item" href="#/docs/index">
              Installation
            </NavigationMenuLink>
            <NavigationMenuLink class="ui-menu-item" href="#/docs/state-and-events">
              State &amp; Events
            </NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem value="sink">
          <NavigationMenuLink class="ui-btn" href="#/sink">
            Kitchen Sink
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

function ResizableDemo() {
  const [layout, setLayout] = createSignal<Array<number>>([40, 60])
  return (
    <div class="ui-col">
      <Resizable
        class="ui-resizable"
        orientation="horizontal"
        layout={layout()}
        onLayoutChange={(next) => setLayout(next)}
      >
        <ResizablePanel class="ui-resizable-panel" defaultSize={40} minSize={20}>
          {Math.round(layout()[0] ?? 40)}%
        </ResizablePanel>
        <ResizableHandle class="ui-resizable-handle" aria-label="Resize panels" />
        <ResizablePanel class="ui-resizable-panel" defaultSize={60} minSize={20}>
          {Math.round(layout()[1] ?? 60)}%
        </ResizablePanel>
      </Resizable>
      <span class="ui-state-pill">drag handle to resize</span>
    </div>
  )
}

function ScrollAreaDemo() {
  const rows = Array.from({ length: 12 }, (_, i) => `Event #${i + 1} — Solid 2 fine-grained update`)
  return (
    <ScrollArea class="ui-scroll-area">
      <ScrollAreaViewport class="ui-scroll-viewport">
        <ScrollAreaContent>
          <For each={rows}>{(line) => <div class="ui-scroll-item">{line}</div>}</For>
        </ScrollAreaContent>
      </ScrollAreaViewport>
      <div style={{ padding: '6px 10px', 'border-top': '1px solid var(--hairline)' }}>
        <ScrollAreaScrollToEnd class="ui-btn" style={{ height: '26px', 'font-size': '12px' }}>
          Scroll to End
        </ScrollAreaScrollToEnd>
      </div>
    </ScrollArea>
  )
}

const DEMO_TREE_ITEMS = treeFromPaths([
  'src/index.ts',
  'src/button.tsx',
  'src/dialog.tsx',
  'docs/index.html',
  'docs/src/App.tsx',
])

function TreeDemo() {
  const [selected, setSelected] = createSignal<string>('src/button.tsx')
  return (
    <div class="ui-col" style={{ 'max-width': '280px' }}>
      <Tree
        class="ui-listbox"
        style={{ 'max-width': '100%' }}
        items={DEMO_TREE_ITEMS}
        defaultExpanded={['src', 'docs']}
        value={selected()}
        onValueChange={(v) => setSelected(typeof v === 'string' ? v : (v?.[0] ?? ''))}
      >
        <TreeItems
          renderItem={(row) => (
            <TreeItem
              value={row.value}
              class="ui-tree-item"
              style={{ 'padding-left': `${row.depth * 14 + 8}px` }}
            >
              <TreeItemIndicator style={{ width: '12px', display: 'inline-block' }}>
                {row.hasChildren ? (row.expanded ? '▾' : '▸') : '·'}
              </TreeItemIndicator>
              <TreeItemLabel>{row.label}</TreeItemLabel>
            </TreeItem>
          )}
        />
      </Tree>
      <span class="ui-state-pill">selected: {selected() || 'none'}</span>
    </div>
  )
}

const WATERFALL_SPANS = [
  { id: 'dns', label: 'DNS Lookup', start: 0, duration: 28 },
  { id: 'tls', label: 'TLS Handshake', start: 28, duration: 42 },
  { id: 'ttfb', label: 'TTFB', start: 70, duration: 95 },
  { id: 'hydrate', label: 'Hydrate Solid 2', start: 165, duration: 55 },
]

function WaterfallDemo() {
  const [selected, setSelected] = createSignal<string | null>('ttfb')
  return (
    <div class="ui-col">
      <Waterfall
        class="ui-waterfall"
        min={0}
        max={240}
        unit="ms"
        value={selected()}
        onValueChange={(v) => setSelected(v)}
      >
        <WaterfallHeaderRow class="ui-waterfall-header">
          <WaterfallColumnHeader class="ui-waterfall-label">Span</WaterfallColumnHeader>
          <WaterfallAxis class="ui-waterfall-label" />
        </WaterfallHeaderRow>
        <For each={WATERFALL_SPANS}>
          {(span) => (
            <WaterfallRow
              class="ui-waterfall-row"
              value={span.id}
              start={span.start}
              duration={span.duration}
            >
              <WaterfallRowHeader class="ui-waterfall-label">{span.label}</WaterfallRowHeader>
              <WaterfallCell class="ui-waterfall-track">
                <WaterfallBar class="ui-waterfall-bar" />
              </WaterfallCell>
            </WaterfallRow>
          )}
        </For>
      </Waterfall>
      <span class="ui-state-pill">selected span: {selected() ?? 'none'}</span>
    </div>
  )
}

function PreferencesControl() {
  const [density, setDensity, reset] = usePreference<'compact' | 'comfortable' | 'spacious'>(
    'density',
    'comfortable',
  )
  return (
    <div class="ui-col">
      <div class="ui-row">
        <For each={['compact', 'comfortable', 'spacious'] as const}>
          {(mode) => (
            <button
              type="button"
              class={density() === mode ? 'ui-btn ui-btn-solid' : 'ui-btn'}
              onClick={() => setDensity(mode)}
            >
              {mode}
            </button>
          )}
        </For>
        <button type="button" class="ui-btn" onClick={() => reset()}>
          Reset
        </button>
      </div>
      <span class="ui-state-pill">density preference: {density()}</span>
    </div>
  )
}

function PreferencesDemo() {
  return (
    <Preferences prefix="subf-ui-demo:">
      <PreferencesControl />
    </Preferences>
  )
}

export const DEMO_REGISTRY: Record<string, () => JSX.Element> = {
  button: ButtonDemo,
  switch: SwitchDemo,
  toggle: ToggleDemo,
  'segmented-control': SegmentedDemo,
  tabs: TabsDemo,
  accordion: AccordionDemo,
  collapsible: CollapsibleDemo,
  slider: SliderDemo,
  'number-input': NumberInputDemo,
  'otp-input': OTPDemo,
  rating: RatingDemo,
  dialog: DialogDemo,
  'alert-dialog': AlertDialogDemo,
  drawer: DrawerDemo,
  popover: PopoverDemo,
  tooltip: TooltipDemo,
  'hover-card': HoverCardDemo,
  menu: MenuDemo,
  select: SelectDemo,
  listbox: ListboxDemo,
  command: CommandDemo,
  checkbox: CheckboxDemo,
  radio: RadioDemo,
  input: InputDemo,
  'password-input': PasswordDemo,
  field: FieldDemo,
  progress: ProgressDemo,
  meter: MeterDemo,
  pagination: PaginationDemo,
  calendar: CalendarDemo,
  carousel: CarouselDemo,
  timeline: TimelineDemo,
  toast: ToastDemo,
  toolbar: ToolbarDemo,
  avatar: AvatarDemo,
  separator: SeparatorDemo,
  textarea: TextareaDemo,
  label: LabelDemo,
  'token-input': TokenInputDemo,
  'file-input': FileInputDemo,
  'date-input': DateInputDemo,
  'time-input': TimeInputDemo,
  combobox: ComboboxDemo,
  autocomplete: AutocompleteDemo,
  'date-picker': DatePickerDemo,
  'color-picker': ColorPickerDemo,
  'image-cropper': ImageCropperDemo,
  'trigger-menu': TriggerMenuDemo,
  overlays: OverlaysDemo,
  menubar: MenubarDemo,
  'navigation-menu': NavigationMenuDemo,
  resizable: ResizableDemo,
  'scroll-area': ScrollAreaDemo,
  tree: TreeDemo,
  waterfall: WaterfallDemo,
  preferences: PreferencesDemo,
}

export function renderComponentDemo(slug: string): JSX.Element | undefined {
  const factory = DEMO_REGISTRY[slug]
  return factory ? factory() : undefined
}
