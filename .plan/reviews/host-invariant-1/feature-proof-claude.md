# The `.host` invariant — feature proof

**Files were read at:** `2bef29ac0` (`repo/host-invariant-1`, the main checkout, clean), the head of pull request [#35](https://github.com/ausginer/material-x/pull/35). **Diff reviewed:** the unit's own change, `59ca99e6a^2` (`main` at `83a985b99`, merged into the branch) to `2bef29ac0`. That excludes #34's files, which reached the branch through the merge. **Records read at the same commit.**

**Governing records:** [`host-invariant-handoff.md`](../../host-invariant-1/host-invariant-handoff.md) items 1 to 8 and rulings R1 to R4; the implementer's [report](../../host-invariant-1/host-invariant-report.md) and its readings under [`checks/`](../../host-invariant-1/checks/); `repo:RF-43`, `repo:RF-50` and `repo:RF-56` in [`00-index.md`](../../00-index.md); [`architecture.md`](../../../.agents/docs/architecture.md) §Components (the invariant, E1 to E3, the controlled principle, and the text-field exception).

**Lens:** feature proof. Each claim below is my own reading of the tree, CI or a local probe, unless it says otherwise. Nothing is repaired, and no record is amended.

**Verdict: the proof holds for items 1 to 5, 7 and 8, with two Tier A defects at its edges and one Tier B documentation defect.** None of them is a regression that the unit introduced into a path that worked before. Both Tier A defects predate the unit in their logic, but each one contradicts a property that this handoff states. So they're owed before `RF-43` and `RF-50` close, and whether they block the merge is the owner's call.

- **Item 6** is incomplete for item 8 (Tier C).
- **The gate:** CI's `webkit` job hasn't run a test yet (see [CI](#ci)).

## Scope

**Covered.**

- The non-record diff, line by line: `SwitchCore.ts`, `ButtonCore.ts`, both switch templates and classes, the five switch token packages, `CheckableCore.ts`, `checkbox.ts`, `radio.ts`, `fab.ts`, the connected group's tokens, sheet and renderer, `processToken.ts`, the test support files, both Vitest configs, and the six changed test files.
- The documentation diff: both switch `.mdx` files, `checkbox.mdx`, `radio.mdx`, `spec-consistency.md`, the JSDoc, and `accessibility.md` §Button. I checked every path that §Button cites with `test -f`, and all of them exist.
- **Repeated locally at the head,** through `packages/material-x/vitest.config.ts` with `MX_TEST_ENGINES=chromium,firefox,webkit`:
  - `SwitchCore.browser.test.ts`, `focus-layer.spec.browser.test.ts`, `useCore.browser.test.ts`, `CheckableCore.browser.test.ts`, `checkbox.browser.test.ts` and `button-group.spec.browser.test.ts`: 18 file runs, 720 tests, all pass;
  - tproc's suite (`aube exec just test` in `packages/tproc`): 12 files, 72 tests, all pass.
- **Probes** of behaviour that no row reads, in all three engines, with identical output in each ([`checks/review-probes.txt`](checks/review-probes.txt)):
  - the group path;
  - the form value after `value` is removed;
  - whether the `command` event reaches the document;
  - checkbox and radio activation through `<label for>` and `host.click()`;
  - an indeterminate checkbox activated through a label.
- **Two mutations,** in Chromium, with the source restored afterwards ([same file](checks/review-probes.txt)):
  - **M1:** the switch dispatches `input` and `change` from a `click` listener on `.host` instead of the command;
  - **M2:** `CheckableCore` drops its restore of `input.checked`.
- **The connected group's emitted CSS,** rendered from `connected/tokens.ts` at the head. Rendered the same way, the split button's and the standard group's packages emit no `%` value and no PERCENT-derived length.
- **tproc's cached tables:** every length unit and every PERCENT token ([same file](checks/review-probes.txt)).
- **CI:** run 44241822864 at the head, read while it was still running.

**Not covered.** These areas are unread, which isn't the same as clean.

- I didn't rerun any "before" witness at `e9236603e` or `7667a2a5a`. The report's witness transcripts are the implementer's, and I read them. Discrimination was checked by M1 and M2 at the head instead, and only for item 1's activation and item 7's restore.
- I didn't run the `visual` project or compare the `button-group-connected-selected` images. The owner accepted the image, and #36 recorded the baseline.
- I didn't run the full material-x suite, the root config, `typecheck`, `lint` or `fmt-check`. CI's `static` job passed at the head.
- I didn't run the local `safari` engine. Its WebDriver branch in `input-commands.node.ts` is read, not run.
- I didn't measure bundle sizes.
- I ran no assistive technology.

## Items that hold, with no finding

- **Item 1, template, focus, role and state (properties 1 to 3).** Each switch renders one `<button type="button" class="host" part="impl" role="switch" aria-checked="false">`, with no `.interaction` and no `<input>`. `useButtonCore`'s target is `$(host, '.host')`, and the `.control` query and the separate `rippleHost` are gone. The `checked` attribute callback sets `:state(checked)`, `aria-checked` and the form value together.
- **Item 1, activation (property 4).**
  - `.host`'s own command (`commandForElement` is itself, `command` is `--activate`) dispatches `input` and `change` through `notify`, which sets the same flags as before.
  - **M1 discriminates:** with dispatch moved to a `click` listener on `.host`, 10 switch rows per tag fail, including _"should dispatch input and change after every click listener"_ and _"should dispatch no input or change for a cancelled click"_.
  - Probe D: a switch's `click()` delivers no `command` event to the document.
- **Item 1, form value (property 5),** for the switch: `value ?? 'on'` when checked. Probe C reads `on` after `value` is removed while the switch is checked.
- **Item 1, parts and documentation (property 7).** `@csspart control` is gone, `impl` is documented as the native switch button, and the _Accessibility_ and _Anatomy_ sections state the controlled model. The handoff names _Parts_ and _Semantics_ sections, and the `.mdx` files have neither. The implementer edited the sections that hold those claims. One sentence in _States_ is false (reviewer-3).
- **Item 1, rendering (property 8).** The baseline change was the stop, and the owner resolved it. CI's `chromium` job passed every visual row at `8eb38b667` (report) and at the head (CI below).
- **Item 2.** Each switch package appends `focus-layer.color` from its own `selected` or `unselected` focused token. The default and tonal packages declare `focus-layer.opacity` from `<set>.focused.state-layer.opacity`, as the report says. `switch-control.css.ts` and its sheet are deleted, so R4 holds. The 14 mapping rows pass in three engines. The report's mutation reading ([`item2-focus-layer-mutation.txt`](../../host-invariant-1/checks/item2-focus-layer-mutation.txt)) is the implementer's.
- **Item 3.** `mx-fab` passes `{ delegatesFocus: true }`, calls `forwardFocus(this, target)`, and declares `override focus()` as `focusControl`. That is the form `RF-33` uses. Its `useCore.browser.test.ts` rows pass in three engines.
- **Item 4.** Every row the handoff lists is present. _"should reflect the value attribute to the control"_ is gone.
- **Item 5.** §Button states the controlled model, and every citation names an existing file. The claims under §Button Group, §FAB and §Text Field that cite missing files are listed in the report, as the handoff asks.
- **Item 7,** for state. After `notify(host, 'change')`, `input.checked = host.checked` runs, and `mx-checkbox` restores `indeterminate` the same way.
  - **M2 discriminates:** without the restore, the click and Space rows of the reversed test fail for both components.
  - Probe E: activation through `<label for>` and through `host.click()` fires `click`, `input` and `change`, and leaves the host and the input unchecked. No row covers those two activation paths.
  - Probe F: an indeterminate checkbox activated through a label stays indeterminate in the input.
  - The form value is a separate matter (reviewer-2).
- **Item 8.**
  - **Emitted CSS:** per size, `default`, then `selected` (`::slotted(:state(checked))`, both corner variables set to `var(--_shape-full)`), then `pressed` (`::slotted(:active)`, 4/4/4/12/16px).
  - **Cascade:** a size-scoped rule, `:host(:state(<size>)) ::slotted(…)`, outranks the unscoped small rule, `:host ::slotted(…)`. Within a size, the pressed rule follows the selected one at equal specificity. So a pressed button that is also selected takes the pressed inner corners.
  - **The override:** `--md-button-group-inner-corner-size` feeds only `--_inner-corner` in `::slotted(*)`, and `::slotted(:state(checked))` and `::slotted(:active)` outrank that rule.
  - **The pressed rows discriminate on the observation itself.** The resting and pressed sizes differ at every size, so a press that missed the button would fail. That covers what the witness can't: at `7667a2a5a`, those rows fail at the oracle first.
- **The test commands.** `commands.node.ts` defines one map, the token contracts plus `pointerPress` and `pointerRelease`, and both configs import it. That closes the cause of run 44235006672's failures.

## The points named for judgment

- **`input` and `change` from the switch button's own command.**
  - **It meets R1 and item 1's property 4 as written.** The events follow every `click` listener, a cancelled `click` produces neither, and the order and flags are what the rows assert. M1 shows that the rows tell this apart from the obvious alternative.
  - **It adds a platform dependency that no record states.** In an engine without invoker commands, a switch fires `click` and never fires `input` or `change`, and nothing reports it. The repository states no browser floor: a search of `CONTRIBUTING.md`, `.agents/docs/` and the manifests finds none. So this isn't a defect against a requirement.
  - **From memory, not read in this session:** invoker commands shipped in Chromium 135, Firefox 144 and Safari 26.2.
  - **For the architect:** whether `RF-43`'s record states this dependency.
- **tproc's `processToken.ts` fix.**
  - **It is correct.** The cached tables use two length units: `DIPS` (376 values) and `PERCENT` (16 values). `PERCENT` now serializes as `%`, and a new node row covers it.
  - **Rendered at the head,** the split button's and the standard group's packages emit none of the PERCENT tokens. That agrees with the report's _"only the connected group's sheet changed"_.
  - **Minor:** the report says five split-button corner tokens, and the tables hold six (reviewer-5).
- **`pointerPress`, `pointerRelease` and the shared command map.** These are sound for the three Playwright engines, where the rows pass and discriminate (item 8 above). The WebDriver branch is read, not run.

## CI

Run 44241822864 at `2bef29ac0`, read at the time of writing:

- **Passed:** `scope`, `static`, `docs`, `measurements` and `chromium`.
- **Still running:** `firefox`.
- **`webkit` is again inside `playwright install --with-deps webkit`.** Its test step hasn't started.

So no WebKit row has run in CI for this unit. That remains the report's _Open_ item, and I don't judge the workflow (as the brief instructs).

## Findings

### reviewer-1 — In a connected group, a switch's `checked` doesn't follow the group's `value` on join, and a group `value` of `null` matches every switch without a `value`

**Tier A.**

- **Routed to the implementer** for the join case, which contradicts item 1's property 6.
- **Routed to the architect** for what a group with no `value`, and a switch with no `value`, mean under R2.

**Current behaviour.** `useSwitchCore`'s context effect compares the switch's `value` with the group's old and new values:

- if `oldValue === host.value`, it sets `checked = false`;
- otherwise, if `newValue === host.value`, it sets `checked = true`.

On joining a group, `useContext` calls the effect with `oldValue = null` (`core/utils/useContext.ts`). Under R2, this effect now writes the host's `checked`, and so its attribute, where at `e9236603e` it wrote only the custom state, the input and the form value. The comparisons themselves are unchanged from `e9236603e` (read in the diff).

**Evidence.** [`checks/review-probes.txt`](checks/review-probes.txt). The output is identical in Chromium, Firefox and WebKit.

- **A2.** A group has `value="b"`. It holds a switch with `value="a"` that the consumer checked, and a switch with `value="b"`. After the join, **both are checked.**
- **A3.** A group has `value="a"`. It holds a switch with `value="a"` and a switch with no `value`. After `group.removeAttribute('value')`, the first is unchecked, and the switch with no `value` becomes **checked**: `aria-checked="true"` and `:state(checked)`. Nobody set it.
- **A.** A switch with no `value`, which the consumer checked, joins a group with no `value`. It is **unchecked** on join, and its `checked` attribute is removed.

**Why it's a problem.**

- **The join case contradicts item 1's property 6.** That property requires that _"a `value` set on the group checks the switch whose `value` matches and unchecks the others"_. A2's group shows two selected segments, and its form data carries both.
- **A3 and A violate the controlled principle** (`architecture.md` §Components) unless the record says that a `null` group value selects the switches with no `value`. No record says so.
- **No row covers this.** The two group rows in `SwitchCore.browser.test.ts` set the group's `value` after the switches have joined, and both switches have values.

**Required property.**

- After a switch joins a group, and after every change to the group's `value`, the switch is checked exactly when its `value` equals the group's `value`.
- A `null` on either side matches nothing, or the record states what it means.

### reviewer-2 — A checked `mx-checkbox` or `mx-radio` submits nothing once its `value` is removed

**Tier A.** Routed to the architect, because the handoff's item 7 asserts that this already holds. Whether item 7 owes the fix, or a new entry does, is the architect's decision.

**Current behaviour.** `CheckableCore.ts`'s `value` callback reads `if (input.checked) innards.setFormValue(newValue)`. Removing `value` writes `null` while the component is checked. The `checked` callback beside it writes `value ?? 'on'`. The unit fixed the identical defect in `SwitchCore.ts`, and the report says so (_"At `e9236603e` it wrote the raw new value, which was `null` when `value` was removed"_). It left `CheckableCore` as it was.

**Evidence.** [`checks/review-probes.txt`](checks/review-probes.txt), probe C, in all three engines. Each element is checked with `value="a"`, and then `value` is removed:

| Element            | Before | After           | `checked` after |
| ------------------ | ------ | --------------- | --------------- |
| `mx-checkbox`      | `a`    | `null` (absent) | `true`          |
| `mx-radio`         | `a`    | `null` (absent) | `true`          |
| `mx-switch-button` | `a`    | `on`            | `true`          |

**Why it's a problem.**

- **The handoff relies on it.** Item 7 says that _":state(checked), :state(indeterminate) and the form value already follow the host only, and they stay that way"_. The form value depends on `value`'s history, and the callback gates on the native input's `checked`, not the host's.
- **A consumer can observe it.** A checked checkbox in a form submits nothing, where a native checkbox submits `on`.
- **The family is no longer consistent.** The switch and the checkbox now give different form values for the same state.

**Required property.** While `mx-checkbox` or `mx-radio` is checked, its form value is `value ?? 'on'`, whatever the sequence of `value` changes. It derives from the host's `checked`, not from the native input's.

### reviewer-3 — Four `.mdx` files say that _"the story's `change` handler sets `checked`"_, and the story they link has no handler

**Tier B.** Routed to the implementer.

**Current documentation.** The _States_ section of `switch-button.mdx`, `switch-icon-button.mdx`, `checkbox.mdx` and `radio.mdx` now says that activation _"doesn't change `checked`. The story's `change` handler sets `checked`."_ Each one then links to its `Playground` story (`<LinkTo … story="Playground">`).

**Evidence.**

- The `Playground` stories' `render` functions pass `checked={checked}` from Storybook's args and register no `onChange`:
  - `switch-button.stories.tsx:91`–`:103`;
  - `switch-icon-button.stories.tsx:89`–`:101`;
  - `checkbox.stories.tsx:63`–`:75`;
  - `radio.stories.tsx:77`–`:88`.
- The controlled wrappers that do set `checked` (`ControlledSwitchButton`, `ControlledCheckbox`, and the radio group's) belong to other stories.
- So under the controlled model, activation in the linked Playground changes nothing on screen.
- For the checkbox and the radio, this is new with item 7. Before it, the native input's own toggle drew the change.

**Why it's a problem.** A reader who follows the page's instruction finds a control that doesn't respond. The page says the story answers `change`, and it doesn't. So the reader can conclude that the component is broken.

**Required property.** Each _States_ claim about the linked story is true of that story.

### reviewer-4 — Item 6's measurement wasn't repeated for the button-group entries after item 8

**Tier C.** Routed to the implementer. This is record only.

- **Requirement.** The handoff's _Order_ says that item 8 _"follows the commits already made, and item 6's measurement is repeated for the `button-group` entries"_.
- **Evidence.**
  - [`checks/item6-size.txt`](../../host-invariant-1/checks/item6-size.txt) was last written at `7667a2a5a`, before item 8. It covers five entries: `switch-button`, `switch-icon-button`, `fab`, `checkbox` and `radio`.
  - The report's item 6 table lists the same five.
  - `files.json` publishes `button-group/button-group` and `button-group/connected-button-group`. Item 8 changes the connected group's emitted CSS, which now has three blocks per size where it had one.
- **Why it matters.** material-x has no size budget (`RF-45`), so this hand reading is the only size evidence for item 8's change. Its absence isn't stated.
- **Required property.** The record carries the `button-group` entries' sizes at `e9236603e` and at the head, or it states why they are omitted.

### reviewer-5 — The report counts five split-button PERCENT tokens, and the tables hold six

**Tier C.** Routed to the implementer. This is record only.

- **Evidence.** tproc's cached tables hold 16 PERCENT lengths ([`checks/review-probes.txt`](checks/review-probes.txt)):
  - 5 × `md.comp.button-group.connected.<size>.selected.inner-corner.corner-size`;
  - 5 × `md.comp.button-group.standard.<size>.pressed.item.width.multiplier`;
  - 5 × `md.comp.split-button.<size>.trailing-button.inner-corner.selected.corner-size`;
  - `md.comp.split-button.xsmall.outer-corner.corner-size`.
- **The report's item 8** says _"five split-button corner tokens"_.
- **The conclusion holds:** material-x emits none of the split-button's PERCENT tokens, before or after the fix.
- **Required property.** The report's count agrees with the tables.

## Null results, stated

- **No finding against the focus model.**
  - Items 1 to 3 meet the invariant and `RF-33`'s form.
  - E1 to E3 are applied as `architecture.md` states them.
  - No helper still keys on `.control`. A `grep -rnE` for `.control` and `part="control"` in `packages/material-x/src` finds nothing.
- **No finding against item 8's shapes.** The shapes, their precedence and the neighbours meet the handoff at every size in the three engines.
- **The command map** is wired once and reaches both configs.