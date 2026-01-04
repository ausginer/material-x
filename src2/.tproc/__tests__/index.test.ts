import { describe, it, expect } from 'vitest';
import { t } from '../index.ts';
import { TokenPackageProcessor } from '../TokenPackageProcessor.ts';

describe('t', () => {
  it('should create token processors', () => {
    const processor = t.set('md.comp.test');
    expect(processor).toBeInstanceOf(TokenPackageProcessor);
  });
});
