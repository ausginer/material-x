/**
 * **G3 conformance**: the predicted geometry equals a full scan, and the `DEV`
 * instrument that says so can fail.
 *
 * **Only one axis predicts, so only one axis has a rule to conform to.**
 * `y()` advances its cache by **G3-linear** — the crossed slots translate by
 * one constant along the axis — and that constant is measured once rather than
 * derived, because a prediction may consume only a same-element temporal
 * difference of measured geometry. `xy()` predicts nothing at all and rebuilds
 * after the write, so there is no cellular premise left for a consumer to
 * satisfy or for an instrument to check.
 *
 * G3-linear is not checked in a shipped build: a violation is not reachable
 * through correct use, because it is a contract term, and the consequence is
 * bounded — the committed result is measured, so a violated premise costs an
 * intermediate gap and a wrong transit, never a wrong reorder.
 *
 * **So the instrument is the whole of the enforcement, and an instrument that
 * cannot fail is not evidence.** The negative fixtures below are the
 * load-bearing half of this file: two layouts that genuinely violate the
 * premise — a grid and a wrapping flex, both of which move a crossed item off
 * the axis — on which the prediction must be *caught* disagreeing with the tree
 * rather than quietly animating the wrong rows.
 *
 * **A negative fixture has to violate the premise rather than the
 * implementation.** A column whose flow gap varies from row to row sat here and
 * did not: its rows displace by one exact constant, and it failed only the hole
 * arithmetic, which was the defect. It is now a positive case, and the two
 * authored-presentation cases and the two margin cases beside it are the
 * layouts G1-presented and the per-item-margin clause already promised.
 */
import { afterEach, describe, expect, it } from 'vitest';
import type { DraggableError, DraggableWarning } from '../../src/drag.ts';
import { xy } from '../../src/sortable/xy.ts';
import { y } from '../../src/sortable/y.ts';
import {
  ReorderResolution,
  type SortableConfig,
  type SortableController,
  sortable,
} from '../../src/sortable.ts';

const POINTER_ID = 41;

const cleanup: Array<() => void> = [];

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

type Field = Readonly<{
  root: HTMLElement;
  items: HTMLElement[];
  controller: SortableController;
  errors: Array<DraggableError | DraggableWarning>;
}>;

const press = (target: HTMLElement, x: number, y: number): void => {
  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: x,
      clientY: y,
    }),
  );
};

const pointerEvent = (type: string, x: number, y: number): void => {
  document.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      clientX: x,
      clientY: y,
    }),
  );
};

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

type Shape = Readonly<{
  /** Applied to the container. */
  container: Partial<CSSStyleDeclaration>;
  /** One entry per item, applied to it. */
  sizes: ReadonlyArray<Partial<CSSStyleDeclaration>>;
  axis: SortableConfig['axis'];
}>;

function compose(shape: Shape): Field {
  const root = document.createElement('div');

  Object.assign(root.style, shape.container);
  document.body.append(root);

  const items: HTMLElement[] = [];

  for (const size of shape.sizes) {
    const item = document.createElement('div');

    Object.assign(item.style, size);
    root.append(item);
    items.push(item);
  }

  const errors: Array<DraggableError | DraggableWarning> = [];
  const current: readonly HTMLElement[] = items;
  const controller = sortable(root, {
    items: () => current,
    axis: shape.axis,
    onReorder: () => ReorderResolution.accept(),
    onError: (error) => void errors.push(error),
  });

  root.setPointerCapture = (): void => {};
  root.releasePointerCapture = (): void => {};

  cleanup.push(() => {
    void controller.destroy();
    root.remove();
  });

  return { root, items, controller, errors };
}

/**
 * Drag the first item across the whole field and back, committing a move at
 * every boundary it crosses.
 *
 * **Every ordered gap pair is what the probe behind D-156 scored**, and this is
 * the executable residue of it: one pass down and one back up exercises the
 * hole in both directions from both ends, which is where a rule that is right
 * about one direction and wrong about the other shows up.
 */
const sweep = async (
  field: Field,
  steps: readonly number[][],
): Promise<void> => {
  press(field.items[0]!, 10, 10);

  for (const [x, y2] of steps) {
    pointerEvent('pointermove', x!, y2!);

    await nextFrame();
  }
};

