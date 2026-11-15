/**
 * `drag:DRI-14` Geometry for `y()`: the gap it proposes is the gap a full
 * measurement gives, over layouts its rule admits. The instrument that compares
 * them is in `support/gap-conformance.ts`, and the last block shows that it fails
 * on layouts outside the rule.
 */
import { describe, expect, it } from 'vitest';
import { layoutAnimation } from '../src/sortable/layout-animation.ts';
import type { SortableConfig } from '../src/sortable.ts';
import {
  type MeasuredElement,
  roundTrip,
  sweepGaps,
} from './support/gap-conformance.ts';
import {
  basicSortable,
  commands,
  makeList,
  onCleanup,
  press,
  rowsOf,
} from './support/harness.ts';

/** Camel-case style properties, assigned to a row's inline style. */
type RowStyle = Readonly<Record<string, string>>;

/**
 * A list styled by `container`, one row per entry of `rows`, under a sortable with
 * `extra`. It drags the first row past its threshold, sweeps the pointer to below
 * the last row and back, and returns every disagreement with the instrument, which
 * measures each row through `measured`.
 */
async function sweepList(
  container: string,
  rows: readonly RowStyle[],
  extra: Partial<SortableConfig> = {},
  measured?: MeasuredElement,
): Promise<string[]> {
  const list = makeList(rows.length, document.body, container);

  for (const [i, row] of rowsOf(list).entries()) {
    Object.assign(row.style, rows[i]);
  }

  basicSortable(list, extra);

  const [dragged, ...destination] = rowsOf(list);
  const { bottom } = list.getBoundingClientRect();
  const start = await press(dragged!);

  await commands.pointerMove(start.x, start.y + 8, 2);

  const disagreements = await sweepGaps({
    rows: destination,
    placeholder: () => list.querySelector('[data-drag-placeholder]'),
    pointerX: start.x,
    path: roundTrip(Math.round(start.y + 8), Math.round(bottom + 10), 4),
    measured,
  });

  await commands.keyPress('Escape');
  return disagreements;
}

const heights = (values: readonly number[], style: RowStyle = {}): RowStyle[] =>
  values.map((height) => ({ height: `${height}px`, width: '100px', ...style }));

describe('drag:DRI-14 y() proposes the gap a full measurement gives', () => {
  it('should agree on rows of unequal heights', async () => {
    expect(
      await sweepList(
        'display:flex;flex-direction:column',
        heights([70, 55, 30, 90]),
      ),
    ).toEqual([]);
  });

  it('should agree under a flow gap between the rows', async () => {
    expect(
      await sweepList(
        'display:flex;flex-direction:column;gap:12px',
        heights([70, 55, 30, 90]),
      ),
    ).toEqual([]);
  });

  it('should agree when the gap varies from row to row', async () => {
    expect(
      await sweepList(
        'display:block',
        [0, 30, 4, 40, 0].map((margin) => ({
          height: '40px',
          width: '100px',
          marginBottom: `${margin}px`,
        })),
      ),
    ).toEqual([]);
  });

  it('should agree with item margins in a flex column', async () => {
    expect(
      await sweepList(
        'display:flex;flex-direction:column',
        heights([70, 55, 30, 90], { marginBottom: '10px' }),
      ),
    ).toEqual([]);
  });

  it('should agree with item margins in a block column', async () => {
    // A block column lays margins out differently from a flex one.
    expect(
      await sweepList(
        'display:block',
        heights([70, 55, 30, 90], { marginBottom: '10px' }),
      ),
    ).toEqual([]);
  });

  it('should agree with an authored rotate on a row', async () => {
    // A rotation enlarges the row's rect beyond its flow footprint, so a rule that
    // summed rect extents over the crossed rows would drift.
    const rows = heights([70, 55, 30, 90]);

    rows[1] = { ...rows[1], rotate: '8deg' };
    expect(await sweepList('display:flex;flex-direction:column', rows)).toEqual(
      [],
    );
  });

  it('should agree with an authored scale on a row', async () => {
    const rows = heights([70, 55, 30, 90]);

    rows[1] = { ...rows[1], scale: '1.2' };
    expect(await sweepList('display:flex;flex-direction:column', rows)).toEqual(
      [],
    );
  });

  it('should agree on sub-pixel geometry with a displacement running', async () => {
    // Gecko reports rects in app units, 1/60 px, and that includes a row in the
    // middle of a displacement. That is reproduced in every engine: every rect is
    // rounded to app units, and every animation is held at 13 ms of a linear
    // 160 ms, where the exact offset of a 43 px row is 39.50625 px.
    const { getBoundingClientRect: nativeRect, animate: nativeAnimate } =
      Element.prototype;
    const appUnit = (value: number): number => Math.round(value * 60) / 60;

    Element.prototype.getBoundingClientRect = function getBoundingClientRect(
      this: Element,
    ) {
      const exact = nativeRect.call(this);
      const left = appUnit(exact.left);
      const top = appUnit(exact.top);

      return new DOMRect(
        left,
        top,
        appUnit(exact.right) - left,
        appUnit(exact.bottom) - top,
      );
    };
    Element.prototype.animate = function animate(
      this: Element,
      ...args: Parameters<Element['animate']>
    ) {
      const animation = nativeAnimate.apply(this, args);

      animation.pause();
      animation.currentTime = 13;
      return animation;
    };
    onCleanup(() => {
      Element.prototype.getBoundingClientRect = nativeRect;
      Element.prototype.animate = nativeAnimate;
    });
    expect(
      await sweepList(
        'display:block;padding-top:0.3px',
        heights([43, 43, 43, 43, 43]),
        {
          displacement: layoutAnimation({ duration: 160, easing: 'linear' }),
        },
      ),
    ).toEqual([]);
  });
});

