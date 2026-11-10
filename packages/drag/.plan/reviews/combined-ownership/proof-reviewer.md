# Feature proof: combined ownership round

**Pass:** `reviewer` (feature proof). **Commit read:** `b01a0283d` on `drag/feature-composition`, with a clean tree. The production code is `50ed18a17`'s, and the later commits change only `.plan/`. **Range:** `d7e7b0d3a..b01a0283d`.

**Binding sources:** [`contract.md`](../../contract.md) and [`00-index.md`](../../00-index.md), `DRD-14` to `DRD-38` as amended. The handover is [`callback-list-completion-assessment.md`](../../callback-list-completion-assessment.md) §6, with the owner's correction that `DRO-7` and `DRO-8` are accepted.

## Scope

**Covered, by reading at `b01a0283d`:**

- `src/kernel/*` (`gesture`, `session`, `drag`, `callback-list`, `behavior`, `admission`, `outcome`), `src/draggable.ts`, `src/fault.ts`, `src/lift.ts`, `src/lift/landing.ts`, `src/shared/landing.ts`, `src/shared/invalidation.ts`;
- `src/free-drag.ts` and `src/free-drag/{behavior,operation,bounds,drop-targets,geometry}.ts`;
- `src/sortable.ts` and `src/sortable/{behavior,operation,collection,axis,y,linear-shift,layout-animation,placement}.ts`, plus the parts of `rect-index.ts` and `xy.ts` that hold caches;
- `README.md`, `package.json`, `files.json`, `typedoc.json`, `tsconfig.json`, `tsconfig.docs.json`, `eslint.config.ts`, and the size ceilings in `bench/size/measure.ts`;
- outside the package: the range's diffs of the root `eslint.config.ts`, `.oxlintrc.json`, `.oxfmtrc.json`, `.scripts/vitest-config.ts`, `packages/box-quad/tests/local-delta.browser.test.ts`, `packages/drag2/.scripts/entry.ts` and its test, and `d8d57383e` in `packages/core`, `packages/tproc`, `packages/size-limit-preset-rolldown`, `packages/vite-traits-plugin` and `.scripts/css/debug.ts`.

**Tests.** A sub-agent did the discovery pass for mandate item 2. It compared each test at `d7e7b0d3a` with the HEAD version, and it compared the six files added at `03a280e2a` with that commit. This pass read and confirmed or rejected each candidate that it returned (§Migrated and rewritten tests). This pass itself read `authoring.declaration`, `classes`, `terminals`, `operation-lifecycle`, the failed-acquisition block of `faults`, `drop-targets`, the `DRF-5` test and the `items()` tests in `sortable`.

**Not covered:**

- `bench/compare.ts`, `bench/heap-snapshot.ts` and `bench/lab-no-lift.ts`, beyond their diff stat (timing is deferred, `DRF-1`);
- `sortable/rect-index.ts`, `xy.ts` and `keyboard.ts`, beyond their invalidation and retirement paths;
- the stories (`*.stories.tsx`), which only typecheck covers;
- `package-lock.json`, beyond the fact that `type-fest` is the package's only new dependency;
- no timing, size re-base or allocation measurement was taken.

## Verification run

| Check | Result |
| --- | --- |
| `npx just typecheck` | exit 0 |
| `npx just lint` | exit 0. Neither tool printed anything, so no unused directive is reported (`DRD-37` property 3) |
| `npx just test` (Chromium) | 379 passed and 6 failed. The six failures are the size rows: `draggable alone`, `example: resize handle`, `example: drop zone`, `freeDrag`, `freeDrag + bounds + landing` and `complete` |
| `npx just test-engines`, with `~/.cache/ms-playwright/webkit-env.sh` sourced | 72 files: 1041 passed and 18 skipped. Without the script, WebKit doesn't launch |
| `grep -rn 'unbound-method'` over the package's `.ts` files | Only the block in `eslint.config.ts` |
| Declarations emitted by `tsdown` into scratch, with `exports: false` | No shipped `.d.ts` imports `type-fest`. `KernelDrag` isn't emitted, so `type-fest` in `devDependencies` satisfies `DRD-29` |

Each mutation below was made in a scratch worktree at `b01a0283d`. Its node modules were linked to the main checkout's, and the worktree was removed afterwards.

