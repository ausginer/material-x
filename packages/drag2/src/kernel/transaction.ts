import type { Frame } from './frames.ts';
import type { Phase } from './phases.ts';

/**
 * The frame pair and the protocol over it: one committed frame, one draft, the
 * shallow copy that opens a transaction and the swap that publishes it.
 *
 * This class knows only frames. It has no operation record, no behavior and no
 * lifecycle: the part type is a parameter it never inspects, and every action
 * it performs is a copy, a swap or a caller-supplied reset. So it can hold the
 * pair for a controller's life, while the policy over the pair stays with the
 * owners of those facts: which phase a transaction publishes, and whether a
 * preparation taken over the pair is still valid.
 *
 * The two references are swapped and not copied back, so nothing may keep
 * either one across a commit. Both are read through the accessors at every use.
 * This is also why {@link current} returns a `Readonly` view: the committed
 * frame is published to behavior code, and the only writes it ever takes are
 * the draft's, through the swap.
 */
export class FrameTransaction<Part extends object> {
  #current: Frame<Part>;
  #draft: Frame<Part>;

  /**
   * The caller composes both frames and passes them whole, in the state they
   * will be reused in for the controller's life.
   *
   * A pair that arrived one frame at a time would give this class a half-built
   * state to describe. It would also give its caller a window in which the
   * composition being rolled back is partly this class's and partly the
   * caller's.
   */
  constructor(current: Frame<Part>, draft: Frame<Part>) {
    this.#current = current;
    this.#draft = draft;
  }

  /** The published frame. Never written through here. */
  get current(): Readonly<Frame<Part>> {
    return this.#current;
  }

  /** The open transaction's frame, which its owner writes in place. */
  get draft(): Frame<Part> {
    return this.#draft;
  }

  /**
   * Opens a transaction by rebuilding the draft from the committed frame.
   *
   * The shallow copy is enough because every frame field is a scalar, immutable
   * or replaced on write. The frame model keeps that rule so that opening a
   * transaction costs one assignment and not a walk.
   */
  begin(): void {
    Object.assign(this.#draft, this.#current);
  }

  /**
   * Publishes the open transaction. When this transaction changes phase, it
   * writes `phase` onto the draft first.
   *
   * The phase arrives as an argument, so it cannot outlive the call that
   * carries it. A transaction that discards, fails or is invalidated never
   * reaches here. The phase it would have published ends with the stack frame
   * and does not stay in a slot that the next commit would consume.
   */
  commit(phase: Phase | null): void {
    if (phase !== null) {
      this.#draft.phase = phase;
    }

    const previous = this.#current;

    this.#current = this.#draft;
    this.#draft = previous;
  }

  /**
   * Applies the caller's reset to both frames.
   *
   * Retirement writes the committed frame in place, which no reader of
   * {@link current} can do. It is one action over two frames and not two calls,
   * because a caller that reached each frame separately would be holding this
   * class's invariant that there are exactly two.
   */
  retire(reset: (target: Frame<Part>) => void): void {
    reset(this.#current);
    reset(this.#draft);
  }
}
