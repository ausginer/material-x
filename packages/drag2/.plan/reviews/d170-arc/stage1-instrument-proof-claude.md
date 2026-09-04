# Stage 1 — feature proof over the three instruments

**Read at `a571576f`**, with `c2a1d273` as the baseline the pass is measured against. Mutations were run in a throwaway worktree detached at `a571576f`, with `node_modules` symlinked from the repository root; the tracked tree was not modified by this pass, and the worktree is removed.

## Scope

Covered: the three instruments the pass adds — `tests/sortable/rect-index.declaration.test.ts` (F-316), `tests/kernel/context.declaration.test.ts` (F-317), and the two wrapper rows in `tests/sortable/sortable.browser.test.ts` and `tests/free-drag/lifecycle.browser.test.ts` (F-318); every mutation recorded in the three entries, re-run against a same-worktree baseline; the non-vacuity of each row those tables do not reach; the `COVERAGE.md` and `plan.md` records of the same three; and the question of whether any C1–C5 implementation or production behaviour entered the commit.

Not covered, deliberately: F-335 and F-323, both untouched by this commit; Stage 0, closed at `c2a1d273`; the C1–C5 arcs themselves; and the pre-`a571576f` history of F-316/F-317/F-318 as findings, which the D-170 arc's own feature proof establishes.

## What holds

**Nothing but tests and record entered the commit.** `git diff --name-only c2a1d273 a571576f` returns seven paths: `00-index.md`, `plan.md`, `COVERAGE.md` and the four test files. `src/` is byte-identical, so no C1–C5 implementation and no production behaviour is in this pass. `00-index.md` and `plan.md` each take a single hunk, and the only `D-*` identifiers on an added line are `D-165` and `D-170`, both pre-existing and both cited rather than amended. No decision is created, superseded or renumbered.

**F-316's six mutations reproduce exactly, row for row.** Each was applied to `src/sortable/rect-index.ts` in the worktree and run as `npx vitest run --project declaration`, whose baseline there is 82 rows, 0 failed.

| Mutation | Recorded | Measured |
| --- | --- | --- |
| `values` widened to `Float64Array` on the view | 1 — the packed-buffer write | 1 — _should refuse a packed-buffer write through the reader_ |
| `hole` widened to `Float64Array` on the view | 1 — the hole write | 1 — _should refuse a hole write through the reader_ |
| `items` widened to `HTMLElement[]` on the view | 2 — the length write and the element write | 2 — _…an element-array mutation…_ and _…an element assignment…_ |
| `count` made writable on the view | 1 — the count assignment | 1 — _should refuse a count assignment through the reader_ |
| a fifth member added to the view | 1 — the member-set equality | 1 — _should re-declare exactly the four data members_ |
| the class's own `count` made `readonly` | 1 — the owner's write | 1 — _should let the owner write all four through its own declarations_ |

No mutation reddened a row belonging to another, and none reddened a row outside the file. The stated mechanism is the one that fires: every red is `TS2578`, an unused `@ts-expect-error`, so a widening cannot make a row silently vacuous. The declaration project runs with `ignoreSourceErrors: true`, which is what keeps a mutation's own source errors — the failed `implements RectIndexView`, the internal writes a `readonly count` refuses — out of the count.

**The eighth row is non-vacuous too, and the entry's table does not reach it.** Declaring the class's `values` as `number[]` reddens both _should hand the class's own buffers to the reader unchanged_ and the owner's row. That row is doing real work rather than restating `implements`: because source errors are ignored in this project, a class field that stopped satisfying the reader's type would otherwise be invisible here, and this row is what makes it visible. Recorded as `s1-2` that the entry does not say so.

**F-317's four mutations reproduce exactly, and name the same rows.**

| Mutation | Recorded | Measured |
| --- | --- | --- |
| `arm` promoted onto `BehaviorContext` | 2 — the member set and the difference | 2 — _should grant exactly the seven members it names_, _should withhold every public member of the class it does not name_ |
| a public member added to the `Kernel` class | 1 — the difference | 1 — _should withhold every public member…_ |
| a member dropped from `BehaviorContext` | 2 — the member set and the difference | 2 — the same two |
| `arm` made `#private` on the class | 2 — the difference and the class row | 2 — _should withhold every public member…_, _should keep the arming handshake on the class_ |

