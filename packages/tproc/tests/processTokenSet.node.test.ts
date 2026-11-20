import { describe, it, expect, vi } from 'vitest';
import processTokenSet from '../src/processTokenSet.ts';
import {
  createToken,
  createTokenSet,
  createValue,
  useStore,
} from './helpers.ts';

describe('processTokenSet', () => {
  it('should throw when token set is missing', () => {
    expect(() => processTokenSet('missing')).toThrow(
      'Token set not found: missing',
    );
  });

  it('should throw for a set that no table carries', () => {
    useStore({ tokenSetName: 'md.comp.orphan', tokens: [] });

    expect(() => processTokenSet('md.comp.orphan')).toThrow(
      'Token set not found: md.comp.orphan',
    );
  });

  it('should process tokens and filter nulls', () => {
    useStore(
      createTokenSet({
        tokens: [
          createToken({
            tokenName: 'md.comp.test.container.color',
            values: [createValue({ numeric: 1 })],
          }),
          createToken({ tokenName: 'md.comp.test.container.opacity' }),
        ],
      }),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(processTokenSet('md.comp.test')).toEqual({
      'container.color': '1',
    });
  });
});
