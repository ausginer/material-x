# A late-upgraded button in a connected group's roving order (RF-141, #262, #269) — feature proof

**Files were read at:** `df687de7d988e36a1ac85e30bb9744d703df3a45`, the head of `core/roving-upgrade-1`, in slot `g`, equal to `origin`. **Diff reviewed:** `e57c9f074..df687de7d`. `main` at `56bba2895` merges without a conflict (`git merge-tree`) and changes no file of the hook or the group. Hooks that a probe compared were copies, and `packages/` is unchanged. Browsers: Playwright's Chromium, Firefox and WebKit.

**Contract:** `repo:RF-141` in [`00-index.md`](../../00-index.md), with the implementer's note of 2026-11-25 and [its evidence](../../roving-upgrade-1/). `RF-131` and `RF-69` where they meet it.

**Verdict: not a pass yet, for one part of property 1.** Each late item is managed, property 2 holds, and the added state is needed. The tab stop is as property 1 says where nothing but definitions comes after the slot change. Where another slot change comes before the definition it often isn't, and in one case the definition moves the tab stop from one ready button to another: `reviewer-1`, Tier A, for the architect. Two Tier C findings.

## The questions

**Is the added state needed for property 1? Yes, both parts.** The reference is the same steps with items that are upgraded from the start, on `main`'s hook. 1000 random sequences in each stratum, the three engines read the same, line for line ([Chromium](checks/fuzz-chromium.txt), [Firefox](checks/fuzz-firefox.txt), [WebKit](checks/fuzz-webkit.txt), [probe](probes/fuzz.browser.test.ts.txt)). The numbers are sequences whose tab stop isn't the reference's.

| Stratum | `main` | Candidate | Candidate with `isMoved` | Subject |
| --- | --: | --: | --: | --: |
| H: one batch of ready and late items, then definitions | 810 | 298 | 298 | **0** |
| J: the same with elements that are no items or never defined | 669 | 162 | 162 | **0** |
| A: H, with value, focus and blur | 808 | 98 | 85 | 12 |
| K: the focus moves, and a value | 808 | 55 | 36 | 5 |
| B: A, with items added | 654 | 132 | 121 | 37 |
| C: B, with items removed | 485 | 108 | 99 | 23 |
| D: C, with items moved or put back | 477 | 141 | 140 | 46 |
| G: B, with several steps in a task | 614 | 156 | 143 | 64 |
| I: one batch, then items added, no value | 622 | 434 | 434 | **239** |

Without `chosenBy` ("candidate with `isMoved`"), 30% of ordinary single batches have the wrong tab stop. Without `isMoved`, a row of the implementer's fails (his table), and the candidate is 98 and 55 wrong in A and K where `isMoved` alone makes it 85 and 36. The registered diff as it is reads as "candidate" (one sequence more in D). Strata with disabled items (E, F) measure mostly the reference: it keeps the tab stop on a button that is disabled after its read, with the candidate at 143 and 132 and the subject at 64 and 48. In no other stratum does the subject leave a late item unmanaged or give another count of tab stops; in E and F it has another count in 31 and 15, as the candidate does.

**Is there a smaller way? None was found with the same behavior.** Seven others were read, `button-group/connected-button-group` minified by rolldown, Brotli ([sizes and memory](checks/gc.txt), [hooks](probes/variants.mjs)):

| Hook | Brotli | H, of 1000 | I | I, ready to ready | Core rows that fail, of 52 |
| --- | --: | --: | --: | --: | --: |
| `main` | 3907 | 810 | 622 | 0 | 13 |
| The registered diff | 3959 | 298 | 434 | 0 | 7 |
| The candidate's read in the subject's checks, dead state left in | 4006 | 298 | 434 | 0 | 5 |
| `isMoved` only | 4044 | 298 | 434 | 0 | 4 |
| A boolean in place of `chosenBy` | 4055 | 0 | 331 | 26 | 1 |
| **Subject** | **4057** | **0** | **239** | **17** | **0** |
| No record of the slot change: a late item before the default one takes the tab stop | 4061 | 0 | 269 | 6 | 1 |
| The nodes of each slot change since the last choice by value or focus, in order | 4062 | 0 | **0** | **0** | 0 |
| One variable for the two states | 4064 | 0 | 239 | 17 | 0 |
| The changed nodes give the next choice themselves | 4070 | 43 | 102 | 0 | 0 |
| The intended tab stop is a node that needn't be an item yet | 4105 | 0 | 0 | 0 | 0 |

So the size is the property's, not this shape's. Two others meet I at +5 and +48 B; this is a reading, not a proposal. The subject's +150 B is 98 B more than the registered diff, and that diff is wrong in 30% of H.

**A node that left isn't upgraded, and customized built-ins aren't waited for: both right.** The first is a row, and it is property 2's own reading. The second is needed: without the check the rejection is unhandled in Chromium and Firefox. A customized built-in element can't be an item, because an item is a `ControlledElement`.

**The WebKit readings are the probe's, not the hook's** ([reading](checks/callers.txt)). With the subject, 12 runs on a loaded machine: ten with 0 differences and two with nine. The two are byte for byte the same: the three `mx-top-app-bar` cases, each `got` the listing of an earlier `mx-list-item` case. So the stale element differs from the implementer's `mx-text-field`. Those cases have no group and don't use the hook. The listing's first line is the `localName` of the element that the case has just built, so no hook can change it. The cases between the two are right, and `read.right` is right in the bad cases. Its cause wasn't found, and an engine's optimized read of `read[way]` is suspected. Alone, 0 of nine further runs are stale with the subject, three of them with the JIT made early, and 0 of 14 on `main`, which reads its nine known cases each time. The rate of two in 21 with the subject isn't told apart from 0 in 14, so this doesn't say that `main` is free of it. An instrumented copy ([probe](probes/callers-stores.browser.test.ts.txt)) had 0 stale in eight completed runs.

