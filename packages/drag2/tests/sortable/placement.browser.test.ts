/**
 * The placeholder's construction contract and its single canonical writer,
 * driven directly. Both have branches a full drag cannot reach: the dragged
 * item is always connected, so `isConnected` subsumes the identity checks in
 * any real operation, and the spatial path decides inertness before the writer
 * is called at all.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { createRealm } from '../../src/kernel/realm.ts';
import type { Insertion } from '../../src/sortable/domain.ts';
import {
  createPlaceholder,
  movePlaceholder,
} from '../../src/sortable/placement.ts';

const created: HTMLElement[] = [];

afterEach(() => {
  for (const element of created.splice(0)) {
    element.remove();
  }
});

const detached = (): HTMLElement => document.createElement('div');

const rect = new DOMRectReadOnly(0, 0, 10, 10);

/** `visual` is deliberately a *different* element, so each identity conjunct
 * is testable on its own rather than through the other. */
const build = (
  factory: (() => HTMLElement) | null,
  item: HTMLElement,
  visual: HTMLElement = detached(),
) =>
  createPlaceholder(
    createRealm(document.body),
    // `box` defaults to the visual here, as it does in the default composition
    // (D-43). These cases are about the factory's identity refusals, not about
    // the footprint, so the two windows collapse.
    { item, visual, box: visual, rect },
    { width: rect.width, height: rect.height },
    factory === null ? null : () => factory(),
  );

describe('createPlaceholder', () => {
  // **The adoption refusal went 2026-08-25 (D-124), and its three arms are
  // asserted outcomes now.** `config.d.ts` publishes the precondition on the
  // slot the author reads — _must return a **detached** element that is
  // neither the dragged item nor its visual_ — and the type says `HTMLElement`,
  // so every arm tested a state a conforming author cannot reach. What each
  // violation now does is pinned here, in the form this package already uses
  // for a removed check, so a returning guard argues with a test.

  it('should mechanize the dragged item when the factory returns it', () => {
    const item = detached();

    expect(build(() => item, item)).toBe(item);
    // The damage the arm named: the item is now carrying the placeholder's own
    // attributes, and teardown will remove it as if the library owned it.
    expect(item.hasAttribute('data-drag-placeholder')).toBe(true);
  });

  it('should mechanize the lifted visual when the factory returns it', () => {
    const item = detached();
    const visual = detached();

    expect(build(() => visual, item, visual)).toBe(visual);
    expect(visual.hasAttribute('data-drag-placeholder')).toBe(true);
  });

  it('should fail at the first mechanics write for a result that is not an element', () => {
    // No longer named by the placeholder contract: the first `setAttribute`
    // is what fails, which is the ordinary lifecycle path this input was
    // always going to reach one line later.
    const item = detached();

    expect(() => build(() => ({}) as unknown as HTMLElement, item)).toThrow(
      TypeError,
    );
  });

  it('should accept a detached element', () => {
    const item = detached();
    const placeholder = build(detached, item);

    expect(placeholder.hasAttribute('data-drag-placeholder')).toBe(true);
  });

  it('should read no attribute of the default placeholder', () => {
    // **D-127 (b), kept after D-206 removed D-39's ledger.** The snapshot each
    // write would be reversed from used to be built in argument position, so
    // it was taken and thrown away four times per activation. With the ledger
    // gone nothing reads the placeholder back at all, and this row keeps it
    // so. The reads are on the **placeholder**, which does not exist until the
    // call returns, so the instrument records every `getAttribute` and its
    // receiver and filters afterwards.
    const calls: Array<Readonly<{ element: Element; name: string }>> = [];
    // Captured to delegate to from the patch below: `native.call(this, name)`.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const native = Element.prototype.getAttribute;
    const item = detached();
    let placeholder: HTMLElement;

    Element.prototype.getAttribute = function patched(
      this: Element,
      name: string,
    ): string | null {
      calls.push({ element: this, name });
      return native.call(this, name);
    };

    try {
      placeholder = build(null, item);
    } finally {
      Element.prototype.getAttribute = native;
    }

    expect(
      calls
        .filter((call) => call.element === placeholder)
        .map(({ name }) => name),
    ).toEqual([]);
    // Not vacuous: the mechanics did run, and the one read they are *supposed*
    // to make — the item's `slot`, which the placeholder mirrors — happened.
    expect(
      calls.filter((call) => call.element === item).map(({ name }) => name),
    ).toEqual(['slot']);
    expect(placeholder.getAttributeNames()).toContain('data-drag-placeholder');
  });
});

