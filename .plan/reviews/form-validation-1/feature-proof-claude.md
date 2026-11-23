# Controlled form validation for the six form controls — feature proof

**Files were read at:** `be7d4c3b5`, the head of #155 (`material-x/form-validation-1`), in slot `d`. Its parent `836d72d99` merges `origin/main` at `f1387729d` into the approved plan at `2b341e0c6`, and is the base. The tree was clean apart from the scratch probes and mutations this record names. Each probe was copied into `packages/material-x/tests/` for its run and removed after it, and each mutation was reverted. The base size reading replaced `packages/core/src`, core's `files.json` and `package.json`, and `packages/material-x/src` with their text at `836d72d99`, and the head was restored afterwards. Core and every measured package were last built from the head. Browsers: Playwright 1.65.0's Chromium, Firefox and WebKit, with Node 26.13.1.

**Subject:** the approved plan [`form-validation-plan.md`](../../form-validation-1/form-validation-plan.md), approved at `2b341e0c6`, with its §11 and the implementer's [readings](../../form-validation-1/checks/implementation-readings.txt). The coordinator named the decisions to check:

- core's `Validatable` and `useValidatable(host, target)` at `@ydinjs/core/traits/validatable.js`;
- `setCustomValidity` as the only source of validity, and no native validators;
- the controlled `error` driving `:state(error)` and the control's `aria-invalid`;
- `FV-D11`: `required` sets only `aria-required`;
- `readonly` for the text fields only;
- `setValidity` removed with no alias;
- the six elements.

The coordinator also named the implementer's claims, the two unplanned changes, and asked whether the docs patch applies.

**Verdict: the implementation meets the plan, and every claim I re-ran reproduces.** I have one finding, `reviewer-1`, tier C: a wording error in the record about which rows catch one mutation. Nothing blocks #155.

## Scope

**Covered.**

- **The diff against the plan.** Between `2b341e0c6` and the head, the plan changes only by its new §11 and one revision line.
  - **Core** has `Validatable`, bound `Controlled`. The getters `validity`, `validationMessage`, `willValidate`, `form` and `labels` return the internals' values. `checkValidity()` and `reportValidity()` return the internals' result and write nothing. `setCustomValidity(message)` passes `{ customError: message !== '' }` with the registered anchor. `error` and `required` are `Bool` attributes.
  - **The hook** registers the anchor in a module `WeakMap` and transfers `error` and `required` to the target as `aria-invalid` and `aria-required`, `"true"` or absent. It sets no custom state. The subpath is in core's `files.json` and `exports`.
  - **material-x:** `TextFieldCore`, `useCheckableCore` and `useSwitchCore` compose the trait, call the hook with `FV-D1`'s targets (`.input`, `#input`, `.host`) and toggle `:state(error)` from `error`. `TextFieldLike` gains `readonly`, transferred to the internal field. The checkable controls don't get it.
  - **Deletions:** `setValidity` and the two overrides are gone. No source, test, story or page under `packages/` calls `setValidity` or relies on the old toggle.
  - **Types:** the four `*Events` types gain `invalid`, and each `*Properties` gains `ValidatableProps`.
- **The two unplanned changes.**
  - **`AttributeKeys`** now intersects with `WritableKeysOf`. No trait in core or material-x declared a getter before this change: the only one in a file with `@trait` is `TextFieldCore`'s `isPopulated`, and `TextFieldCore` isn't a trait. So no existing trait's props change, as §11 says. The declaration rows pass.
  - **The CDP reader's** `AccessibilityNode` gains `properties`. `list-roles` and every other material-x row pass with it (below).
- **Rows** ([`rows.txt`](checks/rows.txt)).
  - **Core:** `validatable.browser.test.ts` passes 13 rows in each engine, 39 in all, and the two declaration files pass, 4 and 20 rows.
  - **material-x:** `validatable.browser.test.ts` passes 114 in Chromium and 106 in each of Firefox and WebKit, where row 11's 8 rows are skipped. These are the implementer's figures. I read each row against `FV-D10`'s list, 1 to 11, and each says what the plan asks. The document is cleared after each row (`tests/support/browser-setup.ts`), so the shared `#fixture` and `field` ids don't leak between rows.
