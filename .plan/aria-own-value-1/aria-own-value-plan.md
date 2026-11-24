# The component's own `aria-*` value — plan

**For `repo:RF-130` (#232).** Planned on 2026-11-24 by an architect, on the coordinator's task, on `core/aria-own-value-1` from `main` at `eddf39e7b`. The owner approved planning it: _"понял, да, делаем"_ ("got it, yes, let's do it"). **Status: accepted, with no question open, and ready for an implementer.** The owner answered [Q1](#q1--what-does-the-control-show-while-the-host-gives-the-name) on 2026-11-24 with (a), and the entry's note records it. Labels `OV-…` are local to this plan.

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

**Documentation, in its own pull request:** `accessibility.md`'s sentences that `useValidatable` writes the control directly (the switch's and the text fields') gain the mirror, and nothing else changes.

**Size:** small to medium. Four files in core, three and two templates in material-x, and the rows, which are most of it. No new dependency, no style and no public element surface.

## Not in this unit

- **The sortable list's `aria-description`.** A control loses the description if its host gives and loses one, until its item is updated or connected. The list writes it on the control with its own observer, which takes a removal by anyone as a consumer's removal that it must not undo. A description given back there needs a rule for which removal is whose. It is by reading and by `RF-124`'s reading, which has the value `null` after the loss and the list's own after the next connect. Nothing here makes it worse.
- **The text fields' fallback as a pushed value.** `useSlot`'s callback would set it, and the transformer, a cast and a lint exception go. It needs `RF-131`, because today a slot that changes while out runs no callback. It is +38 against +63 in `text-field` (read with `OV-1`) and needs no further plan: it is the owner's and the coordinator's to take as a cleanup after both.
- **Two hooks on one target.** No component has them. The later registration keeps the own values.

## Costs, in one place

| Cost | What |
| --- | --- |
| Bytes | `complete` +51 B Brotli. Elements +27 to +70, `checkbox` and `radio` +35 and +31 for a function that they use as plain writing |
| Memory | a `Map` for each mirrored host, and a `WeakMap` entry |
| Contract | one new export in core, one rule in `useARIA`'s JSDoc, and `useDisableableLinkable` without the host's `aria-disabled` |
| Behavior | Where the host gives a name and the component changes after it, the control keeps the host's value. It took the component's before |