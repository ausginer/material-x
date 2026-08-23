/**
 * The free-drag behavior, driven through the **public entrypoint**:
 *
 * ```ts
 * freeDrag(item, { onDrop }, bounds(stage), landing({ duration: 0 }))
 * ```
 *
 * **This is the Phase 19 implementation's own verification, not Phase 20's
 * matrix.** What it pins is that the seams are wired: that a press activates,
 * that the visual is written where the policy says, that the round-trip opens
 * and its verdict reaches exactly one terminal, and that the two D-71 controller
 * members do what they are specified to do. The adversarial rows, the restored
 * stories and the per-lift-mode geometry fixtures under transform and zoom are
 * Phase 20's deliverables and are deliberately absent here.
 *
 * Layout: one 100×40 item at the viewport origin, inside a 200×200 stage.
 */
import { describe, expect, it } from 'vitest';
import { bounds } from '../../src/free-drag/bounds.ts';
import { landing } from '../../src/free-drag/landing.ts';
import {
  FreeDragResolution,
  freeDrag,
  type FreeDragController,
} from '../../src/free-drag.ts';
import {
  activate,
  escape,
  freeDragHarness,
  move,
  press,
  release,
  settled,
} from '../support/free-drag.ts';

const { compose, own, reported } = freeDragHarness();

