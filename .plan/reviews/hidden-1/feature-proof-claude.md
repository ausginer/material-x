# `hidden` hides every material-x element — feature proof of `RF-121`

**Files were read at:** `dce82dffa` (`core/hidden-1`, clean, equal to `origin`), pull request #270. **Diff reviewed:** from the merge base `e57c9f074`.

**Governing record:** `RF-121` in [`00-index.md`](../../00-index.md) at the same commit, with the architect's note of 2026-11-24. The implementer's note and [`hidden-1/`](../../hidden-1/) are read as claims.

**Lens:** feature proof. Nothing is repaired, and no record is amended.

**Verdict: the rule does what the entry requires, for each of the 22 elements, in Chromium, Firefox and WebKit, with one narrow exception (reviewer-2). Two Tier A findings, neither of them in the rule: a hidden member of a connected group, which the unit makes reachable, and the exception. One Tier C finding about the rows. The gate is green, its visual job included.**

## Scope

**Covered:** the sheet and `useCore`; each `display` that a built element's own sheets give a host or a slotted element; `hidden` on built bundles of the head and of the base, over values, states, page rules, showing again, focus, popovers, drags, lists and groups; the rows, with mutations of my own; the sizes, with variants; #270's CI; the root format check.

**Not covered:** Safari, screen readers, `docs-build`, `docs-smoke` and publint locally (CI's `docs` and `static` jobs pass), and the full suite locally (CI's three engine jobs pass).

The container fell during the first pass, under other sessions' load too. The readings of that pass were kept in scratch storage. Before this report I rebuilt the clone at `dce82dffa`, and its bundle is byte-identical to the one that was read. The mutations were run again, one engine at a time. Three failures in the loaded run, two of them `until-found` rows, didn't concern the mutation that was on. None came again, so I count none.

## Findings

### reviewer-1 — Tier A, the cause is pre-existing — a hidden member takes a connected group's only tab stop

- **What happens:** in `mx-connected-button-group` with switch buttons, hide the member that holds the tab stop, which is the first one of a new group, in the markup or later. Tab then passes the whole group. From another member that has focus, the arrow keys stay on it: the next step is the hidden member, whose `focus()` does nothing. The first visible member also has the inner corners of a middle one, because the hidden one still carries the end ([reading](checks/lists.txt), [probe](probes/lists.mjs)). The three engines agree.
- **What it was:** at the base the hidden member was still shown, held the tab stop and took focus, so the group was reachable. A page that hid it with its own `display: none` had what `hidden` has now, at the base too. So the cause is the group's, and this unit makes the documented way of hiding reach it.
- **Why it is a problem:** a keyboard user can't reach a visible control.
- **Evidence for the cause:** `useRovingTabindex` excludes `disabled` items only.
- **Required property:** a member that isn't rendered doesn't keep the group's other members from the keyboard. Whether that holds for `hidden` alone or for every way of hiding, and what the end shapes do, is the architect's to rule. `RF-121`'s own property isn't violated.

### reviewer-2 — Tier A, pre-existing — an element with `hidden` and `data-avatar` in a list item's `lead` slot is still shown

- **Contract:** _"a material-x element with `hidden` isn't rendered, whatever state it is in."_
- **What happens:** an `mx-icon`, `mx-card` or `mx-icon-button` with `slot="lead" data-avatar hidden` has `display: grid` and a box, in the three engines ([reading](checks/hidden.txt)). The same element without `data-avatar` is hidden. A native `<span data-avatar hidden>` is shown too, which isn't this entry's.
- **The cause:** `.lead::slotted([data-avatar]) { display: grid }` in the list item. The list item's tree precedes the slotted element's own, so this declaration outranks the rule at any specificity that isn't important. It is the only `::slotted` rule in the package with a `display` ([reading](checks/host-display.txt)).
- **Why it is a problem:** the same as the entry's. It is narrow: the stories put `data-avatar` on native elements, and no page of the package shows it on an `mx-*` one.
- **Required property:** the entry's. The architect may rule the combination out of it, or take the native case with it.

### reviewer-3 — Tier C — the rows read `hidden` with the empty value alone

- **What happens:** with `:host([hidden='']:not([hidden=x]))` in place of the rule, at the same specificity, all 135 rows pass in the three engines ([mutations](checks/mutations.txt)). That rule leaves `hidden="hidden"` and `hidden="true"` shown.
- **Why it is a problem:** any value other than `until-found` is the hidden state in HTML. The built rule is right: `hidden`, `true`, `false` and `until-found` with a space after it hide 22 of 22 ([reading](checks/hidden.txt)). No row says so.
- **Required property:** a regression to the empty value fails a row.

## What the request asked

### Specificity against every host `display`

