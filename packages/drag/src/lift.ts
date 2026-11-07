/**
 * The lift: a manual popover promotes the visual into the top layer, which
 * escapes any clipping, transformed or stacking ancestor. The element stays in
 * the DOM and only its rendering moves, so it keeps its styles and inherited
 * custom properties.
 *
 * A behavior composes it in its own code: one `Lifter` per controller, whose
 * `cancelLanding` goes to the controller's `use`, and `acquire` as the first
 * statement of `activate`, with the `Lift` kept in `drag.state`.
 */
import {
  ancestry,
  box as createBox,
  coordinates,
  delta,
  localDelta,
  space,
  type Space,
} from '@ydinjs/box-quad';
import type { Drag } from './draggable.ts';
import { deepActiveElement } from './shared/focus.ts';
import {
  DEFAULT_LANDING_DURATION,
  DEFAULT_LANDING_EASING,
} from './shared/timing.ts';

/** Viewport position for the visual's top-left, and the animation's timing. */
export type Landing = Readonly<{
  x: number;
  y: number;
  duration?: number;
  easing?: string;
}>;

/** One operation's lift, from `Lifter.acquire` until the operation's release. */
export type Lift = Readonly<{
  /** The element lifted and translated. */
  visual: HTMLElement;
  /** The element whose offset size `boxWidth` and `boxHeight` report. */
  box: HTMLElement;
  /** The visual's rect at the grab. */
  rect: DOMRectReadOnly;
  boxWidth: number;
  boxHeight: number;
  /** What the visual inherits. Pass it to `localDelta` from `@ydinjs/box-quad`. */
  visualSpace: Space;
  /** What the item inherits. */
  itemSpace: Space;
  /** The viewport delta last translated to. */
  translatedX: number;
  translatedY: number;
  /** Moves the lifted visual to a viewport delta from the grab. */
  translate(x: number, y: number): void;
  /**
   * Names where the visual lands. Call it from `settle`. The landing starts right
   * after the lift is released, and the last call wins. Without a call, nothing
   * lands.
   */
  land(landing: Landing): void;
}>;

/**
 * The lift for one controller. Create it with the controller and pass
 * `cancelLanding` to the controller's `use`. It keeps the running landing, which
 * outlives its operation.
 */
export type Lifter = Readonly<{
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
  acquire(drag: Drag<unknown>, visual?: HTMLElement, box?: HTMLElement): Lift;
  /** Cancels the running landing, if any. It works when detached. */
  cancelLanding(): void;
}>;

/** The `Lift` as `translate` writes it. */
type OwnedLift = { -readonly [Key in keyof Lift]: Lift[Key] };

const BOX_A = 0;
const BOX_B = 1;
const BOX_C = 2;
const BOX_D = 3;
const BOX_E = 4;
const BOX_F = 5;
const BOX_WIDTH = 6;
const BOX_HEIGHT = 7;
const SPACE_ANCESTOR_ZOOM = 4;

const TOP_Z_INDEX = 2_147_483_647;

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
 * The flight is additive, so it composes with whatever else animates the visual.
 * Elevation is a separate replacing animation: added to an item's own `z-index`,
 * the sum wraps in WebKit and the item goes under its siblings.
 */
function startLandingAnimation(
  lift: Lift,
  window: Window,
  landing: Landing,
): (() => void) | null {
  const local = delta();

  if (
    !localDelta(
      lift.visualSpace,
      lift.translatedX - (landing.x - lift.rect.x),
      lift.translatedY - (landing.y - lift.rect.y),
      local,
    ) ||
    (local[0] === 0 && local[1] === 0)
  ) {
    return null;
  }

  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 0
    : (landing.duration ?? DEFAULT_LANDING_DURATION);
  const flight = lift.visual.animate(
    [{ translate: `${local[0]!}px ${local[1]!}px` }, { translate: '0 0' }],
    {
      duration,
      easing: landing.easing ?? DEFAULT_LANDING_EASING,
      composite: 'add',
    },
  );

  if (duration === 0) {
    return () => {
      flight.cancel();
    };
  }

  const keyframe =
    window.getComputedStyle(lift.visual).position === 'static'
      ? { zIndex: TOP_Z_INDEX, position: 'relative' }
      : { zIndex: TOP_Z_INDEX };
  const elevation = lift.visual.animate([keyframe, keyframe], { duration });

  return () => {
    flight.cancel();
    elevation.cancel();
  };
}

/** Creates the lift for one controller, in the window its root belongs to. */
export function createLifter(window: Window): Lifter {
  let cancelRunning: (() => void) | null = null;

  const cancelLanding = (): void => {
    // Taken before it runs, so a landing is cancelled once.
    const cancel = cancelRunning;

    cancelRunning = null;
    cancel?.();
  };

  return {
    acquire(drag, visual = drag.item, box = visual) {
      // A grab during a landing measures the visual with the flight's offset, so
      // the visual stays under the pointer. The flight is cancelled afterwards,
      // before the first lifted frame, also when the acquisition throws.
      try {
        // Geometry is read before anything mutates, because a traversal taken
        // after the visual is repositioned reads a different ancestry.
        const rect = visual.getBoundingClientRect();
        const boxWidth = box.offsetWidth;
        const boxHeight = box.offsetHeight;
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

        const style = window.getComputedStyle(visual);
        // Every UA value is read before the first write: interleaving them would
        // force a style recalculation per property.
        const values = UA_PROPS.map((prop) => style.getPropertyValue(prop));
        const restoreStyles = captureInlineStyles(visual);
        const restoreTopLayer = captureTopLayer(visual);
        const base = `matrix(${measured[BOX_A]!}, ${measured[BOX_B]!}, ${measured[BOX_C]!}, ${measured[BOX_D]!}, ${measured[BOX_E]!}, ${measured[BOX_F]!})`;
        let promoted = false;
        let landing: Landing | null = null;
        const lift: OwnedLift = {
          visual,
          box,
          rect,
          boxWidth,
          boxHeight,
          visualSpace,
          itemSpace,
          translatedX: 0,
          translatedY: 0,
          translate: (x, y) => {
            visual.style.transform = `translate(${x}px, ${y}px) ${base}`;
            lift.translatedX = x;
            lift.translatedY = y;
          },
          land: (named) => {
            landing = named;
          },
        };

        // Registered before the first write, so whatever the acquisition writes
        // before a throw is restored at the operation's release. Two disposers, so
        // that the landing starts right after the release even when the release
        // throws, and each throw is reported once.
        drag.use(() => {
          if (landing) {
            cancelRunning = startLandingAnimation(lift, window, landing);
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
        cancelLanding();
      }
    },
    cancelLanding,
  };
}