describe('the minimal composition', () => {
  it('should start on a press that crosses the threshold', () => {
    const composed = compose();

    activate(composed);

    expect(composed.starts).toHaveLength(1);
  });

  it('should report the accumulated grab delta to onStart', () => {
    // Parity, ledger §6.2. Activation happens *at* the crossing, so the pointer
    // has already travelled — reporting zero would describe a drag that had not
    // started moving yet.
    const composed = compose();

    activate(composed);

    expect(composed.starts[0]!.viewportDelta).toEqual({ x: 20, y: 0 });
  });

  it('should place the visual at that delta rather than at zero', () => {
    // Parity: **no jump on the first move after activation.** Leaving the
    // visual at the origin until the next sample would show the whole threshold
    // crossing as a jump.
    const composed = compose();

    activate(composed);

    expect(composed.rendered()).toEqual([20, 0]);
  });

  it('should not start for a press that never crosses the threshold', () => {
    const composed = compose();

    press(composed.item);
    move(13, 10);

    expect(composed.starts).toEqual([]);
    expect(composed.ends).toEqual([]);
  });

  it('should write the visual on every committed sample', () => {
    const composed = compose();

    activate(composed);
    move(50, 40);

    expect(composed.rendered()).toEqual([40, 30]);
  });

  it('should notify onMove after the write', () => {
    // The shipped observable, retained: the callback sees the position the
    // visual is already at, not the one it is about to take.
    const composed = compose();
    const seen: Array<readonly [number, number]> = [];

    activate(composed);
    composed.moves.length = 0;
    move(50, 40);

    for (const geometry of composed.moves) {
      seen.push([geometry.viewportDelta.x, geometry.viewportDelta.y]);
    }

    expect(seen).toEqual([[40, 30]]);
  });

  it('should derive the visual rect without measuring it', () => {
    const composed = compose();

    activate(composed);
    move(50, 40);

    const { currentRect, originRect } = composed.moves.at(-1)!;

    expect([currentRect.left, currentRect.top]).toEqual([
      originRect.left + 40,
      originRect.top + 30,
    ]);
  });

  it('should open the round-trip on release and publish one terminal', async () => {
    const composed = compose();

    activate(composed);
    move(50, 40);
    release(50, 40);
    await settled();

    expect(composed.requests).toHaveLength(1);
    expect(composed.ends).toHaveLength(1);
    expect(composed.ends[0]!.type).toBe('accepted');
    expect(composed.errors).toEqual([]);
  });

  it('should build the request from the committed release sample', () => {
    // F-39, applied to this behavior: `pointerup` need not carry the last
    // processed `pointermove`'s coordinates, so the request — and the visual —
    // must come from the release point rather than from the last move.
    const composed = compose();

    activate(composed);
    move(50, 40);
    release(90, 60);

    expect(composed.requests[0]!.viewportDelta).toEqual({ x: 80, y: 50 });
  });

  it('should carry the subject on the request', () => {
    const composed = compose();

    activate(composed);
    release(30, 10);

    expect(composed.requests[0]!.item).toBe(composed.item);
    expect(composed.requests[0]!.visual).toBe(composed.item);
  });

  it('should publish a rejected terminal for a rejected drop', async () => {
    const composed = compose({
      onDrop: () => FreeDragResolution.reject('nope'),
    });

    activate(composed);
    release(30, 10);
    await settled();

    expect(composed.ends).toHaveLength(1);
    expect(composed.ends[0]).toMatchObject({
      type: 'rejected',
      reason: 'nope',
    });
  });

  it('should await an async acceptance', async () => {
    let resolveDrop!: (
      value: ReturnType<typeof FreeDragResolution.accept>,
    ) => void;
    const composed = compose({
      onDrop: () =>
        new Promise((resolve) => {
          resolveDrop = resolve;
        }),
    });

    activate(composed);
    release(30, 10);
    await settled();

    expect(composed.ends).toEqual([]);

    resolveDrop(FreeDragResolution.accept());
    await settled();

    expect(composed.ends).toHaveLength(1);
  });

  it('should treat an invalid resolution as an error, never an acceptance', async () => {
    const composed = compose({
      onDrop: () =>
        42 as unknown as ReturnType<typeof FreeDragResolution.accept>,
    });

    activate(composed);
    release(30, 10);
    await settled();

    expect(composed.errors).toHaveLength(1);
    expect(composed.ends).toHaveLength(1);
    expect(composed.ends[0]!.type).toBe('canceled');
  });

  it('should publish exactly one canceled terminal for an Escape', async () => {
    const composed = compose();

    activate(composed);
    escape();
    await settled();

    expect(composed.ends).toHaveLength(1);
    expect(composed.ends[0]).toMatchObject({ type: 'canceled' });
  });

  it('should publish no terminal for a press that never started', async () => {
    // Q-15: no operation started, so none terminates — asserting a terminal
    // here would be asserting a defect.
    const composed = compose();

    press(composed.item);
    escape();
    await settled();

    expect(composed.ends).toEqual([]);
    expect(composed.errors).toEqual([]);
  });

  it('should report nothing through the platform channel on a clean drag', async () => {
    const composed = compose();

    activate(composed);
    move(50, 40);
    release(50, 40);
    await settled();

    expect(reported()).toEqual([]);
  });
});

describe('the axis policy', () => {
  it('should lock the cross axis when a scalar names one', () => {
    const composed = compose({ config: { axis: 'x' } });

    activate(composed);
    move(50, 40);

    expect(composed.rendered()).toEqual([40, 0]);
  });

  it('should read a source at activation rather than per sample', () => {
    let reads = 0;
    const composed = compose({
      config: {
        axis: () => {
          reads += 1;
          return 'y';
        },
      },
    });

    activate(composed);
    move(50, 40);
    move(60, 50);

    expect(reads).toBe(1);
    expect(composed.rendered()).toEqual([0, 40]);
  });

  it('should re-read the source on invalidate()', () => {
    let axis: 'both' | 'x' | 'y' = 'x';
    const composed = compose({ config: { axis: () => axis } });

    activate(composed);
    move(50, 40);
    expect(composed.rendered()).toEqual([40, 0]);

    axis = 'y';
    composed.controller.invalidate();
    move(60, 50);

    expect(composed.rendered()).toEqual([0, 40]);
  });

  it('should complete a normal unconstrained drag for an unknown axis string', async () => {
    // The **silent** table: an unknown value falls through to unconstrained
    // motion, the drag reports success, and nothing is reported at all.
    const composed = compose({
      config: { axis: 'sideways' as unknown as 'both' },
    });

    activate(composed);
    move(50, 40);

    // Unconstrained on both axes, read before release: the lift is disposed at
    // finalization and the authored transform restored, so the rendered
    // position is only observable while the operation is live.
    expect(composed.rendered()).toEqual([40, 30]);

    release(50, 40);
    await settled();

    expect(composed.ends[0]!.type).toBe('accepted');
    expect(composed.errors).toEqual([]);
    expect(reported()).toEqual([]);
  });
});