I read each adopted sheet of the 22 built elements, nested rules included ([reading](checks/host-display.txt), [probe](probes/host-display.mjs)). Every host `display` is a plain `:host`, `(0,1,0)`. The rule is `(0,3,0)`. **No component has a conditional one,** so the implementer's claim is right. Rules with a state and a `display` (`mx-fab` extended, `mx-slider`'s indicator, the ripple) give it to a shadow element, never to the host. 264 combinations, each element with each of eleven state attributes and with all of them, have no box ([reading](checks/hidden.txt)).

A future host rule with two states ties at `(0,3,0)`, and the order decides it. Three states or an id would win. The row with two states fails if the rule loses one step of specificity, and a component whose host `display` outranks the rule fails its own rows (the slider mutation), in the three engines. Both hold the property well enough.

### The sheet's place

**Not discriminated, confirmed and accepted.** With the sheet first, 135 rows pass in the three engines. Nothing observable depends on it, because no component's rule reaches `(0,3,0)`. "Adopts last" holds for the sheets that `useCore` is given. In 13 of the 22 elements the ripple, the notched outline or the announcement helper pushes one more sheet afterwards. None of them sets a host `display`.

### A page's own `display`

Wins as over a native `<div hidden>`: by type, `*`, `:where`, in a layer, inline, and with `revert` and `all: unset`, 22 of 22. A page's `[hidden]` rule, important or not, hides. `revert-layer` gives `none`, as native. The rule isn't important, and the mutation that makes it so fails 22 rows in the implementer's reading.

### `until-found`

Left out in both letter cases, so the head reads as the base does. The unread point of the entry is read now ([reading](checks/lists.txt)): on the seven hosts with `display: contents` (the six buttons with the split button, and `mx-fab`) `hidden="until-found"` has **no effect**, in the three engines, and the content is shown. On the other fifteen the content is skipped, as on a native button. This is unchanged by the unit and outside its property. I report it as an observation for the architect.

### `popover` and a drag

A lifted item that is hidden in a drag goes to `none` in place of staying shown, stays `:popover-open`, and the drag ends with its `style` and `popover` restored, its order applied and no error. This equals a page's `display: none` at the base. A hidden item in the list: the keys and the pointer give the same order as at the base. Each key step still counts the hidden item, as with a page's `display: none`, so a step over it moves nothing that the user sees.

### Elements, rows and other users

The package defines 22 elements and `files.json` has 22, `mx-card`, `mx-slider` and `mx-top-app-bar` among them. An element that doesn't reach `useCore` fails two rows (the `mx-icon` mutation). `visibility` in place of `display` fails 47. Hidden and shown again, 44 elements and variants, in two ways each, have the pixels of one that was never hidden, in the three engines: the text field's outline, the slider and the ripple measure nothing stale.

**Nothing in `packages/`, `.storybook` or `.scripts` sets or reads `hidden` on an `mx-*` element.** The drag lift's inline properties don't include `display`. `.storybook/preview-frame.css` reads `[hidden]` on `#storybook-root`, which isn't one.

## Cost

The sizes are reproduced to the byte: +12 to +54 for an entry, `complete` 25641 to 25677 ([reading](checks/sizes.txt), [script](probes/sizes.sh)). Variants of the same tree:

| Variant | Entries | `complete` |
| --- | --- | --- |
| The rule as it is | +12 to +54, mean +32.5 | +36 |
| A sheet with an empty rule | −19 to +59, mean +16.3 | +12 |
| `:host([hidden])` without the `until-found` exception | −2 to +52, mean +18.9 | −2 |
| The exception without `i` | +8 to +55, mean +34.8 | +47 |
| A shorter selector, `[hidden*='-f' i]` | +8 to +54, mean +34.1 | +53 |
| The sheet imported and not adopted | +5 to +46, mean +26.4 | +5 |

So about half is the sheet's module and adoption, and the rest is mostly the exception, which the entry requires. The differences between variants are near what Brotli moves by itself: two shorter texts come out larger. **I found no smaller form that keeps the contract.** A rule that the buttons' sheets shared would miss the elements outside them. One sheet object is shared by every element, so the cost for an instance is one entry in `adoptedStyleSheets`.

## Witnesses and checks

The recorded witnesses agree with my mutations, where they overlap: unmutated none, sheet first none, less specificity the state row. The mutation _not adopted_, 47 in their reading, is as many as _visibility_ in mine.

- **CI** ([reading](checks/ci.txt)): run 45596031366 at `dce82dffa`, every job passes. The visual project ran in the `chromium` job: seven files, 32 rows, and no baseline changes in the diff.
- Root `just fmt-check`: passes. Links of this report: by hand.

**Stopping boundary:** the three findings and the `until-found` observation go to the architect. The unit itself needs no repair for `RF-121`'s property except as reviewer-2 is ruled.