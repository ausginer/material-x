// oxlint-disable no-console
import { describe, it, expect, vi } from 'vitest';
import { resolve, resolveSet, isLinkedToken } from '../src/resolve.ts';
import { createToken, createValue, mockDB, state } from './helpers.ts';

describe('resolve', () => {
  it('should detect linked tokens', () => {
    expect(isLinkedToken('md.test.token')).toBeTruthy();
    expect(isLinkedToken('plain-token')).toBeFalsy();
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

  it('should resolve variation axes to a CSS font variation value', () => {
    const weightToken = createToken({
      name: 'md.ref.wght',
      tokenName: 'md.ref.wght',
      tokenNameSuffix: 'wght',
    });
    const gradeToken = createToken({
      name: 'md.ref.GRAD',
      tokenName: 'md.ref.GRAD',
      tokenNameSuffix: 'GRAD',
    });
    const values = new Map([
      [
        weightToken.name,
        { value: createValue({ name: weightToken.name, numeric: 400 }) },
      ],
      [
        gradeToken.name,
        { value: createValue({ name: gradeToken.name, numeric: 0 }) },
      ],
    ]);

    state.tokens = [weightToken, gradeToken];
    mockDB.getSet.mockReturnValue({ tokenSetName: 'md.ref.test' });
    mockDB.getValue.mockImplementation((token) => values.get(token.name));

    const result = resolveSet({
      typography: {
        'variation-axes': {
          wght: { axisValueTokenName: weightToken.tokenName },
          GRAD: { axisValueTokenName: gradeToken.tokenName },
        },
      },
    });

    expect(result).toEqual({
      'typography.variation-axes': '"wght" 400, "GRAD" 0',
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