**Focus in a group whose late items arrive** ([reading](checks/focus.txt), [probe](probes/focus.browser.test.ts.txt), `mx-switch-button`, and `mx-switch-icon-button` by a later import, three engines the same). The focus stays, no event fires, and the tab stop stays on the focused button. ArrowLeft then reaches the late button with one `focusin`, `input` and `change`. The value, a disabled late button, a stop that focus moved off the value, and clones that are connected and focused in one task are right. The defect of `reviewer-1` is there in real elements.

**`RF-131` and `RF-69`.** Nothing was found against either. The callers probe reads 0 of 126 differing with the subject in Chromium and Firefox, and in the WebKit runs but the two above. A button that is upgraded while out asks for its context when it is connected, as `createElement`'s does.

## Scope

**Covered:** the fuzz; the rows against ten hooks and the subject, with eight mutations that the implementer's table lacks ([reading](checks/mutations.txt), [probe](probes/mutations.mjs)); memory in Chromium ([probe](probes/gc.mjs)); the group's real elements; the rows at this head in each engine by CI, all green (Chromium, Firefox, WebKit, static, docs, measurements). **The root `fmt-check` passes.**

**Not covered:** Safari, screen readers, a scoped registry, `split-button`, page-built users of the hook, a declarative shadow root's content. Memory in Firefox and WebKit.

## Findings

### reviewer-1 — A late item's definition moves the tab stop from one ready button to another

**Tier A. Introduced by this unit** for the ready-to-ready case; the rest is new behavior that property 1 doesn't settle. **For the architect:** what "the slot change" means when another comes before the definition.

- **Current behavior.** `[b, late]`, no value: `b` has the tab stop as the first enabled item. A ready `new` is put first: `b` keeps it. The late button is then defined, and the tab stop goes to `new`. Read in the real group in each engine, before `new:-1 b:0`, after `new:0 b:-1 late:-1` ([reading](checks/focus.txt)). With `main`, the registered diff and the reference, `b` keeps it.
- **Why.** The second slot change doesn't move the tab stop, so `chosenBy` stays the first change's nodes. The late button's join clears the tab stop for that change, and then takes the first enabled item of the current nodes, which include what came since.
- **Property 1:** "The tab stop then is what it would be if the button had been an item at the slot change." `b` was before the late button at the change, so it is `b`. Neither the late button nor `b` is why the tab stop moves.
- **The wider case.** In I, 239 of 1000: another slot change puts an item in front of, or beside, a late one, and the tab stop is then given by the later change. Smallest: `[late]`, then a second late item is put first and both are defined. The subject gives the first item; with items from the start, the older one keeps it. 17 of the 239 are ready to ready. Each is in the fuzz's output. Also in A and K, 12 and 5 of 1000: the value changes away before the late item that it matched is defined, so the first item has the stop where the reference keeps that one.
- **Reach.** It needs another slot change, or a value change, between the read and the definition. A page that loads the group, the late buttons and something that adds a button in separate tasks meets it. The result is a keyboard user's tab stop that moves by itself; focus doesn't.
- **Required property.** A definition doesn't take the tab stop from an enabled item to an item that the definition didn't make. Whether the wider case holds too is the architect's.

### reviewer-2 — Nodes stay in memory beyond the accepted cost

**Tier C. Introduced.** Chromium, the real group ([reading](checks/gc.txt)).

- **Current behavior.** `chosenBy` holds the nodes of the slot change that gave the default tab stop, in ordinary groups with no late item. After ten items with nine removed, and no value or focus since, nine of nine removed buttons stay alive while the group stays. `main` and the registered diff: zero. Beside an element that is never defined, each slot change's wait keeps its `nodes`: 100 items added and removed one by one, 100 of 100 alive; `main` and the registered diff zero. The candidate's read, with the dead state in, 1.
- **Contract.** `RF-141` accepts "a slotted element whose name is never defined stays in memory with its group". Removed siblings aren't that element. A removed group is collected as before, and one with a never-defined element isn't, which is the accepted cost.
- **Required property.** A group's removed items can be collected, or the accepted cost says what else is kept.

### reviewer-3 — The rows accept hooks that are wrong

**Tier C, rows.** Chromium, 52 core rows ([rows by hook](checks/rows-by-variant.txt), [mutations](checks/mutations.txt)).

- **Current behavior.** Six of eight mutations pass all 52: a value's match keeps the default choice; a read keeps the moved state; the join reads its own change's nodes; the join selects without its nodes; a node that is no item joins; a value change drops the default choice. Five of them change the fuzz: the third leaves items unmanaged in B, C and G (5, 4 and 16), the fourth is wrong in 43 of 1000 single batches (two late names that are defined in reverse order), and the first, second and sixth differ in A, B, D and K. The fifth changes nothing the fuzz sees.
- The hook that gives the next choice from the changed nodes themselves passes all 52 and is also wrong in 43 of H.
- **No row** has two late names, or a ready item put first before the definition (`reviewer-1`).
- **Required property.** A row fails for each of these five, and for `reviewer-1`'s case.

## Observations

- `isItem(node)` before the join changes no tab stop in any stratum (J and the disabled ones included); the mutation without it reads as the subject.
- The 21 core rows are 13 that fail and eight that pass on `main`'s hook, as the note says.
- `main` reads 76 differences in none of these runs; the implementer's first run is the only one with a text field.