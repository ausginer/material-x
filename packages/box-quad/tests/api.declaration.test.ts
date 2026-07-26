import { createCache, type BoxQuadCache } from '../src/index.js';

const cache: BoxQuadCache = createCache();

// @ts-expect-error Cache internals are factory-owned and opaque.
const invalidCache: BoxQuadCache = {};

void cache;
void invalidCache;
