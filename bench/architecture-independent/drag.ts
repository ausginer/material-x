/**
 * Prototype of the transaction model in
 * packages/drag2/.plan/reviews/architecture/independent-model.md. It exists to
 * test that model and is not a candidate implementation.
 *
 * The machine (`drive`) knows states and input; a behaviour knows geometry.
 * Neither knows about the other's concerns, and every consumer callback is the
 * last thing the transition calling it does.
 */

export type Outcome = 'accepted' | 'rejected' | 'canceled';

export type Callbacks<Value> = Readonly<{
  onStart?(value: Value): void;
  onChange?(value: Value): void;
  decide?(value: Value, signal: AbortSignal): boolean | Promise<boolean>;
  onEnd?(outcome: Outcome, value: Value): void;
}>;

export type Controller = Readonly<{ cancel(): void; destroy(): void }>;

/** Plays the delta from the old destination down to zero. Holds no truth. */
export type Motion = (
  element: HTMLElement,
  dx: number,
  dy: number,
) => Animation;

export function slide(options: Readonly<KeyframeAnimationOptions>): Motion {
  return (element, dx, dy) =>
    element.animate(
      { translate: [`${dx}px ${dy}px`, '0px 0px'] },
      { ...options, composite: 'add' },
    );
}

type Tails = Readonly<{
  play(
    motion: Motion | undefined,
    element: HTMLElement,
    dx: number,
    dy: number,
  ): void;
  /** Runs `done` once `element` has no running tail: now, on finishing, or at stop. */
  whenStill(element: HTMLElement, done: () => void): void;
  stop(): void;
  disable(): void;
}>;

function createTails(): Tails {
  const running = new Map<Animation, HTMLElement>();
  const waiting = new Map<HTMLElement, () => void>();
  let enabled = true;
  const isStill = (element: HTMLElement) => {
    for (const owner of running.values()) {
      if (owner === element) {
        return false;
      }
    }
    return true;
  };
  return {
    play(motion, element, dx, dy) {
      if (motion && enabled && (dx !== 0 || dy !== 0)) {
        const animation = motion(element, dx, dy);
        running.set(animation, element);
        // Running entries leave synchronously at stop, so a late event from a
        // stopped tail finds nothing and cannot touch a newer session.
        animation.onfinish = animation.oncancel = () => {
          if (running.delete(animation) && isStill(element)) {
            waiting.get(element)?.();
            waiting.delete(element);
          }
        };
      }
    },
    whenStill(element, done) {
      if (isStill(element)) {
        done();
      } else {
        waiting.set(element, done);
      }
    },
    stop() {
      for (const animation of running.keys()) {
        animation.cancel();
      }
      running.clear();
      for (const done of waiting.values()) {
        done();
      }
      waiting.clear();
    },
    disable() {
      enabled = false;
    },
  };
}

type Behavior<Value> = Readonly<{
  /** One object per controller, mutated in place: a sample allocates nothing. */
  value: Value;
  pick(target: Element): HTMLElement | null;
  /** The only moment a behaviour may read layout, apart from `rescroll`. */
  lift(item: HTMLElement): void;
  /** Returns whether the value changed. Reads no layout. */
  follow(dx: number, dy: number): boolean;
  rescroll(): void;
  /** Absent means no keyboard. Returns undefined for a key it does not own. */
  step?(key: string): boolean | undefined;
  land(): void;
  commit(): void;
  restore(): void;
}>;

const THRESHOLD = 4;

