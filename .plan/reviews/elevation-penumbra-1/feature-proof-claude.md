# Feature proof: RF-70, the FAB and the list items draw the elevation penumbra (PR #120)

**Read at** `966ec0354` on `material-x/elevation-penumbra-1`, against `RF-70` in the [register](../../00-index.md) and its dated paragraph on the branch. The branch's merge base `682639048` is the base. `main` is at `cbb06d265` now, and the one commit it gained (`RF-72`, #117) changes no file this branch changes, and `git merge-tree` merges the two cleanly. Reviewer: Claude, a feature-proof pass that didn't implement the unit, on the coordinator's task of 2026-11-22.

Everything ran in scratch exports of the two commits (`git archive`, then a local `git init` so the build's `git` calls work; no worktree or slot). Each export was installed with `aube install` and built by the recipes that the commands below call. The browsers were Playwright 1.65.0's Chromium 158.0.8127.18, Firefox 159.0 and WebKit 27.2, with Node 26.13.1. Slot `c` was only read, plus one read-only run of [`first-mention.ts`](probes/first-mention.ts).

**Scope:**

- **Covered:** the three stylesheet changes, the new row and its two bridge contracts, the before-and-after witness, the sizes and their stated cause, the resting static item's pixels, and the implementer's two observations, as the coordinator asked.
- **Rerun, not taken from the record:**
  - the new row on the head, and on the base with the new row copied in ([head](checks/elevation-head.txt), [base](checks/elevation-base-with-new-row.txt));
  - the whole material-x package suite on the head in the three engines ([summary](checks/material-x-suite-head.txt));
  - `just size-reading` on both exports ([comparison](checks/sizes-and-names.txt)).
- **Probes of this pass**, all in [`probes/`](probes/):
  - six source mutations against the new row ([reading](checks/mutations.txt));
  - [`rf70-probe.spec.browser.test.ts`](probes/rf70-probe.spec.browser.test.ts): the shadow colour each box resolves, a pointer drag of each interactive item, and resting screenshots ([reading](checks/probe-colours-and-drag.txt), [screenshots](checks/screenshots.txt));
  - [`rf70-link-drag.spec.browser.test.ts`](probes/rf70-link-drag.spec.browser.test.ts): the branch's own drag gesture on `mx-list-link-item` ([reading](checks/link-drag.txt));
  - [`rf70-zero-layers.spec.browser.test.ts`](probes/rf70-zero-layers.spec.browser.test.ts): the resting list with and without its elevation layers ([reading](checks/screenshots.txt));
  - [`private-props-remap.ts`](probes/private-props-remap.ts), adapted from `list-roles-1`'s, and [`first-mention.ts`](probes/first-mention.ts) for the naming ([reading](checks/sizes-and-names.txt));
  - [`pngdiff.mjs`](probes/pngdiff.mjs), [`pngrows.mjs`](probes/pngrows.mjs) and [`sizecmp.mjs`](probes/sizecmp.mjs) to compare the readings.
- **Not run:** the visual project, which runs in CI only and has no FAB or list baseline. Safari, which needs macOS. The root `fmt`, `lint` and `typecheck`.

**Verdict:** the unit meets `RF-70`'s required property for its five rows. At one level, the FAB (default and extended) and the three list items draw the elevation stylesheet's three layers, as the elevated button does. The new row isn't circular for that property: it fails when any one of the three declarations is removed, and when a component's level is wrong. The sizes reproduce row for row, and the unrelated rows' movement is renaming only. The record's cause sentence names the wrong stylesheet, though (`reviewer-4`). The implementer's observation (1) holds, and the list items have it too (`reviewer-2`). Observation (2) holds in Chromium and Firefox and is refuted in WebKit (`reviewer-1`, `reviewer-5`). At rest, Chromium and WebKit draw the same pixels as on the base. Firefox doesn't: the zero-size layers paint at the rounded corners, as the base's two layers already did (`reviewer-3`). Three Tier A findings go to the architect. Two of them are pre-existing and one is made slightly worse by the change. Two Tier C record corrections go to the implementer. Whether any of them blocks the merge is the architect's call.

## The change

| Claim | Holds | Evidence |
| --- | --- | --- |
| The FAB's `.host` draws the penumbra after `all: unset` | Yes | `fab/styles/default/main.styles.css:15`. Mutation `m1a` (the line removed) fails the two FAB rows in three engines, and only them |
| The interactive items' `.host` draws it after `all: unset` | Yes | `list/styles/item/interactive-box.styles.css:4`. `m1b` fails the button item's and the link item's rows in three engines, and only them |
| The static item draws it in place of `box-shadow: none` | Yes | `list/styles/item/static-box.styles.css:24`. `m1c` (back to `none`) fails the `mx-list-item` row in three engines, and only it |
| The five component rows fail before the fix, with only the penumbra differing | Yes | 15 failed and 3 passed. Each diff is `penumbra: "none"` against the tokens' layer, with umbra and ambient equal |
| 18 of 18 pass after the fix | Yes | 3 files, 18 passed |
| The control row passes before and after | Yes | The three `mx-button` rows pass on both builds |
| The material-x suite passes in the three engines | Yes | 74 files: 1651 passed, 1 expected fail, 4 skipped. The record's 1627 in 72 files is the browser and spec projects. This run is every project of the package's configuration |
| The new contracts are the production packages | Yes | `elevation` is `core/styles/elevation/tokens.ts`'s `elevationTokens`, which `elevation.css.ts` renders. `fab.color.default` is `fab/styles/color/tokens.ts`'s `defaultColorTokens`, which `fab/styles/default/main.css.ts` renders and which carries `elevation.default` and `elevation.hovered` |

The comments in the three stylesheets say why the declaration is there, and no finding id appears in source.

## Does the row discriminate, and is it circular?

**The row compares a tproc expectation with an independent browser observation.** The observed side is the computed `box-shadow` of the box, its `::before` and its `::after`. The expected side is the elevation package's three layer tokens, resolved in a document probe at the level that the component's own token package gives (`elevation.default` for the FAB, `container.elevation` in `dragged` or `default` for the list items). The level comes from a different package than the layers, and the rendered level is the component's CSS. So the row checks two things the stylesheets decide: that the box draws each layer, and that the component's `--_level` is its token level.

| Mutation, alone | Rows that fail | So the row sees |
| --- | --- | --- |
| `m1a`, `m1b`, `m1c`: each fix reverted | each fix's own rows, in three engines | the cascade |
| `m2`: the FAB's resting level reads `--_elevation-hovered` | both FAB rows, in three engines | the FAB's level |
| `m3`: the list item's level is `container.elevation + 1` | the three list rows, in three engines | the list item's level |
| `m4`: the penumbra's offset multiplier is 1 instead of 0.75 | none (18 passed; rerun alone with the diff shown, 6 of 6 in Chromium) | not the layer formula |

**Two limits, both stated or inherent, so neither is a finding:**

- **The layer formula isn't under test (`m4`).** The same `elevation.penumbra` string is on both sides. It is the library's own literal in `core/styles/elevation/tokens.ts`, not an M3 token, and `RF-70`'s property is that every component draws _the elevation stylesheet's_ layers. This row can't detect a wrong formula, and doesn't claim to.
- **The colour isn't under test.** `expectedLayers` reads the box's own `--_shadow-color`, a generated private custom property, and the record says so. So the row can't see `reviewer-2`, and a passing row says nothing about the colour.

## The points the coordinator asked about

- **The unrelated rows and their stated cause.** This pass's base and head readings equal the committed `size-before-fix.json` and `size-after-fix.json` on all 33 rows. No material-x row has a limit. Both builds have the same 227 private names, and 100 take a different short name. 78 built `.js` files are byte-equal, and the other 16 outside the three changed stylesheets are equal once each short name is mapped back. Only `fab/styles/default/main.css.js`, `list/styles/item/interactive-box.css.js` and `list/styles/item/static-box.css.js` differ. So the movement is renaming, as the record says. The cause sentence names the wrong file, though: see `reviewer-4`.
- **The resting static item draws a shadow only where its tokens give one.** At rest, the list item's `container.elevation` is 0, so each layer is `0 0 0 0` in the shadow colour. In Chromium and WebKit, the resting list (a static, a button and a link item) is byte-equal between the builds, and byte-equal to the same list with all three layers set to `none`. The static item draws nothing visible at rest there. Firefox paints the zero-size layers, and did so on the base too: see `reviewer-3`. The resting FAB's screenshot differs between the builds in all three engines, as expected at level 6.
- **Observation (1), the shadow colour: confirmed, and wider.** See `reviewer-2`.
- **Observation (2), the link item's drag: confirmed in Chromium and Firefox, refuted in WebKit.** See `reviewer-1` and `reviewer-5`.

## Findings

### reviewer-1 — A pointer drag doesn't lift `mx-list-link-item` in Chromium and Firefox

**Tier A, pre-existing. To the architect, for registration.**

- **Current behaviour:** in `mx-sortable-list`, the branch's own gesture (press at the item's centre, move 12 px in 3 steps, poll `:state(drag)`) lifts `mx-list-link-item href="#"` in WebKit, 3 runs of 3. In Chromium and Firefox it lifts it in none of 3. There, the shadow `<a class="host">` fires a native `dragstart` and the pointer gets `pointercancel`. `mx-list-button-item` lifts under the same gesture in all three engines. The base behaves the same in every engine, so the branch didn't cause it.
- **Why it is a problem:** `mx-sortable-list`'s documentation says it _"takes the same item elements"_ as `mx-list`, and that _"an item without a handle drags by its whole surface"_. `@ydinjs/drag`'s contract leaves native drag to its consumer (_"a natively draggable item or handle, such as a link or an image, needs `draggable="false"`"_), and `mx-sortable-list` with its link item is that consumer. A page can't reach the anchor, because it is in the item's shadow root.
- **Evidence:** [`link-drag.txt`](checks/link-drag.txt), and [`probe-colours-and-drag.txt`](checks/probe-colours-and-drag.txt) for the event sequence. With `draggable="false"` set on the shadow anchor from the probe, Firefox lifts the item. Chromium still fires `dragstart` and doesn't lift it. I didn't read that difference further.
- **Required property:** a link item without a handle in `mx-sortable-list` lifts under a pointer drag of its surface, as a button item does, in every engine.

