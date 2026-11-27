import solid from '@solidjs/vite-plugin'
import { defineConfig } from 'tsdown'
import type { ExportsOptions } from 'tsdown'

const allEntries = {
  index: './src/index.ts',
  accordion: './src/accordion.tsx',
  agent: './src/agent.ts',
  'alert-dialog': './src/alert-dialog.tsx',
  autocomplete: './src/autocomplete.tsx',
  avatar: './src/avatar.tsx',
  button: './src/button.tsx',
  calendar: './src/calendar.tsx',
  carousel: './src/carousel.tsx',
  checkbox: './src/checkbox.tsx',
  collapsible: './src/collapsible.tsx',
  'color-picker': './src/color-picker.tsx',
  combobox: './src/combobox.tsx',
  command: './src/command.tsx',
  'date-input': './src/date-input.tsx',
  'date-picker': './src/date-picker.tsx',
  dialog: './src/dialog.tsx',
  drawer: './src/drawer.tsx',
  field: './src/field.tsx',
  'file-input': './src/file-input.tsx',
  'hover-card': './src/hover-card.tsx',
  'image-cropper': './src/image-cropper.tsx',
  input: './src/input.tsx',
  label: './src/label.tsx',
  listbox: './src/listbox.tsx',
  menu: './src/menu.tsx',
  menubar: './src/menubar.tsx',
  meter: './src/meter.tsx',
  'navigation-menu': './src/navigation-menu.tsx',
  'number-input': './src/number-input.tsx',
  observe: './src/observe.ts',
  'otp-input': './src/otp-input.tsx',
  overlays: './src/overlays.tsx',
  pagination: './src/pagination.tsx',
  'password-input': './src/password-input.tsx',
  popover: './src/popover.tsx',
  preferences: './src/preferences.tsx',
  primitive: './src/primitive.ts',
  progress: './src/progress.tsx',
  radio: './src/radio.tsx',
  rating: './src/rating.tsx',
  resizable: './src/resizable.tsx',
  'scroll-area': './src/scroll-area.tsx',
  'segmented-control': './src/segmented-control.tsx',
  select: './src/select.tsx',
  separator: './src/separator.tsx',
  slider: './src/slider.tsx',
  switch: './src/switch.tsx',
  tabs: './src/tabs.tsx',
  textarea: './src/textarea.tsx',
  'time-input': './src/time-input.tsx',
  timeline: './src/timeline.tsx',
  toast: './src/toast.tsx',
  toggle: './src/toggle.tsx',
  'token-input': './src/token-input.tsx',
  toolbar: './src/toolbar.tsx',
  tooltip: './src/tooltip.tsx',
  tree: './src/tree.tsx',
  'trigger-menu': './src/trigger-menu.tsx',
  waterfall: './src/waterfall.tsx',
}

const jsxEntries = {
  index: './src/index.ts',
  accordion: './src/accordion.tsx',
  'alert-dialog': './src/alert-dialog.tsx',
  autocomplete: './src/autocomplete.tsx',
  avatar: './src/avatar.tsx',
  button: './src/button.tsx',
  calendar: './src/calendar.tsx',
  carousel: './src/carousel.tsx',
  checkbox: './src/checkbox.tsx',
  collapsible: './src/collapsible.tsx',
  'color-picker': './src/color-picker.tsx',
  combobox: './src/combobox.tsx',
  command: './src/command.tsx',
  'date-input': './src/date-input.tsx',
  'date-picker': './src/date-picker.tsx',
  dialog: './src/dialog.tsx',
  drawer: './src/drawer.tsx',
  field: './src/field.tsx',
  'file-input': './src/file-input.tsx',
  'hover-card': './src/hover-card.tsx',
  'image-cropper': './src/image-cropper.tsx',
  input: './src/input.tsx',
  label: './src/label.tsx',
  listbox: './src/listbox.tsx',
  menu: './src/menu.tsx',
  menubar: './src/menubar.tsx',
  meter: './src/meter.tsx',
  'navigation-menu': './src/navigation-menu.tsx',
  'number-input': './src/number-input.tsx',
  'otp-input': './src/otp-input.tsx',
  overlays: './src/overlays.tsx',
  pagination: './src/pagination.tsx',
  'password-input': './src/password-input.tsx',
  popover: './src/popover.tsx',
  preferences: './src/preferences.tsx',
  progress: './src/progress.tsx',
  radio: './src/radio.tsx',
  rating: './src/rating.tsx',
  resizable: './src/resizable.tsx',
  'scroll-area': './src/scroll-area.tsx',
  'segmented-control': './src/segmented-control.tsx',
  select: './src/select.tsx',
  separator: './src/separator.tsx',
  slider: './src/slider.tsx',
  switch: './src/switch.tsx',
  tabs: './src/tabs.tsx',
  textarea: './src/textarea.tsx',
  'time-input': './src/time-input.tsx',
  timeline: './src/timeline.tsx',
  toast: './src/toast.tsx',
  toggle: './src/toggle.tsx',
  'token-input': './src/token-input.tsx',
  toolbar: './src/toolbar.tsx',
  tooltip: './src/tooltip.tsx',
  tree: './src/tree.tsx',
  'trigger-menu': './src/trigger-menu.tsx',
  waterfall: './src/waterfall.tsx',
}

const packageExports: ExportsOptions = {
  customExports(exports, { chunks }) {
    const solidChunks = new Set<string>()
    for (const group of Object.values(chunks)) {
      for (const chunk of group) {
        if (chunk.type !== 'chunk' || !chunk.isEntry || !chunk.fileName.endsWith('.jsx')) {
          continue
        }
        solidChunks.add(chunk.fileName.replaceAll('\\', '/').replace(/\.jsx$/, ''))
      }
    }

    for (const [key, value] of Object.entries(exports)) {
      if (typeof value !== 'string') {
        continue
      }
      const slashIndex = value.lastIndexOf('/')
      const fileName = value.slice(slashIndex + 1)
      if (!fileName.endsWith('.mjs') && !fileName.endsWith('.jsx')) {
        continue
      }
      const dir = value.slice(0, slashIndex + 1)
      const name = fileName.replace(/\.(?:mjs|jsx)$/, '')
      exports[key] = {
        types: `${dir}${name}.d.mts`,
        ...(solidChunks.has(name) ? { solid: `${dir}${name}.jsx` } : {}),
        default: `${dir}${name}.mjs`,
      }
    }

    return exports
  },
}

export default defineConfig([
  {
    entry: allEntries,
    plugins: [solid()],
    unbundle: true,
    clean: true,
    deps: {
      neverBundle: ['solid-js', '@solidjs/web', '@floating-ui/dom'],
    },
    dts: {
      generator: 'tsrs',
    },
    exports: packageExports,
  },
  {
    entry: jsxEntries,
    unbundle: true,
    clean: false,
    platform: 'neutral',
    deps: {
      neverBundle: ['solid-js', '@solidjs/web', '@floating-ui/dom'],
    },
    outExtensions: () => ({ js: '.jsx' }),
    dts: false,
    exports: packageExports,
  },
])
