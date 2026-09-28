# Arc B's remediation — integrity

**Read at `8c1b20042`**, the head of `drag2/fin-review`; range `5f7a901a4..8c1b20042` (D-184 and D-186 landed together, their tests and instruments, the measurement, the remaining Arc B finding repairs, and the record-only cleanup at `8c1b20042`).

**The lens.** Whether the package stays coherent _outside_ the change: neighbouring flows that share state or ordering with `arm()`, the published surface, the invariants the package claims, and whether the contract and record set still describes the code that now exists. Whether D-184 and D-186 do what their plans say is the feature-proof pass's question and is not answered here.

## Scope

**Covered.**

- The kernel's construction window as it now exists — `arm()`, `#unwindArm`, `fail()`, `dispatch()`, `#cancelWith`, `#runPhysicalTeardown`, `#retireOperation`, `#notify` — read against `ExecutionBracket` (`src/kernel/execution.ts`) for the two edges the change relies on: when `#beginPass` fires and when `close()` runs teardown. Every route by which a construction-window `destroy()` can reach a frame reset, a `spec.retire`, an ingress abort or the `destroy()` promise was walked.
- The removal of `#pinned` and the driver's fifth collaborator, against every remaining reader: `new SeamDriver` has two call sites in the tree (`src/kernel/kernel.ts:2495`, `tests/kernel/seams.node.test.ts:85`) and both carry the four-argument shape; `#pinned` survives in no `src/` or `tests/` file.
- The published surface: `BehaviorContext` in `src/kernel/spec.ts` against its transcription in `01-construction-ownership.md`; `ArmOutcome`'s disappearance against `vocabulary.node.test.ts`'s `INTERNAL` allow-list, `02 §What stays internal` and `03 §Internal and unstable at every tier`.
- The instruments: `bench/size/measure.ts`'s `control` mechanism and the five suspended declarations, against `obligations.md` O-13, `measurements/arc-b-remediation.md`, `measurements/arc-b.md` and `measurements/budget-rebases.md`.
- `tests/COVERAGE.md`'s D-184 block and B-0 table against the six rows actually present in `tests/kernel/construction.node.test.ts` (names match one-for-one) and the renamed row in `kernel.browser.test.ts`.
- Executed: `npx nx run drag2:typecheck` clean; `vitest --project node/drag2 --project declaration/drag2` — 33 files, 441 tests, no type errors; `vitest --project browser/drag2` — 39 files, 860 passed, 60 skipped; `npx just size` — fifteen rows, every one under budget, both surviving controls exact (`vocabulary root` 142 B, baseline B 6,889 B), reproducing `arc-b-remediation.md`'s landed column byte-for-byte.

**Not covered, and why.**

- **The historical body of `00-index.md` and `plan.md` outside the D-181/D-184/D-186 entries.** Dated records of superseded readings are not drift by this lens; only a record that reads as a live claim about the tree is. I read the `#begin`, `#pinned`, `commit()` and `ArmOutcome` occurrences across `.plan/contract/` and `.plan/measurements/` to separate the two, and report only what fails that test.
- **Correctness of D-186's unreachability argument.** Whether the identity conjunct had a falsifier is the adjudication's question, re-derived at `ea6e400e3` and re-confirmed in the record. I checked only that no _other_ flow depended on the conjunct or on the pin's clears, which is the integration half.
- **`.plan/traces/phase23/*.json`.** They embed whole source files as they stood at phase 23 and are fixtures of a past tree, not statements about this one.
- **The perf suites.** No timing claim is made in the range beyond the size table, which I reproduced.

## Findings

### integrity-1 — the two surviving size controls are described as detecting a leak only one of them can detect. Tier B

**Finding.** `bench/size/measure.ts`'s `control` docblock, `obligations.md` O-13 and `measurements/arc-b-remediation.md` §The controls each say that the two rows keeping a `control:` are what still detects a kernel symbol reaching a composition that should not have one. Baseline B cannot detect that, in any tree.

