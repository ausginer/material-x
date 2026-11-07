# Ownership report

**Input:** `drag/production` at `a343b3d45`, which carries [`ownership-handoff.md`](ownership-handoff.md). **Governing records:** `DRD-26`, `DRD-27` (revised 2026-11-07) and `DRD-28` in [`00-index.md`](00-index.md), and [`contract.md`](contract.md).

**Outcome:** the three items landed in order. The handoff's stop condition was met once, in item 3, by an existing test edit outside the handoff's list. The owner approved that edit in this session (§Edits beyond the handoff's list). Nothing is returned to the architect. **No cost is accepted, and no ceiling or control is re-based.** The figures below are for `DRO-7`. No timing reading was taken.

| Commit | Item | Content |
| --- | --- | --- |
| `039e8e153` | 1 | `lift` and `fault` back at the source root, `draggable.ts` exports the kernel's types, the four assertions restored, `kernel` packaged (`DRD-28`) |
| `433a0e06c` | 2 | The session's ended state, `isCurrent` removed, three witnesses (`DRD-26`) |
| `89995c27e` | 3 | The kernel without lift, `createLifter`, the built-ins, tests and documentation in the new form, `type-fest` removed (`DRD-27`) |
| the commit carrying this report | 4 | This report and [`2026-11-07-ownership-gates.txt`](measurements/2026-11-07-ownership-gates.txt) |

Raw size output, witness and mutation runs and suite counts are in [`2026-11-07-ownership-gates.txt`](measurements/2026-11-07-ownership-gates.txt).

## Item 1: module layout and public entries (`DRD-28`)

- `git mv` of `src/kernel/lift.ts` and `src/kernel/fault.ts` to `src/`. `src/draggable.ts` re-exports, type-only, `Admission`, `Behavior`, `Drag`, `DragDisposer`, `DraggableController`, the five outcome types, and `LiftedAdmission`, `LiftedBehavior` and `LiftedDrag`.
- `sortable.ts`, `free-drag.ts` and `src/lift.ts` import kernel types only from `./draggable.ts`. Nothing outside `src/kernel/` and `src/draggable.ts` imports from `src/kernel/`.
- The four `!` assertions are as at `0dcb80fb1`. `git diff 0dcb80fb1 039e8e153 -- src/sortable.ts src/free-drag.ts` shows only import lines.
- `kernel` was added to `package.json`'s `files` and `files.json`'s `clean.extras`.
- **Test edit:** only the module list for `draggable` alone in `tests/size.node.test.ts`. It now lists `src/kernel/drag.ts`, `src/kernel/gesture.ts` and `src/kernel/session.ts`. `typedoc` resolves `typedoc.json` unchanged, with 0 errors.

| Check at `039e8e153` | Result |
| --- | --- |
| Typecheck, lint | Pass |
| Three-engine suite | 63 files, 878 passed, 16 skipped (894), the same as at `2506dcbb6` |
| `just test` | 7 failed, 311 passed (318). The failures are the seven size rows that were already red at `2506dcbb6` |
| `npm pack --dry-run` after `just build` | Lists `kernel/{admission,behavior,drag,gesture,outcome,session}.d.ts`, and `kernel/drag.js`, `kernel/gesture.js` and `kernel/session.js` with maps |
| Emitted `draggable.d.ts` | Exports the listed types |

## Item 2: the session ends itself (`DRD-26`)

- **The ended state is a fifth phase value, `ENDED`**, so no field or allocation is added. It is entered at the four points in `DRD-26`'s table: in `#endPending` after both aborts, before `detach`; in the conclusion without `start`, before `detach` and focus; in the terminal step, before `detach` and `end`; and as the first statement of `terminate`.
- `drag.requestStep`, `drag.requestCancel` and `Escape` check `phase !== ENDED`. The completion is consumed on `phase === ENDED || decision`. `advance` concludes on `phase < CONCLUDED` instead of `!== CONCLUDED`. The two have the same result in every reachable state, because an ended session is not in the slot.
- `Gesture.isCurrent` is removed. `grep isCurrent src` finds nothing. Release stays separate: `drag.signal` and a late `use` still read `#operation`.

| Witness | Cites | At `039e8e153` (no ended state) | Mutation, and its result at `433a0e06c` |
| --- | --- | --- | --- |
| `requests` › "should run a step requested in settle before end with null, and none requested in end" | `drag:DRI-8` | Passes in three engines | (a) Enter ended at the start of conclusion: fails, the log is `['settle', 'end']`. (b) Enter ended after `end`: fails, the `end` step runs |
| `destruction` › "should not apply an Escape dispatched by the verdict abort during destruction" | `drag:DRI-10` | Passes in three engines | `Escape` doesn't check ended: fails, `defaultPrevented` is `true` |
| `destruction` › "should not report a thenable rejected by the verdict abort during destruction" | `drag:DRI-10` | Passes in three engines | The completion doesn't check ended: fails, one `DragFault` is reported |

Destruction is requested inside a pass, from a controller step, in both destruction witnesses.

| Check at `433a0e06c` | Result |
| --- | --- |
| Three-engine suite, no existing test edited | 63 files, 887 passed, 16 skipped (903) |
| Per-sample allocation test | Passes (Chromium) |
| Typecheck, lint | Pass |

## Item 3: the kernel knows no lift (`DRD-27`)

**The kernel.** `Session` has no lift, no retained admission, no acquisition, no landing and no hold. Activation is the decline for a disconnected item, capture, `activate` and `start`. Its conclusion calls `settle` and ignores the return value. `Gesture` has no landing slot. `takeLanding` and `keepLanding` are removed, and teardown terminates the session, runs the controller disposers and aborts the root's listeners. The `Drag` is built in the session's constructor as an object literal typed `KernelDrag<State>`. That is a `-readonly` mapped type declared in `src/kernel/drag.ts`, which no public entry exports. The only assertion left is `admission.state as State`. There is one `Behavior<State, Verdict>`, `settle` returns `void`, and `draggable` has one signature with no assertion.

- `grep -rniE 'lift|landing' src/kernel src/draggable.ts`: nothing.
- `grep -rn "type-fest\|Writable\|as unknown" src`: nothing.
- `git diff 0dcb80fb1 -- package-lock.json` from the repository root: empty.

**The lift (`src/lift.ts`): a closure.** `createLifter(window)` returns `{ acquire, cancelLanding }`. No function it hands out reads `this`, so `cancelLanding` and `acquire` work when detached. `acquire`:

1. measures the rect, the box size, both spaces, the box matrix and the UA values;
2. captures the inline declarations and the popover state;
3. creates the `Lift`;
4. registers two disposers with `drag.use`: the landing's first, then the release;
5. writes.

So the release runs before the landing, and a throw from the release still lets the landing start, as a separately reported fault. A `try`/`finally` around the whole acquisition cancels the lifter's running landing after measuring, also on a throw. That is the same span the kernel's `finally` covered at `bb644d6d7`. The release restores the top layer only if the acquisition reached the popover write (a `promoted` flag), and then always restores the inline declarations. So it is total over a partial acquisition, and it doesn't hide and re-show a popover the page had open when the throw came before the popover write. The `report` parameter and the local restore are gone. `Landing` is unchanged.

**The built-ins.** Each factory calls `createLifter(root.ownerDocument.defaultView!)`, which is the same window the behavior's constructor reads, passes the `Lifter` to the constructor, and calls `kernel.use(lifter.cancelLanding)`. In `sortable` that registration comes after the displacement's. `activate` acquires first: in `sortable`, before the second pull. The state holds `lift: Lift | null`, `null` from admission, and the admission's `visual` (and `box` in `sortable`). The consumer's `visual`, `box` and `handle` callbacks run at admission in the same order as before. `settle` calls `lift.land` where it returned a landing. `free-drag/geometry.ts`, `landingTarget` and the placeholder's argument read the `Lift`. Hooks that run after `activate` read `drag.state.lift!`.

**Fixtures and instruments.**

- `tests/fixtures/drop-zone.ts` composes the lift in the new form.
- `bench/size/measure.ts` imports `createLifter`. The row names and module lists are unchanged.
- `bench/compare.ts`: the patch strings that named `LiftedDrag` and `drag.translate` now name `Drag` and `drag.state.lift!.translate`.
- Neither story nor `bench/lab-no-lift.ts` names a removed value or type, so neither changed.

**Documentation.**

- README: the hook table's `settle` and `end` rows, §Coordinates, and §The lift, with the composition example and DRI-18's condition.
- TSDoc on `draggable`, `Behavior`, `Admission`, `createLifter`, `Lifter`, `Lift` and `Landing`. `Drag`'s TSDoc was already free of lift members and is unchanged.

### Existing tests

**Within the handoff's list:**

- Every behavior that composed `lift` now composes it inline, with no helper. That is one `Lifter` per controller with `cancelLanding` passed to `use`, `acquire` as the first statement of `activate`, the `Lift` in state, and `land` where `settle` returned a landing. Files: `activation`, `classes`, `commit`, `coordinates`, `destruction`, `faults`, `focus`, `landing`, `release` and `requests`.
- Member reads go through the `Lift`.
- `tests/authoring.declaration.test.ts` now states the new type requirement.
- `tests/exports.node.test.ts` needed no change, because the entries are unchanged.
- No expected value, log, count or order changed except the one below. "should release in the fixed order" keeps its log.

**Edits beyond the handoff's list:**

- **`hot-path` › "should allocate per sample only the CSS string a lifted write needs"** expected the allocating function in `lift.ts` to be named `lift.ts:drag.translate`. V8 named it after the old `drag.translate = …` assignment, and it is now `lift.ts:translate`, a member of the `Lift` literal. The bytes are unchanged in kind: 30144 B over 300 samples, all from the CSS string. **The owner approved renaming the expected key in this session** (2026-11-07). This was the handoff's stop condition. It is resolved by that approval and not returned.
- **Five `return null;` statements were removed from plain behaviors' `settle`:** three in `requests`, one in `terminals` and one in `order`. `settle` now returns `void`, and ESLint's `strict-void-return` refuses a value there. No expectation changed. This edit wasn't put to the owner.

### New witnesses

| Witness | Cites | Mutation (result) |
| --- | --- | --- |
| `authoring` › "should give a lifted behavior a drag with only the kernel keys", and "should give the lift exactly its eleven keys" | `drag:DRD-27` | `acquire` also writes `visual` on the `Drag` (fails, 12 keys) |
| `release` › "should remove the sortable placeholder before the lift is released" | `drag:DRI-9` | The placeholder's removal registered before `acquire` (fails) |
| `faults` › "should restore the visual and let the acquisition fault decide" | `drag:DRI-7`, `drag:DRI-9` | The release registered after the writes (fails, the visual's state differs) |
| `faults` › "should report a failed restoration after the acquisition fault, which decides" | `drag:DRI-7` | The release's throw swallowed (fails, one fault) |
| `landing` › "should start a named landing when releasing the top layer throws, and let the outcome stand" | `drag:DRI-13` | Release and landing in one disposer with no `finally` (fails, no animation) |
| `authoring.declaration` › the drag, controller-step, admission and class-instance cases | `drag:DRD-27`, declaration | `Drag` gains `lift?: unknown` (`tsc`: two unused `@ts-expect-error`) |

Three details of the witnesses:

- **The placeholder witness observes the release** at the release's `removeAttribute('popover')`. A committed reorder moves the item and closes its popover first, so `hidePopover` isn't reached.
- **The acquisition witnesses read the outcome from a disposer registered before `acquire`.** It runs last, after the release, and doesn't change what is restored.
- **The admission case is written as a typed declaration,** as in the type check. An arrow's returned literal isn't checked for excess properties against `admit`'s return type.

| Check at `89995c27e` | Result |
| --- | --- |
| Three-engine suite | 63 files, 905 passed, 16 skipped (921) |
| `just test` | 3 failed, 325 passed (328): three size rows |
| Per-sample allocation test | Passes (Chromium), after the approved key rename |
| Typecheck, lint, `fmt-check` | Pass |
| Size test's graph for `draggable` alone | Unchanged from item 1. No lift, `box-quad`, sortable or landing module |

## Size

`just size` at each commit, Brotli bytes with minified bytes in parentheses. The reference is the [composition report](composition-report.md)'s gate reading at `2506dcbb6`.

| Row | `2506dcbb6` | `039e8e153` (1) | `433a0e06c` (2) | `89995c27e` (3) | 3 against reference | Gate at 3 |
| --- | --: | --: | --: | --: | --: | --- |
| `draggable` alone | 2220 (6935) | 2241 (6960) | 2239 (6929) | 2107 (6464) | −113 (−471) | Under its 2139 B ceiling. The control moved by 83 B |
| `draggable` + `lift` | 4192 (12301) | 4202 (12326) | 4197 (12295) | 4094 (11847) | −98 (−454) | Passes |
| example: resize handle | 3340 (9602) | 3349 (9627) | 3346 (9596) | 3210 (9131) | −130 (−471) | Passes |
| example: drop zone | 4462 (13021) | 4480 (13046) | 4476 (13015) | 4411 (12717) | −51 (−304) | Passes |
| example: canvas group | 3366 (9756) | 3374 (9781) | 3370 (9750) | 3235 (9285) | −131 (−471) | Passes |
| `freeDrag` | 5035 (15199) | 5044 (15224) | 5040 (15193) | 5022 (14959) | −13 (−240) | Over by 55 B |
| `freeDrag` + `bounds` + `landing` | 5283 (15885) | 5304 (15910) | 5295 (15879) | 5272 (15645) | −11 (−240) | Over by 62 B |
| `sortable` + `y` | 6658 (20353) | 6672 (20380) | 6664 (20349) | 6605 (20098) | −53 (−255) | Passes |
| `sortable` + `xy` | 6605 (19969) | 6608 (19996) | 6595 (19965) | 6558 (19714) | −47 (−255) | Passes |
| `complete` | 7033 (21385) | 7047 (21412) | 7037 (21381) | 7006 (21130) | −27 (−255) | Passes |

- **`2506dcbb6` to item 1, +25 to +27 minified on every row, comes from the owner's split at `bb644d6d7`, not from item 1.** `draggable` alone at `bb644d6d7` reads 6960 minified and 2249 Brotli, so item 1 changed it by 0 minified and −8 Brotli, as `DRO-7` expected. `bb644d6d7`'s other rows have no clean reading ([raw output](measurements/2026-11-07-ownership-gates.txt)). The split's cost on those rows is inferred from the uniform +25/+27, not measured.
- **Item 2: −31 minified on every row, −2 to −13 Brotli.** The `isCurrent` method and its calls are removed, and four phase writes are added.
- **Item 3** removes the lift's coordination from the kernel. In the minified figures:
  - The rows without the lift shrink by 465.
  - The lifted rows shrink by 234 to 448. Each lifted composition now pays for its own `Lifter`, acquisition, `land` and `cancelLanding` registration.
- **At item 3**, five of the seven rows that were red at `2506dcbb6` pass their ceilings. Still red: `freeDrag` (55 B over), `freeDrag` + `bounds` + `landing` (62 B over), and the `draggable` alone control (83 B off its 2024 B figure). Nothing was re-based.

## Allocation

**Counted by reading the source at `89995c27e`, and compared by reading the allocation sites at `0dcb80fb1` and `a343b3d45`.** No instrument was used apart from the existing per-sample heap test. Counted: JavaScript objects and functions that library code creates at a site it owns, including array literals and typed arrays. Not counted: closure contexts, strings, objects the platform returns (`DOMRect`, `CSSStyleDeclaration`, `Animation`) and array backing-store growth.

- **A press that never activates:** 11 objects and 6 functions, as at `0dcb80fb1`.
  - Objects: the session, two `AbortController`s with their two signals, the disposer array, the `Drag`, the motion listener options, the event-type array literal and its iterator, and the `keydown` options.
  - Functions: `use`, `requestStep`, `requestCancel`, `#move`, `#up` and `#endPending`.
  - The constructor's allocation sites are the same as at `0dcb80fb1`, site for site. This unit changed none of them: item 2's state is an integer, and item 3 removed a field write and the cast.
- **A pointer operation without `lift`:** unchanged by this unit at every kernel site. The sites are the click guard, the drop's next step, the verdict's controller and completion, and the terminal step. Item 3 removed kernel code but no allocation site, because `takeLanding` returned an existing closure.
- **A pointer operation with `lift`:** the above, plus the lift's part below.
- **A keyboard command:** unchanged by this unit in the kernel. A lifted built-in's command adds the same lift part.
- **Inside the lift, per lifted activation:**
  - **At `89995c27e`: 5 objects, 7 functions, and 1 more object in each of two cases.**
    - Objects: `visualSpace`, the measured box, the UA values array, the saved-declarations `Map`, and the `Lift`. One more `Space` when the item isn't the visual. One 2-entry array per lifted longhand that had an inline value.
    - Functions: the `map` callback, the two restore closures, `translate`, `land`, and the two disposers.
  - **At `a343b3d45` (`bb644d6d7`'s lift): the same objects with the hold in place of the `Lift`, and 6 functions.** The functions were the `map` callback, the two restore closures, `translate`, the hold's `release` and `land`.
  - **The difference is one more function per lifted activation,** because the release and the landing are two disposers. The operation's disposer array holds two more entries.
  - **Inferred, not measured:** at `a343b3d45` the ten lifted members were added to the `Drag` after its literal was created, which in V8 moves them to an out-of-object property store. The `Drag` now keeps only its literal's members.
- **Per lifted controller:** the `Lifter` object, `cancelLanding` and `acquire`. That is 1 object and 2 functions, none of which existed at `a343b3d45`. The controller's landing slot was a field, not an allocation.
- **Per landing:** unchanged. The cancel closure is now stored on the `Lifter` instead of the controller.
- **Per sample:** the per-sample allocation test passes in Chromium.
  - Sampled bytes over 300 samples: `lift.ts:translate` 30144, `sortable.ts:move` 14244, `sortable.ts:#updateInsertion` 7716, `y.ts:resolve` 35232, `rect-index.ts:refresh` 1384.
  - No base reading of these per-function figures was taken, so they are not compared.
  - A lifted hook now reads `drag.state.lift` before the member: in `sortable`'s `move`, and in `freeDrag`'s `#computeMotion`, `translate` and geometry. That is one or two more property loads per sample, not measured.

## Findings outside this unit's scope

**The per-sample test's kernel check reads a file the kernel no longer uses.** `hot-path` sums sampled bytes for keys starting `draggable.ts:`, but since `bb644d6d7` the per-sample kernel code is in `kernel/session.ts`. So the `kernelPerMove < 16` assertion reads 0 whatever the kernel allocates. The sample above has no `session.ts` key, which suggests the kernel allocated nothing measurable, but the assertion cannot fail. That needs an edit to an existing test, so it is the architect's to route.

**Three of `bench/compare.ts`'s mutation patch strings no longer match the source:**

- `sortable.ts` "const insertion = state.insertion!;…";
- `draggable.ts` "drag.x = event.clientX;…";
- `draggable.ts` "this.#enter(this.#runStep, step);".

They were stale before this unit, after the operation-class adoption and the split. This unit updated only the two patch strings that named lift members. They now match.

## Limits

- **Engines:** the environment the composition report describes. Chromium is the image's browser, and Firefox and WebKit are Playwright's builds. WebKit ran with `~/.cache/ms-playwright/webkit-env.sh`.
- **The per-sample allocation test runs only in Chromium.**
- **No timing was taken.**
- **Allocation is by reading,** with the rules stated above.

## Next

The owner reads `DRO-7` from these figures. Then a combined independent review reads the remediation, the composition unit and this unit at this unit's last commit.