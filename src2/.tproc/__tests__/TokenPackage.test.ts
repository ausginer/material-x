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

  it('should render with adjusters', () => {
    const pkg = new TokenPackage({
      scope: { name: 'color', value: 'elevated' },
      nodes: {
        default: { 'container.color': 'red' },
        hovered: { 'state-layer.opacity': 0.12 },
      },
      effective: {
        default: { 'container.color': 'red' },
        hovered: { 'state-layer.opacity': 0.12 },
      },
      order: ['default', 'hovered'],
      renderAdjusters: [
        (block) => (block.path === 'default' ? undefined : block),
        (block) =>
          block.path === 'hovered'
            ? null
            : [
                { ...block, selector: '.a' },
                { ...block, selector: '.b' },
              ],
      ],
    });

    expect(pkg.render()).toBe(
      `.a {\n  --_container-color: red;\n}\n\n.b {\n  --_container-color: red;\n}`,
    );
  });
});
