import { render } from '@solidjs/web'
import { flush } from 'solid-js'
import { afterEach, describe, expect, it } from 'vitest'

import { Avatar, AvatarFallback, AvatarImage } from '../../src/avatar'
import { DateInput, DateInputSegment } from '../../src/date-input'
import { FileInput, createFileInputController } from '../../src/file-input'
import type { FileRejection } from '../../src/file-input'
import { Resizable, ResizableHandle, ResizablePanel } from '../../src/resizable'
import { ScrollArea, ScrollAreaScrollbar, ScrollAreaViewport } from '../../src/scroll-area'
import { Separator } from '../../src/separator'
import { TimeInput, TimeInputSegment } from '../../src/time-input'
import { Timeline, TimelineItem } from '../../src/timeline'

let disposers: Array<() => void> = []

function mount(fn: () => any) {
  const root = document.createElement('div')
  document.body.append(root)
  const dispose = render(fn, root)
  flush()
  disposers.push(() => {
    dispose()
    root.remove()
  })
  return root
}

afterEach(() => {
  for (const dispose of disposers) {
    dispose()
  }
  disposers = []
  document.body.innerHTML = ''
})

describe('core specialized components migrated from ref/ui-sdk/packages/core/test', () => {
  it('file input validates accept, maxSize, minSize, duplicates, and supports remove/clear', () => {
    const ctrl = createFileInputController()
    const rejectedList: Array<FileRejection> = []
    mount(() => (
      <FileInput
        controller={ctrl}
        accept={['.txt']}
        maxSize={10}
        minSize={2}
        onReject={(list) => rejectedList.push(...list)}
      />
    ))

    const good = new File(['hello'], 'notes.txt', { type: 'text/plain' })
    const wrongType = new File(['hello'], 'pic.png', { type: 'image/png' })
    const tooLarge = new File(['0123456789abcdef'], 'big.txt', { type: 'text/plain' })
    const tooSmall = new File(['a'], 'tiny.txt', { type: 'text/plain' })

    const res = ctrl.addFiles([good, wrongType, tooLarge, tooSmall])
    flush()
    expect(res.accepted.map((f) => f.name)).toEqual(['notes.txt'])
    expect(rejectedList.map((r) => [r.file.name, r.reasons])).toEqual([
      ['pic.png', ['type']],
      ['big.txt', ['too-large']],
      ['tiny.txt', ['too-small']],
    ])

    const dup = ctrl.addFiles([good])
    flush()
    expect(dup.rejected[0]?.reasons).toEqual(['duplicate'])

    ctrl.removeFile(good)
    flush()
    expect(ctrl.getFiles()).toHaveLength(0)

    ctrl.setFiles([good])
    flush()
    expect(ctrl.getFiles()).toHaveLength(1)
    ctrl.clear()
    flush()
    expect(ctrl.getFiles()).toHaveLength(0)
  })

  it('date input and time input step segments via keyboard arrows', () => {
    const dates: Array<string | null> = []
    const times: Array<string | null> = []
    const root = mount(() => (
      <>
        <DateInput defaultValue="2026-10-15" onValueChange={(v) => dates.push(v)}>
          <DateInputSegment segment="year" />
          <DateInputSegment segment="month" />
          <DateInputSegment segment="day" />
        </DateInput>
        <TimeInput defaultValue="09:30" onValueChange={(v) => times.push(v)}>
          <TimeInputSegment segment="hour" />
          <TimeInputSegment segment="minute" />
        </TimeInput>
      </>
    ))

    const spins = root.querySelectorAll<HTMLElement>('[role="spinbutton"]')
    expect(spins).toHaveLength(5)
    spins[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    flush()
    expect(dates.at(-1)).toBe('2026-10-16')

    spins[4]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    flush()
    expect(times.at(-1)).toBe('09:31')
  })

  it('resizable exposes separator role and updates layout on arrow keys', () => {
    const layouts: Array<Array<number>> = []
    const root = mount(() => (
      <Resizable onLayoutChange={(next) => layouts.push([...next])}>
        <ResizablePanel defaultSize={50}>Left</ResizablePanel>
        <ResizableHandle aria-label="Resize" />
        <ResizablePanel defaultSize={50}>Right</ResizablePanel>
      </Resizable>
    ))

    const handle = root.querySelector<HTMLElement>('[role="separator"]')!
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    flush()
    expect(layouts.length).toBeGreaterThan(0)
    expect(layouts.at(-1)![0]!).toBeGreaterThan(50)
  })

  it('separator, avatar, scroll area, and timeline render semantic roles and states', () => {
    const root = mount(() => (
      <>
        <Separator orientation="vertical" />
        <Avatar>
          <AvatarImage src="/avatar.png" alt="Ada" />
          <AvatarFallback>AL</AvatarFallback>
        </Avatar>
        <ScrollArea>
          <ScrollAreaViewport>Content</ScrollAreaViewport>
          <ScrollAreaScrollbar orientation="vertical" />
        </ScrollArea>
        <Timeline>
          <TimelineItem status="complete">Created</TimelineItem>
          <TimelineItem status="current">In progress</TimelineItem>
        </Timeline>
      </>
    ))

    const sep = root.querySelector('[role="separator"]')!
    expect(sep.getAttribute('aria-orientation')).toBe('vertical')
    expect(root.textContent).toContain('AL')
    expect(root.textContent).toContain('Created')
    expect(root.textContent).toContain('In progress')
  })
})
