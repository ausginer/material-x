# Class refactor: receiver types follow-up

**For:** one `implementer` unit on `drag/class-refactor`. **Base:** the branch at the commit that carries this file. Its code equals `42f42a164`'s.

**Governing records:**

- **`DRD-63` property 2, as revised on 2026-11-14,** in [`00-index.md`](00-index.md);
- `DRD-35` properties 1 and 7, and `DRD-37` property 4, as `DRD-63` amends them;
- the [recheck assessment](class-refactor-recheck-assessment.md) §2 and §3;
- the [recheck](reviews/owner-class-refactor-remediation/recheck-reviewer.md)'s `class-refactor-recheck-1`, and its [probe](reviews/owner-class-refactor-remediation/recheck-reviewer-probes/wrong-receiver.ts.txt);
- CONTRIBUTING Part I §TypeScript.

**Types only.** No emitted JavaScript changes, so no size, allocation or timing run is owed. **One set of tools:** don't run `npm install` or `npm ci`, and don't change `node_modules`, a lockfile or a browser.

## The property

**At sites 1 to 3, the receiver that the passed member declares is the type through which the site reads it:**

- the axis's `retire` and `invalidate`, read through `InsertionGeometry`, declare an `InsertionGeometry` receiver (sites 1 and 2);
- the sink's `retire`, read through `DisplacementSink`, declares a `DisplacementSink` receiver (site 3).

So passing one of them with a receiver of another built-in type fails typecheck, as at `5b581fbdf`.

**Unchanged:**

- **`Retirable` and `Invalidatable` stay,** and the `this` declaration stays on them. `InsertionGeometry` and `DisplacementSink` keep extending them.
- **The JSDoc** "Staleness only, because scroll calls it many times a second." stays on the declaration that `InsertionGeometry` exposes.
- **Sites 4 to 6** already declare class receivers with `#private` members. Don't change them.
- **Removing the receiver** at any of the six sites still fails typecheck.

**You own the form.** The assessment's [probe](measurements/2026-11-14-class-refactor-recheck/receiver-this-probe.ts.txt) shows that the polymorphic `this` type as the receiver of `Retirable.retire` and `Invalidatable.invalidate` meets the property in a standalone copy of the overloads. That is one form, not a requirement. If drag's typecheck or lint refuses it, choose another form within the boundaries, or return.

## The witness

**Append a `drag:DRD-63` block to `tests/callbacks.declaration.test.ts`.** Keep every existing line of the file. Type the cases as the file's `passAlone` does: through a function whose parameters are a `Drag`, a `DraggableController<BehaviorOperation>`, an `InsertionGeometry`, a `DisplacementSink` and a `RectIndex`, imported from `src`. Each case carries `@ts-expect-error` with a description of what it refuses:

- **W1:** the axis's `retire` with the sink as its receiver;
- **W2:** the sink's `retire` with the axis as its receiver;
- **W3:** the axis's `invalidate` with a `RectIndex` as its receiver. `RectIndex` implements `Invalidatable` and isn't an `InsertionGeometry`, so this case tells the revised receiver from the supertype.

**Mutation M7:** declare the receivers as at `42f42a164`, `this: Retirable` and `this: Invalidatable`. Then each of W1 to W3 is an unused directive, and the `declaration` project fails on each.

**For every mutation in this unit:**

- apply it by content, not by a patch located by line numbers;
- restore the file from its own scratch copy, never with `git checkout`;
- save the diff and the error output that the run gives.

## Boundaries

**Change only:**

- `packages/drag/src/sortable/retirable.ts` and `invalidatable.ts`;
- `packages/drag/src/sortable/axis.ts`, if the form needs it;
- `packages/drag/tests/callbacks.declaration.test.ts`: the appended block only;
- **records:** `class-refactor-receiver-report.md`, and files under `measurements/2026-11-<day>-class-refactor-receiver/`.

**Don't change** any other file. In particular, don't change `rect-index.ts`, `y.ts`, `xy.ts`, `layout-animation.ts`, the kernel's signatures, a budget, `.plan/probes/` or `.plan/reviews/`. **Return** if the property can't be met inside these boundaries, or if the emitted JavaScript changes.

## Checks at the end

1. **Formatting, lint and typecheck,** as [`handoff.md`](../../../.agents/docs/handoff.md) orders, on every edited file:
   - drag's `npx just lint` exits 0;
   - drag's `npx just typecheck` reports drag2's two `TS2724` only.
2. **The `declaration` project** passes, including the appended block and every existing case.
3. **The emitted JavaScript is unchanged.** Build drag at `42f42a164` in a scratch worktree, and at the end. Every emitted `.js` file is byte-identical. Report the count and one hash list. A difference is a return.
4. **Declarations:** diff the emitted `.d.ts` files against `42f42a164`'s build.
   - `free-drag/bounds.d.ts` and `free-drag/drop-targets.d.ts` stay identical, and so stay equal to `5b581fbdf`'s.
   - Every other difference is a receiver declaration that this unit changed. List each one in the report.
5. **The mutations:**
   - M7, with its result for each of W1 to W3;
   - the six receiver removals, each with one `TS2345` at its own site. The proof's [mutator](reviews/owner-class-refactor/proof-reviewer-probes/receiver-mutate.mjs.txt) and [runner](reviews/owner-class-refactor/proof-reviewer-probes/receiver-typecheck.sh.txt) may be reused in a scratch copy;
   - the recheck's [probe](reviews/owner-class-refactor-remediation/recheck-reviewer-probes/wrong-receiver.ts.txt), typechecked at the end in a scratch copy. Its two lines fail, as at `5b581fbdf`.

**Not owed:** the full suite, size, allocation, timing, Firefox and WebKit. Check 3 shows that no runtime figure can move.

## Report

Write `class-refactor-receiver-report.md`. **It states:**

- the base commit and the unit's commit;
- the form chosen;
- each check above, with the evidence saved under `measurements/`;
- what wasn't run.

Commit and push, then stop. **Next:** the architect reads the report and repeats its mechanical checks ([recheck assessment](class-refactor-recheck-assessment.md) §5). The owner answers Q4, which doesn't wait for this unit.