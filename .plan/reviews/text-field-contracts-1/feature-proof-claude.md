# Visual contracts for the text fields, each disabled part at its own opacity — feature proof

**Files were read at:** `256977dbc`, the head of #160 (`material-x/text-field-contracts-1`), in slot `f`. The base is `main` at `6a67badfd`, the head's parent. The tree was clean apart from the scratch probes and changes this record names. Each probe was copied into `packages/material-x/tests/text-field/` for its run and removed after it. Each scratch change was reverted. The comparison readings replaced the paths they name with their text at `6a67badfd`, or at the in-memory merge with #155, and the head was restored afterwards. Core and every measured package were last built from the head. Browsers: Playwright 1.65.0's Chromium, Firefox and WebKit, with Node 26.13.1.

**Subject:** `repo:RF-82`, `repo:RF-79`, `RF-81`'s prefix and suffix bullet and its populated-label bullet, and `repo:RD-34`, in [`00-index.md`](../../00-index.md), with the implementer's dated paragraph under each. The evidence is in [`text-field-contracts-1/checks/`](../../text-field-contracts-1/checks/), and the diff is `6a67badfd...256977dbc`. The coordinator asked me to:

- apply the `test-visual-contract` rules;
- test the implementer's claims;
- judge only the shape of the populated label's `it.fails` row, because the difference itself and three seen items go to the architect.

**Verdict: the contracts and `RF-79`'s fix hold, and every figure in the record reproduces.** I have two findings, both tier B:

- `reviewer-1`: the new file sets the error state through `setValidity()`, which #155 deletes. Whichever of the two pull requests merges second breaks 16 error rows in each engine on `main`, and `main` doesn't require an up-to-date branch.
- `reviewer-2`: the `it.fails` row isn't the right shape. A missing oracle passes it, and a repair that the line-box arithmetic predicts turns it red in WebKit only.

Neither is a defect in the components.

## Scope

**Covered.**

- **The diff.**
  - **The bridge** registers `text-field.error`, `.disabled`, `.outlined`, `.outlined.error` and `.outlined.disabled`. Each is the production signal of `text-field/styles/default/tokens.ts` or `outlined/tokens.ts`, beside `text-field.default`.
  - **`utils.ts`** admits `outline.opacity`.
  - **`.notched-outline`** no longer takes `opacity`. Its background and its `border-block-end` mix `--_container-color` and `--_active-indicator-color` at their own opacities through `color-mix()`, and the outlined notched border mixes `--_outline-color` at `--_outline-opacity`.
  - **`disabled.styles.css`** gives the input, the label, each icon and the support row and counter their own opacities. The icons and the supporting text keep reading their own colour tokens through their base rules (`.lead`, `.trail`, `.support, .counter`). The outlined field's `.notched-outline` has `background: none`.
  - **The prefix and the suffix** take `--_input-text-prefix-color` and `--_input-text-suffix-color` and the input's typography, as `RF-81` rules.
- **The rows aren't circular.**
  - Every expectation comes from `resolveTokenContract` on the production packages.
  - Every observation is the browser's own: a computed `color`, `background-color`, `border-block-end-color` or width, a font property on the rendered part, or a `DOMRect`. No row reads a generated `--_*` property.
  - A colour is read as painted, its alpha times the computed `opacity` of the element and of every flat-tree ancestor up to the document. So a dimmed ancestor can't hide a wrong part. Token colours are resolved in a probe (`resolveComputed`).
  - The lengths in the edge, typography and corner rows compare a computed string with the token's string (`'1px'`, `'16px'`). That holds while the tokens are written in `px`.
