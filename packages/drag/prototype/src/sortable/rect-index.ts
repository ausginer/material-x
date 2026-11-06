/**
 * The packed destination-slot geometry cache, shared by every axis feature.
 *
 * The cache is dimension-neutral. It packs both centres and both edges and has
 * no rule about which of them matters. That rule belongs to the axis feature
 * and stays in the axis feature's module. So `y()` and `xy()` are two rules
 * over one cache, not two cache implementations, and neither grows a branch
 * about the other.
 *
 * The cache is one `Float64Array` plus one parallel element array, indexed by
 * destination position: the collection minus the dragged item. A slot is
 * therefore the index the resulting `Insertion` needs, and its neighbours are
 * the adjacent elements.
 *
 * Each axis feature creates its own instance inside its factory. No other code
 * can name, reach or type that instance, so the cache has one owner.
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
 * Turns the buffer an axis has just measured into settled geometry. It
 * subtracts what the displacement sink currently holds for each element the
 * buffer names.
 *
 * `values` is the axis's packed buffer, with six fields per slot in the order
 * `left, top, right, bottom, centreX, centreY`. `items` names the element in
 * each of the first `count` slots. A sink subtracts its held `dx` from `left`,
 * `right` and `centreX`, and its held `dy` from `top`, `bottom` and `centreY`,
 * in place.
 *
 * The axis calls this once per rebuild, not once per candidate. So a
 * composition that installs no sink pays only one null test. The walk and the
 * per-element lookups belong to the sink, which knows what it holds.
 *
 * The sink computes the answer from animation timing and performs no layout
 * read. So no contribution is cancelled for a rebuild: a cache rebuilt while
 * contributions are in flight settles this way and obtains flow geometry, and a
 * row never jumps back.
 */
export type DisplacementSettle = (
  values: Float64Array,
  items: readonly HTMLElement[],
  count: number,
) => void;

/**
 * The read-only view of the packed buffer.
 *
 * Write this interface by hand and do not derive it, because of the lint rule.
 * `Readonly<E>`, `Pick<E, …>` and a record of function-typed properties are all
 * mapped types, and a mapped type erases method-ness.
 * `@typescript-eslint/unbound-method` reports a detached read through a class
 * instance type or a hand-written interface, and is silent through a mapped
 * type. A derived view would gain encapsulation and lose the rule that guards
 * detached method reads.
 *
 * `Float64Array` is assignable to this type, `view[0] = 1` is a type error, and
 * `set` and `buffer` are not members. It has no runtime cost: the value handed
 * back is the same `Float64Array` the class holds.
 */
export interface ReadonlyFloat64Array {
  readonly [index: number]: number;
  readonly length: number;
  readonly byteLength: number;
  subarray(begin?: number, end?: number): ReadonlyFloat64Array;
}

/**
 * Everything a collaborator may read from the cache.
 *
 * One field carries two types: the class declares its own, and this interface
 * re-declares the same members with the reader's type. So the owner writes
 * elements, reallocates the buffer, empties the element array and assigns the
 * count through its own declarations, with no cast and no second field. Through
 * a binding of this type, `count = 0`, `values[0] = 1` and `items.length = 0`
 * are each refused.
 *
 * Write this interface by hand for the reason {@link ReadonlyFloat64Array}
 * gives: a mapped type over the class would erase method-ness from the lint
 * rule. It has no method members, so it moves nothing outside that rule. The
 * operations stay on {@link RectIndex}, which is the type a module driving the
 * cache also holds.
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
 * Returns the rect edge a stride offset names.
 *
 * The first four packed fields are the rect's edges in the rect's own order. So
 * an offset selects an edge without this module knowing which axis the caller
 * means. `STRIDE` and `CENTRE_Y` have the same neutrality.
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
 * The cache owns every field it mutates. Every write from outside is one of
 * these operations: {@link RectIndex.refresh}, {@link RectIndex.advance},
 * {@link RectIndex.remeasureHole}, {@link RectIndex.invalidate} and {@link
 * RectIndex.retire}. Each takes the caller's rule as parameters, not access to
 * the storage.
 *
 * Each data member is one field with two types. The class declares the mutable
 * type it writes through. {@link RectIndexView} re-declares the same members
 * with the reader's type, and every collaborator binds that interface.
 * `readonly` on the field would protect the reference only: `hole[0] = 1` and
 * `items.length = 0` both compile against it. So the reader's type forbids
 * content mutation: `readonly HTMLElement[]` for the element array and {@link
 * ReadonlyFloat64Array} for the packed buffers. Both types are free at runtime.
 * No accessor stands between a read and the field, because an accessor here
 * would be a runtime construct doing a compile-time job.
 *
 * The hot path: each axis rule reads `values`, `count` and `hole` once per
 * resolution, and `items` only on a frame proposing a gap change. Every
 * remaining read in the linear rule is on the committed-move path. Do not add a
 * read inside the candidate loop. This rule applies without a measurement.
 */
export class RectIndex implements RectIndexView {
  /** The packed values. Re-allocated only when the collection outgrows it. */
  values: Float64Array = new Float64Array(0);

