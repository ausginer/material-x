# `useARIA` after a reconnect (RF-124, #223) — feature-proof recheck

**Files were read at:** `80c5db113`, the head of #224 (`core/use-aria-1`), in slot `e`, clean and equal to `origin`. **Diff reviewed:** `20997b0e2..80c5db113`, outside `.plan/`. Where a reading says `main`, this tree has `useARIA.ts` as at `114270083`, and where it says the `Set`, as at `6e0ca1d4f`, with core rebuilt. The file was restored and core rebuilt afterward. Browsers: Playwright's Chromium, Firefox and WebKit.

**Subject:** `repo:RF-124` in [`00-index.md`](../../00-index.md) with its amended property, the ruling at `429656611` and the implementer's second note, and my [feature proof](feature-proof-claude.md) at `6e0ca1d4f`.

**Verdict: pass. Properties 1 to 5 hold in the three engines, and `reviewer-1` is resolved. `reviewer-2` and `reviewer-3` are closed. Three new findings: the JSDoc promises more than property 4 (`reviewer-4`, tier B), a defect of the text fields that `main` has too (`reviewer-5`, tier A, pre-existing), and no row for the observer's start (`reviewer-6`, tier C). None of them is against the property.** The pass counts the component's values that are lost when they were written before the host's loss as `RF-130`, as the ruling does.

## Status of the first proof's findings

| Finding | Status | Evidence |
| --- | --- | --- |
| `reviewer-1`, first case: lost while connected, then the component's own value, then a move | **resolved** | All nine pairs of element and name keep their value after the move. In core the target keeps it after each of two moves. Two core rows and two of `mx-link-button` guard it and the second case. |
| `reviewer-1`, second case: lost while out, then the component's own value, then the connect | **resolved where the loss was written first** | The orders' probe reads as [own-order-built.txt](../../aria-removed-1/checks/own-order-built.txt), row by row: kept in a later task, also after a move. In the same task, or with the component's write first, the value is gone, which is `RF-130`. `own-out`'s 15 rows are all of that kind, and read as at `6e0ca1d4f`. |
| `reviewer-2`: one `Set` for every hook | **closed with the mechanism** | Nothing is kept between connects. The local `Set` is created in each connect. |
| `reviewer-3`: what the `Set` bought | **closed** | The record is corrected, and the row that reads the target synchronously fails without the records. |

## Scope

**Covered** ([readings](checks/recheck-readings.txt), [mutations](checks/recheck-mutations.txt); probes of [core](probes/recheck-core.browser.test.ts.txt), [material-x](probes/recheck-material-x.browser.test.ts.txt), [garbage collection](probes/recheck-gc.mjs), [timing](probes/recheck-timing.mjs) and [mutations](probes/recheck-mutations.mjs)). The three engines' readings are identical in every row except the timings.

- **The 54 names and the first proof's other probes,** 84 rows with the orders' probe. The 32 rows of the 54 names read as at `6e0ca1d4f`. Twelve other rows differ, and all by the ruling: the ten of `reviewer-1`'s first case, _several connects_, where a lost name isn't written again, and _never mirrored_, where a name that the host had only while out, or within one task before a move, is now written when it is lost.
- **Written once.** With each of the 54 names, the writes to the target and the transformer's calls are counted at each step. A connect writes a name once, whether it was set, changed three times, lost, or lost and regained before it, and nothing follows in the microtask or the frame. A loss is written once by the microtask or by the connect, and no later connect writes it again. Two moves in one task write a loss once. Three changes in one task without a connect are three equal writes, as while connected on `main`. A name that was already mirrored while out is written again by the connect, which is property 3's copy.
- **Hosts that aren't connected.** A host that has never been connected is mirrored in a microtask, and its loss too. Every caller does this: ten elements with seven names each, with no error and no rejected promise. `mx-split-button` mirrors nothing, as before. The target's own value that follows a written loss survives the first connect.
- **Ways to be created.** An upgrade in and out of the document, the parser, a clone and an imported template: each name is transformed once in the first connect, and not again. An upgrade or a clone out of the document writes nothing until the connect, as on `main`. So an element that a page makes and appends in one task reads as on `main`.
- **Adopted hosts.** A document without a window and one of an iframe, changed and lost there, back in one task and later, adopted without insertion, and an iframe that is then removed: the target follows in each.
- **Ten hooks on one host.** Each has its own records. Ten transformer calls for each change, ten in a connect that writes, and none after it. No component has more than one hook on a host. One component's mirror into another's host, and a page's observer that moves the host in its own callback, read right too.
- **Collection.** Of 500 hosts each, never connected, set and never connected, removed, and removed with a pending loss, none survives collection, as with hosts that have no hook. The mirror still works after collection in a host that the page's JavaScript has no reference to, in the document, in a fragment, and in a removed subtree.
- **Many hosts.** 3,000 hosts with one hook: making each with three attributes takes 15 to 18 ms in Chromium, 13 to 34 in WebKit and 25 to 44 in Firefox, for `main` and then the new hook. Making and appending in one task takes about the same (26 and 21, 25 and 24, 53 and 55 ms). The cost is for records that nobody reads: a change of any attribute of 3,000 hosts that are out takes 3 to 11 ms instead of 0 to 2. Firefox's time isn't linear in the number of observers with pending records: 30,000 of them take about 1.3 s, which `main` takes too for a change while connected. The machine had other load.
- **The rows fail without what they guard.** I ran the implementer's 12 mutations in each engine with all 18 core rows and the 195 of material-x. Each fails the same rows as its [record](../../aria-removed-1/checks/mutations-2.txt) says, in the three engines. I added four. An observer that stops at the first disconnect, and one whose taken records of lost names are dropped, fail the rows expected. Deferring the connect's writes by a microtask fails core's synchronous row, the row of the host's value, and the sortable row. One that starts at the first connect fails none (`reviewer-6`).
- **The implementer's departures.** Both hold.
  - The sortable row passes when the records aren't taken, in the three engines. The list's writer runs from `customElements.whenDefined(…).then` in `useContext`, so after the observer's delivery, which was queued at the removal. The row fails when the connect's writes are deferred by a microtask, so it does guard their time against that writer, but not the taking.
  - The added core row is needed. Without it, a connect that doesn't copy the host's names fails no row.
