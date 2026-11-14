import { afterEach, describe, expect, it } from 'vitest';
import * as boxQuad from '../src/index.ts';
import {
  ancestry,
  coordinates,
  localDelta,
  projection,
  type Box,
  type Delta,
  type Quad,
  type Space,
} from '../src/index.ts';
import { createBox, resetDocument } from './support/fixtures.ts';

type Storage = Record<number, number>;
type Allocate = (capacity: number) => Storage;

const SPACE_CAPACITY = 5;
const BOX_CAPACITY = 8;
const QUAD_CAPACITY = 8;
const DELTA_CAPACITY = 2;
const DX = 3.25;
const DY = -7.5;
const EXTRA_SLOT = -7;

afterEach(resetDocument);

/** One result of a function, with the storage it wrote. */
type Reading = readonly [label: string, result: boolean, out: Storage];

/**
 * Reads every function into storage of one kind. Each function's inputs are the
 * outputs of earlier calls, in the same kind.
 */
function readAll(
  allocate: Allocate,
  element: HTMLElement,
  target: HTMLElement,
): readonly Reading[] {
  const above: Space = allocate(SPACE_CAPACITY);
  const measured: Box = allocate(BOX_CAPACITY);
  const withAbove: Box = allocate(BOX_CAPACITY);
  const relativeTo: Box = allocate(BOX_CAPACITY);
  const viewport: Quad = allocate(QUAD_CAPACITY);
  const relative: Quad = allocate(QUAD_CAPACITY);
  const throughBox: Delta = allocate(DELTA_CAPACITY);
  const throughSpace: Delta = allocate(DELTA_CAPACITY);

  return [
    ['ancestry', ancestry(element, above), above],
    ['coordinates', coordinates(element, measured), measured],
    [
      'coordinates with ancestry',
      coordinates(element, withAbove, above),
      withAbove,
    ],
    ['coordinates of the target', coordinates(target, relativeTo), relativeTo],
    ['projection', projection(measured, viewport), viewport],
    [
      'projection relative to the target',
      projection(measured, relative, relativeTo),
      relative,
    ],
    [
      'localDelta through the box',
      localDelta(measured, DX, DY, throughBox),
      throughBox,
    ],
    [
      'localDelta through the space',
      localDelta(above, DX, DY, throughSpace),
      throughSpace,
    ],
  ];
}

/** Keys, values and `length`, for an exact before-and-after comparison. */
function snapshot(storage: Storage): readonly unknown[] {
  return [
    (storage as { length?: number }).length,
    ...Object.entries(storage).flat(),
  ];
}

const SCENARIOS: ReadonlyArray<
  readonly [name: string, create: () => HTMLElement]
> = [
  [
    'a transformed ancestor, where the size is inverted from the rect',
    () =>
      createBox({
        parent: createBox({
          styles: {
            left: '40px',
            top: '30px',
            width: '120px',
            height: '90px',
            transform: 'rotate(30deg) scale(1.5)',
          },
        }),
        styles: {
          left: '5px',
          top: '3px',
          width: '33.3px',
          height: '17px',
          transform: 'skewX(10deg)',
        },
      }),
  ],
  [
    'a near-singular matrix, where the size falls back to computed style',
    () =>
      createBox({
        styles: {
          left: '9px',
          top: '9px',
          width: '30px',
          height: '12px',
          padding: '1px 2px',
          border: '1.5px solid',
          boxSizing: 'content-box',
          transform: 'rotate(45deg) scale(1, 0.01)',
        },
      }),
  ],
  [
    'an ancestor zoom with an individual rotate and scale',
    () =>
      createBox({
        parent: createBox({
          styles: {
            left: '60px',
            top: '10px',
            width: '80px',
            height: '80px',
            zoom: '1.5',
          },
        }),
        styles: {
          left: '2px',
          top: '4px',
          width: '10px',
          height: '6px',
          rotate: '15deg',
          scale: '1.25 0.75',
        },
      }),
  ],
];

function createTarget(): HTMLElement {
  return createBox({
    styles: {
      left: '17px',
      top: '23px',
      width: '50px',
      height: '40px',
      transform: 'rotate(-20deg) scale(2)',
    },
  });
}

describe('module exports', () => {
  it('should export exactly the four functions at run time', () => {
    expect(Object.keys(boxQuad)).toEqual([
      'ancestry',
      'coordinates',
      'localDelta',
      'projection',
    ]);
  });
});