**Current behavior / contract.** With the five kernel-carrying controls suspended for the D-170 series, `measure.ts:143-150` states: _"The two that remain carry no kernel, and they are what still detects a kernel symbol reaching a composition that should not have one."_ `obligations.md` O-13 repeats it verbatim and adds _"**This row is the whole of the protection**"_. `arc-b-remediation.md` §The controls states it a third time: _"They are the two rows carrying no kernel, and a kernel symbol reaching either is what they exist to detect."_

**Why it is a problem.** Baseline B's entry is `bench/size/shipped.js`, whose one import is `@ydinjs/drag/sortable.js` — the **shipped, separate package**, which this tree does not build. No edit to `packages/drag2/src` can move its bytes, so its exactness detects a change in an external dependency's published artifact and nothing about drag2's tier split. The row that actually holds the stated property is `vocabulary root - drag.js`, alone, and it holds it through `only: ['kernel/errors.js']` as much as through `control: 142`. The consequence lands precisely where the suspension is riskiest: O-13 exists because _with the five omitted, nothing else in the tree would notice that they never came back_, and it presents a two-row remainder where there is a one-row remainder. A pass restoring the five at the series' close weighs the interim exposure against a figure that is off by half.

**Evidence.** `packages/drag2/bench/size/shipped.js` — the whole entry is `import { sortable } from '@ydinjs/drag/sortable.js'; export { sortable };`, with its own docblock saying _"the shipped `@ydinjs/drag` `sortable.js` … the size a consumer is moving *from*"_. `packages/drag2/bench/size/measure.ts:538-545` — that row is `entry: 'bench/size/shipped.js'`, with no `only`, `present`, `absent` or `absentPrefixes`. `arc-b.md` §Brotli already states the correct reading of the same row — _"baseline B is the shipped `@ydinjs/drag`, which this tree does not compile"_ — so the two documents disagree with each other on what the row is for.

**Required property.** Every statement of what the surviving controls protect must name the rows that can actually be reached by a change to this package, and must distinguish a control over drag2's own output from a control over an external artifact. Whatever remaining protection O-13 rests on has to be the protection that exists.

### integrity-2 — `01`'s `BehaviorContext` block is the six-member surface its own section says is seven. Tier B

**Finding.** `01-construction-ownership.md` §`BehaviorContext` states the interface has **seven** members and that its list _"has always carried"_ `closed`. The transcribed block declares six, and `closed` is not among them.

**Current behavior / contract.** `01-construction-ownership.md:134`: _"**Seven** members … It said *six* from Revision 2 until D-170 step 6, which counts `closed` — a member D-53 added and this section's own list has always carried."_ The block at `:145-208` (ending at `destroy(): Promise<void>;`, `:207`) declares `realm`, `root`, `dispatch`, `fail`, `cancel`, `destroy`. `src/kernel/spec.ts:82-93` declares `readonly closed: boolean` on `BehaviorContext`, between `fail` and `cancel`.

**Why it is a problem.** This is the document that defines the kernel-tier author-facing surface, and the omission is load-bearing for the change under review rather than incidental to it. D-184's window paragraph sits immediately below the block and reasons over the members one at a time — _"`fail` demotes, `cancel` is the idle no-op, **`closed` is the latch**, `destroy` closes and still owes its teardown"_ — so the paragraph delivering the new contract term appeals to a member the enumeration above it does not contain. A reader auditing the window's coverage member-by-member from `01` covers five of six; the same reader checking the count against the block finds the count wrong and has no way to tell which side is right. `git log -S` finds no commit that ever added a `closed` declaration to this block, so the sentence claiming the list always carried it is false as well as the list being short.

**Evidence.** `packages/drag2/.plan/contract/01-construction-ownership.md:134` and the block at `:145-208` (ending at `destroy(): Promise<void>;`, `:207`); `packages/drag2/src/kernel/spec.ts:82-93`. `git log --oneline -S "closed: boolean" -- .plan/contract/01-construction-ownership.md` returns nothing. The member is real and used at the ordinary tier — `src/sortable/behavior.ts:145` and `src/free-drag/behavior.ts:70` both read `kernel.closed` off a value typed as `BehaviorContext`.

