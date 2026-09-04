# Stage 0 closure — feature proof

**Read at `c4fa883c`**, with `a92d46ba` and `813ccb7c` as the intermediate states and `d9db62ac` / `c81883d6` as the baselines the follow-up is measured against. Mutations were run in a throwaway worktree detached at `c4fa883c`, since removed; the tracked tree was not modified by this pass.

## Scope

Covered: the F-328 repair in `#handleErrorReported` and its two instruments; the F-329 message repair and the shape assertion that pins it; the re-taken F-324 census — its unit, candidate set, route enumeration, discharge totals and citations; and the closure of `s0-3`…`s0-7` as F-330, F-331, F-332, F-333 and F-334.

Not covered, deliberately: F-335, treated as intentionally open; F-323; Stage 1; the C1–C5 arcs; F-325 and F-326, which are D-177's and outside this stage.

## What holds

**The repaired route is load-bearing, and both of D-179's stated traps are caught.**

| Mutation of `kernel.ts` | Rows red | Which |
| --- | --- | --- |
| none (baseline, whole suite) | 0 | 66 files, 1267 passed, 60 skipped, no type errors |
| `if (!this.#queue.closed)` → `if (true)` | 1 | _should publish no terminal once a presentation disposer destroyed the controller on the error route_ |
| `if (!this.#queue.closed)` → `if (this.#joinLive())` | 15 behavioural | including the positive control _should publish the terminal from the error route, after the release_, and eight further terminal-publication rows across `kernel.browser` and `sortable.browser` |

Each mutation isolates the line: the negative row alone does not catch the `#joinLive()` substitution, and the pre-existing positive rows alone do not catch the missing guard. The repair reads only the latch, which is the one conjunct a consumer-reachable disposer can flip — the entry check at `:2459` establishes phase and identity, and `#queue.closed` is written in exactly one place, `destroy()`.

**F-329 is repaired and pinned by an instrument that discriminates.** `free-drag/spec.ts:441` carries `'drag: constraint/invalidate-failed'` again. Restoring the corrupted literal turns _should name every fault in prose rather than in source syntax_ red and names the site in its diff. The claim that `12311981` touched eight source files is correct, and the walk covers all of `src/` rather than those eight, so the shape survives files the rename never reached.

**The census's arithmetic reconciles, which `s0-3` said the previous take's did not.** The `Routes` column sums to **51**, matching the stated total. Tallying the `Discharge` column row by row gives 17 / 18 / 10 / 2 / 2, matching all five stated class totals exactly, with the two construction unwinds accounted for outside the classes and `#panic`'s `onError` accounted for as the sub-route of a class-3 route. This is the first take in the arc whose stated figures can be recomputed from its own table.

**The candidate set is enumerated completely.** Every `#slots.<member>` invocation in `sortable/spec.ts` and `free-drag/spec.ts` appears in the table — 23 statements, including the two `retireHooks` walks — together with the indirect invocations through `placement.ts`, `rect-index.ts`, `linear-shift.ts`, `xy.ts` and `#deriveMotion`. `report` and `onError`, the two members `s0-5` found missing, are both present.

**The route counts are right where the census claims an indirection covers several routes.** `#resolveItem` has exactly two callers (`:590`, `:688`); `#invalidateInSeam` exactly five (`:949`, `:1290`, `:1309`, `:1331`, `:1394`), which with the scroll/resize listener at `:915` gives `invalidateInsertion` its six; `#deriveMotion` exactly four; `#deliver` two; `#startTail` one, which is what makes `landingTiming` one route per behavior; and `spec.finalized` has exactly two call sites, which is the claim the whole re-take turns on.

**Every citation in the table into `sortable/`, `free-drag/`, `placement.ts`, `layout-animation.ts` and the tests resolves in the tree the entry ships in**, including the six that `s0-4` found short by eleven, which now land on the statements they name.

**The remaining record findings are closed as claimed.** I-36's three amendments are all dated `2026-09-04` and sit in commit order, D-176 → D-178 → D-179, with the members list consistent across them (`s0-6`). No `2026-09-08` survives outside three quotations in the feature-proof record and one in F-335's own text, matching the entry's account (`s0-7` for the date sweep). No live test name and no line of `src/` calls the kernel a host. The panic docblock no longer counts the exception's members and states why its own site qualifies, which is F-327's required property.

## Findings

### s0c-1 — The re-taken census's kernel citations name lines the same commit moved · Tier B

**Finding.** F-324's third take cites `kernel.ts:1860` and `:2473` as the two routes into `onEnd`, and `:1855` as the join route's discharge. In `c4fa883c` — the tree the entry is committed with — the join's `finalized` is at **`:1863`**, its `#joinLive()` at **`:1858`**, and the reporting route's `finalized` at **`:2498`**. `:1860` is a closing brace, `:1855` a comment line, and `:2473` a line of the comment the repair itself added. The same three numbers appear in D-179 (`00-index.md:1719`) and in F-328's statement paragraph, which adds `:2467` for the unwind that is at `:2469`.

