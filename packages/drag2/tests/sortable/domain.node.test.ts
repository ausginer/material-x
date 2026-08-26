import { describe, expect, it } from 'vitest';
import { ACCEPTED, ReorderResolution } from '../../src/sortable/domain.ts';

/**
 * **The round-trip value, asserted at the only two places it is observable**
 * (D-143): what the factory returns, and what the library compares it against.
 * Everything between the two is the consumer holding a value it cannot read.
 *
 * The free-drag suite beside this one is the same three rows over the same
 * representation, and they are deliberately not shared: the two behaviors
 * declare their own brand and their own constant, so a shared fixture would
 * assert one module where the contract is two.
 */
describe('ReorderResolution', () => {
  it('should return one shared value for every acceptance', () => {
    // **The allocation claim.** Acceptance declares nothing, so there is
    // nothing to build — and identity, not a string, is what tells the two
    // arms apart in `settlement.prepare`.
    expect(ReorderResolution.accept()).toBe(ReorderResolution.accept());
    expect(ReorderResolution.accept()).toBe(ACCEPTED);
  });

  it('should carry the reason on a rejection and stay distinct from acceptance', () => {
    const rejected = ReorderResolution.reject('nope');

    expect(rejected).not.toBe(ACCEPTED);
    expect(rejected).toEqual(['nope']);
  });

  it('should build a rejection with no reason rather than an acceptance', () => {
    // **The row the shared representation makes necessary.** Both arms are the
    // same carrier, so a rejection with no reason is structurally one slot
    // away from the accepted constant — and identity, not shape, is what keeps
    // them apart.
    const rejected = ReorderResolution.reject();

    expect(rejected).not.toBe(ACCEPTED);
    expect(rejected).toEqual([undefined]);
  });
});