function drive<Value>(
  root: HTMLElement,
  behavior: Behavior<Value>,
  callbacks: Callbacks<Value>,
  tails: Tails,
): Controller {
  const { onStart, onChange, decide, onEnd } = callbacks;
  const life = new AbortController();
  let state: 'idle' | 'pressed' | 'moving' | 'deciding' = 'idle';
  let scope: AbortController | undefined;
  let decision: AbortController | undefined;
  let item: HTMLElement | undefined;
  let pointerId = -1;
  let startX = 0;
  let startY = 0;
  let lastDx = 0;
  let lastDy = 0;

  const notify = (callback: ((value: Value) => void) | undefined) => {
    if (callback) {
      try {
        callback(behavior.value);
      } catch (error) {
        reportError(error);
        finish('canceled');
      }
    }
  };

  // The single end of every session. State and DOM are consistent before any
  // consumer code runs, so a re-entrant command finds nothing half-done.
  const finish = (outcome: Outcome) => {
    if (state === 'idle') {
      return;
    }
    const started = state !== 'pressed';
    const pending = decision;
    state = 'idle';
    decision = undefined;
    scope!.abort();
    scope = undefined;
    if (item!.hasPointerCapture(pointerId)) {
      item!.releasePointerCapture(pointerId);
    }
    if (started) {
      if (outcome === 'accepted') {
        behavior.commit();
      } else {
        behavior.restore();
      }
      if (outcome === 'canceled') {
        pending?.abort();
      }
      if (onEnd) {
        try {
          onEnd(outcome, behavior.value);
        } catch (error) {
          reportError(error);
        }
      }
    }
  };

  const drop = () => {
    state = 'deciding';
    behavior.land();
    if (!decide) {
      finish('accepted');
      return;
    }
    const current = new AbortController();
    decision = current;
    let verdict: boolean | Promise<boolean>;
    try {
      verdict = decide(behavior.value, current.signal);
    } catch (error) {
      reportError(error);
      verdict = false;
    }
    // The only code that follows a callback. An aborted decision has already
    // ended its session, so its verdict has nothing left to affect.
    if (typeof verdict === 'boolean') {
      if (!current.signal.aborted) {
        finish(verdict ? 'accepted' : 'rejected');
      }
    } else {
      verdict.then(
        (accepted) => {
          if (!current.signal.aborted) {
            finish(accepted ? 'accepted' : 'rejected');
          }
        },
        (error: unknown) => {
          if (!current.signal.aborted) {
            reportError(error);
            finish('rejected');
          }
        },
      );
    }
  };

  // A click follows any pointer release after activation, including a release
  // after the session was cancelled while the button stayed down.
  const swallowNextClick = () => {
    // Outlives its session, so it keeps its own pointer: a later keyboard
    // session must not stop it recognising the release it waits for.
    const id = pointerId;
    const guard = new AbortController();
    const signal = AbortSignal.any([guard.signal, life.signal]);
    const release = (event: PointerEvent) => {
      if (event.pointerId === id) {
        guard.abort();
        const click = new AbortController();
        addEventListener(
          'click',
          (clickEvent) => {
            clickEvent.stopPropagation();
            clickEvent.preventDefault();
          },
          {
            capture: true,
            once: true,
            signal: AbortSignal.any([click.signal, life.signal]),
          },
        );
        setTimeout(() => {
          click.abort();
        });
      }
    };
    addEventListener('pointerup', release, { capture: true, signal });
    addEventListener('pointercancel', () => guard.abort(), {
      capture: true,
      signal,
    });
  };

  const onPointerMove = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    lastDx = event.clientX - startX;
    lastDy = event.clientY - startY;
    if (state === 'moving') {
      if (behavior.follow(lastDx, lastDy)) {
        notify(onChange);
      }
    } else if (
      state === 'pressed' &&
      lastDx * lastDx + lastDy * lastDy >= THRESHOLD * THRESHOLD
    ) {
      state = 'moving';
      tails.stop();
      behavior.lift(item!);
      item!.setPointerCapture(pointerId);
      swallowNextClick();
      behavior.follow(lastDx, lastDy);
      notify(onStart);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    let consumed = false;
    if (event.key === 'Escape') {
      consumed = true;
      finish('canceled');
    } else if (pointerId === -1 && state === 'moving') {
      if (event.key === ' ' || event.key === 'Enter') {
        consumed = true;
        if (!event.repeat) {
          drop();
        }
      } else {
        const changed = behavior.step!(event.key);
        if (changed !== undefined) {
          consumed = true;
          if (changed) {
            notify(onChange);
          }
        }
      }
    }
    if (consumed) {
      event.stopPropagation();
      event.preventDefault();
    }
  };

  root.addEventListener(
    'pointerdown',
    (event) => {
      if (state !== 'idle' || event.button !== 0) {
        return;
      }
      const picked = behavior.pick(event.target as Element);
      if (!picked) {
        return;
      }
      state = 'pressed';
      item = picked;
      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      scope = new AbortController();
      const { signal } = scope;
      const capture = { capture: true, signal };
      document.addEventListener('pointermove', onPointerMove, {
        capture: true,
        passive: true,
        signal,
      });
      document.addEventListener(
        'pointerup',
        (up) => {
          if (up.pointerId === pointerId) {
            if (state === 'moving') {
              drop();
            } else if (state === 'pressed') {
              finish('canceled');
            }
          }
        },
        capture,
      );
      const lost = (cancel: PointerEvent) => {
        if (cancel.pointerId === pointerId && state !== 'deciding') {
          finish('canceled');
        }
      };
      document.addEventListener('pointercancel', lost, capture);
      document.addEventListener('lostpointercapture', lost, capture);
      document.addEventListener('keydown', onKeyDown, capture);
      document.addEventListener(
        'scroll',
        () => {
          if (state === 'moving') {
            behavior.rescroll();
            if (behavior.follow(lastDx, lastDy)) {
              notify(onChange);
            }
          }
        },
        { capture: true, passive: true, signal },
      );
      const prevent = (native: Event) => {
        native.preventDefault();
      };
      document.addEventListener('dragstart', prevent, capture);
      document.addEventListener('selectstart', prevent, capture);
    },
    { signal: life.signal },
  );

  if (behavior.step) {
    root.addEventListener(
      'keydown',
      (event) => {
        if (
          state !== 'idle' ||
          event.repeat ||
          (event.key !== ' ' && event.key !== 'Enter')
        ) {
          return;
        }
        const target = event.target as HTMLElement;
        if (behavior.pick(target) !== target) {
          return;
        }
        event.preventDefault();
        state = 'moving';
        item = target;
        pointerId = -1;
        scope = new AbortController();
        const { signal } = scope;
        document.addEventListener('keydown', onKeyDown, {
          capture: true,
          signal,
        });
        target.addEventListener(
          'focusout',
          () => {
            if (state === 'moving') {
              finish('canceled');
            }
          },
          { signal },
        );
        tails.stop();
        behavior.lift(target);
        notify(onStart);
      },
      { signal: life.signal },
    );
  }

  return {
    cancel() {
      finish('canceled');
    },
    destroy() {
      tails.disable();
      tails.stop();
      life.abort();
      finish('canceled');
    },
  };
}

