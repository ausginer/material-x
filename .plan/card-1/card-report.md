# `mx-card` — implementation report

**Written by the implementer on 2026-11-23,** on the coordinator's task for #171, on `material-x/card-1` from `ccf5a4fef`. It implements the [plan](card-plan.md) and `repo:RD-53`. No property of the plan failed in an engine, and the list item's rows pass unchanged, so the stopping boundary wasn't reached.

## Outcome

- **Source:** `packages/material-x/src/card/`, with the element, the template, three token packages and the styles. `src/core/styles/elevation/host-box.styles.css` holds the host-box elevation rules that `static-box.styles.css` had, and `mx-list-item` and `mx-card` adopt it. `files.json`, `package.json` (`files` by hand, `exports` by the build) and `react.ts` have the entry.
- **Docs of the component:** JSDoc, `card.stories.tsx` and `card.mdx`.
- **Tests:** `tests/card/` and new rows in `tests/core/elevation.spec.browser.test.ts`. `CardLike` joins the `traits-baseline` trait list, so each element of the snapshot gains one line.

## What the plan doesn't state

**The slot resets two custom properties that the content would inherit.** A component's custom properties inherit into slotted content. Without the resets, every button that sets no level of its own (filled, tonal, outlined and text) draws an elevated card's shadow, and an unchecked `mx-checkbox` paints the card's container color. A probe compared each component's computed styles inside and outside a card, at rest and in Chromium only. It found 99 differences without the resets. With `--_level: 0` on the slot, only the checkbox's remained, and `--_container-color: initial` is for that one. Each reset has a row with a witness. Other states (hover, pressed, disabled) weren't probed.

**The same inheritance exists outside the card:** `mx-list-item` declares `--_level` and `--_container-color` on its host, so a button or a checkbox in a lifted item can inherit them. This follows from the source and wasn't measured. This unit doesn't change it.

**`hidden` doesn't hide an `mx-card`,** because `:host { display: flex }` beats the user agent's `[hidden]`. No material-x stylesheet has a `[hidden]` rule, so it is a question for the whole package. Read from the source, not from a browser.

## Verification

- **Tests:** the whole material-x suite, with no visual project, one engine at a time: Chromium 1065 passed and 2 expected fail; Firefox 1051 passed, 3 expected fail, 13 skipped; WebKit 1052 passed, 2 expected fail, 13 skipped. The stretch row was repaired after that run, and `tests/card` with `tests/core/elevation.spec` then passed in the three engines.
- **Witnesses:** [seven mutations](checks/witnesses.txt), each in the three engines. The stretch row passed under its mutation at first, and the repaired row fails. With the outline on the host, the rows fail because they read the slot, so they prove where the outline is drawn and not that the reset removes it. `checks/card-box.txt` reads the host's padding and border under the reset, and not its outline.
- **Level 0:** the outlined card's fixture sets a transparent outline. In Chromium, two screenshots of the unchanged card differed by 1 per channel at the rounded outline, and none differed without the outline.
- **Forced colors:** a probe of the slot's outline declarations, not of `mx-card`, in Chromium computes a solid 1px outline in a system color. Firefox and WebKit weren't read.
- **Docs:** `docs-build` and `docs-smoke` pass, 117 of 117 pages. The stories were viewed: variants in WebKit, full-bleed media in Chromium, content with actions in Firefox.
- **Format, lint, typecheck and publint** pass for the changed files.
- **Not run:** the visual project, which runs in CI only (`repo:RD-13`), and Safari. `card-variants.png` has no baseline, so the gate's `chromium` job fails until the owner records it.

## Size

Brotli bytes from `size-limit`, built at `ccf5a4fef` and at the implementation with the same tools. No limit applies. The other rows move by 37 bytes or less. The pass didn't look for the cause of each.

| Row              | Before | After | Change |
| ---------------- | ------ | ----- | ------ |
| `card/card`      | —      | 1339  | new    |
| `complete`       | 22746  | 22913 | 167    |
| `list/list-item` | 2848   | 2852  | 4      |

## Owed

- **The owner:** records the baseline, by adding the label `record-baselines` to the pull request and merging the proposal from `baselines/material-x/card-1`. Before adding the label, the owner reads the branch's changes under `.github/`: there are none.
- **After the merge:** the plan's documentation unit.

## Disposition of the feature proof at `2ab9738ee`

**Dated 2026-11-23 by the implementer,** on the coordinator's task, for `reviewer-3` and `reviewer-4` of the [feature proof](../reviews/card-1/feature-proof-claude.md). Only tests and this record change. `reviewer-1` goes to the architect, and `reviewer-2` is `repo:RF-121` (#215). Neither is touched.

