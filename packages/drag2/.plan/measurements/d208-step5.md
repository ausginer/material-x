# D-208 step 5 — the comment pass

> **Implemented 2026-11-03, not yet accepted.** Acceptance belongs to the independent step-5 feature review. This unit stops for it before step 6.

**Canonical entry: `drag2:D-208`**, step 5 as [`request-application-claude.md`](../reviews/architecture/request-application-claude.md) §19.5 states it. This record holds step 5's results and verification. It is **not** the decision's measurement record. `d208-requests.md` is written at step 6, and its absence is still the witness.

**Input.** `4987d33dd` on `drag2/fin-review2`. Its `src/` equals `dbbb62199`'s, which is step 4 as accepted.

**The series**, in order:

1. `ae21d8d1c`: the record corrections (§Corrections), as step 5's first commit;
2. `e46e11493`: R34, touching only `tests/` (§R34);
3. the comment pass, the contract amendments, the README bullet and this record.

## What landed

| Change | Where |
| --- | --- |
| The bounded source-comment pass, under §19.5's rules | 28 of the 31 library modules that differ between `6905af249` and `dbbb62199`. `free-drag/assemble.ts`, `sortable/behavior.ts` and `sortable/slots.ts` were read and needed nothing. The two stories are excluded |
| The four known stale comments (§19.5) | `moveTo`'s JSDoc (`free-drag/controller.ts`): the coordinates are read on the call and a throwing read is reported when the move is applied, still `FAILURE_ACTION_PREPARE`. `reportError`'s SPI docblock (`kernel/spec.ts`): no guard belongs there, because the kernel calls it only through a channel and once from a panic behind its own discard, and behaviors reach `onError` through channels they mint. `BehaviorContext.channel` (`kernel/spec.ts`): it exposes no lifecycle value, and gains §19.2's sentence on indirect observation. `README.md`: the bullet names both exceptions, relinquishment and the panic's report |
| step4-A's contract passages and its census | 01, 02, 03, 05 and 07 (§Contract amendments, §Census) |
| step4-C's sentences | 05, I-36's operative restatement; 01 §`BehaviorContext`, the `channel` entry |

**Published declarations change in doc comments only.** The JSDoc of `BehaviorContext.channel`, `BehaviorSpec.reportError` and `FreeDragController.moveTo`, and the doc-comment edits the pass made on other published declarations, reach the built `.d.ts`. No type, member or signature changes.

## Corrections

All three are record-only and land as step 5's first commit (§19.4, step4-B).

- **step4-B, step3-B's record half.** `d207-step3.md` §Guard-site census, the lifecycle-request row, gets a dated correction:
  - the `dispatch` lifecycle read is moved from the armed controller's intake to the façade's. At `ef1e4ef6b` it is `Kernel.dispatch`, which reads `this.#bracket.closed`;
  - `#onPointerDown` is added under _the runner_. It reads `this.#bracket.idle` before an ingress pass.

  The row's other sites are unchanged. step3-B's instrument half was repaired in step 4 (`d208-step4.md` §R21 and step3-B).

- **`d208-step4.md` §Verification**, the lint bullet, gets a dated correction. The baseline had fifteen eslint errors in the changed files, not fourteen. The fifteenth was `prefer-includes` in `g3-conformance.browser`; step 4's rewritten assertion there calls `.includes`. The count is the feature proof's.
- **`d208-step4.md` §Published-surface change**, the `InsertionRuntimeView` row, gets a dated correction. `sortable/runtime.d.ts` is not emitted, and the type is declared in `sortable/slots.d.ts`. The built tree has no `sortable/runtime.d.ts`.

## Runtime invariance

**Each file is hashed with comments and blank lines stripped**, by the TypeScript printer with `removeComments`, so formatting inside comments cannot move a hash. The instrument was checked both ways before use. Two comment-only files from step 4 (`sortable/domain.ts`, `kernel/lifetimes.ts`) hash equal across `6905af249` and `dbbb62199`. `sortable/runtime.ts`, whose `live` member step 4 removed, does not. _Before_ is `dbbb62199`, equal to the input's `src/`; _after_ is the committed tree.

| File | Before | After |  |
| --- | --- | --- | --- |
| `src/free-drag/assemble.ts` | `7f3656ecf25f38a1` | `7f3656ecf25f38a1` | equal |
| `src/free-drag/behavior.ts` | `8afb24489e42725e` | `8afb24489e42725e` | equal |
| `src/free-drag/bounds.ts` | `7a8db7b7c3ae266a` | `7a8db7b7c3ae266a` | equal |
| `src/free-drag/controller.ts` | `a0fa333df960ed8d` | `a0fa333df960ed8d` | equal |
| `src/free-drag/domain.ts` | `8b6b8eedaeda9225` | `8b6b8eedaeda9225` | equal |
| `src/free-drag/runtime.ts` | `a97fea9cb80baee8` | `a97fea9cb80baee8` | equal |
| `src/free-drag/spec.ts` | `98a6decef9601116` | `98a6decef9601116` | equal |
| `src/kernel.ts` | `34fddce5a6771ff4` | `34fddce5a6771ff4` | equal |
| `src/kernel/actions.ts` | `93a7cd9d9c9b2f43` | `93a7cd9d9c9b2f43` | equal |
| `src/kernel/execution.ts` | `b639bb08cc7daaba` | `b639bb08cc7daaba` | equal |
| `src/kernel/kernel.ts` | `c7ac051d82c032eb` | `c7ac051d82c032eb` | equal |
| `src/kernel/lifetimes.ts` | `87d3f7a63d60ae04` | `87d3f7a63d60ae04` | equal |
| `src/kernel/seams.ts` | `f970feb0eabe464f` | `f970feb0eabe464f` | equal |
| `src/kernel/spec.ts` | `7b2d928e359c265f` | `7b2d928e359c265f` | equal |
| `src/kernel/unwind.ts` | `f9d1d4313435cdf4` | `f9d1d4313435cdf4` | equal |
| `src/shared/composition.ts` | `98ff0887a2e0b58d` | `98ff0887a2e0b58d` | equal |
| `src/sortable.ts` | `6140555aeea706ac` | `6140555aeea706ac` | equal |
| `src/sortable/assemble.ts` | `1c9b70d606a1face` | `1c9b70d606a1face` | equal |
| `src/sortable/behavior.ts` | `88c9b2577d3233fa` | `88c9b2577d3233fa` | equal |
| `src/sortable/controller.ts` | `bae4bd2414167f18` | `bae4bd2414167f18` | equal |
| `src/sortable/domain.ts` | `5f9c2fcb737d5050` | `5f9c2fcb737d5050` | equal |
| `src/sortable/feature.ts` | `81a5801672ae8c48` | `81a5801672ae8c48` | equal |
| `src/sortable/layout-animation.ts` | `ffcbc364ee5ad92b` | `ffcbc364ee5ad92b` | equal |
| `src/sortable/linear-shift.ts` | `6c708b5a842cda3f` | `6c708b5a842cda3f` | equal |
| `src/sortable/placement.ts` | `7866a7d3bf08f145` | `7866a7d3bf08f145` | equal |
| `src/sortable/rect-index.ts` | `382d216f72b75db3` | `382d216f72b75db3` | equal |
| `src/sortable/runtime.ts` | `fbbf8c672fbf899c` | `fbbf8c672fbf899c` | equal |
| `src/sortable/slots.ts` | `9ce4874e7b830eac` | `9ce4874e7b830eac` | equal |
| `src/sortable/spec.ts` | `c85141d514950e35` | `c85141d514950e35` | equal |
| `src/sortable/xy.ts` | `031a47c195dba902` | `031a47c195dba902` | equal |
| `src/sortable/y.ts` | `01d31fe8845a4d6d` | `01d31fe8845a4d6d` | equal |

**All 31 are equal.** `git diff -U0` over `src/` also shows no changed line that is not a comment line, and no lint directive was touched.

## Composition — the control row