export type FreeValue = { x: number; y: number };

export type FreeOptions = Callbacks<FreeValue> &
  Readonly<{ handle?: string; landing?: Motion; x?: number; y?: number }>;

export function movable(
  element: HTMLElement,
  options: FreeOptions = {},
): Controller {
  const tails = createTails();
  const value: FreeValue = { x: options.x ?? 0, y: options.y ?? 0 };
  let restX = value.x;
  let restY = value.y;
  const place = (x: number, y: number) => {
    element.style.translate = `${x}px ${y}px`;
  };
  place(restX, restY);
  return drive(
    element,
    {
      value,
      pick(target) {
        return !options.handle || target.closest(options.handle)
          ? element
          : null;
      },
      lift() {
        element.toggleAttribute('data-dragging', true);
      },
      follow(dx, dy) {
        value.x = restX + dx;
        value.y = restY + dy;
        place(value.x, value.y);
        return true;
      },
      rescroll() {},
      land() {},
      commit() {
        restX = value.x;
        restY = value.y;
        element.removeAttribute('data-dragging');
      },
      restore() {
        place(restX, restY);
        tails.play(options.landing, element, value.x - restX, value.y - restY);
        value.x = restX;
        value.y = restY;
        tails.whenStill(element, () => {
          element.removeAttribute('data-dragging');
        });
      },
    },
    options,
    tails,
  );
}

export type SortValue = {
  item: HTMLElement | undefined;
  from: number;
  to: number;
};

export type SortOptions = Callbacks<SortValue> &
  Readonly<{
    handle?: string;
    /** The consumer reorders the DOM itself before `decide` resolves `true`. */
    consumerOrder?: boolean;
    /**
     * Experiment arms for how displacement meets layout. `flip` writes none for
     * zero; `seed` holds every item non-none for the session. Absent, an item
     * stays non-none from its first displacement until the session ends.
     */
    arm?: 'flip' | 'seed';
    landing?: Motion;
    neighbors?: Motion;
  }>;

