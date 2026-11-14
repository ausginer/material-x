import type * as boxQuad from '../src/index.ts';
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

const element = document.createElement('div');
const measured: number[] = [];
const target: number[] = [];
const above: number[] = [];
const corners: number[] = [];

ancestry(element, above);
coordinates(element, measured);
coordinates(element, target, above);
projection(measured, corners);
projection(measured, corners, target);

// @ts-expect-error Projection is pure: it takes measured boxes, not elements.
projection(element, corners);

// @ts-expect-error Measurement takes an element, not a measured box.
coordinates(measured, measured);

// @ts-expect-error An ancestry is read for an element, never for a box.
ancestry(measured, above);

void element;
void measured;
void target;
void above;
void corners;

const local: number[] = [];

localDelta(above, 1, 2, local);
localDelta(measured, 1, 2, local);

// @ts-expect-error `localDelta` is pure: it takes a basis, not an element.
localDelta(element, 1, 2, local);

// A `Float64Array` is accepted as every output and every input.
const typedSpace: Space = new Float64Array(5);
const typedBox: Box = new Float64Array(8);
const typedQuad: Quad = new Float64Array(8);
const typedDelta: Delta = new Float64Array(2);

ancestry(element, typedSpace);
coordinates(element, typedBox, typedSpace);
projection(typedBox, typedQuad, typedBox);
localDelta(typedSpace, 1, 2, typedDelta);
localDelta(typedBox, 1, 2, typedDelta);

// A plain object is accepted as every output and every input.
const objectSpace: Space = {};
const objectBox: Box = {};
const objectQuad: Quad = {};
const objectDelta: Delta = {};

ancestry(element, objectSpace);
coordinates(element, objectBox, objectSpace);
projection(objectBox, objectQuad, objectBox);
localDelta(objectSpace, 1, 2, objectDelta);
localDelta(objectBox, 1, 2, objectDelta);

// A `readonly number[]` is accepted as every input.
const readonlySpace: readonly number[] = above;
const readonlyBox: readonly number[] = measured;

coordinates(element, measured, readonlySpace);
projection(readonlyBox, corners, readonlyBox);
localDelta(readonlySpace, 1, 2, local);
localDelta(readonlyBox, 1, 2, local);

// @ts-expect-error A string is not numeric output storage.
ancestry(element, 'space');

// @ts-expect-error A `DOMMatrix` is not numeric output storage.
coordinates(element, new DOMMatrix());

// @ts-expect-error An array that admits strings is not numeric output storage.
projection(measured, [] as Array<number | string>);

type Export = keyof typeof boxQuad;

// @ts-expect-error The package allocates no `Box` storage.
const noBox: Export = 'box';

// @ts-expect-error The package allocates no `Space` storage.
const noSpace: Export = 'space';

// @ts-expect-error The package allocates no `Quad` storage.
const noQuad: Export = 'quad';

// @ts-expect-error The package allocates no `Delta` storage.
const noDelta: Export = 'delta';

void noBox;
void noSpace;
void noQuad;
void noDelta;
