import { describe, expect, it } from 'vitest';
import { label } from '../src/dom.ts';

describe('label', () => {
  it('should hold its text', () => {
    expect(label('x').textContent).toBe('x');
  });
});