export function sortable(
  list: HTMLElement,
  options: SortOptions = {},
): Controller {
  const { handle, consumerOrder, arm, landing, neighbors } = options;
  const tails = createTails();
  const value: SortValue = { item: undefined, from: -1, to: -1 };
  let items: readonly HTMLElement[] = [];
  let tops = new Float64Array(0);
  let heights = new Float64Array(0);
  let mids = new Float64Array(0);
  let step = 0;
  let anchorTop = 0;
  let scrollDelta = 0;
  // The dragged item's current destination offset from its natural position.
  let offset = 0;
  let focused: HTMLElement | undefined;
  // The contiguous range of items written this session, and so owed a clear.
  let low = 0;
  let high = 0;

  const slot = (to: number) => {
    const { from } = value;
    if (to > from) {
      return tops[to]! + heights[to]! - tops[from]! - heights[from]!;
    }
    return to < from ? tops[to]! - tops[from]! : 0;
  };

  const displacement = (k: number, to: number) => {
    const { from } = value;
    if (from < k && k <= to) {
      return -step;
    }
    return to <= k && k < from ? step : 0;
  };

  // none and non-none differ in layout, not just paint: going between them lays
  // the list out again. So an item touched once stays non-none, and the session
  // pays one layout per distinct item rather than one per crossing.
  const write = (element: HTMLElement, y: number) => {
    element.style.translate = y === 0 && arm === 'flip' ? '' : `0px ${y}px`;
  };

  // O(|Δ|): only items between the old and new proposal can change.
  const propose = (to: number) => {
    const old = value.to;
    const { from } = value;
    for (let k = Math.min(old, to); k <= Math.max(old, to); k += 1) {
      if (k !== from) {
        const before = displacement(k, old);
        const after = displacement(k, to);
        if (before !== after) {
          write(items[k]!, after);
          tails.play(neighbors, items[k]!, 0, before - after);
        }
      }
    }
    value.to = to;
    low = Math.min(low, to);
    high = Math.max(high, to);
  };

  const clearAll = () => {
    const { item } = value;
    const first = arm === 'seed' ? 0 : low;
    const last = arm === 'seed' ? items.length - 1 : high;
    for (let k = first; k <= last; k += 1) {
      items[k]!.style.translate = '';
    }
    item!.style.translate = '';
    // Elevation outlives the session: a landing item has to stay above later
    // siblings until its tail ends, and the tail decides when that is.
    tails.whenStill(item!, () => {
      item!.removeAttribute('data-dragging');
    });
  };

  return drive(
    list,
    {
      value,
      pick(target) {
        if (handle && !target.closest(handle)) {
          return null;
        }
        let node: Element | null = target;
        while (node && node.parentElement !== list) {
          node = node.parentElement;
        }
        return node as HTMLElement | null;
      },
      lift(item) {
        items = [...list.children] as HTMLElement[];
        const { length } = items;
        tops = new Float64Array(length);
        heights = new Float64Array(length);
        mids = new Float64Array(length);
        for (let k = 0; k < length; k += 1) {
          const rect = items[k]!.getBoundingClientRect();
          tops[k] = rect.top;
          heights[k] = rect.height;
          mids[k] = rect.top + rect.height / 2;
        }
        value.item = item;
        value.from = value.to = low = high = items.indexOf(item);
        // Displacing past the dragged item closes its height plus one gap.
        const gap = length > 1 ? tops[1]! - tops[0]! - heights[0]! : 0;
        step = heights[value.from]! + gap;
        anchorTop = list.getBoundingClientRect().top;
        scrollDelta = 0;
        offset = 0;
        item.toggleAttribute('data-dragging', true);
        focused = item.contains(document.activeElement)
          ? (document.activeElement as HTMLElement)
          : undefined;
        if (arm === 'seed') {
          for (const element of items) {
            element.style.translate = '0px 0px';
          }
        }
      },
      follow(_dx, dy) {
        offset = dy + scrollDelta;
        write(value.item!, offset);
        // Midpoints are the ones measured at lift, never displaced ones, so a
        // position has exactly one proposal and no history to oscillate over.
        const centre = mids[value.from]! + offset;
        let low = 0;
        let high = mids.length;
        while (low < high) {
          const middle = (low + high) >>> 1;
          if (mids[middle]! < centre) {
            low = middle + 1;
          } else {
            high = middle;
          }
        }
        const to = low > value.from ? low - 1 : low;
        if (to === value.to) {
          return false;
        }
        propose(to);
        return true;
      },
      rescroll() {
        scrollDelta = anchorTop - list.getBoundingClientRect().top;
      },
      step(key) {
        if (key !== 'ArrowUp' && key !== 'ArrowDown') {
          return undefined;
        }
        const to = value.to + (key === 'ArrowDown' ? 1 : -1);
        if (to < 0 || to >= items.length) {
          return false;
        }
        propose(to);
        const destination = slot(to);
        write(value.item!, destination);
        // The item takes no tail here: scrollIntoView reads the animated box,
        // and a tail would make it scroll to where the item was.
        value.item!.scrollIntoView({ block: 'nearest' });
        offset = destination;
        return true;
      },
      land() {
        const destination = slot(value.to);
        write(value.item!, destination);
        tails.play(landing, value.item!, 0, offset - destination);
        offset = destination;
      },
      commit() {
        const { item, from, to } = value;
        if (!consumerOrder && from !== to) {
          const anchor = items[to]!;
          if (to > from) {
            anchor.after(item!);
          } else {
            anchor.before(item!);
          }
        }
        // A DOM move blurs its subtree, whoever made the move.
        if (focused && document.activeElement !== focused) {
          focused.focus({ preventScroll: true });
        }
        clearAll();
      },
      restore() {
        const { item, from, to } = value;
        for (let k = Math.min(from, to); k <= Math.max(from, to); k += 1) {
          if (k !== from) {
            tails.play(neighbors, items[k]!, 0, displacement(k, to));
          }
        }
        tails.play(landing, item!, 0, offset);
        clearAll();
      },
    },
    options,
    tails,
  );
}
