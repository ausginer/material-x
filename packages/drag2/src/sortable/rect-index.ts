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
 * **What a caller may do to the packed buffer: read it.**
 *
 * Declared by hand rather than derived, and the reason is the lint gate the
 * class migration runs behind: `Readonly<E>`, `Pick<E, …>` and a record of
 * function-typed properties are all **mapped types**, and a mapped type erases
 * method-ness — `@typescript-eslint/unbound-method` reports a detached read
 * through a class instance type or a hand-written interface and is silent
 * through any of those. A view built the obvious way would buy encapsulation
 * with the instrument that guards the migration.
 *
 * `Float64Array` is assignable to this, `view[0] = 1` is a type error, and
 * `set` and `buffer` are not members. It costs **nothing at runtime**: the
 * value handed back is the same `Float64Array` the class holds.
 */
export interface ReadonlyFloat64Array {
  readonly [index: number]: number;
  readonly length: number;
  readonly byteLength: number;
  subarray(begin?: number, end?: number): ReadonlyFloat64Array;
}

/**
 * **What a collaborator may read off the cache**, and the whole of it.
 *
 * One field carries two types: the class declares its own, and this
 * re-declares the same four members with the reader's. So the owner writes
 * elements, reallocates the buffer, empties the element array and assigns the
 * count through its own declarations with no cast and no second field, while
 * through a binding declared here `count = 0`, `values[0] = 1` and
 * `items.length = 0` are each refused.
 *
 * Declared rather than derived, for the reason
 * {@link ReadonlyFloat64Array} gives: a mapped type over the class would erase
 * method-ness from the lint gate this migration runs behind. It carries **no
 * method members**, so it moves nothing out of that gate's reach — the
 * operations stay on {@link RectIndex} itself, which is the type a module
 * driving the cache also holds.
 */
export interface RectIndexView {
  readonly values: ReadonlyFloat64Array;
  readonly hole: ReadonlyFloat64Array;
  readonly items: readonly HTMLElement[];
  readonly count: number;
}

const capacityFor = (needed: number): number => {
  let capacity = 1;

  while (capacity < needed) {
    capacity *= 2;
  }

  return capacity;
};

/**
 * The rect edge a stride offset names.
 *
 * The first four packed fields are the rect's own edges in the rect's own
 * order, so an offset selects one without this module learning which axis the
 * caller meant by it — the same neutrality `STRIDE` and `CENTRE_Y` already
 * have.
 */
const edge = (rect: DOMRect, offset: number): number => {
  if (offset === LEFT) {
    return rect.left;
  }

  if (offset === TOP) {
    return rect.top;
  }

  return offset === RIGHT ? rect.right : rect.bottom;
};

/**
 * **The cache owns every field it mutates**, and every write from outside is an
 * operation declared here — {@link RectIndex.refresh},
 * {@link RectIndex.advance}, {@link RectIndex.remeasureHole},
 * {@link RectIndex.invalidate} and {@link RectIndex.retire} — each
 * parameterized by the caller's rule rather than by its access.
 *
 * **The four data members are one field carrying two types.** The class
 * declares the mutable one it needs to write through; {@link RectIndexView}
 * re-declares the same four with the reader's, and that interface is the type
 * every collaborator binds. `readonly` on the field would protect the
 * reference only — `hole[0] = 1` and `items.length = 0` both compile against
 * one — so it is the reader's **type** that forbids content mutation:
 * `readonly HTMLElement[]` for the element array and
 * {@link ReadonlyFloat64Array} for the packed buffers. Both are free at
 * runtime, and no accessor stands between a read and the field, because an
 * accessor here would be a runtime construct doing a compile-time job.
 *
 * **The hot path is counted rather than forecast.** `xy()` reads three members
 * once per resolution and a fourth only on a frame proposing a gap change;
 * `y()` reads two once per resolution, and every remaining read in the linear
 * rule is on the committed-move path. **No read is added inside the candidate
 * loop** — which is refused outright rather than measured.
 */
export class RectIndex implements RectIndexView {
  /** The packed values. Re-allocated only when the collection outgrows it. */
  values: Float64Array = new Float64Array(0);

  /**
   * **The placeholder's own rect, packed in the same six fields as a slot.**
   *
   * It is the hole the destination view is arranged around, and both axis rules
   * compare candidate centres against it. Measured **once per rebuild** here
   * rather than once per spatial frame in each rule, so a warm frame performs
   * no layout read at all.
   *
   * **Where it lands after a committed move is a flow quantity**, so no rule
   * predicts it: the linear rule marks it stale and asks
   * {@link RectIndex.remeasureHole} for a fresh reading on the next rebuild.
   *
   * Allocated once with the instance and never re-allocated: it is one slot,
   * and one slot does not grow.
   */
  readonly hole: Float64Array = new Float64Array(STRIDE);

