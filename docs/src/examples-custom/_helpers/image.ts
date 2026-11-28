import type { ImageCrop } from '@subf/ui/image-cropper'

export async function cropImage(
  src: string,
  crop: ImageCrop,
  options?: { type?: string; quality?: number; name?: string },
): Promise<File> {
  const type = options?.type ?? 'image/png'
  const name = options?.name ?? 'cropped.png'
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.crossOrigin = 'anonymous'
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('Failed to load image'))
    el.src = src
  })
  const width = Math.max(1, Math.round((crop.width / 100) * img.naturalWidth))
  const height = Math.max(1, Math.round((crop.height / 100) * img.naturalHeight))
  const sx = Math.round((crop.x / 100) * img.naturalWidth)
  const sy = Math.round((crop.y / 100) * img.naturalHeight)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.drawImage(img, sx, sy, width, height, 0, 0, width, height)
  }
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b ?? new Blob([], { type })), type, options?.quality)
  })
  return new File([blob], name, { type })
}
