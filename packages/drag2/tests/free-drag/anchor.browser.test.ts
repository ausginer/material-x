/**
 * **The accepted landing anchor, and what it must not call** — D-89, closing
 * CE1-02; plus D-90's calling convention and D-91's `moveTo` domain, which are
 * the two other places a third-party constraint or a consumer point reaches
 * committed state.
 *
 * The accepted arm used to answer by calling `deriveMotion`, whose last
 * statement is `constrain.apply`. Three documents said otherwise at once: the
 * seam's own comment claimed *no consumer call and no DOM read*, I-36's
 * Category-1 table omitted the slot entirely, and D-81's deliberately
 * re-derived four-seam enumeration missed it — while `host.closed` was read
 * immediately before `home` and nowhere before the derivation, so a third-party
 * `apply` ran after logical closure with the resolver beside it guarded.
 *
 * **The assertions are on the constraint, not on the anchor's value.** The
 * value is unchanged by the fix — the arm re-computed the same numbers from the
 * same committed frame — so a fixture checking where the visual landed passes
 * either way. What changed is the re-entry, and that is what these rows read.
 *
 * **Two things this file records rather than papers over.**
 *
 * The accepted anchor's value has **no public observable**: free drag never
 * arms a landing for an accepted result, so no `LandingContext.target` is ever
 * produced for it, and the kernel's authoritative pin is followed immediately
 * by presentation disposal. 05's requested *the anchor still equals originRect
 * plus the committed delta* therefore cannot be read through this surface at
 * all; what stands in its place are the two `home` rows, on the arms that do
 * reach a landing.
 *
 * And the obvious *destroy from the resolver* row is **absent deliberately**:
 * after `destroy()` the kernel's own `settlementLive` check skips the arm, so
 * `anchorTarget` is not called at all and the row passes with the defect
 * restored. The barrier half of CE1-02 is real and is fixed by the same
 * deletion; it simply has no fixture that can tell the two trees apart.
 */
import { describe, expect, it } from 'vitest';
import { bounds } from '../../src/free-drag/bounds.ts';
import type {
  ConstraintView,
  FreeDragInstaller,
  MotionConstraint,
  MotionDraft,
} from '../../src/free-drag/feature.ts';
import {
  freeDrag,
  FreeDragResolution,
  type FreeDragConfig,
} from '../../src/free-drag.ts';
import type { Point } from '../../src/kernel/types.ts';
import {
  activate,
  frame,
  freeDragHarness,
  move,
  release,
  settled,
} from '../support/free-drag.ts';

const { compose } = freeDragHarness();

/**
 * A constraint that records every `apply`, optionally clamping. The counter is
 * read at two instants, so the row can say *no further call between them*
 * rather than *never called*, which would be a claim about the hot path.
 */
function countingConstraint(
  clamp?: (motion: MotionDraft) => void,
): Readonly<{ fragment: Partial<FreeDragConfig>; applies: number }> {
  const record = { applies: 0 };
  const installer: FreeDragInstaller = () => ({
    constrain: {
      apply(motion: MotionDraft, _view: ConstraintView): void {
        record.applies += 1;
        clamp?.(motion);
      },
      invalidate(): void {},
      retire(): void {},
    },
  });

  return {
    fragment: { plugins: [installer] },
    get applies(): number {
      return record.applies;
    },
  };
}

/** Reads where a landing opened and where it was asked to travel to. */
function recordingLanding(): Readonly<{
  fragment: Partial<FreeDragConfig>;
  targets: Point[];
}> {
  const targets: Point[] = [];
  const installer: FreeDragInstaller = () => ({
    startLanding: (context, done) => {
      targets.push({ x: context.target.x, y: context.target.y });
      done();
      return { destroy: (): void => {} };
    },
  });

  return { fragment: { plugins: [installer] }, targets };
}

/**
 * A constraint that records the **receiver** every call site hands it.
 *
 * The members are `function` shorthand rather than arrows precisely so that
 * they *have* a receiver to observe. An arrow would capture the module's `this`
 * and report `undefined` from a bound site exactly as readily as from a
 * detached one — which is the fixture defect D-90 was re-opened over, and the
 * reason a row can look like a convention test while measuring nothing.
 *
 * The record is installed **as-is and never pre-lifted**: what the behavior
 * does with it is the thing under test, so a fixture that lifts the members
 * itself has already performed the operation it is meant to detect.
 */