### reviewer-2 — The elevated button and the dragged list items draw their shadows in surface-tint

**Tier A, pre-existing. To the architect, for registration.** This confirms the implementer's observation (1) and extends it to the list items.

- **Current behaviour:** under the fixture's theme, the box's `--_shadow-color` resolves to:
  - `#3f6900` (surface-tint) for `mx-button color="elevated"`, `mx-list-item`, `mx-list-button-item` and `mx-list-link-item`;
  - `#000` for `mx-fab`.

  The layers are drawn in those colours, at 14 %, 20 % and 12 % mixes. The base resolves the same colours.

- **Why it is a problem:**
  - **The button:** its own token package gives `shadow.color` as `var(--_container-shadow-color)`, which is `var(--md-sys-color-shadow, #000000)`, and the box resolves that as `#000`. `ButtonCore.ts` adopts `elevationStyles` after `defaultStyles`, so the elevation package's `shadow-color`, `var(--md-sys-color-surface-tint, #3F6900)`, sets `--_shadow-color` last. The button renders a shadow colour that its own token package doesn't give. The FAB adopts the elevation stylesheet first, so its own `shadow.color` wins.
  - **The list items:** the list-item package has no shadow-colour token (the bridge refuses `shadow.color` on `list-item.default`), so a dragged item draws the elevation package's default. Whether that default should be surface-tint is a design question.
