/**
 * The packed destination-slot geometry cache, shared by every axis feature.
 *
 * **Dimension-neutral, deliberately.** It packs both centres and both edges and
 * expresses no rule about which of them matters — that is the axis feature's,
 * and stays in the axis feature's own module. Extracting this is what lets
 * `y()` and `xy()` be two *rules* rather than two implementations of a cache,
 * without either of them growing a branch about the other.
 *
 * One `Float64Array` plus one parallel element array, indexed by
 * **destination** position — the collection minus the dragged item — so a slot
 * *is* the index the resulting `Insertion` needs and its neighbours are the
 * adjacent elements.
 *
 * Each axis feature holds its own instance, created inside its factory, so the
 * "where does the geometry cache live" question stays answered by construction:
 * nobody else can name it, reach it, or type it.
 */
import type { CollectionSnapshot } from './domain.ts';

/** Packed `[left, top, right, bottom, centreX, centreY]` per destination slot. */
export const STRIDE = 6;
export const LEFT = 0;
export const TOP = 1;
export const RIGHT = 2;
export const BOTTOM = 3;
export const CENTRE_X = 4;
export const CENTRE_Y = 5;

/**
 * **Turn the buffer an axis has just measured into *settled* geometry**, by
 * subtracting whatever the displacement sink is currently holding for each of
 * the elements it names.
 *
 * `values` is the axis's packed buffer — six fields per slot, in the order
 * `left, top, right, bottom, centreX, centreY` — and `items` names the element
 * occupying each of the first `count` slots. A sink subtracts its own held `dx`
 * from `left`, `right` and `centreX` and its held `dy` from `top`, `bottom` and
 * `centreY`, in place.
 *
 * **Once per rebuild, not once per candidate**, which is what keeps a
 * composition that installs no sink from paying anything but one null test:
 * the walk and the per-element lookups belong to the party that knows what it
 * is holding.
 *
 * It is answered from animation timing and performs **no layout read**, which
 * is the whole of why nothing is ever released: a cache rebuilt while
 * contributions are in flight settles this way and obtains flow geometry, so
 * there is no window in which a row has jumped back.
 */
export type DisplacementSettle = (
  values: Float64Array,
  items: readonly HTMLElement[],
  count: number,
) => void;

/**
 * **Fields, not accessors.** Exposing `values()` and `count()` as methods costs
 * 90 B on the minimal composition and two calls per resolution on the hot path
 * — for encapsulation nothing can observe, since the whole record is private to
 * one feature instance.
 */
export type RectIndex = {
  /** The packed values. Re-allocated only when the collection outgrows it. */
  values: Float64Array;
  /**
   * **The placeholder's own rect, packed in the same six fields as a slot.**
   *
   * It is the hole the destination view is arranged around, and both axis rules
   * compare candidate centres against it. Measured **once per rebuild** here
   * rather than once per spatial frame in each rule, so a warm frame performs
   * no layout read at all.
   *
   * **Where it lands after a committed move is a flow quantity**, so no rule
   * predicts it: the linear rule marks it stale and re-reads the placeholder on
   * the next rebuild, writing through this same record.
   *
   * Allocated once with the record and never re-allocated: it is one slot, and
   * one slot does not grow.
   */
  hole: Float64Array;
  /** Destination-ordered elements, parallel to the packed slots. */
  items: HTMLElement[];
  /** How many destination slots the last scan produced. */
  count: number;
  /**
   * Re-measures only when something dirtied the cache or the collection version
   * moved. On a frame where the pointer merely travels inside the same slot
   * this reads no geometry at all and the previous scan stands.
   *
   * The parameter is the installed `box` slot — already defaulted to `visual`
   * by the assembler — or `null` when the config named neither, in which case
   * every candidate *is* its own box and the resolver would be an identity call
   * per item per rebuild.
   *
   * `live` reports whether the controller is still alive. It is read **between
   * every consumer-reachable call in the traversal**, including the candidate's
   * own `getBoundingClientRect()`: the candidate is a consumer-owned element
   * and an overridden `getBoundingClientRect()` is a consumer call, not a
   * layout read. So a composition with **no** resolver reads it too — there the
   * item is its own box and the geometry read is the only consumer call in the
   * loop, but it is still one.
   *
   * `placeholder` is measured into {@link RectIndex.hole} by the same scan, so
   * the rule that reads it never measures it. It is consumer-owned like every
   * candidate, so the barrier below covers it too.
   *
   * `settle` is the installed displacement sink's own walk, or `null` when no
   * displacement feature is composed. Called **once**, on the finished slots,
   * it is what makes this scan yield **settled** geometry while contributions
   * are still running — the cache holds where flow puts a row, never where an
   * animation currently draws it. The placeholder is never passed to it: a
   * report visits the destination view, which does not contain it.
   *
   * Returns `false` — and **only** then — when the rebuild aborted on the
   * terminal barrier. One shared channel rather than a per-axis `live()`
   * recheck: the recheck would cost a call per resolution in *every*
   * composition, where this costs one per candidate per **rebuild** only.
   */
  refresh(
    snapshot: CollectionSnapshot,
    dragged: HTMLElement,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
    live: () => boolean,
    placeholder: HTMLElement,
    settle: DisplacementSettle | null,
  ): boolean;
  invalidate(): void;
  retire(): void;
};