Every row was expected byte-equal to step 4's, because the build strips comments (CONTRIBUTING §18). **All 15 rows are byte-identical**, minified, Brotli and module count. Both trees were built with `just build` and measured with `measureAll()` in the shared checkout: the tip, then `dbbb62199`'s `src/` restored over it. The figures also equal step 4's tip measurement byte for byte. Budgets are unchanged, and the four rows step 4 left over budget stay over by the same bytes (`request-application-claude.md` §19.3). Their disposition is the owner's.

| Row                                           | Minified | Brotli | Modules |
| --------------------------------------------- | -------: | -----: | ------: |
| minimal                                       |   33,345 | 10,218 |      33 |
| minimal (xy)                                  |   32,702 | 10,099 |      32 |
| minimal + layoutAnimation                     |   34,261 | 10,543 |      34 |
| xy + layoutAnimation                          |   33,618 | 10,417 |      33 |
| minimal + landing                             |   33,738 | 10,366 |      35 |
| complete                                      |   34,654 | 10,692 |      36 |
| free drag minimal                             |   26,980 |  8,262 |      27 |
| free drag + bounds                            |   27,624 |  8,495 |      28 |
| free drag + landing                           |   27,373 |  8,437 |      29 |
| free drag complete                            |   28,017 |  8,628 |      30 |
| both behaviors                                |   42,193 | 12,198 |      47 |
| vocabulary root - drag.js                     |      252 |    142 |       2 |
| kernel root - kernel.js                       |   19,954 |  6,320 |      16 |
| baseline A - feature-matched, non-composed    |   33,945 | 10,507 |      31 |
| baseline B - shipped @ydinjs/drag sortable.js |   22,618 |  6,916 |      26 |

## R34

`e46e11493` adds two rows to `tests/free-drag/free-drag.browser.test.ts` and their `tests/COVERAGE.md` section. It touches nothing else. Both rows drive the running controller with no harness flag.

| Row | At the tip | Over `0c798ee17`'s `src/` |
| --- | --- | --- |
| **(a)** _should keep the resolved bounds when the source rect is mutated_. `bounds(thunk)` returns one `DOMRect` of 300 × 300, which `onMove` widens to 10,000 with no invalidation; the visual is clamped at `[200, 0]` | passes | **fails**: `[9900, 0]`, the widened rect |
| **(b)** _should start the tail with the timing the policy returned_. A landing policy returns `{ duration: 500, easing: 'linear' }`, and a getter on the element's `animate` rewrites it to `1` and `'ease-in'` | passes | **fails**: the tail starts with `duration: 1`, `easing: 'ease-in'` |

**The baseline run.** `0c798ee17`'s `src/` was restored into the shared checkout over the R34 tree. The renames were mapped back mechanically in the test file and `tests/support/free-drag.ts`, `requestDestroy` to `destroy` and `requestCancel` to `cancel`. Both rows were run, and both files were restored from copies. Each row fails on its stated assertion. It was taken again after (b)'s `animate` became a bound method for `unbound-method`, with the same result.

**Mutation NB**, `bounds()` without its copy: `resolve` keeps the source's rect rather than copying it into the feature-owned record. Applied alone, by an exact-text patch to `src/free-drag/bounds.ts`, and run against the whole suite, every project. The file was restored from a copy and compared byte for byte. **NB reddens 1 row, R34 (a).** The count excludes the 14 rows red at the unmutated tree, and no `size.node` row changed state. The unmutated run and NB were taken on the R34 tree before (b)'s bound-method edit, which changes no behavior that (a) reaches.

## Contract amendments

None is a new requirement, so the contract's normative content does not change. Each is dated 2026-11-03 and names D-208 step 4, or `request-application-claude.md` §19.2. History is kept and nothing is deleted.

| Passage | Disposition |
| --- | --- |
| **05 §Test matrix**, _Terminal barrier in a resolver sequence (C2-01)_, _Terminal barrier on indirect consumer calls (C4-01)_ and the paragraph introducing them | marked withdrawn as requirements and kept as history. D2's call exactness survives, carried by `y.browser`'s _should resolve each candidate visual once per rebuild_ |
| **05 §The terminal barrier stopped at the seam boundary (F-47)** | a section note: the floor is withdrawn, the section is history, and the barrier table stays as the record of the search |
| **05, I-36's _Mechanism_ paragraph** | a note before it: (a)'s mechanism is the restatement's, meaning the runner's order and the channel refusal. The paragraph's behavior-owned (a) and its F-47 floor are withdrawn |
| **05, I-36's operative restatement** | qualified as §19.2 states: no member reads or returns the lifecycle, and applied destruction stays indirectly observable through any refusing intake. The observation is constant within a unit and cannot reveal a request, and R21 detects direct reads only |
| **02 §The phase is handed over** | _`BehaviorContext.closed` answers liveness (D-53)_ is marked withdrawn |
| **01**, _D-203 withdraws it at its step 4_ | put in the past tense, as landed by D-208 step 4. The sentence's own _`closed` reads `false`_ is restated as _the unit completes as a live controller's_ |
| **01**, _Seven mutable fields — six, plus `closed`_ | marked: the count describes the field list as it stood, and its `closed` half and floor reading are withdrawn |
| **01 §`BehaviorContext`**, the `channel` entry | gains §19.2's sentence, the same as the source JSDoc |
| _found by the census:_ **05, I-6**, the participant clause, the tier line's tier-C participant obligation and clause 3's participant half | marked: the participant clause is withdrawn, and I-36's restatement holds (a) on every route |
| _found by the census:_ **05 §Test matrix**, _Logical versus physical liveness (D-38, I-37)_ | marked: the clauses on the sanctioned member, its readonly pin and a behavior's mirror are withdrawn; I-37 is unchanged |
| _found by the census:_ **01 §The behavior instance**, _since the terminal latch moved onto it_ | marked: the latch is not on `host` |
| _found by the census:_ **02**, the two passages stating that D-53 adds the logical-liveness member (§Feasibility is not the whole question; §What the deletion vacates) | marked: the member is removed in its turn |
| _found by the census:_ **03 `placeholder()`**, _`placeholder.ts` guards its `classList.add` … with a `live()` reading_ | marked: `live()` is removed and the table below is history |
| _found by the census:_ **07 §Action phase legality**, _`invalidate()` and `moveTo()` keep their `host.closed` guard_ | marked withdrawn: each dispatches, and the kernel's `dispatch` refuses after applied destruction |
| _found by the census:_ **07 §The terminal-barrier enumeration** | a section note: every _Latch read_ cell and the closing rule are withdrawn; the table stays as the record |

The F-47 register entry in `00-index.md` is the architect's, and `4987d33dd` already carries its dated note.

## Census (step4-A)

**Every hit** for `closed`, `live` (as a word prefix: `live`, `lives`, `liveness`, `live()`), `latch`, `terminal barrier` and `participant` in 01, 02, 03, 05, 06 and 07, case-insensitively, by line, at `4987d33dd`: **269 lines**. The search is `\bclosed|\blive\w*|latch\w*|terminal barrier|participant\w*`. `deliver` and its relatives are excluded by the word boundary. A line with several hits takes the class its lifecycle hit needs. A passage covered by a section or paragraph note is classed by that note.

- **K: the kernel's lifecycle, or a kernel-private latch, still current**: the runner, request intake, unit entries, the channel's refusal, the cancel request (I-21), the failure latch, `inSeam`, the re-entry latch, and _a live controller_ as the LIVE state. 65 lines.
- **H: history, already marked**: struck, dated, or inside a passage whose own note marks it as history. 66 lines.
- **A: amended in step 5** (§Contract amendments). 43 lines. The notes added here are new hits of this class.
- **N: not a lifecycle reference**: another sense of the word, such as _a closed union_, _the closed world_, _where the cache lives_, _live policy_, _a live drag_ in a probe, or _participant_ as the tier vocabulary's party. 91 lines. **This is a fourth class the disposition does not name.** It is stated here and not escalated, because none of these hits mentions the lifecycle and so none could be current, history or amended with respect to it. A reviewer who reads the census otherwise should treat it as an escalation.
- **E: escalated**, §Escalations. 4 lines.

