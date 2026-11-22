# A multiline text field keeps a scripted value's line breaks in WebKit — feature proof

**Files were read at:** `37f1eda29`, the head of #116 (`material-x/textfield-white-space-1`), in slot `f`. The base is `main` at `682639048`. The tree was clean apart from one scratch probe and the one mutation this record names. Each was removed or reverted after its run, and the build output in slot `f` was rebuilt from the head afterwards.

**Subject:** `repo:RF-73` in [`00-index.md`](../../00-index.md), the fix `textarea.input { white-space: pre-wrap; }` in `packages/material-x/src/text-field/styles/default/main.styles.css`, the new row in `packages/material-x/tests/text-field/text-field.browser.test.ts`, and the implementer's [readings](../../textfield-white-space-1/checks/rf73-readings.txt). The finding that registered `RF-73` is `reviewer-1` in [`drop-field-sizing-polyfill-1`](../drop-field-sizing-polyfill-1/feature-proof-claude.md#reviewer-1). The coordinator asked me to check that the row discriminates, that the rule reaches only the textarea, that a typed value, a placeholder and a long unbroken line still behave, and the size readings.

**Verdict: the change holds.** Every claim in the record and in the pull request holds as written, and the figures below are my own readings, saved in [`checks/`](checks/). I have two findings, `reviewer-1` and `reviewer-2`, both tier A. Both are **pre-existing**: the base reads the same, and neither blocks #116.

## Scope

**Covered.**

- **The diff,** `682639048...37f1eda29`: the rule and its comment in `main.styles.css`, the row, the `RF-73` entry, and the readings file. The merge commit `14165ff60` brings in `682639048` and changes nothing under `packages/`.
- **The row passes, and it discriminates** ([`row.txt`](checks/row.txt)). The text-field file passes 84 of 84 at the head, which is 28 in each of Chromium 158, Firefox 159 and WebKit 27.2. With `main.styles.css` replaced by its text at `682639048`, the new row fails in WebKit only, with `[24, 24]` against `[96, 96]`. The other 83 pass. These are the implementer's numbers. The row fails only in WebKit because Chromium and Firefox show the line breaks without the rule. `RF-73`'s required property asks that a row observe the property in each engine, and the row runs in each engine.
- **The rule reaches only the textarea.** The selector names the `textarea` element, and only `multiline-text-field.tpl.html` has one. `text-field.tpl.html` has an `<input>`. The single-line field's internal `<input>` computes `white-space: normal`, `white-space-collapse: collapse` and `text-wrap-mode: wrap` in the three engines, at the head and at the base ([`probes.txt`](checks/probes.txt)). No later rule in the text field stylesheets sets `white-space`, and the outlined stylesheet's `.input` rule sets only `margin-block`.
- **Edge cases,** observed in each engine at the head and at the base by the [`edges` probe](probes/edges.browser.test.ts.txt), host 300 px wide, readings in line heights ([`probes.txt`](checks/probes.txt)):

  | Case | Head, each of the three engines | Base |
  | --- | --- | --- |
  | Four lines through the host's `value` | 4, and `value` keeps its `\n` | WebKit 1. Chromium and Firefox 4 |
  | Then `Enter` and one more typed line | 5 | WebKit 2. Chromium and Firefox 5 |
  | `'\n\n'` through the host's `value` | 3 | WebKit 1. Chromium and Firefox 3 |
  | Three typed lines, then four `Backspace` | 3, then 1 | The same |
  | Two lines through `value`, then `''` | 1 | The same |
  | Soft wrap of 60 words | 9 | The same |
  | Long unbroken line, 200 `x` through `value` and 80 typed | 1, overflowing: `scrollWidth` 1609 and 644 against `clientWidth` 300 | The same. See `reviewer-1` |
  | Empty, internal `placeholder` of one line | 1 | The same |
  | Empty, internal `placeholder` of `'p1\np2'` | 2 | WebKit 2. Chromium and Firefox 1 |
  | `mx-text-field`, `value = 'a\nb'` | `value` reads `'ab'`, height 24 px | The same |
  | `form.reset()` after `value = 'a\nb'` | `value` stays `'a\nb'`, 2 lines | `value` stays `'a\nb'`. WebKit 1 line. See `reviewer-2` |

  The placeholder is internal: neither field has a public `placeholder` attribute, so the probe set it on the shadow textarea. A consumer can't reach the two-line placeholder change.