**Required property.** `01`'s transcription of `BehaviorContext` must declare the members `spec.ts` declares, and its stated count and provenance sentence must agree with the list beneath them.

### integrity-3 — `01`'s `arm()` unwind clause lists two triggers D-128 deleted. Tier B

**Finding.** The paragraph that D-184 implements says `arm()` unwinds when _"either frame factory, the frame-part validation, the shape assertion, the static-configuration validation or any ingress attachment"_ throws. `arm()` has no frame-part validation and no shape assertion; D-128's source-shape pass deleted that whole family.

**Current behavior / contract.** `01-construction-ownership.md:394` carries the five-item list. `arm()` at `src/kernel/kernel.ts:2423-2545` contains exactly two fallible library steps before the factories — the `actionTags` range check and the `command.types === POINTER_DOWN` collision check, both of which the same paragraph's tail already names correctly as the static-configuration validation — then `Object.assign(frame(), next.createFramePart())` twice, with no validation of the returned part and no key-set assertion, then ingress attachment.

**Why it is a problem.** `00-index.md:1243` records D-128 deleting `assertFrameShapesMatch`, `assertFrameScrubbed`, `assert`, `sameKeys`, `captureFrameKeys` and `validateFrameDescriptors`, and says in terms that _"an unvalidated frame part and a non-deterministic factory are now asserted at `arm()`"_ — asserted by tests, not guarded by code. `COVERAGE.md:339` records the consequence for the instrument: the `composed > 1` unwind arm _"is now driven by a root whose `addEventListener` refuses"_ precisely **because** the shape assertion that used to drive it is gone. So the register and the coverage record both know the two steps do not exist, and the contract clause that enumerates the unwind's triggers still lists them. The sentence is not stale by neglect: `git log -S` dates it to `ea6e400e3` (2026-09-07), the adjudication that wrote D-184's window into this paragraph — the clause was edited around the dead items rather than through them. A later pass reading `01` for the set of failures `arm()` must unwind looks for two it will not find, and cannot tell whether that is drift or a gap in the implementation.

