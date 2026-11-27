import type { JSX } from '@solidjs/web'
import {
  For,
  createContext,
  createEffect,
  createSignal,
  createUniqueId,
  merge,
  omit,
  useContext,
} from 'solid-js'

import { useFieldControl } from './field'
import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type FileLike = Pick<File, 'name' | 'size' | 'type'> & {
  lastModified?: number
  webkitRelativePath?: string
}

export type FileRejectionReason =
  | 'type'
  | 'too-large'
  | 'too-small'
  | 'too-many'
  | 'duplicate'
  | 'custom'

export type FileRejection = {
  file: File
  reasons: Array<FileRejectionReason>
}

export type FileRules = {
  accept?: string | Array<string>
  maxSize?: number
  minSize?: number
  maxFiles?: number
  allowDuplicates?: boolean
  validate?: (file: File) => Array<FileRejectionReason> | null | undefined
}

export type FileInputValueChangeReason =
  | 'input'
  | 'drop'
  | 'paste'
  | 'remove'
  | 'clear'
  | 'programmatic'

export type FileInputChangeOptions = ChangeOptions<FileInputValueChangeReason>

export type FileInputValueChangeDetails = ChangeDetails<FileInputValueChangeReason> & {
  accepted: Array<File>
  rejected: Array<FileRejection>
}

export type FileInputChange = {
  files: Array<File>
  accepted: Array<File>
  rejected: Array<FileRejection>
}

export type FileInputDropzoneTarget = 'self' | 'window'
export type FileInputPasteTarget = 'self' | 'window' | false

export type FileInputApi = {
  setFiles: (files: Array<File>, options?: FileInputChangeOptions) => void
  addFiles: (files: Array<File> | FileList, options?: FileInputChangeOptions) => FileInputChange
  removeFile: (file: File) => void
  clear: () => void
  open: () => void
  getFiles: () => Array<File>
}

export function createFileInputController() {
  return createController<FileInputApi>()
}

export type FileInputController = ReturnType<typeof createFileInputController>

export type FileInputOptions = FileRules & {
  value?: Array<File>
  defaultValue?: Array<File>
  onValueChange?: (files: Array<File>, details: FileInputValueChangeDetails) => void
  onReject?: (rejections: Array<FileRejection>) => void
  multiple?: boolean
  directory?: boolean
  capture?: 'user' | 'environment'
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  invalid?: boolean
  name?: string
  form?: string
  controller?: FileInputController
  debug?: boolean
}

export type FileInputState = {
  files: Array<File>
  count: number
  empty: boolean
  dragging: boolean
  disabled: boolean
  readOnly: boolean
  invalid: boolean
  canAddMore: boolean
}

export type FileInputDropzoneProps = {
  target?: FileInputDropzoneTarget
  paste?: FileInputPasteTarget
}

export type FileInputDropzoneState = FileInputState & {
  dragging: boolean
}

export type FileInputTriggerProps = {
  disabled?: boolean
}

export type FileInputItemProps = {
  file?: File
}

export type FileInputItemState = {
  file: File
  name: string
  size: number
  formattedSize: string
  relativePath: string
  disabled: boolean
}

export type FileInputItemRemoveState = FileInputItemState

export function formatFileSize(bytes: number, decimals = 1): string {
  if (bytes <= 0) {
    return '0 B'
  }
  const k = 1024
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1)
  const val = bytes / k ** i
  return `${i === 0 ? Math.round(val) : val.toFixed(decimals)} ${units[i] ?? 'B'}`
}

export function relativePath(file: FileLike): string {
  return file.webkitRelativePath && file.webkitRelativePath.length > 0
    ? file.webkitRelativePath
    : file.name
}

function fileIdentity(file: FileLike): string {
  return `${relativePath(file)}:${file.size}:${file.lastModified ?? 0}`
}

function matchesAccept(file: File, accept: string | Array<string> | undefined): boolean {
  if (!accept) {
    return true
  }
  const list = (Array.isArray(accept) ? accept : accept.split(','))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (list.length === 0) {
    return true
  }
  const name = file.name.toLowerCase()
  const mime = file.type.toLowerCase()
  return list.some((rule) => {
    if (rule === '*' || rule === '*/*') {
      return true
    }
    if (rule.startsWith('.')) {
      return name.endsWith(rule)
    }
    if (rule.endsWith('/*')) {
      return mime.startsWith(rule.slice(0, -1))
    }
    return mime === rule
  })
}

