# Text fields' default value and form reset (`repo:RF-74`) — feature proof

**Files were read at:** `eeb3ff814` (`material-x/text-field-reset-1`, PR #126), in slot `f`. `origin/main` is `c08dbd7fc`, and the branch holds all of it. **Diff reviewed:** `origin/main` to `eeb3ff814`. Under `packages/`, it changes `TextFieldCore.ts`, `text-field.ts`, `multiline-text-field.ts`, the runtime shape snapshot and `text-field.browser.test.ts`, and nothing else.

**Governing records:** `repo:RF-74` and its decision of 2026-11-22 in [`00-index.md`](../../00-index.md#rf-74--text-fields-ignore-a-form-reset-and-their-value-attribute), the architect's [reading](../../observations-2/checks/text-field-reset.txt) and [probe](../../observations-2/probes/text-field-reset.browser.test.ts.txt), and the implementer's [readings](../../text-field-reset-1/checks/rf74-readings.txt).

**Lens:** feature proof, by a reviewer who didn't implement the change. Each claim below is my own run or reading, in Playwright's Chromium, Firefox and WebKit. The transcripts are [`checks/feature-proof.txt`](checks/feature-proof.txt) and [`checks/probe.txt`](checks/probe.txt), and the probe is [`probes/rf74-review-probe.browser.test.ts.txt`](probes/rf74-review-probe.browser.test.ts.txt). Nothing is repaired, and no record is amended.

**Verdict: the change meets the decision's six properties in all three engines.** It also matches a native `<input>` and `<textarea>` in every scenario I ran but one. A clone of an edited field takes the attribute where a native clone keeps the edited value (`reviewer-1`, Tier A, pre-existing, for the architect). One Tier C finding concerns rows. Neither blocks the change. The merge waits for the owner's freeze in any case.

## Scope

**Covered.**

- **The claim's numbers.**
  - **Head:** the text-field file passes 48 of 48 in each engine.
  - **Before:** I put `origin/main`'s `TextFieldCore.ts` in place for one run and then restored it. 17 of the 19 new rows fail in each engine, 51 in all: the eight property rows of each field and the line-break row. The two that pass are property 5's rows, one per field, because that property was already true.
  - **The runtime shape snapshot** passes in each engine, and its diff is the four attribute readings that the record names.
  - **Size (Brotli):** `text-field/multiline-text-field` 4095 → 4153 (+58), `text-field/text-field` 8179 → 8249 (+70), and `complete` 22222 → 22233 (+11). The other 17 rows are equal, and every row passes. The baseline is the three text-field sources from `origin/main`, swapped in for one run and then restored.
- **The rows discriminate the mechanism.** I ran three mutations in Chromium, and each fails the row that names its property, in both fields:
  - the setter doesn't set the dirty flag;
  - the reset doesn't clear the dirty flag;
  - the constructor doesn't sync the form value.
- **Against the native controls.** I ran eleven scenarios on `mx-text-field` with a native `<input>`, and on `mx-multiline-text-field` with a native `<textarea>`, whose default is its child text. In each engine, the custom field equals the native control in each of these:
  - **Upgrade:** the parsed default, the value and the form entry.
  - **No default:** the value `''` and the form entry `''`.
  - **Attribute changes while clean:** the value follows a change, and removing the attribute gives `''`, in the value and the form entry.
  - **A script sets the value:** a later attribute change is ignored, and the attribute is unchanged.
  - **The user types:** a later attribute change is ignored. A reset then restores the latest attribute, and the field follows the attribute again.
  - **The attribute is removed while the value is dirty:** a reset gives `''`.
  - **`value = null`:** the value `''`, and the form entry `''`. This is the side effect the record names, and the native `<input>` does the same.
  - **A disabled field:** a reset restores the value, the form has no entry, and the entry returns when the field is enabled again.
  - **No `input` or `change` event** fires during a reset.
  - **A prevented `reset` event:** the value is kept.
  - **The clone of a dirty field** is the one scenario that differs: [`reviewer-1`](#reviewer-1).
- **The record.** RF-74 has one entry heading, on the branch and on `main`. The branch's diff to `00-index.md` changes RF-74's status line and adds the _Fixed_ bullet, so the merge's duplicate is gone. The record's description of the change agrees with the code.
- **Documentation.** Both elements' JSDoc gives `value` as the default value, as property 6 asks. The `.mdx` pages don't mention `value`.
- **Static checks:** `just fmt-check`, `just lint` and `just typecheck` are clean on the changed files, and the pull request's checks pass.

**Not covered.** Real Safari. Form state restore, which the decision leaves out. The checkables' reset, which is #124. Other components.

## Findings

### reviewer-1

**A clone of an edited field takes the `value` attribute, where a native clone keeps the edited value.** Tier A, pre-existing. To the architect.

- **Current behaviour:** with `value="initial"`, after `field.value = 'scripted'`, `field.cloneNode(true)` reads `'initial'` for both custom fields, in all three engines. The clone is clean, so it follows the attribute.
- **Native behaviour:** a native `<input>` and `<textarea>` read `'scripted'`, because their cloning steps copy the value and its dirty flag.
- **Before the change:** the clone read `''`, so it was already wrong, and the change doesn't make it worse.
- **Why it is a problem:** the decision says that the field follows a native `<input>`, and its six properties don't mention cloning. A custom element has no cloning-steps hook, so the platform may not allow the native behaviour. Whether to accept that as a limitation and record it is the architect's call.
- **Evidence:** [`checks/probe.txt`](checks/probe.txt), `cloneOfDirty`.
- **Required property:** the record either says what a clone of a dirty field reads, or states it as a known difference from a native control.

### reviewer-2

**Behaviour that matches native but has no row.** Tier C.

- **What isn't held by a row:**
  - removing the `value` attribute while the value is clean;
  - the `value = null` change, which the record says "no row observes";
  - a disabled field's reset;
  - no `input` or `change` event during a reset.
- **Why it matters:** each holds in all three engines today ([`checks/probe.txt`](checks/probe.txt)). Without a row, a later change to `#sync` or to the attribute handler could change them without failing anything.
- **Required property:** a row holds each behaviour that the record states or that the decision's properties imply.

## Notes for the validation system (#131)

These are observations and not findings. They aren't designs.

- **The dirty flag isn't the user-interaction flag.** `#isDirty` is set by a script as well as by the user, and it is a private field of `TextFieldCore`. Browsers show `:user-invalid` only after the user interacts, and a reset clears that. So a validation system that times its error display by this flag would show errors after a script sets a value. A trait or use-hook can't read the flag in any case.
- **A reset doesn't touch validity.** After `setValidity({ customError: true })` and `checkValidity()`, a `form.reset()` keeps `:state(error)` and keeps the form invalid, in all three engines ([`checks/probe.txt`](checks/probe.txt)). That follows from validity being set only by the consumer today. `#sync` is the single path that every value change and the reset go through, and it updates only the populated state and the form value.
- **The reset is local to `TextFieldCore`.** It is a `use(this, { formReset })` controller in that class. #124 will add reset handling to the checkables. A shared system that must act on a reset would then meet one path per component family.