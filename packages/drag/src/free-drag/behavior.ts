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
import type { DropTargets } from './drop-targets.ts';
import type { Landing } from './landing.ts';
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
  landing?: Landing;
  /**
   * Drop targets, from `dropTargets()` in `free-drag/drop-targets.js`. Without
   * it, no target is tracked and the request's `target` is `null`.
   */
  targets?: DropTargets;
}>;

/**
 * The controller's `invalidate` step: calls the operation's `handleEvent`, so its
 * bounds and drop targets are re-read at their next read. With no operation,
 * nothing is stale, because each activation marks the bounds stale before its
 * first read.
 */
export function invalidate(operation: FreeDragOperation | null): void {
  operation?.handleEvent();
}

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
  readonly _root: HTMLElement;
  readonly _config: FreeDragConfig;
  readonly _window: Window & typeof globalThis;
  readonly _axis: DragAxis;
  readonly _bounds: MotionConstraint | null;
  readonly _landing: Landing | null;
  readonly #lifter: Lifter;

  constructor(root: HTMLElement, config: FreeDragConfig, lifter: Lifter) {
    this.threshold = config.threshold;
    this._root = root;
    this._config = config;
    this._window = root.ownerDocument.defaultView!;
    this.#lifter = lifter;
    this._axis = config.axis ?? 'both';
    this._bounds = config.bounds?.(this._window) ?? null;
    this._landing = config.landing ?? null;
  }

  /** The admission's `state` is the visual: `config.visual`, or the root. */
  admit(event: PointerEvent): Admission<HTMLElement> | null {
    if (event.altKey) {
      return null;
    }

    let handle: HTMLElement | undefined;

    if (this._config.handle) {
      const named = this._config.handle(this._root);

      if (!named || !event.composedPath().includes(named)) {
        return null;
      }

      handle = named;
    }

    return {
      item: this._root,
      ...(handle ? { handle } : {}),
      state: this._config.visual ? this._config.visual(this._root) : this._root,
    };
  }

  activate(
    drag: Drag<FreeDragOperation>,
    visual: HTMLElement,
  ): FreeDragOperation {
    // First, so that its release is the operation's first disposer and runs last.
    const lift = this.#lifter.acquire(drag, visual);

    // The box may be from before a scroll between operations, and no operation
    // clamps against a box measured before it activated.
    this._bounds?.invalidate();

    // `targets` registers its release before it pulls the consumer's targets.
    const operation = new FreeDragOperation(
      this,
      drag,
      lift,
      this._config.targets?.(drag, this._window) ?? null,
    );

    if (this._bounds || this._config.targets) {
      listenForInvalidation(this._window, drag.signal, operation);
    }

    operation._translate();
    return operation;
  }
}