## Repaired findings

### DRF-4 at `79be2c938`: holds

**(a) Required property:** the class witness and the built-ins call `draggable` without type arguments, and the witness calls a member that only its class operation has, from a controller step.

- `src/free-drag.ts:53` and `src/sortable.ts:56` call `draggable(root, behavior)`.
- `tests/authoring.declaration.test.ts` › "should accept class instances with extra members" calls `draggable(root, new Behaving())` and then `panel.requestStep((operation) => { operation?.nudge(); })`. `nudge` exists only on the class `Operation`. If inference fell back to `BehaviorOperation`, this line would fail to typecheck. Typecheck passes.
- `freeDrag`'s `moveTo` step calls `operation?.moveTo(point)`, a member that only `FreeDragOperation` has.
- No comment in `src/` or `tests/` repeats the false inference claim. `grep -rn inferen src tests README.md` finds nothing. The README's sentence is the corrected rule.

**(b) Required property:** the session-reach test asserts that the `Drag` that `activate` receives has no `phase`, `next` or `decision`.

- "should not let a controller or a drag reach the session" has a literal whose `activate(drag)` carries three `@ts-expect-error` lines, on `drag.phase`, `drag.next` and `drag.decision`.
- These can fail. `drag` is the public `Drag`, and a member added to it, or a `drag` typed `any`, would leave a directive unused.
- The trailing operation block stays, as §6 allowed. It witnesses the contract's type requirement that `BehaviorOperation` names no session member.

### DRF-5 at `8626b04fd`: holds

**Required property:** C4 of `DRD-33`. No operation clamps against a box read before it activated. The regression test fails at the unrepaired source in three engines and asserts that the scroll happened.

- **By reading.** `FreeDragBehavior.activate` calls `this.bounds?.invalidate()` right after `this.#lifter.acquire(...)`. The first read of the bounds in the operation is `operation.translate()`, which is the last statement of `activate` and reaches `#computeMotion`, then `bounds.apply`, then `resolve`. Nothing between the invalidation and that read uses the box.
- **By mutation.** With the line removed, "should clamp against bounds measured again after a scroll between operations (drag:DRF-5)" fails in Chromium, Firefox and WebKit. Each engine received `boxTop: 200` where `50` was expected, with `arenaBefore: 200` and `arenaAfter: 50`. So the scroll is asserted, and the test can't pass without it. The other 8 tests in the file pass in each engine.
- **At `b01a0283d`** the test passes in the full three-engine run.
- **The other controller-lifetime geometry caches** are also invalidated before their first use in an operation:
  - `sortable` calls `this.axis.invalidate()` at the end of `activate`. Before that, `activate` reads only the snapshot.
  - `linearShift.invalidate` resets `rowDistance`.
  - `xy`'s `invalidate` covers its `RectIndex`.

## Migrated and rewritten tests

The sub-agent returned nine candidates. This pass's reading of each:

| Candidate | Result |
| --- | --- |
| `terminals` › "should deliver no terminal without a start: %s before start" and "should deliver no start or end when activate declines, and no report" | **Confirmed.** See `reviewer-1` |
| `classes` › "should run draggable controller methods called on the controller, with cancelLanding passed detached" | **Confirmed:** the title claims a property the body can't fail. See `reviewer-2` |
| `sortable` › "should land at home when a cancel comes between an in-place change and invalidate" (added in the range) | **Confirmed:** the title over-claims. See `reviewer-2` |
| `operation-lifecycle`, three `expect(log).toEqual([])`, and `faults`' failed-acquisition block (both added in the range) | Same pattern as `reviewer-1`, but the other assertions in each test carry its subject. Listed under `reviewer-1` as instances, not as separate findings |
| `authoring.declaration` › "should let a controller step name no lift member on the operation" | **Rejected.** The contract's type requirement says that `BehaviorOperation` names no lift member, and adding `lift` to `BehaviorOperation` fails this test. So it witnesses that requirement |
| `release` › "should release in the fixed order" | **Rejected.** The order comes from the documented composition, `acquire` before any other `drag.use`, which DRI-9 step 5 and DRI-18 make a precondition of the lift's guarantees. The test composes the lift that way |
| `destruction` › "should retain no drag view or state after a custom behavior is destroyed" does not track the returned operation | **Rejected.** That operation's `start` closes over `drag`, which the test tracks, so a retained operation would also retain `drag` |
| `landing` › the reduced-motion test now exercises only `landing()` | **Not a test defect.** It follows `DRD-33`. The over-broad claim is the README's, `reviewer-3` |
| `authoring.browser` › "should render a nudge from foreign code through requestStep" | Unchanged since `d7e7b0d3a`, so out of the range's migration. Not pursued |