describe('bounds()', () => {
  it('should clamp the delta to the source rect', () => {
    const composed = compose({ fragments: [bounds()] });

    activate(composed);
    // Far past the viewport's right edge.
    move(10_000, 10_000);

    const [x, y] = composed.rendered();

    expect(x).toBeLessThan(10_000);
    expect(y).toBeLessThan(10_000);
  });

  it('should contain the visual inside an element source', () => {
    const composed = compose({ fragments: [] });
    const box = document.createElement('div');

    Object.assign(box.style, {
      position: 'fixed',
      top: '0px',
      left: '0px',
      width: '150px',
      height: '150px',
    });
    document.body.append(box);
    own(() => box.remove());

    const constrained = compose({ fragments: [bounds(box)] });

    activate(constrained);
    move(10_000, 10_000);

    const rect = constrained.item.getBoundingClientRect();

    expect(rect.right).toBeLessThanOrEqual(151);
    expect(rect.bottom).toBeLessThanOrEqual(151);
    void composed;
  });

  it('should re-resolve a thunk source after invalidate()', () => {
    let limit = 300;
    const composed = compose({
      fragments: [bounds(() => new DOMRectReadOnly(0, 0, limit, limit))],
    });

    activate(composed);
    move(10_000, 10);
    expect(composed.rendered()).toEqual([200, 0]);

    limit = 150;
    composed.controller.invalidate();
    move(10_000, 10);

    expect(composed.rendered()).toEqual([50, 0]);
  });

  it('should leave the drag unconstrained when the source returns null', () => {
    const composed = compose({ fragments: [bounds(() => null)] });

    activate(composed);
    move(10_000, 10);

    expect(composed.rendered()).toEqual([9990, 0]);
  });
});

describe('moveTo()', () => {
  it('should place the visual at the requested viewport point', () => {
    const composed = compose();
    // **The grab rect, read before activation.** Every point on this surface is
    // viewport, and the offset is measured from where the visual sat when the
    // drag was admitted — reading the rect after activation would measure from
    // a visual that has already travelled.
    const origin = composed.item.getBoundingClientRect();

    activate(composed);
    composed.controller.moveTo({ x: origin.left + 60, y: origin.top + 25 });

    expect(composed.rendered()).toEqual([60, 25]);
  });

  it('should re-base, so later pointer motion continues relative to it', () => {
    // **The stated parity delta** (D-71). The shipped `update({ position })`
    // set an absolute position later samples did not disturb; the re-base is
    // the one that composes with a live pointer rather than fighting it.
    const composed = compose();
    const origin = composed.item.getBoundingClientRect();

    activate(composed);
    composed.controller.moveTo({ x: origin.left + 60, y: origin.top });
    move(40, 10);

    // The pointer travelled 10px further than at activation; the visual is at
    // the re-based 60 plus that 10.
    expect(composed.rendered()).toEqual([70, 0]);
  });

  it('should open the release request from the re-based position', () => {
    // L-4: the landing opens from the **constrained** delta, after a moveTo().
    const composed = compose();
    const origin = composed.item.getBoundingClientRect();

    activate(composed);
    composed.controller.moveTo({ x: origin.left + 60, y: origin.top });
    release(30, 10);

    expect(composed.requests[0]!.viewportDelta).toEqual({ x: 60, y: 0 });
  });
});

