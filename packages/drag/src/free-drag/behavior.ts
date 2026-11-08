import type { Admission, Behavior, Drag } from '../draggable.ts';
import type { Lifter } from '../lift.ts';
import { listenForInvalidation } from '../shared/invalidation.ts';
import type { BoundsInstaller, MotionConstraint } from './bounds.ts';
import type {
  DragAxis,
  DragGeometry,
  FreeDragResolution,
  FreeDragResult,
  OnDrop,
  ResolveHome,
} from './domain.ts';
import type { LandingTiming } from './landing.ts';
import { FreeDragOperation } from './operation.ts';

export type FreeDragConfig = Readonly<{
  /**
   * Decides the drop: accept to keep the visual where it was dropped, reject to
   * send it home. Commit an accepted position in `onEnd`, after the lift has
   * released the visual's inline styles. A position written here is restored
   * away at release.
   */
  onDrop: OnDrop;
  onStart?(geometry: DragGeometry): void;
  onMove?(geometry: DragGeometry): void;
  onEnd?(result: FreeDragResult): void;
  threshold?: number;
  axis?: DragAxis;
  handle?(root: HTMLElement): HTMLElement | null;
  /** The node that is lifted. Defaults to the root. */
  visual?(root: HTMLElement): HTMLElement;
  home?: ResolveHome;
  bounds?: BoundsInstaller;
  landing?: LandingTiming;
}>;

/**
 * The behavior `draggable` runs for one root: admission and activation. It holds
 * only controller-lifetime values, which the operation reads through it.
 */
export class FreeDragBehavior implements Behavior<
  HTMLElement,
  FreeDragResolution,
  FreeDragOperation
> {
  readonly threshold?: number;
  readonly root: HTMLElement;
  readonly config: FreeDragConfig;
  readonly window: Window & typeof globalThis;
  readonly axis: DragAxis;
  readonly bounds: MotionConstraint | null;
  readonly landing: LandingTiming | null;
  readonly #lifter: Lifter;

  constructor(root: HTMLElement, config: FreeDragConfig, lifter: Lifter) {
    this.threshold = config.threshold;
    this.root = root;
    this.config = config;
    this.window = root.ownerDocument.defaultView!;
    this.#lifter = lifter;
    this.axis = config.axis ?? 'both';
    this.bounds = config.bounds?.(this.window) ?? null;
    this.landing = config.landing ?? null;
  }

  /** Step and invalidation listener: the bounds are re-read on the next sample. */
  readonly invalidate = (): void => {
    this.bounds?.invalidate();
  };

  /** The admission's `state` is the visual: `config.visual`, or the root. */
  admit(event: PointerEvent): Admission<HTMLElement> | null {
    if (event.altKey) {
      return null;
    }

    let handle: HTMLElement | undefined;

    if (this.config.handle) {
      const named = this.config.handle(this.root);

      if (!named || !event.composedPath().includes(named)) {
        return null;
      }

      handle = named;
    }

    return {
      item: this.root,
      ...(handle ? { handle } : {}),
      state: this.config.visual ? this.config.visual(this.root) : this.root,
    };
  }

  activate(
    drag: Drag<FreeDragOperation>,
    visual: HTMLElement,
  ): FreeDragOperation {
    // First, so that its release is the operation's first disposer and runs last.
    const lift = this.#lifter.acquire(drag, visual);

    if (this.bounds) {
      listenForInvalidation(this.window, drag.signal, this.invalidate);
    }

    const operation = new FreeDragOperation(this, drag, lift);

    operation.translate();
    return operation;
  }
}