- **Sizes** ([`sizes.txt`](checks/sizes.txt)). I read all 20 rows at the head and with `main.styles.css` at `682639048` in the same tree. Three rows change: `text-field/multiline-text-field` 4055 → 4096 (+41), `text-field/text-field` 8181 → 8205 (+24) and `complete` 22158 → 22197 (+39) Brotli bytes. The other 17 read 0. A second head reading is identical in all 20 rows. Both readings are byte-identical to the implementer's. The built `text-field/styles/default/main.css.js` carries `textarea.input{white-space:pre-wrap}`, and the source comment doesn't ship. `text-field/text-field` grows because both fields import the one stylesheet, and the rule matches nothing in the single-line field.
- **The comment** states the cause that `reviewer-1` of the earlier round isolated, and states it as WebKit's behaviour. It matches the observation.
- **CI** at `37f1eda29`, read during the review: `webkit`, `static`, `docs`, `measurements` and `scope` pass. `chromium` and `firefox` were pending.

**Not covered.**

- Real Safari. The `*/safari` projects need macOS, and this host is Linux. Every WebKit reading here comes from Playwright's WebKit 27.2.
- The full suite, typecheck and lint. The diff adds one CSS rule and one row, and the text-field file passes in the three engines.
- Whether Firefox paints the overflowing long line outside the field. The probe read its computed `overflow: visible` and its `scrollWidth`, not its painting.

## Findings

### reviewer-1

**Tier A, pre-existing.** A multiline text field doesn't wrap a line that has no break opportunity, and the line overflows the field.

- **Current behaviour.** With 200 `x` set through the host's `value` in a 300 px host, the textarea stays one line tall in each engine, and its `scrollWidth` is 1609 against a `clientWidth` of 300. Typing 80 `x` reads the same, 644 against 300. A native textarea beside it, with `field-sizing: content`, `rows=1` and the same inline size, wraps the same value to 6 lines with no overflow ([`long-line` probe](probes/long-line.browser.test.ts.txt), [`probes.txt`](checks/probes.txt)). Chromium and WebKit compute the internal textarea's `overflow` as `auto`, so the line scrolls horizontally inside the field. Firefox computes `visible`.
- **Cause, as observed.** The internal textarea computes `overflow-wrap: normal` in each engine, and the native textarea computes `break-word`. `.input` starts with `all: unset`, which resets the UA's textarea style. This is the mechanism of `RF-73`, applied to `overflow-wrap` instead of `white-space`. I didn't isolate it by setting `overflow-wrap` on the field.
- **Why it is not this change's defect.** The base reads the same, with one line and the same `scrollWidth`, in the three engines. The fix changes only `white-space`.
- **Why it is a problem.** A consumer who sets or types a long URL, a path or a token sees it on one line that runs past the field's inline size, while the field's other lines wrap. A native textarea wraps it.
- **Required property.** A multiline text field keeps its value within its inline size: a line longer than the field wraps, including a line with no break opportunity, and the field is as many lines tall as the wrapped value. This holds in each engine at `RD-20`'s floor, and a row observes it in each engine.
- **Routing.** To the coordinator, for a work item outside #116. It doesn't need an architectural decision.

### reviewer-2

**Tier A, pre-existing.** `form.reset()` doesn't reset a multiline text field's value.

- **Current behaviour.** An `mx-multiline-text-field` with `name` inside a `<form>`, given `value = 'a\nb'` through the host, still reads `'a\nb'` after `form.reset()` in each engine, at the head and at the base ([`probes.txt`](checks/probes.txt)). A native textarea in a form returns to its default value on reset.
- **Cause, as read.** `MultilineTextField` sets `formAssociated = true`. Core's `formResetCallback` in `packages/core/src/element.ts` calls `controller.formReset?.()` on each controller, and `TextFieldCore` registers no `formReset`. `mx-text-field` shares `TextFieldCore`, so by reading it has no reset either. I probed only the multiline field.
- **Why it is not this change's defect.** The base reads the same. The `RF-73` entry already says that no form reset path exists, and that form reset isn't observed.
- **Why it is a problem.** `RF-73`'s required property names a form reset as one way a value is set. Today a reset sets nothing, so that part of the property can't be observed. A consumer who resets a form sees the field keep its value, and the form data keeps it too.
- **Required property.** A form reset returns a text field to its default value, and the field then shows that value as the other paths do. The default value is not documented: whether it is the `value` attribute, the empty string or something else is a contract question.
- **Routing.** To the coordinator, for a work item outside #116. The default value that a reset restores is the architect's call.

### No other finding

The rule restores the property `RF-73` requires, in the three engines. It reaches only the textarea, and the row fails without it in the engine where the defect was. A typed value, an internal placeholder and a long unbroken line read as they did at the base, except that a scripted value's line breaks now show in WebKit. The size figures are exact.