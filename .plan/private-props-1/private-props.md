# Private custom properties and what inherits them

**Status: a diagnosis, with no repair. Answered by the owner on 2026-11-23:** R for `repo:RF-122`, and the `--mx-` prefix for `repo:RF-123`. Those entries govern. They hold his words, the extent (every exposed property) and what each unit waits for. Written by the architect on 2026-11-23, on `repo/private-props-1` from `origin/main` at `92a386a17`, on the coordinator's task. It started from `mx-card`'s [report](https://github.com/ausginer/material-x/blob/34bcd4e75/.plan/card-1/card-report.md) (`material-x/card-1` at `34bcd4e75`, #213).

**The owner, 2026-11-23, in chat,** relayed by the coordinator: _"Ауч... Да, это проблема, надо начинать, видимо, делать префиксы по имени компонента..."_ ("Ouch... Yes, that's a problem, it looks like we have to start prefixing by the component's name..."), completed with _"(или трейта)"_ ("(or the trait's)").

## The mechanism

A component declares its tokens as private custom properties on `:host`, and its shadow tree inherits them. Slotted content inherits them too, because it is the host's descendant. Most of the time nothing happens: a component that reads `--_container-color` declares it on its own host, and the nearest declaration wins.

**A leak needs an exposed property:** one that a component reads and that no unconditional `:host` rule of it declares. The component means _unset_ by its absence, as in `var(--_container-color, transparent)`, and an ancestor that uses the same name sets it. So the fault is in the reader. Any ancestor can supply the value.

## Readings

[`leak.browser.test.ts`](probes/leak.browser.test.ts.txt), in Playwright's Chromium 158, Firefox 159 and WebKit 27.2, with `mx-card` (`34bcd4e75`) and `mx-top-app-bar` (`6dbdcbbd1`) laid over `main`. For each pair of 23 containers and the content that fits them, it resets one exposed property at a time on the content's host and compares every computed value. 2349 cases were compared in each engine. 142 leak, and the three engines' summaries are identical ([Chromium in full](checks/leak-chromium.txt), [Firefox](checks/leak-firefox-summary.txt), [WebKit](checks/leak-webkit-summary.txt)).

| Property | From | Into | Effect | Cases |
| --- | --- | --- | --- | --- |
| `--_level` | an elevated card without its resets; a lifted list item | every button, icon button, switch and link button with no level of its own, also in groups and the split button (36 of the contents) | the container's shadow | 72 |
| `--_container-color` | the card without its resets, all three list items, the text fields, the top app bar | an unchecked `mx-checkbox`, enabled, disabled or in error | the container's color fills the box | 39 |
| `--_trailing-icon-gap`, `--_container-opacity`, `--_active-indicator-opacity`, `--_outline-opacity` | a text field | a text field in its slot | its gap and its disabled opacities | 29 |
| `--_container-opacity` | a disabled text field | the button and link items of a list in its slot | the items' container color fades | 2 |

- **Realistic today:** the checkbox in a list item, a card or a top app bar, and the buttons in a lifted list item. The text field's rows nest a text field or a list in a text field.
- **The card without its slot's resets has 45 of the cases** (36 of `--_level`, 9 of `--_container-color`), **and with them none.**
- **No leak** into the button groups' direct buttons, from a FAB or a button into its icon, or into `mx-icon`. Radio, FAB and card content read nothing that a container in the set declares.
- **Control:** resetting every exposed property on content that is in no container changes nothing but the check mark's running `clip-path` animation (8 values, in flight, different in each run).
- **The exposed properties** of each element are listed in the Chromium reading: 8 in the button family, 3 in the checkbox, 1 in the radio, 7 in the FAB, 33 in the text fields, 5 to 7 in the list items, 2 in the card. Most have names that no other element uses.
- **Limits:** hover, focus and pressed weren't driven. The exposed set is read from all rules, whatever their state, so a leak there would need a property of that set. Content in a third-party element wasn't tried. `mx-slider` isn't built, so it wasn't read.

## What relies on the inheritance

- **Every component, inside its own shadow tree.** The declarations are on the host, and `.host`, the pseudo-elements and the slots read them. `inherits: false` would break all of them.
- **The list items read the list's `--_drag-duration` and `--_drag-easing`:** they are exposed on the items on purpose.
- **The groups' `::slotted` rules** read the group's private properties on the slotted button, through inheritance: `--_inner-corner-corner-size`, the interaction multiplier. They also read and write the _button's_: they read `--_leading-space` and set `--_border-radius`. `mx-split-button` sets its inner buttons' `--_leading-space` and `--_container-shape`. These are declarations from an outer tree, which beat `:host`, so a reset on the button's host doesn't break them, and the probe's groups show it.

## Published names

`collect-props.ts` publishes each private name as `--` and one or two letters, 228 of them. [`mangled-names.mjs`](probes/mangled-names.mjs) ([reading](checks/mangled-names.txt)), on the built package, the same in the three engines:

- a page's `.x { color: var(--an) }` inside a text field takes the field's suffix color;
- a page's `:root { --bh: red }` fills an unchecked checkbox, and `:root { --hh: 3px }` sets a button's corners;
- `--fn` is registered as a `<number>` for the whole document (`--_level`), so a page's `--fn: solid` computes to an invalid value;
- which name is which changes with the sources, so a page can't avoid them.

A prefix in the source changes none of this, because the names are replaced at the build.

## Repairs

Sizes are Brotli bytes ([readings](checks/sizes.txt)), against 22746 for `complete`.

|  | Repair | Fixes | Cost |
| --- | --- | --- | --- |
| R | **Own what you read.** An element declares on its host, unconditionally, each private property it reads that another element declares. `--_level: 0` goes into the elevation sheet, once, and the rest is a `:host { --_x: initial }`. A test lists the exposed properties, as the probe does, and fails on one that isn't declared and isn't listed as inherited on purpose | All 142, whatever the ancestor, same-element nesting and shared names included, and a page's collisions of RF-123 on the reading side | `complete` +11 for the leaks found, +123 for every exposed property; text fields +4 and +11, or +80 and +109. No change in tproc. Hand-written declarations, kept right by the test |
| P | **Prefix by the component's name, or the trait's.** | The 39 checkbox cases and the 2 of the list. Any later coincidence of names between two elements | Not `--_level` (72 cases): the card, the list items and the buttons all read the elevation sheet's one name, so a trait's prefix renames it for both sides. Not same-element nesting (29). 484 occurrences in 29 files, a prefix in tproc's `render` and its `ref()`s, the group and split-button stylesheets that use the button's names, and the 5 test files that name them. `complete` +242 and most rows 1 to 33 smaller, as an estimate with names by folder |
| P2 | Prefix by the component's name, with the elevation sheet generated for each component | All but same-element nesting | The elevation sheet is no longer one shared `CSSStyleSheet`, and `--_level` is registered once per element. Not measured |
| C | **Reset in the container's slots,** as the card does | What the container knows of | A list in each container that follows every element's exposed properties, with no check. It repairs the reading side from the wrong end |
| N | `inherits: false` for every private property | Everything, by breaking every component | — |

- **R and P don't exclude each other.** P alone leaves the most visible leak. R alone leaves the shared names as they are, and they are harmless once every reader owns what it reads.
- **R's test is the durable part:** a new element or a new conditional token can't reopen the leak.

## Recommendation

**R, with the guard test, and no prefix.** It repairs the leaks at their cause, in the reader, and needs no change in the token pipeline. P costs more in the sources and in `complete`, and by itself doesn't reach `--_level`, which is the leak the owner saw.

**Meanwhile the card's two slot resets are right and enough:** with them the card has no leak in the three engines. R makes them redundant, and its unit removes them. `mx-top-app-bar` leaks only `--_container-color` into an unchecked checkbox in its slots, which isn't a usual content, so it needs no reset. **Neither the card nor the bar should wait.**