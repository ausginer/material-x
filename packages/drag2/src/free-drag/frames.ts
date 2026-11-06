/**
 * Free drag's frame part: five fields and nothing else.
 *
 * The kernel's seven-field slice is not named here and cannot be: `FramePartOf`
 * rejects a part that declares a kernel key at the authoring boundary, and that
 * is the only enforcement. The kernel and the behavior each reset their own
 * fields, for the same reason.
 *
 * The rendered delta is not a field. It is a pure function of the committed
 * sample, the offset and the policy, so `moved`, the request builder and the
 * geometry builder each derive it. `moved` receives a `Readonly` frame and
 * could not write it anyway. This also avoids the mirror-every-write
 * duplication that a stored `renderedDelta` would force: the behavior derives,
 * the kernel records its own writes, and neither reads the other's copy.
 */
import type { FreeDragRequest, FreeDragTransactionResult } from './domain.ts';

export type FreeDragFramePart = {
  /** Needed after activation, in behavior code that receives no scope. */
  visual: HTMLElement | null;
  /**
   * `moveTo`'s re-base. This is an input and not a derivation, so only a
   * `prepare` may write it. That is why it is committed state and not runtime
   * state.
   */
  offsetX: number;
  offsetY: number;
  /**
   * Written by `release.prepare` before the command is returned, so
   * `release.effect` and the `invoke` closure reach the same object. The
   * sortable's `proposal` follows the same rule.
   */
  request: FreeDragRequest | null;
  /**
   * The result, and also the fallback carrier. One field holds both because the
   * fallback rule is that an existing result wins.
   */
  domain: FreeDragTransactionResult | null;
};

// The part's defaults, written once. A create/reset pair cannot keep the
// invariant that every field is both allocated and cleared; only a shared
// source can. `kernel/frames.ts` uses the same shape for the kernel's own
// slice.
const DEFAULT_PART: FreeDragFramePart = {
  visual: null,
  offsetX: 0,
  offsetY: 0,
  request: null,
  domain: null,
};

/**
 * Both frame-part operations that this behavior gives the kernel. Called with
 * no argument, this function allocates a part at its defaults. Called with a
 * part, it resets that part to them. So one function fills both
 * `createFramePart` and `resetFramePart`.
 *
 * The reset runs on every retirement, including when the controller stays alive
 * and idle afterwards. After a commit the inactive frame holds the previous
 * committed state, and an idle controller must not pin the DOM of the drag it
 * just finished.
 */
export function freeDragFramePart(
  existing?: FreeDragFramePart,
): FreeDragFramePart {
  return Object.assign(existing ?? {}, DEFAULT_PART);
}