  /** Destination-ordered elements, parallel to the packed slots. */
  readonly items: HTMLElement[] = [];

  /** How many destination slots the last scan produced. */
  count = 0;

  /** Slots the packed buffer can hold, always a power of two once fitted. */
  #capacity = 0;

  /**
   * Starts stale, and at a version no real collection can hold, so the first
   * resolution of every operation measures.
   */
  #dirty = true;

  #measured = -1;

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
   * `live` reports whether the controller is still alive, and it is read
   * **immediately before each declared-slot invocation and nowhere else**: the
   * per-candidate `getBox`, and `settle` once after the scan. That is the whole
   * obligation — a slot the consumer may fill must not be invoked after the
   * controller closed, and a reading taken *after* a call cannot see a close
   * the call itself raised. So the count is exactly the number of slot
   * invocations a composition actually makes: `N + 1` with a resolver and a
   * sink, `N` with a resolver alone, one with a sink alone, and **none** with
   * neither. `getBoundingClientRect` on a consumer-owned node is a platform
   * member rather than a slot, and what follows a candidate's own geometry read
   * is either internal or the next guarded invocation.
   *
   * `placeholder` is measured into the hole by the same scan, so the rule that
   * reads it never measures it.
   *
   * `settle` is the installed displacement sink's own walk, or `null` when no
   * displacement feature is composed. Called **once**, on the finished slots,
   * it is what makes this scan yield **settled** geometry while contributions
   * are still running — the cache holds where flow puts a row, never where an
   * animation currently draws it. The placeholder is never passed to it: a
   * report visits the destination view, which does not contain it.
   *
   * Returns `false` — and **only** then — when the rebuild stopped at one of
   * those readings.
   */
  refresh(
    snapshot: CollectionSnapshot,
    dragged: HTMLElement,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
    live: () => boolean,
    placeholder: HTMLElement,
    settle: DisplacementSettle | null,
  ): boolean {
    // **A warm cache is safe because a closed rebuild never leaves one.**
    // Teardown is deferred to the outermost transaction boundary, so a
    // `refresh` at the same version is reachable inside that window with the
    // controller already closed — and it reads no geometry and invokes no
    // slot, so it owes nothing. What it must not be able to serve is a
    // half-written buffer marked clean, and it cannot: the stop below restores
    // the staleness pair before returning.
    if (!this.#dirty && this.#measured === snapshot.version) {
      return true;
    }

    const list = snapshot.items;

    // **One decision about one resource, driven by one number.** Growth and
    // shrink are the same question — is this buffer the right size for the
    // collection about to be scanned — so they are one branch rather than
    // two. It sits here, after the warm return, because `refresh` holds the
    // real `list.length`: `retire()` would have to **predict** the next
    // operation's need from the last one's, and a policy that needs no
    // prediction needs no state that can go stale.
    //
    // **Nothing in the buffer is live at this instant.** The warm path
    // returned above, so the cache is dirty, and the scan below rewrites
    // every slot. A timer or an idle hook is refused by construction rather
    // than by preference: releasing a *correctly sized* buffer on elapsed
    // time makes a deterministic cache timing-dependent and needs a policy
    // input this library has no basis to own.
    //
    // **`#capacity > 4 * n` is a consequence, not a tuning choice.**
    // `capacityFor` makes `n ≤ #capacity < 2n` for any fitted buffer, so
    // `#capacity > 2 * n` is already unreachable without a real collection
    // shrink; `4×` is one doubling looser, the cheapest hysteresis available,
    // and it keeps a collection wobbling around a power-of-two boundary from
    // resizing. A shrink therefore always allocates strictly less than it
    // frees, which is what separates this from a memory-for-allocations trade
    // — and exact-fit shrinking is refused for the same reason, since it
    // would recover a fitted buffer's legitimate slack and pay with a
    // reallocation on every single-item growth.
    if (list.length > this.#capacity || this.#capacity > 4 * list.length) {
      const fitted = capacityFor(list.length);

      // **The settle guard, and it earns its line at exactly one size.** For
      // any `n ≥ 1` a firing gate implies `fitted < #capacity`, so this is
      // true by construction. At `n === 0` it is not: the gate reads
      // `#capacity > 0`, which the one-slot buffer a previous empty refresh
      // just produced also satisfies — so without this an empty collection
      // reallocates 48 B on every scan instead of settling.
      if (fitted !== this.#capacity) {
        this.#capacity = fitted;
        this.values = new Float64Array(fitted * STRIDE);
      }
    }

    const { values } = this;
    const { items } = this;
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
        // **The per-candidate barrier, immediately before the declared slot it
        // protects.** It covers the first invocation of the rebuild as well as
        // every later one — a committed move invalidates and `release.prepare`
        // resolves inside the same seam, so a dirty cache is reachable with the
        // controller already closed — and it covers a close raised from the
        // previous candidate's overridden `getBoundingClientRect`, which no
        // reading placed after a call can see.
        if (!live()) {
          // **The stop, not a `break`.** The consequence of a call is the call,
          // so the exit is what prevents the next `getBox`; and falling through
          // to the trailing bookkeeping would mark a partially written buffer
          // clean at this version, which every warm return afterwards would
          // then serve. `retire()` is this class's one definition of *stop*
          // and restores the staleness pair, so it is what runs here.
          this.retire();

          return false;
        }

        box = getBox(item);
      }

