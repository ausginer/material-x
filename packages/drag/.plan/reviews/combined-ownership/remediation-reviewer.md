# Feature proof: combined review remediation

**Pass:** `reviewer` (feature proof). **Commit read:** `f2ac81bc5` on `drag/feature-composition`, with a clean tree. **Range:** `7afece05a..f2ac81bc5`, which holds the owner's `92fbb93e1`, the architect's `6c1b9f83f` and the implementer's `d1a262306` to `f2ac81bc5`. **Comparison revision for emitted JavaScript:** `b01a0283d`.

**Binding sources:** [`combined-review-remediation-handoff.md`](../../combined-review-remediation-handoff.md), [`contract.md`](../../contract.md) at `f2ac81bc5`, and `DRD-39`, `DRF-6`, `DRF-8`, `DRF-9`, `DRF-10`, `DRF-12` and `DRF-16` in [`00-index.md`](../../00-index.md). The report under review is [`combined-review-remediation-report.md`](../../combined-review-remediation-report.md).

**Outcome:** the six items meet their required properties. The owner's `Fallible` change is type-only. The emitted JavaScript matches `b01a0283d`, except `shared/invalidation.js`, which differs only in the authorized JSDoc line. M1 and M2 reproduce as the report states. The report's claims that this pass checked are true. One Tier C finding is new in the range (`RR-a`), and one is in an unchanged test and is given to the architect to classify (`RR-b`). Neither one changes program behavior.

## Scope

**Covered:**

- the full diff of the range in `src/`, `tests/`, `README.md`, `.agents/docs/accessibility.md` and `contract.md`;
- the report, claim by claim, where this pass could check the claim (§Report claims);
- `src/lift.ts` `acquire` and `showKeepingFocus`, `src/kernel/session.ts`'s verdict path, `src/kernel/drag.ts`'s disposer runners, and `tests/support/harness.ts`'s `faults`, `faultMessages` and `isClean`, as far as the items depend on them;
- `faults` › "should report a platform throw and keep the controller: a hidden visual has no box", which the owner asked this pass to classify.

**Not covered:**

- the combined round itself, and the optional findings `DRF-13`, `DRF-14`, `DRF-15`, `DRF-17` and `DRF-18`, apart from checking that the range doesn't touch them;
- the plan records' text other than the contract and the report: `00-index.md` and `combined-review-assessment.md` were read only for the governing rows;
- the full Chromium suite, the size rows and the full three-engine run. This pass ran only the changed test files (§Verification run). The report's full-suite counts and size-row messages were not repeated;
- timing. No benchmark was run.

## Verification run

Run in `packages/drag`. The mutations and test runs used a scratch worktree at `f2ac81bc5`, and `b01a0283d` was built in another scratch worktree. Both worktrees were removed after the runs.

| Check | Result |
| --- | --- |
| `npx just typecheck` | Exit 0 |
| `npx just lint` | Exit 0. Neither oxlint nor ESLint printed a diagnostic |
| Emitted `.js`, `npx just build` at `f2ac81bc5` against `b01a0283d` | The same 33 files on both sides. 32 are byte-identical. `shared/invalidation.js` differs in line 2 only: ``Calls `onInvalidate` `` became ``Calls `listener` `` in the JSDoc of `listenForInvalidation`. This is the exception that the owner authorized |
| Emitted `.d.ts` | Four differ: `draggable.d.ts`, `free-drag.d.ts`, `free-drag/domain.d.ts` and `kernel/behavior.d.ts`. Each difference is item 1's exports or JSDoc. No `.d.ts` mentions `Fallible` |
| `typedoc --options typedoc.json --out <scratch>` | 0 errors and 2 warnings: `DisplacementInstaller` and `AxisInstaller` |
| `grep -rn "kernel/" src` outside `src/kernel/` | Only `src/draggable.ts`, at lines 1, 2, 4, 9, 10, 11 and 18 |
| `grep -rn RectIndexView src tests bench` | No match |
| Changed files, Chromium: `terminals`, `operation-lifecycle`, `faults`, `sortable`, `classes`, `landing`, `published-types.declaration`, `authoring.declaration` | 8 files, 127 passed |
| Changed browser files in Chromium, Firefox and WebKit, with `webkit-env.sh` sourced | 18 files, 337 passed and 2 skipped. The new assertions in `sortable` hold in all three engines |

### M1

Each export was removed alone from a copy, and `tsc -p tsconfig.json --noEmit` was run:

| Removed | First error in the declaration test |
| --- | --- |
| `VerdictAwaiter` from `src/draggable.ts` | `tests/published-types.declaration.test.ts(3,34)`: TS2305. `src/free-drag/operation.ts(5,3)` and `src/sortable/operation.ts(6,3)` fail too |
| `DragAxis` from `src/free-drag.ts` | `(5,3)`: TS2459 |
| `FreeDragSubject` from `src/free-drag.ts` | `(7,3)`: TS2459 |
| `ResolveHome` from `src/free-drag.ts` | `(8,3)`: TS2459 |

This matches the report.

### M2

The report's diff was applied: `#landingTarget` takes home from `homeInsertion(this.#query.snapshot, this.#query.item)`, and the test's `expect(faults).toEqual([])` is removed. The test fails at `tests/sortable.browser.test.ts:185`, `expect(animations.length).toBeGreaterThan(0)`: "expected 0 to be greater than 0". The landing target throws `sortable/anchor-outside-container`, so no animation runs. This matches the report.

**This pass added one more probe, M2b, because M2 never reaches the position assertion.** In M2b the else branch of `#landingTarget` is `this.#query.item.parentElement!.append(this.#context.placeholder)`, which is a wrong target that doesn't throw. The test fails at `:187`, the position assertion: "expected 80 to be less than 1". So both assertions that item 4 adds can fail. The position assertion fails when the landing goes to the wrong target, and the count assertion fails when no landing runs.

## Items

### Item 1: `DRD-39` exports (`DRF-10`)

All seven properties hold.

1. `src/draggable.ts` exports the type `VerdictAwaiter`.
2. `src/free-drag.ts` exports the types `DragAxis`, `FreeDragSubject` and `ResolveHome`.
3. Both operation modules import `VerdictAwaiter` from `../draggable.ts`. Outside `src/kernel/`, only `src/draggable.ts` imports from `kernel/`.
4. **JSDoc:**
   - `VerdictAwaiter` says it is called once, may return a value or a thenable, and that `signal` aborts when a cancel or a destruction decides first. This agrees with `session.ts`. `#requestVerdict` calls `invoke` once. `terminate()` aborts on destruction, and the decision aborts on a `canceled` outcome, which includes a fault.
   - `DragAxis` and `FreeDragSubject` have new one-line JSDoc, and `ResolveHome` already had JSDoc.
   - None of the four names a decision id, date or history.
5. `tests/published-types.declaration.test.ts` imports each of the four from its entry and annotates a value with it. M1 holds.
6. typedoc warns only for the two installers.
7. No name changed. The README has no list of an entry's exports.

**Contract agreement:**

- The public-surface table lists `VerdictAwaiter` for `draggable.js`, and the paragraph names the three `free-drag.js` types. The new rule paragraph states `DRD-39`, with the installer exception.
- DRI-18's sentence "`sortable` and `freeDrag` import only public `draggable` and `lift` values and types from the kernel" is now true by the grep above.

### Item 2: reduced-motion scope (`DRF-6`)

The property holds at all three sites.

- **`README.md`,** the **Landing** bullet: "every landing that `landing()` starts has zero duration. A custom `Landing` handles that preference itself."
- **`.agents/docs/accessibility.md`:**
  - The fulfilled requirement states `landing()`'s scope and drops the custom-behavior clause.
  - A new `[Docs]` missing requirement covers the custom `Landing`.
  - The "Updated" line adds `drag:DRD-33`.
- **`tests/landing.browser.test.ts`:** the title is "should give a landing that `landing()` starts zero duration with reduced motion". The body, which is unchanged, lands with `landing()` and records the duration that `Element.prototype.animate` receives.
- `src/shared/landing.ts` and DRI-13 are unchanged, as the handoff required.

### Item 3: DRI-3 tests (`DRF-8`)

The property holds, with the exception of `RR-a`.

- **`terminals`:**
  - The three `%s before start` cases keep `faultMessages()` and `isClean(list)`. Each can fail on a kernel that swallows the throw, reports it twice or leaves a placeholder or a lifted row.
  - The decline test keeps `faultMessages()`, which fails if the kernel reports a decline.
  - The `drag:DRI-3` describe is kept. Its two tests witness "a throw is a fault" and "`null` declines" from the `activate` sketch.
  - The new titles name what remains. The case label is `RR-a`.
- **The five `log` instances:** the report removes all five. This pass agrees, for the following reasons.
  - **The three `operation-lifecycle` instances:** no operation reaches the kernel. Either `activate` returns `null`, or `new Failing()` throws before an instance exists. Nothing else in these tests writes `log`.
  - **The two failed-acquisition instances:** each `log` assertion was the last one in its test. It could fail only if `acquire` returned. Then the first assertion, `faults.map(cause) == [shown]`, would already fail, because `showPopover` is called only in `acquire`'s synchronous path through `showKeepingFocus`. The row has no prior open popover, so the restore path never calls it.
  - **The report's reading of the handoff:** the handoff's rule was "no reachable code can make fail". The report reads the two failed-acquisition instances as "can fail only after an earlier assertion has failed". That is a narrower reading of the rule than its literal text, but the report states it in §Item 3, and it is sound for these two tests.

