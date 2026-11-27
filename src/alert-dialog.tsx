import {
  createDialogController,
  createDialogRoot,
  DialogBackdrop,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogShortcut,
  DialogTitle,
  DialogTrigger,
} from './dialog'
import type {
  DialogBackdropState,
  DialogCloseActionDetails,
  DialogCloseProps,
  DialogCloseState,
  DialogContentProps,
  DialogContentState,
  DialogController,
  DialogOpenChangeDetails,
  DialogOpenChangeReason,
  DialogOptions,
  DialogPayloadChangeReason,
  DialogProps,
  DialogShortcutProps,
  DialogShortcutState,
  DialogTriggerProps,
  DialogTriggerState,
} from './dialog'

export function createAlertDialogController<Payload = unknown, Result = string>() {
  return createDialogController<Payload, Result>()
}

export type AlertDialogController<Payload = unknown, Result = string> = DialogController<
  Payload,
  Result
>
export type AlertDialogOptions<Payload = unknown, Result = string> = DialogOptions<Payload, Result>
export type AlertDialogProps<Payload = unknown, Result = string> = DialogProps<Payload, Result>
export type AlertDialogOpenChangeReason = Exclude<DialogOpenChangeReason, 'outside-press'>
export type AlertDialogOpenChangeDetails = DialogOpenChangeDetails<AlertDialogOpenChangeReason>
export type AlertDialogPayloadChangeReason = DialogPayloadChangeReason
export type AlertDialogTriggerProps<Payload = unknown> = DialogTriggerProps<Payload>
export type AlertDialogTriggerState = DialogTriggerState
export type AlertDialogBackdropState = DialogBackdropState
export type AlertDialogContentProps = DialogContentProps
export type AlertDialogContentState<Payload = unknown> = DialogContentState<Payload>
export type AlertDialogCloseProps<Result = string> = DialogCloseProps<Result>
export type AlertDialogCloseState = DialogCloseState
export type AlertDialogCloseActionDetails = DialogCloseActionDetails
export type AlertDialogShortcutProps = DialogShortcutProps
export type AlertDialogShortcutState = DialogShortcutState

export const AlertDialog = createDialogRoot('alertdialog', false)
export const AlertDialogTrigger = DialogTrigger
export const AlertDialogBackdrop = DialogBackdrop
export const AlertDialogContent = DialogContent
export const AlertDialogTitle = DialogTitle
export const AlertDialogDescription = DialogDescription
export const AlertDialogClose = DialogClose
export const AlertDialogShortcut = DialogShortcut
