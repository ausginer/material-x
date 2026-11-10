# Combined review remediation handoff

**For:** one `implementer` unit on `drag/feature-composition`. **Base:** the commit that carries this handoff and [`combined-review-assessment.md`](combined-review-assessment.md).

**Governing records:**

- `DRD-39`, `DRF-6`, `DRF-8`, `DRF-9`, `DRF-10`, `DRF-12` and `DRF-16` in [`00-index.md`](00-index.md);
- [`contract.md`](contract.md) as amended at the base;
- CONTRIBUTING Part I, §TypeScript, §Unit tests and §Comments and JSDoc.

The assessment's §4 gives the reason for each item.

**Goal:** after this unit, no statement in the package or its record is false where the combined review found one false. No emitted JavaScript changes.

## Boundaries

**In scope:** the six items below.

**Out of scope.** Don't change these, even where a file is already open:

- `DRF-13`, `DRF-14`, `DRF-15`, `DRF-17` and `DRF-18`, which are optional;
- `DRF-1` and `DRF-7`, which are deferred with timing;
- any declaration kind under `DRO-13` or §5 of the assessment;
- any size ceiling, control figure or test threshold;
- `bench/`;
- any file outside `packages/drag`, except `.agents/docs/accessibility.md` for item 2.

**No runtime change.** Every `.js` file that `npx just build` emits at the end of the unit is byte-identical to the file it emits at `b01a0283d`, the round's revision. The owner's `92fbb93e1` is type-only, so this comparison also covers it. If an item can't meet its property without a runtime change, stop and return (§Return conditions).

## Base check

At the base, in `packages/drag`:

- `npx just typecheck` and `npx just lint` exit 0, and lint prints nothing from either tool.
- Build the package at `b01a0283d` in a scratch worktree, and keep its emitted `.js` files for the comparison. Remove the worktree when the unit ends.

## Items

### 1. `DRD-39`: export the named types (`DRF-10`)

**Required properties:**

1. `src/draggable.ts` exports the type `VerdictAwaiter`.
2. `src/free-drag.ts` exports the types `DragAxis`, `FreeDragSubject` and `ResolveHome`.
3. `src/sortable/operation.ts` and `src/free-drag/operation.ts` import `VerdictAwaiter` from `../draggable.ts`. Outside `src/kernel/`, no module except `src/draggable.ts` imports from `kernel/`. Check this with `grep -rn "kernel/" src`.
4. Each of the four exported types has a JSDoc that says what the type is. The JSDoc names no decision id, date or history (`documentation.md` §5.1).
5. A declaration test imports each of the four from its entry and uses it, for example by annotating a value. Removing any one export makes typecheck fail (mutation M1).
6. `typedoc --options typedoc.json` reports exactly two warnings: `AxisInstaller` and `DisplacementInstaller`. Run it with `--out` set to a scratch folder.
7. No name changes. If the README lists the types that an entry exports, the list includes the new ones.

### 2. The reduced-motion scope (`DRF-6`)

**Required property:** each statement about reduced motion for landings says that it covers the landings `landing()` starts. Where the text addresses an integrator, it also says that a custom `Landing` owns its own handling of the preference. The sites:

- **`README.md`,** §Focus and landing limits, the **Landing** bullet.
- **`.agents/docs/accessibility.md`,** the `@ydinjs/drag` section:
  - The fulfilled requirement states `landing()`'s scope. It drops "including one a custom behavior returned with no timing", because that path no longer exists.
  - The missing requirements say that a custom `Landing` handles `prefers-reduced-motion` itself. Mark it `[Docs]`, as the `layoutAnimation` entry is marked.
  - The section's "Updated" line names this change by its decision address, as the line already does for `drag:DRD-15`. The address is `drag:DRD-33`, the decision that narrowed the scope.
- **`tests/landing.browser.test.ts`,** the test "should give every landing zero duration with reduced motion, including a custom behavior's `landing()`". Its title names what its body asserts: a landing that `landing()` starts has zero duration. The body doesn't change.

`src/shared/landing.ts`'s JSDoc and the contract's DRI-13 already state the scope. Don't change them.

### 3. DRI-3 tests that can't fail (`DRF-8`)

**Required property:** every assertion in these tests can fail when the property that the test's title names is violated. An assertion that no reachable code can make fail is removed, together with any hook that exists only to feed it. The title names what the remaining assertions check.

- **`tests/terminals.browser.test.ts`:**
  - "should deliver no terminal without a start: %s before start" (three cases). What remains: the activation's throw is reported once, and the controller is left clean.
  - "should deliver no start or end when activate declines, and no report". What remains: a declined activation reports nothing.
  - Keep the `drag:DRI-3` describe only if what remains witnesses a DRI-3 clause. "A throw is a fault" and "`null` declines" are in its sketch, and the quiet decline is in its text.
