import {
  ancestry,
  box,
  coordinates,
  projection,
  quad,
  space,
  type Box,
  type Quad,
  type Space,
} from '../src/index.ts';

const element = document.createElement('div');
const measured: Box = box();
const target: Box = box();
const above: Space = space();
const corners: Quad = quad();

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
