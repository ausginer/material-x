# The component's own `aria-*` value — plan

**For `repo:RF-130` (#232).** Planned on 2026-11-24 by an architect, on the coordinator's task, on `core/aria-own-value-1` from `main` at `eddf39e7b`. The owner approved planning it: _"понял, да, делаем"_ ("got it, yes, let's do it"). **Status: closed on 2026-11-25, with `repo:RF-130`'s last note. Implemented at `65f822807`, proved, ruled on in [Feature proof's rulings](#feature-proofs-rulings), and the rulings' list done at `b7dcdde75`. No question is open.** The owner answered [Q1](#q1--what-does-the-control-show-while-the-host-gives-the-name) on 2026-11-24 with (a), and the entry's note records it. Labels `OV-…` are local to this plan.

## The answer in short

- **The component gives its own value to the mirror, and the mirror writes the control** (`OV-1`). A component calls `setOwnARIA(target, name, value)` in place of writing the attribute. `useARIA` keeps the value and writes **the host's value, or the component's own if the host gives none.** The control is then a function of the two, so no order matters.
- **The host's attributes stay as they are.** Nothing is removed from the host, so `RF-94`'s rejection isn't met. `RF-94` stays open.
- **Cost:** `complete` +51 bytes Brotli, and at most +70 on an element. It isn't expensive for the defect, so there is no reason for a narrower repair.
- **While the host gives the name, the control shows the host's value,** by the owner's answer to Q1. It is the candidate measured.

## Readings

[`candidates.mjs`](probes/candidates.mjs) applies each candidate, builds core and material-x, reads the sizes and runs [a probe](probes/own-value.browser.test.ts.txt) on the sources, and restores them. The probe makes 150 seeded random sequences for each of nine pairs of element and name. A sequence has 12 steps out of: the host's attribute set or removed, the component's source set or removed, connect, take out, and the end of a task. It starts before the first connect. It reads the control at the end of each task and, without a task between, right after each connect: 709 reads for each pair. Two counts, in [Chromium](checks/orders-chromium.txt), [Firefox](checks/orders-firefox.txt) and [WebKit](checks/orders-webkit.txt), which read the same:

|  | Wrong while the host gives nothing, per pair | Wrong while it gives the name, for "the host's value", per pair |
| --- | --- | --- |
| `main` | 51 at the end of a task and 28 right after a connect (the switch's `aria-checked`: 89 and 49) | 0 to 17 |
| **push, host wins (`OV-1`)** | **0** | **0** |
| pull, last write stands | 0 | 0 to 17, as `main` |

The second column for `main` and _pull_ isn't a defect against the entry as registered. It is what differs by order today, and what Q1's answer settles.

**Sizes,** Brotli bytes from `size-limit` against `main` ([every row](checks/sizes.txt)):

| Candidate | `complete` | `link-button` | `switch-button` | `list-button-item` | `list-link-item` | `text-field` | `checkbox`, `radio` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **push, host wins, no snapshot (`OV-1`)** | **+51** | **+37** | **+40** | **+63** | **+28** | **+63** | **+35, +31** |
| push, with a snapshot of the template | +65 | +67 | +96 | +93 | +34 | +99 | +35, +31 |
| the same, the component's value wins | +30 | +65 | +98 | +87 | +50 | +116 | +35, +31 |
| pull: each component's transformer | +65 | +23 | +39 | +26 | +12 | +45 | 0, 0 |
| pull for the two link elements only | +49 | +23 | +18 | +3 | +12 | +4 | 0, 0 |
| push without a snapshot, with the text fields' slots too | +72 | +37 | +40 | +63 | +28 | +38 | +35, +31 |

A row of `complete` differs from its neighbors by a few tens of bytes for reasons of compression: the first and the sixth candidate differ by 21 there, with less source in the sixth. So `complete` doesn't rank the candidates, and what they remove or add in source does. `mx-list-link-item`, `mx-list-button-item` and the buttons share the code.

**Not read:** the time of a connect and the memory for each host, which grows by one `Map` and one `WeakMap` entry. `RF-124`'s recheck found no cost in time for its own change. Safari, screen readers, and the whole suites in Firefox and WebKit.

## Decisions

### OV-1 — The component pushes its value, and `useARIA` writes host-or-own

- **`setOwnARIA(target, name, value)`,** exported from `@ydinjs/core/controllers/useARIA.js`. `value` is the serialized value, or `null` for none. If `useARIA` has that target, it keeps the value and writes the name once from the two. Otherwise it writes the attribute, as today, so `mx-checkbox` and `mx-radio`, which have no mirror, don't change.
- **`useARIA` writes** `transform(name, host value) ?? own value ?? none`, at each of its present times: the microtask of a change of the host, and the connect. `setOwnARIA` writes at once. **What it must hold:** the control's value of a name depends on the host's attribute and the own value only, after each task and right after each connect, wherever the host is and whether it has ever been connected.
- **A name with no own value is as today,** including the one that the host has never had, which nothing touches.
- **A value that was written straight to the target isn't its own value.** The sortable list's `aria-description` is written so. It isn't in this unit ([below](#not-in-this-unit)).
- **A setup call, for a template's value.** `useSwitchCore` gives `aria-checked="false"` by `setOwnARIA` right after its `useARIA`, and the two templates drop the attribute. A template's value is the component's and nothing else says it. The snapshot of the target's attributes at `useARIA` does it for any template, for 14 bytes in `complete` and 6 to 56 in the elements, and reads each target's attributes at construction. The call is what the package needs today. `setOwnARIA` called before `useARIA` is lost as an own value, and its JSDoc says so: call it after `useARIA` in the setup, or later from a handler.
- **The text fields' transformer stays.** It already answers for `null` with the ids of the filled slots, and the property holds for it. The pushed form of it depends on `RF-131` and is [below](#not-in-this-unit).
- **Not adopted, pull:** each component's transformer computes the same value from the host's attributes. It is smaller for a few elements and keeps every value in two places, the writer and the transformer. `useARIA`'s parameter then passes through three cores. It doesn't give Q1's answer without changing the writers too, where they would have to read the host for elements that have no mirror.
- **Not adopted, a memory of the target's value from before the host's:** a component that writes `"true"` while the host has `"true"` leaves no trace of having written, so the loss takes it. It is the ordinary case of `aria-disabled="true"` beside `disabled`.
- **Not adopted, the host's internals as the place for the own value:** it gives the host semantics, which is `RF-94`'s second node.

### OV-2 — The call sites

| Where | Today | With `OV-1` |
| --- | --- | --- |
| `core/traits/validatable.ts` | `transfer(target, 'aria-invalid' …)`, `aria-required` | `setOwnARIA`, two calls |
| `core/traits/selectable.ts` | `transfer(target, 'aria-selected' …)` | `setOwnARIA` |
| `core/traits/linkable.ts` | `target.ariaDisabled`, and the host's value when `disabled` goes | `setOwnARIA` with `'true'` or `null` |
| `material-x/list/list-link-item.ts` | `target.ariaCurrent` | `setOwnARIA` |
| `material-x/button/SwitchCore.ts`, the two templates | `target.ariaChecked`, `aria-checked="false"` in the template | `setOwnARIA`, at setup and at each change |

`useCheckable` has a branch for a target that isn't an input. It writes `aria-checked` on a change of the host's `aria-checked`. No caller passes such a target, and nothing in this unit changes it.

**Public contract.**

- `useARIA`'s JSDoc replaces _"The target's own writer may set the same attribute, and the last write stands"_ by the rule: the host's value, or the own one set through `setOwnARIA`. Writes that bypass it are still last-write.
- `useDisableableLinkable`'s JSDoc no longer restores the host's `aria-disabled` by itself: `useARIA` does. `href` and `tabindex` are as they are. `linkable.browser.test.ts`' row _should restore host-provided tabindex and aria-disabled when re-enabled_ is the only row of the suites that fails with the candidate ([core 1 of 303, material-x 0 of 573, in Chromium](checks/suites-chromium.txt)). It calls the hook without `useARIA`. It becomes two rows: the `tabindex` without the mirror, and `aria-disabled` with `useARIA` on the element.
- Core's README row of `useARIA` names the function. core is on no registry, so no alias is kept.

### OV-3 — Order with other work

- **`RF-131` (#234):** independent, either order. It changes `useSlot`, which this unit doesn't. The text fields' fallback reads its slots at the moment of the write, so it is right before and after.
- **The slider (#220), not on `main`:** it uses `useValidatable` and gets `error` and `required` with no change. Its `valuetext` transformer answers for `aria-valuetext` in `null`, which comes first, and its unmirrored names answer `null`, where there is no own value. Its rows are run when the second of the two merges `main`.
- **`RF-94`:** not touched. A repair that replaces the mirror would keep `setOwnARIA`'s call sites and replace what is behind them.

## Q1 — What does the control show while the host gives the name?

**Answered by the owner on 2026-11-24,** in chat, relayed by the coordinator: _"Q1 (a)"_. The options, the recommendation and the cost were shown to him. **The host's value, in every order.** So `mx-link-button` with `disabled` and the host's `aria-disabled="false"` says `"false"`, and `mx-list-link-item` with `selected` and `aria-current="step"` says `"step"`.

- **Why.** A custom element's default semantics work so: the host's attribute overrides them. `useARIA`'s connect already gave the host's value, and the text fields' ids follow the rule. `aria-current`'s `page` is the component's guess.
- **Cost, accepted:** a page that says something false about its own element is believed. The link in the example looks disabled and blocks clicks, and says that it isn't.
- **Not chosen:** (b) the component's value where it has one: the page could then never give `aria-checked`. (c) The later change, as today: it depends on the order, and no saving in bytes is established.

## The implementer's work

On `core/aria-own-value-1`, in this order:

1. **Core:** `useARIA.ts` (`OV-1`), `validatable.ts`, `selectable.ts`, `linkable.ts`, with the JSDoc and the README row. `probes/candidates.mjs`' _push, host wins, no snapshot_ is one form that reads right in the three engines. It isn't prescribed.
2. **material-x:** `SwitchCore.ts` with the two templates, and `list-link-item.ts`.
3. **Rows, in the three engines.** In core (`useARIA.browser.test.ts`), for a target whose own value is set through `setOwnARIA`:
   - the host sets the name, and loses it: the control has the own value again;
   - the own value changes while the host has the name: the control has the host's, and after the loss the new own value. An own value of `null` is none;
   - `setOwnARIA` on a target with no mirror writes the attribute;
   - the transformer's answer comes before the own value, and its `null` gives the own value;
   - in one task: the loss and the own value's change, in both orders, connected; while out with the connect in the same task; before the first connect. Each is read after the task, and the connect also synchronously.
   - **Witnesses:** without the own value the first and the fourth fail. With `setOwnARIA` writing straight, the second fails. With the own value written before a pending loss and not kept, the last fails.
4. **In material-x,** a table of the nine pairs of the probe, at `tests/aria-own-value.browser.test.ts`, each in four cases: the source set, the host's name set and lost, while connected; the loss and the source in one task while out, then the connect in that task; the name set and lost before the first connect, with the source set; the source changed while the host has the name, to a state whose own value differs from the host's, where the control keeps the host's, and after the loss has the own value. And the switch's `aria-checked="false"` after the host gets and loses the name before its first connect, with no change of `checked`. **Witness:** `main` fails each of the first three for each pair, and the template's, in the three engines. `main` fails the fourth too, for each pair but `mx-link-button` with the host's `"true"`, where it already keeps the host's value.
5. The [probe](probes/own-value.browser.test.ts.txt) on the built change reads 0 in both columns. The two existing rows of `mx-link-button` in `button.browser.test.ts` and the sortable row stay.
6. Sizes against `main`, and the whole browser projects of core and material-x in each engine.

**Documentation, in its own pull request:** `accessibility.md`'s sentences that `useValidatable` writes the control directly (the switch's and the text fields') gain the mirror. The [rulings](#for-the-documentation-unit-247) have the lines, three more among them.

**Size:** small to medium. Four files in core, three and two templates in material-x, and the rows, which are most of it. No new dependency, no style and no public element surface.

## Not in this unit

- **The sortable list's `aria-description`.** A control loses the description if its host gives and loses one, until its item is updated or connected. The list writes it on the control with its own observer, which takes a removal by anyone as a consumer's removal that it must not undo. A description given back there needs a rule for which removal is whose. It is by reading and by `RF-124`'s reading, which has the value `null` after the loss and the list's own after the next connect. Nothing here makes it worse.
- **The text fields' fallback as a pushed value.** `useSlot`'s callback would set it, and the transformer, a cast and a lint exception go. It needs `RF-131`, because today a slot that changes while out runs no callback. It is +38 against +63 in `text-field` (read with `OV-1`) and needs no further plan: it is the owner's and the coordinator's to take as a cleanup after both.
- **Two hooks on one target.** No component has them. The later registration keeps the own values.

## Costs, in one place

| Cost | What |
| --- | --- |
| Bytes | `complete` +51 B Brotli. Elements +27 to +70, as single readings of a candidate. [What the built change costs](#feature-proofs-rulings) is an average of +55 to +58, and +31 to +63 for the elements read. `checkbox` and `radio` +35 and +31 for a function that they use as plain writing |
| Memory | a `Map` for each mirrored host, and a `WeakMap` entry |
| Contract | one new export in core, one rule in `useARIA`'s JSDoc, and `useDisableableLinkable` without the host's `aria-disabled` |
| Behavior | Where the host gives a name and the component changes after it, the control keeps the host's value. It took the component's before |

## Feature proof's rulings

On the [proof](../reviews/aria-own-value-1/feature-proof-claude.md) of `c035576e2`, by the architect, 2026-11-24, relayed by the coordinator. `origin/main` at `8663d722b` is merged. **`OV-1`, `OV-2` and Q1 (a) stand, and no behavior of the source changes.**

- **`reviewer-1`, accepted.** The base isn't the cause: `eddf39e7b` and `f9729a393` have the same sources. The plan's sizes are a candidate's, read by a probe that reads a list of private names which an earlier build left, so its bytes are of that list. The rows move with the list, by tens of bytes ([reading](checks/size-noise.txt), and [`complete-noise.txt`](https://github.com/ausginer/material-x/blob/37cb82784/.plan/focus-cover-1/checks/complete-noise.txt) of #245):
  - **What the change costs,** the same names in both trees: `complete` +181 minified bytes. Its Brotli difference averages +55 to +58, with a standard deviation of 35 to 38. The gate's -5 and the plan's +51 are single readings of it. Of the elements, `mx-text-field` averages +63 (standard deviation 32), `mx-switch-button` +63 (10), `mx-list-link-item` +60 (23), `mx-icon-button` +48 (15), `mx-link-button` +45 (8) and `mx-checkbox` +31 (5). So the gate's +89 and +30 are draws of the text field's and the switch's, and the owner's _at most +70_ is in the range of both.
  - **The list's order isn't an instrument finding.** The order of the files is the same in 30 runs of each tree, and the same in two clones and in slots `e` and `f`. Two clean builds with the same style sheets write one list, and clean builds give the recorded gate's bytes exactly, for this pair and for `RF-126`'s four. So the gate's two readings of unchanged sources agree on the names. What moves the list is a change in the sources. Only a probe that skips `build-prepare` reads another's list. Nothing is registered.
  - **A size reading of a candidate** is taken with `just size`, or with the list rebuilt.
- **`reviewer-2`, accepted.** The words are in the list.
- **`reviewer-3`, accepted for `SwitchCore`, `useValidatable`, `useSelectable` and the two pages, and not for the sentences of `Validatable` and of `error`.** `Validatable`'s remark and the pages say to set `error` and `required` rather than `aria-invalid` and `aria-required` on the host. `error`'s _"announced as invalid while it is set"_ is stated under that precondition (`CONTRIBUTING.md` §1.1), so a host's `aria-invalid="false"` is outside the correct use that it describes. No page has such a precondition for `aria-checked`, and one isn't added: the owner's answer makes the host's value right there. So the page says which comes first.
- **`accessibility.md`:** the plan's _"nothing else changes"_ is withdrawn. Its lines are in the list of the documentation unit, below.
- **`reviewer-4`, accepted.** All five rows cost a few lines each.
- **The observations:** no change but one. `useDisableableLinkable`'s _"and after `useARIA` if the host has it"_ goes, because its handlers run after the constructor. The three long lines are wrapped by the words below. `aria-checked=""` is Q1 (a) to the letter. Two hooks on one target, and a target that a page keeps after it left its shadow root, are cases that no component has.

### The implementer's list

On `core/aria-own-value-1`, with `main` merged. **No source line changes but comments.** The words are exact, and the lines may wrap otherwise.

1. **JSDoc, `packages/core/src/controllers/useARIA.ts`:**
   - `ARIATransformer`, `@param value`: _"The current serialized attribute value from the host, or `null` if the host doesn't have the attribute."_ And `@returns`: _"The serialized value to write to the target, or `null` to give it the component's own value, set through {@link setOwnARIA}, or no attribute if there is none."_
   - `setOwnARIA`, the second paragraph: _"If {@link useARIA} mirrors a host to `target`, the value is kept, and `target` has it while the mirrored value is `null`. The mirrored value is the transformer's answer, or the host's value if there is no transformer. If no host is mirrored to `target`, the value is written to it."_
   - `useARIA`, the first paragraph after the summary: _"Each change of a host's `aria-*` attribute is written to the target in a microtask, or at the next connect if that is first. A call of {@link setOwnARIA} for that name before then writes it at once, and the microtask or the connect writes it again. It doesn't matter whether the host is connected. An attribute that the host loses is transformed from `null`. The host's current `aria-*` attributes are also copied on each connect."_
   - `useARIA`, the second paragraph: _"If the transformed value is `null`, the target has the component's own value, set through {@link setOwnARIA}, or no attribute if there is none. Otherwise it has the transformed value, whatever the order in which the host's attribute and the own value changed."_
   - The third paragraph's long line is wrapped.
2. **JSDoc, `linkable.ts`,** the remark of `useDisableableLinkable`: _"Call after {@link useLinkable}. While disabled: clears `href`, sets `tabIndex` to `-1`, and sets the component's own `aria-disabled`. On re-enable: removes that value, and restores the host's `href` and `tabindex`. A host's `aria-disabled` is `useARIA`'s. Also blocks click propagation while disabled."_
3. **JSDoc, `selectable.ts`:** _"Sets the component's own `aria-selected` of `target` from the `selected` attribute of `host`."_
4. **JSDoc, `validatable.ts`,** `useValidatable`: _"Registers `target`, the element's accessible control, as the anchor that reported validation messages point at. Sets the component's own `aria-invalid` to `"true"` while `error` is set, and its own `aria-required` to `"true"` while `required` is set. If `useARIA` mirrors the host to `target`, a host's `aria-invalid` or `aria-required` comes first. Sets no custom state."_
5. **JSDoc, `SwitchCore.ts`:** _"Sets up a switch whose `.host` is a `<button role="switch">`. The switch is controlled: activation dispatches `input` and `change` and changes no state. The `checked` custom state, the form value and the button's own `aria-checked` follow the host's `checked` only. A host's `aria-checked` comes before the own one."_
6. **`switch-button.mdx` and `switch-icon-button.mdx`, _Semantics_:** _"Uses an internal native `<button>` with the `switch` role. Its `aria-checked` follows `checked`, unless the host has an `aria-checked`, which comes first."_
7. **Rows,** each with the proof's own mutation as its witness ([`mutations.mjs`](../reviews/aria-own-value-1/probes/mutations.mjs), run again in the three engines, with the result saved beside the unit's):
   - in `useARIA.browser.test.ts`: the own values of two targets of one host are apart after the host gets and loses the name (_one `Map` for all targets_); two names' own values on one target are apart after the host gets and loses one of them (_one value for all names_); the host's `""` is on the target with an own `"true"` (_an empty host value counts as none_); an own `""` is the attribute's value after the host's loss (_an empty own value counts as none_);
   - in `linkable.browser.test.ts`, with the mirror: an anchor with `disabled` whose host gets and loses `aria-disabled="false"` has `"true"` (the implementer's mutation, `linkable.ts` as on `main`). The existing row of the split goes on after the re-enable: the host loses `aria-disabled`, and the anchor has none (_no own value goes on re-enable_, and _restores the host value itself_). Its title says both;
   - in `aria-own-value.browser.test.ts`, a fifth case for each pair: the source set, the host's name given, the source removed, the name lost. The control has `off` (_list-link-item: false in place of none_ fails `aria-current`'s).
8. **After the merge of `main`:** core and material-x rebuilt. The slider's, `validatable` and the unit's rows in the three engines, and the two packages without the visual project in one; typecheck, lint, the root format check, publint, `docs-build` and `docs-smoke`.
9. **#248's description:** the size paragraph is replaced by _"`complete` +181 minified bytes. Its Brotli difference averages +55 to +58 B; the gate's reading at `c035576e2` against `f9729a393` is −5, and the rows of the elements +30 to +89, which are single readings ([size-noise](.plan/aria-own-value-1/checks/size-noise.txt))."_ with the new counts of rows.
10. **Stop** and return if a row's reading differs in an engine, or if a mutation fails no row.

**A recheck isn't owed:** no source changes, the words are this list's and the rows have the proof's own mutations. The coordinator checks the words and the witnesses.

### For the documentation unit (#247)

It takes these lines of `accessibility.md`, in its own pull request, after #248:

| Line at `8663d722b` | Change |
| --- | --- |
| 12 | _"applies `aria-disabled`"_ becomes _"gives the anchor its own `aria-disabled`"_ |
| 14 | The last sentence: _"`aria-checked` is `"false"` from the first render and follows the host's `checked`, unless the host has an `aria-checked`, which comes first (`src/button/SwitchCore.ts`, `packages/core/src/controllers/useARIA.ts`)."_ |
| 15 | The sentence from _`aria-checked`, the `checked` custom state_: _"The `checked` custom state, the form value and the button's own `aria-checked` change only when the consumer sets `checked`, so assistive technology announces the state that the switch draws, unless the consumer gives the host an `aria-checked` (`src/button/SwitchCore.ts`)."_ |
| 16 | _"`useValidatable` writes them to the button directly, so neither state reaches a second node."_ becomes _"`useValidatable` sets them as the button's own values, so neither state reaches a second node. A host's `aria-invalid` or `aria-required` comes first, through `useARIA`."_ |
| 118 | _"written to the field directly by `useValidatable`"_ becomes _"set as the field's own values by `useValidatable`. A host's `aria-invalid` or `aria-required` comes first, through `useARIA`"_ |

Line 100, the radio's, stays: it has no mirror.