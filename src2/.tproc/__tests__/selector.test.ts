import { describe, it, expect } from 'vitest';
import {
  attribute,
  pseudoClass,
  pseudoElement,
  selector,
} from '../selector.ts';

describe('selector helpers', () => {
  it('should build attributes with and without values', () => {
    expect(attribute('disabled')).toBe('[disabled]');
    expect(attribute('role', 'button')).toBe('[role="button"]');
  });

  it('should build pseudo classes and elements', () => {
    expect(pseudoClass('hover')).toBe(':hover');
    expect(pseudoClass('state', 'open')).toBe(':state(open)');
    expect(pseudoElement('before')).toBe('::before');
    expect(pseudoElement('part', 'thumb')).toBe('::part(thumb)');
  });

  it('should omit nullish params', () => {
    expect(selector('button', null, attribute('type', 'button'))).toBe(
      'button[type="button"]',
    );
  });

  it('should build :host selectors with params', () => {
    expect(selector(':host', attribute('color', 'primary'))).toBe(
      ':host([color="primary"])',
    );
  });
});
