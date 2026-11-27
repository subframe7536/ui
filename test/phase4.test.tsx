import { render } from "@solidjs/web"
import { describe, expect, it, vi } from "vitest"
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxContent,
  ComboboxCreate,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
  createAutocompleteController,
  createComboboxController,
  createCommandController,
  createListboxController,
  createPaginationController,
  createSelectController,
  createTreeController,
  Listbox,
  ListboxItem,
  ListboxItemIndicator,
  Pagination,
  PaginationEllipsis,
  PaginationFirst,
  PaginationItem,
  PaginationLast,
  PaginationLink,
  PaginationList,
  PaginationNext,
  PaginationPrevious,
  paginationRange,
  Select,
  SelectContent,
  SelectItem,
  SelectItemText,
  SelectList,
  SelectTrigger,
  SelectValue,
  toggleTreeChecked,
  Tree,
  treeCheckedStates,
  treeFromPaths,
  TreeItems,
  visibleTreeRows,
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

describe("Phase 4 Lists, Combobox, Command, Tree & Pagination", () => {
  it("Listbox selects single and multiple options", () => {
    const ctrl = createListboxController<string>()
    const { container, unmount } = mount(() => (
      <Listbox multiple defaultValue={["a"]} controller={ctrl}>
        <ListboxItem value="a">
          Alpha <ListboxItemIndicator>*</ListboxItemIndicator>
        </ListboxItem>
        <ListboxItem value="b">
          Beta <ListboxItemIndicator>*</ListboxItemIndicator>
        </ListboxItem>
      </Listbox>
    ))

    expect(ctrl.getValue()).toEqual(["a"])
    ctrl.toggle("b")
    expect(ctrl.getValue()).toEqual(["a", "b"])
    expect(container.querySelectorAll('[role="option"][aria-selected="true"]').length).toBe(2)
    unmount()
  })

  it("Select opens, selects an item, and updates trigger value", () => {
    const ctrl = createSelectController<string>()
    const { unmount } = mount(() => (
      <Select placeholder="Pick fruit" controller={ctrl}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent keepMounted>
          <SelectList>
            <SelectItem value="apple" label="Apple">
              <SelectItemText>Apple</SelectItemText>
            </SelectItem>
            <SelectItem value="pear" label="Pear">
              <SelectItemText>Pear</SelectItemText>
            </SelectItem>
          </SelectList>
        </SelectContent>
      </Select>
    ))

    ctrl.open()
    expect(ctrl.isOpen()).toBe(true)
    ctrl.select("apple")
    expect(ctrl.getValue()).toBe("apple")
    expect(ctrl.isOpen()).toBe(false)
    unmount()
  })

  it("Combobox filters, selects chips, and supports creatable items", () => {
    const ctrl = createComboboxController<string>()
    const onCreate = vi.fn()
    const { unmount } = mount(() => (
      <Combobox multiple creatable onCreate={onCreate} controller={ctrl}>
        <ComboboxChips>
          <ComboboxChip value="ts" label="TypeScript">
            TypeScript <ComboboxChipRemove>x</ComboboxChipRemove>
          </ComboboxChip>
        </ComboboxChips>
        <ComboboxInput />
        <ComboboxContent keepMounted>
          <ComboboxList>
            <ComboboxItem value="ts" label="TypeScript">TypeScript</ComboboxItem>
            <ComboboxItem value="solid" label="SolidJS">SolidJS</ComboboxItem>
            <ComboboxCreate>Create</ComboboxCreate>
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    ))

    ctrl.select("solid")
    expect(ctrl.getValue()).toEqual(["solid"])
    ctrl.remove("solid")
    expect(ctrl.getValue()).toEqual([])
    unmount()
  })

  it("Autocomplete updates text value and opens suggestions", () => {
    const ctrl = createAutocompleteController()
    const { unmount } = mount(() => (
      <Autocomplete controller={ctrl}>
        <AutocompleteInput />
        <AutocompleteContent keepMounted>
          <AutocompleteList>
            <AutocompleteItem value="tokyo" label="Tokyo">Tokyo</AutocompleteItem>
            <AutocompleteItem value="toronto" label="Toronto">Toronto</AutocompleteItem>
          </AutocompleteList>
        </AutocompleteContent>
      </Autocomplete>
    ))

    ctrl.setValue("tok")
    expect(ctrl.getValue()).toBe("tok")
    ctrl.open()
    expect(ctrl.isOpen()).toBe(true)
    unmount()
  })

  it("Command manages pages, query, and selection callbacks", () => {
    const ctrl = createCommandController()
    const onSelect = vi.fn()
    const { unmount } = mount(() => (
      <Command onSelect={onSelect} controller={ctrl}>
        <CommandInput />
        <CommandList>
          <CommandItem value="theme" label="Toggle Theme">
            Toggle Theme <CommandShortcut keys={["Cmd", "K"]} />
          </CommandItem>
        </CommandList>
      </Command>
    ))

    ctrl.pushPage("settings")
    expect(ctrl.getPages()).toEqual(["settings"])
    ctrl.popPage()
    expect(ctrl.getPages()).toEqual([])
    ctrl.highlight("theme")
    ctrl.selectHighlighted()
    expect(onSelect).toHaveBeenCalledTimes(1)
    unmount()
  })

  it("Tree helpers and controller handle paths, expansion, and cascade checks", () => {
    const items = treeFromPaths(["src/index.ts", "src/utils/math.ts"])
    expect(items.length).toBe(1)
    expect(visibleTreeRows(items, []).length).toBe(1)
    expect(visibleTreeRows(items, ["src"]).length).toBe(3)

    const checked = toggleTreeChecked(items, [], "src")
    const states = treeCheckedStates(items, checked)
    expect(states.get("src")).toBe(true)
    expect(states.get("src/index.ts")).toBe(true)

    const ctrl = createTreeController<string>()
    const { unmount } = mount(() => (
      <Tree items={items} controller={ctrl}>
        <TreeItems />
      </Tree>
    ))

    ctrl.expand("src")
    expect(ctrl.getExpanded()).toEqual(["src"])
    ctrl.collapseAll()
    expect(ctrl.getExpanded()).toEqual([])
    unmount()
  })

  it("Pagination computes ranges and navigates pages", () => {
    const range = paginationRange({ page: 5, count: 10 })
    expect(range.some((r) => r.type === "ellipsis")).toBe(true)

    const ctrl = createPaginationController()
    const { unmount } = mount(() => (
      <Pagination count={10} defaultPage={2} controller={ctrl}>
        <PaginationList>
          <PaginationItem>
            <PaginationFirst>First</PaginationFirst>
          </PaginationItem>
          <PaginationItem>
            <PaginationPrevious>Prev</PaginationPrevious>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink page={2} />
          </PaginationItem>
          <PaginationItem>
            <PaginationEllipsis />
          </PaginationItem>
          <PaginationItem>
            <PaginationNext>Next</PaginationNext>
          </PaginationItem>
          <PaginationItem>
            <PaginationLast>Last</PaginationLast>
          </PaginationItem>
        </PaginationList>
      </Pagination>
    ))

    ctrl.next()
    expect(ctrl.getPage()).toBe(3)
    ctrl.last()
    expect(ctrl.getPage()).toBe(10)
    ctrl.first()
    expect(ctrl.getPage()).toBe(1)
    unmount()
  })
})