### Item 4: titles (`DRF-9`)

The property holds.

- **`classes`:** the title lost its `cancelLanding` clause, and the body is unchanged.
- **`sortable`:** the test records `item.getBoundingClientRect().top` right before `requestCancel()`, pauses each animation at time 0, asserts that at least one animation exists and asserts that the top is within 1 px. This is the method of the sibling W1 test.
  - M2 fails the count assertion, and M2b fails the position assertion.
  - The new comment ("At its first frame the flight shows the visual where it was canceled only when its target is the item's home, where the release puts the item") agrees with `lift.ts`. The flight starts at `displacement - (target - rect)` from the item's place in the flow, so the item's first frame is where it was canceled only when the target is that place.

### Item 5: `RectIndexView` (`DRF-12`)

The property holds. The interface and its comment are deleted, and `RectIndex` has no `implements`. Its getters `values`, `placeholderRect`, `items` and `count` are the read-only view. No other file names the interface.

### Item 6: stale comments (`DRF-16`)

The property holds.

- `invalidation.ts:1` names `listener`, which is the parameter.
- `linear-shift.ts:84` names `__DEV__`. `advanceUnchecked` is written at line 100, which is inside the `__DEV__ &&` guard, and at line 179, which is inside `if (__DEV__)`.
- `authoring.declaration.test.ts:215` says "`false` is not an operation".

## The owner's `Fallible` change (`92fbb93e1`)

- **What changed:** `src/kernel/drag.ts` declares `interface Fallible { raise(error: unknown): void }`. `runDragDisposer` and `runDisposers` take it in place of `Pick<Gesture<never, never, never>, 'raise'>`, and `Gesture` declares `implements DraggableController<Operation>, Fallible`. The type import of `Gesture` into `drag.ts` is gone, so `drag.ts` no longer depends on `gesture.ts`, even as a type.
- **Effect:** type-only. Every emitted `.js` file except `shared/invalidation.js` is byte-identical to `b01a0283d`'s, including `kernel/drag.js` and `kernel/gesture.js`. No emitted `.d.ts` names `Fallible`, so the change publishes nothing.
- **The declaration kind** agrees with CONTRIBUTING §TypeScript: a class implements this contract and the runners accept it. `Fallible` has no JSDoc. It is an internal kernel declaration, and the declaration-kind question for the remaining declarations is `DRO-13`, which the handoff leaves out of scope. So this pass reports no finding on it.

## The lint exception

The report adds `// oxlint-disable-next-line typescript/no-extraneous-class -- an operation class whose constructor throws` above `Failing` in `operation-lifecycle`. It removes the `class-methods-use-this` directive that was on the deleted `start`. So the file still has one directive.

**Assessment:** the directive is acceptable, and it hides no defect.

- The kernel can't tell `new Failing()` apart from any throw inside `activate` after a `use`. So the class isn't needed for what the test asserts: an outcome of `canceled` and the fault message `constructor`.
- The class keeps the authoring form that the title names, "when the operation constructor throws". `DRD-30` allows class operations.
- The directive gives its reason.
- **Alternatives:**
  - A function that throws would test the same kernel path with no directive, but the title would then name a form that the test doesn't use.
  - An empty method would replace this directive with a different lint exception.

Which form to keep is a test-style choice, not a defect.

## Report claims

Each claim in the report that this pass could check is true:

- the commit table;
- the import grep;
- the 33 emitted `.js` files, the one difference and the four `.d.ts` files;
- the typedoc count;
- the M1 table;
- the M2 diff and its failing line;
- the `RectIndexView` grep;
- the reasons for each `log` instance.

The report doesn't list two things as deviations. It states both openly, and they don't change the result:

- The commit messages carry the attribution trailers below the subject. The report names this.
- Item 3's narrower reading of "no reachable code" (§Item 3 above).

**States for the architect, not findings:**

- `00-index.md`'s `DRD-39` status row still says "Not implemented yet".
- The `DRF-6`, `DRF-8`, `DRF-9`, `DRF-10`, `DRF-12` and `DRF-16` rows are still open.

The architect closes those rows after this pass.

## Findings

### Case label in DRI-3 names a fault before the throw (`RR-a`)

**Tier C.**