| Document | Class | Lines (at `4987d33dd`) |
| --- | --- | --- |
| 01 | K | 15, 16, 176, 217, 226, 227, 354, 358, 421, 425, 431, 432, 440, 474, 508, 510 |
| 01 | H | 136, 236, 246, 365, 429, 488, 490, 492, 494, 496, 507 |
| 01 | A | 288, 322, 486 |
| 01 | N | 101, 185, 348, 380, 382 |
| 02 | K | 87, 98, 337, 444, 449, 488, 865, 880, 1223, 1350, 1360, 1461, 1495, 1522, 1739, 1838, 1844, 1848, 1850, 1862, 1890 |
| 02 | H | 80, 161, 173, 187, 1254, 1279, 1377, 1379, 1381, 1393, 1394, 1622, 1690, 1859, 1864 |
| 02 | A | 590, 784, 1325 |
| 02 | N | 156, 524, 532, 557, 721, 727, 788, 1008, 1010, 1019, 1025, 1029, 1031, 1041, 1049, 1143, 1149, 1226, 1434, 1524, 1552, 1759, 1760, 1878, 1894, 1933, 1935, 1949 |
| 02 | E | 1846 |
| 03 | K | 727, 1144 |
| 03 | H | 262, 609, 613, 716, 718, 720, 957, 1175 |
| 03 | A | 885, 889 |
| 03 | N | 5, 7, 9, 67, 175, 458, 519, 645, 689, 729, 748, 905, 929, 1018, 1090, 1169, 1284, 1336, 1346, 1396, 1427 |
| 05 | K | 137, 141, 244, 250, 252, 254, 316, 579, 595, 647, 822, 838, 1008, 1014, 1018, 1040, 1050 |
| 05 | H | 57, 201, 205, 229, 231, 233, 235, 237, 256, 266, 507, 557, 603, 770, 774, 778, 852, 862, 886, 996, 1010, 1056, 1070 |
| 05 | A | 47, 49, 51, 239, 248, 723, 727, 729, 735, 747, 750, 751, 753, 758, 762, 764, 766, 1026, 1028, 1030, 1032, 1034, 1036 |
| 05 | N | 10, 11, 15, 83, 129, 302, 501, 663, 792, 842, 844, 874, 880, 934, 956, 1048, 1072 |
| 06 | K | 34, 117, 526, 822, 832 |
| 06 | H | 334, 522, 558, 560, 649, 787, 791, 834 |
| 06 | N | 328, 683, 742, 766, 819 |
| 06 | E | 162, 779, 789 |
| 07 | K | 156, 244, 654, 684 |
| 07 | H | 680 |
| 07 | A | 526, 556, 557, 559, 560, 562, 563, 564, 565, 572, 574, 576 |
| 07 | N | 5, 40, 85, 212, 349, 363, 404, 421, 427, 511, 515, 589, 726, 727, 747 |

**Old member names are not a census class.** The contract still names `destroy()` and `host.cancel` throughout, for example in I-6's heading and in 02 and 03's _`host.cancel` latches synchronously_. Those hits are classed by the lifecycle fact they state, which is current, and not by the name. Renaming them is outside step4-A's property.

## Escalations

Each is reported and left unchanged, under §19.5's escalation rules. None blocks step 5, and none was decided here.

**Contract hits that cannot be classified without a decision.** Each states the kernel's lifecycle as it stood before D-203 or D-207 and is not marked. Each is outside step4-A's three items: a participant barrier, `live()` or a latch predicate, and `BehaviorContext.closed`.

- **02 §Queue semantics** (line 1846): _`destroy()` is exempt and unchanged: it is not queued, so it stays the synchronous terminal barrier I-6 requires_. Under D-203 destruction is a request applied at a unit boundary.
- **06 §Admission** (line 162): _`[K] recheck !closed && operation === null ← POST-CALLBACK CHECK`_. D-207 step 3 deleted the admission's post-callback recheck.
- **06 §Retirement** (line 779): _Inside the deferral window the controller is closed and still holds elements_. That is D-36's deferral; under D-203 application closes and tears down in one step.
- **06 §Counterfactuals** (line 789): _`onReorder` calls `destroy()`_: _the controller is closed from that statement onward; physical teardown runs at the boundary_. The same D-36 shape.

**Source comments that state a property the code does not hold.** These were found by the pass and left unchanged. The first three are in `sortable/spec.ts`; the line numbers are at the tip.

1. **`sortable/spec.ts` `admitCommand`**, `return null; // a consumer resolver destroyed the controller`. `#seedDraft` has no path that returns `null`: it always returns the item or the triple. The comment is false and the guard is unreachable. Removing the guard is a code change, so it is out of step 5's scope.
2. **`sortable/spec.ts`, the admitted gap at `onStart`**: _a cancellation latched from the placeholder's `connectedCallback` … outranks this classified failure_, and _rather than closed with a per-operation "started" flag_. A cancel is registered rather than latched, though supersession still holds. And `#operation.progress` with `STARTED` now exists, unused on that arm. Whether to reword this or close the gap is a decision.
3. **`sortable/spec.ts`, the collection preparation**: _a reentrant cancel or destroy must not be able to invalidate a preparation whose private runtime has already been replaced_. Under requests that mechanism does not exist, and the reason that stands is the next sentence's: a discarded preparation must not publish.
4. **`kernel/kernel.ts`, `Kernel.channel`'s docblock**, item 1: _a resolver that destroys and then throws would otherwise have its own destruction reported back to it … after application_. A resolver runs inside `OPEN_RESOLUTION`'s unit, so its request is only registered and the diagnostic is delivered before application. A late rejection after application finds the attempt slot cleared and reports nothing. The invariant stated around the example holds.
5. **The channel counted as one.** `kernel/seams.ts` `#notify`, _the controller's one channel_; `kernel/kernel.ts`, _the one channel_; `free-drag/spec.ts` `#deliver`, _the one place this behavior invokes the consumer's error callback_. The composition channel in `free-drag/behavior.ts` calls `merged.onError` itself, and five channels are minted.
6. **Both controllers' `requestDestroy` JSDoc** (published): _from application on nothing is admitted and no declared consumer slot is invoked_. It names neither I-36 exception. §19.5 directed the README bullet's fix, which landed, and not these.
7. **`free-drag/spec.ts`, `// 4 — last, because it may reentrantly cancel or destroy`** before `onStart`. A request from `onStart` is applied at the unit's boundary, so the stated reason may no longer be what forces the order. The sortable's twin had its verbs updated by the pass (_may request cancellation or destruction_), and the same question applies to it.
8. **`kernel/spec.ts` `BehaviorContext`'s header**: _`dispatch` is the one member in that position_. `fail`'s entry also writes a construction-window limitation, since the demotion is silent until arming.
9. **`free-drag/assemble.ts`, the `axis` slot**: _a source is read at activation and on `invalidate()`_. `axis` is a plain value stored once. The controller's `invalidate` JSDoc says it is not re-read.
10. **`sortable/layout-animation.ts`**: _One walk, and it stops at the first miss_. The loop returns early only on an empty set, and otherwise walks every slot.
11. **`sortable/rect-index.ts`**: _`y()` reads two once per resolution_. `y.ts`'s `resolve` reads three.
12. **`sortable/y.ts`**: the hooks are wrapped because they are _called with no owner_. That holds for `retire`. `invalidate` is called as `this.#slots.invalidateInsertion()`, so the wrap is needed and the stated reason is imprecise.
13. **`kernel/kernel.ts`, the `Kernel` class doc, and `kernel/spec.ts`**: _no input can be admitted before `install()` returns_. No `install()` exists; the phrase is the contract's, from probe 1.
14. **`kernel/seams.ts`**: _the queue is run-to-completion_ and _the queue's panic path_. Both live in `ExecutionBracket`, and `ActionQueue` decides nothing. This may be loose usage.

