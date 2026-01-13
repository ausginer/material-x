import { describe, it, expect } from 'vitest';
import { TokenPackageProcessor } from '../TokenPackageProcessor.ts';
import type { Token } from '../TokenTable.ts';
import { createAllowedTokensSelector } from '../utils.ts';
import {
  createToken,
  createTokenSet,
  createValue,
  mockDB,
  state,
} from './helpers.ts';

describe('TokenPackageProcessor', () => {
  it('should group tokens, append values, and select tokens', () => {
    const tokenSet = createTokenSet();
    const tokens: [Token, Token] = [
      createToken({
        name: 'md.comp.test.container.color',
        tokenName: 'md.comp.test.container.color',
        tokenNameSuffix: 'container.color',
      }),
      createToken({
        name: 'md.comp.test.hovered.container.color',
        tokenName: 'md.comp.test.hovered.container.color',
        tokenNameSuffix: 'hovered.container.color',
      }),
    ];

    state.tokenSets = [tokenSet];
    state.tokens = tokens;
    mockDB.getSet.mockReturnValue({ tokenSetName: 'md.comp.test' });

    const values = new Map<string, { value: ReturnType<typeof createValue> }>();
    const [baseToken, hoveredToken] = tokens;
    values.set(baseToken.name, {
      value: createValue({ name: baseToken.name, numeric: 1 }),
    });
    values.set(hoveredToken.name, {
      value: createValue({ name: hoveredToken.name, numeric: 2 }),
    });
    mockDB.getValue.mockImplementation((token: Token) =>
      values.get(token.name),
    );

    const processor = new TokenPackageProcessor('md.comp.test')
      .group((tokenName) => {
        const [first, ...rest] = tokenName.split('.');
        if (first === 'hovered') {
          return { path: 'hovered', tokenName: rest.join('.') };
        }

        return { path: 'default', tokenName: tokenName };
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
    const tokenSet = createTokenSet();

    state.tokenSets = [tokenSet];
    state.tokens = [];

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

    expect(pkg.state('hovered')).toEqual({
      'container.color': 'red',
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