- **The rows pass at the head** ([`rows.txt`](checks/rows.txt)): 156 per engine, of which 2 are the filled `it.fails` rows and 2 the skipped outlined ones. That is 456 passed, 6 expected fail and 6 skipped in the three engines.
- **The witness.** With `packages/material-x/src/text-field` at `6a67badfd`, exactly the 8 disabled colour rows the record names fail in each engine, 24 in all. These are the input text in both variants, the filled active indicator and the outlined outline, for both fields. On that tree the two outline rows fail because the package renders no `outline.opacity`, so the bridge throws _Missing token_. So I also ran `main`'s stylesheets with the head's `utils.ts`, where the token is rendered. The same 24 rows fail, and the outline row fails on the drawing: `[25, 29, 19, 0.04]` against `[25, 29, 19, 0.12]`. That settles `RF-79`'s _not established_, as the implementer says.
- **The whole material-x run,** browser and spec projects, three engines: 2188 passed, 7 expected fail, 10 skipped. That is the record's figure.
- **Sizes** ([`sizes.txt`](checks/sizes.txt)). `just size-reading` at the base and at the head reproduces both committed readings in all 33 rows. These include `text-field/text-field` +17, `text-field/multiline-text-field` +44 and `complete` +91. A second head reading is byte-identical. The map gains one name, `--_outline-opacity`. After mapping the head's short names back to the base's, every built material-x `.js` file equals the base build, except `text-field/styles/default/main.css.js` and `text-field/styles/outlined/main.css.js` ([`remap.ts`](probes/remap.ts)). So the rows that import no text-field stylesheet move by renaming only, which answers the record's _"Which name moves each row isn't read"_ for all of them at once.
- **`RF-82`'s row list** is met for the states it names, with three limits:
  - The edge rows run at rest, hover, focus and disabled, and not in error. The error hover and focus states are read by no row. The implementer's seen item (3) is the difference such a row would find.
  - The outlined field's container has no colour row: it draws `background: none`, and no outlined token gives a container colour.
  - The counter shares the support row's opacity rule and has no row of its own.

**Not covered.**

- Real Safari, and the visual project, which runs only in CI.
- The seen items and the populated label's difference, which go to the architect.
- The `before` transcript's two lint-only helper repairs, which I didn't diff.

## Findings

### reviewer-1

**Tier B.** The error rows enter the error state through `setValidity()` and `checkValidity()`, which #155 deletes. Whichever pull request merges second leaves `main` with 16 failing rows in each engine.

- **Current behaviour.** `enter(field, 'error')` calls `field.setValidity({ customError: true }, 'Error')` and then `field.checkValidity()`, which on `6a67badfd` sets `:state(error)`. #155 (`material-x/form-validation-1`, at `8c1415490` when read) deletes `setValidity` and the toggle, and the error display follows the `error` attribute only.
- **Observed.** `git merge-tree` merges `256977dbc` with `8c1415490` without conflict, into `bad84643d`. With that tree's `packages/core` and `packages/material-x` in slot f, and core built, the spec file fails 48 rows in the three engines. They are the 16 error colour rows per engine, every part in both variants and both fields, each with _"TypeError: field.setValidity is not a function"_ ([`merge-with-155.txt`](checks/merge-with-155.txt)). The file's local `FieldElement` type declares `setValidity` itself, so the typecheck doesn't report it.
- **Why it is a problem.** `main`'s ruleset has `strict_required_status_checks_policy: false` and requires `verify` only. So the second pull request can merge on checks run against its own base, and `main`'s spec project then fails.
- **Required property.** On `main`, after both pull requests have merged in either order, the error rows put each field into its error state through the API that `main` has, and pass in each engine.
- **Routing.** To the coordinator, who orders the two merges. The pull request that lands second carries the change.

### reviewer-2

**Tier B.** The populated label's `it.fails` row can't tell when the difference is gone, and a missing oracle passes it.

