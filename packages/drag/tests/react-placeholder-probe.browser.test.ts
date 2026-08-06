/**
 * Probe: what does React reconciliation do to an imperatively inserted,
 * unmanaged placeholder inside a controlled keyed list?
 *
 * Every test drives the fixture through the sortable engine's actual sequence —
 * lift the dragged item, insert the placeholder, move it to the committed gap,
 * then let the consumer commit the accepted order — and asserts on what the DOM
 * looks like at the `useLayoutEffect` readiness point.
 *
 * Findings are written up in `../../drag2/.plan/react-placeholder-probe.md`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import {
  items,
  mountProbe,
  PLACEHOLDER,
  type Item,
  type Probe,
  type Rect,
} from './support/react-probe.ts';

const LIST = ['A', 'B', 'C', 'D', 'E'];

let probe: Probe | null = null;

afterEach(() => {
  probe?.destroy();
  probe = null;
});

/**
 * Reproduces one gesture: lift `dragged`, park the placeholder in its home slot,
 * move it to the gap before `beforeId` (or the end), and return the probe ready
 * for the consumer's commit.
 */
async function grab(
  dragged: string,
  beforeId: string | null,
  options: { strict?: boolean; reuse?: boolean; list?: readonly string[] } = {},
): Promise<Probe> {
  const created = await mountProbe({
    items: items(options.list ?? LIST),
    strict: options.strict,
    reuse: options.reuse,
  });

  probe = created;
  created.insertAfter(dragged);
  created.lift(dragged);
  created.moveBefore(beforeId);
  return created;
}

describe('React reconciliation around an unmanaged placeholder', () => {
  it('should keep the placeholder connected when an item moves downward across it', async () => {
    // Drag B to the gap between D and E.
    const p = await grab('B', 'E');
    const record = await p.commit(items(['A', 'C', 'D', 'B', 'E']));

    expect(record.before.flow).toEqual(['A', 'C', 'D', PLACEHOLDER, 'E']);
    expect(record.layout.connected).toBe(true);
    expect(record.layout.flow).toEqual(['A', 'C', 'D', PLACEHOLDER, 'E']);
  });

  it('should leave the placeholder in the semantic destination gap when an item moves downward across it', async () => {
    const p = await grab('B', 'E');
    const record = await p.commit(items(['A', 'C', 'D', 'B', 'E']));

    expect(record.layout.previousSibling).toBe('D');
    expect(record.layout.nextSibling).toBe('B');
  });

  it('should leave the placeholder in the semantic destination gap when an item moves upward across it', async () => {
    // Drag D to the gap between A and B.
    const p = await grab('D', 'B');
    const record = await p.commit(items(['A', 'D', 'B', 'C', 'E']));

    expect(record.layout.connected).toBe(true);
    expect(record.layout.flow).toEqual(['A', PLACEHOLDER, 'B', 'C', 'E']);
  });

  it('should hold the destination gap when the placeholder is at the start of the list', async () => {
    // Drag E to the very front.
    const p = await grab('E', 'A');
    const record = await p.commit(items(['E', 'A', 'B', 'C', 'D']));

    expect(record.layout.flow).toEqual([PLACEHOLDER, 'A', 'B', 'C', 'D']);
    expect(record.layout.previousSibling).toBe(null);
  });

  it('should hold the destination gap when the placeholder is at the end of the list', async () => {
    // Drag B to the very end.
    const p = await grab('B', null);
    const record = await p.commit(items(['A', 'C', 'D', 'E', 'B']));

    expect(record.layout.flow).toEqual(['A', 'C', 'D', 'E', PLACEHOLDER]);
    expect(record.layout.nextSibling).toBe('B');
  });

  it('should hold the destination gap when a neighbouring item is removed during the commit', async () => {
    // Drag B to the gap between D and E, while A disappears.
    const p = await grab('B', 'E');
    const record = await p.commit(items(['C', 'D', 'B', 'E']));

    expect(record.layout.connected).toBe(true);
    expect(record.layout.flow).toEqual(['C', 'D', PLACEHOLDER, 'E']);
  });

  it('should hold the destination gap when the item anchoring it is removed during the commit', async () => {
    // Drag B to the gap between D and E, while E — the placeholder's own
    // `after` anchor — disappears.
    const p = await grab('B', 'E');
    const record = await p.commit(items(['A', 'C', 'D', 'B']));

    expect(record.layout.connected).toBe(true);
    expect(record.layout.flow).toEqual(['A', 'C', 'D', PLACEHOLDER]);
  });

  it('should hold the destination gap when an item is inserted away from it during the commit', async () => {
    // Drag B to the gap between D and E, while X appears between C and D.
    const p = await grab('B', 'E');
    const record = await p.commit(items(['A', 'C', 'X', 'D', 'B', 'E']));

    expect(record.layout.flow).toEqual(['A', 'C', 'X', 'D', PLACEHOLDER, 'E']);
  });

  it('should lose the destination gap when an item is inserted directly into it during the commit', async () => {
    // Drag B to the gap between D and E, while X appears in that very gap, so
    // the accepted order is A C D X B E and the placeholder must end up
    // between X and E.
    const p = await grab('B', 'E');
    const record = await p.commit(items(['A', 'C', 'D', 'X', 'B', 'E']));

    expect(record.layout.connected).toBe(true);
    // The placeholder marks the gap before X, but B was accepted after X.
    expect(record.layout.previousSibling).toBe('D');
    expect(record.layout.flow).toEqual(['A', 'C', 'D', PLACEHOLDER, 'X', 'E']);
  });

  it('should keep the placeholder position but invalidate its geometry when an item is resized during the commit', async () => {
    const p = await grab('B', 'E');
    const resized = [
      { id: 'A', height: 40 },
      { id: 'C', height: 140 },
      { id: 'D', height: 40 },
      { id: 'B', height: 40 },
      { id: 'E', height: 40 },
    ];
    const record = await p.commit(resized);

    expect(record.layout.flow).toEqual(['A', 'C', 'D', PLACEHOLDER, 'E']);
    expect(record.layout.placeholder!.top).not.toBe(
      record.before.placeholder!.top,
    );
  });

  it('should behave identically when the reorder reuses existing React elements', async () => {
    const p = await grab('B', 'E', { reuse: true });
    const record = await p.commit(items(['A', 'C', 'D', 'B', 'E']));

    expect(record.layout.flow).toEqual(['A', 'C', 'D', PLACEHOLDER, 'E']);
  });

  it('should behave identically under Strict Mode', async () => {
    const p = await grab('B', 'E', { strict: true });
    const record = await p.commit(items(['A', 'C', 'D', 'B', 'E']));

    expect(record.layout.connected).toBe(true);
    expect(record.layout.flow).toEqual(['A', 'C', 'D', PLACEHOLDER, 'E']);
  });
});