- **README and JSDoc.** The README's row is true. The JSDoc has one false sentence (`reviewer-4`). The two comments are true.
- **CI** on `80c5db113` passes, with the three engines' jobs. I ran no whole suite.

**Not covered:** Safari, screen readers, the spec and visual projects. The sizes are taken from the record.

## Findings

### reviewer-4

**Tier B.** `useARIA`'s JSDoc says that a connect doesn't remove what was written to the target after the host's loss. It does when the loss is still pending.

- **Current behavior / contract.** The JSDoc: _"A connect doesn't remove what was written to the target after the host's loss, nor an `aria-*` attribute that the host has never had."_ Property 4 says _"after the host's loss **was written**"_.
- **Evidence,** the same in the three engines. The host loses the name, the target's own writer sets it, and the host moves, in one task: the target has no attribute after the move. `main` keeps it. In the orders' probe, _out, back in that task_, _loss, own in one task_ reads `null` at once for all six pairs.
- **Why it is a problem.** The hook is public, and its target's writer is the reader of this sentence. It promises the one order in which the value is lost. The behavior itself is `RF-130`'s.
- **Required property.** The JSDoc doesn't promise more than property 4.
- **Route:** the implementer.

### reviewer-5

**Tier A, pre-existing.** A text field whose label or support content changes while it is out, in a task before it returns, keeps its old `aria-labelledby` or fallback. It isn't a defect of this branch.

- **Current behavior.** `useSlot` listens only while the host is connected, so it misses a `slotchange` that is delivered while out. Nothing computes the fallback again at the connect.
- **Evidence,** `mx-text-field` and `mx-multiline-text-field`, in the three engines, for a label that changes in a task after the text field was taken out and before it is put back:

  | The host's `aria-labelledby` | Label | `main` | The `Set` | `80c5db113` | Right |
  | --- | --- | --- | --- | --- | --- |
  | never had it | removed | `label` | `label` | `label` | absent |
  | never had it | added | absent | absent | absent | `label` |
  | lost while out | removed | `x` (the lost value) | absent | `label` | absent |
  | lost while out | added | `x` (the lost value) | `label` | absent | `label` |
  | lost while connected | removed | `label` | absent | `label` | absent |
  | lost while connected | added | absent | `label` | absent | `label` |

  In the first two rows, `main` and the branch agree: the page never uses `aria-labelledby`. The `Set` covered the others only because it wrote a lost name again at each connect, which the ruling ended. When the text field is taken out, loses the name, changes its label and returns in one task, it is right in the frame after.

- **Why it is a problem.** A text field without a name, or with an id that names an empty label. A page that keeps an element, changes its label while it is out and puts it back meets it.
- **Scope of the reading.** `label` with `aria-labelledby`. `support` and `counter` use the same code, and I didn't read them. Other callers of `useSlot` weren't read.
- **Required property.** After a connect, the text field's own naming follows the content that it has then.
- **Route:** the architect, to register. `RF-124`'s property doesn't ask for it.

### reviewer-6

**Tier C.** No row fails when the hook observes from the first connect instead of from construction.

- **Evidence.** With `observe()` moved into the connect callback and nothing else changed, all 18 core rows and all 195 of material-x pass in the three engines.
- **Why it is a problem.** The ruling's mechanism is an observer _"that runs from construction to collection"_, and property 2 covers a host that is out. Each row connects the host before the change that it reads, or reads a value that the connect copies anyway.
- **Why it isn't only a missing row.** By reading, the start is what makes the one case where a page that sets and loses a name before the first connect differs from `main`: the target loses a value of the component's own, also when it was written after the loss in that task (the observation below). The ruling names that case and accepts it, so the route is a row.
- **Required property.** A row fails when a change before the first connect isn't written.
- **Route:** the implementer.

## Observations, no finding

- **For `RF-130`'s plan.** A name that the host gets and loses in one task, before its first connect, removes the component's own value whatever the order, because the connect writes the pending loss: `mx-link-button`'s `aria-disabled` with `disabled`, `mx-text-field`'s `aria-required` with `required`, and `mx-switch-button`'s `aria-checked`, also the `false` of its template. `main` and the `Set` keep them. A switch that isn't connected yet loses its `aria-checked="false"` when the host gets and loses the name across tasks. Its state stays, and nothing writes it until `checked` changes. The ruling covers it: _"a value that the component had for it stayed"_.
- **The witness's correction at closure.** The sortable row's property as the implementer states it, _"guards the repair and not the moment"_, is right for the taking of the records. The mutation above shows that it isn't indifferent to when the connect writes.
- `.agents/docs/accessibility.md`'s stale names and paths (the first proof's observation) are unchanged.