- **`reviewer-3`: accepted, repaired.** Four rows in `elevation.spec.browser.test.ts`, _should cover the host's box with the umbra/ambient of `mx-card`/`mx-list-item`_, read the pseudo-element's box and not its `box-shadow`: that it has one, that it is absolutely positioned at the host's edges with the host's size, and that it has the host's radius. The host is 200×80 with a shape of 10px set through the public property.
  - **Witness:** without `content`, `inset` or `border-radius`, or either `position`, all four rows fail and no other does. With the box of one pseudo-element removed, that pseudo-element's two rows fail, alone.
  - **Limit:** the rows read the layout box. A layer that has its box and isn't painted for another reason, such as `visibility`, `opacity` or `z-index`, passes them. They name the two host-box components, so a third one needs a case of its own.
- **`reviewer-4`: accepted, repaired in the row.** `outlineOf` now reads the outline of whichever of the host and the slot draws one. With the outline on the host, only _should keep the outline under a page's universal reset_ fails, where three rows failed before, so the row now proves that the reset doesn't remove the outline. The plan's witness, _"the row fails with the padding or the outline on the host"_, holds for the outline through this row alone.
  - **The reading that the property rests on** is the proof's: under the reset the host's outline is `none 0px` and the slot's is `solid 1px`, in the three engines ([geometry](../reviews/card-1/checks/geometry.txt)). It replaces the statement under _Verification_ that the host's outline wasn't read and that the rows don't prove the reset.
  - **The change's other effect:** _should render no outline_ on the filled and elevated cards now reads the host too.
