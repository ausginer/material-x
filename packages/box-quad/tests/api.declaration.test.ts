import {
  box,
  cache,
  coordinates,
  projection,
  quad,
  type Box,
  type BoxCache,
  type Quad,
} from '../src/index.ts';

const recache: BoxCache = cache();
const element = document.createElement('div');
const measured: Box = box();
const target: Box = box();
const corners: Quad = quad();

coordinates(element, measured, recache);
coordinates(element, target, recache);
projection(measured, corners);
projection(measured, corners, target);
recache();

// @ts-expect-error The cache is opaque: how a measurement is stored is not public.
void recache.entries;

// @ts-expect-error A plain object is not a cache.
const invalidCache: BoxCache = {};

// @ts-expect-error Projection is pure: it takes measured boxes, not elements.
projection(element, corners);

// @ts-expect-error Measurement takes an element, not a measured box.
coordinates(measured, measured);

void recache;
void element;
void measured;
void target;
void corners;
void invalidCache;