describe('G3-linear conformance', () => {
  const column = (gap: string): Shape => ({
    container: {
      width: '200px',
      display: 'flex',
      flexDirection: 'column',
      gap,
    },
    // Unequal, which is the case a rotation gets wrong and the scalar span
    // gets right — and the counterexample needs exactly two unequal rows.
    sizes: [70, 55, 30, 90].map((height) => ({
      display: 'block',
      width: '100px',
      height: `${height}px`,
    })),
    axis: y(),
  });

  it('should predict every gap on an unequal-size list', async () => {
    const field = compose(column('0px'));

    await sweep(field, [
      [10, 40],
      [10, 120],
      [10, 200],
      [10, 245],
      [10, 120],
      [10, 20],
    ]);

    // The instrument throws through `FAILURE_INVALIDATION`, so silence here is
    // the assertion: every committed move's prediction matched a full scan.
    expect(field.errors).toEqual([]);
  });

  it('should predict every gap with a gap between the rows', async () => {
    // `gap: 12` moves the displacement constant from 40 to 52 without changing
    // the rule, which is what makes the constant's derivation — rather than a
    // measurement — the thing under test.
    const field = compose(column('12px'));

    await sweep(field, [
      [10, 40],
      [10, 140],
      [10, 240],
      [10, 290],
      [10, 140],
      [10, 20],
    ]);

    expect(field.errors).toEqual([]);
  });

  /**
   * **Authored presentation, which G1-presented supports and the hole
   * arithmetic did not.** A `rotate` or a `scale` makes a row's bounding rect
   * larger than its border box, so any hole advance summing *presented* extents
   * over the crossed span drifts by the excess, once per crossed row.
   *
   * An authored `translate` is deliberately not the fixture: it moves a box
   * without resizing it, so it is clean under the broken arithmetic too and
   * proves nothing.
   */
  const presented = (
    presentation: Readonly<{ rotate?: string; scale?: string }>,
  ): Shape => ({
    container: {
      width: '200px',
      display: 'flex',
      flexDirection: 'column',
    },
    // One decorated row rather than all four: the rule has to hold for a list
    // that is *partly* presented, which is the ordinary authoring case.
    sizes: [70, 55, 30, 90].map((height, at) => ({
      display: 'block',
      width: '100px',
      height: `${height}px`,
      ...(at === 1 ? presentation : null),
    })),
    axis: y(),
  });

  it('should predict every gap with an authored rotate on a row', async () => {
    const field = compose(presented({ rotate: '8deg' }));

    await sweep(field, [
      [10, 40],
      [10, 120],
      [10, 200],
      [10, 245],
      [10, 120],
      [10, 20],
    ]);

    expect(field.errors).toEqual([]);
  });

  it('should predict every gap with an authored scale on a row', async () => {
    const field = compose(presented({ scale: '1.2' }));

    await sweep(field, [
      [10, 40],
      [10, 120],
      [10, 200],
      [10, 245],
      [10, 120],
      [10, 20],
    ]);

    expect(field.errors).toEqual([]);
  });

  /**
   * **The second mechanism, and there is no transform anywhere in it.**
   * `placement.ts` sizes the placeholder from `offsetWidth`/`offsetHeight`,
   * which exclude margins, so the placeholder is margin-less by construction
   * while the rows it displaces need not be. Any hole advance derived from the
   * placeholder's own footprint is then short by one item margin per crossed
   * row.
   *
   * Driven on both flex and block, because the two lay margins out differently
   * and the arithmetic was wrong in both.
   */
  const margins = (display: string): Shape => ({
    container: {
      width: '200px',
      display,
      ...(display === 'flex' ? { flexDirection: 'column' } : {}),
    },
    sizes: [70, 55, 30, 90].map((height) => ({
      display: 'block',
      width: '100px',
      height: `${height}px`,
      marginBottom: '10px',
    })),
    axis: y(),
  });

  it('should predict every gap with item margins in a flex column', async () => {
    const field = compose(margins('flex'));

    await sweep(field, [
      [10, 40],
      [10, 140],
      [10, 230],
      [10, 280],
      [10, 140],
      [10, 20],
    ]);

    expect(field.errors).toEqual([]);
  });

  it('should predict every gap with item margins in a block column', async () => {
    const field = compose(margins('block'));

    await sweep(field, [
      [10, 40],
      [10, 140],
      [10, 230],
      [10, 280],
      [10, 140],
      [10, 20],
    ]);

    expect(field.errors).toEqual([]);
  });

  it('should predict every gap when the flow gap varies from row to row', async () => {
    // **The widened case.** Rows still travel one constant when the hole
    // passes them — what varies is where the hole lands, and the hole is
    // measured. The slot half of the instrument is silent on this layout
    // because nothing about it is wrong.
    const field = compose({
      container: {
        width: '200px',
        display: 'block',
      },
      sizes: [0, 30, 4, 40, 0].map((margin) => ({
        display: 'block',
        width: '100px',
        height: '40px',
        marginBottom: `${margin}px`,
      })),
      axis: y(),
    });

    await sweep(field, [
      [10, 60],
      [10, 130],
      [10, 210],
      [10, 120],
      [10, 20],
    ]);

    expect(field.errors).toEqual([]);
  });
});

