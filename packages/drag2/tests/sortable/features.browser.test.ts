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
import { DraggableError, DraggableWarning } from '../../src/drag.ts';
import type { OnReorder } from '../../src/sortable/domain.ts';
import type {
  AxisInstaller,
  LandingTiming,
  SortableLandingInstaller,
} from '../../src/sortable/feature.ts';
import {
  landing,
  type LandingTimingContext,
} from '../../src/sortable/landing.ts';
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
 * A landing timing policy authored at the **middle tier** (D-63): the three
 * lines `landing()` itself writes, which is what a consumer's `run` used to
 * reach.
 */
const authoredLanding = (
  timing: LandingTiming,
): { landing: SortableLandingInstaller } => ({
  landing: () => ({ landingTiming: timing }),
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
    // The endpoints are the landing's origin-relative deltas, `distance` the
    // straight line between them — and the whole of D-67 is that the function
    // can now see them.
    const contexts: LandingTimingContext[] = [];
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
      Math.hypot(only!.toX - only!.fromX, only!.toY - only!.fromY),
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

  it('should report an out-of-domain contextual result without failing the drop', async () => {
    // **The thrower is `animate()`, not the library** (D-77, D-79). The library
    // stopped judging `-1` when `requireFinite` was deleted; the platform
    // refuses it instead. Measured in
    // `.plan/measurements/animate-duration-domain.md`; asserted here.
    //
    // **And the refusal is not consequential** (D-155). The tail is an
    // interpolation started after the drop was decided, committed and
    // reported, so a duration the platform will not take costs the consumer a
    // warning and a jump cut — never the operation.
    const composed = compose(landing({ duration: () => -1 }));

    activate(composed);
    await drag(55);
    release(55);

    expect(composed.errors).toHaveLength(1);
    expect(composed.errors[0]).toBeInstanceOf(DraggableWarning);
    expect(composed.errors[0]).not.toBeInstanceOf(DraggableError);
    expect(composed.finishes).toHaveLength(1);
    expect(composed.items[0]!.getAnimations()).toEqual([]);
  });

  /**
   * ~~**The one check D-77 retained, pinned on both input forms** (P18A-19).~~
   * **Deleted 2026-08-25 (D-124)**, so no domain check is left in the package
   * and these rows pin what the boundary does instead — on both input forms,
   * for the reason the retained check was pinned on both: a form nothing
   * exercises is where a later pass re-adds a guard without noticing.
   *
   * `Infinity` is the one duration the platform **accepts** and never
   * completes. Nothing waits on it (D-155): the drop is decided, reported and
   * terminated before the tail starts, so an unbounded duration is a
   * contribution that never decays on an element the library has already let
   * go of — the next activation cancels it, and so does `destroy()`. That
   * outcome is the documented boundary on `LandingOptions.duration`, and what
   * is asserted here is that neither form is refused.
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
    // D4: the call timing is *once per landing, immediately before the
    // interpolation starts* and is not conditional on a media query. Resolving
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

/**
 * The options the tail was started with, captured at the call.
 *
 * **A zero-length contribution cannot be read back.** It has already finished
 * by the statement after the drop and it holds no fill, so the element stops
 * reporting it — which is precisely the case every reduced-motion row below is
 * about. Instrumenting the one call the kernel makes is the reading that
 * survives a collapse.
 */
const captureTail = (item: HTMLElement): KeyframeAnimationOptions[] => {
  const captured: KeyframeAnimationOptions[] = [];
  const native = item.animate.bind(item);

  item.animate = (keyframes, options): Animation => {
    captured.push(options as KeyframeAnimationOptions);

    return native(keyframes, options);
  };

  return captured;
};

describe('landing', () => {
  it('should finalize while the tail is still running', async () => {
    // **The landing holds nothing open** (D-155). The tail is an additive
    // contribution to a visual the library has already released, so the
    // terminal fires, the placeholder leaves and the inline styles come back
    // on the statement the drop lands on — with half a second of motion still
    // ahead of the element.
    const composed = compose(landing({ duration: 500 }));

    activate(composed);
    await drag(55);
    release(55);

    expect(composed.finishes).toHaveLength(1);
    expect(composed.placeholder()).toBeNull();
    expect(composed.items[0]!.getAnimations()[0]!.playState).toBe('running');
  });

  it('should restore the inline transform before the tail starts', async () => {
    // The ordering that makes the tail sound: presentation is released
    // **completely** — the drag's composed `transform` included — and only
    // then does anything interpolate. The tail contributes through `translate`
    // and has no fill, so a consumer reading the element's inline styles sees
    // exactly what it authored itself.
    const composed = compose(landing({ duration: 500 }));

    activate(composed);
    await drag(55);
    release(55);

    const [animation] = composed.items[0]!.getAnimations();

    expect(composed.items[0]!.style.transform).toBe('');
    expect(composed.items[0]!.style.translate).toBe('');
    expect((animation!.effect as KeyframeEffect).composite).toBe('add');
  });

  it('should start a zero-length tail for a zero duration', async () => {
    // `duration: 0` goes through the same one code path as any other duration:
    // one additive contribution, computed to nothing, rather than a second
    // lifecycle for the instantaneous case.
    const composed = compose(landing({ duration: 0 }));
    const captured = captureTail(composed.items[0]!);

    activate(composed);
    await drag(55);
    release(55);

    expect(captured).toEqual([
      { duration: 0, easing: 'ease', composite: 'add' },
    ]);
    expect(composed.finishes).toHaveLength(1);
  });

  it('should take its timing from a middle-tier policy', async () => {
    // **The capability moved tiers, it was not deleted** (D-63). `landing({ run })`
    // is gone from the consumer surface — the kernel owns the interpolation —
    // and an installer contributing `landingTiming` is what a policy is written
    // as now. What it decides is how long and with what easing, per drop.
    const composed = compose(
      authoredLanding((_fromX, fromY) => ({
        // A policy is handed the trajectory, so it can time by it: the drop
        // below travels 45px down from the grab.
        duration: Math.abs(fromY) * 10,
        easing: 'steps(4)',
      })),
    );

    activate(composed);
    await drag(55);
    release(55);

    const [animation] = composed.items[0]!.getAnimations();

    expect((animation!.effect as KeyframeEffect).getTiming()).toMatchObject({
      duration: 450,
      easing: 'steps(4)',
    });
  });

  it('should start no tail when the policy declines one', async () => {
    // `null` is a policy's answer for *this drop does not travel*, and it is
    // the whole of what declining costs: the visual stays where the drop put
    // it, on the frame it landed, and the operation ends exactly as it does
    // with a tail.
    const composed = compose(authoredLanding(() => null));

    activate(composed);
    await drag(55);
    release(55);

    expect(composed.items[0]!.getAnimations()).toEqual([]);
    expect(composed.finishes).toHaveLength(1);
    expect(composed.errors).toEqual([]);
  });

  it('should report a throwing policy without failing the drop', async () => {
    // A tail is presentation, and a presentational fault may not reach a
    // consumer whose drop has already been decided and reported. So the throw
    // is unwound into a warning and changes nothing: no tail, and the same
    // terminal the drop would have had.
    const composed = compose(
      authoredLanding((): never => {
        throw new Error('spring exploded');
      }),
    );

    activate(composed);
    await drag(55);
    release(55);

    expect(composed.errors).toHaveLength(1);
    expect(composed.errors[0]).toBeInstanceOf(DraggableWarning);
    expect(composed.items[0]!.getAnimations()).toEqual([]);
    expect(composed.finishes).toHaveLength(1);
  });

  it('should collapse the duration under a reduced-motion preference', async () => {
    // Collapsed, not declined: the element arrives on the frame the drop lands
    // and the two motion preferences differ in duration alone, so there is one
    // lifecycle whatever the preference is.
    const composed = compose(landing({ duration: 400 }));
    const captured = captureTail(composed.items[0]!);

    // Dropped inside the block, where the stub is installed: the collapse is
    // decided when the policy runs, which is on the release statement.
    await withReducedMotion(async () => {
      activate(composed);
      await drag(55);
      release(55);
    });

    expect(captured).toEqual([
      { duration: 0, easing: 'ease', composite: 'add' },
    ]);
  });

  it('should read a duration thunk at settle time, once per landing', async () => {
    // 13b B-2, the ergonomics half of Phase 15. The shipped package read
    // `landingTiming()` after the settlement step that decides where the visual
    // is going; a thunk restores that timing without giving up anything the
    // shipped policy provides — the reduced-motion collapse still applies, and
    // the value is still read exactly once per drop.
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
    // D4. A collapse that *replaced* the thunk rather than adjusting its result
    // would make the documented call timing — once per landing, immediately
    // before the interpolation starts — silently untrue for reduced-motion
    // users, and a consumer's settle-time side effect would go with it.
    // Resolve first, then collapse.
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

    const captured = captureTail(composed.items[0]!);

    await withReducedMotion(async () => {
      activate(composed);
      await drag(55);
      release(55);
    });

    expect(reads).toEqual(['read']);
    // Still collapsed: the preference adjusts the resolved value, it does not
    // bypass the resolution.
    expect(captured).toEqual([
      { duration: 0, easing: 'ease', composite: 'add' },
    ]);
  });

  it('should land an unbounded thunk result under a reduced-motion preference', async () => {
    // **The ordering guarantee this row was written for is gone with the check
    // it guarded** (D-124). Resolution and the deleted domain test both
    // preceded the collapse, precisely so a consumer diagnosing a bug did not
    // get a different answer because of the reader's OS setting. With no test
    // left, the collapse is the first thing the resolved value meets: under
    // `reduce` an unbounded duration becomes zero and the element arrives at
    // once, while without the preference it interpolates forever.
    //
    // **That divergence by OS setting is the price of the deletion**, and it
    // is pinned here rather than left to be rediscovered — this row is the one
    // that would notice a returning guard, and it is the strongest argument
    // available to anyone who wants to re-put one.
    const composed = composeWith({
      fragments: [landing({ duration: () => Number.POSITIVE_INFINITY })],
    });
    const captured = captureTail(composed.items[0]!);

    await withReducedMotion(async () => {
      activate(composed);
      await drag(55);
      release(55);
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(composed.errors).toEqual([]);
    expect(composed.finishes.length + composed.cancels.length).toBe(1);
    expect(captured).toEqual([
      { duration: 0, easing: 'ease', composite: 'add' },
    ]);
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

  it('should not report a cancelled tail as a failure', async () => {
    // Teardown cancels what the controller still owns, and so does the next
    // activation. Cancelling is safe at any moment — the contribution decays to
    // zero, so the element is left exactly where flow puts it — and it is not a
    // fault for an operation that landed perfectly well.
    const composed = compose(landing({ duration: 500 }));

    activate(composed);
    await drag(55);
    release(55);

    const [animation] = composed.items[0]!.getAnimations();

    void composed.controller.destroy();
    await Promise.resolve();
    await Promise.resolve();

    expect(animation!.playState).toBe('idle');
    // **One collector since D-130.** `expect(reported).toEqual([])` stood
    // beside this and observed a `globalThis.reportError` stub; with one
    // channel this single assertion covers both populations.
    expect(composed.errors).toEqual([]);
  });

  it('should leave nothing behind when the duration thunk destroys the controller', async () => {
    // **A conformance pin, not a regression pin — the bracket-discharge
    // witness** (Checkpoint D review 4, the landing residue; reclassified by
    // review 5, C5-03). The barrier it witnesses is the **kernel's**: the thunk
    // is consumer code, reached through the policy the kernel asks for the
    // tail's timing, and the kernel revalidates the controller between that
    // answer and the `animate()` call it would otherwise make. So a controller
    // destroyed from inside the thunk leaves **no residue at all** — not one
    // animation to cancel, because none is started.
    //
    // What this pins is the blast radius, executably, so the next reviewer
    // reads a measured size rather than a prose claim. It **fails** if the
    // residue ever acquires a consequence the operation outlives: an
    // `animate()` call, an animation that survives teardown, a transform left
    // on the visual, a reported failure, or a terminal that should not fire.
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

    // The instrumented call list, not the resulting state: the destroyed
    // controller writes nothing, so the residue's size is zero.
    expect(calls).toEqual([]);
    expect(item.getAnimations()).toEqual([]);
    expect(item.style.transform).toBe('');
    expect(item.style.translate).toBe('');
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
    // callback when onReorder destroys_.
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

  it('should add no layout read to the composition it joins', async () => {
    // **The cost property, and it is now a zero.** The sink is handed vectors
    // by the axis and answers for its own offsets from animation timing, so it
    // touches layout nowhere: a composition that animates reads exactly what
    // the same drag reads without it.
    //
    // Counting is still the only honest way to pin it — a whole-list bracket
    // would produce the same *animations*, because every row outside the span
    // has a zero delta and is skipped.
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

    // **The control**: a run that reads nothing at all would satisfy the
    // equality without exercising anything.
    expect(baseline).toBeGreaterThan(0);
    expect(bracketed).toBe(baseline);
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
    // D-7: a displacement contribution reaches no lifecycle seam, so it
    // structurally cannot delay one. The drop finishes with the displacement
    // still in flight.
    const composed = compose(layoutAnimation({ duration: 5000 }));

    activate(composed);
    await drag(55);
    release(55);

    expect(composed.finishes).toHaveLength(1);
    expect(composed.placeholder()).toBeNull();
  });

  it('should compose with landing without either delaying the terminal', async () => {
    // **Neither one gates the terminal** (D-155), and the two have different
    // lifetimes, which is what composing them shows: the drop is finished on
    // the release statement, with five seconds of tail still ahead of the
    // dropped row and the displacement already retired with the operation.
    const composed = compose(
      layoutAnimation({ duration: 5000 }),
      landing({ duration: 500 }),
    );

    activate(composed);
    await drag(55);
    release(55);

    expect(composed.finishes).toHaveLength(1);
    expect(composed.placeholder()).toBeNull();
    // The tail outlives the operation — it is the kernel's, on the released
    // visual — where the displacement is the operation's and retires with it,
    // which is why the row that moved out of the way carries nothing.
    expect(composed.items[0]!.getAnimations()[0]!.playState).toBe('running');
    expect(composed.items[1]!.getAnimations()).toEqual([]);
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
    // Site B: `resolveItem` calls the `handle` slot, and `seedDraft` calls
    // `visual` immediately after. The kernel's post-`admit` recheck stops the
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
   * A displacement sink that records nothing but the fact of being called.
   *
   * **There is no pipeline to record**: a committed move is one write and one
   * call per displaced element, so what a barrier test observes is whether
   * `report` ran at all. `layoutAnimation()` cannot stand in for it: its own `retire()`
   * empties the map, so it is *already* inert on a destroyed controller and
   * would report "no animation" whether the barrier exists or not.
   */
  const displacementRecorder = (
    applied: number[],
  ): Pick<SortableConfig, 'displacement'> => ({
    displacement: () => ({
      report: (): void => {
        applied.push(applied.length);
      },
      settle: (): void => {},
    }),
  });

  it('should not run the bracket past a placeholder reaction that destroyed', async () => {
    // Site C, and the one no other test reaches. `movePlaceholder` moves a
    // node, so a custom-element placeholder's `disconnectedCallback` runs
    // synchronously inside that call — consumer code from the `placeholder()`
    // factory, reached from a plain DOM write, with no seam around it.
    // `activation.effect` already guards the identical hazard one line after
    // `item.after(placeholder)`; this is the same species through the other
    // door, and the `finally` must still clear `view.insertion`.
    //
    // **One of the three barriers D-157 keeps**, and the only one between the
    // write and the sink: everything the old bracket guarded after this point
    // — an invalidation, an eager rebuild, a second hook pipeline — is gone,
    // so what this barrier now protects is `apply`.
    const applied: number[] = [];
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
      fragments: [
        { placeholder: () => document.createElement(name) },
        displacementRecorder(applied),
      ],
    });

    ({ controller } = composed);

    activate(composed);
    await drag(55);

    // The write happened and the reaction destroyed the controller; the sink
    // never ran, so no contribution was started on a retired feature.
    expect(applied).toEqual([]);
  });
});