function receiverRecordingConstraint(): Readonly<{
  fragment: Partial<FreeDragConfig>;
  receivers: ReadonlyArray<readonly [string, unknown]>;
  /**
   * The **nested `MotionConstraint`** — the capability record the members are
   * declared on, and the one forbidden receiver (D-94). Not the `{ constrain }`
   * the installer returns: a fully bound tree never uses that object as a
   * receiver either, so a row comparing against it would pass on exactly the
   * implementation the convention forbids.
   */
  own(): MotionConstraint;
}> {
  const receivers: Array<readonly [string, unknown]> = [];
  const constrain: MotionConstraint = {
    apply(this: unknown): void {
      receivers.push(['apply', this]);
    },
    invalidate(this: unknown): void {
      receivers.push(['invalidate', this]);
    },
    retire(this: unknown): void {
      receivers.push(['retire', this]);
    },
  };
  const installer: FreeDragInstaller = () => ({ constrain });

  return {
    fragment: { plugins: [installer] },
    receivers,
    own: () => constrain,
  };
}

/**
 * **The assertion is `receiver !== own()`, not `receiver === undefined`**
 * (D-93). The published guarantee is a single negative — a member is never
 * invoked with **the `MotionConstraint` it is declared on** as its receiver
 * (D-94) — and what the receiver *is* is unspecified, because the sites
 * disagree: four hand `undefined`, while the construction unwind's
 * `retireHooks[i]!()` is an indexed call and hands the hook **the internal
 * array**. Those values are measured code, recorded here and in `.plan` as
 * evidence; no row asserts one.
 *
 * The narrower `=== undefined` assertion these rows used first was a mechanism
 * claim. It held at four sites, failed at the fifth, and would have failed all
 * of them under a refactor to the sortable's flat-slot shape **without the
 * convention being broken** — a row defending the flattening rather than the
 * contract, which is F-74's non-discriminating control inverted.
 *
 * Every site is asserted **reached** before its receiver is asserted foreign.
 * Without the first half a row passes when its site is never driven, which is
 * the other way a convention test measures nothing.
 */
function expectDetached(
  receivers: ReadonlyArray<readonly [string, unknown]>,
  site: string,
  own: unknown,
): void {
  const seen = receivers
    .filter(([name]) => name === site)
    .map(([, receiver]) => receiver);

  expect(seen.length).toBeGreaterThan(0);
  expect(seen.filter((receiver) => receiver === own)).toEqual([]);
}

describe('the accepted anchor', () => {
  it('should call no constraint between the release write and the join', async () => {
    // **D-89's row.** The resolver is left **pending**, which is what isolates
    // the join: with a synchronous resolver the whole settlement — including
    // `anchorTarget` — runs inside `release()`, so a count taken after it
    // already includes the seam under test and the row cannot discriminate.
    // Holding the drop puts the capture between `release.prepare`'s derivation
    // and the join, which is exactly the window a fifth `apply` site lives in.
    let resolveDrop!: (value: FreeDragResolution) => void;
    const constraint = countingConstraint();
    const composed = compose({
      fragments: [constraint.fragment],
      onDrop: () =>
        new Promise<FreeDragResolution>((resolve) => {
          resolveDrop = resolve;
        }),
    });

    activate(composed);
    move(50, 40);
    release(50, 40);
    await settled();

    const atRelease = constraint.applies;

    resolveDrop(FreeDragResolution.accept());
    await settled();
    await frame();
    await settled();

    expect(constraint.applies).toBe(atRelease);
    expect(composed.ends).toHaveLength(1);
    expect(composed.ends[0]!.type).toBe('accepted');
  });

  it('should leave the home anchor at the clamped delta', async () => {
    // **The value control, and it sits on the arm that has one.**
    //
    // The accepted anchor's value turns out to have **no public observable**:
    // free drag never arms a landing for an accepted result — it is already at
    // its destination (E-07) — so `LandingContext.target` is never produced for
    // it, and the kernel's authoritative pin is immediately followed by
    // presentation disposal, which restores the element. So the arm's value is
    // used once, invisibly, and 05's requested *anchor still equals originRect
    // plus the committed delta* cannot be read through the public surface at
    // all. Raised rather than worked around: the rows above assert the claim
    // D-89 actually makes — the constraint is not re-entered — and this one
    // asserts that the seam's **other** arms, which do reach a landing, still
    // answer from the committed geometry.
    const recorder = recordingLanding();
    const constraint = countingConstraint((motion) => {
      motion.x = Math.min(motion.x, 25);
      motion.y = Math.min(motion.y, 15);
    });
    const composed = compose({
      fragments: [recorder.fragment, constraint.fragment],
      onDrop: () => FreeDragResolution.reject('nope'),
      config: { home: () => ({ x: 5, y: 7 }) },
    });

    activate(composed);
    move(500, 500);
    release(500, 500);
    await settled();

    expect(recorder.targets).toEqual([{ x: 5, y: 7 }]);
  });

  it('should leave the unconfigured home anchor at the grab position', async () => {
    // The arm that shares the accepted arm's branch and never derived motion,
    // so it is the closest observable neighbour: it answers from `originRect`
    // alone, and it still does.
    const recorder = recordingLanding();
    const composed = compose({
      fragments: [recorder.fragment],
      onDrop: () => FreeDragResolution.reject('nope'),
    });
    const origin = composed.item.getBoundingClientRect();

    activate(composed);
    move(50, 40);
    release(50, 40);
    await settled();

    expect(recorder.targets).toEqual([{ x: origin.left, y: origin.top }]);
  });
});