- **The row.** _"should centre the populated label in its line below the top padding"_, filled variant, both fields. It asserts with `toBe` that the label span's `DOMRect` centre sits `container.focus.padding.block` + `label-text.populated.line-height` / 2 below `.notched-outline`'s top, which is 16 px. It is marked `it.fails` in the three engines.
- **The engines differ today.** The centre reads 14.625 px in Chromium, 15.0083 px in Firefox and 15 px in WebKit, for both fields ([`populated-label.txt`](checks/populated-label.txt), [probe](probes/label-centre.spec.browser.test.ts.txt)). The span's rect is 14.25 px tall, its content area, not its 18 px line box. So the reading includes each engine's font metrics and rounding, and the record quotes Chromium's figure only.
- **A repair isn't seen in two engines.** The record's arithmetic puts the difference at (18 − 16) / 2 = 1 px. With the populated label moved down 1 px, the centre reads 15.625 px in Chromium, 16.0083 px in Firefox and 16 px in WebKit. The row then fails in WebKit only, and stays green in Chromium and Firefox ([`fails-shape.py.txt`](probes/fails-shape.py.txt)). A 1.375 px move, Chromium's own figure, turns 2 of the 6 rows red and leaves 4 green.
- **A missing oracle passes it.** With the row's `label-text.populated.line-height` renamed to a token that doesn't exist, `resolveTokenContract` throws, and all six rows still report _expected fail_. The `test-visual-contract` rule is that a missing package, state or token is a failure, never a passing no-op. `it.fails` turns any throw into a pass.
- **Why it is a problem.** The row is the comparison that `RF-81`'s ruling asks for, and its job is to fail once the difference is gone. In Chromium and Firefox it would stay green after the repair the record's arithmetic predicts, and it stays green when its oracle disappears.
- **Also,** `RD-8` asks that an expected-failure row cite its finding's address. The row's comment says _"reported, not yet registered"_, so it owes that address once the architect registers the difference.
- **Required property.** The row fails in each engine once the populated label sits where the tokens put it, within that engine's layout precision. It fails, and doesn't pass, when its oracle is missing.
- **Routing.** To the implementer for the row's shape, and to the architect with the difference they are registering, since the row has to cite it.

## Recheck of the remediation, 2026-11-22

**Files were read at:** `0eee212bd`, the head of #160, in slot `f`. Its parent `ad662b00d` merges `main` at `23b245efb`, which has #155. `origin/main` is now `c5da3821c` (#161), and `git merge-tree` merges it with the head without conflict. Core and every measured package were built from the head before each test run, and the tree was clean after each step. The browsers and Node are the ones named above, with Vitest 5.1.0.

**Subject:** the architect's ruling under `repo:RF-82` (`1fe3837d5`) with remediation items 1–4, `repo:RF-97` as amended on `main`, and the implementer's dated paragraph after the ruling. The coordinator asked me to recheck `reviewer-1` and `reviewer-2` against the remediation, and to explain the size change.

**Verdict: the remediation meets items 1–4, and both findings are resolved. Every figure in the implementer's paragraph reproduces. The size change comes from the code that #155 and #151 put around the branch's stylesheets, not from the branch. The branch's own output is byte-identical on both bases. I have no new finding.**

### Scope

**Covered** ([`remediation-recheck.txt`](checks/remediation-recheck.txt), [`remediation-sizes.txt`](checks/remediation-sizes.txt)):

- **`reviewer-1`, item 1.** `enter(field, 'error')` sets the `error` attribute and calls no validity method. `createField` and `enter` type the field as `HTMLElementTagNameMap[Tag]`, and `FieldElement` is deleted. With `setValidity()` put back on line 135, `just typecheck` fails with TS2551 on `MultilineTextField | TextField`. At the head, the typecheck and the spec file's lint pass. So a removed member now fails the typecheck, where the local type hid it before.
- **Item 3 (a).** At the head the spec file passes in the three engines: 456 passed, 6 expected fail. With `enter` setting no `error`, 36 rows fail, 12 per engine. They are the same 36 rows as in the implementer's list. The 12 input text error rows (4 per engine) stay green. A node probe through the bridge ([probe](probes/rest-error-tokens.ts.txt)) shows why: `input-text.color` is `on-surface` in both rest packages and in both error packages at `error.default`. `label-text.color`, `supporting-text.color`, `active-indicator.color` (filled) and `outline.color` (outlined) differ. So the input text rows can't witness the error state while those tokens are equal. That limit is in the tokens and isn't a defect in the rows.
- **`reviewer-2`, item 2.** The row is in its own block, `$tag $name populated label position contract`, for the filled field only. A `beforeAll` resolves `container.focus.padding.block` and `label-text.populated.line-height`. The row reads the rect of `.label slot`, the template's only label slot, and compares its centre with `toBe`. It is `it.fails` in the three engines, its comment cites `repo:RF-97`, and _"reported, not yet registered"_ is gone. `RF-97` is on `main` at `c5da3821c` and not in the branch's tree. No instrument resolves cited addresses (`entry.sh` checks duplicates only), and the citation resolves once the branch merges after #161.
- **Item 3 (b).** With the `beforeAll`'s `label-text.populated.line-height` renamed, each of the 6 blocks fails with _Missing token_, and its run is skipped. With the populated label's `translate` 1 px further down (`+ 1px` after `var(--_container-focus-padding-block)` in `styles/default/main.styles.css`), all 6 runs fail with _Expect test to fail_. The 1 px move puts the line box's centre at exactly 16 px in every engine, so the row is at 15 px today, as the ruling reads. This meets both properties that `reviewer-2` asked for.
- **Item 4.** The record has the implementer's dated paragraph with the witnesses, the totals, the sizes and the corrected 15 px, and the earlier paragraph is unchanged.
- **The whole material-x run,** browser and spec projects, three engines: 2658 passed, 7 expected fail, 20 skipped. That is the record's figure.
- **Sizes.** `just size-reading` reproduces `size-remediation-main.json` and `size-remediation-head.json` in all 33 rows, and a second head reading is identical. With core and `packages/material-x/src` at `6a67badfd`, and `src/text-field` at `256977dbc` for the head side, the readings also reproduce `size-before-fix.json` and `size-after-fix.json`.

