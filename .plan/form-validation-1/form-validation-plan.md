# Controlled form validation for material-x's form-associated components

**Status:** proposed, waiting for the owner's answers to [`FV-Q1` to `FV-Q3`](#owners-choices). Nothing here is registered yet.

- **Read at** `origin/main` `00fd35592`. PR [#126](https://github.com/ausginer/material-x/pull/126) (`repo:RF-74`, the text fields' default value and form reset) is open on `material-x/text-field-reset-1`. This plan builds on it and doesn't re-decide it.
- **Written by** the architect in slot `b`, on this branch in slot `d`. An architect outside the main slot proposes and doesn't record ([agent workflow](../../.agents/docs/agent-workflow.md#parallel-units)). So the decisions below carry local names, `FV-D1` to `FV-D10`, and owner questions `FV-Q1` to `FV-Q3`. Once the owner answers, the main slot's architect registers them in [`00-index.md`](../00-index.md), with the findings of [§1](#1-what-is-wrong-today) as one `RF-` entry that they close.
- **Inputs:** the architect's read-only review of the text fields' validation API, reported to the coordinator on 2026-11-22 and recorded only here, in §1. The owner's answers to it, relayed by the coordinator on 2026-11-22:
  - a general system that reaches each component through a trait and a use-hook;
  - the review's I3 (the native names), I4 A (a controlled `error` attribute), I5 (i) (the error text stays in `support`) and I6 (tests and docs);
  - _"as controlled as possible"_: companies validate with their own code or a validator library, so native validators are unlikely to be needed. The system uses the native machinery as far as it can and never switches into an uncontrolled mode;
  - scope: the text fields, the checkbox, the radio and the switch buttons.
- **Governing records:** [`architecture.md`](../../.agents/docs/architecture.md) §Components (_every component is controlled_, and the text fields' exception), `repo:RF-50`, `repo:RF-74`, `repo:RD-20` (the browser floor), `repo:RD-24` (size rows), `repo:RD-26` and `repo:RD-33` (traits), `repo:RD-32` (one branch per unit), CONTRIBUTING §1.1, §2, §8 and §15.
- **Evidence:** [`checks/probe-readings.txt`](checks/probe-readings.txt), the output of [`probes/review-probe.mjs.txt`](probes/review-probe.mjs.txt) and [`probes/plan-probe.mjs.txt`](probes/plan-probe.mjs.txt) in Chromium 158, Firefox 159 and Playwright's WebKit 27.2. Each probe is a minimal form-associated element that reproduces the mechanism it tests, not the built component. [`checks/size-estimate.txt`](checks/size-estimate.txt) is a size estimate from hand-written stand-ins.

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

## 3. Proposed decisions

### FV-D1 — `Validatable` and `useValidatable` live in `@ydinjs/core`, at `@ydinjs/core/traits/validatable.js`

**Why core:** nothing in it is Material's. It forwards `ElementInternals`, as the form traits already in core (`Disableable`, `Nameable`, `Valuable`, `Checkable`) forward attributes. A third-party author building on core needs the same surface. `"sideEffects": false` (`repo:RD-30`) keeps it out of any bundle that doesn't import it. Core is 0.1.0, and the new subpath goes into its `exports`.

**The trait `Validatable`**, bound `Controlled`, as `FocusForwarding`'s is. Required properties:

- `validity`, `validationMessage`, `willValidate`, `form` and `labels` are read-only. Each returns the host's `ElementInternals` value, the same object.
- `checkValidity()` and `reportValidity()` return the internals' result. The platform fires `invalid` at the host, which doesn't bubble and is cancelable (`plan-probe`). They change no attribute, state or ARIA.
- `setCustomValidity(message)`:
  - a non-empty message makes the host invalid with `customError` and that message;
  - an empty one makes it valid.
  - The internals throw a `TypeError` for a true flag with an empty message, in each engine (`plan-probe`), so the empty message must map to no flags, as a native control's does.
  - Its validation anchor is the target that `useValidatable` registered (`FV-D5`).
- `error` is a boolean attribute member (`accessor error!: boolean`, `Bool`), observed and reflected. `ValidatableProps` is `Props<typeof Validatable>`.

**The hook `useValidatable(host, target)`:**

- `target` is the component's accessible control: the text fields' `.input`, the checkbox's and the radio's `#input`, and the switches' `.host` button.
- It registers `target` as the host's validation anchor.
- While `error` is set, `target`'s `aria-invalid` is `"true"`. Otherwise `target` has no `aria-invalid`.
- It sets no custom state, as `useCheckable` sets none (`checkable.ts`, _"Does not wire form internals or custom states"_). How the trait reaches the registered target is the implementer's choice. `FocusForwarding`'s module `WeakMap` is a precedent.

### FV-D2 — Validity is the consumer's custom validity only: the internal field's validity isn't copied, and no constraint attribute is added except `readonly`

The owner's direction decides the review's I1 and I2.

- **I2, copying the internal field's validity, is not adopted.** It would make `type`, `required` and the other constraints change validity as the user types: native validators, uncontrolled.
- **`type` doesn't validate.** On the text field, `type` sets the keyboard, autofill and the native sanitization of the text. The element's documentation says that validation is the consumer's. P2 is closed by that statement, not by code.
- **The constraint attributes `required`, `minlength`, `maxlength`, `pattern`, `min`, `max` and `step` are not adopted.** Each is a validator. `maxlength` also stops typing at the limit, which isn't validation, and could be added on request as an input limit. `required`'s announcement is `FV-Q2`'s.
- **`readonly` earns its bytes** (`FV-D4`), because it is an editing state, not a validator.

### FV-D3 — `error` is set by the consumer only, and `checkValidity()` and `reportValidity()` don't touch it

- **What follows `error`.** In material-x, `:state(error)` follows `error` in `TextFieldCore`, `useCheckableCore` and `useSwitchCore`. The text fields' existing `:state(error)` styles draw it.
- **What doesn't change it.** No method, event, form submission or reset sets or clears `error`.
- **A host's own `aria-invalid` is outside the contract** (CONTRIBUTING §1.1). The text fields and the switches mirror the host's `aria-*` to the target (`TextFieldCore.ts:143`, `ButtonCore.ts:110`), so a host `aria-invalid` and `error` would both write the target's. The JSDoc of `error` says to use `error`, and the library doesn't arbitrate between them.
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

### FV-D4 — The text fields pass `readonly` to the internal field

- `readonly` joins `TextFieldLike`, as a `Bool` attribute transferred to the internal field, for both fields.
- The platform already removes a host with `readonly` from validation.
- Its member is named as the attribute is, following `inputmode`'s precedent in the same trait.
- The checkable controls don't get it: HTML gives `readonly` no meaning on a checkbox or a radio.

### FV-D5 — The validation anchor is the component's accessible control

- Each component's `useValidatable` target is also its validation anchor, so the browser's bubble points at the control and not at the host.
- The switches' host is `display: contents` (`button/styles/default/main.styles.css`'s `:host`), so it has no box to anchor to.
- No row observes the anchor, because the bubble isn't readable in the gate.

### FV-D6 — A form reset leaves validity and `error` as they are

- The platform keeps custom validity across `form.reset()` in each engine (`plan-probe`), and `error` is controlled state. The consumer clears both in the form's `reset` listener, and the docs say so.
- **Validation needs no `formReset`.** `repo:RF-74`'s reset restores the text fields' value and nothing else.
- **[#124](https://github.com/ausginer/material-x/issues/124) is not in this plan.** Read at `00fd35592`, not run:
  - a checkable control's `checked` is both its state and the attribute that declares its default;
  - activation doesn't change it;
  - so a reset has something to restore only after the consumer has changed `checked`, and restoring the markup's value then would need a default separate from the state.
  - That is a question of the controlled principle, not of validation, for its own unit.

### FV-D7 — Scope: six elements, and not the plain buttons

- **In scope:** `mx-text-field`, `mx-multiline-text-field`, `mx-checkbox`, `mx-radio`, `mx-switch-button` and `mx-switch-icon-button`. They compose `Validatable` through `TextFieldCore`, `CheckableCoreTraits` and `SwitchCoreTraits`.
- **Out of scope:** `mx-button`, `mx-icon-button` and `mx-split-button` are form-associated to submit and reset a form, carry no value of their own, and keep their surface.

### FV-D8 — `setValidity` and the text fields' overrides are deleted

- `setValidity(flags, message)` goes, with no alias (CONTRIBUTING §8: material-x and core are 0.1.0 and unreleased). It let a consumer raise any flag, `valueMissing` included, which no native control allows.
- The overrides of `checkValidity()` and `reportValidity()` go with it, replaced by the trait's.

### FV-D9 — The error text stays in the `support` slot

- The consumer puts the message in `support` while `error` is set. It is already in the text fields' `aria-describedby` fallback.
- No slot is added, and `validationMessage` isn't rendered. This was owner-accepted as I5 (i).

### FV-D10 — Tests, types and docs

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
    8. `form` is the owner form, and `labels` holds a `<label for>` that names the host.
    9. Text fields only: `readonly` makes the internal field read-only and `willValidate` `false`, and its removal restores both.
- **Snapshots:** `tests/__snapshots__/traits-baseline.json` and the runtime shape snapshot change for the new members.
- **Types:** each element's `*Properties` gains `ValidatableProps`, and `*Events` gains `invalid: Event`.
- **Docs:**
  - Each element's JSDoc documents `error`, `setCustomValidity`, the `invalid` event, `FV-D3`'s precondition, and that the element has no native validators.
  - The text field also documents `readonly`, and that `type` doesn't validate.
  - Each component page carries `FV-D3`'s recipe and `FV-D6`'s reset note.
- **Project documentation is its own unit** (`repo:RD-32`). The updates to `accessibility.md`, where the text fields' _Missing requirements_ changes, and to `architecture.md`'s list of shared traits go in a separate pull request after this one.

## Owner's choices

### FV-Q1 — Does the checkbox's error appearance come with this unit?

Material's checkbox has an error appearance: `md.comp.checkbox` holds 24 tokens whose names contain `error`. `checkbox/styles/utils.ts:42` drops them today. Without them, the checkbox's `error` reaches assistive technology and draws nothing.

- **Follow-up unit (recommended).** This unit stays behavioural, and the follow-up does the token grouping, the `:state(error)` renderer, the visual-contract rows and the baselines, which `repo:RD-13` records in a pull request of their own.
- **In this unit:** one pull request, with two kinds of review.

### FV-Q2 — How is a required control announced?

Without a native validator, nothing says a control is required.

- **No `required` attribute (recommended).** The consumer sets `aria-required="true"` on the host, which the text fields and the switches mirror to the control. Nothing native-looking behaves non-natively.
  - **A gap to register:** `mx-checkbox` and `mx-radio` mirror no host `aria-*` (`useCheckableCore` calls no `useARIA`), so they can't be announced as required, or named by `aria-label`, until they do.
- **A `required` attribute that sets `aria-required` only.** It costs a transfer per component. Its name promises blocking that the element doesn't do.
- **A `required` that validates** (`valueMissing`) is excluded by the owner's direction.

### FV-Q3 — Do the radio and the switches carry `error` too?

Material defines no error appearance for a radio or a switch.

- **Yes, uniformly (recommended).** A form library sets `error` and `setCustomValidity` on every control the same way. `:state(error)` is there for a consumer's styles, and `aria-invalid` is announced.
  - **A caveat, not established:** some ARIA references support `aria-invalid` on `checkbox`, `switch` and `radiogroup` but not on `radio`, and ARIA 1.3's drafts discuss deprecating it as a global attribute. An `mx-radio-group` would carry the group's invalidity later.
- **Validity surface only for those three:** two traits instead of one, and an API that differs by control.

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

1. The owner answers `FV-Q1` to `FV-Q3`. The main slot's architect registers the decisions and the finding, and amends this plan on this branch if an answer changes it.
2. **Implementation starts after #126 merges.** The implementer runs `git merge origin/main` on this branch, with no rebase. #126 and this unit both edit `TextFieldCore.ts`, around the value code and the deleted methods. The conflict is textual only, because validation reads nothing that RF-74 writes.
3. **Order of work:**
   1. core's trait, hook, export and rows;
   2. `aube exec just build` in `packages/core`;
   3. material-x's six elements, types, docs and rows;
   4. the size readings.
4. **The pull request opens** once the implementation is pushed, with `Refs` to the work-queue item the coordinator names.

## 6. Not adopted

- **A shared base class instead of the trait.** It is one copy per bundle instead of one per class, which is the same in Brotli, as §4 shows. It also fixes one place in every component's chain, and the owner asked for a trait.
- **`aria-invalid` on the host as the controlled API,** with `:state(error)` derived from it. That would be one attribute instead of two. But the checkbox and the radio don't mirror host ARIA, the host isn't the accessible node, and the owner accepted `error`.
- **Native validators, I1 and I2:** `FV-D2`.
- **Automatic error timing,** the review's I4 B and C: the owner chose A.
- **`:user-invalid` for timing:** the engines disagree (P7).
- **Keeping `setValidity(flags, message)`:** it is non-native, and CONTRIBUTING §8 applies.
- **An `error` slot, or rendering `validationMessage`:** `FV-D9`.

## 7. Not established

- **Not checked:** real Safari and screen readers. The bubble's position with each anchor.
- **Not run:** `FV-D6`'s reading of #124.
- **ARIA:** support for `aria-invalid` on `radio` is taken from secondary references, not read in the specification.