The sub-agent compared the remaining files hunk by hunk and judged them unchanged in subject. This pass didn't repeat those comparisons:

- `requests`, `verdict`, `destruction`, `release`, `landing`, `coordinates`, `click-guard`, `focus`, `frameworks`, `hot-path`, `free-drag`, `sortable`, `authoring.browser`, `exports` and `size`;
- `activation`, `order`, `commit`, `input` and `scoped-requests`, against `03a280e2a`;
- `drop-targets`, `callback-list.browser` and `callback-list.declaration`, and the three fixtures.

## Contract proof

Established by reading at `b01a0283d`, with each claim against the clause it serves:

- **One gate and the reader's precedence** (`DRD-1`, `DRD-32` and `DRD-34` properties 3 to 5). `#running` is written only in `Gesture.enter`. The order in `#applyRequests` is destruction, `steps.run`, then `session.advance()`. `enter` refuses during a pass, and after teardown through `#destroyed && !#resolveDestroyed`. Only a refusal with a step is counted, through `countedRefusals`. A request passes no step, and `requestDestroy` on an idle controller is not refused.
- **Steps and disposers with receivers** (`DRD-35` properties 2 to 4, `DRD-36`):
  - every path calls `.call(receiver, …)`: the idle first step in `enter`, `CallbackList.run`, `runDragDisposer` and `runDisposers`;
  - coalescing is `has` then `add`, during a pass only;
  - a queue adds with `unshift` and a stack with `push`, and `run` takes the receiver and then the callback with `pop`;
  - a late `use` on the session's `Drag` and on the controller runs at once.
- **Scope of a `Drag`** (`DRD-16`, `DRD-26`). `requestStep` and `requestCancel` test `#phase !== ENDED`, and `stepTarget` gives the operation only while `ACTIVE` and undecided. `ENDED` is entered at `#endPending`, at either detach in `#conclude` and its terminal step, and first in `terminate`.
- **DRI-9's order.** `#conclude` closes motion, aborts the verdict on a cancel, runs `settle` on the held operation, then `#release`, which aborts `drag.signal` and runs the disposers last in first out.
  - With an operation, detach and `end` are the next step, with focus restored in a `finally`.
  - Without one, focus is restored right after release.
  - The lift registers the landing disposer and then the restore, so the restore runs first and the landing starts after it, even when the restore throws.
- **DRI-10.** `#teardown` clears the destruction slot, the session slot and the steps, terminates the session, runs the controller disposers and aborts the listeners. `sortable` registers `cancelLanding` last, after `displacement.retire`. `freeDrag` registers only `cancelLanding`.
- **DRI-13 and `DRD-33`'s landing capability:**
  - `lift.ts` imports `Landing` as a type only, and holds no animation, `matchMedia` or default timing;
  - `land` calls `timing` once and copies `duration` and `easing` into `named` after the call, so a throw records nothing;
  - `acquire`'s `finally` cancels the running landing after measuring.
- **DRI-21 and the `dropTargets` factory, the report's limits:**
  - **The factory's order** is as `DRD-33` requires: it allocates the state and the frame task, registers the release (`frame.cancel()` and `mark(null)`) with `drag.use`, and then calls `options.targets()`.
  - **The tracker.** `move` only schedules. The frame only calls `drag.requestStep(resolve)`. `drop` cancels the frame and resolves at once. Each tracker starts with `stale = true`.
  - **Both limits are unobserved, as reported.** With the release moved after the pull and `frame.cancel()` removed, `drop-targets` and `free-drag` still pass in Chromium (17 of 17).
  - **Why neither is a defect, by reading.** `targets()` is the first point where anything could need release, so nothing exists to leak before it. A frame that fires after release calls `requestStep` on an ended session, which does nothing. No pass can sit between release and `ENDED` while a frame fires, because conclusion and the terminal step run in one pass. A destruction requested in `settle` or a disposer runs `terminate`, which enters `ENDED` first. So both properties hold by reading, and only by reading.