describe('xy() needs no conformance', () => {
  it('should sweep a fixed-track grid with unequal items', async () => {
    const field = compose({
      container: {
        width: '180px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 60px)',
        gridAutoRows: '60px',
      },
      sizes: [60, 90, 60, 40, 60, 60, 60].map((height) => ({
        height: `${height}px`,
      })),
      axis: xy(),
    });

    await sweep(field, [
      [90, 30],
      [150, 30],
      [30, 90],
      [90, 90],
      [30, 30],
    ]);

    expect(field.errors).toEqual([]);
  });

  it('should sweep a content-sized grid whose tall item crosses a row', async () => {
    // **The layout a cellular prediction got wrong, and the reason there is no
    // longer one to get wrong.** `grid-auto-rows: auto` makes a row's origin
    // depend on its **occupants**, so moving the hole past a tall item moves the
    // row origins themselves. A rotation through fixed cells predicts the old
    // ones; a measured rebuild simply sees the new ones. The tall item sits at
    // index 2 rather than 1 because at index 1 it never crosses a row boundary
    // for any hole position — a fixture that cannot exercise the hazard looks
    // like evidence and is not.
    const field = compose({
      container: {
        width: '180px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 60px)',
        gridAutoRows: 'auto',
      },
      sizes: [60, 60, 110, 60, 60, 60, 60].map((height) => ({
        height: `${height}px`,
      })),
      axis: xy(),
    });

    await sweep(field, [
      [90, 30],
      [150, 30],
      [30, 140],
      [90, 140],
    ]);

    expect(field.errors).toEqual([]);
  });
});

describe('the instrument can fail', () => {
  /** The message the instrument raises. */
  const disagreed = (field: Field): boolean =>
    field.errors.some((error) =>
      /disagreed with a full scan/u.test(
        error.cause instanceof Error ? error.cause.message : error.message,
      ),
    );

  it('should reject a two-column grid driven as a list', async () => {
    // A grid is not a linear flow: moving the hole shifts crossed cells
    // sideways as well as down, and the ones that stay on their row do not move
    // along the axis at all. Driven with `y()` because that is the axis whose
    // premise this violates — `xy()` measures and would be right about it.
    const field = compose({
      container: {
        width: '200px',
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 100px)',
        gridAutoRows: '40px',
      },
      sizes: [0, 1, 2, 3, 4, 5].map(() => ({ height: '40px' })),
      axis: y(),
    });

    await sweep(field, [
      [10, 60],
      [10, 100],
      [10, 140],
      [10, 60],
      [10, 20],
    ]);

    expect(disagreed(field)).toBe(true);
  });

  it('should reject a wrapping flex row driven as a list', async () => {
    // The second violation, and it is a different shape from the grid: the rows
    // are laid out by content rather than by track, so a crossed item can move
    // sideways onto the previous line and travel no distance along the axis at
    // all. Driven with `y()`, whose premise it breaks; `xy()` measures and
    // would be right about it.
    const field = compose({
      container: {
        width: '210px',
        display: 'flex',
        flexWrap: 'wrap',
      },
      sizes: [0, 1, 2, 3, 4, 5].map(() => ({
        width: '100px',
        height: '40px',
      })),
      axis: y(),
    });

    await sweep(field, [
      [10, 60],
      [10, 100],
      [10, 140],
      [10, 60],
      [10, 20],
    ]);

    expect(disagreed(field)).toBe(true);
  });
});