  /**
   * The placeholder's rect, packed in the same six fields as a slot.
   *
   * The destination view is arranged around this hole, and both axis rules
   * compare candidate centres against it. It is measured once per rebuild here,
   * not once per spatial frame in each rule, so a warm frame performs no layout
   * read at all.
   *
   * Where the hole lands after a committed move is a flow quantity, so no rule
   * predicts it. The linear rule marks it stale and calls {@link
   * RectIndex.remeasureHole} for a fresh reading on the next rebuild.
   *
   * Allocated once with the instance and never re-allocated, because it is
   * always one slot.
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
   * Re-measures only when something marked the cache dirty or the collection
   * version changed. On a frame where the pointer only travels inside the same
   * slot, this reads no geometry at all and the previous scan stays.
   *
   * `getBox` is the installed `box` slot, already defaulted to `visual` by the
   * sortable, or `null` when the config named neither. With `null`, every
   * candidate is its own box, and a resolver would be an identity call per item
   * per rebuild.
   *
   * The same scan measures `placeholder` into the hole, so the rule that reads
   * the hole never measures it.
   *
   * `settle` is the installed displacement sink's walk, or `null` when no
   * displacement feature is composed. It is called once, on the finished slots.
   * It makes this scan yield settled geometry while contributions are still
   * running: the cache holds where flow puts a row, never where an animation
   * currently draws it. The placeholder is never passed to `settle`: a report
   * visits the destination view, which does not contain the placeholder.
   */
  refresh(
    snapshot: CollectionSnapshot,
    dragged: HTMLElement,
    getBox: ((item: HTMLElement) => HTMLElement) | null,
    placeholder: HTMLElement,
    settle: DisplacementSettle | null,
  ): void {
    if (!this.#dirty && this.#measured === snapshot.version) {
      return;
    }

    const list = snapshot.items;

    // Growth and shrink are one decision about one resource: is this buffer the
    // right size for the collection about to be scanned? So they share one
    // branch. The branch sits after the warm return because `refresh` holds the
    // real `list.length`. `retire()` would have to predict the next operation's
    // need from the last one's, and a policy that needs no prediction needs no
    // state that can go stale.
    //
    // Nothing in the buffer is live at this point. The warm path returned
    // above, so the cache is dirty, and the scan below rewrites every slot. Do
    // not add a timer or an idle hook: releasing a correctly sized buffer on
    // elapsed time makes a deterministic cache timing-dependent, and it needs a
    // policy input this library has no basis to own.
    //
    // `#capacity > 4 * n` follows from the sizing and is not a tuning choice.
    // `capacityFor` makes `n ≤ #capacity < 2n` for any fitted buffer, so
    // `#capacity > 2 * n` is already unreachable without a real collection
    // shrink. `4×` is one doubling looser. It is the cheapest hysteresis
    // available, and it keeps a collection that moves around a power-of-two
    // boundary from resizing. A shrink therefore always allocates strictly less
    // than it frees, so it is not a trade of memory for allocations. Do not
    // shrink to an exact fit, for the same reason: that would recover a fitted
    // buffer's legitimate slack and pay with a reallocation on every
    // single-item growth.
    if (list.length > this.#capacity || this.#capacity > 4 * list.length) {
      const fitted = capacityFor(list.length);

      // This guard matters at exactly one size. For any `n ≥ 1` a firing gate
      // implies `fitted < #capacity`, so this test is always true. At `n === 0`
      // it is not: the gate reads `#capacity > 0`, and the one-slot buffer a
      // previous empty refresh just produced also satisfies that. Without this
      // guard an empty collection reallocates 48 B on every scan instead of
      // settling.
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

      // Measure the box, not the item and not the visual. This geometry is
      // compared against the placeholder, which is sized from the box's removed
      // footprint (`placement.ts`), so the box puts both sides of the
      // comparison on one kind of rect. Measuring items or visuals would bias
      // the hysteresis by the whole distance between the two, for any box that
      // is not also the lifted node. Under the default `box === visual` they
      // coincide.
      let box = item;

      if (getBox) {
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

    // The slots must hold settled geometry, not presented geometry, and the
    // sink is asked once. A row a displacement sink is currently offsetting
    // reports where the animation draws it. The sink's walk subtracts what it
    // holds and recovers the flow position, which is the only position an axis
    // rule may reason about. A composition with no sink pays this one null test
    // per rebuild and nothing per candidate.
    //
    // Lending the buffer here does not break the boundary. The class hands the
    // sink a real `Float64Array` inside its own operation, for the duration of
    // that call. The boundary forbids a different thing: a collaborator holding
    // a handle it can write through at any time.
    if (settle) {
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
  }

  /**
   * Advances a span of slots by an established constant. It moves the three
   * fields the caller names and leaves the other three unchanged.
   *
   * The caller passes stride offsets and a scalar, never access to the buffer.
   * So an axis rule can keep G3-linear while the cache stays dimension-neutral:
   * the cache interprets none of the three offsets. The axis owns the rule
   * about when to advance, over what span, by what delta, and whether a delta
   * may be predicted at all.
   *
   * The centre is recomputed from the shifted edges and is not shifted itself.
   * So the arithmetic is the one a full scan performs, and the equivalence
   * check compares like with like.
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
   * Re-reads the placeholder into the hole, for an axis that marked the hole
   * stale after a committed move.
   *
   * The measurement is in the cache because the owner does the measuring. Every
   * consumer call this cache makes then stays in one file under one discipline,
   * and the axis tests assert this arrangement.
   *
   * This writes only the three fields the caller names. A hole relocation moves
   * the placeholder along one axis and leaves both cross-axis coordinates
   * unchanged. The slot advance rests on the same G2 clause.
   *
   * This method cannot fail. It writes three internal fields, admits nothing
   * and publishes nothing.
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
   * The behavior owns the events that make geometry stale: activation, scroll,
   * resize, a committed placeholder move, collection publication, release. The
   * feature owns the cache. There is one flag because any single reason forces
   * the same full rebuild.
   */
  invalidate(): void {
    this.#dirty = true;
  }

  /**
   * Empties the element array, because that array pins DOM between operations,
   * and keeps the numeric buffer for reuse. A stopped rebuild needs the
   * staleness pair reset. The emptying is here too because this method is the
   * class's one definition of stop.
   */
  retire(): void {
    this.items.length = 0;
    this.count = 0;
    this.#dirty = true;
    this.#measured = -1;
  }
}

/** The development-build flag. Branches guarded by it fold away. */
export const DEV: boolean = __DEV__;

/**
 * The equivalence check, which makes the prediction admissible and not merely
 * plausible.
 *
 * The buffer the previous advance wrote must equal what a full scan of the tree
 * now produces. That is G3's form for this axis. The check runs at the head of
 * the next rebuild, not inside the move that made the prediction. At the
 * instant of the move, the sink has just received vectors and the animations it
 * started have no resolved timing yet, so a scan there compares a settled cache
 * against a tree in an indeterminate state. One frame later both can be
 * compared.
 *
 * The check runs on every suite run and behind no runtime switch. `DEV` is
 * `true` in this repository's vite and vitest configs and folds to `false` in
 * the published bundle. So every test that drives a real drag through `y()`
 * checks it, and no consumer pays for it. The one exception is the test project
 * that measures what ships, which defines `DEV` as `false` for the files it
 * routes.
 *
 * The check copies the contents and then forces the rebuild, and does not scan
 * by hand. It copies the predicted contents out through the read view,
 * invalidates and refreshes the cache, and compares the copy against the
 * result. Two things follow:
 *
 * - Nothing is left to repair. The cache ends authoritative because the rebuild
 *   wrote it. So a mismatch leaves the cache correct and the drag classified,
 *   not correct in the message and wrong in the buffer.
 * - The scan has no second definition. Box resolution, the six-field pack and
 *   the settle call are not transcribed into the one function whose job is to
 *   distrust a transcription.
 *
 * The check costs one scan, because the forced rebuild is the scan. The
 * caller's own `refresh` immediately afterwards finds the cache warm.
 *
 * This must stay a free function. A `DEV`-only prototype body ships, while this
 * export tree-shakes, and `bench/size` asserts what the module contains.
 *
 * The check runs in every composition, including one that animates. A displaced
 * row carries an additive `translate`, and `getBoundingClientRect()` reports
 * where the row is. The sink's settle walk turns that back into flow geometry,
 * which is what the cache holds. So no composition has to be excluded from the
 * check, and the check has no settled window to wait for.
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
  // This check distrusts the cache, so it reads the cache through the
  // collaborator's type and not the owner's. Nothing here may repair what it is
  // checking. The rebuild below makes the cache authoritative again.
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

  index.invalidate();
  index.refresh(snapshot, dragged, getBox, placeholder, settle);

  /**
   * One slack value, sized to the precision at which geometry is reported. A
   * correct prediction and the rebuild disagree only by how inexact their
   * readings are. The largest source is the engine's own grid: Gecko reports a
   * rect in app units, 1/60 px, including a row with a mid-animation
   * `translate`. A settled reading is that rounded presented position minus an
   * exact analytic offset, so it is off by up to half an app unit, `ε = 1/120`
   * px.
   *
   * A predicted slot is a cached reading plus the constant, and the constant is
   * the difference of two readings of one row. So the prediction carries up to
   * `3ε`, and the rebuild's own reading carries `ε` more. The bound is
   * `4ε = 1/30` px. Below it are error terms of order `1e-5` px: settling
   * subtracts a held vector, and a row with an authored `rotate` has its rect
   * recomputed through a transform matrix. The slack is the next power of two
   * above the sum.
   *
   * The slack stays far below the smallest disagreement a broken rule produces,
   * because a wrong rule is wrong by a row: a crossed item moved off the axis
   * travels a row's extent, or nothing, where the rule predicted the other.
   * Authored presentation and displacement are supported in every composition,
   * so the tolerance does not depend on the sink.
   */
  const slack = 1 / 16;
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
