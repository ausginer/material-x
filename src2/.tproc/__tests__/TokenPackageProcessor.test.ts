import { describe, it, expect } from 'vitest';
import { TokenPackageProcessor } from '../TokenPackageProcessor.ts';
import type { Token } from '../TokenTable.ts';
import {
  createToken,
  createTokenSet,
  createValue,
  mockDB,
  state,
} from './helpers.ts';

describe('TokenPackageProcessor', () => {
  it('should group tokens, append values, and allow tokens', () => {
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
          return { path: 'hovered', name: rest.join('.') };
        }

        return { path: 'default', name: tokenName };
      })
      .append({
        default: { 'container.width': 3 },
        hovered: { 'state-layer.opacity': 0.08 },
      })
      .allowTokens(['container.color', 'state-layer.opacity'])
      .adjustTokens((value) =>
        typeof value === 'string' ? `${value}x` : value,
      );

    const pkg = processor.build();

    expect(pkg.state('default')).toEqual({ 'container.color': '1x' });
    expect(pkg.state('hovered')).toEqual({
      'container.color': '2x',
      'state-layer.opacity': 0.08,
    });
  });

  it('should apply inheritance and render adjusters', () => {
    const tokenSet = createTokenSet();

    state.tokenSets = [tokenSet];
    state.tokens = [];

    const processor = new TokenPackageProcessor('md.comp.test')
      .scope('color', 'elevated')
      .append({
        default: { 'container.color': 'red' },
        hovered: {
          'container.color': 'red',
          'state-layer.opacity': 0.08,
        },
      })
      .extend((ext) => {
        const base = ext.state('default');
        ext.state('hovered').extends(base, { 'external.token': 'blue' });
      })
      .adjustRender((block) => (block.path === 'hovered' ? null : block));

    const pkg = processor.build();

    expect(pkg.scope).toEqual({ name: 'color', value: 'elevated' });
    expect(pkg.state('hovered')).toEqual({ 'state-layer.opacity': 0.08 });
    expect(pkg.effective('hovered')).toEqual({
      'external.token': 'blue',
      'container.color': 'red',
      'state-layer.opacity': 0.08,
    });
    expect(pkg.render()).toBe(
      ':host([color="elevated"]) {\n  --_container-color: red;\n}',
    );
  });
});