- **Evidence:** [`probe-colours-and-drag.txt`](checks/probe-colours-and-drag.txt), the `RF70-COLOURS` blocks of both builds.
- **Required property:** each component draws its elevation layers in the shadow colour that its own token package gives, and a component without one draws the colour that the architect decides.

### reviewer-3 — In Firefox, the resting list items paint their zero-size layers at the rounded corners, and the penumbra adds a third

**Tier A. Made slightly worse by the change. To the architect.**

- **Current behaviour:** at rest (level 0), Firefox paints the `0 0 0 0` layers at the corners of each item's rounded box. On the base, the two layers (umbra and ambient) change 84 px of the resting list, by at most 19 per channel, against the same list with every layer set to `none`. The branch's penumbra changes 48 more, 16 at the four corners of each kind (static, button and link), by at most 3 per channel. The result is deterministic across three runs of each build. In Chromium and WebKit, the resting list is byte-equal to the list without layers, on both builds.
- **Why it is a problem:** the list item's tokens give level 0 at rest, which draws no shadow, and Firefox draws a faint one at the corners. `RF-70`'s required property asks for the three layers _at one elevation level_, which at level 0 includes this, and its _Affected_ line speaks of levels above 0. Whether a level-0 box draws its layers is the architect's question, and not the implementer's.
- **Evidence:** [`screenshots.txt`](checks/screenshots.txt), and the PNGs [base](checks/png/firefox-list-base.png), [head](checks/png/firefox-list-head.png) and [no layers](checks/png/firefox-list-no-layers.png).
- **Required property:** in every engine, a component at level 0 renders as it does without elevation layers.

