import { render } from "@solidjs/web"
import { describe, expect, it } from "vitest"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Calendar,
  CalendarGrid,
  CalendarHeading,
  CalendarNext,
  CalendarPrevious,
  CalendarWeekdays,
  CalendarWeeks,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  CarouselViewport,
  ColorPicker,
  ColorPickerInput,
  ColorPickerSwatch,
  ColorPickerSwatches,
  ColorPickerSwatchItem,
  createCalendarController,
  createCarouselController,
  createColorPickerController,
  createDateInputController,
  createDatePickerController,
  createImageCropperController,
  createResizableController,
  createScrollAreaController,
  createTimeInputController,
  createTimelineController,
  createWaterfallController,
  DateInput,
  DateInputSegment,
  DatePicker,
  DatePickerContent,
  DatePickerInput,
  DatePickerTrigger,
  ImageCropper,
  ImageCropperFlip,
  ImageCropperRotate,
  ImageCropperSelection,
  ImageCropperViewport,
  Preferences,
  Resizable,
  ResizableHandle,
  ResizablePanel,
  ScrollArea,
  ScrollAreaContent,
  ScrollAreaViewport,
  TimeInput,
  TimeInputSegment,
  Timeline,
  TimelineItem,
  TimelineTitle,
  usePreference,
  visibleWaterfallRows,
  Waterfall,
  WaterfallBar,
  WaterfallCell,
  WaterfallRow,
  WaterfallRowHeader,
} from "../src/index"

function mount(fn: () => any) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const dispose = render(fn, container)
  return {
    container,
    unmount() {
      dispose()
      container.remove()
    },
  }
}