describe('placeholder geometry across the readiness point', () => {
  it('should keep pre-commit geometry valid across a pure reorder', async () => {
    // The only element React moves is the lifted one, which is out of flow, so
    // the flow layout is byte-identical before and after the commit.
    const p = await grab('B', 'E');
    const record = await p.commit(items(['A', 'C', 'D', 'B', 'E']));

    expect(record.layout.placeholder).toEqual(record.before.placeholder);
  });

  it('should invalidate pre-commit geometry when the commit adds an item above the gap', async () => {
    const p = await grab('B', 'E');
    const record = await p.commit(items(['A', 'C', 'X', 'D', 'B', 'E']));

    expect(record.layout.placeholder!.top).toBeGreaterThan(
      record.before.placeholder!.top,
    );
  });

  it('should invalidate pre-commit geometry when the commit removes an item above the gap', async () => {
    const p = await grab('B', 'E');
    const record = await p.commit(items(['C', 'D', 'B', 'E']));

    expect(record.layout.placeholder!.top).toBeLessThan(
      record.before.placeholder!.top,
    );
  });

  it('should be stable between the layout effect and the next paint', async () => {
    const p = await grab('B', 'E');
    const record = await p.commit(items(['A', 'C', 'D', 'B', 'E']));

    expect(record.after.placeholder).toEqual(record.layout.placeholder);
    expect(record.after.order).toEqual(record.layout.order);
  });
});

/**
 * Runs one gesture end to end with the experimental correction applied at the
 * readiness point, then releases the presentation.
 *
 * The lifted item is a React-owned keyed child, so after the commit React has
 * already placed it at its authored final slot. Re-anchoring the placeholder to
 * it should therefore put the placeholder in the authored gap by construction.
 */
async function repairAndDrop(
  dragged: string,
  beforeId: string | null,
  accepted: readonly Item[],
): Promise<{
  record: Awaited<ReturnType<Probe['commit']>>;
  dropped: ReturnType<Probe['drop']>;
}> {
  const p = await grab(dragged, beforeId);
  const record = await p.commit(accepted, { repair: dragged });
  const dropped = p.drop(dragged);
  return { record, dropped };
}