describe('a detached constraint', () => {
  it('should hand the apply site a foreign receiver', () => {
    // **D-90's falsifier, one site per row** (CE1-03, D-93). The five rows
    // below are driven so that each reaches exactly one of the constraint's
    // call sites, which is what makes a failure attributable rather than
    // hiding it inside an aggregate.
    //
    // The revertible units are the **three lifts**, not the five sites, so
    // re-attaching one fails every row its lift feeds and no other — measured
    // as **1** for `apply`, **2** for `invalidate` (the scroll/resize listener
    // and `TAG_POLICY` share one lift) and **2** for `retire` (the normal
    // retirement and the construction unwind share the assembler's).
    const constraint = receiverRecordingConstraint();
    const composed = compose({ fragments: [constraint.fragment] });

    activate(composed);
    move(50, 40);

    expectDetached(constraint.receivers, 'apply', constraint.own());
  });

  it('should hand the scroll invalidator a foreign receiver', () => {
    // The site registered on the gesture's scroll/resize listener. `resize` is
    // dispatched rather than `scroll` only because the two share one callback
    // and `resize` needs no capture phase to arrive.
    const constraint = receiverRecordingConstraint();
    const composed = compose({ fragments: [constraint.fragment] });

    activate(composed);
    window.dispatchEvent(new Event('resize'));

    expectDetached(constraint.receivers, 'invalidate', constraint.own());
  });

  it('should hand the policy invalidator a foreign receiver', () => {
    // The `TAG_POLICY` site. Driven alone, so every `invalidate` receiver read
    // here belongs to it and not to the listener above.
    const constraint = receiverRecordingConstraint();
    const composed = compose({ fragments: [constraint.fragment] });

    activate(composed);
    composed.controller.invalidate();

    expectDetached(constraint.receivers, 'invalidate', constraint.own());
  });

  it('should hand the retire hook a foreign receiver', async () => {
    // Both retirements — the operation's and the controller's — go through the
    // assembler's hook list, so this row reads two receivers, not one.
    const constraint = receiverRecordingConstraint();
    const composed = compose({ fragments: [constraint.fragment] });

    activate(composed);
    release(30, 10);
    await settled();
    await composed.controller.destroy();

    expectDetached(constraint.receivers, 'retire', constraint.own());
  });

  it('should hand the construction unwind a foreign receiver', () => {
    // **The fifth site, and the one the four-row enumeration missed** (D-93).
    // `retire` is reached from the normal retirement *and* from the assembler's
    // unwind, which runs when a later installer throws — the path a
    // third-party author hits most often while developing. It is also the site
    // where `=== undefined` was false: `retireHooks[i]!()` is an indexed call,
    // so the hook is handed the internal array. The obligation still holds,
    // which is exactly why the obligation is what these rows assert.
    const constraint = receiverRecordingConstraint();
    const item = document.createElement('div');

    document.body.append(item);

    const boom: FreeDragInstaller = () => {
      throw new Error('installer');
    };

    expect(() =>
      freeDrag(
        item,
        { onDrop: () => FreeDragResolution.accept() },
        constraint.fragment,
        { plugins: [boom] },
      ),
    ).toThrow();
    item.remove();

    expectDetached(constraint.receivers, 'retire', constraint.own());
  });

  it('should retire detached as well', async () => {
    // Two calls, and both are the contract: `spec.retire()` runs the hooks at
    // **operation** retirement, and controller teardown runs them again. The
    // count is asserted rather than loosened to *at least one*, because a hook
    // that stopped running at one of the two would otherwise pass.
    let retired = 0;
    const installer: FreeDragInstaller = () => ({
      constrain: {
        apply: (): void => {},
        invalidate: (): void => {},
        retire: (): void => {
          retired += 1;
        },
      },
    });
    const composed = compose({ fragments: [{ plugins: [installer] }] });

    activate(composed);
    release(30, 10);
    await settled();
    await composed.controller.destroy();

    expect(retired).toBe(2);
    expect(composed.errors).toEqual([]);
  });

  it('should leave the first-party bounds() working through the same sites', () => {
    // The non-discriminating control, recorded as one (F-74): `bounds()` closes
    // over its state, so it passes whether the sites are bound or detached.
    // Kept so a later reader does not mistake a `bounds()` fixture for evidence
    // about the convention.
    const composed = compose({
      fragments: [bounds(() => new DOMRectReadOnly(0, 0, 60, 60))],
    });

    activate(composed);
    move(500, 500);

    expect(composed.errors).toEqual([]);
  });
});