const capacityFor = (needed: number): number => {
  let capacity = 1;

  while (capacity < needed) {
    capacity *= 2;
  }

  return capacity;
};

/**
 * The development-build flag, read as the **bare global**.
 *
 * `__DEV__` is declared in `src/globals.d.ts` at **package** scope, so it is
 * package vocabulary rather than kernel vocabulary and the behavior tier binds
 * it directly. The kernel binds the ambient nowhere at all, and importing such
 * a binding would assert a behavior-tier reach into `kernel/` that must not
 * exist. `__DEV__` is replaced at build time, `DEV` is a literal, and every
 * branch guarded by it is dead code the minifier drops.
 *
 * **This is the package's one binding**, and
 * `tests/kernel/vocabulary.node.test.ts` asserts that.
 */
export const DEV: boolean = __DEV__;

/**
 * Whether the equivalence instrument runs. `DEV`-only in every sense: the read
 * sits inside a `DEV` branch, so the published bundle contains neither it nor
 * this binding.
 *
 * **It is not a measurement flag, and the direction is the whole of why.** The
 * instrument is on by default and every suite run checks it; this exists for
 * the opposite case — a performance measurement, which has to measure the code
 * that *ships*. The instrument performs a full scan, which is precisely the
 * forced layout this model removes, so leaving it on would time a build no
 * consumer can install.
 */
let verifying = true;

/** @see verifying — used by `tests/perf`, and by nothing in `src`. */
export function setRefreshVerification(enabled: boolean): void {
  if (DEV) {
    verifying = enabled;
  }
}

/**
 * **The equivalence instrument**, and what makes the prediction admissible
 * rather than merely plausible.
 *
 * The buffer the **previous** advance wrote must equal what a full scan of the
 * tree now produces. That is G3's instantiation for this axis, and it is
 * checked at the head of the next rebuild rather than inside the move that made
 * the claim — the move's own instant is the one at which the sink has just been
 * handed vectors and the animations it started have no resolved timing yet, so
 * a scan there compares a settled cache against a tree in an indeterminate
 * state. One frame later both are answerable. Asserted on every suite run and
 * behind no measurement flag: `DEV` is `true` in this repository's vite and
 * vitest configs and folds to `false` in the published bundle, so every test
 * that drives a real drag through `y()` checks it and no consumer pays for
 * it.
 *
 * **It heals before it throws**, writing the authoritative values back as it
 * goes, so a mismatch leaves the cache correct and the drag classified rather
 * than correct in the message and wrong in the buffer.
 *
 * **It takes no terminal barrier, and that is what scopes it.** Every call it
 * makes is a consumer call on a consumer-owned element, so in a shipped build
 * it would need the same threading the candidate loop has. It is not in a
 * shipped build: `DEV` folds to `false` and the whole function is dropped. What
 * remains is an in-repo instrument, and a fixture that destroys its controller
 * from inside `getBoundingClientRect` is measuring the instrument rather than
 * the library.
 *
 * **It runs in every composition, including one that animates.** A displaced
 * row carries an additive `translate` and `getBoundingClientRect()` reports
 * where the row *is*; the sink's own settle walk turns that back into flow
 * geometry, which is what the cache holds. So there is no composition the
 * instrument has to be scoped away from, and no settled window it has to wait
 * for.
 */