- **Current behavior:** in `tests/terminals.browser.test.ts`, the retitled test is `'should report a throw from activate once and leave the list clean: %s before the throw'`, parameterized over `cancel`, `destroy` and `fault`.
  - For `cancel` and `destroy`, `activate` calls `requestCancel` or `requestDestroy` and then throws, so "cancel before the throw" and "destroy before the throw" describe the body.
  - For `fault`, nothing runs before the throw: the throw is the fault. The rendered title, "…: fault before the throw", describes a step that the body doesn't have.
- **Why it is a problem:** `DRF-8`'s remediation requires that the title name what the test does. The earlier label, "%s before start", read correctly for all three cases. The retitle made the `fault` case wrong.
- **Evidence:** `tests/terminals.browser.test.ts`, the first `it.each` in `drag:DRI-3 terminals`, at `f2ac81bc5`, and `git show 18ba9ab58 -- packages/drag/tests/terminals.browser.test.ts`.
- **Required property:** each case's rendered title describes what that case's body does before the throw.

### The hidden-visual test's first `log` assertion witnesses the lift's throw, not the kernel (`RR-b`)

**Tier C. Not a `DRF-8` instance under the handoff's rule. Given to the architect to classify.**

**Current behavior:** `faults` › "should report a platform throw and keep the controller: a hidden visual has no box" is unchanged in the range. It sets `display: none` on `#r0` after the press and crosses the threshold. `activate` calls `lifter.acquire(drag)` and then returns `{ start: () => log.push('start') }`. The test then asserts:

1. `expect(log).toEqual([])`;
2. `expect(faults).toHaveLength(1)`;
3. after a second drag of `#r1`, `expect(log).toEqual(['start'])`.

**What each assertion witnesses.** These are the probes this pass ran, in a scratch copy:

| Probe | Result |
| --- | --- |
| **H1:** `acquire` no longer throws `lift/visual-no-box-space`. The test is as committed | Fails at assertion 1: "expected [ 'start' ] to deeply equal []" |
| **H2:** H1, with assertion 1 removed | Fails at assertion 2: "expected [] to have a length of 1 but got +0" |
| **H3:** source intact, with assertion 1 removed | Passes |

- **Assertion 1 can fail on reachable code,** so it is not the class that `DRF-8` describes. It fails when `acquire` returns for a visual with no box, which is a lift defect.
  - **No kernel defect can fail it.** The hooks object is built only after `acquire` returns, so when `acquire` throws, the kernel never receives `start`.
  - **It adds no detection.** H2 shows that assertion 2 catches the same lift defect. Assertion 1 is a second witness of "`acquire` threw inside `activate`".
  - **Classification:** at `d7e7b0d3a` the lift was the behavior's `lift` member and `start` was the behavior's hook, so assertion 1 then witnessed DRI-3's "no `start` after a failed acquisition". That is the same history as `DRF-8`, through `DRD-27` and `DRD-30`. But the handoff's rule keeps an assertion that reachable code can fail, and the report correctly left this one alone.
- **Assertion 2 counts faults and doesn't identify them.** Any one fault passes it, not only `lift/visual-no-box-space`. So "a hidden visual has no box" is witnessed only by assertions 1 and 2 together: one fault, raised before `activate` returned.
- **Assertion 3 witnesses "keep the controller".** A kernel that stays broken after a throw from `activate` fails it.
- **"A platform throw" in the title isn't what the body produces.** The throw is the library's own `new Error('lift/visual-no-box-space')` in `Lifter.acquire` (`src/lift.ts:268`), and no platform call throws.
  - DRI-7 lists "a platform call" among the sources of a fault, and this test doesn't exercise that source.
  - The title is the same at `b01a0283d` and at `cb0a4a235`, so the combined round could have found it. It is reported here only because the owner asked this pass to classify the test.

**Why it is a problem:** the title names a source of the fault that the body doesn't produce, and its subject ("a hidden visual has no box") is witnessed only indirectly. That is `DRF-9`'s class, which is title against body, rather than `DRF-8`'s class, which is an assertion that can't fail. No program behavior changes.

**Evidence:** `tests/faults.browser.test.ts:242-274` at `f2ac81bc5`, `src/lift.ts:262-269`, `git show d7e7b0d3a:packages/drag/tests/faults.browser.test.ts`, and probes H1 to H3 above.

**Required property:** the test's title names only properties that its assertions can fail on. If the test is a witness for the lift's box check, an assertion identifies that fault.

**Routing:** whether this is an instance of `DRF-8`, of `DRF-9` or of neither, and whether it is owed before merge, is the architect's decision. This pass mints no `DRF` id.

## Next

The architect reads this pass and closes or keeps the remediation's rows, and decides `RR-a` and `RR-b`.