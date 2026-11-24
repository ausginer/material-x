# The component's own `aria-*` value (RF-130, #232) — feature proof

**Files were read at:** `c035576e2`, the head of #248 (`core/aria-own-value-1`), in slot `e`, clean and equal to `origin`. **Diff reviewed:** `f9729a393..c035576e2`. Where a reading says `main`, this tree had `packages/core/src` and `packages/material-x/src` as at `f9729a393`, with core rebuilt. They were restored and core rebuilt afterward. Browsers: Playwright's Chromium, Firefox and WebKit.

**Subject:** the [plan](../../aria-own-value-1/aria-own-value-plan.md) with the owner's Q1 (a), and `repo:RF-130` in [`00-index.md`](../../00-index.md) with its dated notes.

**Verdict: pass. `OV-1`, `OV-2` and Q1 (a) hold in the three engines, in every sequence that I tried: 0 wrong of 20,480 reads in core, of 14,238 in the seven elements, and of 2,388 in `mx-slider` with `origin/main` merged. The host's attributes are never touched.** Four findings, none against the property: the recorded reason for the size difference is contradicted (`reviewer-1`, tier B), two sets of published sentences that the change makes false (`reviewer-2`, `reviewer-3`, tier B), and rows that are missing (`reviewer-4`, tier C).

## Scope

**Covered** ([readings](checks/readings.txt), [mutations](checks/mutations.txt); probes of [core](probes/core.browser.test.ts.txt), [material-x](probes/material-x.browser.test.ts.txt), [the slider](probes/slider.browser.test.ts.txt), [cost](probes/cost.mjs) and [mutations](probes/mutations.mjs)). The three engines' readings are identical, except for the times.

