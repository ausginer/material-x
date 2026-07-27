import { readBoxQuad, type BoxQuadCache } from '../src/index.js';

const cache: BoxQuadCache = new WeakMap();
const element = document.createElement('div');
const out = new Float64Array(8);

readBoxQuad(element, out, undefined, cache);

// @ts-expect-error A plain object is not a WeakMap cache.
const invalidCache: BoxQuadCache = {};

void cache;
void element;
void out;
void invalidCache;
