# Test title follow-up report

**Handoff:** [`test-title-follow-up-handoff.md`](test-title-follow-up-handoff.md). **Base:** `b6f276988` on `drag/feature-composition`. **Implementation commit:** `60680eb75`. **Governing records:** `DRF-19` in [`00-index.md`](00-index.md) and [`combined-review-remediation-assessment.md`](combined-review-remediation-assessment.md) §3.

**Outcome:** both items meet their required properties. The diff touches only `tests/terminals.browser.test.ts` and `tests/faults.browser.test.ts`. M3a and M3b fail as item 2 requires. No deviation from the handoff.

## 1. The `fault` case label (`DRF-19` (a))

The cases are now objects. `kind` is still the thrown message and the asserted fault message. `before` names what the body does before the throw, and the title interpolates it:

```ts
it.each([
  { kind: 'cancel', before: 'requestCancel' },
  { kind: 'destroy', before: 'requestDestroy' },
  { kind: 'fault', before: 'nothing' },
] as const)(
  'should report a throw from activate once and leave the list clean: $before before the throw',
  async ({ kind }) => {
```

Rendered titles:

- "should report a throw from activate once and leave the list clean: requestCancel before the throw"
- "should report a throw from activate once and leave the list clean: requestDestroy before the throw"
- "should report a throw from activate once and leave the list clean: nothing before the throw"

- **Property 1:** the `cancel` and `destroy` cases name the `panel` call that their bodies make before the throw. The `fault` case names no step.
- **Property 2:** the body still throws `new Error(kind)` and asserts `faultMessages()` equals `[kind]` and `isClean(list)`. The message assertion stays matched to the throw.
- **Property 3:** the three cases and their bodies are unchanged. Only the case values and the parameter's destructuring changed.

## 2. The hidden-visual test (`DRF-19` (b))

- **Title:** "should report one fault when the lift acquires a visual with no box, and keep the controller". It was "should report a platform throw and keep the controller: a hidden visual has no box".
- **Fault assertion:** `expect(faultMessages()).toEqual(['lift/visual-no-box-space'])`. It was `expect(faults).toHaveLength(1)`. `faultMessages()` maps each reported fault to its cause's message, so the assertion requires exactly one fault and identifies it.
- **Unchanged:** the first `expect(log).toEqual([])`, the second drag of `#r1`, and `expect(log).toEqual(['start'])`.

## Checks

Run in `packages/drag` at the implementation commit.

| Check | Result |
| --- | --- |
| `npx just fmt`, `lint-fix`, `fmt`, `lint` on the two files | Exit 0. Neither oxlint nor ESLint printed a diagnostic |
| `npx just lint` (whole package) | Exit 0, no diagnostics |
| `npx just typecheck` | Exit 0 |
| `git diff --stat b6f276988..HEAD -- src bench` | Empty |
| The two files in three engines, `webkit-env.sh` sourced, `vitest.engines.config.ts` with `--project` per engine | Chromium 33 passed, Firefox 33 passed, WebKit 33 passed (2 files each). The combined run: 6 files, 99 passed |

## Mutations

Each mutation was applied to the working tree, run in Chromium with `vitest.config.ts` and `-t "visual with no box"`, and restored with `git checkout src/lift.ts`. None was committed.

### M3a: the box check throws a different message

```diff
@@ -265,7 +265,7 @@ export class Lifter {
         (itemSpace !== visualSpace && !ancestry(drag.item, itemSpace)) ||
         !coordinates(visual, measured, visualSpace)
       ) {
-        throw new Error('lift/visual-no-box-space');
+        throw new Error('lift/mutated');
       }
```

**Fails at the new assertion** (`faults.browser.test.ts:269`): "expected [ 'lift/mutated' ] to deeply equal [ 'lift/visual-no-box-space' ]". The replaced `toHaveLength(1)` would have passed this mutation.

### M3b: `acquire` doesn't throw for a visual with no box (probe H1)

```diff
@@ -265,7 +265,7 @@ export class Lifter {
         (itemSpace !== visualSpace && !ancestry(drag.item, itemSpace)) ||
         !coordinates(visual, measured, visualSpace)
       ) {
-        throw new Error('lift/visual-no-box-space');
+        // M3b: no throw
       }
```

**Fails at the first `log` assertion** (`faults.browser.test.ts:268`): "expected [ 'start' ] to deeply equal []". This is the same result as the proof's H1.

**Additional probe, not owed:** M3b with line 268 (`expect(log).toEqual([])`) deleted in a scratch copy fails at the new assertion: "expected [] to deeply equal [ 'lift/visual-no-box-space' ]". So the new assertion also detects M3b without the first `log` assertion, as the proof's H2 showed for the count. The test file was restored from a copy.

## Limits

- A full `npx just test` or `test-engines` run was not made. The handoff does not require one.
- The mutations ran in Chromium only.

## Next

The architect reads this report and commit `60680eb75` and closes `DRF-19`. Nothing else is open from this unit.