- **Core, random orders.** 400 sequences of 25 steps, on one host with two mirrored targets and four names: the host's attribute and each target's own value set to `""`, two values or `null`, connect and move, take out, and the end of a task. Each target's value is read after each task and synchronously after each connect. 0 wrong, with the host's attributes compared at each read.
- **Core, single cases.** Two targets of a host keep their own values apart. Names are apart. `""` counts as a value, for the host and for the component. `null` removes also what was written straight. A call in a connect callback reads right before and after the hook. An own value that a setup gives, or a handler that is registered before the hook, survives each way to be created: an upgrade in and out of the document, a clone, an imported template and the constructor. So it does when the host is adopted there and back, when it returns from an iframe that is then removed, and when its target is elsewhere. A value set before `useARIA` is written and then lost with the host's, as the JSDoc says.
- **The elements, random orders with all their names together.** 120 sequences of 20 steps for `mx-text-field`, `mx-multiline-text-field`, the two switches, `mx-link-button`, `mx-list-link-item` and `mx-list-button-item`. Each starts as a created, a parsed and upgraded, or a cloned element, with a host attribute before or after the component's source in two of three. 0 wrong. The same probe on `main` reads 62 to 182 wrong for each.
- **Switches.** A parsed switch with `aria-checked="mixed"`, `checked`, both or neither reads right when upgraded, after a task and when connected. `aria-checked` is set by the end of the constructor, and the `checked` custom state follows `checked` alone (the form value wasn't read). The group's `value` with a host's `aria-checked` gives the right value back. **The template:** nothing in the sources, the styles or the tests reads the attribute from the template, and the control's attributes after construction are the same set in another order. Nothing is published as static HTML: the template reaches the package in the element's module only.
- **Links.** With `disabled` and `aria-disabled="false"`, the control has `"false"`, no `href` and `tabindex="-1"`, and a click is blocked. `disabled` removed, the host's name lost, and both while out read right. `href` and `tabindex` are as on `main`. `aria-disabled` without a mirror is no longer restored from the host, as `OV-2` says. No component is without one.
- **Text fields.** The ids of the filled slots stay and come back beside an own `aria-invalid`, as on `main`.
- **Checkbox, radio, button, FAB.** A fixed sequence reads as on `main` in each.
- **The slider,** on `origin/main` at `ab4e536bd`, after the branch was cut. The merge has no conflict. In the merged tree `error`, `required` and `valuetext` against the host's names read 0 wrong of 2,388, and the slider's, the unit's and `validatable`'s rows pass in the three engines. I aborted the merge. The branch still owes it, by `OV-3`.
- **Sizes.** `just size-reading` at `f9729a393` and at the head gives the implementer's reading in every row. `complete` is −5, and the elements are +30 to +89.
- **Memory,** Chromium, 10,000 hosts with one hook: 566 bytes a host on `main`, 668 here (+102), without an own value. One or two own values add 5 to 7 more.
- **Time,** 5,000 hosts, two runs, with other load. Connect: the same in each engine. Chromium and Firefox: no difference in a first run; a toggle of `error` in Chromium was 114 and 132 ms in the second. WebKit: 50,000 toggles of `error` take 144 and 184 ms, 147 and 182 in the second run, and the setting of two attributes for each host takes 10 to 19 ms more. That is about 1 µs a change.
- **Collection.** Of 500 hosts with an own value, never connected, or connected and removed, none survives.
- **Mutations.** The implementer's record was read. I added 15. Ten fail rows. Five fail none (`reviewer-4`).
- **Records.** The counts in `RF-130`'s note agree with the mutation and probe readings. CI passes on `c035576e2`.

**Not covered:** Safari, screen readers, the visual and spec projects. I ran no whole suite in material-x, and not the implementer's mutations again.

## Findings

### reviewer-1

**Tier B.** The record says that the size difference between the plan and the built change is the base's. The base has the same sources.

- **Current behavior.** `RF-130`'s note: _"The plan has +51 and +27 to +70, read on `eddf39e7b`. The plan's candidate on `f9729a393` gives the same bytes as the built change in every row, so the difference is the base's, and not the source's."_ The pull request says _"on an older base"_.
- **Evidence.** `git diff --stat eddf39e7b f9729a393` has seven files, all under `.plan/`. Yet the two readings of those same sources differ in `main`'s column too: `list-link-item` 5082 and 5050, `list` 680 and 659, `text-field` 8462 and 8479, `complete` 23101 and 23098.
- **What does move the rows.** `candidates.mjs` runs material-x's `build-lib` without `build-prepare`, so it reads the private property names that the slot's last build left in `node_modules/.cache/css/css-private-props.json`. With one tree of sources, I built with the lists that other slots have. `text-field` reads 8453 to 8514, `list-link-item` 5028 to 5052, `card` 1307 to 1337 and `complete` 23008 to 23113. Slot `f`'s list has the same 228 names in another order, and it moves `text-field` by 35 bytes and `complete` by 6. None of the lists gives the plan's numbers, so that this is the plan's cause is likely and not established.
- **Why it is a problem.** The plan's costs that the owner read, +51 and at most +70, and the −5 of `complete`, are of the order of what the list alone moves. A later reader compares two bases that don't differ. The gate's reading rebuilds the list, so its own pair agrees on the names. Whether their order can differ between the gate's two readings of one set of names, I didn't establish.
- **Required property.** The record doesn't name the base as the cause. A size reading of a candidate is taken with the list rebuilt.
- **Route:** the implementer, for the note and the pull request. The architect, for whether the list's order is an instrument finding.

### reviewer-2

**Tier B.** Two sentences of the hook's public JSDoc are false.

- **`useARIA`:** _"Each change of a host's `aria-*` attribute is written to the target once, in a microtask, or at the next connect if that is first."_ If `setOwnARIA` is called for that name while the change is pending, the host's value is written at once, and again in the microtask. The transformer runs twice and the target has two records, connected and not, in the three engines.
- **`setOwnARIA`:** _"`target` has it while the host doesn't give the attribute."_ With a transformer this is false in both directions, which the unit's own rows hold: an answer for `null` comes before the own value, and `null` for a host's value gives the own one. `useARIA`'s JSDoc has the right rule. `ARIATransformer`'s _"The serialized value that should be written to the target"_ has no word about `null` either.
- **Why it is a problem.** core's hook is public. A transformer that answers `null` to keep a host's attribute off the target, which is how `mx-slider` uses it, gets the component's own there if it has one. The author of `setOwnARIA`'s call reads the sentence that doesn't say it.
- **Required property.** The JSDoc of the three says what is written and when, with a transformer and with a pending change.
- **Route:** the implementer.

### reviewer-3

**Tier B.** The callers' documentation still says that the control's state follows the component alone. Q1 (a) makes the host's attribute win.

- `SwitchCore.ts`, in a file of this diff: _"`aria-checked`, the `checked` custom state and the form value follow the host's `checked` only."_ A switch with `checked` and `aria-checked="false"` says `"false"`.
- `useValidatable`, also in the diff: _"gives it `aria-invalid="true"` while `error` is set and `aria-required="true"` while `required` is set"_. `Validatable.error`: _"Its accessible control is announced as invalid while it is set."_ The host's `aria-invalid="false"` turns it off. `useSelectable`'s is the same kind.
- `switch-button.mdx` and `switch-icon-button.mdx`: _"Its `aria-checked` follows `checked`."_
- **`accessibility.md`,** which the plan leaves to its own pull request with the sentences of `useValidatable` _"and nothing else changes"_. Two more change. Line 14 gives the two templates as the source of `aria-checked="false"`, which they no longer have. Line 15: _"`aria-checked` … change only when the consumer sets `checked`, so assistive technology never announces a state that the switch doesn't draw"_. A host's `aria-checked` announces one.
- **Scope of the fault.** `main` gave the host's value too, in some orders, so part of it was already false. The change makes it the rule, and the owner accepted its cost, which no published sentence tells the consumer.
- **Required property.** Each published sentence about these states holds when the host gives the name, and the documentation unit's list has the two lines.
- **Route:** the implementer, for the JSDoc. The architect, for the mdx and the documentation unit's list, which the plan limits.

### reviewer-4

**Tier C.** Rows are missing for parts of the rule. In the three engines, these mutations fail no row of the unit. In Chromium they also fail none in core's browser project and in 484 rows of material-x:

| Mutation | What isn't guarded |
| --- | --- |
| one `Map` for all targets | a target's own value isn't another's: by reading, each switch would give the last one's `aria-checked` |
| one value for all names | names are apart on one target: a switch's `aria-invalid` and `aria-checked` |
| an empty host value counts as none | the host's `""` is the host's value |
| an empty own value counts as none | the same for the own value (by the type, `null` is none) |
| `list-link-item` gives `"false"` in place of none | `off` of the pair: the fourth case ends with the source set for each pair but two |

- **The split core row.** _should leave a host-provided `aria-disabled` on a mirrored anchor when re-enabled_ passes with `linkable.ts` as on `main`, as the implementer's note says, and also when the call that removes the own value is deleted. No core row has `useDisableableLinkable`'s own value. material-x's pairs guard it: 1 and 11 rows fail.
- **Required property.** A row fails for each of the first three and for the link item's `off`, and in core for the trait's own value.
- **Route:** the implementer.

## Observations, no finding

- **Two hooks on one target,** which the plan leaves: two hooks of one host give the own value after the loss. With two hosts, the first host's loss takes it. No component has either.
- **A target that a page keeps after it left its shadow root now keeps the host alive** (500 of 500, and 0 on `main`), because the map's value for a target holds its host. A target in its shadow root does that by itself. No component lets its control out.
- **The host's `""`** wins: `<mx-switch-button checked aria-checked="">` has `""`, which is no valid value of a switch. It is Q1's rule to the letter.
- **Earlier than on `main`:** an element that is upgraded out of the document with the host's name and the source together has the host's value at once, where `main` had the component's until the connect.
- **A name outside `aria-*`** is written to a target without a mirror and dropped for one with it. The parameter's contract excludes it.
- **`useDisableableLinkable`'s _"and after `useARIA` if the host has it"_** isn't needed: its handlers run after the constructor. The text fields call `useValidatable` before `useARIA` and read right. Nobody is misled by more than an order.
- Three lines of the new JSDoc are longer than 80 columns, which the formatter doesn't wrap.