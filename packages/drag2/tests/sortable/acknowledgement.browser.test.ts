/**
 * **The authored-presentation acknowledgement protocol (D-33).**
 *
 * `ReorderResolution.accept({ presentation: true })` declares that an authored
 * render is coming; `controller.ready(request)` says it is here, and names which
 * operation it belongs to. Nothing else crosses the public boundary — no token,
 * no promise, no settlement object.
 *
 * Everything here is driven through the **public entrypoint**, because the
 * protocol is public: the two halves are a consumer's, and a suite that reached
 * for the SPI to exercise them would be testing a shape no consumer can see. The
 * rows that need a seam to throw on demand live in `tests/kernel` instead.
 *
 * Layout is the composed suite's: three 40px items stacked from y=0, so the
 * destination centres are 20, 60 and 100.
 *
 * ## What most of these rows are really pinning
 *
 * A gate that is released twice is **invisible in the final DOM** — the drop
 * still completes, the placeholder still goes away, the order is still right.
 * What it destroys is the hold count, and the only way to see that is to keep a
 * *second* gate outstanding: a landing runner that never completes holds one, so
 * a spurious readiness release drops the count to zero and finalizes a drop
 * whose animation is still running. That is why almost every duplicate row below
 * installs a runner and then asserts `finishes` is **empty**.
 *
 * The reports are asserted alongside, never instead. A kernel that swallowed
 * duplicates silently would pass every state assertion here (contract 02 §One
 * channel, one gating rule).
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { draggable } from '../../src/drag.ts';
import { FAILURE_PRESENTATION_READY } from '../../src/kernel/failures.ts';
import { callbacks } from '../../src/sortable/callbacks.ts';
import {
  landing,
  type LandingHandle,
  type LandingStart,
} from '../../src/sortable/landing.ts';
import { y } from '../../src/sortable/y.ts';
import {
  type ReorderRequest,
  ReorderResolution,
  type SortableController,
  type SortableFeature,
  type SortableFinishResult,
  sortable,
} from '../../src/sortable.ts';

const POINTER_ID = 31;
const ITEM_HEIGHT = 40;

type Fixture = Readonly<{
  root: HTMLElement;
  items: HTMLElement[];
  controller: SortableController;
  /** Every request `onReorder` was handed, by identity. */
  requests: ReorderRequest[];
  finishes: SortableFinishResult[];
  /** Classified failures, through `onError`. */
  errors: Array<Readonly<{ stage: number }>>;
  /** What the landing runner did, when one is installed. */
  runner: string[];
  placeholder(): HTMLElement | null;
  order(): string;
}>;

type Options = Readonly<{
  /** Answers the round-trip. Default: accept, declaring a presentation. */
  onReorder?(request: ReorderRequest, fixture: Fixture): ReorderResolution;
  readinessTimeout?: number;
  /**
   * Install a landing runner that never completes, so the settlement keeps a
   * second hold and the readiness accounting stays observable.
   */
  holdLanding?: boolean;
  /** Called from inside the landing runner's `start`, i.e. inside arm. */
  onLandingStart?(fixture: Fixture): void;
}>;

const cleanup: Array<() => void> = [];

type Reporting = { reportError?(error: unknown): void };

/** The non-consequential platform channel every invalid acknowledgement takes. */
let reported: unknown[] = [];

beforeEach(() => {
  reported = [];
  (globalThis as Reporting).reportError = (error): void => {
    reported.push(error);
  };
});

afterEach(() => {
  delete (globalThis as Reporting).reportError;

  for (const dispose of cleanup.splice(0)) {
    dispose();
  }
});

function build(options: Options = {}): Fixture {
  const root = document.createElement('div');

  root.style.width = '200px';
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

  const requests: ReorderRequest[] = [];
  const finishes: SortableFinishResult[] = [];
  const errors: Array<Readonly<{ stage: number }>> = [];
  const runner: string[] = [];

  let fixture!: Fixture;

  const run: LandingStart = (_context, _done, _fail): LandingHandle => {
    runner.push('start');
    options.onLandingStart?.(fixture);

    return {
      destroy(): void {
        runner.push('destroy');
      },
      retarget(): void {
        runner.push('retarget');
      },
    };
  };

  const controller = draggable(
    root,
    sortable(
      items,
      y(),
      ...(options.holdLanding === true
        ? [landing({ run })]
        : ([] as readonly SortableFeature[])),
      callbacks({
        onReorder(request) {
          requests.push(request);

          return (
            options.onReorder?.(request, fixture) ??
            ReorderResolution.accept({ presentation: true })
          );
        },
        onFinish(result): void {
          finishes.push(result);
        },
        onError(_error, context): void {
          errors.push({ stage: context.stage });
        },
        ...(options.readinessTimeout === undefined
          ? null
          : { readinessTimeout: options.readinessTimeout }),
      }),
    ),
  );

  // Synthetic pointer events have no active pointer, so the real
  // `setPointerCapture` would throw `NotFoundError` for every activation.
  root.setPointerCapture = (): void => {};
  root.releasePointerCapture = (): void => {};

  fixture = {
    root,
    items,
    controller,
    requests,
    finishes,
    errors,
    runner,
    placeholder: () => root.querySelector('[data-drag-placeholder]'),
    order: () =>
      [...root.children]
        .map((child) => {
          const index = items.indexOf(child as HTMLElement);

          return index === -1 ? '_' : String(index);
        })
        .join(''),
  };

  cleanup.push(() => {
    controller.destroy();
    root.remove();
  });

  return fixture;
}

