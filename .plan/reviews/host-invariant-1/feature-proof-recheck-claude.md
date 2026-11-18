# The `.host` invariant — feature-proof recheck, items 9 to 12

**Files were read at:** `564d02e38` (`repo/host-invariant-1`, the main checkout, clean), the head of pull request [#35](https://github.com/ausginer/material-x/pull/35). **Diff reviewed:** `2bef29ac0` to `564d02e38`, outside `.plan/`, as the disposition asks. **Records read at the same commit.**

**Governing records:** the [handoff](../../host-invariant-1/host-invariant-handoff.md)'s _Disposition of the feature-proof review at `5b1544100`_, items 9 to 12 (`b7e1386e3`); `repo:RF-43` and `repo:RF-50`; the updated [report](../../host-invariant-1/host-invariant-report.md) and its witness, [`items9-10-witness-2bef29ac0.txt`](../../host-invariant-1/checks/items9-10-witness-2bef29ac0.txt); my [feature proof](feature-proof-claude.md).

**Lens:** a targeted feature proof. Each claim below is my own reading of the tree or a local run, unless it says otherwise. Nothing is repaired, and no record is amended.

**Verdict: items 9 to 12 hold. The recheck has no finding.** `reviewer-1` to `reviewer-5` are resolved as the disposition requires.

## Scope

**Covered.**

- The whole non-record diff:
  - `SwitchCore.ts` and `CheckableCore.ts`;
  - `button-group.mdx`, `connected-button-group.mdx`, and the four component `.mdx` files;
  - the four `Playground` stories;
  - the new rows in `SwitchCore.browser.test.ts` and `CheckableCore.browser.test.ts`.
- The record changes that items 11 and 12 require: `checks/item6-size.txt` and the report's item 6 and item 8 text.
- **Run locally at the head,** through `packages/material-x/vitest.config.ts` with `MX_TEST_ENGINES=chromium,firefox,webkit`: `SwitchCore`, `CheckableCore`, `checkbox`, `button-group.spec` and `button-group` browser files. 15 file runs and 549 tests, all pass ([`checks/recheck-probes.txt`](checks/recheck-probes.txt)).
- **The witness, repeated.** With `SwitchCore.ts` and `CheckableCore.ts` at `2bef29ac0` and the tests at the head, in Chromium, 5 rows fail. They are the three switch rows and the `on` row for both tags, which is the set the implementer recorded. The source was restored afterwards.
- **A probe of item 9 beyond its rows,** in all three engines, with identical output in each ([same file](checks/recheck-probes.txt)). It covers both groups and both switch tags, for these cases:
  - the join with a group `value`;
  - the removal of that `value`, after the consumer has checked other switches;
  - the join with no group `value`;
  - a later `value`.
- **A probe of item 10:** the form value through a sequence of `value` and `checked` changes, for both tags.
- **CI,** run 44245120971 at the head, read while it was still running.

**Not covered.**

- I didn't open Storybook. Item 11's stories are read, not run.
- I didn't remeasure item 12's sizes. The before column agrees with the first reading for the five entries the two readings share. That agreement is the implementer's control, and I read it.
- I didn't run `typecheck` or `lint`. CI's `static` job passed at the head.

## Item 9 — the group's `value` selects switches

**What holds.**

- **The new effect:**
  - when the group has a value, `checked = newValue === host.value`, so a switch with no `value` is never selected;
  - when the group's value is removed, only the switch whose `value` equals the old one is unchecked;
  - on joining a group with no `value`, both sides are `null`, so nothing changes.
- **The probe,** for each of `mx-connected-button-group` and `mx-button-group`, with `mx-switch-button` and `mx-switch-icon-button`, in three engines:
  - **Property 1.** A group with `value="b"` is joined by `a` (checked), `b`, and a switch with no `value` (checked). Afterwards, only `b` is checked.
  - **Property 1, again.** A later `value="w"` checks `w` and unchecks the switch with no `value`.
  - **Property 2.** A group with `value="a"` has its value removed. Before the removal, the consumer checks a switch with no `value` and a switch with `value="c"`. Afterwards, `a` is unchecked, and both consumer-checked switches stay checked.
  - **Property 3.** A switch with no `value` joins a group with no `value`, and stays checked. So does a switch with `value="w"`.
  - **Property 4.** In every case, `aria-checked` and `:state(checked)` agree with `checked`.
- **Property 5.** `ButtonGroupCore` and `useContext` are unchanged.
- **Property 6.** `connected-button-group.mdx`'s _Selection model_ and `button-group.mdx`'s _Deltas_ state properties 1 to 3 in the handoff's words.
- **The rows.** The handoff's three rows are present and pass. Each fails against `2bef29ac0`'s source, as repeated above.
  - The rows exercise `mx-switch-button` in the connected group only. Both groups share the provider in `ButtonGroupCore.ts`, and both switches share `useSwitchCore`'s effect. So one case per row reads the one path, and the probe covers the other three combinations. This isn't a finding, because the handoff lists rows, not combinations.
- **Outside the ruling, observed by reading.** A switch whose own `value` changes while its group has a value isn't reconciled until the group's `value` next changes. Property 1 names the join and changes to the group's `value` only, so this is consistent with the ruling. It is noted, not a finding.

## Item 10 — the checkbox's and radio's form value

**What holds.**

- **The code.** The `value` callback now writes `newValue ?? 'on'`, gated on `host.checked`. That is the same as `SwitchCore.ts`.
- **The probe,** for both tags, in three engines. The form value through the sequence is:
  1. unchecked with `value="a"`: absent;
  2. `value` removed: absent;
  3. checked: `on`;
  4. `value="b"`: `b`;
  5. unchecked: absent;
  6. `value="c"`: absent.
- **The rows.** Both rows the handoff names pass for both tags. The `on` row fails against `2bef29ac0`'s source. The second row passes there too, and the handoff asks a witness only of the first.

## Item 11 — the _States_ sections

**What holds.**

- **The switch, switch icon and checkbox Playgrounds** now answer `change` with `updateArgs({ checked: !checked })`, through Storybook's `useArgs`.
- **The radio's Playground** answers `change` with `updateArgs({ checked: true })`. A radio fires `change` only when it is unchecked, so this does what a native radio would.
- **The `.mdx` claims are true of the stories they link:**
  - the three files that say _"toggles `checked`"_ match a toggling handler;
  - `radio.mdx` is unchanged, and its _"sets `checked`"_ is now true.
- **The import resolves.** `storybook` exports `./preview-api` (`node_modules/storybook/package.json`), and CI's `static` job passed.

## Item 12 — the record's corrections

**What holds.**

- **The size reading.** `checks/item6-size.txt` and the report's item 6 table list `button-group/button-group` (0 minified, −1 brotli) and `button-group/connected-button-group` (+533 minified, +70 brotli), with the cause of each.
- **The PERCENT count.** The report's item 8 now names six split-button PERCENT tokens: five `trailing-button.inner-corner.selected.corner-size` and `xsmall.outer-corner.corner-size`. That agrees with the tables I read in the [first pass](checks/review-probes.txt).

## CI

Run 44245120971 at `564d02e38`, read at the time of writing:

- **Passed:** `scope` and `static`.
- **Still running:** `docs`, `measurements`, `chromium`, `firefox` and `webkit`.

As the brief says, I don't judge the workflow. `RF-43` and `RF-50` close on this recheck under the disposition's _After the remediation_. Whether the merge waits for the `webkit` job is the owner's call.

## Findings

None. The recheck read items 9 to 12 and their rows, repeated the witness, and probed both groups and both switch tags. No defect survives.