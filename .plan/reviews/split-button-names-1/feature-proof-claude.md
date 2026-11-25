# The split button's names and disabled state — feature proof of `RF-136` with `RF-138`

**Files were read at:** `66e7cf867` (`material-x/split-button-names-1`, clean, equal to `origin`), pull request #268. **Diff reviewed:** `packages/material-x` from the merge base `855990331` to `66e7cf867`.

**Governing records,** in [`00-index.md`](../../00-index.md) at the same commit: `RF-136` with its contract of 2026-11-25, `RF-138` with its approval, and `RD-58`. The implementer's note, [`split-button-names-1/`](../../split-button-names-1/) and [`names-and-card-1/`](../../names-and-card-1/) are read as claims.

**Lens:** feature proof. Nothing is repaired, and no record is amended.

**Verdict: the code has every required property of `RF-136`, `RF-138` and `RD-58`, in Chromium, Firefox and WebKit. No Tier A finding. One Tier B and two Tier C findings, about the rows and the record. The gate hasn't run on this head, so #268's visual job was not read: there is none ([below](#the-gate-has-not-run)).**

## Scope

**Covered:** the source, template, documentation, stories, rows and baseline of the diff; the rows and `names.ts` on a build of my own in a clone; mutations of my own; the disabled state as a page's user has it; enabled pixels against the merge base; the React types; the root format check.

**Not covered:** the records of `RF-137`, `RF-139`, `RF-140` and `RD-53` that the branch carries; a split button in a disabled fieldset, which another entry has; Safari and screen readers; `docs-build`, `docs-smoke`, publint and the sizes, which were not repeated; the visual project.

## Findings

### reviewer-1 — Tier B — no row holds the split button's color, size and shape

- **Contract:** `RF-138`'s required property ends _"The group's other attributes keep working."_
- **Current behavior:** they do work. No row says so. With the constructor transferring `disabled` alone, and none of `color`, `size` and `shape`, every row of `tests/button`, `tests/button-group` and `traits-baseline` about the split button passes in the three engines ([mutations](checks/mutations.txt), _the group takes disabled only_). Firefox has one failure in the second of two runs, `mx-switch-icon-button`'s focus, in a file that has no split button, while another probe was running. It didn't occur in the first run. No visual row renders `mx-split-button` either.
- **Why it is a problem:** the unit rewrote the expression that transfers the three attributes, and the gate can't see their loss. The contract's _Rows_ don't ask for such a row, and the gap is older than the unit.
- **Evidence that the property holds today:** 200 enabled split buttons (each color, size and shape, open and not, with an icon and without) have the same pixels as the merge base's, in each engine. The control, the disabled ones, differ in 100 of 100 ([reading](checks/user.txt)).
- **Required property:** a regression of the attributes that the constructor transfers fails a row.

### reviewer-2 — Tier C — one absence row's recorded mutation doesn't fail it

- **Contract:** `RF-136`'s note says of the three rows of an absence that _"each is failed by a mutation of its own in the three engines"_.
- **Current behavior:** that isn't so for _open should be on neither the leading button nor the host_. Its mutation, _open on the leading button and the host too_, reads `this` inside a method that `useAttributes` calls on its argument, so it throws `TypeError: Cannot read properties of undefined` before it writes anything ([reading](checks/readings.txt)). The saved witness has only the rows of _open not written_ under it, and not this row, in each engine ([`witnesses.txt`](../../split-button-names-1/checks/witnesses.txt)).
- **The row itself is sound.** With `aria-expanded` written to the leading button too, and with it written to the host too, this row fails in the three engines ([mutations](checks/mutations.txt)). So the defect is the record's, and the other two absence rows are witnessed as it says.
- **Required property:** the record's claim of a witness is one that the saved reading has.

### reviewer-3 — Tier C — the record says that lint fails, and it passes

- **Contract:** the note of `RF-136` is the unit's handoff.
- **Current behavior:** the note says _"Lint fails, with three errors in the rows' file"_. The head commit repaired them, and `just lint` on the three changed `.ts` and `.tsx` files passes. The pull request's description says that lint passes. The note wasn't amended.
- **Required property:** the record states the delivered commit's check results.

## The gate has not run

#268 conflicts with `main`, in `.plan/00-index.md` only: `RF-141`'s entry was added where `RF-138`'s note is. GitHub starts no `pull_request` run for a conflicting pull request, so the branch has **no workflow run and the head no check run** ([reading](checks/readings.txt)). Being behind `main` isn't a finding. That no job of the gate has read this head is a limit of this proof, and is owed before the merge. In its place:

- **Visual:** no visual row renders or imports `mx-split-button`, and the two changed sources are imported by nothing that one renders. So _no visual baseline changes_ follows from the code, and the visual job couldn't have refuted it. My pixel comparison above is the evidence for the enabled look.
- **Suite,** own clone and build, without the visual project: the claimed counts, 1745, 1663 and 1664 passed, no failure.
- **Merged with `main` at `e57c9f074`** (its package change is `useSlot`): the rows of the buttons, the groups and the baseline pass in the three engines.

## The contract, read

| Contract | Reading |
| --- | --- |
| `RD-58` 1, the name | Attribute and property, no default, removed by `null`. Named by it in the three trees; no name without. An empty string is written as it is, and gives no name |
| `RD-58` 2, the state | `false` or `true` from the first render and at each change, made by script, cloned, and changed while disconnected. No `aria-haspopup` or `aria-controls` is set |
| `RD-58` 3, the host's label | On neither button, with `secondarylabel` and without |
| Nothing is written inside the icon button's shadow tree | So: the template and the two handlers write to the `mx-icon-button` |
| Template | `aria-expanded="false"`, `aria-hidden="true"` |
| Documentation | JSDoc as worded. The page has the name, its language, `open`, the host's `aria-label`, and the toggle that is never expanded. Every `mx-split-button` in stories and snippets has the attribute |
| Types and baseline | `traits-baseline.json` gains `secondarylabel` only. In React a string, `null` and absence are accepted, and a number and `secondaryLabel` are refused |
| `RF-138`, `disabled` | See the next section |
| The rows of `open` and `secondaryaction` that existed | Unchanged and passing |

`names.ts`, on my own build: byte-identical to the three saved readings. I read them too: the trailing button is `More` with the label and has no name without, collapsed and expanded as `open`, and with `disabled` both buttons are disabled (Firefox: `unavailable`) in the three trees. No row has `keyboard_arrow_down`.

## The disabled state, as a page's user has it

[Reading](checks/user.txt), [probe](probes/user.mjs), in the three engines, on the built head:

- **Activation:** a click at the center, the edge and the top, a double click, a tap, Enter and Space, `host.click()`, and `click()` on the native button give no `click` and no `secondaryaction`, also with `open` and in a form, which isn't submitted. The same for a click on slotted text, a slotted `<span>` and a slotted `mx-icon` ([reading](checks/slotted.txt), [probe](probes/slotted.mjs)). Each of these controls fires while enabled.
- **Focus:** Tab skips both buttons, and `focus()` on the host and the members stays out. Disabling while a button has focus: Enter then fires nothing. Enabled again, both work.
- **Look:** hover and press change nothing: no corner, color or icon turn. 200 comparisons (each color, size and shape, open and not, both buttons) have the colors, shadow, opacity and cursor of a disabled `mx-button` and `mx-icon-button` alone.
- **Time:** the attribute set or removed while disconnected, made by script, cloned, toggled, and with `size` and `color` changed in the same task: both buttons follow. A double click whose first event disables the element fires once.

## The departures, judged

- **Rows that pass on `main`: accepted,** apart from reviewer-2. The witness that a row owes is that it can fail, and each group does:
  - the 3 absence rows, by the mutations above;
  - the 16 enabled rows: with `disabled` never removed from the group, 14 fail. The other 2, a click on the leading button, pass with its native button still disabled, because the click on the slotted text has the host as its target. _should enable both native buttons_ holds that case;
  - the 3 rows of a click on the disabled leading button, which the note says no mutation fails: with the host not form-associated they fail in the three engines. The entry gives the host's own disabled state as their cause, and this is it;
  - the 3 rows of a key on it, in Firefox and WebKit: with the host not form-associated and `disabled` not transferred they fail.
- **`aria-hidden` held by Chromium's tree alone: accepted.** The contract puts _no icon text_ in Chromium's tree rows, narrows the other engines to `names.ts`, and `RF-137`'s unit removes the attribute.
- **React types through `SplitButtonLikeProps`: accepted.** The contract says so, and the types were run.

## Checks

Root `just fmt-check` at `66e7cf867`: passes. `just lint` on the changed files and material-x's `typecheck`: pass. `git diff --check`: clean. `.scripts/entry.sh --duplicates`: none. Links of this report: by hand.

**Stopping boundary:** the three findings go to the architect. The conflict in the index is the branch owner's, and the gate's first run on the result is owed.