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