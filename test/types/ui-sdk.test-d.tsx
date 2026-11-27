import type { JSX } from '@solidjs/web'

import {
  AlertDialog,
  AlertDialogContent,
  Button,
  Dialog,
  DialogContent,
  Drawer,
  DrawerContent,
  HoverCard,
  HoverCardContent,
  Menu,
  MenuContent,
  Popover,
  PopoverContent,
  Tooltip,
  TooltipContent,
} from '../../src'

declare const onButtonClick: JSX.EventHandler<HTMLButtonElement, MouseEvent>

const typedButton = <Button onClick={onButtonClick}>Save</Button>
const wrongButtonEvent = (
  // @ts-expect-error A press is a mouse event, not a keyboard one.
  <Button onClick={(event: KeyboardEvent) => event.key}>Save</Button>
)

type Day = { count: number }

const tooltip = (
  <Tooltip>
    <TooltipContent<Day>>
      {(state) => {
        const count: number | undefined = state.payload?.count
        // @ts-expect-error A day has no `name`.
        const wrong = state.payload?.name
        return `${count}${wrong}`
      }}
    </TooltipContent>
  </Tooltip>
)

const popover = (
  <Popover>
    <PopoverContent<Day> class={(state) => (state.payload?.count ? 'busy' : '')} />
  </Popover>
)

const others = [
  <HoverCard>
    <HoverCardContent<Day>>{(state) => state.payload?.count}</HoverCardContent>
  </HoverCard>,
  <Dialog>
    <DialogContent<Day>>{(state) => state.payload?.count}</DialogContent>
  </Dialog>,
  <AlertDialog>
    <AlertDialogContent<Day>>{(state) => state.payload?.count}</AlertDialogContent>
  </AlertDialog>,
  <Drawer>
    <DrawerContent<Day>>{(state) => state.payload?.count}</DrawerContent>
  </Drawer>,
  <Menu>
    <MenuContent<Day>>{(state) => state.payload?.count}</MenuContent>
  </Menu>,
]

export { others, popover, tooltip, typedButton, wrongButtonEvent }