**Passages kept that might belong in the record.** `sortable/spec.ts`'s per-controller frame task cites measured bytes: _Eager costs 148 B more … (281 B against 309 B)_. An edit can falsify those figures, but moving them needs the record to hold them first, and this pass did not establish that. The passage is kept.

## Method

The pass was read in five disjoint slices by delegated readers, each under one written brief carrying §19.5's rules, the keep-list of local ordering proofs and the escalation rules. The implementer then checked every slice:

- read the diff of every changed file;
- verified each meaning-changing rewrite against the code: `sortable/assemble.ts`'s hook order, `linear-shift.ts`'s pointers to `RectIndex.remeasureHole` and `verifyEquivalence`, `seams.ts`'s pointer to `#reentry`, and `kernel.ts`'s frame-slice field list;
- corrected two rewrites: the panic delivery is _after closure_, not _after application_, in both `spec.ts` files;
- rewrapped the over-long lines;
- confirmed escalation 1 against `#seedDraft`.

**Deletions that carried reasoning, and where the record holds it**:

- `kernel.ts`'s _the only type that needs the treatment_: D-152, with 02 §Every classification entrypoint latches;
- `sortable/feature.ts`'s note on the composition check's four helpers: D-151 and the phase-23 composition-check review.

The other deletions are history, counts, or repeats of a member's own docblock.

## Verification

- **Tests:** `vitest run`, every project, on the final tree. 1,377 pass and 14 fail, and the same two browser files do not load (`react.browser`, `stories.browser`). The 14 are step 4's failing set: the input's ten (six `size.node` controls and four `docs.node` rows) and the four budget rows. The extra two passes over step 4's 1,375 are R34. The failing set is identical to the R34 commit's run.
- **Lint**, over every changed file, after `fmt`, `lint-fix`, `fmt`: seven eslint errors remain, in `free-drag/spec.ts`, `kernel/seams.ts`, `sortable/assemble.ts` and `sortable/spec.ts`. The same rules are reported on those four files at `HEAD`, taken by restoring them over the tree and restoring the edits afterwards (hashes re-checked). Markdown is reported as ignored. R34's file is clean.
- **Typecheck:** the two `.scripts/vitest-*.ts` errors only, as at the input.
- `git diff --check`: clean.

## Limits

- Chromium only.
- The census is a word search, classified by reading each hit's line in context. A passage that states a withdrawn barrier without any of the five terms escapes it.
- The comment pass's reading was delegated in slices. The implementer read every diff and the context of every rewrite whose meaning changed, but not every unchanged comment in the 31 files.
- No runtime was measured. Step 5 changes no runtime statement, by the hashes.

## Unresolved obligations

- **The four budget overruns** stay the owner's, before `d208-requests.md` is written (§19.3).
- **The escalations above** go to the architect. None was decided here.
- **step4-D's remainder** and **R21's mint-site report** are step 6's record.
- **step3-B**'s record half is corrected (§Corrections). Its closure is the acceptance's to mark.
- **D-208 stays `Unimplemented (Remediation)`.** `d208-requests.md` is not created, and the witness holds.
- **Reviewer-E** is untouched and stays the owner's.

**Next:** the independent step-5 feature review. Step 6 does not start before it.

## Remediation 5R — 2026-11-03

> **Implemented 2026-11-03, not yet accepted.** Acceptance belongs to the architect, after the bounded independent recheck [`request-application-claude.md`](../reviews/architecture/request-application-claude.md) §20.4 requires. Step 6 does not start before it.

**Governing record:** [`request-application-claude.md`](../reviews/architecture/request-application-claude.md) §20.3 and §20.4. **Input:** `15a7fa53d` on `drag2/fin-review2`. Sites below are cited at `0ba8afb64`, whose `src/` and contract equal the input's.

**The series**, in order:

1. `e324ca8fa`: items 1–5. Comments, published doc comments and contract text only;
2. `39e243887`: item 6, `src/sortable/spec.ts` only;
3. `c595e96e3`: a comment-only correction to two item-1/3 sites in `src/sortable/spec.ts` (§Deviations, 1);
4. this section.

No test changed. `kernel/errors.ts` is outside the 31 modules step 5 covered and is hashed here because item 1 touched it.

### Item 1 — source comments

| Site | Before | After |
| --- | --- | --- |
| **step5-A**, `sortable/spec.ts`, the `stale` docblock | _every exit in between — a placeholder reaction or a hook that threw_ | names the exits that exist: `movePlaceholder`'s throw (`drag: sortable/anchor-outside-container`, or a DOM exception) and the `return` after a caught `movedInsertion` throw. A custom element's reaction that throws is reported to the global object and does not leave the bracket |
| **#3**, `sortable/spec.ts`, the collection publication | _a reentrant cancel or destroy must not be able to invalidate a preparation whose private runtime has already been replaced_ | _a preparation that is discarded must not publish_ |
| **#4**, `kernel/kernel.ts`, `Kernel.channel` item 1 | a resolver that destroys and then throws, reported back after application | a channel outlives the unit that minted it: a composition's `report`, captured by an installer and called after application (R33 (d)). The invariant around it is unchanged |
| **#5**, `free-drag/spec.ts` and `sortable/spec.ts` `#deliver` | _the one place this behavior invokes the consumer's error callback_ | _where the spec invokes it_; the composition's channel, minted in `behavior.ts`, calls `merged.onError` itself |
| **#5**, both specs' `#notify` | _the behavior's own route to the one channel_; free drag's _two entries to one channel rather than two channels_ | _the behavior's own channel_; free drag's _two channels over one sink rather than two sinks_ |
| **#5**, `kernel/seams.ts` `#notify`; `kernel/kernel.ts` section label; `kernel/errors.ts` `Notify` | _the controller's one channel_; `the one channel`; _The one channel, as seen by…_ | _the controller's channel, the one the façade mints over the spec's `reportError`_; `the controller's channel`; _A channel, as seen by…_ |
| **#7**, `free-drag/spec.ts` and `sortable/spec.ts`, before `onStart` | _last, because it may reentrantly cancel or destroy_; _may request cancellation or destruction_ | the reason that holds: everything the activation owns is in place before `onStart`, so a throw from it, classified as the seam's failure, leaves no step of the effect undone, and the consumer hears of the drag only once it exists. A request from `onStart` is applied after the unit and does not bear on the order. This agrees with 02's _post-commit_ and 07:113 |
| **#8**, `kernel/spec.ts`, `BehaviorContext`'s header (published) | _`dispatch` is the one member in that position_ | `dispatch`'s tag is unchecked there, and `fail`'s demotion is silent until arming |
| **#9**, `free-drag/assemble.ts`, `axis` | _a source is read at activation and on `invalidate()`_ | a plain value, fixed for the controller's life and never re-read, `invalidate()` included |
| **#10**, `sortable/layout-animation.ts` | _One walk, and it stops at the first miss_ | an empty map returns at once; otherwise the walk visits every slot |
| **#11**, `sortable/rect-index.ts` | _`y()` reads two once per resolution_ | the reads named for the tree: each axis rule reads `values`, `count` and `hole` once per resolution and `items` only on a frame proposing a gap change. Both `resolve` bodies were read |
| **#12**, `sortable/y.ts`, the hook wrap | both hooks _called with no owner_ | `retire` is called from `retireHooks` with no owner; `invalidate` is published as `invalidateInsertion` and called as a member of the slots object |
| **#13**, `kernel/kernel.ts` `Kernel` class doc; `kernel/spec.ts` `BehaviorInstall` (published) | _no input can be admitted before `install()` returns_, as a neighbouring unenforceable term | the factory returns, then arming attaches ingress, and native ingress is refused while construction runs. Probe 1's sentence is kept as a quotation in the class doc; the order holds the boundary and no guard checks it |
| **#14**, `kernel/seams.ts` | _the queue is run-to-completion_; _the queue's panic path_ | the execution bracket's drain; the execution bracket's panic path |
| `sortable/spec.ts`, the spatial guard (was `:857`) | _The activation test is the one a producer reaches_ | **Established false and corrected.** The producer tests the record before it dispatches, and the record is published before `ACTIVE` is committed and cleared only at retirement, so the applied half's activation conjunct cannot fail once the phase test passes. The comment now says that. The rest of the passage is unchanged |
| `kernel/kernel.ts`, `attach()` (was `:2431`) | a 94-column line | rewrapped |
| `sortable/spec.ts`, the frame task's byte figures | _148 B … (281 B against 309 B)_ | the figures are removed and the comparison is kept. [`m2.md`](m2.md) §Answer 2 holds them. No citation is in the source (§Deviations, 1) |

