import { describe, it, expect } from 'vitest';
import { resolveInheritance } from '../resolveInheritance.ts';
import type { ExtensionEntry, TokenSet } from '../utils.ts';

describe('resolveInheritance', () => {
  it('should dedupe tokens', () => {
    const nodes: Readonly<Record<string, TokenSet>> = {
      default: { 'container.elevation': 0 },
      hovered: { 'container.elevation': 0, 'state-layer.opacity': 0.08 },
    };

    const extensions: Readonly<Record<string, ExtensionEntry>> = {
      default: {
        path: 'default',
        parents: [],
      },
      hovered: {
        path: 'hovered',
        parents: [{ kind: 'local', key: 'default' }],
      },
    };

    const result = resolveInheritance(nodes, extensions, [
      'default',
      'hovered',
    ]);

    expect(result.deduped['hovered']).toEqual({
      'state-layer.opacity': 0.08,
    });
  });

  it('should respect parent declaration order', () => {
    const nodes: Readonly<Record<string, TokenSet>> = {
      base: { 'container.elevation': 2 },
      child: { 'container.elevation': 2 },
    };

    const external: TokenSet = { 'container.elevation': 1 };

    const extensions: Readonly<Record<string, ExtensionEntry>> = {
      base: {
        path: 'base',
        parents: [],
      },
      child: {
        path: 'child',
        parents: [
          { kind: 'external', tokens: external },
          { kind: 'local', key: 'base' },
        ],
      },
    };

    const result = resolveInheritance(nodes, extensions, ['base', 'child']);

    expect(result.deduped['child']).toEqual({});
  });

  it('should throw on unknown extension node', () => {
    expect(() =>
      resolveInheritance(
        { base: { 'container.elevation': 1 } },
        {
          missing: {
            path: 'missing',
            parents: [],
          },
        },
      ),
    ).toThrow('Unknown node for extension: missing');
  });

  it('should throw on unknown parent node', () => {
    expect(() =>
      resolveInheritance(
        { child: { 'container.elevation': 1 } },
        {
          child: {
            path: 'child',
            parents: [{ kind: 'local', key: 'missing' }],
          },
        },
      ),
    ).toThrow('Unknown parent node: missing');
  });

  it('should throw on extension cycles', () => {
    expect(() =>
      resolveInheritance(
        {
          a: { 'container.elevation': 1 },
          b: { 'container.elevation': 2 },
        },
        {
          a: { path: 'a', parents: [{ kind: 'local', key: 'b' }] },
          b: { path: 'b', parents: [{ kind: 'local', key: 'a' }] },
        },
      ),
    ).toThrow('Extension graph has a cycle');
  });
});