describe("Phase 5 Specialized & Rich Interactive Components", () => {
  it("Avatar shows fallback before image loads", () => {
    const { container, unmount } = mount(() => (
      <Avatar>
        <AvatarImage src="https://example.com/a.png" alt="Alice" />
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>
    ))
    expect(container.textContent).toContain("AL")
    unmount()
  })

  it("Carousel navigates slides via controller", () => {
    const ctrl = createCarouselController()
    const { unmount } = mount(() => (
      <Carousel slideCount={3} loop controller={ctrl}>
        <CarouselViewport>
          <CarouselContent>
            <CarouselItem>One</CarouselItem>
            <CarouselItem>Two</CarouselItem>
            <CarouselItem>Three</CarouselItem>
          </CarouselContent>
        </CarouselViewport>
        <CarouselPrevious>Prev</CarouselPrevious>
        <CarouselNext>Next</CarouselNext>
      </Carousel>
    ))
    expect(ctrl.getPage()).toBe(0)
    ctrl.next()
    expect(ctrl.getPage()).toBe(1)
    ctrl.previous()
    ctrl.previous()
    expect(ctrl.getPage()).toBe(2)
    unmount()
  })

  it("Resizable updates and collapses panels", () => {
    const ctrl = createResizableController()
    const { unmount } = mount(() => (
      <Resizable defaultLayout={[40, 60]} controller={ctrl}>
        <ResizablePanel>Left</ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>Right</ResizablePanel>
      </Resizable>
    ))
    expect(ctrl.getLayout()).toEqual([40, 60])
    ctrl.collapse(0)
    expect(ctrl.getLayout()).toEqual([0, 100])
    unmount()
  })

  it("ScrollArea and Preferences work cleanly", () => {
    const scrollCtrl = createScrollAreaController()
    let themeGetter: (() => string) | undefined
    let themeSetter: ((v: string) => void) | undefined

    function Child() {
      const [theme, setTheme] = usePreference("theme", "light")
      themeGetter = theme
      themeSetter = setTheme
      return <span>{theme()}</span>
    }

    const { unmount } = mount(() => (
      <Preferences prefix="test:">
        <ScrollArea controller={scrollCtrl}>
          <ScrollAreaViewport>
            <ScrollAreaContent>
              <Child />
            </ScrollAreaContent>
          </ScrollAreaViewport>
        </ScrollArea>
      </Preferences>
    ))

    expect(themeGetter?.()).toBe("light")
    themeSetter?.("dark")
    expect(themeGetter?.()).toBe("dark")
    unmount()
  })

  it("Calendar, DateInput, TimeInput, and DatePicker manage ISO dates & times", () => {
    const calCtrl = createCalendarController()
    const diCtrl = createDateInputController()
    const tiCtrl = createTimeInputController()
    const dpCtrl = createDatePickerController()

    const { unmount } = mount(() => (
      <div>
        <Calendar defaultMonth="2026-05" controller={calCtrl}>
          <CalendarPrevious>Prev</CalendarPrevious>
          <CalendarHeading />
          <CalendarNext>Next</CalendarNext>
          <CalendarGrid>
            <CalendarWeekdays />
            <CalendarWeeks />
          </CalendarGrid>
        </Calendar>
        <DateInput defaultValue="2026-05-10" controller={diCtrl}>
          <DateInputSegment segment="year" />
          <DateInputSegment segment="month" />
          <DateInputSegment segment="day" />
        </DateInput>
        <TimeInput defaultValue="09:30" controller={tiCtrl}>
          <TimeInputSegment segment="hour" />
          <TimeInputSegment segment="minute" />
        </TimeInput>
        <DatePicker controller={dpCtrl}>
          <DatePickerInput />
          <DatePickerTrigger>Open</DatePickerTrigger>
          <DatePickerContent keepMounted>
            <CalendarGrid>
              <CalendarWeekdays />
              <CalendarWeeks />
            </CalendarGrid>
          </DatePickerContent>
        </DatePicker>
      </div>
    ))

    calCtrl.selectDate("2026-05-15")
    expect(calCtrl.getValue()).toBe("2026-05-15")
    calCtrl.nextMonth()
    expect(calCtrl.getMonth()).toBe("2026-06")

    expect(diCtrl.getValue()).toBe("2026-05-10")
    expect(tiCtrl.getValue()).toBe("09:30")

    dpCtrl.setValue("2026-06-01")
    expect(dpCtrl.getValue()).toBe("2026-06-01")
    unmount()
  })

  it("ColorPicker, ImageCropper, Timeline, and Waterfall work via controllers", () => {
    const colorCtrl = createColorPickerController()
    const cropCtrl = createImageCropperController()
    const tlCtrl = createTimelineController()
    const wfCtrl = createWaterfallController()

    const rows = visibleWaterfallRows(
      [{ id: "req", label: "GET /", start: 0, duration: 200, children: [{ id: "db", label: "SQL", start: 50, duration: 100 }] }],
      ["req"]
    )
    expect(rows.length).toBe(2)

    const { unmount } = mount(() => (
      <div>
        <ColorPicker defaultValue="#ff0000" controller={colorCtrl}>
          <ColorPickerSwatch />
          <ColorPickerInput />
          <ColorPickerSwatches>
            <ColorPickerSwatchItem value="#00ff00" />
          </ColorPickerSwatches>
        </ColorPicker>
        <ImageCropper controller={cropCtrl}>
          <ImageCropperViewport>
            <ImageCropperSelection />
          </ImageCropperViewport>
          <ImageCropperRotate>Rotate</ImageCropperRotate>
          <ImageCropperFlip direction="horizontal">Flip</ImageCropperFlip>
        </ImageCropper>
        <Timeline defaultActiveIndex={1} controller={tlCtrl}>
          <TimelineItem>
            <TimelineTitle>Step 1</TimelineTitle>
          </TimelineItem>
          <TimelineItem>
            <TimelineTitle>Step 2</TimelineTitle>
          </TimelineItem>
        </Timeline>
        <Waterfall min={0} max={200} controller={wfCtrl}>
          <WaterfallRow value="req" start={0} duration={200}>
            <WaterfallRowHeader>GET /</WaterfallRowHeader>
            <WaterfallCell>
              <WaterfallBar />
            </WaterfallCell>
          </WaterfallRow>
        </Waterfall>
      </div>
    ))

    colorCtrl.setValue("#00ff00")
    expect(colorCtrl.getValue()).toBe("#00ff00")

    cropCtrl.rotate(90)
    expect(cropCtrl.getRotation()).toBe(90)

    tlCtrl.setActiveIndex(0)
    expect(tlCtrl.getActiveIndex()).toBe(0)

    wfCtrl.setValue("req")
    expect(wfCtrl.getValue()).toBe("req")
    unmount()
  })
})
