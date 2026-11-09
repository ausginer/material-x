/**
 * The lift: a manual popover promotes the visual into the top layer, which
 * escapes any clipping, transformed or stacking ancestor. The element stays in
 * the DOM and only its rendering moves, so it keeps its styles and inherited
 * custom properties.
 *
 * A behavior composes it in its own code: one `Lifter` per controller, whose
 * `cancelLanding` goes to the controller's `use`, and `acquire` as the first
 * statement of `activate`, with the `Lift` kept in the operation it returns.
 */
import {
  ancestry,
  box as createBox,
  coordinates,
  space,
  type Space,
} from '@ydinjs/box-quad';
import type { Drag } from './draggable.ts';
import { deepActiveElement } from './shared/focus.ts';
import type { Landing } from './shared/landing.ts';

export type { Landing } from './shared/landing.ts';

/** One operation's lift, from `Lifter.acquire` until the operation's release. */
export interface Lift {
  /** The element lifted and translated. */
  readonly visual: HTMLElement;
  /** The element whose offset size `boxWidth` and `boxHeight` report. */
  readonly box: HTMLElement;
  /** The visual's rect at the grab. */
  readonly rect: DOMRectReadOnly;
  readonly boxWidth: number;
  readonly boxHeight: number;
  /** What the visual inherits. Pass it to `localDelta` from `@ydinjs/box-quad`. */
  readonly visualSpace: Space;
  /** What the item inherits. */
  readonly itemSpace: Space;
  /** Moves the lifted visual to a viewport delta from the grab. */
  translate(x: number, y: number): void;
  /**
   * Names where the visual lands: `x` and `y` are the viewport position of its
   * top-left. Call it from `settle`. `landing.timing` is called once, now, with
   * the delta last translated to and the delta to the landing, and when it
   * throws, nothing is recorded. `landing.start` starts the animation right after
   * the lift is released, from where the visual is then. The last call wins.
   * Without a call, nothing lands and nothing animates.
   */
  land(x: number, y: number, landing: Landing): void;
}

/**
 * What `land` records. The timing's values are copied at the call, because a
 * timing may reuse the object it returns and code runs between `land` and the
 * landing's start.
 */
type NamedLanding = Readonly<{
  x: number;
  y: number;
  duration: number;
  easing: string;
  landing: Landing;
}>;

const BOX_A = 0;
const BOX_B = 1;
const BOX_C = 2;
const BOX_D = 3;
const BOX_E = 4;
const BOX_F = 5;
const BOX_WIDTH = 6;
const BOX_HEIGHT = 7;
const SPACE_ANCESTOR_ZOOM = 4;

/**
 * UA popover properties that would change the visual's box or appearance,
 * written again from the authored computed value so promotion is transparent.
 */
const UA_PROPS: readonly string[] = [
  'padding',
  'border-width',
  'border-style',
  'border-color',
  'overflow',
  'color',
  'background-color',
];

/**
 * Every inline property the lift overwrites, as longhands. A shorthand does not
 * serialize unless all its longhands agree, so capturing by shorthand records
 * nothing for `margin-left: 8px` and restoring by it drops the declaration.
 */
const LIFTED_PROPS: readonly string[] = [
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'width',
  'height',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'zoom',
  'box-sizing',
  'transform',
  'transform-origin',
  'translate',
  'rotate',
  'scale',
  'transition-property',
  'transition-duration',
  'transition-timing-function',
  'transition-delay',
  'transition-behavior',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border-top-width',
  'border-right-width',
  'border-bottom-width',
  'border-left-width',
  'border-top-style',
  'border-right-style',
  'border-bottom-style',
  'border-left-style',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'overflow-x',
  'overflow-y',
  'color',
  'background-color',
];

/** Restores exactly the declarations the lift owns, once per property. */
function captureInlineStyles(visual: HTMLElement): () => void {
  const hadStyleAttribute = visual.hasAttribute('style');
  const saved = new Map<string, readonly [string, string]>();

  for (const prop of LIFTED_PROPS) {
    const value = visual.style.getPropertyValue(prop);

    if (value) {
      saved.set(prop, [value, visual.style.getPropertyPriority(prop)]);
    }
  }

  return () => {
    for (const prop of LIFTED_PROPS) {
      const value = saved.get(prop);

      if (value) {
        visual.style.setProperty(prop, value[0], value[1]);
      } else {
        visual.style.removeProperty(prop);
      }
    }

    if (!hadStyleAttribute && visual.style.length === 0) {
      // Chromium keeps a pending CSSOM write past `removeAttribute` and recreates
      // an empty attribute later, unless the attribute is read first.
      visual.getAttribute('style');
      visual.removeAttribute('style');
    }
  };
}

/**
 * Promotion runs the popover focusing steps, which focus an `autofocus`
 * descendant. The library does not choose where focus goes, so this puts it back.
 */
function showKeepingFocus(visual: HTMLElement): void {
  const focused = deepActiveElement(visual.ownerDocument);

  visual.showPopover();

  const current = deepActiveElement(visual.ownerDocument);

  if (current !== focused) {
    if (focused && focused !== visual.ownerDocument.body) {
      (focused as HTMLElement).focus({ preventScroll: true });
    } else {
      (current as HTMLElement).blur();
    }
  }
}

/**
 * Records the visual's popover attribute and open state before the lift writes
 * them, and returns how to put both back.
 */
function captureTopLayer(visual: HTMLElement): () => void {
  const priorAttribute = visual.getAttribute('popover');
  const priorOpen = visual.matches(':popover-open');

  return () => {
    if (visual.matches(':popover-open')) {
      visual.hidePopover();
    }

    if (priorAttribute === null) {
      visual.removeAttribute('popover');
    } else {
      visual.setAttribute('popover', priorAttribute);
    }

    if (priorOpen && visual.matches('[popover]')) {
      showKeepingFocus(visual);
    }
  };
}