describe('re-anchoring the placeholder to the lifted item after readiness', () => {
  it('should repair the gap the reconciliation broke', async () => {
    // The one case that fails without the correction: X mounts into the very
    // gap the placeholder holds, so B is accepted after X.
    const accepted = items(['A', 'C', 'D', 'X', 'B', 'E']);
    const { record, dropped } = await repairAndDrop('B', 'E', accepted);

    expect(record.layout.flow).toEqual(['A', 'C', 'D', PLACEHOLDER, 'X', 'E']);
    expect(record.repaired!.flow).toEqual([
      'A',
      'C',
      'D',
      'X',
      PLACEHOLDER,
      'E',
    ]);
    expect(record.repaired!.order).toEqual([
      'A',
      'C',
      'D',
      'X',
      PLACEHOLDER,
      'B',
      'E',
    ]);
    expect(dropped.flow).toEqual(['A', 'C', 'D', 'X', 'B', 'E']);
  });

  it('should measure the repaired placeholder where the item actually lands', async () => {
    const accepted = items(['A', 'C', 'D', 'X', 'B', 'E']);
    const { record, dropped } = await repairAndDrop('B', 'E', accepted);

    // The strongest available evidence: the rect a landing would have animated
    // to is exactly the rect the item occupies once released.
    expect(record.repaired!.placeholder).toEqual(dropped.items.get('B'));
    expect(record.layout.placeholder).not.toEqual(dropped.items.get('B'));
  });

  // `moves` records whether the correction had to change anything: it should be
  // inert wherever reconciliation already landed the placeholder correctly, and
  // act only on the one case that broke.
  it.each([
    ['downward reorder', 'B', 'E', ['A', 'C', 'D', 'B', 'E'], false],
    ['upward reorder', 'D', 'B', ['A', 'D', 'B', 'C', 'E'], false],
    ['destination at the start', 'E', 'A', ['E', 'A', 'B', 'C', 'D'], false],
    ['destination at the end', 'B', null, ['A', 'C', 'D', 'E', 'B'], false],
    ['neighbour removed', 'B', 'E', ['C', 'D', 'B', 'E'], false],
    ['anchor removed', 'B', 'E', ['A', 'C', 'D', 'B'], false],
    ['neighbour inserted', 'B', 'E', ['A', 'C', 'X', 'D', 'B', 'E'], false],
    [
      'item inserted into the gap',
      'B',
      'E',
      ['A', 'C', 'D', 'X', 'B', 'E'],
      true,
    ],
  ] as const)(
    'should anchor the placeholder to the authored slot — %s',
    async (_name, dragged, beforeId, accepted, moves) => {
      const { record, dropped } = await repairAndDrop(
        dragged,
        beforeId,
        items(accepted),
      );

      expect(record.repaired!.connected).toBe(true);
      // The placeholder immediately precedes the lifted item, so in flow it
      // stands exactly where that item is authored to be.
      expect(record.repaired!.nextSibling).toBe(dragged);
      expect(record.repaired!.placeholder).toEqual(dropped.items.get(dragged));
      expect(dropped.flow).toEqual(accepted);

      if (moves) {
        expect(record.repaired!.order).not.toEqual(record.layout.order);
      } else {
        expect(record.repaired).toEqual(record.layout);
      }
    },
  );

  it('should anchor to the authored slot when an item is resized during the commit', async () => {
    const accepted: readonly Item[] = [
      { id: 'A', height: 40 },
      { id: 'C', height: 140 },
      { id: 'D', height: 40 },
      { id: 'B', height: 40 },
      { id: 'E', height: 40 },
    ];
    const { record, dropped } = await repairAndDrop('B', 'E', accepted);

    expect(record.repaired!.nextSibling).toBe('B');
    expect(record.repaired!.placeholder).toEqual(dropped.items.get('B'));
  });

  it('should be a no-op in the cases reconciliation already got right', async () => {
    const p = await grab('B', 'E');
    const record = await p.commit(items(['A', 'C', 'D', 'B', 'E']), {
      repair: 'B',
    });

    expect(record.repaired).toEqual(record.layout);
  });

  it('should stay stable after paint', async () => {
    const p = await grab('B', 'E');
    const record = await p.commit(items(['A', 'C', 'D', 'X', 'B', 'E']), {
      repair: 'B',
    });

    expect(record.after.order).toEqual(record.repaired!.order);
    expect(record.after.placeholder).toEqual(record.repaired!.placeholder);
  });

  it('should not interfere with placeholder removal', async () => {
    const accepted = items(['A', 'C', 'D', 'X', 'B', 'E']);
    const { dropped } = await repairAndDrop('B', 'E', accepted);

    expect(dropped.connected).toBe(false);
    expect(dropped.placeholder).toBe(null);
    expect(dropped.order).toEqual(['A', 'C', 'D', 'X', 'B', 'E']);
  });
});