type FileInputContextValue = {
  id: string
  state: () => FileInputState
  api: FileInputApi
  setDragging: (v: boolean) => void
  openPicker: () => void
  field: ReturnType<typeof useFieldControl>
}

const FileInputContext = createContext<FileInputContextValue | null>(null)
const FileItemContext = createContext<(() => File) | null>(null)
const FileItemIndexContext = createContext<(() => number) | null>(null)

function useFileInput(part: string): FileInputContextValue {
  const ctx = useContext(FileInputContext)
  if (!ctx) {
    throw new Error(`<FileInput${part}> must be used inside <FileInput>.`)
  }
  return ctx
}

function useItemFile(part: string, own: () => File | undefined): () => File {
  const listed = useContext(FileItemContext)
  return () => {
    const file = own() ?? listed?.()
    if (!file) {
      throw new Error(
        `<FileInput${part}> must receive a file prop or be used inside <FileInputList>.`,
      )
    }
    return file
  }
}

export function FileInput(
  props: FileInputOptions &
    Omit<PartProps<'div', FileInputState>, keyof FileInputOptions | 'defaultValue' | 'onChange'>,
) {
  const field = useFieldControl()
  const id = field?.controlId ?? `ui-file-input-${createUniqueId()}`

  const [files, setRawFiles] = createControlledSignal<Array<File>>({
    value: () => props.value,
    defaultValue: () => props.defaultValue ?? [],
  })
  const [dragging, setDragging] = createSignal(false)

  let inputEl: HTMLInputElement | null = null
  let rootEl: HTMLElement | null = null

  const disabled = () => !!props.disabled || !!field?.disabled()
  const readOnly = () => !!props.readOnly || !!field?.readOnly()
  const invalid = () => !!props.invalid || !!field?.invalid()
  const multiple = () => props.multiple ?? (props.maxFiles === undefined || props.maxFiles > 1)

  const state = (): FileInputState => {
    const list = files()
    const max = props.maxFiles
    return {
      files: list,
      count: list.length,
      empty: list.length === 0,
      dragging: dragging(),
      disabled: disabled(),
      readOnly: readOnly(),
      invalid: invalid(),
      canAddMore: !disabled() && !readOnly() && (max === undefined || list.length < max),
    }
  }

  const commitChange = (
    nextFiles: Array<File>,
    accepted: Array<File>,
    rejected: Array<FileRejection>,
    reason: FileInputValueChangeReason,
    event?: Event,
  ) => {
    const base = createChangeDetails(reason, event)
    const details: FileInputValueChangeDetails = {
      ...base,
      accepted,
      rejected,
    }
    if (rejected.length > 0) {
      props.onReject?.(rejected)
    }
    props.onValueChange?.(nextFiles, details)
    if (details.canceled) {
      return
    }
    setRawFiles(nextFiles)
    field?.setDirty(true)
  }

  const addFiles = (
    incoming: Array<File> | FileList,
    options?: FileInputChangeOptions,
  ): FileInputChange => {
    const arr = Array.from(incoming)
    if (disabled() || readOnly()) {
      return { files: files(), accepted: [], rejected: [] }
    }
    const existing = multiple() ? [...files()] : []
    const seen = new Set(existing.map(fileIdentity))
    const accepted: Array<File> = []
    const rejected: Array<FileRejection> = []

    for (const file of arr) {
      const reasons: Array<FileRejectionReason> = []
      if (!matchesAccept(file, props.accept)) {
        reasons.push('type')
      }
      if (props.maxSize !== undefined && file.size > props.maxSize) {
        reasons.push('too-large')
      }
      if (props.minSize !== undefined && file.size < props.minSize) {
        reasons.push('too-small')
      }
      if (!props.allowDuplicates && seen.has(fileIdentity(file))) {
        reasons.push('duplicate')
      }
      const custom = props.validate?.(file)
      if (custom && custom.length > 0) {
        reasons.push(...custom)
      }
      if (props.maxFiles !== undefined && existing.length + accepted.length >= props.maxFiles) {
        reasons.push('too-many')
      }

      if (reasons.length > 0) {
        rejected.push({ file, reasons })
      } else {
        accepted.push(file)
        seen.add(fileIdentity(file))
      }
    }

    const nextFiles = multiple() ? [...existing, ...accepted] : accepted.slice(0, 1)
    commitChange(nextFiles, accepted, rejected, options?.reason ?? 'input', options?.event)
    return { files: nextFiles, accepted, rejected }
  }

  const api: FileInputApi = {
    setFiles: (next, options) => {
      commitChange(next, next, [], options?.reason ?? 'programmatic', options?.event)
    },
    addFiles,
    removeFile: (target) => {
      if (disabled() || readOnly()) {
        return
      }
      const next = files().filter((f: File) => f !== target)
      commitChange(next, [], [], 'remove')
    },
    clear: () => {
      if (disabled() || readOnly()) {
        return
      }
      commitChange([], [], [], 'clear')
    },
    open: () => {
      if (disabled() || readOnly()) {
        return
      }
      inputEl?.click()
    },
    getFiles: () => files(),
  }

  useController(() => props.controller, api)

  registerComponent({
    component: 'file-input',
    getElements: () => [rootEl, inputEl],
    getState: () => ({ count: files().length, empty: files().length === 0, disabled: disabled() }),
    getDisabled: disabled,
    actions: {
      clear: () => api.clear(),
    },
  })

  const acceptAttr = () => (Array.isArray(props.accept) ? props.accept.join(',') : props.accept)

  const rest = omit(
    props,
    'value',
    'defaultValue',
    'onValueChange',
    'onReject',
    'accept',
    'maxSize',
    'minSize',
    'maxFiles',
    'allowDuplicates',
    'validate',
    'multiple',
    'directory',
    'capture',
    'disabled',
    'readOnly',
    'required',
    'invalid',
    'name',
    'form',
    'controller',
    'debug',
  )

  const combinedProps: PartProps<'div', FileInputState> = merge(rest, {
    children: (s: FileInputState) => (
      <>
        <input
          ref={(el) => {
            inputEl = el
          }}
          type="file"
          accept={acceptAttr()}
          multiple={multiple()}
          capture={props.capture}
          {...(props.directory ? { webkitdirectory: true } : {})}
          name={props.name ?? field?.name()}
          form={props.form}
          disabled={disabled()}
          required={!!props.required || !!field?.required()}
          aria-hidden="true"
          tabindex={-1}
          style={{ display: 'none' }}
          onChange={(e) => {
            const list = e.currentTarget.files
            if (list && list.length > 0) {
              addFiles(list, { reason: 'input', event: e })
            }
            e.currentTarget.value = ''
          }}
        />
        {typeof props.children === 'function' ? props.children(s) : props.children}
      </>
    ),
  })

  return (
    <FileInputContext
      value={{
        id,
        state,
        api,
        setDragging,
        openPicker: () => api.open(),
        field,
      }}
    >
      {renderPart('div', combinedProps, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => {
          const s = state()
          return {
            'data-slot': 'file-input',
            'data-empty': s.empty ? '' : undefined,
            'data-dragging': s.dragging ? '' : undefined,
            'data-disabled': s.disabled ? '' : undefined,
            'data-readonly': s.readOnly ? '' : undefined,
            'data-invalid': s.invalid ? '' : undefined,
          }
        },
      })}
    </FileInputContext>
  )
}

