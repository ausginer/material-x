/**
 * Presentation resources: inline-style and top-layer leases, the three visual
 * lift strategies, and the active-movement transform writer.
 *
 * A lift promotes the dragged visual with a manual popover: the top layer
 * escapes any transformed, filtered, or contained ancestor, so a `position:
 * fixed` box placed at the item's viewport rect paints above everything without
 * a `z-index`. The element stays in the DOM — only its rendering moves — so it
 * keeps its own styles and inherited custom properties.
 */
import { ancestorZoom, viewportMatrix } from './coordinate.ts';
import type { DOMRealm } from './realm.ts';
import type { Point } from './types.ts';

/** Which lift strategy a free/sortable operation uses. */
export type LiftMode = 'faithful' | 'flat' | 'in-place';

/**
 * UA popover stylesheet properties that would change the visual's box or
 * appearance; re-asserted from the authored computed value so promotion is
 * visually transparent.
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

/** Inline properties a lift overwrites; teardown restores or removes each. */
const LIFTED_PROPS: readonly string[] = [
  'position',
  'inset',
  'top',
  'left',
  'width',
  'height',
  'margin',
  'zoom',
  'box-sizing',
  'transform',
  'transform-origin',
  'transition',
  ...UA_PROPS,
];

// ---------------------------------------------------------------------------
// InlineStyleLease
// ---------------------------------------------------------------------------

/** Captures the inline lifted properties before the first write; restores once. */
export type InlineStyleLease = Readonly<{
  dispose(): void;
}>;

export function captureInlineStyles(visual: HTMLElement): InlineStyleLease {
  const saved = new Map<string, readonly [string, string]>();

  for (const prop of LIFTED_PROPS) {
    const value = visual.style.getPropertyValue(prop);

    if (value) {
      saved.set(prop, [value, visual.style.getPropertyPriority(prop)]);
    }
  }

  let restored = false;

  return {
    dispose() {
      if (restored) {
        return;
      }

      restored = true;

      for (const prop of LIFTED_PROPS) {
        const value = saved.get(prop);

        if (value) {
          visual.style.setProperty(prop, value[0], value[1]);
        } else {
          visual.style.removeProperty(prop);
        }
      }
    },
  };
}

// ---------------------------------------------------------------------------
// TopLayerLease
// ---------------------------------------------------------------------------

/** Enters and restores top-layer/popover state, remembering the prior state. */
export type TopLayerLease = Readonly<{
  dispose(): void;
}>;

export function acquireTopLayer(visual: HTMLElement): TopLayerLease {
  const priorAttribute = visual.getAttribute('popover');
  const priorOpen = visual.matches(':popover-open');

  visual.popover = 'manual';

  if (!visual.matches(':popover-open')) {
    visual.showPopover();
  }

  let disposed = false;

  return {
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;

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
    },
  };
}

// ---------------------------------------------------------------------------
// Shared lift helpers
// ---------------------------------------------------------------------------

function borderBox(style: CSSStyleDeclaration): readonly [number, number] {
  let width = Number.parseFloat(style.width);
  let height = Number.parseFloat(style.height);

  if (style.boxSizing !== 'border-box') {
    width +=
      Number.parseFloat(style.paddingLeft) +
      Number.parseFloat(style.paddingRight) +
      Number.parseFloat(style.borderLeftWidth) +
      Number.parseFloat(style.borderRightWidth);
    height +=
      Number.parseFloat(style.paddingTop) +
      Number.parseFloat(style.paddingBottom) +
      Number.parseFloat(style.borderTopWidth) +
      Number.parseFloat(style.borderBottomWidth);
  }

  return [width, height];
}

function neutralizeUA(visual: HTMLElement, style: CSSStyleDeclaration): void {
  visual.style.boxSizing = 'border-box';
  visual.style.margin = '0';

  for (const prop of UA_PROPS) {
    visual.style.setProperty(prop, style.getPropertyValue(prop));
  }
}

// ---------------------------------------------------------------------------
// VisualLiftSession
// ---------------------------------------------------------------------------

/**
 * One visual's active presentation mode. Composes the inline-style lease and,
 * where applicable, the top-layer lease. It exposes only the transform
 * composition downstream renderer/landing need, and never updates geometry,
 * animates, or invokes callbacks.
 */
