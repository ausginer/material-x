import { describe, it, expect } from 'vitest';
import { t } from '../src/index.ts';
import { TokenPackageProcessor } from '../src/TokenPackageProcessor.ts';
import { createTokenSet, resetMockDB } from './helpers.ts';

describe('t', () => {
  it('should create token processors', () => {
    resetMockDB({ tokenSets: [createTokenSet()] });
    const processor = t.set('md.comp.test');
    expect(processor).toBeInstanceOf(TokenPackageProcessor);
  });
});