export const verifyEquivalence = (
  index: RectIndex,
  snapshot: CollectionSnapshot,
  dragged: HTMLElement,
  getBox: ((item: HTMLElement) => HTMLElement) | null,
  placeholder: HTMLElement,
  settle: DisplacementSettle | null,
  rule: string,
): void => {
  if (!verifying) {
    return;
  }

  const { values, items, hole } = index;
  const scan: HTMLElement[] = [];

  for (const item of snapshot.items) {
    if (item !== dragged) {
      scan.push(item);
    }
  }

  const n = scan.length;
  // A second buffer rather than a comparison woven into the scan, because the
  // sink settles a **finished** buffer and the claim being checked is what the
  // cache holds *before* any of it is healed. Allocating it is free where it
  // matters: `DEV` folds to `false` and this function leaves the bundle.
  const fresh = new Float64Array(n * STRIDE);

  for (let i = 0; i < n; i += 1) {
    const item = scan[i]!;
    // **The box, exactly as the scan measures it**, because a composition whose
    // `box` is a descendant of the item would otherwise be compared against a
    // rect the cache never held.
    const rect = (getBox ? getBox(item) : item).getBoundingClientRect();
    const offset = i * STRIDE;

    fresh[offset + LEFT] = rect.left;
    fresh[offset + TOP] = rect.top;
    fresh[offset + RIGHT] = rect.right;
    fresh[offset + BOTTOM] = rect.bottom;
    fresh[offset + CENTRE_X] = (rect.left + rect.right) * 0.5;
    fresh[offset + CENTRE_Y] = (rect.top + rect.bottom) * 0.5;
  }

  if (settle) {
    // Keyed by the *item*, because that is what a report visits: the offset the
    // sink holds carries a descendant box with it.
    settle(fresh, scan, n);
  }

  /**
   * **One slack, and it is not a concession.** Two things reintroduce
   * floating-point error of order `1e-5` px on a comparison that is otherwise
   * the same arithmetic on the same readings: settling subtracts a held vector,
   * and a row wearing an authored `rotate` has its bounding rect recomputed
   * through a transform matrix, so translating that rect and re-reading it do
   * not agree bit for bit. Both are five orders of magnitude below the smallest
   * disagreement a broken rule produces — a rule that is wrong is wrong by a
   * row — and authored presentation is supported in every composition, so the
   * tolerance cannot be conditioned on the sink.
   */
  const slack = 1 / 256;
  const differs = (a: number, b: number): boolean => {
    const gap = a - b;

    return (gap < 0 ? -gap : gap) > slack;
  };
  let mismatch = '';

  for (let i = 0; i < n; i += 1) {
    const offset = i * STRIDE;

    if (mismatch === '' && items[i] !== scan[i]) {
      mismatch = `slot ${i}`;
    }

    for (let field = 0; field < STRIDE; field += 1) {
      if (
        mismatch === '' &&
        differs(values[offset + field]!, fresh[offset + field]!)
      ) {
        mismatch = `slot ${i}`;
      }

      // Healed as it goes, so a mismatch leaves the cache correct and the drag
      // classified rather than correct in the message and wrong in the buffer.
      values[offset + field] = fresh[offset + field]!;
    }

    items[i] = scan[i]!;
  }

  if (mismatch === '' && n !== index.count) {
    mismatch = `count ${index.count}, full scan ${n}`;
  }

  index.count = n;
  items.length = n;

  const rect = placeholder.getBoundingClientRect();

  if (
    mismatch === '' &&
    (differs(hole[LEFT]!, rect.left) ||
      differs(hole[TOP]!, rect.top) ||
      differs(hole[RIGHT]!, rect.right) ||
      differs(hole[BOTTOM]!, rect.bottom))
  ) {
    mismatch = 'the placeholder';
  }

  hole[LEFT] = rect.left;
  hole[TOP] = rect.top;
  hole[RIGHT] = rect.right;
  hole[BOTTOM] = rect.bottom;
  hole[CENTRE_X] = (rect.left + rect.right) * 0.5;
  hole[CENTRE_Y] = (rect.top + rect.bottom) * 0.5;

  if (mismatch !== '') {
    throw new Error(
      `drag: the predicted insertion geometry disagreed with a full scan at ${mismatch}; ${rule} does not hold for this list`,
    );
  }
};