describe('a non-finite moveTo()', () => {
  // **The discard went 2026-08-25 (D-124).** `controller.d.ts` publishes _its
  // coordinates must both be finite_ on `moveTo`'s own doc comment, so a
  // non-finite one is outside the contract and the reachability gate closes
  // before ownership is asked. D-91's keep-argument — that the offsets are
  // committed frame state and poison every later derivation — is a description
  // of what the library goes on to compute, which the gate never reaches.
  //
  // The poisoning it named is therefore real again, and is asserted here
  // rather than left to a silence. `tests/free-drag/validation.browser.test.ts`
  // carries the far end of it: the poison reaches a library-minted `distance`.

  it('should write the non-finite offset into the committed frame', () => {
    const composed = compose();

    activate(composed);
    composed.controller.moveTo({ x: Number.NaN, y: 10 });
    move(50, 40);

    const geometry = composed.moves.at(-1)!;

    expect(Number.isFinite(geometry.viewportDelta.x)).toBe(false);
    expect(Number.isFinite(geometry.currentRect.x)).toBe(false);
  });

  it('should surface nothing on the platform channel', () => {
    // No report either: the call is accepted, so there is no misuse for the
    // library to have noticed.
    const composed = compose();

    activate(composed);
    composed.controller.moveTo({ x: Number.POSITIVE_INFINITY, y: 10 });

    expect(composed.errors).toEqual([]);
    expect(composed.errors).toEqual([]);
  });

  it('should let the operation complete normally', async () => {
    // **Unchanged, and still half the decision.** Whatever the geometry says,
    // the lifecycle does not end a live drag over the consumer's arithmetic:
    // one terminal, accepted, no classified failure.
    const composed = compose();

    activate(composed);
    composed.controller.moveTo({ x: Number.NaN, y: Number.NaN });
    move(50, 40);
    release(50, 40);
    await settled();

    expect(composed.ends).toHaveLength(1);
    expect(composed.ends[0]!.type).toBe('accepted');
    expect(composed.errors).toEqual([]);
  });

  it('should still retarget for a finite point', () => {
    // The positive control: a finite point re-bases exactly as it always did.
    const composed = compose();
    const origin = composed.item.getBoundingClientRect();

    activate(composed);
    composed.controller.moveTo({ x: origin.left + 60, y: origin.top + 25 });

    expect(composed.rendered()).toEqual([60, 25]);
  });

  it('should classify a malformed point rather than discarding it', async () => {
    // **The boundary of the check, asserted so it is not read as general
    // argument validation** (D-91). A `null` point throws at the read, inside
    // the seam, and reaches `FAILURE_ACTION_PREPARE` → `presentation` — the
    // ordinary path for a seam throw, deliberately left alone.
    const composed = compose();

    activate(composed);
    composed.controller.moveTo(null as unknown as Point);
    await settled();

    expect(
      composed.errors.map((error) => (error as { code: string }).code),
    ).toEqual(['presentation']);
  });
});
