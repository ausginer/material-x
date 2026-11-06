/**
 * The lift: a manual popover promotes the visual into the top layer, which
 * escapes any clipping, transformed or stacking ancestor. The element stays in
 * the DOM and only its rendering moves, so it keeps its styles and inherited
 * custom properties.
 */
import {
  ancestry,
  box,
  coordinates,
  space,
  type Space,
} from '@ydinjs/box-quad';

const BOX_A = 0;
const BOX_B = 1;
const BOX_C = 2;
const BOX_D = 3;
const BOX_E = 4;
const BOX_F = 5;
const BOX_WIDTH = 6;
const BOX_HEIGHT = 7;
const SPACE_A = 0;
const SPACE_B = 1;
const SPACE_C = 2;
const SPACE_D = 3;
const SPACE_ANCESTOR_ZOOM = 4;

/**
 * UA popover properties that would change the visual's box or appearance,
 * re-asserted from the authored computed value so promotion is transparent.
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
  };
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

    if (priorAttribute == null) {
      visual.removeAttribute('popover');
    } else {
      visual.setAttribute('popover', priorAttribute);
    }

    if (priorOpen && visual.matches('[popover]')) {
      visual.showPopover();
    }
  };

  try {
    visual.popover = 'manual';

    if (!visual.matches(':popover-open')) {
      visual.showPopover();
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

/**
 * The inverse of an inherited linear part, or `null` for the identity or an
 * unusable space, in which case a local delta is the viewport delta.
 */
export type InheritedSpace = Readonly<{
  a: number;
  b: number;
  c: number;
  d: number;
}> | null;

function inheritedSpaceOf(above: Space): InheritedSpace {
  const a = above[SPACE_A]!;
  const b = above[SPACE_B]!;
  const c = above[SPACE_C]!;
  const d = above[SPACE_D]!;

  if (a === 1 && b === 0 && c === 0 && d === 1) {
    return null;
  }

  const determinant = a * d - b * c;

  if (determinant === 0 || !Number.isFinite(determinant)) {
    return null;
  }

  return {
    a: d / determinant,
    b: -b / determinant,
    c: -c / determinant,
    d: a / determinant,
  };
}

export type Lift = Readonly<{
  /** Writes the viewport delta to the visual. A throw leaves it where it was. */
  write(x: number, y: number): void;
  dispose(): void;
  visualSpace: InheritedSpace;
  itemSpace: InheritedSpace;
}>;

/**
 * Everything geometric is read before anything mutates, because a traversal
 * taken after the visual is repositioned reads a different ancestry. Throws when
 * the visual has no single 2D box: disconnected, fragmented or 3D.
 */
export function acquireLift(
  visual: HTMLElement,
  item: HTMLElement,
  view: Window,
  report: (error: unknown) => void,
): Lift {
  const above = space();
  const itemAbove = item === visual ? above : space();
  const measured = box();

  if (
    !ancestry(visual, above) ||
    (itemAbove !== above && !ancestry(item, itemAbove)) ||
    !coordinates(visual, measured, above)
  ) {
    throw new Error('presentation/visual-no-box-space');
  }

  const visualSpace = inheritedSpaceOf(above);
  const itemSpace =
    itemAbove === above ? visualSpace : inheritedSpaceOf(itemAbove);
  const style = view.getComputedStyle(visual);
  const restoreStyles = captureInlineStyles(visual);

  try {
    // Read every UA value before the first write: interleaving them would force
    // a style recalculation per property.
    const values = UA_PROPS.map((prop) => style.getPropertyValue(prop));

    visual.style.boxSizing = 'border-box';
    visual.style.margin = '0';

    for (let i = 0; i < UA_PROPS.length; i += 1) {
      visual.style.setProperty(UA_PROPS[i]!, values[i]!);
    }

    const a = measured[BOX_A]!;
    const b = measured[BOX_B]!;
    const c = measured[BOX_C]!;
    const d = measured[BOX_D]!;
    const base = `matrix(${a}, ${b}, ${c}, ${d}, ${measured[BOX_E]!}, ${measured[BOX_F]!})`;

    visual.style.transition = 'none';
    visual.style.position = 'fixed';
    visual.style.inset = 'auto';
    visual.style.width = `${measured[BOX_WIDTH]!}px`;
    visual.style.height = `${measured[BOX_HEIGHT]!}px`;
    // Net zoom 1: the top layer does not escape an ancestor's zoom, and the
    // matrix is the sole source of scale.
    visual.style.zoom = `${1 / above[SPACE_ANCESTOR_ZOOM]!}`;
    visual.style.top = '0';
    visual.style.left = '0';
    visual.style.transformOrigin = '0 0';
    // The matrix carries the whole position, so it is written now and not left
    // to the first sample: until then the visual would paint at the origin.
    visual.style.transform = base;

    const releaseTopLayer = acquireTopLayer(visual, report);

    return {
      visualSpace,
      itemSpace,
      write(x: number, y: number): void {
        visual.style.transform = `translate(${x}px, ${y}px) ${base}`;
      },
      dispose(): void {
        try {
          releaseTopLayer();
        } finally {
          restoreStyles();
        }
      },
    };
  } catch (error) {
    restoreStyles();
    throw error;
  }
}