- **Readings:** [every mutation's failing rows](checks/witnesses-2.txt), in Chromium, Firefox and WebKit, by [`mutate.mjs`](probes/mutate.mjs). Its first group is the unchanged source: `tests/card` with `tests/core/elevation.spec`, 65 passed in Chromium, 62 passed and 3 skipped in Firefox and in WebKit. `outline drawn outside` and `slot does not stretch` still fail their rows.
- **Checks:** format, lint and the typecheck of material-x pass for the changed test files.
- **Not run:** the rest of the suite, the visual project and Safari.

## Disposition of `reviewer-1`, implemented 2026-11-24

By the implementer, on the coordinator's task, on the [plan's disposition](card-plan.md#disposition-of-reviewer-1-the-host-draws-the-outline-and-the-whole-shadow). `origin/main` at `a4dee53d8` was merged first, as `e3d67d578`. Each declaration holds in Chromium, Firefox and WebKit, and no other list item's row changed its expectation, so the plan's stop wasn't reached.

- **Source:** the host draws the outline, `!important` and not while `:focus-visible`. The slot's `border-radius` is gone. `host-box.styles.css` is one `box-shadow` list with `position: relative`. JSDoc and `card.mdx` state the limits and the smaller or scrolling card.
- **`RF-123` (#219):** nothing in the card's source or tests had to change. Both name private properties as `--_x`, and only the build renames them. `elevation-overflow.ts` reads the built names with `\w+`, which `--mx-a` doesn't match, so the copy for this reading uses `[\w-]+`.
- **Tests:** `reviewer-3`'s four rows are replaced by two, which read that the pseudo-elements of an elevated card and of a lifted list item generate no box. `renderedLayers` reads the three shadows of a host box from its list, in order, and fails for any other number, so the rows that use it keep their text. The lifted list item's gesture moved into a helper, `lift`, with the same assertion.
- **Two rows on the corners:** the row that compared the slot's corners with the host's is removed, because on the host it would compare the host with itself. The container's shape has its row per variant. The row for `--md-card-container-shape` reads the host only.
- **Witnesses** ([reading](checks/witnesses-3.txt), [script](probes/mutate-3.mjs)): 16 mutations and a control, in the three engines.
  - The outline on the slot fails the row for the host's outline, the row for the slot's and two more. Without `!important` only the reset's row fails. Without `:not(:focus-visible)` only the two focus rows fail.
  - The padding on the host fails only the three reset rows, and a slot that doesn't stretch only the percentage row.
  - Each layer taken away, and another order, fails the card's and the lifted list item's rows. A box on either pseudo-element fails only its two rows. Without `shadow.color` only the red row fails.
  - **One mutation passes:** no `position: relative` on the host. `reviewer-3`'s rows read it through the pseudo-elements' boxes, and nothing in the card is positioned against the host now. The plan keeps the declaration and gives it no row.
- **The built elements:** [with an overflow](checks/elevation-overflow-built.txt) ([script](probes/elevation-overflow-built.ts)) the card at levels 1 and 3 and the list item at 1 and 8 differ from the same element without one in 0 pixels, in the three engines. The [outline](checks/outline-owner-built.txt) (the first candidate of `outline-owner.ts`, whose label still says _slot_) covers all four edges of a smaller card and of one scrolled to 0, 120 and the end.
- **Checks:** the suite without the visual project, one engine at a time: Chromium 1069 passed and 2 expected failures; Firefox 1055 passed, 3 expected failures and 13 skipped; WebKit 1056 passed, 2 expected failures and 13 skipped. Format, lint, typecheck, publint and `docs-build` pass, and `docs-smoke` passes 117 of 117 pages.
- **Size, Brotli,** before and after on the merged tree: `card/card` 1341 to 1321, `list/list-item` 2876 to 2847, `complete` 23068 to 23036. No other row moves.
- **Not run:** the visual project and Safari. `card-variants.png` still has no baseline, and it is the owner's to record.
- **Next:** the reviewer's recheck of the changed rows and the two stylesheets.

## Disposition of the recheck, implemented 2026-11-24

By the implementer, on the coordinator's task, on the [plan's disposition](card-plan.md#disposition-of-the-recheck-the-host-draws-the-padding-too). `origin/main` at `dbdae0a98` was merged first, as `39c41d3cf`. Each declaration holds in Chromium, Firefox and WebKit, and no list item's row changed, so the plan's stop wasn't reached.

- **Source:** the host is a `flow-root` and draws the padding, with `box-sizing: border-box`, both `!important`. The slot keeps its two resets and nothing else. JSDoc and `card.mdx` carry the words of `reviewer-6` and `reviewer-7`, and JSDoc says that a page's `padding` doesn't apply.
- **The two resets hold on a slot without a box:** the content inherits from the slot in the flat tree. Without either, only its own row fails, in the three engines.
- **Rows:** the plan's nine, as twelve tests, because the page's padding is read per variant and the page's outline on two. The scroll row subtracts a classic scrollbar, through `clientWidth` and `clientHeight`.
- **Witnesses** ([reading](checks/witnesses-4.txt), [script](probes/mutate-4.mjs)): 29 mutations and a control, in the three engines. Every mutation fails at least one row, and the engines fail the same rows, apart from _own outline color ignored_, which fails a level-0 row in Chromium too. Each of the plan's witnesses fails the row it names. Three fail others as well:
  - A block slot that draws the padding fails the end of the scroll, and also the three rows on the page's padding, because the page's `padding` is added to the slot's. The same holds for a slot that scrolls.
  - A slot as a block on a host that keeps its padding fails the percentage row and the end of the scroll.
  - The outline drawn outside, or on the slot, also fails the rows on `outline-offset` and on the click.
- **`no position on the host`,** which passed before, now fails the containing-block row, alone.
- **The built element** ([padding](checks/padding-owner-built.txt), [script](probes/padding-owner-built.ts)): the scrolled cases equal the `div`'s, and 0 of 18 screenshots differ from the layout before, emulated by a stylesheet on the built card, in the three engines. The recheck's focus probe paints an indicator in the same cases ([reading](checks/focus-built.txt)), and the end of an inline scroll is 16px. The count of changed pixels differs in _smaller, tabindex_, in Chromium and WebKit. The cause wasn't read.
- **Not stated by the plan: the host can't be smaller than its padding.** The recheck's box probe has a case of `block-size: 10px`, and the card is 32px high there, where it was 10px with the padding on the slot. A `div` with `padding: 16px` and `border-box` is the same: with that padding on the probe's reference, no pixel of this case differs ([reading](checks/box-padded-reference.txt)), and the card is as high as in the reference. The other 12 cases equal the reference, by at most 1 pixel by 2 of 255 in WebKit. The plan's property 2, _"a size that the page gives the card includes the padding"_, holds from 32px up, and its _"Nothing else changes"_ doesn't list this case. It isn't an engine difference, so the work wasn't stopped. **The architect's, with the recheck.**
- **Checks:** the suite without the visual project, one engine at a time: Chromium 1081 passed and 2 expected failures; Firefox 1067 passed, 3 expected failures and 13 skipped; WebKit 1068 passed, 2 expected failures and 13 skipped. Format, lint, typecheck, publint and `docs-build` pass, and `docs-smoke` passes 117 of 117 pages. Lint doesn't apply to Markdown, MDX or the `.plan` probes.
- **Size, Brotli,** before and after on the merged tree: `card/card` 1323 to 1314, `complete` 23063 to 23066, `list/list-item` 2838 and unchanged. No other row moves.
- **Not run:** the visual project and Safari. `card-variants.png` still has no baseline, and it is the owner's to record.
- **Next:** the reviewer's narrow recheck that the plan owes.