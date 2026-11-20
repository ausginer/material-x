import { describe, it, expect } from 'vitest';
import { t } from '../src/index.ts';
import { TokenPackageProcessor } from '../src/TokenPackageProcessor.ts';
import { createTokenSet, useStore } from './helpers.ts';

describe('t', () => {
  it('should create token processors', () => {
    useStore(createTokenSet());
    const processor = t.set('md.comp.test');
    expect(processor).toBeInstanceOf(TokenPackageProcessor);
  });
});