const press = (target: HTMLElement, y: number): void => {
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

const nextFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

/** Press the first row and cross the activation threshold. */
const activate = (fixture: Fixture): void => {
  press(fixture.items[0]!, 10);
  pointerEvent('pointermove', 30);
};

/** Drag to the last gap and drop there, so the reorder is a real one. */
const dropAtEnd = async (): Promise<void> => {
  pointerEvent('pointermove', 110);
  await nextFrame();
  pointerEvent('pointerup', 110);
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

describe('a resolution that declares no presentation', () => {
  it('should hold no readiness gate and finalize in the resolution drain', async () => {
    const fixture = build({
      onReorder: () => ReorderResolution.accept(),
    });

    activate(fixture);
    await dropAtEnd();

    // `authoredReady` is true from sealing: an absent declaration means the
    // consumer asserted its presentation is already final, which is the
    // imperative consumer the default exists for.
    expect(fixture.finishes).toHaveLength(1);
    expect(fixture.placeholder()).toBeNull();
    expect(reported).toEqual([]);
  });
});

describe('a declared authored presentation', () => {
  it('should hold the settlement open until it is acknowledged', async () => {
    const fixture = build();

    activate(fixture);
    await dropAtEnd();

    // I-9: no `landing()` is installed, so this is the readiness gate alone
    // keeping the operation off the resolution drain.
    expect(fixture.finishes).toEqual([]);
    expect(fixture.placeholder()).not.toBeNull();

    fixture.controller.ready(fixture.requests[0]!);

    expect(fixture.finishes).toHaveLength(1);
    expect(fixture.placeholder()).toBeNull();
    expect(reported).toEqual([]);
  });

  it('should re-anchor to the authored destination once acknowledged', async () => {
    const fixture = build({ holdLanding: true });

    activate(fixture);
    await dropAtEnd();

    // Provisional while the acknowledgement is outstanding: re-anchoring now
    // would drag the placeholder back beside the item's old slot.
    expect(fixture.runner).toEqual(['start']);

    fixture.controller.ready(fixture.requests[0]!);

    // `authoredReady` is true now, so the kernel re-measures and improves the
    // runner's trajectory. The landing hold is still outstanding, so nothing
    // has finalized.
    expect(fixture.runner).toEqual(['start', 'retarget']);
    expect(fixture.finishes).toEqual([]);
  });

  it('should classify the deadline when it is never acknowledged', async () => {
    const fixture = build({ readinessTimeout: 20 });

    activate(fixture);
    await dropAtEnd();
    await sleep(80);

    // The honest terminal for a consumer that declared a render and never
    // produced one: the reorder was accepted and is unrendered, so the
    // operation genuinely did not complete. `onError` only.
    expect(fixture.errors.map((each) => each.stage)).toEqual([
      FAILURE_PRESENTATION_READY,
    ]);
    expect(fixture.finishes).toEqual([]);
  });
});

describe('a synchronous commit', () => {
  it('should acknowledge from inside onReorder, before the settlement exists', async () => {
    // C-01, the blocker that decided D-33 against a kernel-minted token: the
    // authored mutation begins *inside* `onReorder`, so a `flushSync` consumer,
    // a synchronous renderer or any non-React integration acknowledges before a
    // settlement — let alone a hold — exists. The request has the happens-before
    // relationship a minted capability could not: it is the argument to the
    // callback that asks for the mutation.
    const fixture = build({
      onReorder(request, self) {
        self.controller.ready(request);
        return ReorderResolution.accept({ presentation: true });
      },
    });

    activate(fixture);
    await dropAtEnd();

    expect(fixture.finishes).toHaveLength(1);
    expect(fixture.placeholder()).toBeNull();
    expect(reported).toEqual([]);
  });

  it('should not finalize inside its own arm step', async () => {
    // The early latch is *dispatched*, never released inline: a settlement
    // holding only readiness would otherwise reach zero holds in the middle of
    // arming, which is the hazard a synchronous `done()` has. The runner
    // starting proves arm ran to completion with the hold still counted.
    const fixture = build({
      holdLanding: true,
      onReorder(request, self) {
        self.controller.ready(request);
        return ReorderResolution.accept({ presentation: true });
      },
    });

    activate(fixture);
    await dropAtEnd();

    expect(fixture.runner).toContain('start');
    expect(fixture.finishes).toEqual([]);
  });
});

describe('a duplicate acknowledgement', () => {
  it('should be inert and reported in the early window', async () => {
    const fixture = build({
      holdLanding: true,
      onReorder(request, self) {
        self.controller.ready(request);
        self.controller.ready(request);
        return ReorderResolution.accept({ presentation: true });
      },
    });

    activate(fixture);
    await dropAtEnd();

    // The latch is a boolean, so setting it twice changes nothing — but it is
    // still reported rather than swallowed.
    expect(reported).toHaveLength(1);
    expect(fixture.finishes).toEqual([]);
    expect(fixture.errors).toEqual([]);
  });

  it('should be inert and reported after the hold has settled', async () => {
    const fixture = build({ holdLanding: true });

    activate(fixture);
    await dropAtEnd();

    const request = fixture.requests[0]!;

    fixture.controller.ready(request);
    fixture.controller.ready(request);

    // The second call releases nothing and moves no hold count. Without the
    // `readinessSettled` latch it would decrement the landing hold instead, and
    // the drop would finalize while the runner was still going.
    expect(reported).toHaveLength(1);
    expect(fixture.finishes).toEqual([]);
    expect(fixture.runner).not.toContain('destroy');
  });

  it('should be reported as a duplicate rather than as a contradiction', async () => {
    // The row order is normative (C5-02): `readinessSettled` is tested *before*
    // "no hold ⇒ contradictory", because after a valid release the two states
    // are indistinguishable by hold alone — the phase is still `SETTLING` while
    // landing is outstanding, `readinessHeld` is now false, and a presentation
    // *was* declared. Classifying by the absent hold would tell a consumer that
    // acknowledged correctly, twice, that it acknowledged something it never
    // declared.
    const fixture = build({ holdLanding: true });

    activate(fixture);
    await dropAtEnd();

    const request = fixture.requests[0]!;

    fixture.controller.ready(request);
    fixture.controller.ready(request);

    expect(String(reported[0])).toContain('more than once');
  });

  it('should be inert and reported across the early-to-armed boundary', async () => {
    // C5-02, and the same-window case does not cover it. The first
    // acknowledgement arrives **early**, while the resolution attempt is open;
    // the settlement is created with a readiness hold *and* a landing hold; arm
    // copies the latch, claims `readinessSettled` and dispatches. The second
    // arrives re-entrantly from inside the runner's `start` — during the rest of
    // arm, before the queued release drains.
    //
    // With landing outstanding the attempt is still `SETTLING` after the first
    // release, so an unclaimed latch here would let the second action decrement
    // the same hold again.
    const fixture = build({
      holdLanding: true,
      onReorder(request, self) {
        self.controller.ready(request);
        return ReorderResolution.accept({ presentation: true });
      },
      onLandingStart(self) {
        self.controller.ready(self.requests[0]!);
      },
    });

    activate(fixture);
    await dropAtEnd();

    // One dispatch, one release, one duplicate report — and the operation is
    // still waiting on its landing, which is what a second release would have
    // ended.
    expect(reported).toHaveLength(1);
    expect(String(reported[0])).toContain('more than once');
    // The single release *does* re-anchor and retarget — that is the queued
    // action doing its job. What a second release would do is decrement the
    // **landing** hold as well, reaching zero and finalizing a drop whose
    // animation is still running, so that is what the last two assertions pin.
    expect(fixture.runner).toEqual(['start', 'retarget']);
    expect(fixture.finishes).toEqual([]);
  });
});

describe('an acknowledgement the operation never issued', () => {
  it('should be ignored and reported for a fabricated request', async () => {
    const fixture = build({ holdLanding: true });

    activate(fixture);
    await dropAtEnd();

    fixture.controller.ready({
      version: 0,
      from: 0,
      to: 2,
      item: fixture.items[0]!,
      before: null,
      after: null,
    });

    expect(reported).toHaveLength(1);
    expect(fixture.finishes).toEqual([]);
    expect(fixture.runner).not.toContain('retarget');
  });

  it('should reject a structurally identical copy of the live request', async () => {
    // The check is `===` against the published object, not field equality, and
    // this row is what pins it — typecheck cannot, because a structurally equal
    // literal is assignable to the parameter.
    const fixture = build({ holdLanding: true });

    activate(fixture);
    await dropAtEnd();

    fixture.controller.ready({ ...fixture.requests[0]! });

    expect(reported).toHaveLength(1);
    expect(fixture.runner).not.toContain('retarget');

    // And the real object still works, so the rejection was about identity and
    // not about the operation having moved on.
    fixture.controller.ready(fixture.requests[0]!);

    expect(fixture.runner).toContain('retarget');
  });

  it('should reject the same request again once the operation retired', async () => {
    // `retire()` clears the publication, which is the other half of "exactly one
    // request is live per controller".
    const fixture = build();

    activate(fixture);
    await dropAtEnd();

    const request = fixture.requests[0]!;

    fixture.controller.ready(request);

    expect(fixture.finishes).toHaveLength(1);

    fixture.controller.ready(request);

    expect(reported).toHaveLength(1);
    expect(fixture.finishes).toHaveLength(1);
  });
});

describe('an acknowledgement with no declaration behind it', () => {
  it('should be reported as contradictory when it arrives at SETTLING', async () => {
    // The one consumer contradiction the library can see **without inferring
    // anything from DOM mutation**: the resolution declared nothing, so there is
    // no hold to release and never was.
    const fixture = build({
      holdLanding: true,
      onReorder: () => ReorderResolution.accept(),
    });

    activate(fixture);
    await dropAtEnd();
    fixture.controller.ready(fixture.requests[0]!);

    expect(reported).toHaveLength(1);
    expect(String(reported[0])).toContain('declared none');
    // Nothing is added, nothing released, and the settlement outcome is
    // unchanged: the landing is still the only thing outstanding.
    expect(fixture.finishes).toEqual([]);
    expect(fixture.errors).toEqual([]);
  });

  it('should be reported and discarded at seal when it arrives early', async () => {
    // The same contradiction one window earlier: the acknowledgement latches on
    // the resolution attempt before the kernel can know what will be declared,
    // so the check happens at **seal** — the first moment the complete gate plan
    // is known. Discarding there is what lets `arm` read the latch as an
    // unconditional release.
    const fixture = build({
      holdLanding: true,
      onReorder(request, self) {
        self.controller.ready(request);
        return ReorderResolution.accept();
      },
    });

    activate(fixture);
    await dropAtEnd();

    expect(reported).toHaveLength(1);
    expect(String(reported[0])).toContain('declared none');
    // Discarded, not carried into arm: the landing armed normally and no
    // phantom readiness release happened.
    expect(fixture.runner).toEqual(['start']);
    expect(fixture.finishes).toEqual([]);
  });
});

describe('an acknowledgement outside any window', () => {
  it('should be ignored and reported at IDLE', () => {
    const fixture = build();

    fixture.controller.ready({
      version: 0,
      from: 0,
      to: 1,
      item: fixture.items[0]!,
      before: null,
      after: null,
    });

    expect(reported).toHaveLength(1);
  });

  it('should be ignored and reported at PENDING and at ACTIVE', () => {
    const fixture = build();
    const request = {
      version: 0,
      from: 0,
      to: 1,
      item: fixture.items[0]!,
      before: null,
      after: null,
    };

    press(fixture.items[0]!, 10);
    fixture.controller.ready(request);

    expect(reported).toHaveLength(1);

    pointerEvent('pointermove', 30);
    fixture.controller.ready(request);

    expect(reported).toHaveLength(2);
  });

  it('should be inert after destroy()', async () => {
    const fixture = build({ holdLanding: true });

    activate(fixture);
    await dropAtEnd();

    const request = fixture.requests[0]!;

    fixture.controller.destroy();
    fixture.controller.ready(request);

    // Inert at both validation points: the behavior's publication is cleared by
    // retirement, and the kernel's queue is closed. Nothing is released and
    // nothing is classified.
    expect(fixture.finishes).toEqual([]);
    expect(fixture.errors).toEqual([]);
  });
});

describe('the public surface', () => {
  it('should expose exactly four controller members', () => {
    // **There is no third readiness outcome.** An earlier draft of D-33 gave the
    // consumer `abandon()` — release the gate without failing — and Checkpoint C
    // found it incoherent: for an accepted destination settlement it produces a
    // drop reporting `onFinish` over an authored DOM that still shows the old
    // order. A state illegal in the only case anyone would reach for it does not
    // exist, and this is where that stays true.
    const fixture = build();

    expect([...Object.keys(fixture.controller)].sort()).toEqual([
      'cancel',
      'destroy',
      'ready',
      'updateItems',
    ]);
  });
});
