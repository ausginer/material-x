/**
 * The optional features, through the public composition.
 *
 * Each one is a slot the behavior reaches only when something filled it, so the
 * question every test here asks is the same: does installing it change exactly
 * the one thing it claims, and does the behavior still do everything it did
 * without it? The minimal composition already proved the second half in
 * `composition.browser.test.ts`; these add the first.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DraggableError,
  type DraggableWarning,
  type Point,
} from '../../src/drag.ts';
import { toDraggableError } from '../../src/kernel/errors.ts';
import { FAILURE_LANDING_CREATE } from '../../src/kernel/failures.ts';
import type { OnReorder } from '../../src/sortable/domain.ts';
import type {
  AxisInstaller,
  LandingHandle,
  LandingStart,
  SortableInstaller,
} from '../../src/sortable/feature.ts';
import { landing } from '../../src/sortable/landing.ts';
import { layoutAnimation } from '../../src/sortable/layout-animation.ts';
import { y } from '../../src/sortable/y.ts';
import {
  ReorderResolution,
  type SortableConfig,
  type SortableController,
  sortable,
} from '../../src/sortable.ts';

const POINTER_ID = 14;
const ITEM_HEIGHT = 40;

type Composed = Readonly<{
  root: HTMLElement;
  items: HTMLElement[];
  controller: SortableController;
  finishes: unknown[];
  cancels: unknown[];
  errors: Array<DraggableError | DraggableWarning>;
  placeholder(): HTMLElement | null;
}>;

/**
 * Read from the kernel's own stage → code mapping rather than retyped, so a
 * remapped stage fails here instead of silently agreeing with a stale literal.
 */
const LANDING_CREATE_CODE = toDraggableError(FAILURE_LANDING_CREATE, null).code;

const cleanup: Array<() => void> = [];

beforeEach(() => {});

afterEach(() => {
  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

type ComposeOptions = Readonly<{
  itemCount?: number;
  onReorder?: OnReorder;
  /**
   * Whatever the test wants merged on top of the base config. A fragment is a
   * plain partial config now (D-45), so a test that used to install a feature
   * writes the slot directly.
   */
  fragments?: ReadonlyArray<Partial<SortableConfig>>;
  /** The axis rule, when a test needs one that is not stock `y()`. */
  axis?: AxisInstaller;
}>;

/** 40px items, plus whichever optional slots the test fills. */
function composeWith(options: ComposeOptions = {}): Composed {
  const root = document.createElement('div');

  root.style.width = '200px';
  document.body.append(root);

  const items: HTMLElement[] = [];

  for (let i = 0; i < (options.itemCount ?? 3); i += 1) {
    const item = document.createElement('div');

    Object.assign(item.style, {
      display: 'block',
      width: '100px',
      height: `${ITEM_HEIGHT}px`,
    });
    root.append(item);
    items.push(item);
  }

  const finishes: unknown[] = [];
  const cancels: unknown[] = [];
  const errors: Array<DraggableError | DraggableWarning> = [];

  const controller = sortable(
    root,
    {
      items: () => items,
      onReorder: options.onReorder ?? (() => ReorderResolution.accept()),
      axis: options.axis ?? y(),
      onEnd: (result): void => {
        // D-62: one callback, and the fixture makes the split its own
        // assertions still read against.
        if (result.type === 'accepted' || result.type === 'noop') {
          finishes.push(result);
        } else {
          cancels.push(result);
        }
      },
      onError: (error): void => {
        errors.push(error);
      },
    },
    ...(options.fragments ?? []),
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
    controller,
    finishes,
    cancels,
    errors,
    placeholder: () => root.querySelector('[data-drag-placeholder]'),
  };
}

const compose = (
  ...fragments: ReadonlyArray<Partial<SortableConfig>>
): Composed => composeWith({ fragments });

const press = (target: HTMLElement, y = 10): void => {
  target.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: 10,
      clientY: y,
    }),
  );
};

const pointerEvent = (type: string, y: number): void => {
  document.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      clientX: 10,
      clientY: y,
    }),
  );
};

const move = (y: number): void => {
  pointerEvent('pointermove', y);
};

const release = (y: number): void => {
  pointerEvent('pointerup', y);
};

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const activate = (composed: Composed): void => {
  press(composed.items[0]!);
  move(30);
};

const drag = async (y: number): Promise<void> => {
  move(y);
  await nextFrame();
};

/**
 * Run `body` with `(prefers-reduced-motion: reduce)` matching.
 *
 * Only `matches` is read, and only through `realm.window`, so a stub is the
 * whole of the dependency.
 */
const withReducedMotion = async <T>(body: () => Promise<T>): Promise<T> => {
  const native = window.matchMedia;

  window.matchMedia = (query: string): MediaQueryList => {
    const stub: Partial<MediaQueryList> = {
      matches: query.includes('reduce'),
      media: query,
    };

    return stub as MediaQueryList;
  };

  try {
    return await body();
  } finally {
    window.matchMedia = native;
  }
};

/**
 * A landing runner authored at the **middle tier** (D-63): the three lines
 * `landing()` itself writes, which is what a consumer's `run` used to reach.
 */
const authoredLanding = (
  start: LandingStart,
): { landing: SortableInstaller } => ({
  landing: () => ({ startLanding: start }),
});