const collapsingMargins = heights([70, 55, 30, 90], {
  marginTop: '6px',
  marginBottom: '10px',
});

describe('drag:DRI-14 the gap instrument', () => {
  it('should report gap disagreements when the library measures another element than the instrument', async () => {
    // The library measures each row, and the instrument a mark 20 px lower: a
    // layout inside y()'s rule, so the drag runs to the end and every
    // disagreement is a gap.
    const marked = heights([40, 40, 40, 40, 40], { position: 'relative' });
    const disagreements = await sweepList(
      'display:block',
      marked,
      {},
      (row) => {
        if (!row.firstElementChild) {
          row.innerHTML =
            '<div style="position:absolute;top:20px;width:10px;height:40px"></div>';
        }

        return row.firstElementChild as HTMLElement;
      },
    );

    expect(disagreements.length).toBeGreaterThan(0);
    expect(
      disagreements.filter((line) => line.endsWith('no placeholder')),
    ).toEqual([]);
  });

  it('should report a two-column grid driven by y(), whose drag the development check ends', async () => {
    // Relocating the placeholder moves a crossed cell sideways as well as down,
    // which is outside y()'s rule.
    expect(
      await sweepList(
        'display:grid;grid-template-columns:repeat(2,100px);grid-auto-rows:40px',
        heights([40, 40, 40, 40, 40, 40]),
      ),
    ).not.toEqual([]);
  });

  it('should report a wrapping flex row driven by y(), whose drag the development check ends', async () => {
    expect(
      await sweepList(
        'display:flex;flex-wrap:wrap;width:210px',
        heights([40, 40, 40, 40, 40, 40]),
      ),
    ).not.toEqual([]);
  });

  it('should report a block column whose margins collapse on both sides of each row', async () => {
    // The space between two neighbours is the larger of their two margins, so the
    // margin-less placeholder changes the spacing of rows it does not cross.
    expect(await sweepList('display:block', collapsingMargins)).not.toEqual([]);
  });

  it("should agree on a block column whose margins collapse when the placeholder has the rows' margins", async () => {
    const style = document.createElement('style');

    style.textContent = '[data-drag-placeholder] { margin: 6px 0 10px }';
    document.head.append(style);
    onCleanup(() => style.remove());
    expect(await sweepList('display:block', collapsingMargins)).toEqual([]);
  });
});