**#7's twins.** 07:478's _behind the barrier_ is struck and marked withdrawn by D-208 step 4. The census found the same phrase on 07:487 (`finalized`), and it gets the same mark. 02's _post-commit_ paragraph and 07:113 already state the order and are unchanged.

**#13's twins.** 01:114's comparison is marked as history. 01:116's sentence is kept as a quotation, and a dated note names the boundary.

**#13: whether saying so decides anything.** The comments and both 01 notes say what the code does. Ingress is attached only after the factory returns (`Kernel.construct`), and `ExecutionBracket` refuses native ingress while construction runs. They do not say the boundary is a contract term or that a behavior must meet it. Nothing was escalated. A recheck that reads _the order holds it_ as a contract change should treat it as an escalation.

### Item 2 — `requestDestroy`

Both controllers' JSDoc (`sortable/controller.ts`, `free-drag/controller.ts`) now says: from application on, nothing is admitted, no lifecycle or domain event is published, and no declared consumer slot is invoked. Two exceptions are named by route: teardown runs each installed feature's retire hook, and a panic delivers its one report to `onError` before teardown. This agrees with `README.md`'s bullet and with 05 I-36's relinquishment and diagnosis. 01:440 has a dated amendment naming the same two. Both `controller.d.ts` files change in doc comments only (§Verification).

### Item 3 — the admitted gap, and its established outcome

**Established by a probe at `0ba8afb64`.** A temporary `it` was appended to `tests/sortable/sortable.browser.test.ts`, run alone in Chromium, and the file restored from a copy; `git status` was clean afterwards. It used the suite's own harness:

- a `REENTRANT_PLACEHOLDER` whose `connectedCallback` calls `controller.requestCancel('probe-cancel')`;
- an `invalidateInsertion` that throws;
- the suite's `activate`.

What it observed:

- **calls:** `['onCancel']`. `onStart` never ran;
- **`onEnd`:** exactly one result, `{ type: 'canceled', reason: 'probe-cancel', origin: CANCEL_SUPPLIED (30), stage: AT_PROPOSAL (20), proposal: null }`;
- **`onError`:** one `DraggableWarning`, `drag: failure/superseded-by-cancel`, with the thrown error as `cause`. No `DraggableError`;
- the placeholder is removed.

**The outcome equals the passage's.** It is _a terminal callback for a drag whose start was never notified_, so nothing is escalated. It also agrees with the code:

- `#cancelWith` registers the request and dispatches `CANCEL`;
- `#failOperation` captures `superseded: true`;
- `#handleCancel` settles `ACTIVATING` through `SETTLED_CANCELED`, whose arm does not consult the start marker;
- `#handleFailed` reports the supersession.

**Text.**

- The source comment says _registered_ and states the outcome, including the superseded warning. It says the gap is admitted and open, and does not restate the old reason. It cites no identifier (§Deviations, 1).
- 02:880 has _latched_ struck for **registered** and the reason sentence struck, and gains a dated paragraph. The paragraph states the probe's outcome, why the struck reason is not a ground, that the gap is open, and that whether to close it is F-442.
- 02:872's row is marked _open: F-442_, with a date.

### Item 4 — the four contract lines

| Line | Disposition | Established from |
| --- | --- | --- |
| **02:1846** | `destroy()`'s _synchronous terminal barrier_ is struck. A dated restatement says it is a request the bracket registers: from a resolver it is applied at the admission unit's boundary, ahead of everything queued, and application clears the queue (R1). The enqueue-without-drain claim around it is unchanged | D-203; I-6's entry; R1 |
| **06:162** (with :163–165) | a dated `← WITHDRAWN by D-207 step 3` annotation in the trace: no recheck runs. A destroy from a `handle` or `visual` resolver is applied after the admission unit (R1): `visual` and `box` are still called, `PENDING` is published, and application tears it down | R1; D-207 step 3 |
| **06:777–779** | a dated note marks both paragraphs as history. D-36's deferral window does not exist since D-203: application closes, clears the queue and tears down in one step (01 §Teardown across two owners). I-20 holds once application has run | D-203; 01:436–437 |
| **06:789** | the D-36 row is struck. A dated restatement by D-203's order follows | `#openResolution`, `#settleResolution`, `#release` and `#retireAttempts` at the tip; the composition test |

**06:789's established outcome.** `onReorder` runs inside the round-trip's unit (`OPEN_RESOLUTION`), so `requestDestroy()` is registered there and applied at that unit's boundary.

- **A synchronous resolution** has queued `RESOLUTION_SETTLED` in that unit (`#settleResolution`). Application clears the queue and discards it: there is no settlement, no landing and no `onEnd`.
- **An asynchronous resolution** has queued nothing. Application aborts the signal handed to `onReorder`, because the cancellation lifetime's disposer runs while `completed` is false. It also clears the attempt slot (`#retireAttempts`), so the later settlement fails `#settleResolution`'s slot test and is dropped.

**No R-case pins the row.** The synchronous half is pinned by `composition.browser.test.ts`'s _should tear down without a terminal callback when onReorder destroys_ (`COVERAGE.md`, `onReorder` destroys, I-6). The asynchronous half is stated from the code and is not pinned for this path. R20 pins the same intake for a destroy at depth 0. The row says both. Nothing is escalated.

### Item 5 — the supplementary census

**Search.** Over 01, 02, 03, 05, 06 and 07 at `0ba8afb64`, case-insensitively, by line:

```text
D-36\b|deferr|logical(ly)? clos|immediate(ly)? (terminal|clos)|synchronous terminal|post-callback|recheck|revalidat|\bbarrier
```

**The lines step 5 had already classed** are those that also match step 5's search, `\bclosed|\blive\w*|latch\w*|terminal barrier|participant\w*`. They are excluded, which leaves **68 lines**. Each was read in context. A passage covered by a section or paragraph note is classed by that note, and old member names are not a class.

| Document | Class | Lines (at `0ba8afb64`)                           |
| -------- | ----- | ------------------------------------------------ |
| 01       | K     | 243, 487, 507                                    |
| 02       | K     | 126, 1338, 1368, 1806                            |
| 02       | H     | 176, 186, 200, 219, 1375                         |
| 02       | A     | 502                                              |
| 02       | N     | 697, 699, 1300, 1305, 1468                       |
| 03       | K     | 841                                              |
| 03       | A     | 836                                              |
| 03       | N     | 855, 1003, 1134, 1138, 1227, 1323                |
| 05       | K     | 33, 248                                          |
| 05       | H     | 29, 268, 477, 743, 745, 747, 749, 763, 782, 1048 |
| 05       | A     | 7, 563, 633, 635                                 |
| 05       | N     | 573, 579, 1004, 1092                             |
| 06       | K     | 285, 621, 810                                    |
| 06       | H     | 338                                              |
| 06       | A     | 165, 777                                         |
| 06       | N     | 493, 495, 805                                    |
| 07       | K     | 16, 750                                          |
| 07       | H     | 136, 547, 555, 563                               |
| 07       | A     | 478, 487, 690, 712                               |
| 07       | N     | 186, 274, 398                                    |

