/**
 * Free drag's frame part: **five fields and nothing else** (contract 07 §The
 * frame part, B-8).
 *
 * The kernel's seven-field slice is not named here and cannot be: `FramePartOf`
 * rejects a part that declares a kernel key at the authoring boundary, which
 * since D-124 is the whole of the enforcement. Reset is split by author for the
 * same reason.
 *
 * **Five against the sortable's eight, and a different *shape***, which is the
 * point M-1 makes about the 12-to-16-field copy cliff and the reason this
 * part's cost must be measured rather than inherited from the sortable's
 * number.
 *
 * **The rendered delta is deliberately not a field.** It is a pure function of
 * the committed sample, the offset and the policy, so `moved`, the request
 * builder and the geometry builder each derive it; `moved` receives a
 * `Readonly` frame and could not write it anyway. That also keeps this behavior
 * clear of the mirror-every-write duplication D-35 was chosen over a
 * `renderedDelta` seam to avoid — the behavior derives, the kernel records its
 * own writes, and neither reads the other's copy.
 */
import type { FreeDragRequest, FreeDragTransactionResult } from './domain.ts';

export type FreeDragFramePart = {
  /** Needed after activation, in seams that receive no scope. */
  visual: HTMLElement | null;
  /**
   * `moveTo`'s re-base. An **input**, not a derivation, so only a `prepare` may
   * write it — which is why it is committed state rather than runtime state.
   */
  offsetX: number;
  offsetY: number;
  /**
   * Written by `release.prepare` before the command is returned, so
   * `release.effect` and the `invoke` closure reach the same object — the
   * sortable's `proposal` discipline exactly.
   */
  request: FreeDragRequest | null;
  /**
   * The result, **and D-66's fallback carrier**. One field for both, because
   * the fallback rule is _existing result wins_.
   */
  domain: FreeDragTransactionResult | null;
};

// The part's defaults, written once. A create/reset pair cannot hold the
// invariant that every field is both allocated and cleared; only a shared
// source can (D-128, D-142) — which is the shape `kernel/frames.ts` already
// runs over the kernel's own slice.
const DEFAULT_PART: FreeDragFramePart = {
  visual: null,
  offsetX: 0,
  offsetY: 0,
  request: null,
  domain: null,
};

/**
 * Both frame-part operations this behavior owes the kernel: called with no
 * argument it **allocates** a part at its defaults, called with one it
 * **returns that part to them** — which is why one function fills both
 * `createFramePart` and `resetFramePart`.
 *
 * The reset runs on every retirement, **including when the controller stays
 * alive and idle afterwards**: after a commit the inactive frame holds the
 * previous committed state, and an idle controller must not pin the DOM of the
 * drag it just finished (I-20).
 */
export function freeDragFramePart(
  existing?: FreeDragFramePart,
): FreeDragFramePart {
  return Object.assign(existing ?? {}, DEFAULT_PART);
}
