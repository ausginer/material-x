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

## Recheck of 2026-11-25, at `35eb0c0ef`

**Files were read at:** `35eb0c0ef`, the head of `core/roving-upgrade-1`, in slot `g`, equal to `origin`. **Diff reviewed:** `0f92dc677..35eb0c0ef`, in which core's hook and its rows are the unit's and the rest is `main`'s. **Contract:** `RF-141`'s ruling at `b1f0c79a4`, in [`00-index.md`](../../00-index.md), and the implementer's note after it. Each browser reading is of Playwright's Chromium, Firefox and WebKit, one engine at a time, unless it names one.

**Verdict: pass.** The hook does what the ruling's contract says, and `reviewer-1` to `reviewer-3` are answered. One new Tier C finding about the rows: `reviewer-4`. CI on #269 is green at this head.

### The questions

**The hook against the contract's words: no difference outside `RF-143` and one limit of the same task** ([reading](checks/recheck-model.txt), [probe](probes/recheck-model.browser.test.ts.txt)). The ruling's fuzz compares one hook with another, so this model has no hook as its reference. It reads the value, a log of the document's `focusin`, and the children. It has 12 strata of 1000 sequences, with late items and with none. Its items can take focus before the group manages them, as switch buttons do. Two strata, L and M, focus an item in the task that adds it. The engines read the same, line for line.

- In A to D, H, I, K, L and M, the tab stop is the contract's, or is where a `focusin` moved it off the value's item. After one more slot change it is the contract's in all 1000.
- In E and F the differences are items that are disabled with no read after it, which is `RF-143`'s. After one more slot change there are none.
- In G there is one: an item is focused and blurred in the task that adds it, and no read sees it. `focusin` didn't move the tab stop to it, so it isn't a violation.
- No late item is unmanaged and no second tab stop exists, outside E and F.

**The ruling's fuzz: reproduced in each engine** ([reading](checks/recheck-fuzz.txt)). The head reads A 13, B 10, C 9, D 1, E 70, F 30, G 29, H, I and J 0, K 19, as the note says, line for line. The 10 of G that the ruling didn't classify are of the probe's items: they take no focus until they are managed, so a focus step in the task of their definition does nothing in the late run only. With items that take focus, in Chromium, G reads 19 for the head and the stop is the value's item in each, and 22 for `current`. The other strata don't change.

**Departure (1), the focused item of a read is recorded: it is the contract, and it contradicts nothing in the accepted limit.**

- The contract names "the enabled item that focus moved it to last, while that item is in the slot". It doesn't ask that the item is still focused. The ruling's `current`, which the ruling calls a direction, is the one that isn't the contract: after one more slot change it has another tab stop in 20 (L), 21 (M), and 7 or 3 (G) of 1000, where the head has 0, 0 and 1.
- The value is still first. With value `b` and an item added and focused in one task, the stop is `b`, in the real group as well. The departure decides only when the value matches none.
- In the real group, without a value: the added item has the stop, keeps it after a blur and a button put first, and loses it when it is removed and put back ([reading](checks/recheck-focus.txt), [probe](probes/recheck-focus.browser.test.ts.txt)).
- The check that the item is enabled is right: `settled`, without it, replaces an earlier choice by a focused disabled item, and reads one sequence wrong in E.
- The note's "in the fuzz the three hooks have the same numbers" is true and says nothing about this case, because the fuzz's items can't be focused before they are managed.

**Departure (2), the row of an item that is added after a late one: right.** It adds the item in the task of the definition. There the slot change finds nothing undefined, so only the first wait reads after it, and the mutation that reads the slot change's own nodes fails that row alone.

**Memory, Chromium** ([reading](checks/recheck-gc.txt)): removed items 0 of 9, 0 of 9 and 0 of 100 alive, as on `main`. A removed group with an element that is never defined stays, which is the accepted cost. `connected-button-group`, minified by rolldown, Brotli: 3909 on `main`'s hook and 3998 here.

**Focus in the real group** (same reading and probe): focus never moves at a definition and no event fires, and the tab stop follows the contract. `reviewer-1`'s three cases, where a ready button is put first, give the stop to it before the definition and the definition moves nothing. A definition gives the stop back to the value's item (`c`) when focus had moved it to `b`, which is the accepted limit. Tab, Shift+Tab, the arrow keys and a click in a group with a late subclass behave as they read.

**The former findings:**

- **`reviewer-1`: answered.** H, I and J read 0. Its own case is a row (a ready item put first, then the late one behind it).
- **`reviewer-2`: answered.** As above.
- **`reviewer-3`: answered.** The state of five of its mutations is gone, and the ruling's rows replace it. Two late names in reverse order and an item put first are rows. `reviewer-4` is what the new rows still accept.

**The ruling's witnesses** were not run again: the note's table names each one, and its saved run has the failing rows in the three engines. My mutations are others.

### Scope

**Covered:** the model, the ruling's fuzz, memory, focus in the real group, 18 new mutations of the choice and the read against the 62 rows ([reading](checks/recheck-mutations.txt), [probe](probes/recheck-mutations.mjs)), and against nine strata of the model in Chromium (its page lost the connection before H, I and K). **The root `fmt-check` passes.** The probe files were removed from `packages/`, and no production code is changed.

**Not covered:** what the first section names as not covered, and the sizes by `size-limit`, which the implementer reads and I didn't.

### reviewer-4 — Three mutations of the choice pass all 62 rows

**Tier C, rows.** The three engines, the same counts ([reading](checks/recheck-mutations.txt)); the model's numbers are Chromium's. 15 of the 18 mutations fail a row.

- **Current behavior.**
  - _Only the first focus is recorded_ (`this.#chosen ??= item`). The contract's word is "last", and no row has focus move twice and then a read. After one more slot change the model differs in 7 or 8 of 1000 in A, and in 1 to 7 in B, E, G, L and M.
  - _A read prefers the former choice to the focused item._ Focus had chosen one item, and another is added and focused in the same task. The tab stop then stays on the first. The two rows of this shape have no earlier choice. The model differs in 51 of 1000 in L, 26 in M.
  - _A disabled item that is focused at a read is recorded._ The implementer's note says why it is the enabled one. The model differs in one sequence of E.
- **Why it is a problem:** the first two are the ordinary meaning of the contract's two clauses about focus, and a later change can lose them with green rows.
- **Required property.** A row fails for each of the first two. The third is rarer, and is for whoever takes the first two.

### Observations

- The row _"should fall back to the active item when host value does not match any enabled item"_ keeps its name, and the hook no longer falls back to an active item. It still holds, because that item is also the one that focus chose.
- `focus()` sets the tab stop before it focuses. An item that can't take focus (hidden) is now set for that moment only, because nothing records it and the next read takes it back. It is `RF-143`'s case and was not read here.