**Totals:** K 15, H 20, A 12, N 21, **E 0**.

**The classes, as applied:**

- **K** is current. It covers:
  - the unit-entry _no revalidation_ annotations (02:126, 1338, 1368, 1806; 06:285, 621);
  - the join's entry validation (06:810);
  - panic's close → report → teardown (01:507);
  - teardown totality (01:487);
  - the promise surface, under its old member name (01:243, 03:841, 07:16, 07:750);
  - I-3's citation of 02's section by title (05:33);
  - I-36's tier argument (05:248), which holds for any bracket.
- **H** is struck, dated, or under a note:
  - 02's _Post-callback revalidation_ section, whose own D-207 note covers it;
  - 05's I-37 paragraph, under the note at 05:272;
  - 05's F-47 section and stretch-table section, under step 5's note at 05:731 and the _retired_ heading;
  - 07's terminal-barrier enumeration, under step 5's note at 07:549.
- **N** covers _deferral_ that is not lifecycle closure: the collection deferral (F-32), _deferred_ questions, and a deferred `preventDefault()`. It also covers a framework's _commit barrier_, the tail's _deferred lease_, and 05:1092, whose hit is a decision number in a provenance list and states no closure property.
- **A**, amended in 5R. Each is dated and names D-208 step 4 or remediation 5R:
  - 02:502, the discrete-admission trace's `revalidate (D-26 …)`, annotated as withdrawn by D-207 step 3;
  - 03:836, the `destroy()` docblock stating D-36's model, with a note after the block;
  - 05:7, I-6 _rewritten for deferred physical teardown_, given an inline note;
  - 05:563, F-30's resolution, and 05:633–635, F-38's, each marked as history (D-155; D-207 step 3; R7 for F-38);
  - 06:165, which is 06:162's passage (item 4);
  - 06:777, item 4;
  - 07:478 and 07:487, _behind the barrier_;
  - 07:690, L-3's `TAG_POLICY` barrier, marked as history: D-148 deleted the `axis` source and with it the barrier's site, and `lifecycle.browser` deleted its rows. 07:712, L-3's discharge row, is marked with it.

**No E.** Every passage found stating, as current, a property the code no longer holds has a decision that withdraws it: D-155, D-148, D-203, D-207 step 3 or D-208 step 4. So nothing met §20.4's third escalation condition.

### Item 6 — `admitCommand`'s guard

`#seedDraft`'s declared result is `AdmissionSubject`, and `admitCommand` has no branch on it. `admitFrom`'s `item ? … : null` is unchanged.

**The comment-stripped difference** (TypeScript printer, `removeComments`, blank lines dropped) between `e324ca8fa` and `39e243887` is the return type `AdmissionSubject | null` → `AdmissionSubject` and the three-line `if (!subject) { return null; }`, and nothing else. `c595e96e3` has the same stripped hash as `39e243887`. No other file changed.

### Runtime invariance (items 1–5)

**The instrument.** Step 5's digests cannot be reproduced from its record, because its exact serialization is not stated. This section therefore hashes every file with its own instrument and compares within it:

- the TypeScript printer with `removeComments`;
- blank lines dropped;
- SHA-256, first 16 hex characters.

**Checked both ways.** Across `6905af249` and `dbbb62199`:

- `sortable/domain.ts` hashes equal (`c8a27cdad384cf37`), and so does `kernel/lifetimes.ts` (`61d0b5f8f938c0ad`);
- `sortable/runtime.ts` differs (`56e445314c6aed80` → `8ec293994e0f3056`), as step 5 found.

| File | Touched | `0ba8afb64` | `e324ca8fa` (items 1–5) | `c595e96e3` (tip) |
| --- | --- | --- | --- | --- |
| `src/free-drag/assemble.ts` | yes | `51278c5912570fdf` | equal | equal |
| `src/free-drag/behavior.ts` | no | `c65666566897f4d8` | equal | equal |
| `src/free-drag/bounds.ts` | no | `bc6a71e14f0810c0` | equal | equal |
| `src/free-drag/controller.ts` | yes | `956bcd9cdeb18ab6` | equal | equal |
| `src/free-drag/domain.ts` | no | `9be0ce4bde3246af` | equal | equal |
| `src/free-drag/runtime.ts` | no | `a97fea9cb80baee8` | equal | equal |
| `src/free-drag/spec.ts` | yes | `8563144052f9ee4c` | equal | equal |
| `src/kernel.ts` | no | `922578c906497c11` | equal | equal |
| `src/kernel/actions.ts` | no | `93a7cd9d9c9b2f43` | equal | equal |
| `src/kernel/errors.ts` | yes | `cca6eba99e8483f6` | equal | equal |
| `src/kernel/execution.ts` | no | `ac3a7a2ea6ba733f` | equal | equal |
| `src/kernel/kernel.ts` | yes | `7bebc600fe08aad5` | equal | equal |
| `src/kernel/lifetimes.ts` | no | `61d0b5f8f938c0ad` | equal | equal |
| `src/kernel/seams.ts` | yes | `a1b94130e2a8b261` | equal | equal |
| `src/kernel/spec.ts` | yes | `238cb134ae1c4be4` | equal | equal |
| `src/kernel/unwind.ts` | no | `c68b74fd5556e105` | equal | equal |
| `src/shared/composition.ts` | no | `65a4587e21d114d5` | equal | equal |
| `src/sortable.ts` | no | `2bfa5aedfdfae503` | equal | equal |
| `src/sortable/assemble.ts` | no | `954b91428db31c4a` | equal | equal |
| `src/sortable/behavior.ts` | no | `02778555eb1385c1` | equal | equal |
| `src/sortable/controller.ts` | yes | `7940aa9132371e42` | equal | equal |
| `src/sortable/domain.ts` | no | `c8a27cdad384cf37` | equal | equal |
| `src/sortable/feature.ts` | no | `62e732e0d04ef32c` | equal | equal |
| `src/sortable/layout-animation.ts` | yes | `ebf9ba7ba40b592b` | equal | equal |
| `src/sortable/linear-shift.ts` | no | `72ce91315bc755ac` | equal | equal |
| `src/sortable/placement.ts` | no | `1dd71e8da6be8620` | equal | equal |
| `src/sortable/rect-index.ts` | yes | `6ec3cf3d36e37c6a` | equal | equal |
| `src/sortable/runtime.ts` | no | `8ec293994e0f3056` | equal | equal |
| `src/sortable/slots.ts` | no | `ab95dccdcbc88d25` | equal | equal |
| `src/sortable/spec.ts` | yes | `25b9c85b03f6549c` | equal | `610e73e86ef0b6a9`: item 6 only |
| `src/sortable/xy.ts` | no | `d4fea4b6fa86a0c4` | equal | equal |
| `src/sortable/y.ts` | yes | `f97dcc5ed0c69291` | equal | equal |

**At items 1–5, all 32 are equal.** In `git diff -U0` over `src/` for `e324ca8fa`, every changed line is in a comment. The one line not opening with a comment marker is the block comment `/* ---- the controller's channel ---- */`. No lint directive was touched.

### Composition

Built with `just build` and measured with `measureAll()` in the shared checkout, at two trees:

- **item 6's parent:** `e324ca8fa`'s `src/sortable/spec.ts` restored over the tip;
- **the tip:** measured after item 6, and again at `c595e96e3`. The two runs are identical.

**At item 6's parent, all 15 rows equal step 5's table byte for byte**: minified, Brotli and modules. So items 1–5 move no composition figure.

**After item 6:**