describe('placeholder', () => {
  it('should use the element the factory returned', () => {
    const composed = compose({
      placeholder: () => document.createElement('section'),
    });

    activate(composed);

    expect(composed.placeholder()!.localName).toBe('section');
  });

  it('should leave the classes the factory set untouched', () => {
    // **D-65 removed the only class the library ever wrote.** With
    // `placeholderClassName` gone the guarantee is stronger and simpler than
    // the `classList.add`-not-assignment rule it replaces: beyond the mechanics
    // in `applyMechanics`, the library writes no visual styling at all, so
    // whatever the factory set is exactly what survives.
    const composed = compose({
      placeholder: () => {
        const element = document.createElement('div');

        element.className = 'authored';
        return element;
      },
    });

    activate(composed);

    expect([...composed.placeholder()!.classList]).toEqual(['authored']);
  });

  it('should write no mechanics once the factory destroys the controller', () => {
    // C5-03's stretch sweep. The factory is consumer code and the element it
    // returns is the **consumer's own**, adopted by nothing until activation
    // commits — teardown removes only the placeholder it inserted. So an
    // attribute written between the factory returning and the library's next
    // liveness reading is a mutation nothing undoes (I-36 (2) act 3).
    const created: HTMLElement[] = [];
    const composed: Composed = compose({
      placeholder: () => {
        const element = document.createElement('div');

        created.push(element);
        void composed.controller.destroy();
        return element;
      },
    });

    activate(composed);

    expect(created).toHaveLength(1);
    expect(created[0]!.hasAttribute('data-drag-placeholder')).toBe(false);
    expect(created[0]!.hasAttribute('aria-hidden')).toBe(false);
  });

  it('should still apply the default mechanics to a custom element', () => {
    // The mechanics are not configurable away, and they belong to the behavior
    // rather than to this slot — so they have to survive a factory.
    const composed = compose({
      placeholder: () => document.createElement('section'),
    });

    activate(composed);

    const element = composed.placeholder()!;

    expect(element.getAttribute('aria-hidden')).toBe('true');
    expect(element.getBoundingClientRect().height).toBe(ITEM_HEIGHT);
  });

  it('should adopt a factory result that is already connected', () => {
    // **The refusal went 2026-08-25 (D-124).** `config.d.ts` publishes the
    // precondition on the slot — a **detached** element that is neither the
    // item nor its visual — so an attached one is outside the contract and the
    // gate closes before ownership is asked. The damage the check named is
    // what happens instead: the behavior *adopts* the node, moving it out of
    // the place the page put it.
    const composed = compose({ placeholder: () => composed.items[2]! });

    activate(composed);

    expect(composed.errors).toEqual([]);
    expect(composed.placeholder()).toBe(composed.items[2]!);
  });

  it('should classify a factory that throws and leave nothing acquired', () => {
    // The matrix's resource-cleanup row. A throwing factory is the earliest
    // point at which the operation already owns something — the lift was
    // acquired in `activation.prepare` before the placeholder existed — so the
    // question is whether a discarded prepare releases it.
    const failure = new Error('no placeholder for you');
    const composed = compose({
      placeholder: (): HTMLElement => {
        throw failure;
      },
    });

    activate(composed);

    expect(composed.errors).toHaveLength(1);
    expect(composed.placeholder()).toBeNull();
    expect(composed.items[0]!.style.position).toBe('');
    expect(composed.items[0]!.style.transform).toBe('');
  });

  it('should roll back every library write when a cancelling factory discards the preparation', () => {
    // **D-39, and the case that makes `activation.rollback` non-vacuous.**
    // ~~A discarded prepare leaves only a detached element for the collector~~
    // is true of the library's own `<div>` and false the moment a factory
    // exists: `prepare` writes onto an element the **consumer** created, and
    // `preparationValid()` discards the *preparation*, not the element.
    //
    // A `cancel()` rather than a `destroy()` is the discriminating shape.
    // Destroying closes the controller, so the post-factory liveness reading
    // returns the element unmechanized and there is nothing to undo — the case
    // above already pins that. Cancelling leaves the controller open, so every
    // write lands and only the seam is invalidated.
    const created: HTMLElement[] = [];
    const composed: Composed = compose({
      placeholder: () => {
        const element = document.createElement('div');

        element.setAttribute('slot', 'mine');
        element.setAttribute('data-mine', 'kept');
        element.style.color = 'red';
        created.push(element);
        composed.controller.cancel('discard the preparation');
        return element;
      },
    });

    activate(composed);

    const element = created[0]!;
    const attributes = Object.fromEntries(
      element
        .getAttributeNames()
        .map((name) => [name, element.getAttribute(name)]),
    );

    // **An attribute map, not `outerHTML`.** A removed-then-restored attribute
    // is re-appended, so the honest guarantee is the same names with the same
    // values, never the same bytes.
    expect(attributes).toEqual({
      slot: 'mine',
      'data-mine': 'kept',
      style: 'color: red;',
    });
    // The item's own `slot` is absent, so the mechanics *removed* `slot="mine"`
    // on the way in — which is why the undo restores rather than deletes.
    expect(composed.items[0]!.hasAttribute('slot')).toBe(false);
    // And no residue: `style=""` and `class=""` are absent rather than empty.
    expect(element.style.width).toBe('');
    expect(element.style.height).toBe('');
    expect(element.hasAttribute('class')).toBe(false);
  });

  it('should leave no style attribute behind on a rolled-back element that had none', () => {
    // The normalization half of the row, and the case that found a platform
    // difference: after an inline property has been written through the CSSOM,
    // `removeAttribute('style')` leaves `style=""` behind in Chromium, so the
    // undo removes the attribute node itself. Asserted as the whole attribute
    // list rather than as `hasAttribute`, because the empty leftover is exactly
    // what `hasAttribute` would have missed by reading `true` either way.
    const created: HTMLElement[] = [];
    const composed: Composed = compose({
      placeholder: () => {
        const element = document.createElement('div');

        created.push(element);
        composed.controller.cancel('discard the preparation');
        return element;
      },
    });

    activate(composed);

    expect(created[0]!.getAttributeNames()).toEqual([]);
  });

  it('should stay usable after a factory throw', () => {
    let failing = true;
    const composed = compose({
      placeholder: (): HTMLElement => {
        if (failing) {
          throw new Error('once');
        }

        return document.createElement('div');
      },
    });

    activate(composed);
    failing = false;
    activate(composed);

    expect(composed.placeholder()).not.toBeNull();
  });
});

describe('handle', () => {
  it('should admit a press inside the resolved handle', () => {
    const grip = document.createElement('span');
    const composed = compose({ handle: () => grip });

    composed.items[0]!.append(grip);
    press(grip);
    move(30);

    expect(composed.placeholder()).not.toBeNull();
  });

  it('should refuse a press outside the resolved handle', () => {
    const grip = document.createElement('span');
    const composed = compose({ handle: () => grip });

    composed.items[0]!.append(grip);
    activate(composed);

    expect(composed.placeholder()).toBeNull();
  });

  it('should refuse every press when the resolver returns null', () => {
    const composed = compose({ handle: () => null });

    activate(composed);

    expect(composed.placeholder()).toBeNull();
  });

  it('should not change which item is dragged', async () => {
    // Admission narrows; identity does not move. The request still names the
    // item the collection knows.
    const grip = document.createElement('span');
    const requests: Array<Readonly<{ item: HTMLElement }>> = [];
    const root = document.createElement('div');

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

    items[0]!.append(grip);

    const controller = sortable(root, {
      items: () => items,
      axis: y(),
      handle: () => grip,
      onReorder: (request) => {
        requests.push(request);
        return ReorderResolution.accept();
      },
    });

    root.setPointerCapture = (): void => {};
    root.releasePointerCapture = (): void => {};
    cleanup.push(() => {
      void controller.destroy();
      root.remove();
    });

    press(grip);
    move(30);
    await drag(55);
    release(55);

    expect(requests[0]!.item).toBe(items[0]);
  });
});

