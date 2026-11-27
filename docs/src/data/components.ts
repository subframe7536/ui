export type ComponentCategory =
  | 'Actions & Toggles'
  | 'Forms & Inputs'
  | 'Selection & Pickers'
  | 'Overlays & Popups'
  | 'Navigation & Layout'
  | 'Data & Display'
  | 'Utilities & Runtime'

export type ComponentDoc = {
  slug: string
  name: string
  category: ComponentCategory
  summary: string
  parts: Array<string>
  controller?: string
  dataAttrs: Array<string>
  example: string
}

export const COMPONENT_CATEGORIES: Array<ComponentCategory> = [
  'Actions & Toggles',
  'Forms & Inputs',
  'Selection & Pickers',
  'Overlays & Popups',
  'Navigation & Layout',
  'Data & Display',
  'Utilities & Runtime',
]

export const COMPONENTS: Array<ComponentDoc> = [
  // Actions & Toggles
  {
    slug: 'button',
    name: 'Button',
    category: 'Actions & Toggles',
    summary:
      'Async-aware button primitive that tracks pending promises and prevents duplicate presses.',
    parts: ['Button'],
    dataAttrs: ['data-disabled', 'data-pending'],
    example: `import { Button } from '@subf/ui/button'

<Button onClick={async () => await saveChanges()}>
  {(state) => (state.pending ? 'Saving...' : 'Save')}
</Button>`,
  },
  {
    slug: 'toggle',
    name: 'Toggle & ToggleGroup',
    category: 'Actions & Toggles',
    summary: 'Two-state pressable button and single/multiple selection toggle groups.',
    parts: ['Toggle', 'ToggleIcon', 'ToggleGroup'],
    controller: 'createToggleController / createToggleGroupController',
    dataAttrs: ['data-pressed', 'data-state', 'data-disabled', 'data-orientation'],
    example: `import { Toggle, ToggleGroup } from '@subf/ui/toggle'

<ToggleGroup defaultValue="left">
  <Toggle value="left">Left</Toggle>
  <Toggle value="center">Center</Toggle>
  <Toggle value="right">Right</Toggle>
</ToggleGroup>`,
  },
  {
    slug: 'switch',
    name: 'Switch',
    category: 'Actions & Toggles',
    summary: 'Accessible boolean toggle control with form input sync and imperative controller.',
    parts: ['Switch', 'SwitchThumb'],
    controller: 'createSwitchController',
    dataAttrs: ['data-checked', 'data-unchecked', 'data-state', 'data-disabled', 'data-readonly'],
    example: `import { Switch, SwitchThumb } from '@subf/ui/switch'

<Switch defaultChecked name="notifications">
  <SwitchThumb />
</Switch>`,
  },
  {
    slug: 'segmented-control',
    name: 'Segmented Control',
    category: 'Actions & Toggles',
    summary: 'Single-choice radio group with roving keyboard focus and sliding indicator geometry.',
    parts: ['SegmentedControl', 'SegmentedControlItem', 'SegmentedControlIndicator'],
    controller: 'createSegmentedControlController',
    dataAttrs: [
      'data-checked',
      'data-unchecked',
      'data-orientation',
      'data-ready',
      'data-disabled',
    ],
    example: `import { SegmentedControl, SegmentedControlItem } from '@subf/ui/segmented-control'

<SegmentedControl defaultValue="day">
  <SegmentedControlItem value="day">Day</SegmentedControlItem>
  <SegmentedControlItem value="week">Week</SegmentedControlItem>
  <SegmentedControlItem value="month">Month</SegmentedControlItem>
</SegmentedControl>`,
  },
  {
    slug: 'toolbar',
    name: 'Toolbar',
    category: 'Actions & Toggles',
    summary: 'Roving-tabindex toolbar container for buttons, links, inputs, and groups.',
    parts: [
      'Toolbar',
      'ToolbarButton',
      'ToolbarLink',
      'ToolbarInput',
      'ToolbarGroup',
      'ToolbarSeparator',
    ],
    controller: 'createToolbarController',
    dataAttrs: ['data-orientation', 'data-disabled'],
    example: `import { Toolbar, ToolbarButton, ToolbarSeparator } from '@subf/ui/toolbar'

<Toolbar>
  <ToolbarButton>Bold</ToolbarButton>
  <ToolbarButton>Italic</ToolbarButton>
  <ToolbarSeparator />
  <ToolbarButton>Link</ToolbarButton>
</Toolbar>`,
  },

  // Forms & Inputs
  {
    slug: 'field',
    name: 'Field',
    category: 'Forms & Inputs',
    summary:
      'Form field wrapper connecting labels, descriptions, errors, dirty/touched/invalid states.',
    parts: [
      'Field',
      'FieldLabel',
      'FieldControl',
      'FieldDescription',
      'FieldError',
      'FieldSet',
      'FieldLegend',
      'FieldGroup',
    ],
    dataAttrs: [
      'data-dirty',
      'data-touched',
      'data-invalid',
      'data-disabled',
      'data-readonly',
      'data-required',
    ],
    example: `import { Field, FieldLabel, FieldDescription, FieldError } from '@subf/ui/field'
import { Input } from '@subf/ui/input'

<Field name="email" required>
  <FieldLabel>Email</FieldLabel>
  <Input placeholder="you@example.com" />
  <FieldDescription>We never share your email.</FieldDescription>
  <FieldError />
</Field>`,
  },
  {
    slug: 'input',
    name: 'Input',
    category: 'Forms & Inputs',
    summary: 'Text input primitive with InputGroup wrapper, clear trigger, and Field integration.',
    parts: ['InputGroup', 'Input', 'InputClear'],
    controller: 'createInputController',
    dataAttrs: ['data-focused', 'data-empty', 'data-disabled', 'data-invalid'],
    example: `import { InputGroup, Input, InputClear } from '@subf/ui/input'

<InputGroup>
  <Input placeholder="Search packages..." />
  <InputClear>Clear</InputClear>
</InputGroup>`,
  },
  {
    slug: 'textarea',
    name: 'Textarea',
    category: 'Forms & Inputs',
    summary:
      'Multi-line text input with Field integration and reactive empty/focus/invalid states.',
    parts: ['Textarea'],
    dataAttrs: ['data-focused', 'data-empty', 'data-disabled', 'data-invalid'],
    example: `import { Textarea } from '@subf/ui/textarea'

<Textarea placeholder="Write a concise summary..." />`,
  },
  {
    slug: 'label',
    name: 'Label',
    category: 'Forms & Inputs',
    summary: 'Accessible form label supporting custom render props and state attributes.',
    parts: ['Label'],
    dataAttrs: [],
    example: `import { Label } from '@subf/ui/label'

<Label for="username">Username</Label>`,
  },
  {
    slug: 'checkbox',
    name: 'Checkbox & CheckboxGroup',
    category: 'Forms & Inputs',
    summary:
      'Tri-state checkbox (checked, unchecked, indeterminate) and multi-value checkbox groups.',
    parts: ['Checkbox', 'CheckboxIndicator', 'CheckboxGroup'],
    controller: 'createCheckboxController / createCheckboxGroupController',
    dataAttrs: [
      'data-checked',
      'data-unchecked',
      'data-indeterminate',
      'data-state',
      'data-disabled',
    ],
    example: `import { Checkbox, CheckboxIndicator } from '@subf/ui/checkbox'

<Checkbox defaultChecked>
  <CheckboxIndicator>✓</CheckboxIndicator>
</Checkbox>`,
  },
  {
    slug: 'radio',
    name: 'Radio & RadioGroup',
    category: 'Forms & Inputs',
    summary: 'Accessible radio group with arrow-key roving selection and form input sync.',
    parts: ['RadioGroup', 'Radio', 'RadioIndicator'],
    controller: 'createRadioGroupController',
    dataAttrs: [
      'data-checked',
      'data-unchecked',
      'data-state',
      'data-orientation',
      'data-disabled',
    ],
    example: `import { RadioGroup, Radio, RadioIndicator } from '@subf/ui/radio'

<RadioGroup defaultValue="solid">
  <Radio value="solid"><RadioIndicator /></Radio>
  <Radio value="vite"><RadioIndicator /></Radio>
</RadioGroup>`,
  },
  {
    slug: 'number-input',
    name: 'Number Input',
    category: 'Forms & Inputs',
    summary:
      'Spinbutton with locale formatting, step clamping, keyboard/wheel stepping, and pointer scrubbing.',
    parts: [
      'NumberInput',
      'NumberInputGroup',
      'NumberInputControl',
      'NumberInputIncrement',
      'NumberInputDecrement',
      'NumberInputScrubArea',
      'NumberInputScrubAreaCursor',
    ],
    controller: 'createNumberInputController',
    dataAttrs: [
      'data-scrubbing',
      'data-direction',
      'data-disabled',
      'data-readonly',
      'data-invalid',
    ],
    example: `import {
  NumberInput,
  NumberInputGroup,
  NumberInputDecrement,
  NumberInputControl,
  NumberInputIncrement,
} from '@subf/ui/number-input'

<NumberInput defaultValue={10} min={0} max={100} step={5}>
  <NumberInputGroup>
    <NumberInputDecrement>-</NumberInputDecrement>
    <NumberInputControl />
    <NumberInputIncrement>+</NumberInputIncrement>
  </NumberInputGroup>
</NumberInput>`,
  },
  {
    slug: 'password-input',
    name: 'Password Input',
    category: 'Forms & Inputs',
    summary: 'Password field with reactive visibility toggle and Field context support.',
    parts: ['PasswordInput', 'PasswordInputControl', 'PasswordInputToggle'],
    controller: 'createPasswordInputController',
    dataAttrs: ['data-visible', 'data-focused', 'data-disabled', 'data-invalid'],
    example: `import { PasswordInput, PasswordInputControl, PasswordInputToggle } from '@subf/ui/password-input'

<PasswordInput>
  <PasswordInputControl placeholder="Enter password" />
  <PasswordInputToggle>
    {(s) => (s.visible ? 'Hide' : 'Show')}
  </PasswordInputToggle>
</PasswordInput>`,
  },
  {
    slug: 'otp-input',
    name: 'OTP Input',
    category: 'Forms & Inputs',
    summary:
      'One-time passcode input with segmented slots, paste distribution, and completion callbacks.',
    parts: ['OTPInput', 'OTPInputGroup', 'OTPInputSlot', 'OTPInputSeparator'],
    controller: 'createOTPInputController',
    dataAttrs: ['data-active', 'data-filled', 'data-complete', 'data-caret', 'data-slot-index'],
    example: `import { OTPInput, OTPInputGroup, OTPInputSlot } from '@subf/ui/otp-input'

<OTPInput maxLength={6}>
  <OTPInputGroup>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <OTPInputSlot index={i} />
    ))}
  </OTPInputGroup>
</OTPInput>`,
  },
  {
    slug: 'slider',
    name: 'Slider',
    category: 'Forms & Inputs',
    summary:
      'Single or range value slider with pointer dragging, step snapping, and keyboard support.',
    parts: [
      'Slider',
      'SliderControl',
      'SliderTrack',
      'SliderIndicator',
      'SliderThumb',
      'SliderValue',
    ],
    controller: 'createSliderController',
    dataAttrs: [
      'data-dragging',
      'data-orientation',
      'data-index',
      'data-disabled',
      'data-readonly',
    ],
    example: `import { Slider, SliderControl, SliderTrack, SliderIndicator, SliderThumb } from '@subf/ui/slider'

<Slider defaultValue={40} min={0} max={100}>
  <SliderControl>
    <SliderTrack>
      <SliderIndicator />
      <SliderThumb />
    </SliderTrack>
  </SliderControl>
</Slider>`,
  },
  {
    slug: 'rating',
    name: 'Rating',
    category: 'Forms & Inputs',
    summary:
      'Star rating control supporting hover previews, half-star precision, and keyboard navigation.',
    parts: ['Rating', 'RatingItem'],
    controller: 'createRatingController',
    dataAttrs: ['data-checked', 'data-highlighted', 'data-fill', 'data-index', 'data-disabled'],
    example: `import { Rating, RatingItem } from '@subf/ui/rating'

<Rating defaultValue={4} max={5}>
  <RatingItem>★</RatingItem>
</Rating>`,
  },
  {
    slug: 'token-input',
    name: 'Token Input',
    category: 'Forms & Inputs',
    summary:
      'Inline chip/token editor supporting delimiter creation, keyboard removal, and serialization helpers.',
    parts: ['TokenInput', 'TokenInputEditor', 'TokenInputToken', 'TokenInputTokenRemove'],
    controller: 'createTokenInputController',
    dataAttrs: ['data-focused', 'data-empty', 'data-token-id', 'data-disabled', 'data-readonly'],
    example: `import { TokenInput, TokenInputEditor, TokenInputToken, TokenInputTokenRemove } from '@subf/ui/token-input'

<TokenInput defaultValue={['solid', 'vite']}>
  <TokenInputEditor placeholder="Add tag..." />
</TokenInput>`,
  },
  {
    slug: 'file-input',
    name: 'File Input',
    category: 'Forms & Inputs',
    summary:
      'Drag-and-drop, paste, and file picker input with accept/size/count validation and rejection reporting.',
    parts: [
      'FileInput',
      'FileInputDropzone',
      'FileInputTrigger',
      'FileInputList',
      'FileInputItem',
      'FileInputItemRemove',
    ],
    controller: 'createFileInputController',
    dataAttrs: ['data-dragging', 'data-empty', 'data-disabled', 'data-readonly', 'data-invalid'],
    example: `import { FileInput, FileInputDropzone, FileInputTrigger } from '@subf/ui/file-input'

<FileInput accept="image/*" maxFiles={3}>
  <FileInputDropzone>Drop files here or click</FileInputDropzone>
  <FileInputTrigger>Browse</FileInputTrigger>
</FileInput>`,
  },
  {
    slug: 'date-input',
    name: 'Date Input',
    category: 'Forms & Inputs',
    summary: 'Segmented ISO date input with keyboard spin and segment focus management.',
    parts: ['DateInput', 'DateInputSegment'],
    controller: 'createDateInputController',
    dataAttrs: [
      'data-segment',
      'data-placeholder',
      'data-disabled',
      'data-readonly',
      'data-invalid',
    ],
    example: `import { DateInput, DateInputSegment } from '@subf/ui/date-input'

<DateInput defaultValue="2026-11-27">
  <DateInputSegment type="year" />
  <DateInputSegment type="month" />
  <DateInputSegment type="day" />
</DateInput>`,
  },
  {
    slug: 'time-input',
    name: 'Time Input',
    category: 'Forms & Inputs',
    summary: 'Segmented hour/minute/second time input with keyboard stepping.',
    parts: ['TimeInput', 'TimeInputSegment'],
    controller: 'createTimeInputController',
    dataAttrs: [
      'data-segment',
      'data-placeholder',
      'data-disabled',
      'data-readonly',
      'data-invalid',
    ],
    example: `import { TimeInput, TimeInputSegment } from '@subf/ui/time-input'

<TimeInput defaultValue="09:30">
  <TimeInputSegment type="hour" />
  <TimeInputSegment type="minute" />
</TimeInput>`,
  },

  // Selection & Pickers
  {
    slug: 'select',
    name: 'Select',
    category: 'Selection & Pickers',
    summary:
      'Accessible dropdown select with single/multiple selection, typeahead, filtering, and Floating UI positioning.',
    parts: [
      'Select',
      'SelectLabel',
      'SelectTrigger',
      'SelectValue',
      'SelectClear',
      'SelectContent',
      'SelectList',
      'SelectItems',
      'SelectItem',
      'SelectItemText',
      'SelectItemIndicator',
      'SelectEmpty',
    ],
    controller: 'createSelectController',
    dataAttrs: ['data-open', 'data-selected', 'data-highlighted', 'data-placeholder', 'data-side'],
    example: `import { Select, SelectTrigger, SelectValue, SelectContent, SelectList, SelectItem } from '@subf/ui/select'

<Select defaultValue="solid">
  <SelectTrigger><SelectValue placeholder="Choose framework" /></SelectTrigger>
  <SelectContent>
    <SelectList>
      <SelectItem value="solid">SolidJS 2</SelectItem>
      <SelectItem value="vite">Vite 8</SelectItem>
    </SelectList>
  </SelectContent>
</Select>`,
  },
  {
    slug: 'combobox',
    name: 'Combobox',
    category: 'Selection & Pickers',
    summary:
      'Searchable combobox with multi-select chips, creatable items, groups, and async status.',
    parts: [
      'Combobox',
      'ComboboxInput',
      'ComboboxTrigger',
      'ComboboxChips',
      'ComboboxChip',
      'ComboboxContent',
      'ComboboxList',
      'ComboboxItem',
      'ComboboxCreate',
      'ComboboxEmpty',
    ],
    controller: 'createComboboxController',
    dataAttrs: ['data-open', 'data-selected', 'data-highlighted', 'data-create', 'data-side'],
    example: `import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem } from '@subf/ui/combobox'

<Combobox>
  <ComboboxInput placeholder="Search..." />
  <ComboboxContent>
    <ComboboxList>
      <ComboboxItem value="alpha">Alpha</ComboboxItem>
      <ComboboxItem value="beta">Beta</ComboboxItem>
    </ComboboxList>
  </ComboboxContent>
</Combobox>`,
  },
  {
    slug: 'autocomplete',
    name: 'Autocomplete',
    category: 'Selection & Pickers',
    summary:
      'Free-text input with live suggestion popup, keyboard highlighting, and clear control.',
    parts: [
      'Autocomplete',
      'AutocompleteInput',
      'AutocompleteClear',
      'AutocompleteContent',
      'AutocompleteList',
      'AutocompleteItem',
      'AutocompleteEmpty',
    ],
    controller: 'createAutocompleteController',
    dataAttrs: ['data-open', 'data-highlighted', 'data-disabled', 'data-side'],
    example: `import { Autocomplete, AutocompleteInput, AutocompleteContent, AutocompleteList, AutocompleteItem } from '@subf/ui/autocomplete'

<Autocomplete>
  <AutocompleteInput placeholder="Type a city..." />
  <AutocompleteContent>
    <AutocompleteList>
      <AutocompleteItem value="Tokyo">Tokyo</AutocompleteItem>
      <AutocompleteItem value="San Francisco">San Francisco</AutocompleteItem>
    </AutocompleteList>
  </AutocompleteContent>
</Autocomplete>`,
  },
  {
    slug: 'listbox',
    name: 'Listbox',
    category: 'Selection & Pickers',
    summary:
      'Inline keyboard-navigable list with single/multiple selection, groups, and filter helpers.',
    parts: [
      'Listbox',
      'ListboxItems',
      'ListboxGroup',
      'ListboxGroupLabel',
      'ListboxSeparator',
      'ListboxItem',
      'ListboxItemIndicator',
    ],
    controller: 'createListboxController',
    dataAttrs: ['data-selected', 'data-highlighted', 'data-disabled', 'data-readonly'],
    example: `import { Listbox, ListboxItem } from '@subf/ui/listbox'

<Listbox defaultValue="ts">
  <ListboxItem value="ts">TypeScript</ListboxItem>
  <ListboxItem value="rs">Rust</ListboxItem>
  <ListboxItem value="go">Go</ListboxItem>
</Listbox>`,
  },
  {
    slug: 'command',
    name: 'Command',
    category: 'Selection & Pickers',
    summary:
      'Command palette with live filtering, grouped items, nested pages, and shortcut hints.',
    parts: [
      'Command',
      'CommandInput',
      'CommandList',
      'CommandPage',
      'CommandGroup',
      'CommandGroupLabel',
      'CommandItem',
      'CommandShortcut',
      'CommandEmpty',
    ],
    controller: 'createCommandController',
    dataAttrs: ['data-highlighted', 'data-empty', 'data-page', 'data-disabled'],
    example: `import { Command, CommandInput, CommandList, CommandItem, CommandEmpty } from '@subf/ui/command'

<Command>
  <CommandInput placeholder="Type a command..." />
  <CommandList>
    <CommandItem value="theme">Toggle Theme</CommandItem>
    <CommandItem value="docs">Open Docs</CommandItem>
    <CommandEmpty>No results.</CommandEmpty>
  </CommandList>
</Command>`,
  },
  {
    slug: 'calendar',
    name: 'Calendar',
    category: 'Selection & Pickers',
    summary: 'Accessible date and range calendar grid with month/year navigation and ISO helpers.',
    parts: [
      'Calendar',
      'CalendarHeading',
      'CalendarPrevious',
      'CalendarNext',
      'CalendarGrid',
      'CalendarWeekdays',
      'CalendarWeekday',
      'CalendarWeeks',
      'CalendarDay',
    ],
    controller: 'createCalendarController',
    dataAttrs: [
      'data-selected',
      'data-today',
      'data-outside',
      'data-in-range',
      'data-range-start',
      'data-range-end',
    ],
    example: `import { Calendar, CalendarHeading, CalendarPrevious, CalendarNext, CalendarGrid, CalendarWeeks, CalendarDay } from '@subf/ui/calendar'

<Calendar defaultValue="2026-11-27" />`,
  },
  {
    slug: 'date-picker',
    name: 'Date Picker',
    category: 'Selection & Pickers',
    summary: 'Popup date picker composing input, presets, clear button, and Calendar.',
    parts: [
      'DatePicker',
      'DatePickerTrigger',
      'DatePickerInput',
      'DatePickerClear',
      'DatePickerPreset',
      'DatePickerContent',
    ],
    controller: 'createDatePickerController',
    dataAttrs: ['data-open', 'data-active', 'data-side'],
    example: `import { DatePicker, DatePickerTrigger, DatePickerContent } from '@subf/ui/date-picker'

<DatePicker defaultValue="2026-11-27">
  <DatePickerTrigger>Pick date</DatePickerTrigger>
  <DatePickerContent />
</DatePicker>`,
  },
  {
    slug: 'color-picker',
    name: 'Color Picker',
    category: 'Selection & Pickers',
    summary:
      '2D saturation/brightness area, hue/alpha sliders, channel inputs, swatches, and EyeDropper.',
    parts: [
      'ColorPicker',
      'ColorPickerArea',
      'ColorPickerAreaCanvas',
      'ColorPickerAreaThumb',
      'ColorPickerSlider',
      'ColorPickerSliderThumb',
      'ColorPickerInput',
      'ColorPickerSwatch',
      'ColorPickerSwatches',
      'ColorPickerSwatchItem',
    ],
    controller: 'createColorPickerController',
    dataAttrs: ['data-channel', 'data-orientation', 'data-selected', 'data-disabled'],
    example: `import { ColorPicker, ColorPickerInput, ColorPickerSwatches, ColorPickerSwatchItem } from '@subf/ui/color-picker'

<ColorPicker defaultValue="#006bff">
  <ColorPickerInput />
  <ColorPickerSwatches>
    <ColorPickerSwatchItem value="#006bff" />
    <ColorPickerSwatchItem value="#111111" />
  </ColorPickerSwatches>
</ColorPicker>`,
  },
  {
    slug: 'image-cropper',
    name: 'Image Cropper',
    category: 'Selection & Pickers',
    summary: 'Interactive crop viewport with selection handles, zoom, rotate, and flip controls.',
    parts: [
      'ImageCropper',
      'ImageCropperViewport',
      'ImageCropperImage',
      'ImageCropperSelection',
      'ImageCropperGrid',
      'ImageCropperHandle',
      'ImageCropperZoom',
      'ImageCropperRotate',
      'ImageCropperFlip',
    ],
    controller: 'createImageCropperController',
    dataAttrs: ['data-shape', 'data-direction', 'data-position', 'data-disabled'],
    example: `import { ImageCropper, ImageCropperViewport, ImageCropperSelection } from '@subf/ui/image-cropper'

<ImageCropper aspectRatio={1}>
  <ImageCropperViewport>
    <ImageCropperSelection />
  </ImageCropperViewport>
</ImageCropper>`,
  },

  // Overlays & Popups
  {
    slug: 'dialog',
    name: 'Dialog',
    category: 'Overlays & Popups',
    summary:
      'Modal dialog with focus trapping, Escape/backdrop dismissal, payload passing, and Promise return values.',
    parts: [
      'Dialog',
      'DialogTrigger',
      'DialogBackdrop',
      'DialogContent',
      'DialogTitle',
      'DialogDescription',
      'DialogClose',
      'DialogShortcut',
    ],
    controller: 'createDialogController',
    dataAttrs: ['data-open', 'data-closed', 'data-state', 'data-pending'],
    example: `import { Dialog, DialogTrigger, DialogBackdrop, DialogContent, DialogTitle, DialogClose } from '@subf/ui/dialog'

<Dialog>
  <DialogTrigger>Open Dialog</DialogTrigger>
  <DialogBackdrop />
  <DialogContent>
    <DialogTitle>Settings</DialogTitle>
    <DialogClose>Close</DialogClose>
  </DialogContent>
</Dialog>`,
  },
  {
    slug: 'alert-dialog',
    name: 'Alert Dialog',
    category: 'Overlays & Popups',
    summary:
      'Urgent confirmation modal with alertdialog role that prevents accidental outside-press dismissal.',
    parts: [
      'AlertDialog',
      'AlertDialogTrigger',
      'AlertDialogBackdrop',
      'AlertDialogContent',
      'AlertDialogTitle',
      'AlertDialogDescription',
      'AlertDialogClose',
    ],
    controller: 'createAlertDialogController',
    dataAttrs: ['data-open', 'data-closed', 'data-state'],
    example: `import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogClose } from '@subf/ui/alert-dialog'

<AlertDialog>
  <AlertDialogTrigger>Delete</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>Confirm deletion</AlertDialogTitle>
    <AlertDialogClose>Cancel</AlertDialogClose>
  </AlertDialogContent>
</AlertDialog>`,
  },
  {
    slug: 'drawer',
    name: 'Drawer',
    category: 'Overlays & Popups',
    summary:
      'Edge-anchored slide-over sheet supporting top/right/bottom/left sides and swipe handle.',
    parts: [
      'Drawer',
      'DrawerTrigger',
      'DrawerBackdrop',
      'DrawerContent',
      'DrawerTitle',
      'DrawerDescription',
      'DrawerHandle',
      'DrawerClose',
    ],
    controller: 'createDrawerController',
    dataAttrs: ['data-open', 'data-closed', 'data-side', 'data-state'],
    example: `import { Drawer, DrawerTrigger, DrawerBackdrop, DrawerContent, DrawerTitle, DrawerClose } from '@subf/ui/drawer'

<Drawer side="right">
  <DrawerTrigger>Open Drawer</DrawerTrigger>
  <DrawerBackdrop />
  <DrawerContent>
    <DrawerTitle>Navigation</DrawerTitle>
    <DrawerClose>Done</DrawerClose>
  </DrawerContent>
</Drawer>`,
  },
  {
    slug: 'popover',
    name: 'Popover',
    category: 'Overlays & Popups',
    summary:
      'Floating anchored panel powered by @floating-ui/dom with collision flipping and arrow positioning.',
    parts: [
      'Popover',
      'PopoverTrigger',
      'PopoverContent',
      'PopoverTitle',
      'PopoverDescription',
      'PopoverClose',
      'PopoverArrow',
    ],
    controller: 'createPopoverController',
    dataAttrs: ['data-open', 'data-closed', 'data-side', 'data-align', 'data-state'],
    example: `import { Popover, PopoverTrigger, PopoverContent, PopoverClose } from '@subf/ui/popover'

<Popover>
  <PopoverTrigger>Info</PopoverTrigger>
  <PopoverContent>
    <p>Anchored popover content.</p>
    <PopoverClose>Close</PopoverClose>
  </PopoverContent>
</Popover>`,
  },
  {
    slug: 'tooltip',
    name: 'Tooltip',
    category: 'Overlays & Popups',
    summary:
      'Hover and focus tooltip with configurable open/close delays and Floating UI positioning.',
    parts: ['Tooltip', 'TooltipTrigger', 'TooltipContent', 'TooltipArrow', 'TooltipShortcut'],
    controller: 'createTooltipController',
    dataAttrs: ['data-open', 'data-closed', 'data-side', 'data-align', 'data-state'],
    example: `import { Tooltip, TooltipTrigger, TooltipContent } from '@subf/ui/tooltip'

<Tooltip>
  <TooltipTrigger>Hover me</TooltipTrigger>
  <TooltipContent>Tooltip hint</TooltipContent>
</Tooltip>`,
  },
  {
    slug: 'hover-card',
    name: 'Hover Card',
    category: 'Overlays & Popups',
    summary: 'Rich preview card triggered on pointer hover with safe hover bridge delays.',
    parts: ['HoverCard', 'HoverCardTrigger', 'HoverCardContent', 'HoverCardArrow'],
    controller: 'createHoverCardController',
    dataAttrs: ['data-open', 'data-closed', 'data-side', 'data-align', 'data-state'],
    example: `import { HoverCard, HoverCardTrigger, HoverCardContent } from '@subf/ui/hover-card'

<HoverCard>
  <HoverCardTrigger>@subf/ui</HoverCardTrigger>
  <HoverCardContent>SolidJS 2 native headless UI SDK.</HoverCardContent>
</HoverCard>`,
  },
  {
    slug: 'menu',
    name: 'Menu',
    category: 'Overlays & Popups',
    summary:
      'Dropdown and context menu with submenus, checkbox/radio items, groups, and keyboard navigation.',
    parts: [
      'Menu',
      'MenuSub',
      'MenuTrigger',
      'MenuContextTrigger',
      'MenuContent',
      'MenuItems',
      'MenuItem',
      'MenuSubTrigger',
      'MenuCheckboxItem',
      'MenuRadioGroup',
      'MenuRadioItem',
      'MenuSeparator',
      'MenuShortcut',
    ],
    controller: 'createMenuController',
    dataAttrs: ['data-open', 'data-closed', 'data-checked', 'data-side', 'data-align'],
    example: `import { Menu, MenuTrigger, MenuContent, MenuItem } from '@subf/ui/menu'

<Menu>
  <MenuTrigger>Actions</MenuTrigger>
  <MenuContent>
    <MenuItem onSelect={() => {}}>Duplicate</MenuItem>
    <MenuItem onSelect={() => {}}>Archive</MenuItem>
  </MenuContent>
</Menu>`,
  },
  {
    slug: 'trigger-menu',
    name: 'Trigger Menu',
    category: 'Overlays & Popups',
    summary: 'Inline @mention or /slash command menu triggered inside text fields.',
    parts: [
      'TriggerMenu',
      'TriggerMenuInput',
      'TriggerMenuContent',
      'TriggerMenuList',
      'TriggerMenuItem',
      'TriggerMenuEmpty',
      'TriggerMenuHint',
    ],
    controller: 'createTriggerMenuController',
    dataAttrs: ['data-open', 'data-side', 'data-align', 'data-state'],
    example: `import { TriggerMenu, TriggerMenuInput, TriggerMenuContent, TriggerMenuList, TriggerMenuItem } from '@subf/ui/trigger-menu'

<TriggerMenu trigger="@">
  <TriggerMenuInput placeholder="Type @ to mention..." />
  <TriggerMenuContent>
    <TriggerMenuList>
      <TriggerMenuItem value="ada">Ada</TriggerMenuItem>
    </TriggerMenuList>
  </TriggerMenuContent>
</TriggerMenu>`,
  },
  {
    slug: 'toast',
    name: 'Toast',
    category: 'Overlays & Popups',
    summary:
      'Imperative toast manager (createToaster) with auto-dismiss timers, hover pause, and actions.',
    parts: [
      'createToaster',
      'ToastRegion',
      'Toast',
      'ToastTitle',
      'ToastDescription',
      'ToastAction',
      'ToastClose',
    ],
    dataAttrs: ['data-open', 'data-type', 'data-count', 'data-pending'],
    example: `import { createToaster, ToastRegion, Toast, ToastTitle, ToastClose } from '@subf/ui/toast'

const toaster = createToaster()
toaster.add({ title: 'Saved', description: 'Changes synced.' })`,
  },
  {
    slug: 'overlays',
    name: 'Overlays Host',
    category: 'Overlays & Popups',
    summary:
      'Programmatic overlay queue (createOverlays + OverlayHost) for launching imperative modals.',
    parts: ['createOverlays', 'OverlayHost'],
    dataAttrs: [],
    example: `import { createOverlays, OverlayHost } from '@subf/ui/overlays'

const overlays = createOverlays()
<OverlayHost manager={overlays} />`,
  },

  // Navigation & Layout
  {
    slug: 'tabs',
    name: 'Tabs',
    category: 'Navigation & Layout',
    summary:
      'Accessible tablist with arrow-key roving focus, hover-following indicator CSS variables, and panels.',
    parts: ['Tabs', 'TabsList', 'TabsTab', 'TabsTabIcon', 'TabsIndicator', 'TabsPanel'],
    controller: 'createTabsController',
    dataAttrs: ['data-selected', 'data-orientation', 'data-state', 'data-disabled'],
    example: `import { Tabs, TabsList, TabsTab, TabsPanel } from '@subf/ui/tabs'

<Tabs defaultValue="overview">
  <TabsList>
    <TabsTab value="overview">Overview</TabsTab>
    <TabsTab value="api">API</TabsTab>
  </TabsList>
  <TabsPanel value="overview">Overview content</TabsPanel>
  <TabsPanel value="api">API reference</TabsPanel>
</Tabs>`,
  },
  {
    slug: 'accordion',
    name: 'Accordion',
    category: 'Navigation & Layout',
    summary: 'Single or multiple collapsible disclosure sections with keyboard navigation.',
    parts: ['Accordion', 'AccordionItem', 'AccordionHeader', 'AccordionTrigger', 'AccordionPanel'],
    controller: 'createAccordionController',
    dataAttrs: ['data-open', 'data-closed', 'data-state', 'data-orientation', 'data-disabled'],
    example: `import { Accordion, AccordionItem, AccordionHeader, AccordionTrigger, AccordionPanel } from '@subf/ui/accordion'

<Accordion defaultValue="item-1">
  <AccordionItem value="item-1">
    <AccordionHeader><AccordionTrigger>Solid 2 Native</AccordionTrigger></AccordionHeader>
    <AccordionPanel>Built directly on Solid 2 signals.</AccordionPanel>
  </AccordionItem>
</Accordion>`,
  },
  {
    slug: 'collapsible',
    name: 'Collapsible',
    category: 'Navigation & Layout',
    summary: 'Lightweight disclosure primitive for expanding and collapsing a content panel.',
    parts: ['Collapsible', 'CollapsibleTrigger', 'CollapsiblePanel'],
    controller: 'createCollapsibleController',
    dataAttrs: ['data-open', 'data-closed', 'data-state', 'data-disabled'],
    example: `import { Collapsible, CollapsibleTrigger, CollapsiblePanel } from '@subf/ui/collapsible'

<Collapsible>
  <CollapsibleTrigger>Toggle details</CollapsibleTrigger>
  <CollapsiblePanel>Hidden details revealed.</CollapsiblePanel>
</Collapsible>`,
  },
  {
    slug: 'menubar',
    name: 'Menubar',
    category: 'Navigation & Layout',
    summary: 'Desktop-style horizontal menu bar coordinating multiple top-level Menu popups.',
    parts: ['Menubar'],
    controller: 'createMenubarController',
    dataAttrs: ['data-orientation'],
    example: `import { Menubar } from '@subf/ui/menubar'
import { Menu, MenuTrigger, MenuContent, MenuItem } from '@subf/ui/menu'

<Menubar>
  <Menu>
    <MenuTrigger>File</MenuTrigger>
    <MenuContent><MenuItem>New</MenuItem></MenuContent>
  </Menu>
</Menubar>`,
  },
  {
    slug: 'navigation-menu',
    name: 'Navigation Menu',
    category: 'Navigation & Layout',
    summary: 'Site navigation bar with hover/click dropdown viewports and roving link focus.',
    parts: [
      'NavigationMenu',
      'NavigationMenuList',
      'NavigationMenuItem',
      'NavigationMenuTrigger',
      'NavigationMenuContent',
      'NavigationMenuLink',
      'NavigationMenuIndicator',
      'NavigationMenuViewport',
    ],
    controller: 'createNavigationMenuController',
    dataAttrs: ['data-active', 'data-open', 'data-orientation', 'data-state'],
    example: `import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink } from '@subf/ui/navigation-menu'

<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuLink href="#/docs/index">Docs</NavigationMenuLink>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>`,
  },
  {
    slug: 'pagination',
    name: 'Pagination',
    category: 'Navigation & Layout',
    summary:
      'Accessible page navigation with smart ellipsis ranges (paginationRange) and controller.',
    parts: [
      'Pagination',
      'PaginationList',
      'PaginationItem',
      'PaginationLink',
      'PaginationPrevious',
      'PaginationNext',
      'PaginationFirst',
      'PaginationLast',
      'PaginationEllipsis',
    ],
    controller: 'createPaginationController',
    dataAttrs: ['data-current', 'data-disabled'],
    example: `import { Pagination, PaginationPrevious, PaginationLink, PaginationNext } from '@subf/ui/pagination'

<Pagination count={10} defaultPage={1}>
  <PaginationPrevious>Prev</PaginationPrevious>
  <PaginationLink page={1}>1</PaginationLink>
  <PaginationNext>Next</PaginationNext>
</Pagination>`,
  },
  {
    slug: 'resizable',
    name: 'Resizable',
    category: 'Navigation & Layout',
    summary:
      'Split-pane layout with pointer/keyboard resize handles, min/max constraints, and collapsing.',
    parts: ['Resizable', 'ResizablePanel', 'ResizableHandle'],
    controller: 'createResizableController',
    dataAttrs: ['data-orientation', 'data-dragging', 'data-collapsed', 'data-panel-index'],
    example: `import { Resizable, ResizablePanel, ResizableHandle } from '@subf/ui/resizable'

<Resizable orientation="horizontal">
  <ResizablePanel defaultSize={40}>Left</ResizablePanel>
  <ResizableHandle />
  <ResizablePanel defaultSize={60}>Right</ResizablePanel>
</Resizable>`,
  },
  {
    slug: 'scroll-area',
    name: 'Scroll Area',
    category: 'Navigation & Layout',
    summary:
      'Custom scroll viewport with reactive scrollbars, thumb tracking, and scroll-to-end helper.',
    parts: [
      'ScrollArea',
      'ScrollAreaViewport',
      'ScrollAreaContent',
      'ScrollAreaScrollbar',
      'ScrollAreaThumb',
      'ScrollAreaCorner',
      'ScrollAreaScrollToEnd',
    ],
    controller: 'createScrollAreaController',
    dataAttrs: ['data-orientation', 'data-scrolling'],
    example: `import { ScrollArea, ScrollAreaViewport, ScrollAreaContent } from '@subf/ui/scroll-area'

<ScrollArea>
  <ScrollAreaViewport style={{ height: '160px' }}>
    <ScrollAreaContent>Scrollable content...</ScrollAreaContent>
  </ScrollAreaViewport>
</ScrollArea>`,
  },
  {
    slug: 'separator',
    name: 'Separator',
    category: 'Navigation & Layout',
    summary: 'Semantic horizontal or vertical divider with decorative mode support.',
    parts: ['Separator'],
    dataAttrs: ['data-orientation'],
    example: `import { Separator } from '@subf/ui/separator'

<Separator orientation="horizontal" />`,
  },

  // Data & Display
  {
    slug: 'avatar',
    name: 'Avatar',
    category: 'Data & Display',
    summary: 'Image avatar with loading status tracking and optional delayed fallback.',
    parts: ['Avatar', 'AvatarImage', 'AvatarFallback'],
    dataAttrs: ['data-status'],
    example: `import { Avatar, AvatarImage, AvatarFallback } from '@subf/ui/avatar'

<Avatar>
  <AvatarImage src="/avatar.png" alt="User" />
  <AvatarFallback delayMs={150}>SU</AvatarFallback>
</Avatar>`,
  },
  {
    slug: 'progress',
    name: 'Progress',
    category: 'Data & Display',
    summary: 'Determinate and indeterminate progress bar with Intl number formatting.',
    parts: ['Progress', 'ProgressTrack', 'ProgressIndicator', 'ProgressLabel', 'ProgressValue'],
    dataAttrs: ['data-status', 'data-complete', 'data-indeterminate'],
    example: `import { Progress, ProgressTrack, ProgressIndicator, ProgressValue } from '@subf/ui/progress'

<Progress value={68} max={100}>
  <ProgressTrack><ProgressIndicator /></ProgressTrack>
  <ProgressValue />
</Progress>`,
  },
  {
    slug: 'meter',
    name: 'Meter',
    category: 'Data & Display',
    summary: 'Scalar gauge for displaying a value within a known min/max range.',
    parts: ['Meter', 'MeterTrack', 'MeterIndicator', 'MeterLabel', 'MeterValue'],
    dataAttrs: [],
    example: `import { Meter, MeterTrack, MeterIndicator, MeterValue } from '@subf/ui/meter'

<Meter value={72} min={0} max={100}>
  <MeterTrack><MeterIndicator /></MeterTrack>
  <MeterValue />
</Meter>`,
  },
  {
    slug: 'carousel',
    name: 'Carousel',
    category: 'Data & Display',
    summary:
      'Slide carousel with autoplay interval, loop mode, keyboard arrows, and page indicators.',
    parts: [
      'Carousel',
      'CarouselViewport',
      'CarouselContent',
      'CarouselItem',
      'CarouselPrevious',
      'CarouselNext',
      'CarouselPlayToggle',
      'CarouselIndicatorGroup',
      'CarouselIndicator',
    ],
    controller: 'createCarouselController',
    dataAttrs: ['data-active', 'data-current', 'data-playing', 'data-orientation'],
    example: `import { Carousel, CarouselViewport, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@subf/ui/carousel'

<Carousel loop>
  <CarouselViewport>
    <CarouselContent>
      <CarouselItem>Slide 1</CarouselItem>
      <CarouselItem>Slide 2</CarouselItem>
    </CarouselContent>
  </CarouselViewport>
  <CarouselPrevious>Prev</CarouselPrevious>
  <CarouselNext>Next</CarouselNext>
</Carousel>`,
  },
  {
    slug: 'timeline',
    name: 'Timeline',
    category: 'Data & Display',
    summary:
      'Vertical or horizontal chronological event list with complete/current/upcoming markers.',
    parts: [
      'Timeline',
      'TimelineItem',
      'TimelineMarker',
      'TimelineConnector',
      'TimelineTitle',
      'TimelineDescription',
      'TimelineTime',
    ],
    controller: 'createTimelineController',
    dataAttrs: ['data-orientation', 'data-status'],
    example: `import { Timeline, TimelineItem, TimelineMarker, TimelineTitle, TimelineTime } from '@subf/ui/timeline'

<Timeline>
  <TimelineItem status="complete">
    <TimelineMarker />
    <TimelineTitle>Build verified</TimelineTitle>
    <TimelineTime>09:00</TimelineTime>
  </TimelineItem>
</Timeline>`,
  },
  {
    slug: 'tree',
    name: 'Tree',
    category: 'Data & Display',
    summary:
      'Hierarchical tree view with path builder (treeFromPaths), expansion, checkboxes, and roving focus.',
    parts: [
      'Tree',
      'TreeItems',
      'TreeItem',
      'TreeGroup',
      'TreeItemIndicator',
      'TreeItemLabel',
      'TreeItemCheckbox',
    ],
    controller: 'createTreeController',
    dataAttrs: ['data-expanded', 'data-selected', 'data-checked', 'data-depth', 'data-leaf'],
    example: `import { Tree, TreeItem, TreeItemLabel, treeFromPaths } from '@subf/ui/tree'

const nodes = treeFromPaths(['src/index.ts', 'src/button.tsx', 'docs/index.html'])`,
  },
  {
    slug: 'waterfall',
    name: 'Waterfall',
    category: 'Data & Display',
    summary:
      'Trace/span waterfall timeline grid for visualizing nested spans, durations, and marks.',
    parts: [
      'Waterfall',
      'WaterfallHeaderRow',
      'WaterfallColumnHeader',
      'WaterfallAxis',
      'WaterfallRow',
      'WaterfallRowHeader',
      'WaterfallBar',
    ],
    controller: 'createWaterfallController',
    dataAttrs: ['data-expanded', 'data-selected'],
    example: `import { Waterfall, WaterfallRow, WaterfallBar } from '@subf/ui/waterfall'

<Waterfall start={0} end={500} />`,
  },

  // Utilities & Runtime
  {
    slug: 'preferences',
    name: 'Preferences',
    category: 'Utilities & Runtime',
    summary:
      'Context-driven user preferences provider (reducedMotion, density, direction, colorScheme).',
    parts: ['Preferences', 'usePreference'],
    dataAttrs: [],
    example: `import { Preferences, usePreference } from '@subf/ui/preferences'

<Preferences value={{ reducedMotion: false }}>
  <App />
</Preferences>`,
  },
]

export function getComponentDoc(slug: string): ComponentDoc | undefined {
  return COMPONENTS.find((c) => c.slug === slug)
}
