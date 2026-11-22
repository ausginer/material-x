# A multiline text field wraps a line with no break opportunity — recheck of `reviewer-1`

**Files were read at:** `d2b5d3235`, the head of #116 (`material-x/textfield-white-space-1`), in slot `f`. The change since the [feature proof](feature-proof-claude.md) at `8ea79c66f` is `d2b5d3235`. The tree was clean apart from two scratch probes and the one mutation named below. Each was removed or reverted after its run, and the build output in slot `f` was rebuilt from the head afterwards.

**Subject:** [`reviewer-1`](feature-proof-claude.md#reviewer-1) and the implementer's `overflow-wrap` section of `repo:RF-73` in [`00-index.md`](../../00-index.md). This is a recheck, not a new proof. The coordinator asked whether the row discriminates, whether `reviewer-1` is resolved, whether the `<input>` is still unaffected, and whether the size readings are right. `reviewer-2`, form reset, is out of scope: it is #118.

**Verdict: the change resolves `reviewer-1`, and every claim in the record holds as written. I have no new finding.** Every number below is my own reading, saved in [`checks/recheck.txt`](checks/recheck.txt).

## Scope

**Covered.**

- **The change.** `overflow-wrap: break-word` is added to the existing `textarea.input` rule, the comment is wider, and the row _"should wrap a line that has no break opportunity within the field"_ is new. Nothing else under `packages/` changed.
- **The row passes, and it discriminates.** The text-field file passes 87 of 87 at the head, which is 29 in each engine. With the `overflow-wrap` line deleted, the new row fails in Chromium, Firefox and WebKit, with `[1609, false]`, `[1610, false]` and `[1609, false]` against `[300, true]`. The other 84 rows pass. These are the implementer's numbers.
- **`reviewer-1` is resolved.** The required property was that a line longer than the field wraps, including a line with no break opportunity, and that the field is as many lines tall as the wrapped value. I reran the feature proof's two probes at the head. In each engine, 200 `x` set through the host's `value` read 6 lines for both height and `scrollHeight`, with `scrollWidth` equal to `clientWidth` at 300. The native textarea beside it also reads 6 lines. 80 typed `x` read 3 lines, with no overflow. The internal textarea computes `overflow-wrap: break-word` in each engine.
- **Nothing else moved.** All the other readings from the feature proof's table are unchanged at the head: scripted and typed lines, shrink, clearing, soft wrap of 60 words, and the internal placeholder.
- **The `<input>` is unaffected.** The selector is unchanged and names only the `textarea`. The single-line field's internal `<input>` computes `white-space: normal` and `overflow-wrap: normal` in each engine.
- **Sizes.** Brotli bytes against `main.styles.css` at `8ea79c66f`, in the same tree: `text-field/multiline-text-field` 4096 → 4095 (−1), `text-field/text-field` 8205 → 8179 (−26) and `complete` 22197 → 22216 (+19). The other 17 rows read 0. These are the implementer's figures, and the values before the change equal the feature proof's head readings. The built rule is `textarea.input{white-space:pre-wrap;overflow-wrap:break-word}`, and the comment doesn't ship.

**Not covered.** Real Safari, for the same reason as in the feature proof. I didn't run the full suite, typecheck or lint.

**An observation, not a finding.** The row asserts that the textarea is taller than one line, not how many lines tall it is. At the head, the probe reads exactly 6 lines in each engine, equal to the native textarea and to `scrollHeight`. When the `overflow-wrap` line is deleted, the row fails on both parts of the assertion, so it observes the declaration this change depends on. Growth to the full wrapped height depends on `field-sizing: content`, and the earlier rows already observe that declaration.