export function FileInputDropzone(
  props: FileInputDropzoneProps &
    Omit<PartProps<'div', FileInputDropzoneState>, keyof FileInputDropzoneProps>,
) {
  const ctx = useFileInput('Dropzone')
  const rest = omit(props, 'target', 'paste')

  const onPaste = (e: ClipboardEvent) => {
    const files = e.clipboardData?.files
    if (files && files.length > 0) {
      ctx.api.addFiles(files, { reason: 'paste', event: e })
    }
  }
  createEffect(
    () => props.paste,
    (pasteTarget) => {
      if (pasteTarget !== 'window') {
        return
      }
      window.addEventListener('paste', onPaste)
      return () => window.removeEventListener('paste', onPaste)
    },
  )

  return renderPart('div', rest, ctx.state, {
    attrs: () => {
      const s = ctx.state()
      return {
        role: 'button',
        tabindex: s.disabled ? -1 : 0,
        'aria-disabled': s.disabled ? 'true' : undefined,
        'aria-labelledby': ctx.field?.labelId,
        'aria-describedby': ctx.field?.describedBy(),
        'data-slot': 'file-input-dropzone',
        'data-dragging': s.dragging ? '' : undefined,
        'data-disabled': s.disabled ? '' : undefined,
        'data-empty': s.empty ? '' : undefined,
      }
    },
    handlers: {
      onClick: () => ctx.openPicker(),
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          ctx.openPicker()
        }
      },
      onDragEnter: (e: DragEvent) => {
        e.preventDefault()
        if (!ctx.state().disabled && !ctx.state().readOnly) {
          ctx.setDragging(true)
        }
      },
      onDragOver: (e: DragEvent) => {
        e.preventDefault()
        if (!ctx.state().disabled && !ctx.state().readOnly) {
          ctx.setDragging(true)
        }
      },
      onDragLeave: (e: DragEvent) => {
        e.preventDefault()
        ctx.setDragging(false)
      },
      onDrop: (e: DragEvent) => {
        e.preventDefault()
        ctx.setDragging(false)
        const files = e.dataTransfer?.files
        if (files && files.length > 0) {
          ctx.api.addFiles(files, { reason: 'drop', event: e })
        }
      },
      onPaste: (e: ClipboardEvent) => {
        if (props.paste === false) {
          return
        }
        const files = e.clipboardData?.files
        if (files && files.length > 0) {
          ctx.api.addFiles(files, { reason: 'paste', event: e })
        }
      },
    },
  })
}

