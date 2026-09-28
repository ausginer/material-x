import { describe, expect, it } from 'vitest';
import { ACCEPTED, FreeDragResolution } from '../../src/free-drag/domain.ts';

/**
 * **The round-trip value, asserted at the only two places it is observable**
 * (D-140): what the factory returns, and what the library compares it against.
 * Everything between the two is the consumer holding a value it cannot read,
 * which is what makes this three rows rather than a shape suite.
 */
describe('FreeDragResolution', () => {
  it('should return one shared value for every acceptance', () => {
    // **The allocation claim.** Acceptance declares nothing, so there is
    // nothing to build — and identity, not a string, is what tells the two
    // arms apart in `settlement.prepare`.
    expect(FreeDragResolution.accept()).toBe(FreeDragResolution.accept());
    expect(FreeDragResolution.accept()).toBe(ACCEPTED);
  });

  it('should carry the reason on a rejection and stay distinct from acceptance', () => {
    const rejected = FreeDragResolution.reject('nope');

    expect(rejected).not.toBe(ACCEPTED);
    expect(rejected).toEqual(['nope']);
  });

  it('should build a rejection with no reason rather than an acceptance', () => {
    // **The row the shared representation makes necessary.** Both arms are the
    // same carrier, so a rejection with no reason is structurally one slot
    // away from the accepted constant — and identity, not shape, is what keeps
    // them apart.
    const rejected = FreeDragResolution.reject();

    expect(rejected).not.toBe(ACCEPTED);
    expect(rejected).toEqual([undefined]);
  });
});