describe('storage kinds', () => {
  it.each(SCENARIOS)(
    'should write the same slots into number[], Float64Array and a plain object for %s',
    (_name, create) => {
      const element = create();
      const target = createTarget();
      const array = readAll(() => [], element, target);
      const typed = readAll(
        (capacity) => new Float64Array(capacity),
        element,
        target,
      );
      const object = readAll(() => ({}), element, target);

      for (const [index, [label, result, out]] of array.entries()) {
        expect(result, label).toBe(true);

        const { length } = out as number[];

        for (const [kind, readings] of [
          ['Float64Array', typed],
          ['plain object', object],
        ] as const) {
          const [, otherResult, other] = readings[index]!;

          expect(otherResult, `${label} into ${kind}`).toBe(true);

          for (let slot = 0; slot < length; slot += 1) {
            expect(
              Object.is(other[slot], out[slot]),
              `${label} into ${kind}, slot ${slot}`,
            ).toBe(true);
          }
        }
      }
    },
  );
});

/** A function call that succeeds and one that returns `false`. */
type Operation = Readonly<{
  capacity: number;
  succeed: (out: Storage) => boolean;
  fail: (out: Storage) => boolean;
}>;

const OPERATIONS: ReadonlyArray<
  readonly [name: string, operation: () => Operation]
> = [
  [
    'ancestry',
    () => ({
      capacity: SPACE_CAPACITY,
      succeed: (out) => ancestry(createTarget(), out),
      fail: (out) =>
        ancestry(
          createBox({
            parent: createBox({ styles: { transform: 'rotateX(30deg)' } }),
          }),
          out,
        ),
    }),
  ],
  [
    'coordinates',
    () => ({
      capacity: BOX_CAPACITY,
      succeed: (out) => coordinates(createTarget(), out),
      fail: (out) => coordinates(document.createElement('div'), out),
    }),
  ],
  [
    'projection',
    () => ({
      capacity: QUAD_CAPACITY,
      succeed: (out) => projection([2, 0, 0, 2, 5, 7, 20, 10], out),
      fail: (out) =>
        projection([1, 0, 0, 1, 0, 0, 5, 5], out, [0, 0, 0, 0, 0, 0, 1, 1]),
    }),
  ],
  [
    'localDelta',
    () => ({
      capacity: DELTA_CAPACITY,
      succeed: (out) => localDelta([2, 0, 0, 2, 1], DX, DY, out),
      fail: (out) => localDelta([1, 2, 2, 4, 1], DX, DY, out),
    }),
  ],
];

/** Storage that already holds values before a call that returns `false`. */
const FILLED_KINDS: ReadonlyArray<readonly [kind: string, allocate: Allocate]> =
  [
    ['an empty number[]', () => []],
    [
      'a filled number[]',
      (capacity) =>
        Array.from({ length: capacity }, (_value, index) => index + 11),
    ],
    [
      'a filled Float64Array',
      (capacity) =>
        Float64Array.from({ length: capacity }, (_value, index) => index + 11),
    ],
    ['an empty plain object', () => ({})],
    [
      'a filled plain object',
      (capacity) =>
        Object.fromEntries(
          Array.from({ length: capacity }, (_value, index) => [
            index,
            index + 11,
          ]),
        ),
    ],
  ];

describe.each(OPERATIONS)('%s storage', (_name, create) => {
  it.each(FILLED_KINDS)(
    'should leave %s untouched when it returns false',
    (_kind, allocate) => {
      const { capacity, fail } = create();
      const out = allocate(capacity);
      const before = snapshot(out);

      expect(fail(out)).toBe(false);
      expect(snapshot(out)).toEqual(before);
    },
  );

  it('should fill an empty array to exactly the layout length with no holes', () => {
    const { capacity, succeed } = create();
    const out: number[] = [];

    expect(succeed(out)).toBe(true);
    expect(out).toHaveLength(capacity);
    expect(Object.keys(out)).toHaveLength(capacity);
  });

  it('should keep the extra slots of a longer Float64Array', () => {
    const { capacity, succeed } = create();
    const out = new Float64Array(capacity + 4).fill(EXTRA_SLOT);

    expect(succeed(out)).toBe(true);
    expect(Array.from(out.subarray(capacity))).toEqual([
      EXTRA_SLOT,
      EXTRA_SLOT,
      EXTRA_SLOT,
      EXTRA_SLOT,
    ]);
  });
});