describe('visual', () => {
  it('should lift the resolved element instead of the item', () => {
    const inner = document.createElement('div');
    const composed = compose({ visual: () => inner });

    Object.assign(inner.style, { display: 'block', height: '20px' });
    composed.items[0]!.append(inner);
    activate(composed);

    // The lift promotes what it is given: the inner element goes fixed, the
    // item does not.
    expect(inner.style.position).toBe('fixed');
    expect(composed.items[0]!.style.position).toBe('');
  });

  it('should size the placeholder from the resolved visual', () => {
    // The placeholder is the *footprint*, and the footprint of a drag is
    // whatever was lifted out of the flow.
    const inner = document.createElement('div');
    const composed = compose({ visual: () => inner });

    Object.assign(inner.style, { display: 'block', height: '20px' });
    composed.items[0]!.append(inner);
    activate(composed);

    expect(composed.placeholder()!.getBoundingClientRect().height).toBe(20);
  });

  it('should size the placeholder from the footprint, not the visual, when a box is composed', () => {
    // **api-1's case, and the whole reason D-43 takes two windows.** The box is
    // a flex row holding the lifted card (60) beside an aside (32), so the box
    // stands 60 tall while the card is in flow and 32 once it leaves. The space
    // the drag actually freed is 28 — which is neither the visual's height (60,
    // the rule this replaces) nor the box's pre-lift height (60, which
    // double-counts the residue).
    //
    // Both windows are offset-box reads on the **same element**, taken on
    // opposite sides of `acquireLift`.
    const box = document.createElement('div');
    const card = document.createElement('div');
    const aside = document.createElement('div');

    Object.assign(box.style, { display: 'flex' });
    Object.assign(card.style, {
      display: 'block',
      width: '50px',
      height: '60px',
    });
    Object.assign(aside.style, {
      display: 'block',
      width: '20px',
      height: '32px',
    });
    box.append(card, aside);

    const composed = compose({ visual: () => card, box: () => box });

    composed.items[0]!.append(box);
    activate(composed);

    const rect = composed.placeholder()!.getBoundingClientRect();

    expect(rect.height).toBe(28);
    // **Both extents, and the width is why F-58 exists.** This assertion is one
    // line and this fixture is the one written to prove the rule — and its
    // `footprint.width` was `0` under the two-axis subtraction, because the box
    // is a block-level flex container in a 100 px item and takes its width from
    // its containing block on both sides of the lift. Asserting only the height
    // is what let `width: 0px` ship on every composed `box`.
    expect(rect.width).toBe(100);
  });

  it('should stand on the box’s own width under a centred cross alignment', () => {
    // **The row that makes the cross-axis error reach `anchorTarget`** (F-58
    // §7.2). A zero-width placeholder has the same `left` as a full-width one
    // in a start-aligned or stretch-aligned list, so a width assertion alone
    // cannot show what the defect costs. Under `align-items: center` it can:
    // the placeholder is a **sibling of the item**, centred on its own width,
    // so a `0` width puts it on the container's centre line instead of where
    // the row stood — and that element is what `anchorTarget` measures for the
    // landing target's `x`.
    const box = document.createElement('div');
    const card = document.createElement('div');
    const aside = document.createElement('div');

    Object.assign(box.style, { display: 'flex', width: '80px' });
    Object.assign(card.style, {
      display: 'block',
      width: '50px',
      height: '60px',
    });
    Object.assign(aside.style, {
      display: 'block',
      width: '20px',
      height: '32px',
    });
    box.append(card, aside);

    const composed = compose({ visual: () => card, box: () => box });

    // The list itself is the centred column, because the placeholder is
    // inserted **after the item**, in the list — not inside the row.
    Object.assign(composed.root.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    });
    composed.items[0]!.append(box);

    const { left } = composed.root.getBoundingClientRect();

    activate(composed);

    // 200 px list, an 80 px footprint width, centred: `(200 − 80) / 2`. Under
    // the two-axis subtraction the width was `0` and this read `left + 100` —
    // the centre line, 60 px from where the row's box stood.
    expect(composed.placeholder()!.getBoundingClientRect().left).toBe(
      left + 60,
    );
  });

  it('should measure candidates as the box once one is composed', async () => {
    // D-58. The placeholder occupies the box's removed footprint, so the
    // challengers it is compared against have to be boxes too — measuring the
    // incumbent one way and its candidates another is a hysteresis defect, not
    // a rounding one. What this pins is that a composed drag routes the `box`
    // resolver into the candidate search at all.
    const asked: HTMLElement[] = [];
    const composed = composeWith({
      fragments: [
        {
          box: (item) => {
            asked.push(item);
            return item;
          },
        },
      ],
    });

    activate(composed);
    await drag(70);

    expect(new Set(asked)).toEqual(new Set(composed.items));
  });

  it('should resolve the visual of every candidate, not only the dragged item', async () => {
    // Parity D2, through real pointer input. The exact centres the two
    // measurements produce are pinned against known geometry in
    // `y.browser.test.ts`; what this adds is that a composed drag routes the
    // installed resolver into the candidate search at all — which is the whole
    // of the defect, and is invisible from any assertion about the dragged item.
    const asked: HTMLElement[] = [];
    const composed = composeWith({
      fragments: [
        {
          visual: (item) => {
            asked.push(item);
            return item;
          },
        },
      ],
    });

    activate(composed);
    await drag(70);

    expect(new Set(asked)).toEqual(new Set(composed.items));
  });

  it('should restore the resolved visual at teardown', () => {
    const inner = document.createElement('div');
    const composed = compose({ visual: () => inner });

    Object.assign(inner.style, { display: 'block', height: '20px' });
    composed.items[0]!.append(inner);
    activate(composed);
    composed.controller.cancel('reason');

    expect(inner.style.position).toBe('');
    expect(inner.style.transform).toBe('');
  });
});