/**
 * The smallest handle that distinguishes the three landing targets, mirroring
 * `advanceSettlement`: the presentation is released only once readiness *and*
 * landing have both arrived, in whichever order they arrive.
 */
function createSettlement(measure: () => Rect | null): Readonly<{
  targets: {
    provisional: Rect | null;
    reanchored: Rect | null;
    pinned: Rect | null;
  };
  markReady(rect: Rect | null): void;
  markLanded(): void;
}> {
  const targets = {
    // Measured when the landing plan is built — today, before readiness.
    provisional: measure(),
    reanchored: null as Rect | null,
    pinned: null as Rect | null,
  };
  let ready = false;
  let landed = false;

  const release = (): void => {
    if (ready && landed && targets.pinned === null) {
      targets.pinned = measure();
    }
  };

  return {
    targets,

    markReady(rect) {
      ready = true;
      targets.reanchored = rect;
      release();
    },

    markLanded() {
      landed = true;
      release();
    },
  };
}

describe('landing target across the readiness/landing join', () => {
  const ACCEPTED = ['A', 'C', 'D', 'X', 'B', 'E'];

  it('should pin the repaired target when readiness resolves before landing completes', async () => {
    const p = await grab('B', 'E');
    const settlement = createSettlement(() => p.observe().placeholder);

    const record = await p.commit(items(ACCEPTED), { repair: 'B' });
    settlement.markReady(record.repaired!.placeholder);
    settlement.markLanded();

    const { provisional, reanchored, pinned } = settlement.targets;
    expect(provisional!.top).toBe(120);
    expect(reanchored!.top).toBe(160);
    expect(pinned).toEqual(reanchored);
  });

  it('should pin the repaired target when landing completes before readiness resolves', async () => {
    const p = await grab('B', 'E');
    const settlement = createSettlement(() => p.observe().placeholder);

    // The landing animation finishes while React's commit is still pending —
    // the two ran concurrently, which is the whole point of the join.
    settlement.markLanded();

    const record = await p.commit(items(ACCEPTED), { repair: 'B' });
    settlement.markReady(record.repaired!.placeholder);

    const { provisional, reanchored, pinned } = settlement.targets;
    expect(provisional!.top).toBe(120);
    expect(reanchored!.top).toBe(160);
    expect(pinned).toEqual(reanchored);
  });

  it('should pin the same target regardless of which arrives first', async () => {
    const readyFirst = await grab('B', 'E');
    const a = createSettlement(() => readyFirst.observe().placeholder);
    const recordA = await readyFirst.commit(items(ACCEPTED), { repair: 'B' });
    a.markReady(recordA.repaired!.placeholder);
    a.markLanded();
    readyFirst.destroy();

    const landedFirst = await grab('B', 'E');
    const b = createSettlement(() => landedFirst.observe().placeholder);
    b.markLanded();
    const recordB = await landedFirst.commit(items(ACCEPTED), { repair: 'B' });
    b.markReady(recordB.repaired!.placeholder);

    expect(b.targets.pinned).toEqual(a.targets.pinned);
  });
});

describe('Variant B — the real item stays in flow as the footprint', () => {
  it('should land the footprint at the destination without any unmanaged sibling', async () => {
    const created = await mountProbe({ items: items(LIST) });
    probe = created;

    // No placeholder is inserted and nothing is lifted: the dragged item keeps
    // its own box as the footprint, and a visual clone would live outside the
    // React-owned root.
    const record = await created.commit(items(['A', 'C', 'D', 'B', 'E']));

    expect(record.layout.connected).toBe(false);
    expect(record.layout.flow).toEqual(['A', 'C', 'D', 'B', 'E']);
  });

  it('should place the footprint in the destination gap even when an item is inserted into it', async () => {
    const created = await mountProbe({ items: items(LIST) });
    probe = created;

    // The exact commit that displaces an injected placeholder.
    const record = await created.commit(items(['A', 'C', 'D', 'X', 'B', 'E']));

    expect(record.layout.flow).toEqual(['A', 'C', 'D', 'X', 'B', 'E']);
  });
});