**Evidence.** `packages/drag2/.plan/contract/01-construction-ownership.md:394`; `packages/drag2/src/kernel/kernel.ts:2433-2489` (the full set of fallible steps in the `try`); `packages/drag2/.plan/contract/00-index.md:1243` (D-128's deletion list); `packages/drag2/tests/COVERAGE.md:339`. `git log --oneline -S "both of its exits reach the unwind" -- .plan/contract/01-construction-ownership.md` → `ea6e400e3`.

**Required property.** The clause must enumerate the failures `arm()` can actually take, so that the unwind's trigger set in the contract and the trigger set in the code are the same set.

### integrity-4 — the operation-record entry still explains `pinned`'s exclusion in the present tense. Tier C

**Finding.** `00-index.md:1499` gives a live-reading rationale for a field D-186 deleted, and describes a `pinned` assignment surviving at both retirement points. D-186's own site sweep covered source comments only, so nothing directed a reader at this entry.

**Current behavior / contract.** `00-index.md:1499` (the operation-record decision, implemented 2026-09-02): _"`pinned` is written by **every** `begin()`, armed or not, and exists to be compared against the operation identity — storing it inside the operation would compare a value with itself"_, and later _"with `clearOperationState` deleted and its `pinned` line kept as the one non-record assignment at both retirement points."_ Both clears and the field are gone at `8c1b20042`.

**Why it is a problem.** The register's own convention is to annotate a claim when its subject stops holding, and it was applied thoroughly inside this range — F-377 struck the `#pinned` clears paragraph at `:1795`, F-381 struck the accessor attribution at `:1781`, and `05-lifecycle-invariants.md:829` and `COVERAGE.md`'s B-0 table were both dated to D-186. This entry was missed because D-186's sequence lists _"Two source comments state grounds that go with the field"_ and no document sweep, where D-181's B-5 stage had explicitly demanded _"F-345's sweep run over the whole contract tree rather than over the record's own list of sites."_ Nothing consumer-observable turns on it and no instrument reads it, which is why it is C: it is the register's fidelity to itself, and the exclusion rationale is the sort of paragraph a later arc would reason from when deciding what belongs in `OperationRecord`.

**Evidence.** `packages/drag2/.plan/contract/00-index.md:1499`; `#pinned` appears in no file under `src/` or `tests/` at `8c1b20042`; `00-index.md:1998` and `:1876` are D-186's own statement that only two source comments were in scope.

**Required property.** A register entry whose stated ground has been deleted carries the annotation the register applies elsewhere, dated to the decision that deleted it.

## What I looked at and did not find

Stated so that a silent area is distinguishable from a clean one.

- **The construction-window `destroy()` path is coherent with teardown and with I-6.** `#bracket.close()` at depth 0 runs `#runPhysicalTeardown` immediately; `#spec` is still `null` there, so steps 3–6 are skipped and only `#cancelTail` and `#ingress.abort()` run. `arm()` then falls through to `#unwindArm`, which runs `next.retire` once and resets whichever frames exist. The behavior is retired exactly once on every one of the four window positions (factory body, first part factory, second part factory, post-publication ingress attachment), and `#runPhysicalTeardown`'s `if (this.#spec)` is what makes the two paths disjoint rather than a coincidence of ordering.
- **The `destroy()` promise cannot observe the gap.** `#runTeardown` settles it synchronously, before `#unwindArm` runs `next.retire`, but every continuation is a microtask and `arm()` and `draggable()` complete first. No consumer position sees a resolved `destroy()` with the behavior unretired.
- **`#beginPass` is not reachable pre-arm.** The bracket's fourth callback is now `() => { this.#frames.begin(); }` over a definitely-assigned field, and `execution.ts` invokes it only from `runIngress`, which only `#pointerDownHandler` reaches — a listener `arm()` binds after publishing `#spec`. The lazy resolution the old `#begin` provided is preserved.
- **The fall-through unwind implies a closed latch.** `arm()` returns unarmed only through `if (current && draft && !this.#bracket.closed)` failing, and `current`/`draft` are null only where the latch was already closed, so a controller is never returned unarmed and open. `#cancelWith`'s and `fail()`'s new `#spec` guards therefore cover the whole of the pre-arm and failed-arm surface, and there is no post-arm state in which `#spec` is null and `#frames` is live.
- **`dispatch()` from the window behaves as `spec.ts` now states**, though by a longer route than the docblock implies: it takes the out-of-range branch on `!this.#spec` and constructs a `dispatch/tag-out-of-range` warning that `#notify` then drops on `this.#spec?.reportError`. Silent and dropped, as documented; no finding, but the message is one a future reader may be surprised to find allocated.
- **`ArmOutcome`'s removal is complete and consistent** across `src/`, `tests/`, `vocabulary.node.test.ts`'s `INTERNAL` allow-list, `02`'s not-published table and `03`'s internal list. `05-lifecycle-invariants.md:590` still names it, in a settled-question paragraph about a completion protocol D-155 retired — historical, not a live claim.
- **`commit(null)` propagated to every live trace.** `02` §The two commits, `06` at four sites and `challenge-response.md:304` are updated; the remaining bare `commit()` occurrences in `.plan/contract/` are probe-1 prose about a behavior-callable commit that has never existed in this design, and F-386's correction at `00-index.md:1805` states the three surviving call sites and the shape.
- **The measurement reproduces.** Every landed figure in `arc-b-remediation.md`'s table matches a fresh `npx just size` run, no module moved, and slack runs 0.06–0.15 kB as recorded.
- **`packages/drag2/files.json` is untouched and correct**: the range adds and removes no entrypoint.

## Null result

Beyond the four above, this pass found no divergence. In particular it found **no behavioural drift**: no neighbouring flow depended on the identity conjunct or on the pin's clears, no published runtime or type surface changed, and the whole `drag2` suite — node, declaration and browser — is green at `8c1b20042` with the size instrument inside every budget.