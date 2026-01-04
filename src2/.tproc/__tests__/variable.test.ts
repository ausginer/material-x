import { describe, it, expect } from 'vitest';
import { CSSVariable, createVariables, packSet } from '../variable.ts';

describe('CSSVariable', () => {
  it('should build private variables', () => {
    const variable = new CSSVariable('container.color', 1);

    expect(variable.name).toBe('--_container-color');
    expect(variable.value).toBe(1);
    expect(variable.isPublic).toBe(false);
    expect(variable.ref).toBe('var(--_container-color, 1)');
  });

  it('should build public variables', () => {
    const variable = new CSSVariable('container.color', 'red', 'md');

    expect(variable.value).toBe('var(--md-container-color, red)');
    expect(variable.isPublic).toBe(true);
  });

  it('should compare variables', () => {
    const first = new CSSVariable('container.color', 1);
    const second = CSSVariable.withValue(first, 1);
    const third = CSSVariable.withValue(first, 2);

    expect(CSSVariable.equals(first, second)).toBe(true);
    expect(CSSVariable.equals(first, third)).toBe(false);
    expect(CSSVariable.equals('a', 'a')).toBe(true);
    expect(CSSVariable.ref('container.color')).toBe('var(--_container-color)');
  });
});

describe('createVariables', () => {
  it('should filter and expose public variables', () => {
    const set = createVariables(
      {
        'container.color': 'red',
        'state-layer.opacity': 0.12,
      },
      { vars: ['container.color'], prefix: 'md' },
      ['container.color'],
    );

    expect(Object.keys(set)).toEqual(['container.color']);
    expect(set['container.color']?.value).toBe(
      'var(--md-container-color, red)',
    );
  });
});

describe('packSet', () => {
  it('should serialize variables', () => {
    const set = createVariables({ 'container.color': 'red' });
    expect(packSet(set)).toBe('--_container-color: red;');
  });
});