      const rect = box.getBoundingClientRect();
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
    //
    // **The buffer is lent, and that is not a hole in the boundary**: the
    // class hands the sink a real `Float64Array` inside its own operation and
    // for that call's duration, which is what an owned operation means. A
    // collaborator holding a handle it may write through whenever it likes is
    // the different thing this boundary forbids.
    if (settle) {
      // **The second barrier, immediately before the second declared slot.**
      // `settle` is one — a published installer fills it, and this class
      // cannot read which value a composition passed — so it must not be
      // invoked after the controller closed. The scan above ends with a
      // candidate's own `getBoundingClientRect`, which is overridable on a
      // consumer-owned row, so no earlier reading covers this call. A
      // composition with no sink invokes no slot here and owes nothing.
      if (!live()) {
        this.retire();

        return false;
      }

      settle(values, items, n);
    }

    const rect = placeholder.getBoundingClientRect();
    const { hole } = this;

    hole[LEFT] = rect.left;
    hole[TOP] = rect.top;
    hole[RIGHT] = rect.right;
    hole[BOTTOM] = rect.bottom;
    hole[CENTRE_X] = (rect.left + rect.right) * 0.5;
    hole[CENTRE_Y] = (rect.top + rect.bottom) * 0.5;

    this.count = n;
    // Truncated, so a shrinking collection neither pins the elements a larger
    // previous rebuild saw nor leaks one into a neighbour lookup.
    items.length = n;
    this.#measured = snapshot.version;
    this.#dirty = false;

