import { describe, it, expect } from 'vitest';
import { TokenPackageProcessor } from '../src/TokenPackageProcessor.ts';
import { createAllowedTokensSelector } from '../src/utils.ts';
import {
  createToken,
  createTokenSet,
  createValue,
  useStore,
} from './helpers.ts';

describe('TokenPackageProcessor', () => {
  it('should group tokens, append values, and select tokens', () => {
    useStore(
      createTokenSet({
        tokens: [
          createToken({
            tokenName: 'md.comp.test.container.color',
            values: [createValue({ numeric: 1 })],
          }),
          createToken({
            tokenName: 'md.comp.test.hovered.container.color',
            values: [createValue({ numeric: 2 })],
          }),
        ],
      }),
    );

    const processor = new TokenPackageProcessor('md.comp.test')
      .group((tokenName) => {
        const [first, ...rest] = tokenName.split('.');
        if (first === 'hovered') {
          return { path: 'hovered', tokenName: rest.join('.') };
        }

        return { path: 'default', tokenName };
      })
      .select(
        createAllowedTokensSelector(['container.color', 'state-layer.opacity']),
      )
      .append('default', { 'container.width': 3 })
      .append('hovered', { 'state-layer.opacity': 0.08 })
      .adjustTokens((value) =>
        typeof value === 'string' ? `${value}x` : value,
      );

    const pkg = processor.build();

    expect(pkg.state('default')).toEqual({
      'container.color': '1x',
      'container.width': 3,
    });
    expect(pkg.state('hovered')).toEqual({
      'container.color': '2x',
      'state-layer.opacity': 0.08,
    });
  });

  it('should apply inheritance and render declarations', () => {
    useStore(createTokenSet());

    const processor = new TokenPackageProcessor('md.comp.test')
      .append('default', { 'container.color': 'red' })
      .append('hovered', {
        'container.color': 'red',
        'state-layer.opacity': 0.08,
      })
      .extend((ext) => {
        const base = ext.state('default').extends();
        ext.state('hovered').extends(base, { 'external.token': 'blue' });
      })
      .renderDeclarations((path, declarations) =>
        path === 'hovered'
          ? null
          : { path, selectors: [':host'], declarations },
      );

    const pkg = processor.build();

    // `state` is deduped against what the state inherits, and `hovered`
    // inherits `container.color: red` from `default`.
    expect(pkg.state('hovered')).toEqual({
      'state-layer.opacity': 0.08,
    });
    expect(pkg.effective('hovered')).toEqual({
      'external.token': 'blue',
      'container.color': 'red',
      'state-layer.opacity': 0.08,
    });
    expect(pkg.render()).toBe(':host {\n  --_container-color: red;\n}');
  });
});
