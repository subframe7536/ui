import { createContext, createSignal, createUniqueId, omit, useContext } from 'solid-js'

import { createController, useController } from './foundation/controller'
import { createChangeDetails } from './foundation/details'
import type { ChangeDetails, ChangeOptions } from './foundation/details'
import { registerComponent } from './foundation/registry'
import { renderPart } from './foundation/render'
import type { PartProps } from './foundation/render'
import { createControlledSignal } from './foundation/state'

export type ImageCrop = {
  x: number
  y: number
  width: number
  height: number
}

export type ImageRotation = number
export type ImageCropperShape = 'rect' | 'circle'
export type ImageCropperMode = 'crop' | 'pan'
export type ImageCropperFlipDirection = 'horizontal' | 'vertical'
export type ImageCropperHandlePosition = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
export type ImageCropperCropChangeReason =
  | 'drag'
  | 'resize'
  | 'zoom'
  | 'rotate'
  | 'flip'
  | 'reset'
  | 'programmatic'
export type ImageCropperChangeOptions = ChangeOptions<ImageCropperCropChangeReason>
export type ImageCropperCropChangeDetails = ChangeDetails<ImageCropperCropChangeReason>
export type ImageCropperCropCommitDetails = ImageCropperCropChangeDetails

export type ImageCropperApi = {
  setCrop: (crop: ImageCrop, options?: ImageCropperChangeOptions) => void
  setZoom: (zoom: number) => void
  rotate: (degrees?: number) => void
  flip: (direction: ImageCropperFlipDirection) => void
  reset: () => void
  getCrop: () => ImageCrop
  getZoom: () => number
  getRotation: () => number
}

export function createImageCropperController() {
  return createController<ImageCropperApi>()
}

export type ImageCropperController = ReturnType<typeof createImageCropperController>

export type ImageCropperOptions = {
  crop?: ImageCrop
  defaultCrop?: ImageCrop
  onCropChange?: (crop: ImageCrop, details: ImageCropperCropChangeDetails) => void
  onCropCommit?: (crop: ImageCrop, details: ImageCropperCropCommitDetails) => void
  aspectRatio?: number
  minZoom?: number
  maxZoom?: number
  shape?: ImageCropperShape
  mode?: ImageCropperMode
  disabled?: boolean
  controller?: ImageCropperController
  debug?: boolean
}

export type ImageCropperState = {
  crop: ImageCrop
  zoom: number
  rotation: number
  flipX: boolean
  flipY: boolean
  shape: ImageCropperShape
  mode: ImageCropperMode
  disabled: boolean
}

export type ImageCropperPrimitive = ImageCropperState
export type ImageCropperHandleProps = { position: ImageCropperHandlePosition }
export type ImageCropperHandleState = ImageCropperState & { position: ImageCropperHandlePosition }
export type ImageCropperFlipProps = { direction: ImageCropperFlipDirection }

const DEFAULT_CROP: ImageCrop = { x: 10, y: 10, width: 80, height: 80 }

function clampCrop(c: ImageCrop): ImageCrop {
  const width = Math.min(100, Math.max(5, c.width))
  const height = Math.min(100, Math.max(5, c.height))
  const x = Math.min(100 - width, Math.max(0, c.x))
  const y = Math.min(100 - height, Math.max(0, c.y))
  return { x, y, width, height }
}

type ImageCropperContextValue = {
  state: () => ImageCropperState
  api: ImageCropperApi
  updateCrop: (next: ImageCrop, reason: ImageCropperCropChangeReason, event?: Event) => void
  commitCrop: (reason: ImageCropperCropChangeReason, event?: Event) => void
  minZoom: () => number
  maxZoom: () => number
}

const ImageCropperContext = createContext<ImageCropperContextValue | null>(null)

function useImageCropper(part: string): ImageCropperContextValue {
  const ctx = useContext(ImageCropperContext)
  if (!ctx) {
    throw new Error(`<ImageCropper${part}> must be used inside <ImageCropper>.`)
  }
  return ctx
}

