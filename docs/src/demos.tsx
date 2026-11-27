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
  CalendarWeekday,
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
        <For each={[1, 2, 3, 4, 5]}>
          {(n) => (
            <RatingItem class="ui-rating-item" index={n}>
              ★
            </RatingItem>
          )}
        </For>
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
          <thead>
            <CalendarWeekdays>{(day) => <CalendarWeekday>{day}</CalendarWeekday>}</CalendarWeekdays>
          </thead>
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
}

export function renderComponentDemo(slug: string): JSX.Element | undefined {
  const factory = DEMO_REGISTRY[slug]
  return factory ? factory() : undefined
}
