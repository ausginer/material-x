# Controlled form validation for material-x's form-associated components

**Status:** approved on 2026-11-22, implemented on this branch (§11), and registered. The owner settled [`FV-Q1` to `FV-Q3`](#owners-choices) and accepted `RD-45`. The decisions are `repo:RD-35` to `repo:RD-46` in [`00-index.md`](../00-index.md), which is their record, and this plan holds their required properties. §1's findings are `repo:RF-96`, which they close. §8's findings are `repo:RF-94` and `repo:RF-95`, registered on #158. [§10](#10-revisions) lists what each revision changed.

- **Read at** `origin/main` `00fd35592`. PR [#126](https://github.com/ausginer/material-x/pull/126) (`repo:RF-74`, the text fields' default value and form reset) is open on `material-x/text-field-reset-1`. This plan builds on it and doesn't re-decide it.
- **Written by** the architect in slot `b`, on this branch in slot `d`. An architect outside the main slot proposes and doesn't record ([agent workflow](../../.agents/docs/agent-workflow.md#parallel-units)). So the entries below carry local names: decisions `FV-D1` to `FV-D12`, owner questions `FV-Q1` to `FV-Q3`, and proposed findings `FV-F1` to `FV-F3`. **Registered by** the main slot's architect on 2026-11-22, at `76d354ee3`, in slot `g` on the coordinator's request. `FV-D1` to `FV-D12` are `RD-35` to `RD-46`, in that order. The findings of [§1](#1-what-is-wrong-today) are one entry, `RF-96`, that the decisions close. Of [§8](#8-findings)'s findings, `FV-F1` and `FV-F2` are one entry, `RF-94`, and `FV-F3` is `RF-95`. Both are registered on `repo/register-observations-4` (#158), not yet on `main`. The questions keep their local names. The text below uses the registered addresses, except in §10 and §11, which keep the names they were written with.
- **Inputs:** the architect's read-only review of the text fields' validation API, reported to the coordinator on 2026-11-22 and recorded only here, in §1. The owner's answers to it, relayed by the coordinator on 2026-11-22:
  - a general system that reaches each component through a trait and a use-hook;
  - the review's I3 (the native names), I4 A (a controlled `error` attribute), I5 (i) (the error text stays in `support`) and I6 (tests and docs);
  - _"as controlled as possible"_: companies validate with their own code or a validator library, so native validators are unlikely to be needed. The system uses the native machinery as far as it can and never switches into an uncontrolled mode;
  - scope: the text fields, the checkbox, the radio and the switch buttons.
- **The owner's answers to `FV-Q1` to `FV-Q3`,** relayed by the coordinator on 2026-11-22:
  - `FV-Q1`: the checkbox's error appearance comes in a follow-up unit;
  - `FV-Q2`: he leans towards `required`, translated only into `aria-required`, never a validator, and asked the architect to challenge it;
  - the `aria-*` gap of `mx-checkbox` and `mx-radio` is a bug, to be proposed as a finding;
  - `FV-Q3`: yes, the radio and the switches carry `error` too, and screen readers are to be checked.
- **The owner's final answers,** relayed by the coordinator on 2026-11-22:
  - `RD-45` is accepted: `required` sets `aria-required` on the control and nothing else, and the docs say that it announces only;
  - `FV-F1` and `FV-F2`, now `RF-94`, are fixed in a unit of their own, not this one;
  - screen readers: layer 1 of [§9](#9-accessibility-proof-and-the-screen-reader-method) only for now, each engine's accessibility tree with row 11. AT-SPI2, Orca and Guidepup are deferred together to one accessibility-testing unit after the main material-x work ends.
- **Governing records:** [`architecture.md`](../../.agents/docs/architecture.md) §Components (_every component is controlled_, and the text fields' exception), `repo:RF-50`, `repo:RF-74`, `repo:RD-20` (the browser floor), `repo:RD-24` (size rows), `repo:RD-26` and `repo:RD-33` (traits), `repo:RD-32` (one branch per unit), CONTRIBUTING §1.1, §2, §8 and §15.
- **Evidence:** [`checks/probe-readings.txt`](checks/probe-readings.txt), the output of [`probes/review-probe.mjs.txt`](probes/review-probe.mjs.txt) and [`probes/plan-probe.mjs.txt`](probes/plan-probe.mjs.txt) in Chromium 158, Firefox 159 and Playwright's WebKit 27.2. Each probe is a minimal form-associated element that reproduces the mechanism it tests, not the built component. [`checks/size-estimate.txt`](checks/size-estimate.txt) is a size estimate from hand-written stand-ins. [`checks/aria-states.txt`](checks/aria-states.txt) is the output of [`probes/aria-states.ts`](probes/aria-states.ts): each engine's own accessibility tree for the built components and for native controls, [§9](#9-accessibility-proof-and-the-screen-reader-method).

## 1. What is wrong today

The text fields carry the only validation code. `TextFieldCore.ts:235`–`:249` overrides `checkValidity()` and `reportValidity()` to call `ElementInternals` and then toggle the `error` custom state, and adds `setValidity(flags, message)`, which calls the internals' `setValidity` with the host as the anchor. The checkbox, the radio and the switches have no validation surface at all.

- **P1. The constraint attributes do nothing.** The text fields observe `type`, `inputmode`, `outlined`, `disabled`, `name` and `value` only, so `required`, `minlength`, `pattern` and the rest never reach the internal field. `readonly` on a form-associated host removes it from validation, so `willValidate` is `false`, but the internal field stays editable (`review-probe`, all three engines).
- **P2. The internal field's own validity is lost.** `type="email"` with the text `foo` sets `typeMismatch` on the internal field. The host stays valid, and the form submits `foo` (all three engines).
- **P3. The error state doesn't follow form validation.** A submission, `form.checkValidity()` and `form.reportValidity()` validate through the internals and never call the host's overrides: zero calls in each engine. Submission is blocked and `invalid` fires at the host, but `:state(error)` stays unset.
- **P4. The error state goes stale, and a query sets it.** After `setValidity({})`, `:state(error)` stays until the next `checkValidity()`. `checkValidity()`, a query on a native control, paints the field. The consumer has no way to show or hide the error display directly.
- **P5. The host lacks the native names.** `validity`, `validationMessage`, `willValidate`, `setCustomValidity`, `form` and `labels` are absent in each engine. A form-associated element gets none of them for free. Code that walks `form.elements` and reads `.validity.valid` throws.
- **P6. Assistive technology is never told.** Nothing sets `aria-invalid` on the internal field. A message given to `setValidity` appears only in the browser's bubble.
- **P7. `:user-invalid` can't time the display.** After a submit attempt, Firefox matches it on a form-associated host, and Chromium and WebKit don't.
- **P8. Nothing specifies it.** No row covers the methods or `:state(error)`, the docs don't mention them, and no `*Events` type names `invalid`.

Tier A: P1 to P6 are observable at runtime.

## 2. The model

**A component's validity and its error display are two states that the consumer sets, and nothing else changes them.** This is the controlled principle applied to validation.

- **Validity** is the consumer's custom validity. The consumer sets it with `setCustomValidity(message)`. The platform derives from it what it derives for a native control: submission blocking, the `invalid` event, `:invalid` and `:valid`, `validity` and `validationMessage`.
- **The error display** is the `error` attribute. `:state(error)`, which draws the error appearance, and `aria-invalid` on the accessible control follow it.
- **The two are separate** so that the consumer decides when an error shows. A pristine required field is invalid and shows nothing until the user has tried. An error from the server shows whatever the field's current validity.

**Native validators are not used.** No constraint makes the component invalid by itself. That keeps validity controlled for every component, the text fields included. Their text is the user's (`architecture.md` §Components), but their validity isn't.

## 3. Decisions

### `Validatable` and `useValidatable` live in `@ydinjs/core`, at `@ydinjs/core/traits/validatable.js`: `RD-35`

**Why core:** nothing in it is Material's. It forwards `ElementInternals`, as the form traits already in core (`Disableable`, `Nameable`, `Valuable`, `Checkable`) forward attributes. A third-party author building on core needs the same surface. `"sideEffects": false` (`repo:RD-30`) keeps it out of any bundle that doesn't import it. Core is 0.1.0, and the new subpath goes into its `exports`.

**The trait `Validatable`**, bound `Controlled`, as `FocusForwarding`'s is. Required properties:

- `validity`, `validationMessage`, `willValidate`, `form` and `labels` are read-only. Each returns the host's `ElementInternals` value, the same object.
- `checkValidity()` and `reportValidity()` return the internals' result. The platform fires `invalid` at the host, which doesn't bubble and is cancelable (`plan-probe`). They change no attribute, state or ARIA.
- `setCustomValidity(message)`:
  - a non-empty message makes the host invalid with `customError` and that message;
  - an empty one makes it valid.
  - The internals throw a `TypeError` for a true flag with an empty message, in each engine (`plan-probe`), so the empty message must map to no flags, as a native control's does.
  - Its validation anchor is the target that `useValidatable` registered (`RD-39`).
- `error` and `required` are boolean attribute members (`accessor error!: boolean`, `accessor required!: boolean`, `Bool`), observed and reflected. `ValidatableProps` is `Props<typeof Validatable>`.

**The hook `useValidatable(host, target)`:**

- `target` is the component's accessible control: the text fields' `.input`, the checkbox's and the radio's `#input`, and the switches' `.host` button.
- It registers `target` as the host's validation anchor.
- While `error` is set, `target`'s `aria-invalid` is `"true"`. Otherwise `target` has no `aria-invalid`.
- While `required` is set, `target`'s `aria-required` is `"true"`. Otherwise `target` has no `aria-required` (`RD-45`).
- It writes the target directly, not the host, so neither state appears on a second node ([§9](#9-accessibility-proof-and-the-screen-reader-method)), and it doesn't depend on `RF-94`'s fix.
- It sets no custom state, as `useCheckable` sets none (`checkable.ts`, _"Does not wire form internals or custom states"_). How the trait reaches the registered target is the implementer's choice. `FocusForwarding`'s module `WeakMap` is a precedent.

### Validity is the consumer's custom validity only: the internal field's validity isn't copied, and no constraint attribute is added except `readonly`: `RD-36`

The owner's direction decides the review's I1 and I2.

- **I2, copying the internal field's validity, is not adopted.** It would make `type`, `required` and the other constraints change validity as the user types: native validators, uncontrolled.
- **`type` doesn't validate.** On the text field, `type` sets the keyboard, autofill and the native sanitization of the text. The element's documentation says that validation is the consumer's. P2 is closed by that statement, not by code.
- **The constraint attributes `minlength`, `maxlength`, `pattern`, `min`, `max` and `step` are not adopted.** Each is a validator. `maxlength` also stops typing at the limit, which isn't validation, and could be added on request as an input limit.
- **`required` is adopted as an announcement only** (`RD-45`). It doesn't touch validity.
- **`readonly` earns its bytes** (`RD-38`), because it is an editing state, not a validator.

### `error` is set by the consumer only, and `checkValidity()` and `reportValidity()` don't touch it: `RD-37`

- **What follows `error`.** In material-x, `:state(error)` follows `error` in `TextFieldCore`, `useCheckableCore` and `useSwitchCore`. The text fields' existing `:state(error)` styles draw it.
- **What doesn't change it.** No method, event, form submission or reset sets or clears `error`.
- **A host's own `aria-invalid` or `aria-required` is outside the contract** (CONTRIBUTING §1.1). The text fields and the switches mirror the host's `aria-*` to the target (`TextFieldCore.ts:143`, `ButtonCore.ts:110`), so a host attribute and `error` or `required` would both write the target's. The JSDoc of `error` and `required` says to use them, and the library doesn't arbitrate.
- **The documented recipe** for native-like timing:

  ```js
  field.addEventListener('invalid', () => {
    field.error = true;
  });
  field.addEventListener('input', () => {
    const message = validate(field.value);
    field.setCustomValidity(message);
    if (field.error) field.error = message !== '';
  });
  ```

  A checkable control listens to `change` instead of `input`.

### The text fields pass `readonly` to the internal field: `RD-38`

- `readonly` joins `TextFieldLike`, as a `Bool` attribute transferred to the internal field, for both fields.
- The platform already removes a host with `readonly` from validation.
- Its member is named as the attribute is, following `inputmode`'s precedent in the same trait.
- The checkable controls don't get it: HTML gives `readonly` no meaning on a checkbox or a radio.

### The validation anchor is the component's accessible control: `RD-39`

- Each component's `useValidatable` target is also its validation anchor, so the browser's bubble points at the control and not at the host.
- The switches' host is `display: contents` (`button/styles/default/main.styles.css`'s `:host`), so it has no box to anchor to.
- No row observes the anchor, because the bubble isn't readable in the gate.

### A form reset leaves validity and `error` as they are: `RD-40`

- The platform keeps custom validity across `form.reset()` in each engine (`plan-probe`), and `error` is controlled state. The consumer clears both in the form's `reset` listener, and the docs say so.
- **Validation needs no `formReset`.** `repo:RF-74`'s reset restores the text fields' value and nothing else.
- **[#124](https://github.com/ausginer/material-x/issues/124), the checkables' reset, isn't a finding.** `repo:RF-74`'s dated paragraph of 2026-11-22, on #158, rules it under the controlled principle. A reset changes nothing on these controls, and `checked` has no default separate from the state. The coordinator closed #124 as _not planned_. Validation's reset rule is the same principle.

### Scope: six elements, and not the plain buttons: `RD-41`

- **In scope:** `mx-text-field`, `mx-multiline-text-field`, `mx-checkbox`, `mx-radio`, `mx-switch-button` and `mx-switch-icon-button`. They compose `Validatable` through `TextFieldCore`, `CheckableCoreTraits` and `SwitchCoreTraits`, so each has the same members (`RD-46`).
- **Out of scope:** `mx-button`, `mx-icon-button` and `mx-split-button` are form-associated to submit and reset a form, carry no value of their own, and keep their surface.

### `setValidity` and the text fields' overrides are deleted: `RD-42`

- `setValidity(flags, message)` goes, with no alias (CONTRIBUTING §8: material-x and core are 0.1.0 and unreleased). It let a consumer raise any flag, `valueMissing` included, which no native control allows.
- The overrides of `checkValidity()` and `reportValidity()` go with it, replaced by the trait's.

### The error text stays in the `support` slot: `RD-43`

- The consumer puts the message in `support` while `error` is set. It is already in the text fields' `aria-describedby` fallback.
- No slot is added, and `validationMessage` isn't rendered. This was owner-accepted as I5 (i).

### Tests, types and docs: `RD-44`

- **Rows**, in each engine at `RD-20`'s floor:
  - **Core:** `packages/core/tests/traits/validatable.browser.test.ts` covers the trait and the hook with a minimal element, and a declaration test types the members.
  - **material-x:** one parametrized block runs for each of the six elements, in the elements' existing test files or one shared file:
    1. A fresh element is valid: `validity.valid`, `validationMessage` `''`, `willValidate`, `:valid`.
    2. `setCustomValidity('m')`:
       - `validity.customError` is set, `validationMessage` is `'m'` and the host matches `:invalid`;
       - `form.checkValidity()` is `false`, `requestSubmit()` submits nothing, and one `invalid` event fires at the host, not bubbling and cancelable.
    3. `setCustomValidity('')` makes the element valid, and the form submits.
    4. Setting `error` adds `:state(error)` and gives the target `aria-invalid="true"`. Clearing it removes both.
    5. `checkValidity()` and `reportValidity()` on an invalid element leave `error`, `:state(error)` and `aria-invalid` unchanged. A mutation that restores today's toggle must fail this row.
    6. `form.reset()` leaves custom validity and `error`.
    7. A disabled host, or one in a disabled `<fieldset>`, has `willValidate` `false`.
    8. `form` is the owner form, and `labels` holds a `<label for>` that points at the host. It doesn't name the checkbox or the radio (`RF-94`), so this row reads `labels` only.
    9. Text fields only: `readonly` makes the internal field read-only and `willValidate` `false`, and its removal restores both.
    10. Setting `required` gives the target `aria-required="true"`, and clearing it removes it. Neither changes `validity`, `willValidate` or submission.
    11. Chromium only, through CDP as `tests/list/list-roles.browser.test.ts` reads the tree: with `error` and `required` set, the control's accessibility node reports `invalid` `"true"`. A text field's node also reports `required` `true`. Chromium's CDP reports `required` on no checkbox, radio or switch, native ones included ([§9](#9-accessibility-proof-and-the-screen-reader-method)).
- **Snapshots:** `tests/__snapshots__/traits-baseline.json` and the runtime shape snapshot change for the new members.
- **Types:** each element's `*Properties` gains `ValidatableProps`, and `*Events` gains `invalid: Event`.
- **Docs:**
  - Each element's JSDoc documents `error`, `required`, `setCustomValidity`, the `invalid` event, `RD-37`'s precondition, and that the element has no native validators. `required`'s says that it announces the control as required, doesn't block submission, and doesn't make `:required` match.
  - The text field also documents `readonly`, and that `type` doesn't validate.
  - Each component page carries `RD-37`'s recipe and `RD-40`'s reset note.
- **Project documentation is its own unit** (`repo:RD-32`). The updates to `accessibility.md`, where the text fields' _Missing requirements_ changes, and to `architecture.md`'s list of shared traits go in a separate pull request after this one.

### `required` announces a control as required and does nothing else: `RD-45`

This was the owner's leaning in `FV-Q2`, challenged below. The architect recommended accepting it, and the owner accepted it on 2026-11-22.

- **Required properties:**
  - `required` is a `Validatable` member on all six elements (`RD-35`).
  - While it is set, the control's `aria-required` is `"true"`, and otherwise the control has none.
  - It doesn't change `validity`, `willValidate`, submission or `:state(error)`.
  - It doesn't make `:required` match. No engine matches `:required` on a form-associated host ([§9](#9-accessibility-proof-and-the-screen-reader-method)), so a consumer's styles select `[required]`.
- **The challenge, and what each side of it weighs.**
  - **Against: the name promises blocking.** A native `<input required>` blocks submission and matches `:required`. Every comparable library's `required` validates, Material Web's included. A consumer who writes `required` and forgets to validate gets an empty required field submitted, and nothing reports it. This is the strongest argument against, and the docs carry it (`RD-44`).
  - **Against: it fixes the name's meaning.** Once released, turning `required` into a validator would be a breaking behaviour change. Host `aria-required` leaves the name free. The owner's direction makes a validating `required` unlikely, so this weighs little.
  - **For: the platform gives a host `required` nothing to conflict with.** On a form-associated host, the attribute doesn't match `:required` and doesn't change validity in any engine (§9). So the translation is the attribute's only effect, and nothing native disagrees with it.
  - **For: it reaches only the control.** The host-attribute alternative leaves `aria-required` on the host as well. Chromium, Firefox and WebKit expose a host that carries `aria-*` as a node of its own, `generic` or `group`. The readings show that node with the host's name, and on the checkbox's host with its `aria-invalid` and `aria-required` too (§9, the `host` variant). For `mx-checkbox` and `mx-radio`, the host attribute doesn't reach the control at all until `RF-94` is fixed. `required` writes the control directly in every component, as `error` does for `aria-invalid`. The plan chose `error` over host `aria-invalid` for the same reason (`RD-37`), and one rule for both states is simpler to document.
  - **For: assistive technology gets what a native `required` gives it.** In Firefox and WebKit, the control's `required` state equals a native control's with `required` (§9).
  - **For: a consumer's validator can read it.** A form library or the consumer's own code reads `field.required` to decide whether to validate. So one declaration announces the control and drives the consumer's check. As a typed member, it is also discoverable.
  - **Neutral: the controlled principle.** `required` is consumer state, and `aria-required` derives from it. Both options are controlled.
  - **Form libraries that read the DOM attribute** treat it as a rule of their own and validate in JavaScript. That fits this model: the consumer's validator then calls `setCustomValidity`. The architect didn't verify which libraries read it, and none blocks submission natively through it.
- **Why accept.** What the challenge leaves against it is one documentation risk, against an API that announces correctly on all six controls today, needs no fix first, and follows the same rule as `error`.
- **Cost:** one more attribute member and one more branch in the hook. It isn't measured separately, and §4's reading covers it.
- **The alternative, not adopted:** host `aria-required`. It needs `RF-94` fixed for the checkbox and the radio, and it puts the state on two nodes until `RF-94`'s mirroring half is fixed too.

### The radio and the switches carry `error` and `required`, as the other controls do: `RD-46`

This is the owner's answer to `FV-Q3`.

- **The same members on all six.** A form library sets `error`, `required` and `setCustomValidity` on each control the same way.
- **The radio and the switches draw nothing for `error`.** Material defines no error appearance for them. `:state(error)` is there for the consumer's styles.
- **Assistive technology:**
  - Chromium and WebKit expose the radio's and the switch's control as `invalid` with `error` set, as they do the native radio and switch (§9).
  - Firefox's `invalid` state isn't read, because Marionette doesn't report it.
  - Whether a screen reader announces it is deferred to the accessibility-testing unit (§9).
- **Some ARIA references** list `aria-invalid` for `checkbox`, `switch` and `radiogroup`, and not for `radio`. Both engines that the probe reads expose it on a radio. An `mx-radio-group` would carry a group's invalidity later.

## Owner's choices

All three were answered by the owner on 2026-11-22, relayed by the coordinator. `FV-Q2` was settled by his acceptance of `RD-45`.

### FV-Q1 — Does the checkbox's error appearance come with this unit?

**Answered: in a follow-up unit,** as the architect recommended.

- Material's checkbox has an error appearance: `md.comp.checkbox` holds 24 tokens whose names contain `error`, and `checkbox/styles/utils.ts:42` drops them today.
- Until the follow-up lands, the checkbox's `error` reaches assistive technology and draws nothing. The docs say so.
- The follow-up does the token grouping, the `:state(error)` renderer, the visual-contract rows and the baselines, which `repo:RD-13` records in a pull request of their own. It is `RF-95`.

### FV-Q2 — How is a required control announced?

**Answered: `required`, translated only into `aria-required`** (`RD-45`). The owner leaned towards it and asked for a challenge. The architect's first recommendation was the host's `aria-required`. The accessibility-tree readings of §9 changed it: a host attribute reaches two nodes in the components that mirror `aria-*`, and none of the right ones in the checkbox and the radio. The architect then recommended the owner's leaning, as `RD-45` argues, and the owner accepted it.

### FV-Q3 — Do the radio and the switches carry `error` too?

**Answered: yes,** as the architect recommended, with screen readers to be checked. `RD-46` records it, and §9 says what is established and how the rest is.

## 4. What each component pays

**This is an estimate.** [`checks/size-estimate.txt`](checks/size-estimate.txt) compares hand-written stand-ins, minified by esbuild, not the flattener's output.

| Composition | Minified | Brotli |
| --- | --- | --- |
| One class with the trait and the hook, against one without | +778 B | +234 B |
| A second class with the trait, in the same bundle | +553 B | +1 B |

- **A component's own entry pays about +230 B Brotli.** That is the hook and the attribute plumbing once, and the trait's members copied into the class. The flattener copies members per class (`RD-26`), and each component class pays its copy in minified bytes. Brotli removes nearly all of the repetition.
- **The text fields** subtract their three deleted methods.
- **A bundle of several components** pays the per-entry figure about once.
- **The implementer measures what lands** with `RD-24`'s rows: the six affected entries and `complete`. Per CONTRIBUTING §15, that is one joint reading, Brotli governing. No ceiling applies before the first publication (`RD-24`, `RD-7`).

## 5. Sequencing

1. **Done:** the owner accepted `RD-45`. The main slot's architect registered the decisions as `RD-35` to `RD-46`, §1's findings as `RF-96`, and §8's as `RF-94` and `RF-95`.
2. **`RF-94` is fixed in a unit of its own, not this one,** before it or beside it, as the owner confirmed. This unit doesn't wait for it, because `useValidatable` writes the control directly. The two units overlap in `useCheckableCore` only, and the second to land merges the first.
3. **Implementation starts after #126 merges.** It merged on 2026-11-22 as `2f18fb47a`. The implementer runs `git merge origin/main` on this branch, with no rebase. #126 and this unit both edit `TextFieldCore.ts`, around the value code and the deleted methods. The conflict is textual only, because validation reads nothing that RF-74 writes.
4. **Order of work:**
   1. core's trait, hook, export and rows;
   2. `aube exec just build` in `packages/core`;
   3. material-x's six elements, types, docs and rows;
   4. the size readings.
5. **The pull request opens** once the implementation is pushed, with `Refs` to the work-queue item the coordinator names.

## 6. Not adopted

- **A shared base class instead of the trait.** It is one copy per bundle instead of one per class, which is the same in Brotli, as §4 shows. It also fixes one place in every component's chain, and the owner asked for a trait.
- **`aria-invalid` and `aria-required` on the host as the controlled API,** with `:state(error)` derived from `aria-invalid`. That would need no new attribute. But the host attribute reaches a second node in every engine, and the checkbox's and the radio's control not at all (§9). The owner accepted `error`, and `RD-45` argues `required`.
- **Native validators, I1 and I2:** `RD-36`.
- **Automatic error timing,** the review's I4 B and C: the owner chose A.
- **`:user-invalid` for timing:** the engines disagree (P7).
- **Keeping `setValidity(flags, message)`:** it is non-native, and CONTRIBUTING §8 applies.
- **An `error` slot, or rendering `validationMessage`:** `RD-43`.

## 7. Not established

- **Not checked:** real Safari, and any screen reader's speech, deferred to the accessibility-testing unit (§9). The bubble's position with each anchor.
- **Not read:** Firefox's `invalid` state, which Marionette doesn't report (§9).
- **Not run:** the reading of #124, which `repo:RF-74`'s ruling rests on. The ruling doesn't need a run.
- **ARIA:** whether `aria-invalid` is supported on `radio` is taken from secondary references, not read in the specification. Two engines expose it.
- **Form libraries:** which of them read the `required` attribute (`RD-45`) wasn't verified.

## 8. Findings

The main slot's architect registered them as `RF-94` and `RF-95` on #158. The register's entries are the record, and these sections are the proposals they were registered from. Each names its tier, its evidence and the property that must hold.

### `mx-checkbox` and `mx-radio` can't be named: neither a host `aria-label` nor a `<label for>` reaches the control: `RF-94` (was `FV-F1`)

- **Tier A, pre-existing.** The owner calls it a bug.
- **What happens:**
  - `useCheckableCore` doesn't call `useARIA` (`CheckableCore.ts`), so no host `aria-*` reaches the internal `<input>`.
  - `<mx-checkbox aria-label="Accept terms">` exposes an unnamed `checkbox`, in Chromium, Firefox and WebKit. The host becomes a second node named _"Accept terms"_: `generic` in Chromium and Firefox, `group` in WebKit. `mx-radio` reads the same.
  - **A `<label for>` that labels the host names nothing either:** the checkbox stays unnamed in each engine. The label reaches the host's `labels` and not the control.
  - The host's `aria-required` and `aria-invalid` stay on the host's node too (§9, the `host` variant).
- **Why it is a problem:** neither control has a way to be named. No content slot exists to name it either. The JSDoc of both elements says that _"It can be associated with an external `<label>` via the standard `for`/`id` mechanism"_, which the readings contradict.
- **Evidence:** [`checks/aria-states.txt`](checks/aria-states.txt), the `main` and `host` variants, built from `origin/main` `00fd35592`.
- **Required property:** in each engine at `RD-20`'s floor, the checkbox's or the radio's accessible control carries the name that a host `aria-label`, a host `aria-labelledby` or a `<label>` labelling the host gives. The host's `aria-*` states reach the control.
- **Where the fix belongs:** a unit of its own, before this one or beside it (§5). It needs a decision of its own on how a light-DOM label reaches a shadow control, and validation doesn't depend on it, because `useValidatable` writes the control directly.
  - **One question for that unit, not established:** a mirrored `aria-labelledby` or `aria-describedby` holds ids that resolve in the shadow root's scope, not the document's.
- **Size:** not known before that decision.

### A host's `aria-*` that is mirrored to the control stays on the host, which every engine exposes as a second named node: `RF-94` (was `FV-F2`)

- **Tier A, pre-existing.**
- **What happens:** `useARIA` copies the host's `aria-*` to the control and leaves it on the host (`TextFieldCore.ts:143`, `ButtonCore.ts:110`). `<mx-text-field aria-label="Host-labelled field">` and `<mx-switch-button aria-label="Host-labelled switch">` each expose two named nodes: the control, and the host as `generic` (Chromium, Firefox) or `group` (WebKit) with the same name. A state on the host's node was read on the checkbox's host, which doesn't mirror. On a mirroring host it wasn't read.
- **Why it is a problem:** assistive technology can announce the name twice, or a group around the control, and the state on a node with no role.
- **Evidence:** [`checks/aria-states.txt`](checks/aria-states.txt), the `mx-text-field aria-label` and `mx-switch aria-label` rows and the `host` variant.
- **Required property:** a host's `aria-*` attribute reaches the accessibility tree on the control only.
- **Not established:** what a screen reader announces for the extra node (§9). The other `useARIA` adopters weren't read.
- **Where the fix belongs:** the same unit and the same entry as the previous section, `RF-94`, because they share a mechanism.

### `mx-checkbox` draws no error appearance: `RF-95` (was `FV-F3`)

- **Tier A, once this unit lands.**
- **What happens:** `checkbox/styles/utils.ts:42` drops every token whose name contains `error`, so `:state(error)` changes nothing visible. Material's `md.comp.checkbox` holds 24 of them.
- **Required property:** `mx-checkbox` with `error` set draws Material's error appearance, observed by visual-contract rows.
- **Where:** the follow-up unit of `FV-Q1`, after this one.

## 9. Accessibility proof, and the screen-reader method

**What this container establishes is what each browser exposes to the platform's accessibility interface,** read from each engine's own tree. [`probes/aria-states.ts`](probes/aria-states.ts) uses `.plan/list-roles-1/probes/list-roles.ts`'s readers:

- Chromium through CDP's `Accessibility.getPartialAXTree`;
- WebKit through its inspector's `DOM.getAccessibilityPropertiesForNode`;
- Firefox through Marionette's `GetAccessibilityPropertiesForElement`.

Playwright's ARIA snapshot isn't used: it computes roles in page script and reports neither state. The probe reads the built components and, beside them, native controls with the same attributes.

- **The `target` variant writes what `useValidatable` would** (`aria-invalid` and `aria-required` on each control):

  | Control | Chromium `invalid` | WebKit `invalid` | WebKit `required` | Firefox `required` |
  | --- | --- | --- | --- | --- |
  | text field's `<input>` | `"true"` | `"true"` | `true` | `"true"` |
  | checkbox's `<input>` | `"true"` | `"true"` | `true` | `"true"` |
  | radio's `<input>` | `"true"` | `"true"` | `true` | `"true"` |
  | switch's `<button role=switch>` | `"true"` | `"true"` | `true` | `"true"` |
  - Each component's control reads as the native control with the same attributes does, in each column.
  - Chromium's CDP reports `required` only for a `textbox`, `true` for both the text field and the native one, and for no checkbox, radio or switch, native ones included. That is a limit of the instrument, not a difference from native.

- **Firefox's `invalid` state isn't readable here,** because Marionette's properties carry `required` and `checked` and no invalid state.
- **`:required` doesn't match a form-associated host** with `required`, a plain one or `mx-text-field`, in any engine. A native `<input required>` matches.
- **The `main` and `host` variants** are `RF-94`'s evidence.

**What a screen reader adds, and where it can run:**

1. **The accessibility tree, in this container (done).** It shows what the browser hands the screen reader. It doesn't show what the screen reader says, or whether it announces a state on a given role.
2. **The platform's interface, in this container (possible, not done).** Linux screen readers read AT-SPI2.
   - Headed Chromium and Firefox under Xvfb, with a D-Bus session and `at-spi2-core`, expose each control's `STATE_INVALID_ENTRY` and `STATE_REQUIRED` to a small `pyatspi` or `python3-gi` script.
   - That is what Orca reads, and it would close Firefox's `invalid` gap.
   - It costs container packages, roughly tens of megabytes. The disk holding the slots is 85% full.
   - Whether Playwright's WebKit build reports to AT-SPI isn't known.
3. **Speech, with a real screen reader (needs the owner's machine or a runner).** Three candidates:
   - **Orca with Firefox and Chromium on the owner's Fedora host.** Orca is a desktop accessibility application, not a development tool, but installing it is the owner's decision under his host rule.
   - **VoiceOver with Safari** needs a Mac, and **NVDA or JAWS** needs Windows. Neither is available here.
   - **Automation:** Guidepup drives VoiceOver on GitHub's macOS runners and NVDA on its Windows runners, and records what they speak. That would be a new development dependency and a workflow, an owner decision outside this unit.
   - **What the speech check must establish,** for each of the six elements with `error` and `required` set:
     - the control's announcement includes _invalid_ and _required_, for the radio and the switch in particular;
     - the `support` text is read as the description;
     - and, for `RF-94`, whether the host's extra node is announced.

- **This unit's rows** (`RD-44`, row 11) pin layer 1 in Chromium. That is all this unit does for screen readers, by the owner's choice.
- **Layers 2 and 3 are deferred together:** AT-SPI2, Orca and Guidepup. The owner wants one active accessibility-testing unit after the main material-x work ends, and their readings belong to it.

## 11. Implementation

Implemented on this branch by the implementer in slot `d`, after `git merge origin/main` at `836d72d99`. [`checks/implementation-readings.txt`](checks/implementation-readings.txt) holds the rows, the mutations and the size readings.

- **Core:** [`validatable.ts`](../../packages/core/src/traits/validatable.ts) holds `Validatable` and `useValidatable` as `FV-D1` states, exported at `@ydinjs/core/traits/validatable.js` through core's `files.json`. `setCustomValidity` passes `{ customError: message !== '' }`, so an empty message clears every flag. The anchor is a module `WeakMap`, as `FocusForwarding`'s is. The hook writes `aria-invalid` and `aria-required` to the target through `transfer`.
- **One change to core's types that the plan doesn't name:** `AttributeKeys` in `attribute-traits.ts` now leaves out read-only keys. Without it, `Props<typeof Validatable>` holds `validity`, `validationMessage`, `willValidate`, `form` and `labels`, because a getter isn't a method. A getter with no setter was never an attribute, so no existing trait's props change. Two declaration rows pin it.
- **material-x:** `TextFieldCore`, `useCheckableCore` and `useSwitchCore` compose `Validatable`, call `useValidatable` with `FV-D1`'s target, and set `:state(error)` from `error`. `TextFieldLike` gains `readonly`, transferred to the internal field. `setValidity` and the two overrides are deleted. Each `*Events` gains `invalid`, and each `*Properties` gains `ValidatableProps` through its core's props.
- **Rows:** `FV-D10`'s rows 1 to 10 are in `packages/material-x/tests/validatable.browser.test.ts`, for the six elements, in three engines. Row 11 needed the CDP reader to report each node's properties: `AccessibilityNode` gains `properties`, which `list-roles` doesn't read.
- **Mutations:** fifteen, one per property, run by [`probes/mutations.py.txt`](probes/mutations.py.txt). Each fails at least one row. `willValidate`'s mutation fails 14 material-x rows in Chromium: each element's two disabled rows and both text fields' `readonly` row. `reportValidity`'s result is caught by core's row only.
- **Size:** against §4's estimate of about +230 B Brotli per entry, the six entries read +184 B to +260 B and `complete` +214 B. The other thirteen rows and core's two rows don't move, which is the control.
- **Docs:** the six elements' JSDoc and component pages carry `FV-D10`'s text, `FV-D3`'s recipe and `FV-D6`'s reset note. The project documentation unit (`repo:RD-32`) is prepared as [`checks/docs-unit.patch.txt`](checks/docs-unit.patch.txt), which applies to this branch with `git apply`. It updates the switch, radio and text field sections of `accessibility.md` and `architecture.md`'s list of shared traits. `accessibility.md` has no checkbox section, so the patch adds none.

## 10. Revisions

- **2026-11-22, `e39b43ec8`:** the first plan, with `FV-D1` to `FV-D10` and `FV-Q1` to `FV-Q3`.
- **2026-11-22, `a65d77bae`,** for the owner's answers:
  - `FV-Q1` and `FV-Q3` answered.
  - `FV-Q2`'s recommendation changed from host `aria-required` to the owner's `required`, on §9's readings: `FV-D11`.
  - Added `FV-D12`, the findings `FV-F1` to `FV-F3`, §9's readings and method, rows 10 and 11.
  - `FV-D1`, `FV-D2`, `FV-D3`, `FV-D7`, `FV-D10` and §5 to §7 amended to match.
- **2026-11-22, this revision,** for the owner's final answers. The plan is approved for implementation:
  - `FV-D11` accepted, so `FV-Q2` is answered;
  - `FV-F1` and `FV-F2` confirmed as a unit of their own (§5);
  - screen readers limited to §9's layer 1 with row 11, and layers 2 and 3 deferred to one accessibility-testing unit after the main material-x work (`FV-D12`, §7, §9);
  - #126's merge recorded in §5.
- **2026-11-22, the implementation:** §11 added.
- **2026-11-22, the registration, by the main slot's architect at `76d354ee3`:**
  - `FV-D1` to `FV-D12` became `RD-35` to `RD-46`, §1's findings became `RF-96`, and `FV-F1` to `FV-F3` became `RF-94` and `RF-95`;
  - the status line, the _Written by_ bullet and the headings of §3 and §8 name the addresses. §3 was _"Proposed decisions"_ and §8 _"Proposed findings"_, and each section's heading opened with its local name;
  - the text before §10 cites the addresses in place of the local names;
  - `RD-40`'s #124 bullet cites `repo:RF-74`'s ruling. It said that #124 _"is a question of the controlled principle, not of validation, for its own unit"_, and §7 listed _"`FV-D6`'s reading of #124"_ as not run;
  - §5's step 1 is done. No required property changed. §11 isn't changed, and §10's earlier entries keep the local names.
- **2026-11-22, the feature proof's correction (`reviewer-1`):** §11's mutations bullet named only the disabled rows as catching `willValidate`'s mutation. Both text fields' `readonly` rows catch it too, as [`mutations.txt`](../reviews/form-validation-1/checks/mutations.txt) lists. The count, 14, was right.