describe('the contextual landing duration (D-67)', () => {
  it('should invoke duration once per landing, with the trajectory', async () => {
    // **The quantity review 3 §10 said a zero-argument thunk cannot observe.**
    // `from` and `to` are the landing's origin-relative deltas, `distance` the
    // straight line between them — and the whole of D-67 is that the function
    // can now see them.
    const contexts: Array<{ from: Point; to: Point; distance: number }> = [];
    const composed = compose(
      landing({
        duration: (context) => {
          contexts.push(context);
          return 20;
        },
      }),
    );

    activate(composed);
    await drag(55);
    release(55);

    expect(contexts).toHaveLength(1);

    const [only] = contexts;

    expect(only!.distance).toBeCloseTo(
      Math.hypot(only!.to.x - only!.from.x, only!.to.y - only!.from.y),
      6,
    );
    // A downward drop into the next slot: the trajectory is vertical and real.
    expect(only!.distance).toBeGreaterThan(0);
  });

  it('should keep a zero-argument thunk working', async () => {
    // **F-52, asserted as behavior because it cannot be asserted as a type.** A
    // zero-parameter function is assignable to any signature, so a shipped
    // `() => 200` keeps compiling, keeps being invoked once per landing, and
    // keeps returning the right number — it simply ignores the argument. The
    // migration is source-compatible, which is the honest claim.
    let reads = 0;
    const composed = compose(
      landing({
        duration: () => {
          reads += 1;
          return 20;
        },
      }),
    );

    activate(composed);
    await drag(55);
    release(55);

    expect(reads).toBe(1);
  });

  it('should classify an out-of-domain contextual result at settlement', async () => {
    // **The thrower is `animate()`, not the library** (D-77, D-79). ~~It throws
    // from inside `start`, which the kernel classifies as a landing-create
    // failure.~~ The library stopped judging `-1` when `requireFinite` was
    // deleted; what this row still pins is that the platform's own refusal
    // arrives at the **same stage** the deleted check reached, which is the
    // premise the deletion rests on. Measured in
    // `.plan/measurements/animate-duration-domain.md`; asserted here.
    const composed = compose(landing({ duration: () => -1 }));

    activate(composed);
    await drag(55);
    release(55);

    expect(composed.errors).toHaveLength(1);
    // A landing that could not be *created* replaces the settlement, so it is
    // consequential — unlike the target measurement beside it (D-130).
    expect(composed.errors[0]).toBeInstanceOf(DraggableError);
    expect((composed.errors[0] as DraggableError).code).toBe(
      LANDING_CREATE_CODE,
    );
  });

  /**
   * ~~**The one check D-77 retained, pinned on both input forms** (P18A-19).~~
   * **Deleted 2026-08-25 (D-124)**, so no domain check is left in the package
   * and these rows pin what the boundary does instead — on both input forms,
   * for the reason the retained check was pinned on both: a form nothing
   * exercises is where a later pass re-adds a guard without noticing.
   *
   * `Infinity` is the one duration the platform **accepts** and never
   * completes, so it is the one value that hangs the settlement gate with no
   * terminal at all. That outcome is now the documented boundary on
   * `LandingOptions.duration`, and the terminal is asserted here — as an
   * absence — for exactly the reason it used to be asserted as a presence.
   */
  const unbounded = { duration: Number.POSITIVE_INFINITY };

  it('should not refuse an unbounded fixed duration', async () => {
    const composed = compose(landing(unbounded));

    activate(composed);
    await drag(55);
    release(55);
    await Promise.resolve();

    expect(composed.errors).toEqual([]);
  });

  it('should not refuse an unbounded contextual duration', async () => {
    // The same instant reached through the other form — the pairing
    // 03 §Public option domains states and the suite did not have.
    const composed = compose(
      landing({ duration: () => Number.POSITIVE_INFINITY }),
    );

    activate(composed);
    await drag(55);
    release(55);
    await Promise.resolve();

    expect(composed.errors).toEqual([]);
  });

  it('should resolve the duration before the reduced-motion collapse', async () => {
    // D4: the call timing is *once per landing, immediately before the runner
    // builds its animation* and is not conditional on a media query. Resolving
    // inside the collapse would make a consumer's settle-time side effect — and
    // a thrown or invalid result — observable only for users who have **not**
    // asked for reduced motion.
    await withReducedMotion(async () => {
      let reads = 0;
      const composed = compose(
        landing({
          duration: () => {
            reads += 1;
            return 20;
          },
        }),
      );

      activate(composed);
      await drag(55);
      release(55);

      expect(reads).toBe(1);
    });
  });
});

