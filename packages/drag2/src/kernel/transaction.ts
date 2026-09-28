import type { Frame } from './frames.ts';
import type { Phase } from './phases.ts';

/**
 * The frame pair and the protocol over it: one committed frame, one draft, the
 * shallow copy that opens a transaction and the swap that publishes it.
 *
 * **It names nothing but frames.** No operation record, no behavior, no
 * lifecycle: the part type is a parameter it never inspects, and every act it
 * performs is a copy, a swap or a caller-supplied reset. That is what lets it
 * hold the pair for a controller's life while the policy over the pair — which
 * phase a transaction publishes, whether a preparation taken over it is still
 * valid — stays with the owners of the facts those questions are about.
 *
 * **The two references are swapped rather than copied back**, so nothing may
 * capture either one across a commit. Both are read through the accessors at
 * every use, which is also why {@link current} hands back a `Readonly` view:
 * the committed frame is published to behavior code, and the only writes it
 * ever takes are the draft's, through the swap.
 */
export class FrameTransaction<Part extends object> {
  #current: Frame<Part>;
  #draft: Frame<Part>;

  /**
   * Both frames are composed by the caller and handed over whole, in the state
   * they will be reused in for the controller's life.
   *
   * **Constructed, not installed.** A pair that arrived one frame at a time
   * would give this entity a half-built state to describe and its caller a
   * window in which the composition it is unwinding is partly this entity's
   * and partly its own.
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
   * The shallow copy is enough because every frame field is a scalar,
   * immutable or replace-on-write, which the frame model holds deliberately so
   * that opening a transaction costs one assignment rather than a walk.
   */
  begin(): void {
    Object.assign(this.#draft, this.#current);
  }

  /**
   * Publishes the open transaction, writing `phase` onto the draft first when
   * this transaction changes phase.
   *
   * **The phase arrives as an argument**, so it cannot outlive the call that
   * carries it: a transaction that discards, fails or is invalidated never
   * reaches here, and the phase it would have published goes with the stack
   * frame rather than sitting in a slot the next commit would consume.
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
   * Applies the caller's reset to **both** frames.
   *
   * Retirement writes the committed frame in place, which is the one act no
   * reader of {@link current} can serve — and it is one act over two frames
   * rather than two calls, because a caller that reached each frame separately
   * would be holding this entity's invariant that there are exactly two.
   */
  retire(reset: (target: Frame<Part>) => void): void {
    reset(this.#current);
    reset(this.#draft);
  }
}