export function ImageCropper(
  props: ImageCropperOptions & Omit<PartProps<'div', ImageCropperState>, keyof ImageCropperOptions>,
) {
  const id = `ui-image-cropper-${createUniqueId()}`
  const [crop, setRawCrop] = createControlledSignal<ImageCrop>({
    value: () => props.crop,
    defaultValue: () => props.defaultCrop ?? DEFAULT_CROP,
  })
  const [zoom, setZoomRaw] = createSignal(1)
  const [rotation, setRotation] = createSignal(0)
  const [flipX, setFlipX] = createSignal(false)
  const [flipY, setFlipY] = createSignal(false)
  let rootEl: HTMLElement | null = null

  const minZoom = () => props.minZoom ?? 1
  const maxZoom = () => props.maxZoom ?? 4
  const disabled = () => !!props.disabled

  const state = (): ImageCropperState => ({
    crop: crop(),
    zoom: zoom(),
    rotation: rotation(),
    flipX: flipX(),
    flipY: flipY(),
    shape: props.shape ?? 'rect',
    mode: props.mode ?? 'crop',
    disabled: disabled(),
  })

  const updateCrop = (next: ImageCropperOptions['crop'] & ImageCrop, reason: ImageCropperCropChangeReason, event?: Event) => {
    if (disabled()) {
      return
    }
    const bounded = clampCrop(next)
    const details = createChangeDetails(reason, event)
    props.onCropChange?.(bounded, details)
    if (details.canceled) {
      return
    }
    setRawCrop(bounded)
  }

  const commitCrop = (reason: ImageCropperCropChangeReason, event?: Event) => {
    props.onCropCommit?.(crop(), createChangeDetails(reason, event))
  }

  const api: ImageCropperApi = {
    setCrop: (next, opts) => updateCrop(next, opts?.reason ?? 'programmatic', opts?.event),
    setZoom: (z) => setZoomRaw(Math.min(maxZoom(), Math.max(minZoom(), z))),
    rotate: (deg = 90) => setRotation((r) => (r + deg + 360) % 360),
    flip: (dir) => {
      if (dir === 'horizontal') {
        setFlipX((v) => !v)
      } else {
        setFlipY((v) => !v)
      }
    },
    reset: () => {
      setZoomRaw(1)
      setRotation(0)
      setFlipX(false)
      setFlipY(false)
      updateCrop(props.defaultCrop ?? DEFAULT_CROP, 'reset')
    },
    getCrop: () => crop(),
    getZoom: () => zoom(),
    getRotation: () => rotation(),
  }

  useController(() => props.controller, api)

  registerComponent({
    component: 'image-cropper',
    getElements: () => [rootEl],
    getState: () => ({ crop: crop(), zoom: zoom(), rotation: rotation(), disabled: disabled() }),
    getDisabled: disabled,
    actions: {
      rotate: (deg) => api.rotate(Number(deg ?? 90)),
      reset: () => api.reset(),
    },
  })

  const rest = omit(
    props,
    'crop',
    'defaultCrop',
    'onCropChange',
    'onCropCommit',
    'aspectRatio',
    'minZoom',
    'maxZoom',
    'shape',
    'mode',
    'disabled',
    'controller',
    'debug',
  )

  return (
    <ImageCropperContext value={{ state, api, updateCrop, commitCrop, minZoom, maxZoom }}>
      {renderPart('div', rest, state, {
        ref: (el) => {
          rootEl = el
        },
        attrs: () => ({
          id,
          'data-shape': state().shape,
          'data-disabled': disabled() ? '' : undefined,
        }),
      })}
    </ImageCropperContext>
  )
}

export function ImageCropperViewport(props: PartProps<'div', ImageCropperState>) {
  const ctx = useImageCropper('Viewport')
  return renderPart('div', props, ctx.state, {
    style: () => ({ position: 'relative', overflow: 'hidden' }),
  })
}