- **`freeDrag`'s invalidation** (`DRD-33`). The listener is registered only when `bounds` or `targets` is configured. Through `handleEvent` it invalidates the bounds and the tracker. The controller's `invalidate` step reaches the tracker only through the step's operation.
- **DRI-14 and `DRD-31`:**
  - `rebase` assigns `#home` before the item test;
  - `settle`, `#recordResult` and `#landingTarget` read only `#home`, the placeholder and the DOM;
  - a command's target comes from the activation pull.
- **The public surface:**
  - every entry and type that the contract lists is exported, and `exports.node.test.ts` checks the map;
  - `Drag` and `Lift` are `Readonly<{…}>` aliases (`DRD-38`);
  - `DraggableController` declares methods, and the built-ins' controllers declare function-type properties.

## Findings

### `reviewer-1`: DRI-3 "no terminal" tests migrated into assertions that can't fail

**Tier C.** The migrated DRI-3 tests in `terminals.browser.test.ts` assert `expect(log).toEqual([])` on hooks of an object that the kernel never receives.

- **Finding.** "should deliver no terminal without a start: %s before start" (three cases, L33–66) and "should deliver no start or end when activate declines, and no report" (L68–91).
- **Current behavior.**
  - At `d7e7b0d3a`, `start` and `end` were hooks of the behavior, which the kernel could call. Each test checked that the kernel didn't call them after `activate` threw or declined.
  - At HEAD, the hooks are on a local `const operation: BehaviorOperation`. `activate` discards it with `void operation` before it throws or returns `null`, and the comments say so: "never reaches the kernel".
  - So the `log` assertion can't fail, whatever the kernel does. The tests' other assertions still check something: `faultMessages()` and `isClean(list)` in the first, and `faultMessages()` in the second.
- **Why it is a problem.** The titles and the `drag:DRI-3` describe present these as witnesses that the kernel delivers no `start` or `end` after a failed or declined activation. After `DRD-30` that property holds by construction for these cases, so the assertion reads as evidence that it doesn't provide. This is the defect class of `DRF-4` (b): a migrated test whose subject silently became something else.
- **Same pattern, lower weight.** The tests below were added in the range, and their other assertions carry each test's subject:
  - `operation-lifecycle.browser.test.ts` L60 (`void operation; return null`), L79 (a constructor that throws) and L106 (no hooks at all);
  - `faults.browser.test.ts` L330 and L357, where `acquire` throws before the operation literal is built.
- **Evidence.** The code at the lines cited above. `git show d7e7b0d3a:packages/drag/tests/terminals.browser.test.ts`, L33–79. `Session.#activate` in `src/kernel/session.ts`: `start` is called only on the value `activate` returned.
- **Required property.** Every assertion in a DRI-3 terminal test can fail when the kernel violates the property its title names. An assertion that can't fail under the current API isn't presented as that property's witness.

### `reviewer-2`: two test titles claim a property the body does not assert

**Tier C.**

**Finding 1.** `classes.browser.test.ts` › "should run draggable controller methods called on the controller, with cancelLanding passed detached" (L37–70).

- **Current behavior.** The body passes `lifter.cancelLanding` to `controller.use` and then destroys the controller. No landing is ever started, because nothing calls `lift.land`. The test checks neither `faults` nor anything that `cancelLanding` produces. The only log entries come from `end` and from another controller disposer.
  - If `cancelLanding` became a prototype method, it would throw when detached. That throw would be reported as a `DragFault`, and the test would still pass.
  - At `03a280e2a` the test destructured the four controller methods and called each one detached. The `DRD-34` migration correctly moved those calls onto the controller, and added the `cancelLanding` clause to the title.
- **Why it is a problem.** The title names a contract guarantee, "`Lifter.cancelLanding` … Works when detached", that this test can't fail on. The property is still witnessed elsewhere: `destruction.browser.test.ts` › "should cancel a running landing and the row animations" uses `sortable`, which passes `cancelLanding` detached to the controller's `use`.

