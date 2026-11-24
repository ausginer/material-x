# Feature proof: `mx-card` (PR #213, `RD-53`)

**Read at** `34bcd4e75` on `material-x/card-1`, against [`repo:RD-53`](../../00-index.md), `repo:RD-47`, the [plan](../../card-1/card-plan.md) with its probe and reading, and the [implementation report](../../card-1/card-report.md). Issue #171. The base is `main` at `92a386a17`. `main` is at `3aef04f7e` now, which adds records only, `RF-122` and `RF-123` among them. Reviewer: Claude, a feature-proof pass that didn't implement the unit, on the coordinator's task of 2026-11-23.

**Verdict:** the plan's properties hold on the built element in Playwright's Chromium, Firefox and WebKit, the tokens read are the plan's, `mx-list-item` renders as before, and the slot's two resets do what the report says and nothing else. There are four findings: two Tier A, one Tier B and one Tier C. One of the Tier A findings is in this element's layout, for a card that is smaller than its content (`reviewer-1`), and it is a design question. The other is a package-wide pattern that the card joins (`reviewer-2`). The Tier B and Tier C findings aren't defects in the source. The `chromium` job's one failure is the missing baseline.

**Scope:**

- **Rerun in slot `f`,** detached at the commit, with the package builds made again, one engine at a time: `tests/card` without the visual file, `tests/core/elevation.spec`, `tests/list`, `traits-baseline` and `package-entries`. Chromium 304 passed, Firefox and WebKit 299 passed and 5 skipped each. Typecheck of material-x passes.
- **Mutations:** 49, all in Chromium, Firefox and WebKit, restored after each ([reading](checks/mutations.txt), [script](probes/mutate.mjs.txt)).
- **Probes of this pass,** in [`probes/`](probes/): the leak, the geometry, the list items' parity, the painted layers and forced colors. Each ran as a file in the package's test tree, or as a script beside its Vite config, and was removed.
- **Read from CI:** run `45256318216`, its `chromium` job. One test of 3293 failed, `card.visual.browser.test.ts`, with _"No existing reference screenshot found"_.
- **Not run:** the visual project, Safari, a mobile browser and Edge. `docs-build`, `docs-smoke`, the size rows, format, lint and publint. The whole material-x suite was not rerun here, and CI's `firefox` and `webkit` jobs passed on the head. Disabled states were read at rest only. Under press, Chromium changed the dump in 17 of 80 cases, and Firefox and WebKit in 58, so the press reading is weaker in Chromium. The 80-case hover pass changed no dump, so it isn't counted: hover rests on the 12-case pass, and on the rules read, which covers every state.

## The plan's properties

| Property | Holds | Evidence |
| --- | --- | --- |
| Surface: `variant`, one slot, four CSS properties, no event, part or role | Yes | The source, the shadow tree row, and the geometry probe: no role attribute, `tabIndex` -1 |
| The host is the box, and the shadow root holds only the slot | Yes | The shadow tree row. Wrapping the slot in an element fails 4 rows |
| The slot draws the padding and the outline, and a universal reset changes neither | Yes | The inset and the outline rows under the reset. The report says that the host's outline under the reset wasn't read. It is `none 0px` in the three engines, and the slot's is `solid 1px` ([geometry](checks/geometry.txt)), so the plan's reason holds for the outline too |
| They cover a host that the layout stretches | Yes | Grid, flex row, `block-size` and `min-block-size` larger than the content: the slot's box is the host's box. See `reviewer-1` for the other direction |
| The outline takes no layout space, and `variant` moves nothing | Yes | 200×72 for the three variants. A slot border instead of the outline fails 5 rows |
| The outline stays visible in forced colors | Yes, in Chromium and Firefox | `mx-card` itself, with forced colors emulated: `solid 1px` in a system color. WebKit matches the query under emulation but doesn't force any color, so it isn't evidence there ([reading](checks/forced-colors.txt)). The report read the declarations only |
| The three boxes draw the elevation | Yes | Level 1 in the card's own tokens. One `box-shadow` list fails 3 rows. See `reviewer-3` for what the rows can't see |
| Filled and outlined paint nothing at level 0 | Yes | 4 rows. A constant level 1 fails the four |
| `variant` selects a custom state, and a change replaces the previous one | Yes | Keeping the old state fails 2 rows |
| The content inherits the page's text color and font | Yes | The geometry probe, in the three engines |
| No role, no tab stop, no ARIA. What the consumer sets stands | Yes | The accessibility rows, Chromium only. The focus rows, in the three engines |
| Tokens read | Yes | The generated CSS of the three packages: `container.color`, `shape`, `elevation`, `shadow-color`, and `outline.color` and `outline.width` for the outlined card. Nothing of `icon.*`, the deprecated tint or the interaction groups. Each value is the store's reference of the same name |
| All four CSS properties override what they name | Yes | A mutation of each fails its rows |