**The probe half of the entry's claim holds under `tsc` rather than under the declaration project.** `tests/probes/13a-discrete-input.ts` and `tests/revision/phase-14.ts` are not `.test.ts` files and no vitest project runs them, so the claim that promoting `arm` leaves all four probe directives consumed had to be measured with `npx tsc -p tsconfig.json --noEmit`. Under that mutation `tsc` reports three errors: the two new `context.declaration.test.ts` rows, and one collateral in a `sortable.browser.test.ts` stub that must now supply `arm`. **The probes report nothing** — `13a`'s `n2`, `13c`'s `n4` and `phase-14`'s restatements stay consumed and green, which is exactly the entry's point about them.

**F-318's mutation reproduces exactly, including its collateral.** Rewriting both wrappers as `destroy: async (): Promise<void> => { await kernel.destroy(); }` and running the whole suite against a same-worktree baseline gives six new reds and no others:

|  | Recorded | Measured |
| --- | --- | --- |
| behavioural | exactly 2, and they are the two new rows | 2 — _…by identity through the sortable wrapper_, _…through the free-drag wrapper_ |
| size controls | 4 — `free drag minimal`, `+ bounds`, `+ landing`, `complete` | the same 4, in `tests/bench/size.node.test.ts` |
| kernel-tier row | stays green | _should return one promise from every destroy call_ is not among the reds |

**The exclusion of `consumer.node.test.ts`'s packed rows is right, on firmer ground than the entry states.** All three packed rows fail at the unmutated worktree baseline, from the absent build artefact, so they are not mutation reds at all rather than intermittently so. Three further worktree-baseline reds — two in `packaging.node.test.ts`, one in `references.node.test.ts` — went _green_ under the mutation, which is the same artefact-dependence in the other direction and carries no information about the property either.

**No regressions.** The whole suite at `a571576f` in the main tree: 1340 rows, **1279 passed, 60 skipped, 1 failed**, and the one failure is `tests/perf/m5.browser.test.ts` — _should report a difference that tracks a cost injected into window 1_ — which passes on its own and passed in both worktree whole-suite runs. That is the same load-sensitive timing row diagnosed in the Stage 0 closure proof, not a new red. The record instruments are green, so `COVERAGE.md`'s new rows name tests that exist and the added links resolve; each of the thirteen row titles it books resolves to exactly one test file.

**The narrowing the entries claim is the real one.** `void kernel.arm` under `@ts-expect-error` is at `tests/consumer.node.test.ts:783`, against the shipped declarations, as F-317 says. The reader view carries no method members, so `@typescript-eslint/unbound-method` — the gate F-291…F-296 armed — has the coverage over `RectIndexView` it had before the four accessors were deleted.

## Findings

### s1-1 — F-317's mechanical confirmation states a measurement that is false · Tier B

**Finding.** `00-index.md:3407` opens **The finding's claim is confirmed mechanically before it is repaired** and offers this as the confirmation: _`addIngress`, `activate` and `move` occur **zero** times in `kernel.ts`_. `plan.md:2309` repeats it. At `a571576f`, only `addIngress` occurs zero times. `activate` occurs on four lines of `src/kernel/kernel.ts` — the private method `#activate(): void` at `:1511`, its two calls at `:2072` and `:2158`, and a comment at `:2272` — and `move` occurs on two, the module docblock at `:2` (_admission → activation → move → release → teardown_) and a comment at `:1710`.

**Why it is a problem.** The paragraph is the entry's evidence, and it is the one sentence in the three entries that a reader is invited to re-derive by grep. Re-deriving it contradicts it. The true claim — that the three names are members of _neither_ `Kernel` nor `BehaviorContext` — is what the finding actually rests on, it is what the raised paragraph two paragraphs below still says correctly, and it was stated exactly right in the arc's own feature proof: `d170-arc-feature-proof-claude.md:90` reads _`addIngress` and `activate` are not members of `Kernel` either (`#activate` is private)_. The repair replaced a true membership claim with a false textual one, so the record is now weaker than the review it is closing. Tier B second limb: the record misleads about its own evidence, and it misleads in the direction of making the finding look over-claimed.