**Finding 2.** `sortable.browser.test.ts` › "should land at home when a cancel comes between an in-place change and invalidate" (L150–172, added at `0e7e1c7ef`).

- **Current behavior.** It composes a 10-second landing, but it asserts only `faults` and the canceled result. Its siblings pause the flight and compare positions. The items-borrowing report records that the "home from the retained array" mutation fails this test only through a `sortable/anchor-outside-container` fault.

**Evidence.** The bodies cited above. `git show 03a280e2a:packages/drag/tests/classes.browser.test.ts`, L25–55.

**Required property.** A test's title names only properties that its assertions can fail on.

### `reviewer-3`: the README still says that every landing has zero duration under reduced motion

**Tier B.**

- **Finding.** `README.md`, § Focus and landing limits, the **Landing** bullet: "With `prefers-reduced-motion: reduce`, every landing has zero duration."
- **Current behavior and contract.**
  - Since `DRD-33` the lift has no animation of its own. DRI-13 now reads "every landing that `landing()` starts has zero duration", and "A third-party `Landing` owns its own animation".
  - The contract's change record for `DRD-33` states the narrowing: "reduced motion covered a landing that a custom behavior named with no timing" is the old text.
  - The README sentence is unchanged since `d7e7b0d3a`. The README's own lift section now invites a custom `Landing` (`land(x, y, landing)`, "a custom timing is `{ ...landing(), timing }`"). The JSDoc of `landing()` in `src/shared/landing.ts` states the narrow form.
- **Why it is a problem.** An integrator who writes a `Landing` with its own `start` reads that the library guarantees reduced motion for every landing. It guarantees that only for `landing()`.
- **Evidence.** `README.md` L251. `contract.md` DRI-13 and its change-record row for `DRD-33`. `git show d7e7b0d3a:packages/drag/README.md`, L122.
- **Required property.** The README states the reduced-motion guarantee with DRI-13's scope.

### `reviewer-4`: `d8d57383e`'s conversions in `packages/core` are not read against the clarified TypeScript rule

**Tier C, routed to the architect.** This is a declaration-kind call, not a defect this pass decides.

- **Finding.** `d8d57383e`, of 2026-11-08, converted `CommitTracker`, `DragSession` and `KeyboardSession` in `packages/core/src/traits/reorderable.ts` from `Readonly<{…}>` types to interfaces, under the TypeScript rule of that date. It also converted `TokenManager` and `ModuleLoader` in `packages/tproc` and `Flattening` in `packages/vite-traits-plugin`.
- **Current behavior and contract.**
  - `2bec0c431`, of 2026-11-09, clarified CONTRIBUTING's TypeScript section: "Use `type` for the shapes of concrete values the library creates and gives to callers, including objects with function members … The presence of methods or the possibility of writing `implements` does not make a value shape an implementation contract."
  - The three `core` shapes are values that module-private factories in the same file create, such as `createCommitTracker`.
  - `DRO-13` reads the declaration kinds for `packages/drag` only. No record reads `d8d57383e`'s conversions in the other packages against the clarification.
- **Why it is a problem.** Under the current rule these declarations appear to be the wrong kind, and no decision says that they stay. No consumer behavior changes.
- **Evidence.** `git show d8d57383e -- packages/core packages/tproc packages/vite-traits-plugin`. `git show 2bec0c431 -- CONTRIBUTING.md`. `00-index.md` `DRO-13`.
- **Required property.** Each declaration that `d8d57383e` converted outside `packages/drag` either follows the clarified TypeScript section, or a record states why it stays an interface.

**No Tier A finding.** The kernel, the lift, both built-ins and both capabilities conform to the contract and to `DRD-14` to `DRD-38`, as far as this pass read them and as §Contract proof states.

## States that differ from the handover

**None.** The handover's states hold:

- the six size rows fail under `DRO-4`;
- `DRO-10`'s excess wasn't re-measured;
- the deferred items are unchanged: timing, `DRF-1`, `DRO-13`, an unused directive as a lint failure, and `DRO-3`;
- the three-engine counts match the completion report: 1041 passed and 18 skipped;
- `DRO-7` and `DRO-8` are accepted, as the owner stated.