### reviewer-4 — The record's cause for the unrelated size rows names the FAB's stylesheet, and the first mention is the list's interactive box

**Tier C. To the implementer.**

- **Current behaviour:** the dated paragraph says _"the FAB's stylesheet now mentions `--_elevation-penumbra` earlier"_. In `collect-props.ts`'s file order, the first stylesheet that mentions `--_elevation-penumbra` is:
  - on the base: `core/styles/elevation/elevation.css.ts`, file 15, where the penumbra is name 194 of 227;
  - on the head: `list/styles/item/interactive-box.css.ts`, file 3, where it is name 95, between `--_indicator-outline-offset` and `--_top-space`.

  The FAB's `default/main.css.ts` is file 12. Slot `c` at `966ec0354` gives the same file 3.

- **Why it is a problem:** the mechanism is right and the measurement is right, but a later reader who looks for the move in the FAB's stylesheet won't find it.
- **Evidence:** [`sizes-and-names.txt`](checks/sizes-and-names.txt).
- **Required property:** the record names the stylesheet whose first mention moved.

### reviewer-5 — The record says a pointer drag doesn't lift the link item in any engine, and WebKit lifts it

**Tier C. To the implementer.**

- **Current behaviour:** the dated paragraph's row bullet says the link item _"is read at its resting level, because a pointer drag doesn't lift it"_. Its _Seen_ item says the drag doesn't lift it _"in any of the three engines"_. WebKit lifts it under the row's own gesture (`reviewer-1`). The link item's row compares the layers at level 0, where all three are zero-size. Before the fix, the row failed on `none` against `0px 0px 0px 0px`, which changes no pixel in Chromium or WebKit (`reviewer-3`). The interactive-box stylesheet is read at a raised level by the button item's row: `m1b` fails both rows.
- **Why it is a problem:** the record's reason for the resting read is false in one engine. The record also doesn't say that the link item's row proves the link item draws the penumbra declaration, and not a raised rendering.
- **Evidence:** [`link-drag.txt`](checks/link-drag.txt), [`mutations.txt`](checks/mutations.txt).
- **Required property:** the record states the engines in which the drag doesn't lift the link item, and what the resting row proves.

## Not found

No defect in the three declarations, their order or their comments. The row is in `tests/core/`, which mirrors `src/core/styles/elevation`. It has the `spec` suffix and the project's routing, a `describe` per unit and `should` names. It enters the drag state through real pointer input. A missing contract, state or token fails it.

## Scratch work

The exports, their builds and the probe outputs are in this session's scratchpad. They are removed after this report is committed, apart from what this directory now holds.