- **Full suites**, three engines: core 72 files, 728 passed. material-x's default run, every project declared without `MX_TEST_VISUAL`: 77 files, 2082 passed, 1 expected fail, 20 skipped. That is a superset of the implementer's affected suites. Typecheck passes in core and material-x after building core. CI on #155 at `be7d4c3b5` passes `chromium`, `firefox`, `webkit`, `static`, `docs`, `measurements`, `verify` and `scope`.
- **Mutations** ([`mutations.txt`](checks/mutations.txt)). The implementer ran them in Chromium. I re-ran four in all three engines with the implementer's script ([probe](probes/mutations-three-engines.py.txt)):
  - M1 is the deleted `checkValidity` toggle that row 5 must catch;
  - M5 is a validating `required`;
  - M11 is `willValidate` always true;
  - M15 is `reportValidity` always true.

  Each fails exactly three times the implementer's Chromium count: M1 12, M5 3 in core and 18 in material-x, M11 0 and 42, M15 3 and 0. So each catching row fails in every engine. Core's rows alone miss M11, and material-x's alone miss M15. Both suites run in the same CI, so the pair catches both. Which rows catch M11 is `reviewer-1`.

- **Markup and reflection** ([`probes.txt`](checks/probes.txt), [probe](probes/markup.browser.test.ts.txt)). The rows set `error`, `required` and `readonly` as properties only. So I parsed `<tag error required>`, adding `readonly` for the text fields, in a form, for each of the six elements, three engines.
  - At upgrade each element matches `:state(error)`, its control has `aria-invalid="true"` and `aria-required="true"`, and a text field's internal field is read-only with `willValidate` `false`.
  - Each property set on a fresh element reflects to its attribute.
- **The text fields' error appearance**, which the JSDoc and the component pages promise ([`probes.txt`](checks/probes.txt), [probe](probes/error-appearance.browser.test.ts.txt)). Both fields, filled and outlined, three engines, read from the host's `--_active-indicator-color` and `--_outline-color` and the slotted text's colour.
  - Setting `error` turns the active indicator and the outline to `#ba1a1a` at rest and focused, and to `#93000a` hovered. The supporting text turns `rgb(186, 26, 26)`.
  - Clearing `error` restores the resting values.
  - `setCustomValidity('m')` followed by `checkValidity()` changes none of them.
  - The empty field's resting label keeps the placeholder colour, as `.label`'s rule gives it, and the focused reading caught the label mid-transition. So the probe establishes nothing about the label.
  - No row reads this appearance against tokens. `repo:RF-82` on `main` (`6a67badfd`) already registers that the error package isn't registered with the bridge, so the gap isn't new here.
- **Sizes** ([`sizes.txt`](checks/sizes.txt)). `just size-reading` at the base and at the head reproduces the implementer's table in every row. The changes are `button/switch-button` +216, `button/switch-icon-button` +229, `checkbox/checkbox` +250, `radio/radio` +260, `text-field/multiline-text-field` +213, `text-field/text-field` +184 and `complete` +214. The other 13 material-x rows, core's two, box-quad's one and drag's ten read 0. A second head reading is byte-identical.
- **The docs patch** `checks/docs-unit.patch.txt` applies to the branch with `git apply --check`. It also applies to `origin/main` at `6a67badfd`, through a temporary index. The branch merges with that `origin/main` without conflict. Its content wasn't reviewed, as the coordinator asked.

**Not covered.**

- Real Safari, and any screen reader. The plan defers speech to an accessibility-testing unit, and Firefox's `invalid` state isn't readable through Marionette (plan §9).
- The validation anchor's bubble position (`FV-D5`): no instrument reads it.
- The other eleven mutations, which I didn't re-run.
- The visual project, which runs only in CI.
- The content of the docs patch.

## Findings

### reviewer-1

**Tier C.** The record says `willValidate`'s mutation is caught by material-x's disabled rows only. It is also caught by both text fields' `readonly` rows.

- **Current text.** §11: _"`willValidate` is caught by material-x's disabled rows only"_. The coordinator's request repeats it.
- **Observed.** With `willValidate` returning `true`, 14 rows fail in Chromium. Twelve are the six elements' two disabled rows. The other two are _"should make the internal field read-only and the host not validate"_ for `mx-text-field` and `mx-multiline-text-field` ([`mutations.txt`](checks/mutations.txt)). The implementer's count, 14, is the same, so the readings are right and only the sentence is wrong.
- **Why it matters.** Only to a reader of the record who relies on the sentence to judge row coverage.
- **Required property.** The record names the rows that each mutation fails.
- **Routing.** To the implementer, as a record correction on #155's branch.