describe('the controller', () => {
  it('should close the ingress after destroy()', async () => {
    const composed = compose();

    await composed.controller.destroy();
    activate(composed);

    expect(composed.starts).toEqual([]);
    expect(composed.ends).toEqual([]);
  });

  it('should stay inert for invalidate() and moveTo() after destroy()', async () => {
    const composed = compose();

    await composed.controller.destroy();

    expect(() => {
      composed.controller.invalidate();
      composed.controller.moveTo({ x: 0, y: 0 });
    }).not.toThrow();
  });

  it('should tear down an in-flight drag on destroy, with no terminal', async () => {
    // **D-66's qualifier is doing the work**: exactly one terminal per started
    // operation *on a live controller*. `destroy()` closes the controller
    // logically on the statement, so there is no live controller left to owe a
    // terminal to — the sortable behaves identically and asserts the same
    // absence. The paired positive is the row below: `cancel()` leaves the
    // controller alive, and does publish one.
    const composed = compose();

    activate(composed);
    await composed.controller.destroy();
    await settled();

    expect(composed.ends).toEqual([]);
    expect(composed.item.style.position).toBe('');
  });

  it('should publish one canceled terminal for cancel() mid-drag', async () => {
    const composed = compose();

    activate(composed);
    composed.controller.cancel('by hand');
    await settled();

    expect(composed.ends).toHaveLength(1);
    expect(composed.ends[0]).toMatchObject({
      type: 'canceled',
      reason: 'by hand',
    });
  });
});

describe('landing()', () => {
  it('should still publish exactly one terminal with a landing installed', async () => {
    const composed = compose({
      fragments: [landing({ duration: 0 })],
      onDrop: () => FreeDragResolution.reject(),
    });

    activate(composed);
    move(50, 40);
    release(50, 40);

    await settled();
    await new Promise((resolve) => {
      requestAnimationFrame(() => {
        resolve(null);
      });
    });
    await settled();

    expect(composed.ends).toHaveLength(1);
    expect(composed.ends[0]!.type).toBe('rejected');
  });
});

describe('construction', () => {
  it('should throw nothing for any config the compiler accepts', () => {
    // B-4 (a), in the technique D-77 landed for the sortable: garbage is
    // spread into the **first argument**, because a `Partial` fragment makes a
    // property optional without widening its type (P18A-20).
    const item = document.createElement('div');

    document.body.append(item);
    own(() => item.remove());

    const garbage: Record<string, unknown> = {
      handle: 42,
      visual: 'not a function',
      onMove: null,
      home: 7,
      onEnd: 'nope',
      threshold: Number.NaN,
      lift: 'top-layer',
      axis: {},
    };

    let controller!: FreeDragController;

    expect(() => {
      controller = freeDrag(item, {
        onDrop: () => FreeDragResolution.accept(),
        ...garbage,
      });
    }).not.toThrow();

    expect(controller.moveTo).toBeTypeOf('function');
    own(() => void controller.destroy());
  });

  it('should not let a later fragment clear the required slot', () => {
    // B-9 (c), through the public entry: `onDrop: undefined` is a legal
    // `Partial` value, and the merge's `undefined` skip is the only thing
    // between it and a required slot that is `undefined` at the seam.
    const item = document.createElement('div');

    document.body.append(item);
    own(() => item.remove());

    const controller = freeDrag(
      item,
      { onDrop: () => FreeDragResolution.accept() },
      { onDrop: undefined },
    );

    own(() => void controller.destroy());
    expect(controller.invalidate).toBeTypeOf('function');
  });

  it('should refuse two installers claiming the motion constraint', () => {
    // The package's one construction-time throw, in this behavior's spelling:
    // an invariant over what installers *contribute*, which no signature can
    // state.
    const item = document.createElement('div');

    document.body.append(item);
    own(() => item.remove());

    expect(() =>
      freeDrag(item, { onDrop: () => FreeDragResolution.accept() }, bounds(), {
        plugins: [bounds().bounds!],
      }),
    ).toThrow(/free-drag\/duplicate-contribution/u);
  });
});