describe('movePlaceholder', () => {
  /** A list of `count` children plus a detached placeholder. */
  const list = (
    count: number,
  ): Readonly<{
    root: HTMLElement;
    items: HTMLElement[];
    placeholder: HTMLElement;
  }> => {
    const root = document.createElement('div');
    const items: HTMLElement[] = [];

    for (let i = 0; i < count; i += 1) {
      const item = document.createElement('div');

      item.dataset['n'] = String(i);
      root.append(item);
      items.push(item);
    }

    document.body.append(root);
    created.push(root);

    const placeholder = detached();

    // Inserted, and deliberately not at either end: `movePlaceholder` moves a
    // placeholder that activation already put in the list, and it now refuses
    // an anchor outside the placeholder's own container — a detached
    // placeholder has none, so it would refuse everything. The middle slot is
    // the one position that is neither of the two gaps these tests move to.
    if (items.length > 1) {
      items[1]!.before(placeholder);
    } else {
      root.append(placeholder);
    }

    return { root, items, placeholder };
  };

  const gapBefore = (after: HTMLElement | null, before: HTMLElement | null) =>
    ({ version: 0, index: 0, before, after }) satisfies Insertion;

  it('should report that it moved the placeholder', () => {
    const { items, placeholder } = list(2);

    expect(movePlaceholder(placeholder, gapBefore(items[0]!, null))).toBe(true);
  });

  it('should report that an already-positioned placeholder did not move', () => {
    // The return value is the contract's "whether a move occurred". The
    // spatial path decides inertness before the hooks, so this branch is only
    // reachable from the release and home-recovery callers.
    const { items, placeholder } = list(2);
    const gap = gapBefore(items[0]!, null);

    movePlaceholder(placeholder, gap);

    expect(movePlaceholder(placeholder, gap)).toBe(false);
  });

  it('should not touch the DOM for an already-positioned placeholder', () => {
    // Re-inserting resets CSS transitions on the placeholder and forces a
    // reflow, so inertness is behaviour, not an optimisation.
    const { root, items, placeholder } = list(2);
    const gap = gapBefore(items[0]!, null);

    movePlaceholder(placeholder, gap);

    const records: MutationRecord[] = [];
    const observer = new MutationObserver((entries) => {
      records.push(...entries);
    });

    observer.observe(root, { childList: true });
    movePlaceholder(placeholder, gap);
    records.push(...observer.takeRecords());
    observer.disconnect();

    expect(records).toEqual([]);
  });

  it('should append for an end gap', () => {
    const { root, items, placeholder } = list(2);

    expect(movePlaceholder(placeholder, gapBefore(null, items[1]!))).toBe(true);
    expect(root.lastElementChild).toBe(placeholder);
  });

  it('should refuse an anchor in another container', () => {
    // `before()` is relative to the anchor, so this does not fail on its own —
    // it silently moves the placeholder out of the list and into the other
    // container, taking the drag's layout footprint with it.
    const { placeholder } = list(2);
    const { items: foreign } = list(2);

    expect(() =>
      movePlaceholder(placeholder, gapBefore(foreign[0]!, null)),
    ).toThrow(/sortable\/anchor-outside-container/u);
  });

  it('should refuse a foreign anchor used as an end gap', () => {
    // The `before` branch is a separate insertion path and needs its own check.
    const { placeholder } = list(2);
    const { items: foreign } = list(2);

    expect(() =>
      movePlaceholder(placeholder, gapBefore(null, foreign[1]!)),
    ).toThrow(/sortable\/anchor-outside-container/u);
  });

  it('should leave the placeholder where it was when it refuses', () => {
    const { root, placeholder } = list(2);
    const { items: foreign } = list(2);
    const parent = placeholder.parentElement;

    expect(() =>
      movePlaceholder(placeholder, gapBefore(foreign[0]!, null)),
    ).toThrow();

    expect(parent).toBe(root);
    expect(placeholder.parentElement).toBe(root);
  });

  it('should refuse to move a placeholder that is no longer in the tree', () => {
    // A detached placeholder has no container, so every anchor is outside it.
    // Reaching this means teardown already removed it, and re-inserting it
    // would resurrect a footprint the operation has finished with.
    const { items, placeholder } = list(2);

    placeholder.remove();

    expect(() =>
      movePlaceholder(placeholder, gapBefore(items[0]!, null)),
    ).toThrow(/sortable\/anchor-outside-container/u);
  });

  it('should report no move for an empty destination view', () => {
    const { placeholder } = list(0);

    expect(movePlaceholder(placeholder, gapBefore(null, null))).toBe(false);
  });
});
