import { describe, it, expect, vi } from 'vitest';
import { resolve, resolveSet, isLinkedToken } from '../resolve.ts';
import { createToken, createValue, mockDB } from './helpers.ts';

describe('resolve', () => {
  it('should detect linked tokens', () => {
    expect(isLinkedToken('md.test.token')).toBe(true);
    expect(isLinkedToken('plain-token')).toBe(false);
  });

  it('should resolve color tokens using theme', () => {
    expect(resolve('md.sys.color.primary', 'md.sys.color.primary')).toBe(
      'var(--md-sys-color-primary, #ff0000)',
    );
  });

  it('should throw when color tokens are not primitive values', () => {
    expect(() => resolve('md.sys.color.primary', { value: 1 })).toThrow(
      '"md.sys.color" token value must be string or number',
    );
  });

  it('should apply custom adjusters', () => {
    expect(
      resolve('token', '1', (value) =>
        typeof value === 'string' ? `${value}px` : value,
      ),
    ).toBe('1px');
  });

  it('should return null for unknown linked tokens', () => {
    mockDB.getToken.mockReturnValue(undefined);

    expect(resolve('token', 'md.unknown.token')).toBeNull();
  });

  it('should return null when processToken returns null', () => {
    const token = createToken({ tokenName: 'md.linked', name: 'md.linked' });
    mockDB.getToken.mockReturnValue(token);
    mockDB.getSet.mockReturnValue({ tokenSetName: 'md.comp.test' });
    mockDB.getValue.mockReturnValue(undefined);

    expect(resolve('token', 'md.linked')).toBeNull();
    console.log('Expected error above: missing value for md.linked');
  });

  it('should detect reference cycles', () => {
    const token = createToken({ tokenName: 'md.cycle', name: 'md.cycle' });
    mockDB.getToken.mockReturnValue(token);
    mockDB.getSet.mockReturnValue({ tokenSetName: 'md.comp.test' });
    mockDB.getValue.mockReturnValue({
      value: createValue({ tokenName: 'md.cycle' }),
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(resolve('token', 'md.cycle')).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('should flatten token objects', () => {
    const result = resolveSet({
      'container.color': 'red',
      typography: { size: 12, weight: 500 },
    });

    expect(result).toEqual({
      'container.color': 'red',
      'typography.size': 12,
      'typography.weight': 500,
    });
  });

  it('should filter null values from adjusters', () => {
    const result = resolveSet({ 'container.color': 'red' }, () => null);

    expect(result).toEqual({});
  });

  it('should throw on nested token objects', () => {
    expect(() =>
      resolveSet({ typography: { size: 12 } }, (value, path) =>
        path[0] === 'typography.size' ? { nested: 'value' } : value,
      ),
    ).toThrow('Nested token objects are not supported');
  });
});
