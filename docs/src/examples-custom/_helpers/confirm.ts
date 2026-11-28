import { createAlertDialogController, type AlertDialogController } from '@subf/ui/alert-dialog'

export type ConfirmOptions = {
  title?: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
}

export type ConfirmHelper<Payload = ConfirmOptions> = ((payload: Payload) => Promise<boolean>) & {
  controller: AlertDialogController<Payload, string>
}

export function createConfirm<Payload = ConfirmOptions>(): ConfirmHelper<Payload> {
  const controller = createAlertDialogController<Payload, string>()
  let queue: Promise<unknown> = Promise.resolve()

  const ask = (payload: Payload): Promise<boolean> => {
    const run = async () => {
      const result = await controller.open(payload)
      return result === 'confirm'
    }
    const next = queue.then(run, run)
    queue = next.catch(() => {})
    return next
  }

  return Object.assign(ask, { controller })
}

export function confirm(_options: ConfirmOptions): Promise<boolean> {
  return Promise.resolve(true)
}