export function createRectIndex(): RectIndex {
  let capacity = 0;
  // Starts stale, and at a version no real collection can hold, so the first
  // resolution of every operation measures.
  let dirty = true;
  let measured = -1;

  // Declared before the record so the shared terminal exit below can name it:
  // the exit restores the retired state and reports the abort, and one
  // definition of "stop" is what keeps the four barriers in `refresh` from
  // drifting.
  let index: RectIndex;
  /**
   * **Not a `break`.** `destroy()` has already run `retire()` on this very
   * cache through the assembler's retire hooks, and falling through to
   * `refresh`'s trailing bookkeeping would write `count = n`,
   * `items.length = n`, `measured = version`, `dirty = false` — resurrecting a
   * retired cache, marking it clean, and pinning every row of the list in a
   * destroyed controller.
   *
   * **And the abort is reported**, because emptying the cache is not enough on
   * its own: `count === 0` makes the candidate scan find nothing, but both axes
   * measure the consumer-owned *placeholder* before that scan.
   */
  const abort = (): boolean => {
    index.retire();

    return false;
  };

  index = {
    values: new Float64Array(0),
    hole: new Float64Array(STRIDE),
    items: [],
    count: 0,

    refresh(snapshot, dragged, getBox, live, placeholder, settle): boolean {
      // A warm cache reads no geometry and calls no resolver, so it needs no
      // barrier — and it cannot be reached on a destroyed controller anyway:
      // `retire()` sets `dirty`, and teardown always runs it.
      if (!dirty && measured === snapshot.version) {
        return true;
      }

      // **The entry barrier.** A caller can reach a *dirty* cache with the
      // controller already closed: a committed move invalidates on every
      // failing path and `release.prepare` resolves straight afterwards.
      // Without this the first `getBox` of that rebuild would be a consumer
      // call after `destroy()` returned.
      if (!live()) {
        return abort();
      }

      const list = snapshot.items;

      // **One decision about one resource, driven by one number.** Growth and
      // shrink are the same question — is this buffer the right size for the
      // collection about to be scanned — so they are one branch rather than
      // two. It sits here, after the warm return and the entry barrier, because
      // `refresh` holds the real `list.length`: `retire()` would have to
      // **predict** the next operation's need from the last one's, and a policy
      // that needs no prediction needs no state that can go stale.
      //
      // **Nothing in the buffer is live at this instant.** The warm path
      // returned above, so the cache is dirty, and the scan below rewrites
      // every slot. A timer or an idle hook is refused by construction rather
      // than by preference: releasing a *correctly sized* buffer on elapsed
      // time makes a deterministic cache timing-dependent and needs a policy
      // input this library has no basis to own.
      //
      // **`capacity > 4 * n` is a consequence, not a tuning choice.**
      // `capacityFor` makes `n ≤ capacity < 2n` for any fitted buffer, so
      // `capacity > 2 * n` is already unreachable without a real collection
      // shrink; `4×` is one doubling looser, the cheapest hysteresis available,
      // and it keeps a collection wobbling around a power-of-two boundary from
      // resizing. A shrink therefore always allocates strictly less than it
      // frees, which is what separates this from a memory-for-allocations trade
      // — and exact-fit shrinking is refused for the same reason, since it
      // would recover a fitted buffer's legitimate slack and pay with a
      // reallocation on every single-item growth.
      if (list.length > capacity || capacity > 4 * list.length) {
        const fitted = capacityFor(list.length);

        // **The settle guard, and it earns its line at exactly one size.** For
        // any `n ≥ 1` a firing gate implies `fitted < capacity`, so this is
        // true by construction. At `n === 0` it is not: the gate reads
        // `capacity > 0`, which the one-slot buffer a previous empty refresh
        // just produced also satisfies — so without this an empty collection
        // reallocates 48 B on every scan instead of settling.
        if (fitted !== capacity) {
          capacity = fitted;
          index.values = new Float64Array(capacity * STRIDE);
        }
      }

      const { values, items } = index;
      let n = 0;

      for (const item of list) {
        if (item === dragged) {
          continue;
        }

        // The **box**, not the item and not the visual. The incumbent this
        // geometry is compared against is the placeholder, which is sized from
        // the box's removed footprint (`placement.ts`) — so the box is what
        // puts both sides of the comparison on one kind of rect. Measuring
        // items here, or visuals, would bias the hysteresis by the whole
        // distance between the two for any box that is not also the lifted
        // node. Under the default `box === visual` they coincide.
        let box = item;

        if (getBox) {
          box = getBox(item);

          // **The resolver barrier**, inside the branch because with no
          // resolver composed there is no call here for it to stand behind.
          if (!live()) {
            return abort();
          }
        }

        // **The geometry barrier**, covering indirect invocation, and it is
        // *outside* the branch: `box` is a consumer-owned element in every
        // composition — with no resolver composed the candidate item is its own
        // box — so an overridden `getBoundingClientRect()` is consumer code the
        // loop just ran. Everything after this line is a publication into the
        // cache, and the next iteration is another consumer call, so the
        // reading is taken before either.
        const rect = box.getBoundingClientRect();

        if (!live()) {
          return abort();
        }

        const offset = n * STRIDE;

        values[offset + LEFT] = rect.left;
        values[offset + TOP] = rect.top;
        values[offset + RIGHT] = rect.right;
        values[offset + BOTTOM] = rect.bottom;
        values[offset + CENTRE_X] = (rect.left + rect.right) * 0.5;
        values[offset + CENTRE_Y] = (rect.top + rect.bottom) * 0.5;
        items[n] = item;
        n += 1;
      }

      // **Settled, not presented, and asked once.** A row a displacement sink
      // is currently offsetting reports where the animation draws it; the
      // sink's own walk subtracts what it holds and recovers the flow position,
      // which is the only thing an axis rule may reason about. A composition
      // with no sink pays this one null test per rebuild and nothing per
      // candidate.
      if (settle) {
        settle(values, items, n);
      }

      // **The hole, measured last and inside the same barrier discipline.** The
      // placeholder is a consumer-owned element and its `getBoundingClientRect`
      // is overridable, so this is one more consumer call and takes a reading
      // after it exactly as every candidate does.
      const rect = placeholder.getBoundingClientRect();

      if (!live()) {
        return abort();
      }

      const { hole } = index;

      hole[LEFT] = rect.left;
      hole[TOP] = rect.top;
      hole[RIGHT] = rect.right;
      hole[BOTTOM] = rect.bottom;
      hole[CENTRE_X] = (rect.left + rect.right) * 0.5;
      hole[CENTRE_Y] = (rect.top + rect.bottom) * 0.5;

      index.count = n;
      // Truncated, so a shrinking collection neither pins the elements a larger
      // previous rebuild saw nor leaks one into a neighbour lookup.
      items.length = n;
      measured = snapshot.version;
      dirty = false;

      return true;
    },

    /**
     * The behavior owns the events that make geometry stale — activation,
     * scroll, resize, a committed placeholder move, collection publication,
     * release — and the feature owns the cache. One flag, because any single
     * reason forces the same full rebuild.
     */
    invalidate(): void {
      dirty = true;
    },

    /**
     * The element array is what pins DOM between operations, so it is emptied;
     * the numeric buffer is kept and reused. Also what `abort()` above calls.
     */
    retire(): void {
      index.items.length = 0;
      index.count = 0;
      dirty = true;
      measured = -1;
    },
  };

  return index;
}
