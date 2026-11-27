import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  Field,
  FieldControl,
  FieldDescription,
  FieldError,
  FieldLabel,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsPanel,
  TabsTab,
} from '@subframe7536/ui'
import { createAgent } from '@subframe7536/ui/agent'
import { DatePicker, DatePickerInput, DatePickerTrigger } from '@subframe7536/ui/date-picker'
import { observe } from '@subframe7536/ui/observe'
import { createControlledSignal } from '@subframe7536/ui/primitive'

export function ConsumerSmoke() {
  const _checkAgent: typeof createAgent = createAgent
  const _checkObserve: typeof observe = observe
  const _checkSignal: typeof createControlledSignal = createControlledSignal
  void _checkAgent
  void _checkObserve
  void _checkSignal

  return (
    <div>
      <Button disabled={false}>Save</Button>
      <Checkbox defaultChecked name="agree" />
      <Field name="email" invalid={false}>
        <FieldLabel>Email</FieldLabel>
        <FieldControl type="email" required />
        <FieldDescription>Work email</FieldDescription>
        <FieldError>Required</FieldError>
      </Field>
      <Accordion defaultValue={['a']}>
        <AccordionItem value="a">
          <AccordionTrigger>Section A</AccordionTrigger>
          <AccordionPanel>Body A</AccordionPanel>
        </AccordionItem>
      </Accordion>
      <Dialog>
        <DialogTrigger>Open</DialogTrigger>
        <DialogContent>
          <DialogTitle>Confirm</DialogTitle>
        </DialogContent>
      </Dialog>
      <Select defaultValue="one">
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="one">One</SelectItem>
        </SelectContent>
      </Select>
      <Tabs defaultValue="t1">
        <TabsList>
          <TabsTab value="t1">Tab 1</TabsTab>
        </TabsList>
        <TabsPanel value="t1">Panel 1</TabsPanel>
      </Tabs>
      <DatePicker>
        <DatePickerInput />
        <DatePickerTrigger>Pick date</DatePickerTrigger>
      </DatePicker>
    </div>
  )
}