export function ImageCropperImage(props: PartProps<'img', ImageCropperState>) {
  const ctx = useImageCropper('Image')
  return renderPart('img', props, ctx.state, {
    style: () => {
      const s = ctx.state()
      const sx = s.flipX ? -s.zoom : s.zoom
      const sy = s.flipY ? -s.zoom : s.zoom
      return {
        transform: `scale(${sx}, ${sy}) rotate(${s.rotation}deg)`,
      }
    },
  })
}

export function ImageCropperSelection(props: PartProps<'div', ImageCropperState>) {
  const ctx = useImageCropper('Selection')
  return renderPart('div', props, ctx.state, {
    attrs: () => ({
      role: 'region',
      'aria-label': 'Crop selection',
      'data-shape': ctx.state().shape,
    }),
    style: () => {
      const c = ctx.state().crop
      return {
        position: 'absolute',
        left: `${c.x}%`,
        top: `${c.y}%`,
        width: `${c.width}%`,
        height: `${c.height}%`,
        'border-radius': ctx.state().shape === 'circle' ? '9999px' : undefined,
      }
    },
  })
}

export function ImageCropperGrid(props: PartProps<'div', ImageCropperState>) {
  const ctx = useImageCropper('Grid')
  return renderPart('div', props, ctx.state, {
    attrs: () => ({ 'aria-hidden': true }),
  })
}

export function ImageCropperHandle(
  props: ImageCropperHandleProps &
    Omit<PartProps<'div', ImageCropperHandleState>, keyof ImageCropperHandleProps>,
) {
  const ctx = useImageCropper('Handle')
  const handleState = (): ImageCropperHandleState => ({
    ...ctx.state(),
    position: props.position,
  })
  const rest = omit(props, 'position')
  return renderPart('div', rest, handleState, {
    attrs: () => ({
      role: 'slider',
      tabindex: ctx.state().disabled ? -1 : 0,
      'data-position': props.position,
    }),
  })
}

export function ImageCropperZoom(
  props: Omit<PartProps<'input', ImageCropperState>, 'type' | 'value'>,
) {
  const ctx = useImageCropper('Zoom')
  return renderPart('input', props, ctx.state, {
    attrs: () => ({
      type: 'range',
      min: ctx.minZoom(),
      max: ctx.maxZoom(),
      step: 0.1,
      value: ctx.state().zoom,
      disabled: ctx.state().disabled,
      'aria-label': 'Zoom',
    }),
    handlers: {
      onInput: (e: InputEvent & { currentTarget: HTMLInputElement }) => {
        ctx.api.setZoom(Number(e.currentTarget.value))
      },
    },
  })
}

export function ImageCropperRotate(
  props: { degrees?: number } & Omit<PartProps<'button', ImageCropperState>, 'type'>,
) {
  const ctx = useImageCropper('Rotate')
  const rest = omit(props, 'degrees')
  return renderPart('button', rest, ctx.state, {
    attrs: () => ({
      type: 'button',
      disabled: ctx.state().disabled,
      'aria-label': 'Rotate',
    }),
    handlers: {
      onClick: () => ctx.api.rotate(props.degrees ?? 90),
    },
  })
}

export function ImageCropperFlip(
  props: ImageCropperFlipProps &
    Omit<PartProps<'button', ImageCropperState>, keyof ImageCropperFlipProps | 'type'>,
) {
  const ctx = useImageCropper('Flip')
  const rest = omit(props, 'direction')
  return renderPart('button', rest, ctx.state, {
    attrs: () => ({
      type: 'button',
      disabled: ctx.state().disabled,
      'aria-label': `Flip ${props.direction}`,
      'data-direction': props.direction,
    }),
    handlers: {
      onClick: () => ctx.api.flip(props.direction),
    },
  })
}