## The slot's resets

The probe renders 168 cases, every element in its variants and disabled, checked, error and selected states, inside each of the three cards and beside an identical control that isn't a card. It compares 48 computed properties of the host, every shadow descendant and both pseudo-elements. Then it sets each of the 12 private properties that the card's host carries to a value no component uses, one at a time, on the control ([reading](checks/leak.txt), [every rule's reads](checks/leak-rules.txt)).

- **With the resets, no case differs,** in any of the three cards, in the three engines. The same holds for 80 cases under focus and press (which change the dump in 70 to 77 and in 17 to 58 cases), and for 12 under a real hover, where removing the resets makes the affected cases differ.
- **What they do for content:** without them, 80 cases differ in an elevated card, and 4 in a filled or an outlined one. The 4 are the unchecked checkbox, and the others are the buttons and groups that set no level. The counts are the same in the three engines.
- **No other private property leaks.** Of the 12, only `--_level` (76 cases) and `--_container-color` (4 cases) change any computed style when an ancestor sets it. The rules read shows that each element that reads another one declares it on its host, or reads it only in the state that declares it.
- **For the card,** the resets are on the slot, and the card's rules read both properties on the host. Every row of the card passes, and no computed style of the card differs.
- **What the report calls unmeasured:** a checkbox in a resting `mx-list-item` is filled with `rgb(247, 251, 234)`, and a filled button in an `mx-list-item` at level 8 draws its shadow. Both are in the three engines ([parity](checks/parity.txt)). They are `RF-122`, on `main` since `3aef04f7e`, which agrees with this pass and says that the repair removes the card's resets. Nothing is left to route.

## `mx-list-item`

The full computed style of the item, its shadow tree and pseudo-elements, and a screenshot, for `mx-list` and `mx-sortable-list`, 3 contents, and 7 conditions (rest, level 1, level 8, focus, a universal reset at level 3, its own shape at level 3, RTL). The sources of `src/list` at `92a386a17` against the head. The 42 rows of `mx-list-item` are identical in the three engines. The only rows that differ are `mx-list-button-item`'s under focus in Chromium and Firefox. That element adopts neither changed file, and head against head differs in rows of the same kind ([reading](checks/parity.txt)). The drag rows of `elevation.spec` pass unchanged. Taking the shared stylesheet from the item fails 2 rows.

## Do the rows fail without what they guard

- **The seven recorded witnesses reproduce,** in the three engines. `padding on the host` also fails the stretch row here, because this pass's mutation of the same name leaves the slot without its padding.
- **Rows that mutations can't fail, and why that is right:** the outline rule in every variant (`outline in every variant`) changes nothing, because the filled and elevated cards have no `--_outline-width` and the declaration is invalid. Unscoping the tokens too fails 4 rows. Not importing `elevation.runtime.ts` in `card.ts` changes no row, because the other components of the files register the property. Reading more tokens changes none of the card's rules. The plan asks for no row on it, and the generated CSS above answers it.
- **`delegatesFocus`:** a card whose shadow root delegates focus passes every row, because _should not focus the card_ has no focusable content. It is a limit of one row, and the source doesn't delegate.
- **Accessibility tree rows** run in Chromium only, as the plan says. An internals role or an `aria-hidden` fails none of Firefox's or WebKit's rows.

## Findings

### `reviewer-1` — Tier A: the outline leaves the container when the card is smaller than its content

- **Finding:** the slot doesn't shrink (`flex: 1 0 auto`), so when the consumer's layout gives the card a smaller block size than its content needs, the outline is drawn around the slot's box and not the card's.
- **Current behavior / contract:** plan property 1 says that the card's _"Size comes from the content or from the consumer's layout"_, and that the host is the card's box. Property 3 says that the content is inset 16px from the container's edge. Property 2 covers only a host that the layout stretches, and no row reads the other direction.
- **Why it is a problem:** an outlined card in a fixed grid row or with `max-block-size` draws its container's color to one edge and its outline past it. A card that scrolls (`overflow: auto`) carries the outline away with the content.
- **Evidence:** in the three engines ([geometry](checks/geometry.txt)), an outlined card with `block-size: 40px` and 40px of content is a 200×40 host with a 200×72 slot, which draws the outline. With `max-block-size: 100px; overflow: auto` and 400px of content, the slot is 432px high, and after a scroll of 120px its box starts 120px above the host's. The filled and elevated cards have no outline, and their padding overflows with the content.
- **Required property:** what the card promises for a card smaller than its content is stated. If the outline is promised, it is around the host's box there too. **Routed:** which one it is, is an architectural choice, because it bounds what a consumer may do with the card's size.

### `reviewer-2` — Tier A: `hidden` doesn't hide `mx-card`, as it doesn't hide `mx-list-item`

- **Finding:** `<mx-card hidden>` computes `display: flex` and keeps its box, 200×72, in the three engines, because `:host { display: flex }` beats the user agent's `[hidden]` rule. `mx-list-item` computes the same on `main`. No stylesheet in `src` has a `[hidden]` rule, and no record mentions it.
- **Why it is a problem:** the `hidden` attribute is a global attribute, and a consumer that filters cards with it sees nothing happen. The other elements of the package were not read.
- **Evidence:** [geometry](checks/geometry.txt).
- **Required property:** whether `hidden` works on an `mx-*` host is stated once for the package. **Routed:** a package-wide matter that predates this unit, so it shouldn't hold #213.

### `reviewer-3` — Tier B: the elevation rows can't see whether the umbra and ambient boxes are painted

- **Finding:** `renderedLayers` reads `getComputedStyle(box, '::before').boxShadow`, which is the declared value whether or not the pseudo-element is generated or placed. So the three rows that read the layers (the card's two and the list item's) pass with two of the three boxes missing.
- **Current behavior / contract:** the plan requires that _"an elevated card draws the three layers"_, and that sharing the stylesheet leaves `mx-list-item` as before, with its rows passing unchanged as the check.
- **Evidence:** removing `content: ''`, `inset: 0` or `border-radius: inherit` from `host-box.styles.css` passes 272 of 272 rows in Chromium, and 267 with 5 skipped in Firefox and WebKit ([mutations](checks/mutations.txt)). Each of the three changes the painted elevated card and the painted list item at level 8, in the three engines ([paint](checks/paint.txt)).
- **What else would see it:** `card-variants.png`, once recorded, in Chromium, for the card. Nothing for `mx-list-item`, which has no visual file. The technique predates this unit, for the `.host` components too. What is new is that the shared rules now carry two components on it, and the list item's unchanged rows are cited as the proof of its rendering. The proof above stands in for them at this commit.
- **Required property:** a row fails when the umbra or ambient box of a host-box component isn't generated or doesn't cover the host's box.

### `reviewer-4` — Tier C: the outline's reset row fails under no mutation of its own

- **Finding:** the report says that the outline-on-the-host witness _"prove[s] where the outline is drawn and not that the reset removes it"_, and that the host's outline under the reset wasn't read, while the plan states the witness as _"the row fails with the padding or the outline on the host"_. The report discloses this. So _should keep the outline under a page's universal reset_ fails under the mutation, but so does the row without the reset, and no mutation fails the reset row alone.
- **Why it is a problem:** the reset row adds no discrimination over the plain one, and the record had no reading of the property until now. The property itself holds: the reading above (`none 0px` on the host, `solid 1px` on the slot).
- **Required property:** the record holds the reading that the property rests on. **No source change follows from it.**

## Checked against the record

- `RF-77` and `RF-78` are on the base, as the plan says. The elevated card draws its own shadow color, and the red row fails without `shadow.color`.
- `files.json`, `package.json` and `react.ts` have the entry, `package-entries` passes, and `material-x` typechecks.
- Not owed by this unit, and not here: `architecture.md`, `accessibility.md` and the README, which the plan puts in their own pull request.