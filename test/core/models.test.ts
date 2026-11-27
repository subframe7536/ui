import { describe, expect, it } from 'vitest'

import { matchesDate, parseISOMonth, toISODate, toISOMonth } from '../../src/calendar'
import { formatFileSize, relativePath } from '../../src/file-input'
import { defaultListFilter, getMatchSegments } from '../../src/listbox'
import { paginationRange } from '../../src/pagination'
import { resizableStorageKey } from '../../src/resizable'
import { defaultCodec, fromText, toLabel, toText } from '../../src/token-input'
import {
  toggleTreeChecked,
  treeCheckedStates,
  treeFromPaths,
  visibleTreeRows,
} from '../../src/tree'

describe('core models migrated from ref/ui-sdk/packages/core/test', () => {
  describe('tree collection & checked states', () => {
    it('builds nested tree items from slash-delimited paths', () => {
      const items = treeFromPaths(['src/index.ts', 'src/utils/math.ts', 'README.md'])
      expect(items.map((i) => i.value)).toEqual(['src', 'README.md'])
      const src = items[0]!
      expect(src.children?.map((c) => c.value)).toEqual(['src/index.ts', 'src/utils'])
      expect(src.children?.[1]?.children?.map((c) => c.value)).toEqual(['src/utils/math.ts'])
    })

    it('computes visible rows according to expanded branches', () => {
      const items = treeFromPaths(['src/a.ts', 'src/b.ts', 'docs/guide.md'])
      const collapsed = visibleTreeRows(items, new Set())
      expect(collapsed.map((r) => r.value)).toEqual(['src', 'docs'])

      const expanded = visibleTreeRows(items, new Set(['src']))
      expect(expanded.map((r) => [r.value, r.depth])).toEqual([
        ['src', 0],
        ['src/a.ts', 1],
        ['src/b.ts', 1],
        ['docs', 0],
      ])
    })

    it('computes cascade checked states including indeterminate parents', () => {
      const items = treeFromPaths(['src/a.ts', 'src/b.ts'])
      const partial = treeCheckedStates(items, ['src/a.ts'], 'cascade')
      expect(partial.get('src')).toBe('indeterminate')
      expect(partial.get('src/a.ts')).toBe(true)
      expect(partial.get('src/b.ts')).toBe(false)

      const toggledAll = toggleTreeChecked(items, ['src/a.ts'], 'src', 'cascade')
      const full = treeCheckedStates(items, toggledAll, 'cascade')
      expect(full.get('src')).toBe(true)
      expect(full.get('src/a.ts')).toBe(true)
      expect(full.get('src/b.ts')).toBe(true)

      const cleared = toggleTreeChecked(items, toggledAll, 'src', 'cascade')
      const empty = treeCheckedStates(items, cleared, 'cascade')
      expect(empty.get('src')).toBe(false)
    })

    it('supports independent check strategy without cascading to children', () => {
      const items = treeFromPaths(['src/a.ts', 'src/b.ts'])
      const next = toggleTreeChecked(items, [], 'src', 'independent')
      const states = treeCheckedStates(items, next, 'independent')
      expect(states.get('src')).toBe(true)
      expect(states.get('src/a.ts')).toBe(false)
      expect(states.get('src/b.ts')).toBe(false)
    })
  })

  describe('token input model & codec', () => {
    it('serializes and deserializes text and tokens round-trip', () => {
      const plain = fromText('hello world')
      expect(plain).toEqual({ text: 'hello world', tokens: [] })
      expect(defaultCodec.serialize(plain)).toBe('hello world')
      expect(defaultCodec.deserialize('hello')).toEqual({ text: 'hello', tokens: [] })

      const withTokens = {
        text: 'draft',
        tokens: [
          { id: '1', kind: 'tag', value: 'bug', label: '#bug' },
          { id: '2', kind: 'user', value: 'ada', label: '' },
        ],
      }
      expect(toLabel(withTokens.tokens[0]!)).toBe('#bug')
      expect(toLabel(withTokens.tokens[1]!)).toBe('ada')
      expect(toText(withTokens)).toBe('#bug ada draft')
    })
  })

  describe('calendar date helpers', () => {
    it('formats and parses ISO dates and months', () => {
      expect(toISODate(new Date(2026, 9, 5))).toBe('2026-10-05')
      expect(toISOMonth(2026, 0)).toBe('2026-01')
      expect(toISOMonth(2026, 11)).toBe('2026-12')
      expect(parseISOMonth('2026-10')).toEqual({ year: 2026, monthIndex: 9 })
    })

    it('matches dates against string, range, predicate, and array matchers', () => {
      expect(matchesDate('2026-10-16', '2026-10-16')).toBe(true)
      expect(matchesDate('2026-10-16', '2026-10-17')).toBe(false)
      expect(matchesDate('2026-10-16', { from: '2026-10-10', to: '2026-10-20' })).toBe(true)
      expect(matchesDate('2026-10-25', { from: '2026-10-10', to: '2026-10-20' })).toBe(false)
      expect(matchesDate('2026-10-16', [(d) => d.endsWith('-16')])).toBe(true)
    })
  })

  describe('file helpers', () => {
    it('formats human-readable byte sizes and normalizes relative paths', () => {
      expect(formatFileSize(0)).toBe('0 B')
      expect(formatFileSize(512)).toBe('512 B')
      expect(formatFileSize(1536)).toBe('1.5 KB')
      expect(formatFileSize(1024 * 1024 * 2)).toBe('2.0 MB')
      expect(
        relativePath({
          name: 'a.txt',
          size: 10,
          type: 'text/plain',
          webkitRelativePath: 'folder/a.txt',
        }),
      ).toBe('folder/a.txt')
      expect(relativePath({ name: 'b.txt', size: 10, type: 'text/plain' })).toBe('b.txt')
    })
  })

  describe('pagination range calculation', () => {
    it('generates ellipses and boundary pages for large counts', () => {
      const mid = paginationRange({ page: 10, count: 20, siblingCount: 1, boundaryCount: 1 })
      expect(mid.map((item) => (item.type === 'page' ? item.page : item.key))).toEqual([
        1,
        'start-ellipsis',
        9,
        10,
        11,
        'end-ellipsis',
        20,
      ])
      expect(mid.find((item) => item.type === 'page' && item.current)).toEqual({
        type: 'page',
        page: 10,
        current: true,
      })
    })

    it('renders all pages without ellipses when count is small', () => {
      const small = paginationRange({ page: 2, count: 5 })
      expect(small.map((item) => (item.type === 'page' ? item.page : item.key))).toEqual([
        1, 2, 3, 4, 5,
      ])
    })
  })

  describe('list filtering & match highlighting', () => {
    it('matches case-insensitively across labels and keywords', () => {
      expect(defaultListFilter('Settings', 'set')).toBe(true)
      expect(defaultListFilter('Preferences', 'gear', ['gear', 'config'])).toBe(true)
      expect(defaultListFilter('Calendar', 'xyz')).toBe(false)
    })

    it('splits text into highlighted match segments', () => {
      expect(getMatchSegments('Reset settings', 'set')).toEqual([
        { text: 'Re', match: false },
        { text: 'set', match: true },
        { text: ' settings', match: false },
      ])
      expect(getMatchSegments('Calendar', '')).toEqual([{ text: 'Calendar', match: false }])
    })
  })

  describe('resizable storage key', () => {
    it('namespaces persistent layout storage keys', () => {
      expect(resizableStorageKey('editor')).toContain('editor')
    })
  })
})
