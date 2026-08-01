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
    item,
    visual,
    rect,
    factory === null ? null : () => factory(),
  );

describe('createPlaceholder', () => {
  it('should refuse the dragged item even when it is detached', () => {
    // Kept as its own conjunct rather than leaning on `isConnected`: the
    // refusal should not depend on the item happening to be in the document.
    const item = detached();

    expect(() => build(() => item, item)).toThrow(
      /must return a detached element/u,
    );
  });

  it('should refuse the lifted visual even when it is detached', () => {
    const item = detached();
    const visual = detached();

    expect(() => build(() => visual, item, visual)).toThrow(
      /must return a detached element/u,
    );
  });

  it('should refuse a result that is not an element', () => {
    // Named by the placeholder contract, not by whatever `applyMechanics`
    // would have thrown a line later.
    const item = detached();

    expect(() => build(() => ({}) as unknown as HTMLElement, item)).toThrow(
      /must return a detached element/u,
    );
  });

  it('should accept a detached element', () => {
    const item = detached();
    const placeholder = build(detached, item);

    expect(placeholder.hasAttribute('data-drag-placeholder')).toBe(true);
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
    return { root, items, placeholder: detached() };
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

  it('should report no move for an empty destination view', () => {
    const { placeholder } = list(0);

    expect(movePlaceholder(placeholder, gapBefore(null, null))).toBe(false);
  });
});
