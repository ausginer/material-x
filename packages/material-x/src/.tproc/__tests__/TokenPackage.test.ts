import { describe, it, expect } from 'vitest';
import { TokenPackage } from '../TokenPackage.ts';

describe('TokenPackage', () => {
  it('should return state and effective sets', () => {
    const pkg = new TokenPackage({
      nodes: { default: { 'container.color': 'red' } },
      effective: { default: { 'container.color': 'red' } },
      order: ['default'],
    });

    expect(pkg.state('default')).toEqual({ 'container.color': 'red' });
    expect(pkg.effective('default')).toEqual({ 'container.color': 'red' });
    expect(pkg.state('missing')).toBeUndefined();
  });

  it('should render with declaration renderers', () => {
    const pkg = new TokenPackage({
      nodes: {
        default: { 'container.color': 'red' },
        hovered: { 'state-layer.opacity': 0.12 },
      },
      effective: {
        default: { 'container.color': 'red' },
        hovered: { 'state-layer.opacity': 0.12 },
      },
      order: ['default', 'hovered'],
      renderers: [
        (path, declarations) =>
          path === 'default'
            ? [
                { path, selectors: ['.a'], declarations },
                { path, selectors: ['.b'], declarations },
              ]
            : null,
      ],
    });

    expect(pkg.render()).toBe(
      `.a {\n  --_container-color: red;\n}\n\n.b {\n  --_container-color: red;\n}`,
    );
  });

  it('should render a single state when requested', () => {
    const pkg = new TokenPackage({
      nodes: {
        default: { 'container.color': 'red' },
        hovered: { 'state-layer.opacity': 0.12 },
      },
      effective: {
        default: { 'container.color': 'red' },
        hovered: { 'state-layer.opacity': 0.12 },
      },
      order: ['default', 'hovered'],
    });

    expect(pkg.render({ state: 'hovered' })).toBe(
      `:host {\n  --_state-layer-opacity: 0.12;\n}`,
    );
  });
});