| Row | Minified | Δ | Brotli | Δ | Modules |
| --- | --: | --: | --: | --: | --: |
| minimal | 33,336 | −9 | 10,201 | −17 | 33 |
| minimal (xy) | 32,693 | −9 | 10,094 | −5 | 32 |
| minimal + layoutAnimation | 34,252 | −9 | 10,533 | −10 | 34 |
| xy + layoutAnimation | 33,609 | −9 | 10,413 | −4 | 33 |
| minimal + landing | 33,729 | −9 | 10,386 | **+20** | 35 |
| complete | 34,645 | −9 | 10,688 | −4 | 36 |
| free drag minimal | 26,980 | 0 | 8,262 | 0 | 27 |
| free drag + bounds | 27,624 | 0 | 8,495 | 0 | 28 |
| free drag + landing | 27,373 | 0 | 8,437 | 0 | 29 |
| free drag complete | 28,017 | 0 | 8,628 | 0 | 30 |
| both behaviors | 42,184 | −9 | 12,209 | **+11** | 47 |
| vocabulary root - drag.js | 252 | 0 | 142 | 0 | 2 |
| kernel root - kernel.js | 19,954 | 0 | 6,320 | 0 | 16 |
| baseline A - feature-matched, non-composed | 33,936 | −9 | 10,508 | **+1** | 31 |
| baseline B - shipped @ydinjs/drag sortable.js | 22,618 | 0 | 6,916 | 0 | 26 |

**Equal, as required:** every free-drag, kernel-root and vocabulary row, minified and Brotli. Baseline B carries none of `src/`, and it is equal too.

**The four budget rows** are unchanged and still over budget by the same bytes (+72, +12, +52, +8; §19.3). They stay pending the owner's disposition. Nothing is re-based.

**Finding, escalated: three sortable-carrying rows grow under Brotli.** Item 6 removes the same 9 minified bytes from every row that carries `sortable/spec.ts`. Under Brotli, four rows shrink and three grow:

- `minimal + landing`, +20;
- `both behaviors`, +11;
- `baseline A`, +1.

§20.4 requires the sortable-carrying rows to be equal or smaller, and says any growth is a finding. CONTRIBUTING §15 makes Brotli the governing figure, and it disagrees in direction with the minified figure here. The growth is a compression artefact: no module enters or leaves a graph, and the minified text only shrinks. Even so, it is growth on the governing figure.

None of the three rows is near its budget, and no row in the owner's disposition moves. Item 6 is landed as directed, because reverting it would decide the finding. Whether to keep it, and whether to book it as attributable to item 6, is the architect's.

### Deviations

1. **The source cannot carry a record identifier, and the gate overrules §20.4's wording.**
   - **The conflict.** `tests/references.node.test.ts`, _should carry no history in a comment_, fails on any `F-`, `M-` or `D-` number, `§` or `.plan/` path in `src/`. That is stricter than CONTRIBUTING's _one bare pointer_. §20.4 item 3 says the text _cites F-442_, and its frame-task bullet says _replace them with a citation_. The first commit put `(F-442)` and `(M-2)` into `sortable/spec.ts`, and the suite failed that row as a fifteenth failure.
   - **What landed.** `c595e96e3` removes both, comment-only, and leaves the stripped hash unchanged. The source states the property: the gap is admitted and open, and the frame-task comparison stands without figures. F-442 is cited in both contract lines and here. The frame-task figures are held by `m2.md` §Answer 2.
   - **For the recheck.** If an identifier in the source was meant regardless, the gate and the handoff disagree, and that goes back to the architect.
2. **A kernel comment that the two-fault gap falsifies**, outside 5R's items and reported rather than changed under §19.5's first condition. `kernel/kernel.ts`, `#handleCancel`'s `ACTIVATING` arm, says that _by the time a cancellation is applied here the placeholder is in the DOM, the lift is acquired and the behavior has already delivered its start notification_. Item 3's probe reaches that arm with `onStart` never run. The claim holds on every path except F-442's gap. It is F-442's to restate, or 5R's if the architect widens it.

### Verification

- **Tests:** `vitest run`, every project, on `c595e96e3`. 1,377 pass and 14 fail, and `react.browser` and `stories.browser` do not load, as before. The 14 are step 5's failing set:
  - the six `size.node` controls;
  - the four `docs.node` rows;
  - the four budget rows.

  The same run at `39e243887` had a fifteenth failure, the gate in §Deviations, 1. Comment-only `c595e96e3` cleared it, and the gate's file passes alone.

- **Lint**, over every changed `src/` file, after `fmt`, `lint-fix`, `fmt`: seven eslint errors. They are the same rules on the same files as at `15a7fa53d`, taken with `git stash` over the same file list:
  - `free-drag/assemble.ts`: one `no-unnecessary-condition`;
  - `free-drag/spec.ts`: one `consistent-return`;
  - `kernel/seams.ts`: two `no-unnecessary-condition` and two `only-throw-error`;
  - `sortable/spec.ts`: one `consistent-return`.

  Item 6 adds none. The contract Markdown is reported as ignored by eslint and formatted by `oxfmt`.

- **Typecheck:** only the two `.scripts/vitest-*.ts` errors, after items 1–5 and after item 6.
- **Published declarations:** built at `0ba8afb64`'s `src/` and at items 1–5. Three of 33 files differ: `free-drag/controller.d.ts`, `sortable/controller.d.ts` and `kernel/spec.d.ts`. Each has an equal comment-stripped hash, and every differing line is a doc-comment line. `kernel/spec.d.ts` carries #8's header and #13's `BehaviorInstall` sentence. Item 6 is on a `#private` member and reaches no declaration.
- `git diff --check`: clean.

### Limits

- Chromium only.
- Items 3 and 4's outcomes rest on one probe, with the code read for the rest. The probe was not committed, because tests are out of scope. 06:789's asynchronous half is read from the code and pinned by no row for this path.
- The supplementary census is a word search like step 5's. A passage stating the old closure model in other words escapes it too.
- No runtime was measured. Items 1–5 change no runtime statement, by the hashes. Item 6 removes a branch on a cold, once-per-command path.

### Unresolved obligations

- **The Brotli growth on three sortable-carrying rows** (§Composition) goes to the architect.
- **§Deviations, 1 and 2** go to the recheck and the architect.
- **The four budget overruns** stay the owner's, unchanged and pending disposition.
- **F-442** is open and not decided here.
- **D-208 stays `Unimplemented (Remediation)`.** `d208-requests.md` is not created, and the witness holds.
- **Reviewer-E** is untouched.

**Next:** the bounded independent recheck of 5R's commits against §20.4's required properties, then the architect's acceptance. Step 6 does not start before it.

## Remediation 5R.1 — 2026-11-03

> **Implemented 2026-11-03, not yet closed.** Closure belongs to the architect, after the bounded independent recheck [`request-application-claude.md`](../reviews/architecture/request-application-claude.md) §21.7 requires. Step 6 does not start before it.

**Governing record:** [`request-application-claude.md`](../reviews/architecture/request-application-claude.md) §21.3, §21.4 and §21.7, with §19.5's and §20.4's rules carried over. **Input:** `b132ae788` on `drag2/fin-review2`. Its `src/` and contracts 01–07 equal `2d17645f5`'s, so _before_ sites below are cited at `2d17645f5` and _after_ sites at `df45b1c69`.

**The series:**

1. `df45b1c69`: items 1–3. Comments and contract text only;
2. this section.

No test changed in this series. No published JSDoc changed. **`df45b1c69`'s parent is `c186f120e`, not `b132ae788`.** `c186f120e` was committed in the shared checkout during this unit, by someone else. It adds one `eslint-disable-next-line` comment to `tests/sortable/features.browser.test.ts` and touches no `src/` or contract file. Every check below ran on a tree that includes it.

### Item 1 — the gap stated as a class

**The code read for the class**, at `df45b1c69`:

- **The cancel's sources.** The activation unit reaches consumer code twice before the start notification. In `prepare`, `prepareActivation` (`sortable/spec.ts:640`) calls the placeholder factory through `createPlaceholder` (`:699`). In the effect, `item.after(placeholder)` (`:720`) connects the placeholder and runs its `connectedCallback` synchronously. A cancel requested from either is registered and applied in a later unit.
- **The effect's failures before `onStart`.** The adjacency check throws (`:755`) before the activation record is published (`:777`). `#invalidateInSeam()` fails (`:791`) after it is published.
- **Supersession.** `#handleFailed` (`kernel/kernel.ts:2132–2137`) drops the checkpoint when a cancel was registered, and reports the error as `drag: failure/superseded-by-cancel`.
- **Application.** `#handleCancel`'s `ACTIVATING` arm (`kernel.ts:2026`) settles on the phase alone. Nothing in it reads whether a start was notified.
- **P2's landing.** `anchorTarget` (`sortable/spec.ts:1468–1469`) destructures `this.#operation.activation!`, which the adjacency throw left unpublished.

This is §21.3's class, and it is stated from the code without a new reading. The `prepare` source is read from the code and not probed. Free drag is not enumerated (§21.7, out of scope).

**Sites:**

| Site | Before (`2d17645f5`) | After (`df45b1c69`) |
| --- | --- | --- |
| `sortable/spec.ts:785–794` → `:791–805` | _This is the one path that reaches a terminal callback without a start notification_, with the placeholder's `connectedCallback` as the cancel's only source | One instance of a class of two-fault paths. The adjacency throw above is named as another. The cancel's sources are the placeholder factory in `prepare` and the `connectedCallback`, and the failure is the effect's before `onStart`. The outcome and _either fault alone is fine_ are kept. The gap is admitted and open |
| `sortable/spec.ts:737–744` → `:737–751` | after the adjacency throw, _nothing was published or notified_ | The single-fault outcome and the two-conjunct argument are kept. A new paragraph says that with a registered cancellation the class applies instead: the drag settles as _canceled_ without a start notification, and the landing looks for an activation record the throw left unpublished |
| `kernel.ts:2029–2034` → `:2029–2042` | the `ACTIVATING` arm says the behavior _has already delivered its start notification_ | The claim is kept, and a paragraph after it says it does not hold on the class. The arm reads the phase alone and settles a drag whose start was never notified. The gap is admitted and open |
| 02:876, the I-31 table row | _the admitted gap below_; _two faults in `activation.effect`_ | _gap_ struck for **class**, with a dated mark. The cause is struck and restated: a cancel registered by consumer code reached from the activation unit's `prepare` or `effect`, then an effect failure before the start notification |
| 02:884 | _The one admitted gap._ | Struck and restated as **one instance of the admitted class**. The passage is otherwise kept |
| 02:888–900, new | — | A dated 5R.1 amendment. It states the class by its two conditions, why D-207's entry clause cannot decline it, the outcome, P1 and P2 (P2 with its `drag: landing/target-unavailable` warning and the library's own `TypeError` as `cause`), what is not established, that the outcome predates D-208, and that the class is open under F-442 |
| 05:203 | _One admitted two-fault gap, documented at both ends._ | Struck. **One admitted class of two-fault paths, stated in 02 §I-31**, dated and citing F-442 |

The source comments carry no record identifier (§21.4). F-442 is cited in the two contract lines and here.

**The uniqueness search.** It covered 01–07, `README.md` and `src/`, for _one path_, _only path_, _one admitted_, _admitted gap_, _two-fault_, _start notification_, _unnotified_, _never announced_, _told nothing_ and _nothing was published_. It found:

| Where | Text | Disposition |
| --- | --- | --- |
| `sortable/spec.ts:787`, 02:876, 02:884, 05:203, `kernel.ts:2032` | the five §21.3 names | restated above |
| 02:874 | _This is a second gap, not the one recorded below_ | No change. It distinguishes D-40's clause from the admitted gap, which the row below it now names as a class, and claims no uniqueness |
| 05:199, I-31's statement | _and **only** then: an operation whose `onStart` never ran publishes no terminal_ | Reported, not changed. It is the invariant the class qualifies, not a uniqueness claim about the gap. 05:203, two lines below, carries the qualification, as it carried the single gap's |
| 07:686, L-2 | **none** for an operation that never started (Q-15) | Reported, not changed. It is free drag's restatement of the same invariant, with no gap qualifier. Whether free drag has an instance is not established, and enumerating it is out of scope |
| `README.md` | nothing | — |
| published JSDoc | nothing | No escalation |

Every other hit for those words is unrelated: _one path_ as the hot pointer path, _the one exception_ as panic's report, an insertion _start gap_.

### Item 2 — 5r-B

`kernel.ts:2462–2463` → `:2469–2470`. _Probe 1's *no input can be admitted before `install()` returns* names this boundary; the order holds it, and no guard checks it_ becomes _The order holds this boundary, and no guard checks it._ The quotation goes rather than stays unattributed: the paragraph's first sentence already states the boundary.

### Item 3 — 5r-C

- `seams.ts:434–435`: the 35-column line is refilled into its paragraph.
- `seams.ts:463–466`: the 91-column line is refilled.
- `sortable/spec.ts:858–866` → `:870–878`: the 84-column line and the two following lines are refilled.

No word changed in any of the three. No `+` line in `df45b1c69`'s `src/` diff exceeds 80 columns.

### §Deviations 2 — the bound, corrected

**Dated correction, 2026-11-03.** 5R's §Deviations 2 says the `ACTIVATING` comment's claim _holds on every path except F-442's gap_. That bound is wrong. The claim fails on every path of §21.3's class, and the recheck's P2 is a second known instance: there the placeholder is not in the DOM, the activation record was never published and `onStart` never ran. The correct bound is _every path except the class of two-fault paths F-442 now covers_. The comment is restated to that bound in item 1. The 5R section is not edited.

### Runtime invariance

The instrument is 5R's: the TypeScript printer with `removeComments`, blank lines dropped, SHA-256, first 16 hex characters.

**All 60 `src/` modules hash equal** at `2d17645f5` and `df45b1c69`. The three touched modules:

| File                   | `2d17645f5`        | `df45b1c69` |
| ---------------------- | ------------------ | ----------- |
| `src/kernel/kernel.ts` | `7bebc600fe08aad5` | equal       |
| `src/kernel/seams.ts`  | `a1b94130e2a8b261` | equal       |
| `src/sortable/spec.ts` | `610e73e86ef0b6a9` | equal       |

### Composition — the control row

Built with `just build` and measured with `measureAll()` at `b132ae788`'s `src/` and at `df45b1c69`. **All 15 rows are equal**: minified, Brotli and module lists. They also equal 5R's tip table above, row for row, so the four budget rows have not moved.

### Verification

- **Tests:** `vitest run`, every project, at `df45b1c69`'s tree. 1,377 pass and 14 fail, and `react.browser` and `stories.browser` do not load, as before. The failing set is identical to 5R's tip run. `references.node` passes.
- **Lint**, over the three changed `src/` files and the two contracts, after `fmt`, `lint-fix`, `fmt`: five eslint errors, which are these files' share of 5R's seven. They are `kernel/seams.ts`'s two `no-unnecessary-condition` and two `only-throw-error`, and `sortable/spec.ts`'s one `consistent-return`. The contract Markdown is reported as ignored by eslint and formatted by `oxfmt`.
- **Typecheck:** only the two `.scripts/vitest-*.ts` errors.
- **Published declarations:** all 33 `.d.ts` files are byte-identical between the two builds. No published doc comment changed.
- `git diff --check`: clean.

### Limits

- Chromium only.
- The class is read from the code. Its two instances rest on the probes recorded by 5R and the recheck, and this unit ran no probe.
- The uniqueness search is a word search. A passage claiming uniqueness in other words escapes it.

### Unresolved obligations

- **05:199 and 07:686** are reported under item 1. They state the invariant without the class's qualification, and 07:686 has no qualifier at all. Whether either is restated is the architect's.
- **F-442** is open for the class and not decided here.
- **The four budget overruns** stay the owner's, unchanged.
- **D-208 stays `Unimplemented (Remediation)`.** `d208-requests.md` is not created.

**Next:** the bounded independent recheck of `df45b1c69` and this section against §21.7, then the architect's closure of 5R.1. Step 6 does not start before it.