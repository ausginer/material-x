/**
 * The landing coordinate space, pinned to exact values.
 *
 * The four coordinates a timing policy is handed are **origin-relative viewport
 * deltas**: CSS pixels to translate the visual by, measured from where its
 * border box sat at admission. That is the space the kernel's own
 * `lift.write()` consumes and the space the tail is spent in, so a policy
 * converts nothing.
 *
 * The fixture is absolutely positioned at a non-zero offset on both axes, which
 * is what makes the tests discriminating: a viewport point and a delta from the
 * grab rect agree at the origin and nowhere else.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DraggableError, type FailureStage } from '../../src/drag.ts';
import { y } from '../../src/sortable/y.ts';
import {
  type ReorderRequest,
  ReorderResolution,
  type SortableController,
  sortable,
} from '../../src/sortable.ts';

const POINTER_ID = 21;
const ITEM_HEIGHT = 40;
/** Both non-zero, so a delta can never be mistaken for a viewport point. */
const ROOT_TOP = 120;
const ROOT_LEFT = 40;
/** The press, relative to the grabbed row's top-left corner. */
const GRAB_X = 10;
const GRAB_Y = 10;

/** The four numbers one landing hands its timing policy. */
type Endpoints = Readonly<{
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}>;

type Fixture = Readonly<{
  root: HTMLElement;
  items: HTMLElement[];
  /** The grabbed row's rect, measured before anything is lifted. */
  origin: DOMRect;
  endpoints: Endpoints[];
  errors: Array<Readonly<{ stage: FailureStage | null }>>;
  controller: SortableController;
  /** The request the last `onReorder` was handed, for `controller.ready`. */
  request(): ReorderRequest;
}>;

const cleanup: Array<() => void> = [];

beforeEach(() => {});

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

function build(): Fixture {
  const root = document.createElement('div');

  Object.assign(root.style, {
    position: 'absolute',
    top: `${ROOT_TOP}px`,
    left: `${ROOT_LEFT}px`,
    width: '200px',
  });
  document.body.append(root);

  const items: HTMLElement[] = [];

  for (let i = 0; i < 3; i += 1) {
    const item = document.createElement('div');

    Object.assign(item.style, {
      display: 'block',
      width: '100px',
      height: `${ITEM_HEIGHT}px`,
    });
    root.append(item);
    items.push(item);
  }

  const endpoints: Endpoints[] = [];
  let pending: ReorderRequest | null = null;
  const errors: Array<Readonly<{ stage: FailureStage | null }>> = [];

  const controller = sortable(
    root,
    {
      items: () => items,
      axis: y(),
      onReorder: (request) => {
        pending = request;
        return ReorderResolution.accept();
      },
      onError: (error): void => {
        // **Consequential only** (D-130): this suite counts failures, and a
        // warning is by construction not one.
        if (error instanceof DraggableError) {
          errors.push({ stage: error.stage });
        }
      },
    },
    {
      // A timing policy that records the endpoints it is handed and **declines
      // the tail** (D-155). Declining is what keeps the rest of the suite
      // readable: with no additive contribution running on the dropped row, a
      // rect measured after the drop is the element's flow position rather than
      // that position plus a residual.
      landing: () => ({
        landingTiming: (fromX, fromY, toX, toY): null => {
          endpoints.push({ fromX, fromY, toX, toY });
          return null;
        },
      }),
    },
  );

  root.setPointerCapture = (): void => {};
  root.releasePointerCapture = (): void => {};

  cleanup.push(() => {
    void controller.destroy();
    root.remove();
  });

  return {
    root,
    items,
    origin: items[0]!.getBoundingClientRect(),
    endpoints,
    errors,
    controller,
    request: () => pending!,
  };
}

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

/** Press the first row `GRAB_X`/`GRAB_Y` in from its own corner. */
const press = (fixture: Fixture): void => {
  fixture.items[0]!.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: ROOT_LEFT + GRAB_X,
      clientY: ROOT_TOP + GRAB_Y,
    }),
  );
};

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

describe('the landing coordinate space', () => {
  it('should give from as the pointer delta since the grab', async () => {
    const fixture = build();

    press(fixture);
    // 30px down activates; 45px down is where the drop happens.
    pointerEvent('pointermove', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 30);
    await nextFrame();
    pointerEvent('pointerup', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 45);

    expect(fixture.endpoints).toHaveLength(1);
    // Exact, and on both axes: the pointer never moved horizontally.
    expect({
      x: fixture.endpoints[0]!.fromX,
      y: fixture.endpoints[0]!.fromY,
    }).toEqual({ x: 0, y: 45 });
  });

  it('should give a from that is the transform the drag last wrote', async () => {
    // The tightest statement of "one space" this suite can make: the number the
    // policy is handed is the delta the drag itself assigned to the visual,
    // read back off the element. The composed string is that delta followed by
    // the lift's own base matrix, which places the element in the viewport and
    // is not what this row is about — so only the leading term is parsed. An
    // origin creeping in anywhere between the pointer sample and the join shows
    // up here as a different number.
    const fixture = build();

    press(fixture);
    pointerEvent('pointermove', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 30);
    await nextFrame();
    pointerEvent('pointermove', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 45);
    await nextFrame();

    // **Sampled before the drop.** The join releases presentation completely
    // before the policy runs, restoring the inline styles it captured, so the
    // composed transform is gone by the time the endpoints are recorded.
    const written = fixture.items[0]!.style.transform;

    pointerEvent('pointerup', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 45);

    const { fromX, fromY } = fixture.endpoints[0]!;
    const composed = /^translate\((-?[\d.]+)px, (-?[\d.]+)px\)/u.exec(written)!;

    expect({
      x: Number.parseFloat(composed[1]!),
      y: Number.parseFloat(composed[2]!),
    }).toEqual({ x: fromX, y: fromY });
  });

  it('should give target as the landing rect offset from the grab rect', async () => {
    const fixture = build();

    press(fixture);
    pointerEvent('pointermove', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 30);
    await nextFrame();
    pointerEvent('pointerup', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 45);

    // **The dropped row itself is the anchor's witness** (D-155). The
    // placeholder is what `anchorTarget` measured, and the join removes it with
    // the rest of presentation before anything can read it — but the row it was
    // holding a place for takes exactly that place, in flow, on the same
    // statement. The policy declines a tail, so no residual displaces it.
    const anchor = fixture.items[0]!.getBoundingClientRect();
    const { toX, toY } = fixture.endpoints[0]!;

    expect({ x: toX, y: toY }).toEqual({
      x: anchor.left - fixture.origin.left,
      y: anchor.top - fixture.origin.top,
    });
  });

  it('should not give target as a viewport point', async () => {
    // The discriminating case the offset fixture exists for: at a root pinned
    // 120px down and 40px in, a delta and a point cannot coincide.
    const fixture = build();

    press(fixture);
    pointerEvent('pointermove', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 30);
    await nextFrame();
    pointerEvent('pointerup', ROOT_LEFT + GRAB_X, ROOT_TOP + GRAB_Y + 45);

    const { toX, toY } = fixture.endpoints[0]!;
    const anchor = fixture.items[0]!.getBoundingClientRect();

    expect(toX).not.toBe(anchor.left);
    expect(toY).not.toBe(anchor.top);
    expect(fixture.origin.top).toBe(ROOT_TOP);
    expect(fixture.origin.left).toBe(ROOT_LEFT);
  });
});