export type VisualLiftSession = Readonly<{
  visual: HTMLElement;
  /** The authored/lift base transform the drag translation is composed with. */
  baseTransform: string;
  /** Maps a viewport delta into the space the transform's translate acts in. */
  project(viewportDelta: Point): Point;
  /** The full transform string for a viewport delta. */
  compose(viewportDelta: Point): string;
  dispose(): void;
}>;

const translate = (p: Point): string => `translate(${p.x}px, ${p.y}px)`;

function makeSession(
  visual: HTMLElement,
  baseTransform: string,
  project: (delta: Point) => Point,
  dispose: () => void,
): VisualLiftSession {
  const compose = (viewportDelta: Point): string => {
    const move = translate(project(viewportDelta));
    return baseTransform ? `${move} ${baseTransform}` : move;
  };

  return { visual, baseTransform, project, compose, dispose };
}

/**
 * Acquires a lift. `originRect` is the visual's viewport rect at grab, `mapper`
 * its captured local coordinate space (used only by the in-place strategy).
 * Style capture and top-layer acquisition are pushed onto `use` in acquisition
 * order for LIFO disposal by the caller's presentation scope.
 */
export function acquireLift(
  visual: HTMLElement,
  mode: LiftMode,
  originRect: DOMRectReadOnly,
  projectInPlace: (viewportDelta: Point) => Point,
  realm: DOMRealm,
): VisualLiftSession {
  const style = realm.window.getComputedStyle(visual);
  const styleLease = captureInlineStyles(visual);

  if (mode === 'faithful') {
    const base = viewportMatrix(visual, realm).toString();
    const [width, height] = borderBox(style);

    neutralizeUA(visual, style);
    visual.style.transition = 'none';
    // Net zoom 1: the matrix is the sole source of scale.
    visual.style.zoom = `${1 / ancestorZoom(visual, realm)}`;
    visual.style.position = 'fixed';
    visual.style.inset = 'auto';
    visual.style.top = '0';
    visual.style.left = '0';
    visual.style.width = `${width}px`;
    visual.style.height = `${height}px`;
    visual.style.transformOrigin = '0 0';

    const topLayer = acquireTopLayer(visual);

    return makeSession(
      visual,
      base,
      (viewportDelta) => viewportDelta,
      () => {
        topLayer.dispose();
        styleLease.dispose();
      },
    );
  }

  if (mode === 'flat') {
    const [width, height] = borderBox(style);

    neutralizeUA(visual, style);
    visual.style.transition = 'none';

    const zoom = ancestorZoom(visual, realm);

    if (zoom !== 1) {
      visual.style.zoom = `${1 / zoom}`;
    }

    visual.style.position = 'fixed';
    visual.style.inset = 'auto';
    visual.style.top = `${originRect.top + originRect.height / 2 - height / 2}px`;
    visual.style.left = `${originRect.left + originRect.width / 2 - width / 2}px`;
    visual.style.width = `${width}px`;
    visual.style.height = `${height}px`;

    const topLayer = acquireTopLayer(visual);

    return makeSession(
      visual,
      '',
      (viewportDelta) => viewportDelta,
      () => {
        topLayer.dispose();
        styleLease.dispose();
      },
    );
  }

  // In place: stay in the container, ride the authored transform, suppress
  // transitions so engine transform writes apply instantly.
  const own = style.transform;
  const base = own === 'none' ? '' : own;
  visual.style.transition = 'none';

  return makeSession(visual, base, projectInPlace, () => {
    styleLease.dispose();
  });
}

// ---------------------------------------------------------------------------
// DragRenderer
// ---------------------------------------------------------------------------

/**
 * The sole writer of the engine-owned transform during active movement. Entering
 * settlement transfers transform ownership to the landing runner; the renderer
 * performs no later writes.
 */
export type DragRenderer = Readonly<{
  render(viewportDelta: Point): void;
}>;

export function createDragRenderer(lift: VisualLiftSession): DragRenderer {
  return {
    render(viewportDelta) {
      lift.visual.style.transform = lift.compose(viewportDelta);
    },
  };
}
