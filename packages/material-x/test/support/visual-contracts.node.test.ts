import { beforeAll, describe, expect, it } from 'vitest';
import { resolveTokenContract } from './visual-contracts.node.ts';

describe('resolveTokenContract', () => {
  // The registry is loaded lazily; its first resolution pays the one-time tproc
  // transform + DB load, which can exceed the default per-test timeout. Warm it
  // once so the individual assertions stay fast and deterministic.
  beforeAll(async () => {
    await resolveTokenContract({
      contract: 'button.size.small',
      state: 'default',
      tokens: ['container.height'],
    });
  }, 120_000);

  it('should return requested values with diagnostic metadata', async () => {
    const result = await resolveTokenContract({
      contract: 'button.size.small',
      state: 'default',
      tokens: ['container.height'],
    });

    expect(result).toEqual({
      profile: 'expressive-web',
      contract: 'button.size.small',
      state: 'default',
      values: { 'container.height': expect.any(String) },
    });
  });

  it('should resolve a colour-variant contract', async () => {
    const result = await resolveTokenContract({
      contract: 'button.color.elevated',
      state: 'default',
      tokens: ['container.elevation'],
    });

    expect(result.values['container.elevation']).toBe('1');
  });

  it('should reject an unknown contract', async () => {
    await expect(
      resolveTokenContract({
        contract: 'unknown',
        state: 'default',
        tokens: [],
      }),
    ).rejects.toThrow('Unknown token contract: unknown');
  });

  it('should reject an unknown state', async () => {
    await expect(
      resolveTokenContract({
        contract: 'button.size.small',
        state: 'unknown',
        tokens: [],
      }),
    ).rejects.toThrow('Missing state "unknown"');
  });

  it('should reject an unknown token', async () => {
    await expect(
      resolveTokenContract({
        contract: 'button.size.small',
        state: 'default',
        tokens: ['unknown'],
      }),
    ).rejects.toThrow('Missing token "unknown"');
  });
});