    return true;
  }

  /**
   * **Advance a span of slots by an established constant**, moving the three
   * fields the caller names and leaving the other three where they are.
   *
   * The caller passes **stride offsets and a scalar**, never access: this is
   * what lets an axis rule keep G3-linear while the cache stays
   * dimension-neutral, because it interprets none of the three offsets. The
   * rule about when to advance, over what span, by what delta, and whether a
   * delta may be predicted at all belongs to the axis.
   *
   * The centre is recomputed from the shifted edges rather than shifted
   * itself, so the arithmetic is the one a full scan performs and the
   * instrument compares like with like.
   */
  advance(
    lo: number,
    hi: number,
    delta: number,
    start: number,
    end: number,
    centre: number,
  ): void {
    const { values } = this;

    for (let i = lo; i < hi; i += 1) {
      const offset = i * STRIDE;
      const shiftedA = values[offset + start]! + delta;
      const shiftedB = values[offset + end]! + delta;

      values[offset + start] = shiftedA;
      values[offset + end] = shiftedB;
      values[offset + centre] = (shiftedA + shiftedB) * 0.5;
    }
  }

  /**
   * **Re-read the placeholder into the hole**, for an axis that marked it
   * stale after a committed move.
   *
   * The measurement moves in with the write because measuring is the owner's
   * act: every consumer call this cache makes then sits in one file under one
   * discipline, which is what the axis tests already say the arrangement is.
   *
   * Only the three fields the caller names are written — a hole relocation
   * moves the placeholder along one axis and leaves both cross-axis
   * coordinates where they were, which is the same G2 clause the slot advance
   * rests on.
   *
   * **It takes no liveness capability and cannot fail.** `getBoundingClientRect`
   * on a consumer-owned node is a platform member rather than a declared slot;
   * this writes three internal fields, admits nothing and publishes nothing. A
   * close raised from inside that read is caught where it matters, by the
   * reading before the next `getBox`.
   */
  remeasureHole(
    placeholder: HTMLElement,
    start: number,
    end: number,
    centre: number,
  ): void {
    const rect = placeholder.getBoundingClientRect();
    const { hole } = this;
    const a = edge(rect, start);
    const b = edge(rect, end);

    hole[start] = a;
    hole[end] = b;
    hole[centre] = (a + b) * 0.5;
  }

  /**
   * The behavior owns the events that make geometry stale — activation,
   * scroll, resize, a committed placeholder move, collection publication,
   * release — and the feature owns the cache. One flag, because any single
   * reason forces the same full rebuild.
   */
  invalidate(): void {
    this.#dirty = true;
  }

  /**
   * The element array is what pins DOM between operations, so it is emptied;
   * the numeric buffer is kept and reused. **The staleness pair is the part a
   * stopped rebuild needs**, and emptying travels with it because this is the
   * class's one definition of *stop*.
   */
  retire(): void {
    this.items.length = 0;
    this.count = 0;
    this.#dirty = true;
    this.#measured = -1;
  }
}

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
 * **It snapshots and then forces the rebuild, rather than scanning by hand.**
 * The predicted contents are copied out through the read view, the cache is
 * invalidated and refreshed, and the copy is compared against the result. Two
 * things follow. There is **nothing left to heal** — the cache ends
 * authoritative by construction, so a mismatch leaves it correct and the drag
 * classified rather than correct in the message and wrong in the buffer. And
 * **a second definition of the scan disappears**: box resolution, the six-field
 * pack and the settle call were transcribed here by hand, inside the one
 * function whose whole job is to distrust a transcription.
 *
 * It costs one scan rather than two, because the forced rebuild replaces the
 * hand-rolled one instead of joining it, and the caller's own `refresh`
 * immediately afterwards finds the cache warm.
 *
 * **It is a free function and must stay one.** A `DEV`-only prototype body
 * ships; this export tree-shakes, and `bench/size` asserts what the module
 * contains.
 *
 * **It takes no terminal barrier, and that is what scopes it.** Every call it
 * makes is a consumer call on a consumer-owned element, so in a shipped build
 * it would need the same threading the candidate loop has. It is not in a
 * shipped build: `DEV` folds to `false` and the whole function is dropped. The
 * scoping survives the inversion because the rebuild is driven with a
 * constant-true `live`, so a fixture that destroys its controller from inside
 * `getBoundingClientRect` is still measuring the instrument rather than the
 * library.
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

  // **The instrument distrusts the cache**, so it reads it under the
  // collaborator's type rather than the owner's: nothing here may repair what
  // it is checking, and the rebuild below is what makes the cache
  // authoritative again.
  const view: RectIndexView = index;
  const held = view.count;
  const predicted = new Float64Array(held * STRIDE);
  const predictedHole = new Float64Array(STRIDE);
  const predictedItems = [...view.items];
  const claimed = view.values;
  const claimedHole = view.hole;

  for (let i = 0; i < predicted.length; i += 1) {
    predicted[i] = claimed[i]!;
  }

  for (let field = 0; field < STRIDE; field += 1) {
    predictedHole[field] = claimedHole[field]!;
  }

  // The authoritative rebuild. `live` is constant-true rather than threaded:
  // the instrument is scoped out of shipped builds entirely, so a fixture that
  // closes its controller from inside a geometry read must not be able to stop
  // the scan it is being measured by.
  index.invalidate();
  index.refresh(snapshot, dragged, getBox, () => true, placeholder, settle);

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
  const scanned = view.count;
  const { values, hole, items } = view;
  const span = scanned < held ? scanned : held;
  let mismatch = '';

  for (let i = 0; mismatch === '' && i < span; i += 1) {
    const offset = i * STRIDE;

    if (predictedItems[i] !== items[i]) {
      mismatch = `slot ${i}`;
      break;
    }

    for (let field = 0; field < STRIDE; field += 1) {
      if (differs(predicted[offset + field]!, values[offset + field]!)) {
        mismatch = `slot ${i}`;
        break;
      }
    }
  }

  if (mismatch === '' && scanned !== held) {
    mismatch = `count ${held}, full scan ${scanned}`;
  }

  if (
    mismatch === '' &&
    (differs(predictedHole[LEFT]!, hole[LEFT]!) ||
      differs(predictedHole[TOP]!, hole[TOP]!) ||
      differs(predictedHole[RIGHT]!, hole[RIGHT]!) ||
      differs(predictedHole[BOTTOM]!, hole[BOTTOM]!))
  ) {
    mismatch = 'the placeholder';
  }

  if (mismatch !== '') {
    throw new Error(
      `drag: the predicted insertion geometry disagreed with a full scan at ${mismatch}; ${rule} does not hold for this list`,
    );
  }
};
