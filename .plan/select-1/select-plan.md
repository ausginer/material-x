# mx-select — plan

**Status: proposed, with four questions for the owner ([below](#questions-for-the-owner)).** Written by an architect on 2026-11-27, on the coordinator's task for [#334](https://github.com/ausginer/material-x/issues/334), on `material-x/select-1` from `origin/main` at `e7fa0d5f8`. Nothing is minted yet: [the last section](#proposed-record-entries) proposes one decision entry, to be minted on the owner's answers. The labels `SE-…` are local to this plan.

**The unit:** two elements, `mx-select` and its option `mx-option`, filled and outlined, with a single value. The select's menu is a popover listbox in its own shadow tree. No `mx-menu` is published ([`SE-D11`](#se-d11--what-goes-where)).

## The answer in short

- **The host is the combobox** (`SE-D1`). Its `ElementInternals` carry the role, the states and the active option, and the listbox is a popover in its shadow tree over the slotted options. In Chromium, Firefox and WebKit this gives one named node from a host `aria-label`, a `<label for>`, a wrapping `<label>` and the label slot ([reading](checks/tree.txt)). A combobox inside the shadow tree leaves the host as a second node, which is `RF-94`.
- **The select is controlled** (`SE-D3`, Q1): choosing an option fires `input` and `change` at that `mx-option`, and the select shows what the consumer then sets as `value`. **The menu's open state is the select's own** (`SE-D4`, Q2).
- **The popup is the platform's** (`SE-D5`): `popover="auto"` for the top layer, light dismiss and `Escape`, and CSS anchor positioning for the place, flips and scroll tracking, with no positioning script. Each feature is Baseline, and each behavior was read in the three engines ([`popup.txt`](checks/popup.txt), [`placement.txt`](checks/placement.txt)).
- **The field is the text field's,** its styles shared and its class not (`SE-D9`). `TextFieldCore` is built around a native `<input>`, and the select's control is its host.
- **The select's token sets cover its menu** (`SE-D10`, Q4). No `md.comp.menu` set is needed first.
- **Nothing goes into `@ydinjs/core` in this unit** (`SE-D11`). A typeahead matcher and an active-descendant navigator are core's when a second consumer exists.
- **One implementation unit, then one documentation unit** ([Units](#units-and-order)).

## Inputs

`repo:RD-20`, `RD-24`, `RD-47`, `RD-52`, `RD-55`, `RF-50`, `RF-94`, `RF-119`, `RF-120`; `CONTRIBUTING.md` (Part I _Language and platform_, _Parent and child components_, _Shadow tree structure_; Part II §1, §2, §4, §15); `architecture.md` §Components; `accessibility.md`; `test-architecture.md` §Engines in development and in review; core's `element.ts`, `useARIA.ts`, `useRovingTabindex.ts` and the traits `Valuable`, `Disableable`, `Validatable`, `Nameable`; material-x's `TextFieldCore.ts`, its template and styles, `ListItemCore.ts`, `ListInteractiveItemCore.ts`, `CheckableCore.ts`, `split-button.ts`; the token sets `md.comp.filled-select`, `md.comp.outlined-select`, `md.comp.filled-autocomplete`, `md.comp.outlined-autocomplete`, `md.comp.filled-text-field`, `md.comp.outlined-text-field`, read through the store's reader; the slider plan's probe harness for the accessibility trees. The WAI-ARIA Authoring Practices' _select-only combobox_ is the keyboard model.

**Platform status, read 2026-11-27.** CSS anchor positioning became Baseline with Firefox 147 on 2026-01-13 ([web.dev, January 2026](https://web.dev/blog/web-platform-01-2026); [Firefox 147 notes](https://developer.mozilla.org/en-US/Firefox/Releases/147)). The popover API and `@starting-style` are Baseline 2024, and ARIA element reflection Baseline 2025 ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/ariaActiveDescendantElement)). Customizable `<select>` (`appearance: base-select`) is in Chrome 135 and Safari 27 and isn't Baseline ([WWDC 2026 session 315](https://developer.apple.com/videos/play/wwdc2026/315/)). The readings below check each property the plan relies on, not only these tables.

## Readings

Run on 2026-11-27 in Playwright 1.65's Chromium 158, Firefox 159 and WebKit 27.2, on Linux, headless, at 800 × 600. The probes are standalone pages with minimal elements, because no select exists. They ran from a copy beside a worktree with the repository's installed dependencies, and import nothing of the repository's.

| Probe | Reading |
| --- | --- |
| [`popup.ts`](probes/popup.ts) | [`popup.txt`](checks/popup.txt) — a popover listbox in a shadow root anchored to a field of the same shadow root: two selects side by side, clipping and transformed ancestors, scroll, resize, light dismiss, `Escape`, focus, `showPopover({ source })`; and `position-try-order: most-block-size` |
| [`placement.ts`](probes/placement.ts) | [`placement.txt`](checks/placement.txt) — five ways to write the place, flipped in both axes and shrunk, in an LTR document with RTL selects and in an RTL document; the order of a press on the field against light dismiss |
| [`tree.ts`](probes/tree.ts) | [`tree.txt`](checks/tree.txt) — each engine's own accessibility tree, closed and open: the host as the combobox and a shadow combobox, named four ways; the value Chromium computes; label activation |
| [`disabled.ts`](probes/disabled.ts) | [`disabled.txt`](checks/disabled.txt) — a form-associated host with `tabindex="0"`, disabled by its own attribute and by a fieldset: focus, Tab, pointer and keys |

What they establish, in the three engines unless an engine is named:

1. **A fixed anchor name stays in its shadow tree.** `anchor-name: --field` and `position-anchor: --field` in one shadow root place each of two selects' menus under its own field (`popup.txt`, `a` and `b`).
2. **The top layer escapes clipping.** A menu inside an `overflow: hidden` ancestor with a `transform` is drawn whole and takes the hit (`d`).
3. **The place follows the page's scroll and the viewport's size,** with no script (`a after page scroll 30`, `after resize`).
4. **`position-area: block-end span-inline-end` with `position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline` and a last `@position-try` that sets `max-block-size: 100%`** opens below when the menu fits, flips above when it fits only there, shrinks and scrolls below when it fits neither, aligns the start edges, and flips to the end edges at the inline end (`placement.txt`, `P1`).
5. **`position-try-order: most-block-size` is wrong for a select.** In Chromium and Firefox it opens above whenever there is more room above, even when the menu fits below (`popup.txt`, `g` and `h`). WebKit ignores it (`c`).
6. **In an RTL document the logical form is right,** as in 4, mirrored (`placement.txt`, _document rtl_). **An RTL select in an LTR document:** Chromium and WebKit align the logical form by the document's direction, and align the physical form chosen by `:host(:dir(rtl))` by the select's (`P3`). Firefox places the menu wrong with every form, off the viewport in one case (`P1` to `P5`, `f`, `h`, `j`), and an LTR menu box doesn't change that (`P4`, `P5`).
7. **Light dismiss closes the menu on a press on its own field,** with or without `showPopover({ source })`, which each engine reads (`popup.txt`). At `pointerdown` the popover is still open. At `click` it is closed: in Chromium it closes between `pointerup` and `click`, and in Firefox and WebKit before the host's capturing `pointerup` listener (`placement.txt`, the _press_ lines).
8. **`Escape` closes the menu and keeps focus on the host.** A press outside closes it and focus goes to `body` (`popup.txt`).
9. **The host as the combobox is one node, named by each source.** Host `aria-label`, `<label for>`, a wrapping `<label>`, or `internals.ariaLabelledByElements` set to the slotted label. Its parent is the form or the label, with no `generic` or `group` between. While open, the listbox's parent is the combobox, and the option's is the listbox, selected (`tree.txt`, `c0` to `c3`).
10. **A combobox in the shadow tree leaves the host as a second node,** `generic` in Chromium and `group` in WebKit (`c4`, `c5`), as `RF-94` reads for the other elements.
11. **The active option reaches the tree from the host's internals.** `internals.ariaActiveDescendantElement` set to a light-DOM option is the combobox's active descendant in Chromium's and WebKit's trees. Firefox's harness doesn't expose relations, so there it isn't read.
12. **Chromium builds a non-editable combobox's value from its content.** With the label slotted, the value is `N3Banana`. Open, it is `Banana Banana`: the field's text and the selected option. With the label's wrapper `aria-hidden`, the closed value is `Banana`. With the field's text `aria-hidden` too, the closed value is empty and the open one `Banana` (`c3`, `c6`, `c7`). The other two harnesses don't expose a value.
13. **A label's activation focuses the host and fires `click` at it** (`tree.txt`, _label activation_).
14. **A disabled form-associated host isn't focusable.** With its own `disabled` or in a `<fieldset disabled>`, it matches `:disabled`, `focus()` and Tab skip it, a click dispatches only `pointerdown`, and `formDisabledCallback` is called with `true` (`disabled.txt`). The platform does this with no code of the component's, so `RF-119` doesn't reach the select.

## SE-D1 — The host is the combobox

**Decision.** `mx-select`'s host is its accessible control and its focus target. Its `ElementInternals` set the role `combobox`, `ariaHasPopup` `listbox`, `ariaExpanded`, and `ariaActiveDescendantElement` while the menu is open. The host has `tabindex="0"`, which the select writes where the consumer hasn't set one, as `mx-sortable-list`'s items do. The shadow tree holds the field's parts and a `<div role="listbox" popover>` with a default `<slot>` for the options.

This is `architecture.md`'s exception _the host is the box_: no native element in the shadow tree has the behavior the select needs, so there is no `.host` and no part `impl`. The field's layout is already on `:host` in the text field's styles (`SE-D9`).

**Why.**

- **One node, named by every source the consumer can write** (readings 9 and 10). The question `RF-94` leaves open for the other controls doesn't arise: there is no inner control to name.
- **The platform disables it** (reading 14): a disabled fieldset takes its focus and its clicks, which `RF-119` says no other control does today.
- **There is no native control to keep.** A native `<select>` in the shadow tree can't list slotted options, and its customizable form isn't Baseline. A shadow `<button>` would bring back the second node and gives nothing the host doesn't: activation is written by hand either way, because `Space` and `Enter` choose an option while the menu is open.

**Not adopted:**

- **A shadow element as the combobox** with `delegatesFocus` and mirrored `aria-*`: the second node (reading 10), and a `<label for>` that names nothing (`RF-94`).
- **A native `<select>` in the light DOM, slotted:** the consumer writes the control, unlike every other component, and its picker can't be styled in two of the three engines.

## SE-D2 — The public surface

### `mx-select`

| Attribute and property | Type                       | Absent                |
| ---------------------- | -------------------------- | --------------------- |
| `value`                | string                     | no option is selected |
| `outlined`             | boolean                    | filled                |
| `name`, `disabled`     | as the other form controls | —                     |
| `error`, `required`    | core's `Validatable`       | —                     |

| Slot      | Content                                          |
| --------- | ------------------------------------------------ |
| `label`   | the label, which floats as the text field's does |
| `lead`    | a leading icon                                   |
| `support` | supporting text, and the error message           |
| default   | the `mx-option` elements                         |

- **Custom states:** `:state(populated)` while an option is selected, `:state(open)` while the menu is open, `:state(outlined)` and `:state(error)` as on the text field.
- **Events:** `input` and `change` at the chosen option (`SE-D3`), and `invalid` from `Validatable`. No event for opening and closing.
- **Methods and properties:** `Validatable`'s, and nothing else. No `options`, `selectedIndex`, `selectedOption` or `showPicker()`: a consumer that renders the options and sets `value` has each of them already (`CONTRIBUTING.md` §4's test).
- **CSS custom properties:** the field's are the text field's `--md-text-field-*` that apply to a field without an input, under the same names, because the field is one shared component ([`SE-D9`](#se-d9--the-field-is-the-text-fields)). The menu adds `--md-select-menu-max-block-size`, the bound below the space available. Its default is none.
- **Parts:** `field` on the value's text, `label`, `support`, `menu` on the listbox. There is no `impl`.
- **No inline size of its own,** as the text field has none. A value longer than the field is cut with an ellipsis.

### `mx-option`

| Attribute and property | Type | Absent |
| --- | --- | --- |
| `value` | string | its label's text, as a native `<option>`'s |
| `disabled` | boolean | enabled |

| Slot | Content |
| --- | --- |
| default | the label. Its text is what the field shows and what typeahead matches |
| `lead`, `trail` | icons, or trailing text such as a shortcut |

- **Its host is its box and its node:** the role `option` and `aria-selected` through its internals, `aria-disabled` while disabled. It takes no focus.
- **Custom states, set by the select:** `:state(selected)` for the option whose value is the select's, and `:state(active)` for the keyboard's position while the menu is open.
- **It dispatches the select's `input` and `change`** (`SE-D3`). It has no event of its own.

**The name `mx-option` is Q3.** The plan recommends it over `mx-select-option`, because a later listbox, such as an autocomplete's, has the same element.

## SE-D3 — The value and the selection

**Decision, if Q1 is answered (a): the select is controlled,** as `architecture.md` §Components states for every component but the text fields and the slider.

- **`value` is the consumer's.** The selected option is the first `mx-option` whose `value` equals it. The field shows that option's label, `:state(populated)` follows, and so do `aria-selected` and `:state(selected)`. A `value` that no option has selects none, and the field is empty.
- **Choosing an option changes no state.** It fires, at that `mx-option`, `input` and then `change`, both plain `Event`s (`RD-52`), both bubbling, `input` composed and `change` not, as a native select's, and neither cancelable. The consumer reads `event.target.value` and sets the select's `value`. Choosing the selected option fires nothing, as on a native select.
- **The options are the `mx-option` elements assigned to the default slot,** as a native select's are its children. The select follows an option that is added, removed or reordered, and an option's `value`, `disabled` or label text that changes, before the next rendering. How it observes them is the implementer's, within `CONTRIBUTING.md`'s rule for parent and child components.
- **Single selection only.** A multiple select is out of scope ([below](#out-of-scope)).

**Why events at the option.** The event has to name the chosen option, and the controlled select can't hold it as its value. The option as the target carries it with no event class (`RD-52` property 1) and no new vocabulary. The roving radio group already dispatches its selection at the item.

## SE-D4 — The menu's open state is the select's own

**Decision, if Q2 is answered (a).** The menu opens and closes on the user's input and changes no consumer state: `:state(open)` and `aria-expanded` follow it, and no attribute or property sets it.

**Why.** The platform closes an `auto` popover by itself, on light dismiss, `Escape`, a close request on Android, or another `auto` popover opening, and the `beforetoggle` event can't cancel a close. A controlled `open` would need a `manual` popover and every one of those behaviors written by hand, for a state nothing outside the select reads. A native `<select>`'s picker has no such property either. The split button's `open` is the consumer's because its menu is the consumer's element. Here the menu is the select's own part.

**If Q2 is answered (b),** `open` is a boolean attribute that only the consumer sets, the select fires `toggle`-like plain events for each request, and `SE-D5`'s popover becomes `manual` with light dismiss, `Escape` and focus loss written in the select. That adds code and a public event, and isn't recommended.

## SE-D5 — The popup layer

**Decision.**

- **The listbox is `popover="auto"`** in the select's shadow tree. It is in the top layer while open, so no ancestor's overflow, `transform` or stacking context clips or covers it (reading 2). Opening one select's menu closes another's.
- **It is anchored to the field's container** by `anchor-name` and `position-anchor`, both in the select's shadow tree, under one fixed name (reading 1). The anchor is the container row, not the host, so the menu opens below the field and not below the supporting text.
- **Its place** is `position-area: block-end span-inline-end` with `position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline` and a last `@position-try` that shrinks it below with `max-block-size: 100%` (reading 4). Under `:host(:dir(rtl))` the area is the physical one for that direction (reading 6). Its inline size is at least the field's, by `anchor-size(width)`, and grows with the widest option.
- **When the menu fits neither below nor above,** it is shrunk below and scrolls. A shrunk menu that would show fewer than three options goes above, shrunk there, when there is more room above. The implementer reads this with two `@position-try` rules, one per side, each with a minimum block size, because `position-try-order` can't do it (reading 5). If no form holds it in an engine, that is the [stopping boundary](#stopping-boundary).
- **Scroll and resize** move the menu with its field, with no listener (reading 3). The menu stays open while the page scrolls. When its field is scrolled out of a clipping container's view, the menu isn't drawn detached from it: `position-visibility: anchors-visible`, read by the implementation's rows.
- **Motion:** the menu fades and grows from its edge at the field over M3's expressive fast spatial motion, entering by `@starting-style` and leaving by `transition-behavior: allow-discrete` on `display` and `overlay`, all Baseline. With `prefers-reduced-motion: reduce` it has no duration. The select's token sets have no motion, so the values come from `md.sys.motion` and their provenance is in the spec file.
- **No positioning script, and no fallback for an engine.** Every feature above is in `RD-20`'s floor.

**Costs, accepted:**

- **An RTL select in an LTR document, in Firefox,** has its menu placed wrong, and off the viewport near the left edge (reading 6). Chromium and WebKit place it right. A page whose own direction is RTL is right in the three engines. It is a `[Docs]` limit in `accessibility.md`'s section and in the component page. A row reads it in Firefox and fails when the defect is fixed, so the limit is removed then.
- **A press on the field of an open menu** is closed by light dismiss before `click` in every engine (reading 7), so the select remembers at `pointerdown` that the menu was open, and its `click` doesn't open it again. This is the one press the select interprets.

**Not adopted:**

- **A positioning library or the select's own script,** such as Floating UI: bytes and listeners for what the platform does in each engine of the floor.
- **`position-try-order: most-block-size`:** reading 5.
- **A `manual` popover:** `SE-D4`.
- **`showPopover({ source })`:** it doesn't keep light dismiss from closing the menu on its field (reading 7), and nothing else here needs it.

## SE-D6 — Accessibility

The pattern is the ARIA Authoring Practices' select-only combobox: focus stays on the combobox, and the active option is its active descendant.

- **Role and states** on the host, through its internals (`SE-D1`): `combobox`, `aria-haspopup="listbox"`, `aria-expanded`, the active option as `ariaActiveDescendantElement` while open and none while closed. `required` and `error` reach the combobox as `aria-required` and `aria-invalid` through its internals, and the host's attributes stay the consumer's.
- **Name, in this order:** a host `aria-labelledby`, a host `aria-label`, the `label` slot, a `<label>` (reading 9). The slot names it through `internals.ariaLabelledByElements` set to the slotted elements, only while the host has neither attribute: an internals `ariaLabelledByElements` is the default for `aria-labelledby`, which the name computation takes before a host `aria-label`. That is by the computation's order, not read, and a row reads it.
- **Description:** the `support` slot, through `internals.ariaDescribedByElements`, while the host has no `aria-describedby`.
- **Value:** the combobox's accessible value is the selected option's label, closed and open, and holds neither the label, the supporting text nor a second copy (reading 12). The shadow wrappers of the label and the supporting text are `aria-hidden`, and so is the field's text while the menu is open. Read in Chromium, whose harness exposes values.
- **Options:** each is an `option` inside the `listbox`, `aria-selected` on the selected one, `aria-disabled` on a disabled one. Position and size come from the tree. Only Chromium's are read.
- **Announcement** comes from the active descendant: moving it announces the option. No live region.
- **Focus:** the host takes it, from Tab, a script, a press, or its label (reading 13). Opening, navigating and choosing keep it on the host. The options take none. A focus indicator is drawn on the field, as the text field draws it, and the active option draws M3's focus state layer.
- **Disabled:** the host's `disabled` or a disabled fieldset removes it from the tab order and from the pointer, with no code (reading 14). An open menu closes when the select becomes disabled.

## SE-D7 — Keyboard and pointer

**Closed**, with focus on the select:

| Key | Does |
| --- | --- |
| `ArrowDown`, `ArrowUp`, `Enter`, `Space`, `Alt+ArrowDown` | opens, with the selected option active, or the first enabled one |
| `Home`, `End` | opens, with the first or the last enabled option active |
| a printable character | opens, with the typeahead's match active |
| anything else, `Escape` and `Tab` included | nothing, and the event goes on |

**Open:**

| Key | Does |
| --- | --- |
| `ArrowDown`, `ArrowUp` | the next or previous enabled option is active; no wrap |
| `Home`, `End` | the first or last enabled option |
| `PageDown`, `PageUp` | ten enabled options on, or the last or first |
| `Enter`, `Space`, `Alt+ArrowUp` | chooses the active option (`SE-D3`) and closes |
| `Tab`, `Shift+Tab` | chooses the active option and closes, and focus moves on, as the Authoring Practices say |
| `Escape` | closes and chooses nothing. The popover's close request handles it, so a dialog around the select stays open |
| a printable character | typeahead |

- **Typeahead:** the characters typed with less than 500 ms between them form a string, matched case-insensitively at the start of each enabled option's label, from the option after the active one, wrapping. A string of one repeated character moves through the options that start with it. `Space` is part of a string while one is being typed.
- **The active option is scrolled into the menu's view,** and nothing outside the menu scrolls: no page or ancestor scroll, so `scrollIntoView` isn't the mechanism.
- **Pointer:** a press on the field opens the menu, and a press on it while open closes it (`SE-D5`). A press on an enabled option chooses it and closes. A press on a disabled option does nothing, and the menu stays open. Hover draws the state layer and doesn't move the active option.
- **A label's activation focuses the select and doesn't open it,** as with a native select. The `click` it fires at the host has the host as the first node of its composed path, where a press has a shadow node.
- **Focus leaving the select by other means than Tab,** such as a press elsewhere (light dismiss) or a script's `focus()`, closes the menu and chooses nothing.

## SE-D8 — Forms and validation

- **Form-associated,** with `name`. The form value is the selected option's `value`, and none while no option is selected, so the form never submits a value that the field doesn't show.
- **Validation is `Validatable`'s,** as on the other controls: validity through `setCustomValidity`, the error display through `error`, no native validators, and `required` announced without blocking. `reportValidity()`'s message points at the field's container.
- **A form reset changes nothing,** as on the other controlled elements: the consumer resets `value` in the form's `reset` listener. **Restoration after a navigation** isn't owed by a controlled element (`RF-120`).

## SE-D9 — The field is the text field's

**What can be reused, read in the source at `e7fa0d5f8`:**

- **`TextFieldCore` can't be.** Its constructor finds `.input`, a native `<input>` or `<textarea>`, and hands it to `useNameable`, `useDisableable`, `useValidatable`, `useARIA` and the `value` getter and setter, and its dirty flag is the input's text. The select has no input and is its own control.
- **The template's parts** (`lead`, `label`, `trail`, `support` and their ids) and `useNotchedOutline`, `useHasSlottedPolyfill` can be.
- **The styles can be.** The grid is on `:host`, as the select's layout must be (`SE-D1`). The label floats on `:host(:state(populated))` and `:host(:focus-within)`, both true of a focused host, and the notched outline, the icons and the supporting text don't know the input. Only `.input`'s rules (`all: unset`, `field-sizing`, `caret-color`, the textarea's wrapping) are the input's.
- **The token utilities can be,** with a grouper that drops the select sets' `text-field.` prefix and leaves out `menu.*`.

**Decision.** One copy of the field's layout, label, outline, icons and supporting text, used by the text fields and the select. The select's styles add only what differs: the value's text in the input's cell, the dropdown arrow and the menu. The shared part moves to `material-x/src/core/styles/field/`, because it is meaningless without material-x's tokens, and the text fields import it from there. The text fields' rendering doesn't change: their computed styles, their rows and their visual baselines stay as they are.

- **The dropdown arrow** is drawn by CSS in the trailing column, with the trailing icon's color in each state, and turns over while the menu is open. It has no element and no icon font.
- **Each select renders its own token sets,** `md.comp.filled-select` and `md.comp.outlined-select`, not the text field's, so an upstream change to one reaches only its component.

## SE-D10 — Tokens

**The select's sets cover its menu.** `md.comp.filled-select` and `md.comp.outlined-select` each have the field's tokens under `text-field.*` and the menu's under `menu.*`: the container's color, elevation, shadow color and shape, the item's height and label type and color, the selected item's container color, and leading and trailing icon sizes and colors. That is what M3 says the select's menu looks like, so **no `md.comp.menu` set is needed for this unit** (Q4). The store has no menus table to give one: its manifest lists `Lists` and no `Menus`. A standalone menu needs that table first, added by the store's own update.

**What no token gives,** literals with provenance from M3's select and menu specs in the spec file:

- the menu's block padding and the item's inline padding and icon gap;
- the item's hover, focus and pressed state layers: `md.sys.state.*` opacities over `on-surface`, as the list's items use them;
- the menu's motion (`SE-D5`).

**Left out:**

- the deprecated tokens: `menu.container.surface-tint-layer.color`, `text-field.caret.color`, `text-field.error.focus.caret.color` and `text-field.container.height`. The height stays `56px` by the text field's own special token;
- **`md.comp.outlined-select.text-field.container.color`** (`surface-container-highest`), which would fill the outlined field. `md.comp.outlined-text-field` has no container color, and M3's outlined select is unfilled. A spec row asserts the outlined field is transparent;
- `md.comp.*-autocomplete`: an autocomplete's own sets. In both, the `menu.list-item.*` tokens are deprecated.

## SE-D11 — What goes where

The owner's rule: `@ydinjs/core` holds what anyone building a design system can use, and `material-x/src/core` what is meaningless without material-x.

| Part | Where | Why |
| --- | --- | --- |
| The popover, its anchoring and its place | the select's stylesheet | CSS and two attributes. Nothing is left to share as code |
| The field's shared styles | `material-x/src/core/styles/field/` | material-x's tokens and anatomy (`SE-D9`) |
| The menu's surface styles | the select's styles | one consumer. They move to `material-x/src/core/styles/` with a second one, such as `mx-menu` |
| Typeahead, active-descendant navigation | the select | one consumer (`CONTRIBUTING.md` §2). **Each is core's when a second consumer exists**, such as a menu or an autocomplete: both are universal, and `useRovingTabindex` is the precedent |
| `required` and `error` on the internals | core's `useValidatable` | universal to a form-associated element that is its own control. Today `useValidatable` writes through `setOwnARIA`, which takes an `HTMLElement` and sets its attribute (`useARIA.ts:41`), and registers that element as the validation anchor. So it needs a form that writes the internals' `ariaInvalid` and `ariaRequired` and takes the anchor separately. The change is core's and belongs to this unit, with a core row and a rebuild of core before material-x's typecheck |

**Not published: `mx-menu`.** A menu is `role="menu"` with `menuitem`s, actions and no value, and a select's popup is a `listbox` with `option`s. One element for both would carry two sets of semantics. A menu is its own plan, with `md.comp.menu` in the store first.

## Units and order

1. **`material-x/select-1`, this branch: the select.** The shared field styles, `useValidatable`'s form for a control that is its host (`SE-D11`), `mx-select`, `mx-option`, their tokens, tests, JSDoc, stories and component page, `files.json` (`select/select` and `select/option`, the first importing the second), `react.ts`, `package.json`'s `files`, the runtime-shape snapshot of `traits-baseline`. One pull request with this plan, `Closes #334`. It is one unit because half a select isn't usable: the keyboard, the popup and the form are each required by the others' rows.
2. **A documentation unit after the merge,** with its own pull request: `architecture.md` (the component list, `mx-select` and `mx-option` under _the host is the box_, and Q2's answer beside the controlled principle), `accessibility.md`'s section for the select from `SE-D6` with its `[Docs]` limits, and the README's list. It can carry another component's documentation unit too.

The branch starts at `e7fa0d5f8`. `main` has moved to `fe101808b`, which removes core's event helper (`RF-117`), so the implementer merges `main` first and dispatches plain `Event`s (`RD-52`).

### Stopping boundary

The implementer stops and returns to the architect if, in an engine at the floor:

- the host as the combobox loses its name, role, value or active descendant in a way the readings didn't show;
- no `@position-try` form gives `SE-D5`'s place when the menu fits neither side;
- the shared field styles change a text field's computed style or a visual baseline;
- a property here can't hold without a positioning script or a `manual` popover.

## Tests by layer

The rows name no engine. CI runs each in Chromium, Firefox and WebKit, and a row that only one engine's tree can show says so. Each witness removes the mechanism and the row fails.

- **`select/select.browser.test.ts`**
  - **Value:** the field, `:state(populated)`, `aria-selected`, `:state(selected)` and the form value follow `value`, and an option's added, removed or changed `value`, `disabled` or label. A `value` no option has selects none and submits nothing. Duplicate values select the first.
  - **Controlled:** choosing an option by `Enter`, by a press and by `Tab` fires `input` then `change` at that option, with the flags of `SE-D3`, and changes nothing until the consumer sets `value`. Choosing the selected option fires nothing. **Witness:** a select that sets its own value fails it.
  - **Keyboard:** each row of `SE-D7`'s tables, both states. Disabled options are skipped. Typeahead: a string, a repeated character, the 500 ms pause, `Space` inside a string, and a match from after the active option. The active option is in the menu's view after `End` in a 30-option menu, and the page's and an ancestor's scroll positions don't change. **Witness:** with `scrollIntoView`, the page row fails.
  - **Pointer:** a press opens; a press on the field of an open menu closes it and it stays closed (**witness:** without the `pointerdown` record, it reopens); a press on a disabled option keeps it open; a press outside closes and chooses nothing.
  - **Label:** a `<label for>`'s activation focuses the select and leaves it closed.
  - **Escape:** closes and chooses nothing. In an open modal `<dialog>`, the first `Escape` closes only the menu.
  - **Focus:** stays on the host through opening, navigation and choosing. A script's `focus()` elsewhere closes the menu.
  - **Disabled:** with `disabled` and in a `<fieldset disabled>`, the select takes no focus, from a script or Tab, and no press opens it. Becoming disabled while open closes the menu.
  - **Forms:** submission under `name`; `setCustomValidity`, `checkValidity`, `reportValidity` and `invalid`; `required` and `error` don't change validity; a form reset changes nothing.
  - **Popup:** with the field at the viewport's bottom the menu opens above; with room on neither side it is shrunk, scrolls and shows at least three options; it is at least as wide as the field; it flips to the end edges at the inline end; in an RTL document it mirrors; inside an `overflow: hidden` ancestor with a `transform` it is whole and takes the hit; after the page scrolls it is still under its field; two selects' menus each sit under their own field; opening one closes the other. **Witness:** with `max-block-size: 100%` on the base place rather than in the last fallback, the bottom-edge row fails, because the menu then never overflows and shrinks below instead of flipping. **In Firefox only:** an RTL select in an LTR document reads the defect of reading 6, and the row fails when it is fixed.
  - **Reduced motion:** opening and closing have no duration.
- **`select/select-a11y.browser.test.ts`,** read through Chromium's own tree by CDP, as `list-roles.browser.test.ts` does; and in the three engines what the platform's APIs show (`role`, `ariaExpanded`, the reflected active descendant):
  - one `combobox` node named by each of the four sources, with no `generic` between it and its parent. **Witness:** a shadow combobox fails it;
  - the name sources' order, a host `aria-label` over the slot included;
  - the value is the selected option's label, closed and open, with a slotted label and supporting text present. **Witness:** without the `aria-hidden` wrappers it reads `N3Banana`;
  - `aria-expanded`, the active descendant while open and none while closed, `listbox` and `option` with `selected` and `disabled`, `setsize` and `posinset`;
  - `required` and `error` as the combobox's states, with the host's attributes unchanged;
  - the description from `support`.
- **`select/option.browser.test.ts`:** the option's role and states, its `value` default from its label, and no focus.
- **`select/select.spec.browser.test.ts`,** a visual contract against the select's token sets, through the bridge: the field's colors in each state (rest, hover, focus, disabled, error, filled and outlined), from `md.comp.*-select` and not the text field's sets; the outlined field unfilled; the menu's color, shape, elevation's shadow and shadow color; the item's height, label type and color; the selected item's container color; the icons' size and colors; the state layers' opacities; each literal with its provenance. **Witness:** rendering the filled text field's set fails a row whose token differs between the sets, if one does, and the outlined fill row otherwise.
- **`select/select.visual.browser.test.ts`:** the filled and the outlined field, empty, populated and with an error; and an open menu with a selected, an active and a disabled option. The owner records the baselines (`RD-13`).
- **The text fields' existing rows, spec rows and visual baselines pass unchanged** after the field styles move. **Witness:** removing the shared stylesheet from the text field fails its spec rows.
- **Core, `validatable.browser.test.ts`:** with the internals as the target, `error` and `required` are the element's `aria-invalid` and `aria-required` in Chromium's tree, the host's attributes are unchanged, and `reportValidity()` points at the given anchor. The rows for the other elements pass unchanged.
- **Node:** `package-entries` with the two entries, and `traits-baseline`'s snapshot.

## Size

No limit applies before the first release (`RD-24`). The implementer reports Brotli for `select/select`, `select/option`, `text-field/text-field`, `text-field/multiline-text-field` and `complete`, measured by composition (`CONTRIBUTING.md` §15): with the select, and with its entries taken out of `files.json`.

- **Expected, unmeasured:** `select/select` about the slider's 3.9 KB to 6 KB, because it carries the field's styles, two token packages and the keyboard. `complete` grows by less than `select/select`, because the field's styles are shared with the text fields there.
- **The text field rows stay within a few bytes.** A move that grows them by more is reported with its cause.
- **A reading over 6 KB for `select/select`** is reported with what takes the bytes, and returns to the architect before review.

## Docs and Storybook

- **JSDoc** on both classes, as the text field's: attributes, slots, parts, states, custom properties and events, with `SE-D3`'s _the event's target is the chosen option_ and the consumer's `change` handler. The `[Docs]` limits go on the component page.
- **`select/select.mdx`,** the component page: usage with the controlled handler, filled and outlined, leading icon, supporting text and error, disabled options, forms and validation, keyboard, accessibility, and the RTL limit in Firefox.
- **`select/select.stories.tsx`:** the playground (the attributes, with a controlled wrapper that sets `value` on `change`), filled and outlined side by side, states (populated, disabled, error, required), a long list that scrolls, a select at the bottom of the frame that flips, RTL, and a select inside a scrolling, clipping container.
- **No story for `mx-option` alone,** which isn't used outside a select.

## Out of scope

- **Multiple selection.** Not recommended now: M3 has no multiple select, and a listbox with `aria-multiselectable` is a different keyboard and value model. It stays possible with the same option element.
- **Autocomplete,** a combobox with a text input. Not recommended in: its tokens are their own sets, its value is the user's text as the text field's, and its filtering is the consumer's. It reuses `SE-D5`'s popup and `mx-option`, and is its own plan.
- **Option groups and dividers** inside the listbox: a `separator` isn't allowed in a `listbox`, and groups need `role="group"` with a name. A later unit, which can use `mx-divider`'s styles.
- **`mx-menu`:** `SE-D11`.
- **A picker on phones,** such as a bottom sheet: the menu is the same on every screen size.

## Not measured

- **No screen reader** was run. The trees were read, not heard. `RF-94`'s next step, listening with VoiceOver, covers the select too.
- **Firefox's states and relations,** active descendant and value included, weren't read: its harness gives roles and names. The implementation reads what the platform's APIs reflect there.
- **WebKit's and Firefox's computed values,** for reading 12.
- **Safari, and every mobile browser:** not run. Touch and a phone's virtual keyboard weren't read. The menu's behavior on an Android close request is the platform's.
- **Size,** which needs the build.

## Questions for the owner

**Q1 — Whose is the value?**

- **(a) The consumer's, recommended.** The select is controlled, as the checkbox and the radio are: choosing an option fires `input` and `change` at it, and the field changes when the consumer sets `value` (`SE-D3`). The slider and the text fields are exceptions because the user's input is continuous and a controlled rewrite would run on every move. A select's choice is one discrete event.
- **(b) The user's,** as a native `<select>`'s: choosing sets `value`, then fires the events at the select. A bare `<mx-select>` in a form works without a script. It is a third exception in `architecture.md`.

**Q2 — Whose is the menu's open state?**

- **(a) The select's own, recommended** (`SE-D4`). It is the presentation of an input in progress, as focus is, and the platform's popover closes it by itself.
- **(b) The consumer's,** as the split button's `open`: a `manual` popover, with light dismiss, `Escape` and focus loss written in the select, and events for each request.

**Q3 — The option's tag name.**

- **(a) `mx-option`, recommended:** a later listbox, such as an autocomplete's, uses the same element.
- **(b) `mx-select-option`:** names its one container. A later listbox has its own element or reuses this one under a narrower name.

**Q4 — Which tokens draw the menu?**

- **(a) The select's own sets, recommended** (`SE-D10`): M3's tokens for the select's menu, in the store today, with literals for padding, state layers and motion.
- **(b) A standalone menu's set,** if the owner wants the select's menu to follow M3 Expressive's menus: the store adds the menus table first, by its own update, and this unit waits for it.

## Proposed record entries

**One decision entry, to be minted on the owner's answers:** `SE-D1` to `SE-D11`, with Q1 to Q4, pointing here. At this writing `RD-68` is the highest decision on `main`, and `RD-65` and `RD-66` are taken on open branches, so the next free number is `RD-69`. The architect who mints it checks every branch on `origin` again. With Q1 (b), Q2 (b) or both, the entry also amends `architecture.md`'s statement of the controlled principle in the documentation unit.

No finding is proposed. Reading 6 is an engine's defect that reaches only the select, which doesn't exist yet: it is the select's documented limit and its Firefox row. Reading 14 is evidence for `RF-119` and changes nothing there: the select isn't one of the elements it lists.

## Revisions

- **2026-11-27, this revision:** the first plan, with Q1 to Q4 open.