**Why it is a problem.** This is the class of defect the entry is closing. F-331 is _six of the census's citations name lines the same commit moved_, and `c4fa883c` moved these four by the same mechanism: its own docblock edit at `kernel.ts:810` added three net lines, shifting everything below. The census carried `kernel.ts:1739` across correctly (`1736` → `1739`), so the convention is current-tree lines and the omission is not a stated exception. The entry then makes the claim explicitly: _each citation resolves in the tree this entry is committed with_. That sentence is the census's own quality gate, and it is false of the four citations that point at the repair this stage exists for. A reader following `:2473` to see what F-328 fixed lands inside the comment rather than on the call.

**Evidence.** `sed -n '1855p;1858p;1860p;1863p;2467p;2469p;2473p;2498p' src/kernel/kernel.ts` at `c4fa883c`; `git show a92d46ba:…/kernel.ts | grep -n` gives `1855` / `1860` / `2466` / `2473` for the same four statements before the repair, so `:2467` was already off by one when D-179 was written.

**Required property.** A citation in a live record entry resolves, in the tree the entry is committed with, to the statement it names — including the citations the entry's own commit moved. Where an entry deliberately preserves a pre-repair reading, the text says which tree it describes.

### s0c-2 — The retirement half of D-179's required property is asserted but not instrumented · Tier B

**Finding.** D-179 names two properties the repair must hold, the second being that skipping the terminal must not skip `#retireOperation(identity)`. `COVERAGE.md` books that half to the new negative row — _…and the retirement still runs_ — and the row asserts it as `expect(harness.calls).toContain('retire')`. The assertion cannot fail: moving `this.#retireOperation(identity)` from `kernel.ts:2507` to inside the `!this.#queue.closed` guard leaves the whole of `kernel.browser.test.ts` green, 172 passed.

**Why it is a problem.** The row is the only instrument cited for the property, and a `COVERAGE.md` row that names a property its test does not discriminate is an unsound instrument in the sense this repository's own tier scale gives the word — the next reader who moves that statement gets a green suite and a record saying it is pinned. The cause is structural rather than a weak assertion: `#queue.closed` is written only by `destroy()`, so the guarded branch is reachable only when physical teardown is already owed, and that teardown calls `spec.retire` itself. Instrumenting the calls on this route gives `admit | settlement.prepare | settlement.effect | presentation.released | retire | retire` at `c4fa883c` and the same list minus one `retire` under the mutation — the assertion reads the destroy path's call, not the one at `:2507`. (`BehaviorSpec.retire` is documented _idempotent, best-effort_, so the doubled call is contract-conformant and is not itself a finding; it is why the row cannot discriminate.)

**Evidence.** Mutation in an isolated worktree at `c4fa883c`, moving `:2507` inside the guard: `tests/kernel/kernel.browser.test.ts` 172 passed. The eight other rows that turn red under it — two doc-block rows, one repository-path row and five size-budget rows — are collateral from the moved comment and the changed byte count, not the property. Replacing the third assertion with `expect(harness.calls.join('|')).toBe('PROBE')` prints the two lists above.

**Required property.** The property `COVERAGE.md` books to a row is one that row's failure discriminates: a tree violating it turns that row, and not only an unrelated row, red.

### s0c-3 — The recorded falsification count for the `#joinLive()` substitution does not reproduce · Tier C

**Finding.** F-328 and the plan entry both state that substituting `#joinLive()` for the latch _turns three rows red_. Run over the package suite the substitution turns **15** behavioural rows red across `tests/kernel/kernel.browser.test.ts` and `tests/sortable/sortable.browser.test.ts`, plus eight collateral rows from the changed byte count.

**Why it is a problem.** The number is offered as the measurement backing _the obvious wrong repair is caught by the instrument that already existed_, and the conclusion holds a fortiori — this is a recorded figure that does not reproduce, not a claim that is wrong in substance. Tier C: nothing outside the record depends on it, and no consumer observation turns on it.

**Evidence.** `npx vitest run -c vitest.config.ts --typecheck.enabled=false` at `c4fa883c` with `kernel.ts:2492` substituted: 26 failed, of which 3 fail at the unmutated worktree baseline (runtime-module rows needing a build) and 8 are byte-count collateral.

**Required property.** A count recorded as a falsification result is the count the stated command produces, or the record says what it was measured over.

## Null results

- The census's classification of the scroll/resize listener at `sortable/spec.ts:915` into class 2 was attacked again and survives: `#invalidate` installs a native listener, which is a separate task and cannot fire inside D-36's synchronous deferral window.
- The class-1 discharge of `invalidateInsertion` at `:949` through the reading at `:906` survives: the stretch between them installs disposers and assembles the presentation record, and reaches no consumer-reachable step.
- No further route into `spec.finalized` exists; no `#slots` member invocation in either behavior is absent from the table.
- The `!this.#queue.closed` read was checked against D-38's requirement that `Kernel.closed` be the sole logical-liveness latch: `get closed()` returns that field, so the bare read and the published latch are the same value.
- No regression was found in the seven mechanical repairs re-checked at this tip (F-313, F-314, F-315, F-319, F-320, F-321, F-322).