export function FileInputTrigger(
  props: FileInputTriggerProps &
    Omit<PartProps<'button', FileInputState>, keyof FileInputTriggerProps>,
) {
  const ctx = useFileInput('Trigger')
  const rest = omit(props, 'disabled')
  return renderPart('button', rest, ctx.state, {
    attrs: () => {
      const s = ctx.state()
      const isDisabled = !!props.disabled || s.disabled || s.readOnly || !s.canAddMore
      return {
        id: props.id ?? ctx.id,
        type: 'button',
        disabled: isDisabled,
        'data-slot': 'file-input-trigger',
        'data-disabled': isDisabled ? '' : undefined,
      }
    },
    handlers: {
      onClick: () => ctx.openPicker(),
    },
  })
}

export function FileInputList(
  props: Omit<PartProps<'ul', FileInputState>, 'children'> & {
    children?: JSX.Element | ((file: File, index: () => number) => JSX.Element)
  },
) {
  const ctx = useFileInput('List')
  const rest = omit(props, 'children')
  const combinedProps: PartProps<'ul', FileInputState> = merge(rest, {
    children: (
      <For each={ctx.state().files}>
        {(file, index) => (
          <FileItemContext value={() => file}>
            <FileItemIndexContext value={index}>
              {typeof props.children === 'function' ? props.children(file, index) : props.children}
            </FileItemIndexContext>
          </FileItemContext>
        )}
      </For>
    ),
  })

  return renderPart('ul', combinedProps, ctx.state, {
    attrs: () => ({
      role: 'list',
      'data-slot': 'file-input-list',
      'data-empty': ctx.state().empty ? '' : undefined,
    }),
  })
}

export function FileInputItem(
  props: FileInputItemProps & Omit<PartProps<'li', FileInputItemState>, keyof FileInputItemProps>,
) {
  const ctx = useFileInput('Item')
  const getFile = useItemFile('Item', () => props.file)
  const index = useContext(FileItemIndexContext)
  const itemState = (): FileInputItemState => {
    const f = getFile()
    return {
      file: f,
      name: f.name,
      size: f.size,
      formattedSize: formatFileSize(f.size),
      relativePath: relativePath(f),
      disabled: ctx.state().disabled,
    }
  }
  const rest = omit(props, 'file')

  return (
    <FileItemContext value={getFile}>
      {renderPart('li', rest, itemState, {
        attrs: () => ({
          role: 'listitem',
          tabindex: index ? (index() === 0 ? 0 : -1) : undefined,
          'data-slot': 'file-input-item',
          'data-disabled': itemState().disabled ? '' : undefined,
        }),
      })}
    </FileItemContext>
  )
}

export function FileInputItemRemove(
  props: FileInputItemProps &
    Omit<PartProps<'button', FileInputItemRemoveState>, keyof FileInputItemProps>,
) {
  const ctx = useFileInput('ItemRemove')
  const getFile = useItemFile('ItemRemove', () => props.file)
  const itemState = (): FileInputItemRemoveState => {
    const f = getFile()
    return {
      file: f,
      name: f.name,
      size: f.size,
      formattedSize: formatFileSize(f.size),
      relativePath: relativePath(f),
      disabled: ctx.state().disabled || ctx.state().readOnly,
    }
  }
  const rest = omit(props, 'file')

  return renderPart('button', rest, itemState, {
    attrs: () => {
      const s = itemState()
      return {
        type: 'button',
        disabled: s.disabled,
        'aria-label': `Remove ${s.name}`,
        'data-slot': 'file-input-item-remove',
        'data-disabled': s.disabled ? '' : undefined,
      }
    },
    handlers: {
      onClick: () => ctx.api.removeFile(itemState().file),
    },
  })
}
