import { describe, expect, it } from 'vitest';
import { RECOVERY_IMMEDIATE } from '../../src/sortable/domain.ts';
import {
  type SortableFramePart,
  sortableFramePart,
} from '../../src/sortable/frames.ts';

/**
 * The same shared source over the first behavior's seven fields (D-142). The
 * sortable is where it matters more: the part carries a non-`null` default —
 * `recovery` — so a reset that forgot it would leave the previous operation's
 * recovery mode standing rather than merely leaving a reference pinned.
 */
describe('sortableFramePart', () => {
  it('should allocate a part at its defaults', () => {
    const allocated = sortableFramePart();

    expect(allocated.item).toBeNull();
    expect(allocated.proposal).toBeNull();
    expect(allocated.recovery).toBe(RECOVERY_IMMEDIATE);
  });

  it('should return an existing part to those same defaults', () => {
    const existing = sortableFramePart();

    existing.recovery = 0;
    existing.item = null;

    expect(sortableFramePart(existing)).toBe(existing);
    expect(existing.recovery).toBe(RECOVERY_IMMEDIATE);
  });

  it('should clear every field it allocates', () => {
    const part = sortableFramePart();

    for (const key of Object.keys(part) as Array<keyof SortableFramePart>) {
      (part as Record<string, unknown>)[key] = 'dirty';
    }

    expect(sortableFramePart(part)).toEqual(sortableFramePart());
  });
});