**Not covered:** real Safari, the visual project, and the rows outside the text field's spec file beyond the full run.

### The size change

The text-field rows move by +95, +89 and +41 Brotli bytes over `23b245efb`, where they moved by +17, +44 and +91 over `6a67badfd`. The cause is the code around the branch's stylesheets:

- **The branch adds the same bytes on both bases.** After its short names are mapped back ([`remap.ts`](probes/remap.ts)), every built material-x `.js` file at the head equals `main`'s build, except `text-field/styles/default/main.css.js` and `text-field/styles/outlined/main.css.js`, as on the old base. Those two files are byte-identical between the bases, on both sides: +349 raw bytes (+46 Brotli alone) and +66 (+40). In both builds, `--_outline-opacity` takes `--i`, at index 8 of 228, and 219 names change.
- **A row is one Brotli stream over the whole bundle,** so the same added bytes cost a different amount next to other code. I split each delta in two by pinning the name map ([probe](probes/pin-names.py.txt)): every existing name keeps its base name, and the new name goes last.

  | Delta (Brotli bytes) | `text-field` | `multiline` | `complete` |
  | --- | --- | --- | --- |
  | Old base: content, names pinned | +34 | +47 | +48 |
  | Old base: renaming | −17 | −3 | +43 |
  | **Old base: total** | **+17** | **+44** | **+91** |
  | New base: content, names pinned to `main` | +60 | +66 | +3 |
  | New base: renaming | +35 | +23 | +38 |
  | **New base: total** | **+95** | **+89** | **+41** |
  | New base: content, names pinned to the old base | +64 | +66 | +54 |

- **#155's code moves the text-field rows.** With both bases on the old base's names, the only built files that differ are #155's (`TextFieldCore.js`, `text-field.js`, `multiline-text-field.js`, the switches, the checkables and core's `traits/validatable.js`) and #151's list styles. Then the content delta grows by +30 for `text-field` and +19 for `multiline`. The renaming delta grows by +52 and +26, although the same 219 names change on both bases.
- **#151's renaming moves `complete`.** #151 (`4936e77b9`) shifts 8 short names on `main`, among them `--_elevation-penumbra`. Pinned to the old base's names, `complete`'s content delta is +54. Pinned to `main`'s names, it is +3.
- **Acceptability.** Under `repo:RD-24` the material-x rows have no limit until the first publication, so no reading here is over a limit, and none needs a decision. The new figures are the branch's real cost over today's `main`, and the record carries them as such. The change from the old figures is compression context that the branch doesn't control. So I read the change as acceptable and report no finding. The implementer's _"isn't read"_ is answered here.

### Findings

No new finding. `reviewer-1` and `reviewer-2` are resolved at `0eee212bd`.