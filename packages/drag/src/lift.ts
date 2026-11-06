/**
 * The lift: a manual popover promotes the visual into the top layer, which
 * escapes any clipping, transformed or stacking ancestor. The element stays in
 * the DOM and only its rendering moves, so it keeps its styles and inherited
 * custom properties.
 */
import {
  ancestry,
  box as createBox,
  coordinates,
  delta,
  localDelta,
  space,
} from '@ydinjs/box-quad';
import type {
  Landing,
  LiftedAdmission,
  LiftedDrag,
  LiftHold,
} from './draggable.ts';
import { deepActiveElement } from './shared/focus.ts';

const BOX_A = 0;
const BOX_B = 1;
const BOX_C = 2;
const BOX_D = 3;
const BOX_E = 4;
const BOX_F = 5;
const BOX_WIDTH = 6;
const BOX_HEIGHT = 7;
const SPACE_ANCESTOR_ZOOM = 4;

const DEFAULT_LANDING_DURATION = 200;
const DEFAULT_LANDING_EASING = 'ease';
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
  const { ownerDocument } = visual;
  const focused = deepActiveElement(ownerDocument);

  visual.showPopover();

  const current = deepActiveElement(ownerDocument);

  if (current !== focused) {
    if (focused && focused !== ownerDocument.body) {
      (focused as HTMLElement).focus({ preventScroll: true });
    } else {
      (current as HTMLElement).blur();
    }
  }
}

/**
 * All or nothing: setting the attribute already closes a popover the page had
 * opened, and `showPopover` can throw, so a failed acquisition restores what it
 * changed before rethrowing.
 */
function acquireTopLayer(
  visual: HTMLElement,
  report: (error: unknown) => void,
): () => void {
  const priorAttribute = visual.getAttribute('popover');
  const priorOpen = visual.matches(':popover-open');

  const restore = (): void => {
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

  try {
    visual.popover = 'manual';

    if (!visual.matches(':popover-open')) {
      showKeepingFocus(visual);
    }
  } catch (error) {
    try {
      restore();
    } catch (nested) {
      report(nested);
    }

    throw error;
  }

  return restore;
}

/** The kernel's view of a lifted drag, whose members the lift fills. */
type WritableLiftedDrag<State> = {
  -readonly [K in keyof LiftedDrag<State>]: LiftedDrag<State>[K];
};

/**
 * Composes the top-layer lift: pass this function as a behavior's `lift`. The
 * kernel calls it at activation, and a behavior does not call it.
 *
 * Geometry is read before anything mutates, because a traversal taken after the
 * visual is repositioned reads a different ancestry. It throws when the visual
 * has no single 2D box (fragmented, `display: none` or 3D), which is a fault.
 */
export function lift<State>(
  view: WritableLiftedDrag<State>,
  admission: LiftedAdmission<State>,
  realm: Window,
  report: (error: unknown) => void,
): LiftHold {
  const { item } = view;
  const { visual = item } = admission;
  const box = admission.box ?? visual;
  const rect = visual.getBoundingClientRect();
  const boxWidth = box.offsetWidth;
  const boxHeight = box.offsetHeight;
  const visualSpace = space();
  const itemSpace = item === visual ? visualSpace : space();
  const measured = createBox();

  if (
    !ancestry(visual, visualSpace) ||
    (itemSpace !== visualSpace && !ancestry(item, itemSpace)) ||
    !coordinates(visual, measured, visualSpace)
  ) {
    throw new Error('lift/visual-no-box-space');
  }

  const style = realm.getComputedStyle(visual);
  const restoreStyles = captureInlineStyles(visual);
  let releaseTopLayer: () => void;
  let base: string;

  try {
    // Read every UA value before the first write: interleaving them would force
    // a style recalculation per property.
    const values = UA_PROPS.map((prop) => style.getPropertyValue(prop));

    visual.style.boxSizing = 'border-box';
    visual.style.margin = '0';

    for (let i = 0; i < UA_PROPS.length; i += 1) {
      visual.style.setProperty(UA_PROPS[i]!, values[i]!);
    }

    base = `matrix(${measured[BOX_A]!}, ${measured[BOX_B]!}, ${measured[BOX_C]!}, ${measured[BOX_D]!}, ${measured[BOX_E]!}, ${measured[BOX_F]!})`;
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
    // The matrix carries the whole position and the element's own transforms, so
    // it is written now: until the first sample the visual would otherwise paint
    // at the origin.
    visual.style.transform = base;
    releaseTopLayer = acquireTopLayer(visual, report);
  } catch (error) {
    restoreStyles();
    throw error;
  }

  view.visual = visual;
  view.box = box;
  view.rect = rect;
  view.boxWidth = boxWidth;
  view.boxHeight = boxHeight;
  view.visualSpace = visualSpace;
  view.itemSpace = itemSpace;
  view.translatedX = 0;
  view.translatedY = 0;
  view.translate = (x, y) => {
    visual.style.transform = `translate(${x}px, ${y}px) ${base}`;
    view.translatedX = x;
    view.translatedY = y;
  };

  return {
    release() {
      try {
        releaseTopLayer();
      } finally {
        restoreStyles();
      }
    },
    land: (landing) => startLandingAnimation(view, realm, landing),
  };
}

/**
 * The flight is additive, so it composes with whatever else animates the visual.
 * Elevation is a separate replacing animation: added to an item's own `z-index`,
 * the sum wraps in WebKit and the item goes under its siblings.
 */
function startLandingAnimation<State>(
  view: LiftedDrag<State>,
  realm: Window,
  landing: Landing,
): (() => void) | null {
  const { visual, rect, visualSpace, translatedX, translatedY } = view;
  const local = delta();

  if (
    !localDelta(
      visualSpace,
      translatedX - (landing.x - rect.x),
      translatedY - (landing.y - rect.y),
      local,
    ) ||
    (local[0] === 0 && local[1] === 0)
  ) {
    return null;
  }

  const duration = realm.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 0
    : (landing.duration ?? DEFAULT_LANDING_DURATION);
  const flight = visual.animate(
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
    realm.getComputedStyle(visual).position === 'static'
      ? { zIndex: TOP_Z_INDEX, position: 'relative' }
      : { zIndex: TOP_Z_INDEX };
  const elevation = visual.animate([keyframe, keyframe], { duration });

  return () => {
    flight.cancel();
    elevation.cancel();
  };
}