**Evidence.** `grep -c '\bactivate\b' src/kernel/kernel.ts` → 4; `grep -c '\bmove\b'` → 2; `grep -c '\baddIngress\b'` → 0. `keyof Kernel` contains neither: `#activate` is `#private` and `move` is not declared at all, which is why the instrument that replaces the probes — `Exclude<keyof Kernel, keyof BehaviorContext>` pinned at `'arm'` — is the right repair regardless.

**Required property.** The paragraph presenting itself as the mechanical confirmation states a measurement that re-derives at the commit the entry ships in. Either the membership claim, which is true and already written elsewhere in the record, or a textual claim narrow enough to hold.

### s1-2 — F-316's recorded row and mutation counts are each short by one · Tier C

**Finding.** `plan.md:2307` says _Seven rows now: five refusals … and two that supply what a refusal set cannot_, and closes _Six mutations, six distinct rows red_. `tests/sortable/rect-index.declaration.test.ts` carries **eight** `it` rows — five refusals, the owner's write, the member-set equality, and _should hand the class's own buffers to the reader unchanged_ — and the six mutations redden **seven** distinct rows, because the `items` widening reddens two. The `00-index.md` table states that second point correctly (_2 — the length write and the element write_); the plan's summary sentence does not.

**Why it is a problem.** The eighth row is the one that falls out of both counts, and the consequence is that no entry records whether it discriminates. It does: declaring the class's `values` as `number[]` reddens it. That is worth recording rather than leaving to be rediscovered, because the row's justification is non-obvious — `implements RectIndexView` would catch the same widening, but the declaration project sets `ignoreSourceErrors: true`, so the row is what surfaces a source error the project is configured to swallow. Tier C: internal only, no instrument is unsound, and the guarantee is fully pinned.

**Evidence.** Eight `it(` blocks in the file at `:28`, `:38`, `:43`, `:51`, `:58`, `:63`, `:70`, `:83`. Mutation `values: number[] = []` on the class turns _should hand the class's own buffers to the reader unchanged_ and _should let the owner write all four through its own declarations_ red, 2 of 82.

**Required property.** The recorded row count matches the file, the recorded mutation tally matches the table above it, and every row in the instrument is either covered by the falsification table or has its non-vacuity stated some other way.

### s1-3 — F-318's denominator is off by one · Tier C

**Finding.** `00-index.md`'s F-318 and `plan.md:2311` both say _nothing else in 1281 rows can see the difference_. The suite at `a571576f` executes **1280** rows: 1340 total, 60 skipped, and 1279 passed + 1 flake in the main tree; 1274 passed + 6 artefact-dependent reds in the worktree. Both runs put the executed figure at 1280.

**Why it is a problem.** The sentence immediately before it reads **That number is the finding** — the numerator, _exactly two_, reproduces and is load-bearing, and the denominator is what gives it its force. Tier C: it changes nothing about the guarantee or the instrument, and a reader who recounts is out by one row, not misled about the property.

**Required property.** The suite figure is the one the tree produces, or is stated as an approximation rather than as an exact count.

## Null results

- **No C1–C5 work slipped in.** `src/` is unchanged across `c2a1d273..a571576f`, and no added line mints, amends, supersedes or renumbers a `D-*`.
- **No instrument in this pass is vacuous.** Every one of the eleven rows across the three files was reddened by at least one mutation of shipped source — the eight rect-index rows by the six recorded mutations plus the one this pass added, the three context rows by the four recorded mutations, and the two wrapper rows by the `async` rewrite.
- **The two new browser rows do not leak.** Both destroy their own controller, and no neighbouring row moved in either the baseline or the mutated whole-suite run.
- **Stale line citations in the two raised paragraphs are noted and not raised as a finding.** F-317's raised paragraph cites `kernel.ts:2593` for `arm`, which is at `:2620` at `a571576f`; F-318's cites `kernel.browser.test.ts:4100` for an assertion now at `:4162`. Both were accurate when written at `9bbd9942` and were not touched by this commit — the drift is `c4fa883c`'s. F-336's quality gate, _each citation resolves in the tree this entry is committed with_, is recorded there as **the entry's own** gate over F-324's census rather than as an index-wide rule, and `00-index.md` carries 98 distinct `<file>.ts:<line>` citations whose ages nothing checks. Whether a dated raised paragraph owes a resolving citation after a later commit moves the line is a record-policy question for the architect, not a defect of this pass.