- **The instances whose other assertions carry the subject:** in `tests/operation-lifecycle.browser.test.ts`, the three `expect(log).toEqual([])` lines in "should release a partial acquisition…", "should release with the fault when the operation constructor throws…" and "should keep a cancel recorded in activate…"; in `tests/faults.browser.test.ts`, the two `expect(log).toEqual([])` lines in the failed-acquisition block.
  - Remove each `log` assertion that no reachable code can make fail.
  - Keep one if reachable code writes `log` in that test, and say which code in the report.

`operation-lifecycle` › "should start, settle and end with a cancel requested in activate" already witnesses "`end` does not run without `start`" with an operation the kernel receives. No new test is required.

### 4. Two titles that over-claim (`DRF-9`)

**Required property:** each title names only properties that its assertions can fail on.

- **`tests/classes.browser.test.ts`,** "should run draggable controller methods called on the controller, with cancelLanding passed detached". Remove the `cancelLanding` clause from the title. `destruction` › "should cancel a running landing and the row animations" witnesses the detached `cancelLanding`. Don't add a landing to this test.
- **`tests/sortable.browser.test.ts`,** "should land at home when a cancel comes between an in-place change and invalidate". Keep the title, and add the assertion it names. Use the method of its sibling, "should land a canceled drag at home when the consumer reordered its own array":
  - Record the visual's top at the cancel.
  - Pause each of the item's animations at time 0.
  - Assert that the visual is within 1 px of that top.
  - Assert that at least one animation runs, so that the check can't pass with no flight.
  - **Mutation M2:** apply W1's mutation from [`items-borrowing-report.md`](items-borrowing-report.md) §Item 3, where `#landingTarget` takes home from the retained array. With the test's `faults` assertion also removed, the test must fail on an assertion that this item adds. Report which one.

### 5. `RectIndexView` (`DRF-12`)

**Required property:** `src/sortable/rect-index.ts` declares no `RectIndexView`, and `RectIndex` doesn't `implements` it. The class's own getters are the read-only view. Nothing else named the interface (`grep -rn RectIndexView src tests bench`).

### 6. Stale comments (`DRF-16`)

**Required property:** each comment names the code as it is, and states what it checks without history.

- **`src/shared/invalidation.ts:1`:** the parameter is `listener`, not `onInvalidate`.
- **`src/sortable/linear-shift.ts:84`:** the guard is `__DEV__`, not `DEV`.
- **`tests/authoring.declaration.test.ts:215`:** the `@ts-expect-error` comment states the property, that `false` is not an operation. It doesn't say "no longer".

## Verification

Follow [`handoff.md`](../../../.agents/docs/handoff.md) for every changed `.ts` and Markdown file. Run these in `packages/drag`:

| Check | Required result |
| --- | --- |
| `npx just typecheck`, `npx just lint` | Exit 0. Lint prints nothing from either tool |
| `npx just test` (Chromium) | Only known failures: the six size rows under `DRO-4`, each over its ceiling by the same bytes as at `b01a0283d`. The per-sample kernel test may also fail in some runs (assessment §2). Report each failure, and change no threshold |
| `npx just test-engines`, with `~/.cache/ms-playwright/webkit-env.sh` sourced | The same counts as at `b01a0283d` (1041 passed, 18 skipped), less any test that items 3 and 4 remove. Report the difference |
| Emitted `.js` against `b01a0283d` | Byte-identical, every file. List any `.d.ts` that differs |
| `typedoc` | Item 1, property 6 |
| M1 | Remove one item 1 export, and typecheck fails in the declaration test. Restore it |
| M2 | Item 4. Restore after |

**The mutations are made in the working tree or a scratch copy, and none is committed.**

## Commits, report and push

- **Commits:** subject-only, one per item or grouped by file. Don't amend, rebase or squash.
- **Report:** `packages/drag/.plan/combined-review-remediation-report.md`, committed last. It gives:
  - per item, what changed and where;
  - each check's result, and each mutation's diff and failing assertion;
  - per `DRF-8` instance, whether the `log` assertion was removed or kept, and why;
  - any deviation from this handoff, with its reason.
- **Push** `drag/feature-composition` after the report's commit. No PR.

## Return conditions

Stop, commit what holds, report, and return to the architect if:

- an item can't meet its property without changing emitted JavaScript;
- `typedoc` reports a warning other than the two installers after item 1;
- a `DRF-8` assertion turns out to be failable, and keeping it contradicts the title you would give;
- M1 or M2 doesn't fail.

## Review

**After the report, one fresh `reviewer` pass** reads `7afece05a..<the report's commit>`. That range covers:

- the owner's `92fbb93e1`;
- the architect's commit that carries this handoff, with the contract's amended public surface and DRI-9;
- this unit.

The pass checks:

- each item's required properties;
- that `DRI-9`, `DRD-39` and the public surface in the contract agree with the code;
- that emitted JavaScript is byte-identical to `b01a0283d`'s;
- that nothing out of scope changed.

It repeats M1 and M2. It doesn't repeat the combined review, and it doesn't read the optional findings.