describe('landing', () => {
  it('should hold settlement open until the animation finishes', async () => {
    const composed = compose(landing({ duration: 50 }));

    activate(composed);
    await drag(55);
    release(55);
    await Promise.resolve();
    await Promise.resolve();

    // The gate is held: presentation is still owned, so the placeholder is
    // still standing in for the item.
    expect(composed.finishes).toEqual([]);
    expect(composed.placeholder()).not.toBeNull();
  });

  it('should finalize once the animation completes', async () => {
    const composed = compose(landing({ duration: 1 }));

    activate(composed);
    await drag(55);
    release(55);

    await composed.items[0]!.getAnimations()[0]?.finished;
    await Promise.resolve();
    await Promise.resolve();

    expect(composed.finishes).toHaveLength(1);
    expect(composed.placeholder()).toBeNull();
  });

  it('should hold the gate even with a zero duration', async () => {
    // `duration: 0` is immediate but still goes through the runner — the same
    // code path, so there is one lifecycle rather than two.
    const composed = compose(landing({ duration: 0 }));

    activate(composed);
    await drag(55);
    release(55);

    expect(composed.items[0]!.getAnimations()).toHaveLength(1);

    await composed.items[0]!.getAnimations()[0]?.finished;
    await Promise.resolve();
    await Promise.resolve();

    expect(composed.finishes).toHaveLength(1);
  });

  it('should relinquish the transform so the kernel pin wins', async () => {
    const composed = compose(landing({ duration: 1 }));

    activate(composed);
    await drag(55);
    release(55);

    await composed.items[0]!.getAnimations()[0]?.finished;
    await Promise.resolve();
    await Promise.resolve();

    // Destroyed before the pin, so nothing of the animation survives the join.
    expect(composed.items[0]!.getAnimations()).toEqual([]);
    expect(composed.items[0]!.style.transform).toBe('');
  });

  it('should let a middle-tier runner replace the default entirely', async () => {
    // **The capability moved tiers, it was not deleted** (D-63). `landing({ run })`
    // is gone from the consumer surface — the library owns the animation there
    // — and an installer contributing `startLanding` is what a spring or an
    // rAF loop is written as now. The seam is unchanged, which is why this case
    // reads the same as it did.
    let complete: (() => void) | null = null;
    const composed = compose(
      authoredLanding((_context, done) => {
        complete = done;
        return { destroy: (): void => {} };
      }),
    );

    activate(composed);
    await drag(55);
    release(55);

    // No Web Animation at all: the replacement is total, not a wrapper.
    expect(composed.items[0]!.getAnimations()).toEqual([]);
    expect(composed.finishes).toEqual([]);

    complete!();
    await Promise.resolve();
    await Promise.resolve();

    expect(composed.finishes).toHaveLength(1);
  });

  it('should classify a runner that fails as a landing failure', async () => {
    const composed = compose(
      authoredLanding((_context, _done, fail) => {
        fail(new Error('spring exploded'));
        return { destroy: (): void => {} };
      }),
    );

    activate(composed);
    await drag(55);
    release(55);
    await Promise.resolve();
    await Promise.resolve();

    expect(composed.errors).toHaveLength(1);
  });

  it('should cancel the animation when subscribing to it throws', async () => {
    // `animate()` succeeding is not the same as acquiring a runner: `finished`
    // is an accessor and `then` is a call, and either can throw. An animation
    // left playing at that point keeps writing the transform with nothing able
    // to stop it, because the handle being built never reaches the kernel.
    const composed = compose(landing({ duration: 400 }));
    const native = Element.prototype.animate;
    let created: Animation | null = null;

    Element.prototype.animate = function animate(
      this: Element,
      ...args: Parameters<Element['animate']>
    ): Animation {
      const animation = native.apply(this, args);

      created = animation;
      Object.defineProperty(animation, 'finished', {
        configurable: true,
        get(): never {
          throw new Error('no finished for you');
        },
      });

      return animation;
    };

    try {
      activate(composed);
      await drag(55);
      release(55);
    } finally {
      Element.prototype.animate = native;
    }

    await Promise.resolve();
    await Promise.resolve();

    expect(composed.errors).toHaveLength(1);
    expect((created as Animation | null)?.playState).toBe('idle');
    expect(composed.items[0]!.getAnimations()).toEqual([]);
  });

  it('should collapse the duration under a reduced-motion preference', async () => {
    // Collapsed, not skipped: the gate is still held and still released through
    // the runner, so there is one lifecycle whatever the preference is.
    const composed = compose(landing({ duration: 400 }));

    // Read inside the block: a zero duration finishes within the microtasks an
    // `await` on the wrapper would itself introduce, and the kernel then
    // destroys the runner.
    const animation = await withReducedMotion(async () => {
      activate(composed);
      await drag(55);
      release(55);
      return composed.items[0]!.getAnimations()[0];
    });

    expect(animation!.effect!.getComputedTiming().duration).toBe(0);
  });

  it('should read a duration thunk at settle time, once per landing', async () => {
    // 13b B-2, the ergonomics half of Phase 15. The shipped package read
    // `landingTiming()` after the settlement step that decides where the visual
    // is going; a thunk restores that timing without giving up anything the
    // default runner provides — the reduced-motion collapse, the retarget
    // replay and the generation guard all still apply.
    const reads: string[] = [];
    const composed = composeWith({
      fragments: [
        landing({
          duration: () => {
            reads.push('read');
            return 40;
          },
        }),
      ],
    });

    // Nothing is read until a drop actually settles.
    expect(reads).toEqual([]);

    activate(composed);
    await drag(55);
    release(55);
    await Promise.resolve();

    expect(reads).toEqual(['read']);
  });

  it('should read a duration thunk under a reduced-motion preference too', async () => {
    // D4. The collapse used to *replace* the thunk rather than adjust its
    // result, so the documented call timing — "once per landing, immediately
    // before the runner builds its animation" — silently did not hold for
    // reduced-motion users, and a consumer's settle-time side effect went with
    // it. Resolve first, then collapse.
    const reads: string[] = [];
    const composed = composeWith({
      fragments: [
        landing({
          duration: () => {
            reads.push('read');
            return 400;
          },
        }),
      ],
    });

    const animation = await withReducedMotion(async () => {
      activate(composed);
      await drag(55);
      release(55);
      return composed.items[0]!.getAnimations()[0];
    });

    expect(reads).toEqual(['read']);
    // Still collapsed: the preference adjusts the resolved value, it does not
    // bypass the resolution.
    expect(animation!.effect!.getComputedTiming().duration).toBe(0);
  });

  it('should land an unbounded thunk result under a reduced-motion preference', async () => {
    // **The ordering guarantee this row was written for is gone with the check
    // it guarded** (D-124). Resolution and the deleted domain test both
    // preceded the collapse, precisely so a consumer diagnosing a bug did not
    // get a different answer because of the reader's OS setting. With no test
    // left, the collapse is the first thing the resolved value meets: under
    // `reduce` an unbounded duration becomes zero and the operation lands
    // normally, while without the preference it hangs the gate.
    //
    // **That divergence by OS setting is the price of the deletion**, and it
    // is pinned here rather than left to be rediscovered — this row is the one
    // that would notice a returning guard, and it is the strongest argument
    // available to anyone who wants to re-put one.
    const composed = composeWith({
      fragments: [landing({ duration: () => Number.POSITIVE_INFINITY })],
    });

    await withReducedMotion(async () => {
      activate(composed);
      await drag(55);
      release(55);
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(composed.errors).toEqual([]);
    expect(composed.finishes.length + composed.cancels.length).toBe(1);
  });

  it('should default the easing to the retained shipped value', async () => {
    // D6. The parity ledger retains the shipped default landing timing
    // `{ duration: 200, easing: 'ease' }`; this shipped as `'ease-out'`, so
    // every consumer that installed `landing()` without an easing got
    // observably different motion.
    const composed = compose(landing({ duration: 400 }));

    activate(composed);
    await drag(55);
    release(55);

    const [animation] = composed.items[0]!.getAnimations();

    expect((animation!.effect as KeyframeEffect).getTiming()).toMatchObject({
      duration: 400,
      easing: 'ease',
    });
  });

  it('should default the duration to the retained shipped value', async () => {
    const composed = compose(landing());

    activate(composed);
    await drag(55);
    release(55);

    const [animation] = composed.items[0]!.getAnimations();

    expect((animation!.effect as KeyframeEffect).getTiming()).toMatchObject({
      duration: 200,
      easing: 'ease',
    });
  });

  it('should not report a cancelled animation as a failure', async () => {
    // `retarget` and teardown both cancel, and WAAPI rejects `finished` on a
    // cancel — which would otherwise surface as a landing failure for an
    // operation that is landing perfectly well.
    const composed = compose(landing({ duration: 500 }));

    activate(composed);
    await drag(55);
    release(55);
    void composed.controller.destroy();
    await Promise.resolve();
    await Promise.resolve();

    // **One collector since D-130.** `expect(reported).toEqual([])` stood
    // beside this and observed a `globalThis.reportError` stub; with one
    // channel this single assertion covers both populations.
    expect(composed.errors).toEqual([]);
  });

  it('should leave nothing behind when the duration thunk destroys the controller', async () => {
    // **A conformance pin, not a regression pin — the bracket-discharge
    // witness** (Checkpoint D review 4, the landing residue; reclassified by
    // review 5, C5-03). It passes against current source, and the barrier it
    // witnesses is the **kernel's**, not `landing.ts`'s: the thunk is consumer
    // code and the next statements inside `start` reach the consumer's own
    // visual (`realm.window.matchMedia`, then `visual.animate()`) with no
    // reading between them, so the module holds none. Under I-36 (1) it does
    // not need one — the whole stretch sits inside the F-30 revalidation, whose
    // `runner.destroy()` cancels the unpublished handle in the same synchronous
    // stretch with no paint in between, and `retireSettlement` disposes a
    // published one the same way. `getAnimations() === []` and
    // `style.transform === ''` are what witness that the bracket's **undo** is
    // complete, which is condition (ii) of bracket discharge.
    //
    // What this pins is the blast radius, executably, so the next reviewer
    // reads a measured size rather than a prose claim. It **fails** if the
    // residue ever acquires a consequence the operation outlives: a second
    // `animate()` call, an animation that survives teardown, a transform left
    // on the visual, a reported failure, or a missing/duplicated `onCancel`.
    // Late-bound on purpose: the thunk runs once the drop settles, long after
    // the controller exists.
    let controller: SortableController | null = null;
    const composed = composeWith({
      fragments: [
        landing({
          duration: (): number => {
            void controller!.destroy();
            return 200;
          },
        }),
      ],
    });

    ({ controller } = composed);

    const item = composed.items[0]!;
    const calls: string[] = [];
    const native = item.animate.bind(item);

    item.animate = (...args: Parameters<Element['animate']>): Animation => {
      calls.push('animate');
      return native(...args);
    };

    activate(composed);
    await drag(55);
    release(55);
    await Promise.resolve();
    await Promise.resolve();

    // The instrumented call list, not the resulting state: exactly one
    // `animate()`, which is the residue's whole size.
    expect(calls).toEqual(['animate']);
    // And nothing of it survives — the handle was destroyed before it was ever
    // published, so the landing never started.
    expect(item.getAnimations()).toEqual([]);
    expect(item.style.transform).toBe('');
    expect(composed.placeholder()).toBeNull();
    // A consumer destroying its own controller is not a library failure.
    // **One collector since D-130.** `expect(reported).toEqual([])` stood
    // beside this and observed a `globalThis.reportError` stub; with one
    // channel this single assertion covers both populations.
    expect(composed.errors).toEqual([]);
    // **Neither** terminal callback fires, which is stronger than the decision's
    // §6 predicted (it expected one `onCancel`) and is the landed rule, not a
    // gap: destroy is a teardown, not a settlement, so the operation it was
    // resolving does not get to announce an outcome — see
    // `composition.browser.test.ts` — _should tear down without a terminal
    // callback when onReorder destroys_. `ARM_STALE` suppresses the settlement
    // as well, so there is nothing left to announce it with.
    expect(composed.cancels).toEqual([]);
    expect(composed.finishes).toEqual([]);
  });

  it('should destroy a consumer runner’s handle exactly once when the runner destroyed the controller', async () => {
    // **A conformance pin, not a regression pin** (Checkpoint D review 5,
    // C5-03 §5). It passes against current source and adds no barrier: what it
    // pins is the **admitted** form of I-6 clause 3's kernel half. With a
    // **middle-tier installer** supplying `startLanding` — which is where a
    // consumer-authored runner lives since D-63 withdrew `landing({ run })`,
    // and which is why this pin did not become vacuous when that option went —
    // `start` *is* code the library does not own and the handle it returns
    // *is* a consumer-authored object — so F-30's
    // `!settlementLive(attempt)` branch invokes a declared consumer slot member
    // after `controller.destroy()` returned. The kernel must: not calling it
    // leaks a runner nothing owns (I-20). That is why the invariant reads
    // *afterwards no callback fires **that leaves anything behind*** rather
    // than *no callback fires*.
    //
    // It fails if the qualified headline ever acquires a consequence: `destroy`
    // called twice or not at all (a leaked runner), `retarget` called after the
    // terminal barrier (a call that is not a relinquishment), or an animation,
    // transform or placeholder surviving.
    let controller: SortableController | null = null;
    const calls: string[] = [];
    let destroyedFirst = false;

    const composed = composeWith({
      fragments: [
        authoredLanding((): LandingHandle => {
          void controller!.destroy();
          destroyedFirst = true;

          return {
            destroy(): void {
              calls.push('destroy');
            },
          };
        }),
      ],
    });

    ({ controller } = composed);

    const item = composed.items[0]!;

    activate(composed);
    await drag(55);
    release(55);
    await Promise.resolve();
    await Promise.resolve();

    // The instrumented call list on the consumer-authored object, not the
    // resulting state: exactly one relinquishment and no trajectory call.
    expect(calls).toEqual(['destroy']);
    // And it ran after `controller.destroy()` returned, which is the whole
    // claim — a flag rather than a timer, so nothing here is schedule-coupled.
    expect(destroyedFirst).toBe(true);
    // Nothing survives.
    expect(item.getAnimations()).toEqual([]);
    expect(item.style.transform).toBe('');
    expect(composed.placeholder()).toBeNull();
    // **One collector since D-130.** `expect(reported).toEqual([])` stood
    // beside this and observed a `globalThis.reportError` stub; with one
    // channel this single assertion covers both populations.
    expect(composed.errors).toEqual([]);
    expect(composed.cancels).toEqual([]);
    expect(composed.finishes).toEqual([]);
  });
});

describe('layoutAnimation', () => {
  /** The rows currently carrying a displacement animation. */
  const displaced = (composed: Composed): number[] =>
    composed.items
      .map((item, index) => (item.getAnimations().length > 0 ? index : -1))
      .filter((index) => index !== -1);

  it('should animate only the rows the move crossed', async () => {
    // M-4's answer, made observable: the span between the two gaps, not the
    // destination view. Row 2 never moves, so it is never animated.
    const composed = compose(layoutAnimation({ duration: 500 }));

    activate(composed);
    await drag(55);

    expect(displaced(composed)).toEqual([1]);
  });

  it('should animate every row a multi-slot move crossed', async () => {
    const composed = compose(layoutAnimation({ duration: 500 }));

    activate(composed);
    await drag(110);

    expect(displaced(composed)).toEqual([1, 2]);
  });

  it('should animate nothing for a move that did not happen', async () => {
    // The bracket is skipped entirely when the placeholder is already in place,
    // so an inert frame costs no measurement at all.
    const composed = compose(layoutAnimation({ duration: 500 }));

    activate(composed);
    await drag(35);

    expect(displaced(composed)).toEqual([]);
  });

  it('should invert the displacement it measured', async () => {
    // FLIP: the row starts visually where it was and ends where it now is.
    const composed = compose(layoutAnimation({ duration: 500 }));

    activate(composed);
    await drag(55);

    const [animation] = composed.items[1]!.getAnimations();
    const frames = (
      animation as Animation & {
        effect: KeyframeEffect;
      }
    ).effect.getKeyframes();

    // On `translate`, never `transform`, and additively — so an authored
    // transform on the row survives the displacement untouched.
    expect(frames[0]!['translate']).toBe(`0px ${ITEM_HEIGHT}px`);
    expect(frames.at(-1)!['translate']).toBe('0px');
    // The composite lives on the effect; per-keyframe it reads back as `auto`,
    // meaning "inherit from the effect".
    expect(
      (animation as Animation & { effect: KeyframeEffect }).effect.composite,
    ).toBe('add');
    expect(frames[0]!['transform']).toBeUndefined();
  });

  it('should replace a running displacement rather than stack one', async () => {
    // Out to the end and back, so both moves cross row 1 and the second one
    // retargets a displacement that is still running. Crossing a different row
    // each time would prove nothing.
    const composed = compose(layoutAnimation({ duration: 500 }));

    activate(composed);
    await drag(110);
    await drag(15);

    // "Never stacks" is the property, and it is an **upper** bound: a round
    // trip completed before the first displacement has visibly progressed
    // correctly produces no second animation at all, because the row is already
    // where it belongs. Filtered by play state, because a finished animation
    // lingers in `getAnimations()` until the engine removes it.
    const running = composed.items[1]!.getAnimations().filter(
      (animation) => animation.playState === 'running',
    );

    expect(running.length).toBeLessThan(2);
  });

  it('should measure only the span, not the destination view', async () => {
    // M-4's answer is a *cost* property, not a visible one: a whole-list
    // bracket produces the same animations, because every row outside the span
    // has a zero delta and is skipped. So the only honest way to pin it is to
    // count the layout reads the bracket actually performs.
    const rows = 12;
    const native = Element.prototype.getBoundingClientRect;

    // One list at a time, each torn down before the next is built: two live
    // controllers would both see the document-level pointer stream, and the
    // second list would sit below the first, out of reach of the coordinates.
    const measure = async (
      fragments: ReadonlyArray<Partial<SortableConfig>>,
    ): Promise<number> => {
      const composed = composeWith({ itemCount: rows, fragments });
      let reads = 0;

      activate(composed);

      Element.prototype.getBoundingClientRect = function counted(
        this: Element,
      ): DOMRect {
        if (composed.items.includes(this as HTMLElement)) {
          reads += 1;
        }

        return native.call(this);
      };

      try {
        await drag(55);
      } finally {
        Element.prototype.getBoundingClientRect = native;
      }

      void composed.controller.destroy();
      composed.root.remove();
      return reads;
    };

    const baseline = await measure([]);
    const bracketed = await measure([layoutAnimation({ duration: 500 })]);

    // The axis rebuild is in both runs; the difference is the bracket alone.
    // This fixture's move crosses one row, so the span is that row plus the
    // anchor it stops at — 2 elements, measured before and after: **4 reads**.
    // A destination-view bracket would add 2 × 12; a span walked in the wrong
    // direction collects the rows on the other side instead, which is both
    // wrong and, here, 6.
    expect(baseline).toBeGreaterThan(0);
    // Bounded on both sides: a bracket that measures nothing is not a cheap
    // bracket, it is a broken one — a span walked in the wrong direction finds
    // no anchor and gives up.
    expect(bracketed - baseline).toBeGreaterThan(0);
    expect(bracketed - baseline).toBeLessThan(6);
  });

  it('should restore every touched row at teardown', async () => {
    const composed = compose(layoutAnimation({ duration: 500 }));

    activate(composed);
    await drag(110);
    composed.controller.cancel('reason');

    expect(displaced(composed)).toEqual([]);
    expect(composed.items[1]!.style.transform).toBe('');
    expect(composed.items[2]!.style.transform).toBe('');
  });

  it('should not delay settlement while a displacement is running', async () => {
    // D-7: it has no `SettlementScope`, so it structurally cannot gate. The
    // drop finishes with the displacement still in flight.
    const composed = compose(layoutAnimation({ duration: 5000 }));

    activate(composed);
    await drag(55);
    release(55);

    expect(composed.finishes).toHaveLength(1);
    expect(composed.placeholder()).toBeNull();
  });

  it('should compose with landing without either gating the other', async () => {
    const composed = compose(
      layoutAnimation({ duration: 5000 }),
      landing({ duration: 1 }),
    );

    activate(composed);
    await drag(55);
    release(55);

    // Landing holds the gate; the displacement does not.
    expect(composed.finishes).toEqual([]);

    await composed.items[0]!.getAnimations()[0]?.finished;
    await Promise.resolve();
    await Promise.resolve();

    expect(composed.finishes).toHaveLength(1);
  });
});

/**
 * I-36 — foreign code invoked in a sequence is terminal-aware.
 *
 * The behavior is the only participant that calls consumer code more than once
 * inside one kernel-driven seam or one native admission, so every barrier the
 * kernel owns is complete at the kernel's granularity and none of them is
 * inside these sequences. A consumer resolver is allowed to call
 * `controller.destroy()`, which runs teardown to completion synchronously and
 * returns into the middle of the sequence.
 *
 * **Every assertion here is about the call list**, not about the resulting
 * insertion or the final DOM: the frame is discarded upstream regardless, so a
 * state assertion passes against unfixed source.
 */
describe('the terminal barrier in a resolver sequence', () => {
  const pressReturning = (target: HTMLElement): PointerEvent => {
    const event = new PointerEvent('pointerdown', {
      bubbles: true,
      composed: true,
      cancelable: true,
      pointerId: POINTER_ID,
      isPrimary: true,
      button: 0,
      buttons: 1,
      clientX: 10,
      clientY: 10,
    });

    target.dispatchEvent(event);
    return event;
  };

  const arrow = (target: HTMLElement, key: string): KeyboardEvent => {
    const event = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      composed: true,
      cancelable: true,
    });

    target.dispatchEvent(event);
    return event;
  };

  /**
   * The `handle` resolver destroys; the `visual` resolver records whether it was
   * consulted after.
   */
  const closingHandle = (
    asked: HTMLElement[],
  ): Readonly<{
    fragments: Array<Partial<SortableConfig>>;
    arm(c: SortableController): void;
  }> => {
    let controller: SortableController | null = null;

    return {
      fragments: [
        {
          handle: (item) => {
            void controller?.destroy();
            return item;
          },
          visual: (item) => {
            asked.push(item);
            return item;
          },
        },
      ],
      arm(c): void {
        controller = c;
      },
    };
  };

  it('should not resolve a visual after the handle resolver destroyed', () => {
    // Site B: `resolveItem` calls `getHandle`, and `seedDraft` calls
    // `getVisual` immediately after. The kernel's post-`admit` recheck stops the
    // operation from being minted, but it runs after the whole callback returns
    // and cannot make the second consumer call un-happen.
    const asked: HTMLElement[] = [];
    const armed = closingHandle(asked);
    const composed = composeWith({ fragments: armed.fragments });

    armed.arm(composed.controller);

    const event = pressReturning(composed.items[0]!);

    expect(asked).toEqual([]);
    // Admission **declines**; it does not throw. So nothing is minted, the
    // press keeps its native meaning, and no failure is reported (a consumer
    // destroying its own controller is not a library failure).
    expect(event.defaultPrevented).toBe(false);
    expect(composed.placeholder()).toBeNull();
    expect(composed.errors).toEqual([]);
  });

  it('should not resolve a visual after a keydown handle resolver destroyed', () => {
    // The same sequence on the second ingress (D-32). A command admits, decides
    // feasibility and seeds the draft inside the native listener, so the whole
    // of it runs after the destroy that a handle resolver raised.
    const asked: HTMLElement[] = [];
    const armed = closingHandle(asked);
    const composed = composeWith({ fragments: armed.fragments });

    armed.arm(composed.controller);

    const event = arrow(composed.items[0]!, 'ArrowDown');

    expect(asked).toEqual([]);
    expect(event.defaultPrevented).toBe(false);
    expect(composed.placeholder()).toBeNull();
    expect(composed.errors).toEqual([]);
  });

  it('should stop the candidate traversal at the destroying candidate', async () => {
    // Site A, through real pointer input on the `y()` rule — the reviewer's
    // temporary regression, made permanent. `items[0]` is the dragged item and
    // was resolved at admission; `items[1]` is the first candidate and destroys,
    // so `items[2]` must never be asked.
    const asked: HTMLElement[] = [];
    let controller: SortableController | null = null;
    const composed = composeWith({
      fragments: [
        {
          visual: (item) => {
            asked.push(item);

            if (item === composed.items[1]) {
              void controller!.destroy();
            }

            return item;
          },
        },
      ],
    });

    ({ controller } = composed);

    activate(composed);
    await drag(70);

    expect(asked).toEqual([composed.items[0], composed.items[1]]);
  });

  /**
   * A displacement feature that records nothing but whether each half of the
   * bracket pipeline ran. `layoutAnimation()` cannot stand in for it: its own
   * `retire()` empties the span map, so its `afterMove` is *already* inert on a
   * destroyed controller and would report "no animation" whether the barrier
   * exists or not.
   */
  const bracketRecorder = (
    befores: number[],
    afters: number[],
  ): Pick<SortableConfig, 'plugins'> => ({
    // A plugin, because it names no capability slot of its own: the schema's
    // `plugins` array is the only slot that appends rather than last-wins.
    plugins: [
      () => ({
        beforeInsertionMove: (): void => {
          befores.push(befores.length);
        },
        afterInsertionMove: (): void => {
          afters.push(afters.length);
        },
      }),
    ],
  });

  it('should not run the eager rebuild past a destroying candidate', async () => {
    // Site C, first door: the eager rebuild inside the committed-move bracket.
    // `measureInSeam` walks the candidate list through the same consumer
    // resolver, so a destroy raised from there must take the exit a classified
    // measure failure already has — nothing after it in the bracket runs.
    const asked: HTMLElement[] = [];
    const befores: number[] = [];
    const afters: number[] = [];
    let controller: SortableController | null = null;
    const composed = composeWith({
      fragments: [
        {
          visual: (item) => {
            asked.push(item);

            // Armed by the DOM rather than by a call count: the placeholder
            // only follows `items[1]` once `movePlaceholder` has run, so this
            // is exactly "inside the bracket, past the write".
            if (
              composed.placeholder()?.previousElementSibling ===
              composed.items[1]
            ) {
              void controller!.destroy();
            }

            return item;
          },
        },
        bracketRecorder(befores, afters),
      ],
    });

    ({ controller } = composed);

    activate(composed);
    await drag(55);

    expect(befores).toHaveLength(1);
    expect(afters).toEqual([]);
  });

  /**
   * `y()`'s rule with its **eager** half withheld — a lazy axis feature, which
   * the contract explicitly supports ("a feature that omits it stays lazy").
   *
   * It is what makes the bracket's own barrier observable. With an eager
   * `measure` installed, `measureInSeam`'s `!rt.closed` already stops the same
   * continuation, so the two guards are redundant for both first-party axes and
   * neither can be seen alone. Defence in depth is the intent; this is the
   * composition in which the outer guard is the only one there is.
   */
  const lazyY =
    (): AxisInstaller =>
    (context): ReturnType<AxisInstaller> => {
      const { insertion } = y()(context);

      return {
        insertion: {
          resolve: insertion.resolve,
          invalidate: insertion.invalidate,
          retire: insertion.retire,
        },
      };
    };

  it('should not run the bracket past a placeholder reaction that destroyed', async () => {
    // Site C, and the one no other test reaches. `movePlaceholder` moves a
    // node, so a custom-element placeholder's `disconnectedCallback` runs
    // synchronously inside that call — consumer code from the `placeholder()`
    // factory, reached from a plain DOM write, with no seam around it.
    // `activation.effect` already guards the identical hazard one line after
    // `item.after(placeholder)`; this is the same species through the other
    // door, and the `finally` must still clear `view.insertion`.
    const befores: number[] = [];
    const afters: number[] = [];
    let controller: SortableController | null = null;

    class ClosingPlaceholder extends HTMLElement {
      // oxlint-disable-next-line class-methods-use-this -- a lifecycle reaction
      disconnectedCallback(): void {
        void controller?.destroy();
      }
    }

    const name = `closing-placeholder-${crypto.randomUUID()}`;

    customElements.define(name, ClosingPlaceholder);

    const composed = composeWith({
      axis: lazyY(),
      fragments: [
        { placeholder: () => document.createElement(name) },
        bracketRecorder(befores, afters),
      ],
    });

    ({ controller } = composed);

    activate(composed);
    await drag(55);

    // The write happened and the pipeline opened; nothing after the reaction
    // ran — no invalidation, no measurement, and no `afterMove` hook.
    expect(befores).toHaveLength(1);
    expect(afters).toEqual([]);
  });
  /** A `beforeMove` hook that destroys the controller from inside the bracket. */
  const closingBefore = (): Readonly<{
    fragment: Pick<SortableConfig, 'plugins'>;
    arm(c: SortableController): void;
  }> => {
    let controller: SortableController | null = null;

    return {
      fragment: {
        plugins: [
          () => ({
            beforeInsertionMove: (): void => {
              void controller?.destroy();
            },
          }),
        ],
      },
      arm(c): void {
        controller = c;
      },
    };
  };

  it('should not write the placeholder after a beforeMove hook destroyed', async () => {
    // C4-01. A displacement hook measures consumer-owned rows, so an overridden
    // `getBoundingClientRect()` can return into this pipeline on a destroyed
    // controller — and the behavior's very next act is `movePlaceholder`, a DOM
    // mutation that runs a custom-element placeholder's callbacks. The existing
    // guard sits one line *after* that write and cannot reach it.
    //
    // The observable is the **report**, not the resulting DOM: teardown has
    // already detached the placeholder, so the write does not silently move a
    // node — it throws `drag: sortable/anchor-outside-container` and
    // classifies a `FAILURE_ACTION_EFFECT` against a controller the consumer
    // destroyed on purpose.
    const befores: number[] = [];
    const afters: number[] = [];
    const armed = closingBefore();
    const composed = composeWith({
      fragments: [bracketRecorder(befores, afters), armed.fragment],
    });

    armed.arm(composed.controller);

    activate(composed);
    await drag(55);

    expect(befores).toHaveLength(1);
    expect(afters).toEqual([]);
    // **One collector since D-130.** `expect(reported).toEqual([])` stood
    // beside this and observed a `globalThis.reportError` stub; with one
    // channel this single assertion covers both populations.
    expect(composed.errors).toEqual([]);
  });

  it('should start no displacement after an afterMove measurement destroyed', async () => {
    // The reviewer's reproduction against the real `layoutAnimation()`
    // composition. `lazyY()` withholds the eager rebuild, so the only rows read
    // after `movePlaceholder` are the `afterMove` pass's own — which is what
    // makes "post-move" a sound arming condition for the destroy.
    const played: HTMLElement[] = [];
    let controller: SortableController | null = null;
    const composed = composeWith({
      axis: lazyY(),
      fragments: [layoutAnimation({ duration: 500 })],
    });

    ({ controller } = composed);

    const row = composed.items[1]!;
    const nativeRect = row.getBoundingClientRect.bind(row);
    const nativeAnimate = row.animate.bind(row);

    row.getBoundingClientRect = (): DOMRect => {
      const rect = nativeRect();

      if (composed.placeholder()?.previousElementSibling !== row) {
        return rect;
      }

      void controller.destroy();

      // **Shifted deliberately.** Teardown removes the placeholder and drops
      // the lift, which puts the row back exactly where this pass measured it —
      // so an honest rect makes `delta === 0`, `animate()` is skipped for a
      // reason that has nothing to do with the barrier, and the assertion stops
      // discriminating. The reviewer's own reproduction shifted it too.
      return new DOMRect(rect.x, rect.y + 20, rect.width, rect.height);
    };
    row.animate = (frames, options): Animation => {
      played.push(row);

      return nativeAnimate(frames, options);
    };

    activate(composed);
    await drag(55);

    expect(played).toEqual([]);
  });
});