/**
 * The viewport delta last translated to. Held apart from the `Lift`, so only
 * `translate` writes it, in place: a sample allocates nothing for it.
 */
type Displacement = { x: number; y: number };

/**
 * The lift for one controller. Create it with the controller and pass
 * `cancelLanding` to the controller's `use`. It keeps the running landing, which
 * outlives its operation.
 */
export class Lifter {
  readonly #window: Window;
  #runningAnimationCanceller: (() => void) | null = null;

  constructor(window: Window) {
    this.#window = window;
  }

  /**
   * Lifts the visual of `drag`: call it as the first statement of `activate`,
   * before any other `drag.use`. It registers the release with `drag.use` before
   * it writes anything, so the release runs after every disposer added later and
   * also restores a failed acquisition. It cancels this lifter's running landing
   * after it measures.
   *
   * `visual` defaults to `drag.item`, and `box` to `visual`. It throws when the
   * visual has no single 2D box (fragmented, `display: none` or 3D), which is a
   * fault.
   */
  acquire(
    drag: Drag,
    visual: HTMLElement = drag.item,
    box: HTMLElement = visual,
  ): Lift {
    // A grab during a landing measures the visual with the flight's offset, so
    // the visual stays under the pointer. The flight is cancelled afterwards,
    // before the first lifted frame, also when the acquisition throws.
    try {
      // Geometry is read before anything mutates, because a traversal taken
      // after the visual is repositioned reads a different ancestry.
      const rect = visual.getBoundingClientRect();
      const visualSpace = space();
      const itemSpace = drag.item === visual ? visualSpace : space();
      const measured = createBox();

      if (
        !ancestry(visual, visualSpace) ||
        (itemSpace !== visualSpace && !ancestry(drag.item, itemSpace)) ||
        !coordinates(visual, measured, visualSpace)
      ) {
        throw new Error('lift/visual-no-box-space');
      }

      const style = this.#window.getComputedStyle(visual);
      // Every UA value is read before the first write: interleaving them would
      // force a style recalculation per property.
      const values = UA_PROPS.map((prop) => style.getPropertyValue(prop));
      const restoreStyles = captureInlineStyles(visual);
      const restoreTopLayer = captureTopLayer(visual);
      const base = `matrix(${measured[BOX_A]!}, ${measured[BOX_B]!}, ${measured[BOX_C]!}, ${measured[BOX_D]!}, ${measured[BOX_E]!}, ${measured[BOX_F]!})`;
      const displacement: Displacement = { x: 0, y: 0 };
      let promoted = false;
      let named: NamedLanding | null = null;

      const lift: Lift = {
        visual,
        box,
        rect,
        boxWidth: box.offsetWidth,
        boxHeight: box.offsetHeight,
        visualSpace,
        itemSpace,
        translate: (x, y) => {
          visual.style.transform = `translate(${x}px, ${y}px) ${base}`;
          displacement.x = x;
          displacement.y = y;
        },
        land: (x, y, landing) => {
          const timing = landing.timing(
            displacement.x,
            displacement.y,
            x - rect.x,
            y - rect.y,
          );

          named = {
            x,
            y,
            duration: timing.duration,
            easing: timing.easing,
            landing,
          };
        },
      };

      // Registered before the first write, so whatever the acquisition writes
      // before a throw is restored at the operation's release. Two disposers, so
      // that the landing starts right after the release even when the release
      // throws, and each throw is reported once.
      drag.use(() => {
        if (named) {
          this.#runningAnimationCanceller = named.landing.start(
            visual,
            visualSpace,
            displacement.x - (named.x - rect.x),
            displacement.y - (named.y - rect.y),
            named.duration,
            named.easing,
            this.#window,
          );
        }
      });

      drag.use(() => {
        try {
          if (promoted) {
            restoreTopLayer();
          }
        } finally {
          restoreStyles();
        }
      });

      visual.style.boxSizing = 'border-box';
      visual.style.margin = '0';

      for (let i = 0; i < UA_PROPS.length; i += 1) {
        visual.style.setProperty(UA_PROPS[i]!, values[i]!);
      }

      visual.style.transition = 'none';
      visual.style.position = 'fixed';
      visual.style.inset = 'auto';
      visual.style.width = `${measured[BOX_WIDTH]!}px`;
      visual.style.height = `${measured[BOX_HEIGHT]!}px`;
      // Net zoom 1: the top layer does not escape an ancestor's zoom, and the
      // matrix is the only source of scale.
      visual.style.zoom = `${1 / visualSpace[SPACE_ANCESTOR_ZOOM]!}`;
      visual.style.top = '0';
      visual.style.left = '0';
      visual.style.transformOrigin = '0 0';
      visual.style.translate = 'none';
      visual.style.rotate = 'none';
      visual.style.scale = 'none';
      // The matrix carries the whole position and the element's own transforms,
      // so it is written now: until the first sample the visual would otherwise
      // paint at the origin.
      visual.style.transform = base;
      // Setting the attribute already closes a popover the page had opened.
      promoted = true;
      visual.popover = 'manual';

      if (!visual.matches(':popover-open')) {
        showKeepingFocus(visual);
      }

      return lift;
    } finally {
      this.cancelLanding();
    }
  }

  /** Cancels the running landing, if any. It works when detached. */
  readonly cancelLanding = (): void => {
    // Taken before it runs, so a landing is cancelled once.
    const cancel = this.#runningAnimationCanceller;

    this.#runningAnimationCanceller = null;
    cancel?.();
  };
}
