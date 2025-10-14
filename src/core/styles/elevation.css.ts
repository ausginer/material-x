import { css, prettify } from '../tokens/css.ts';
import { resolveSet } from '../tokens/resolve.ts';
import { createVariables, CSSVariable, packSet } from '../tokens/variable.ts';

const SET_NAME = 'md.elevation';

function multiply(multiplier: number): string {
  return `calc(${CSSVariable.ref('level')} * ${multiplier}px)`;
}

function mix(percent: number): string {
  return `color-mix(in srgb, ${CSSVariable.ref('shadow-color')} ${percent}%, transparent);`;
}

const tokens = createVariables(
  resolveSet({
    level: 'md.sys.elevation.level0',
    'shadow-color': 'md.sys.color.surface-tint',
  }),
  {
    vars: ['level', 'shadow-color'],
    prefix: CSSVariable.cssify(SET_NAME),
  },
);

const pack = packSet(tokens);

const umbra = (() => {
  const offset = multiply(0.5);
  const blur = multiply(0.7);
  const color = mix(20);

  return `0 ${offset} ${blur} 0 ${color}`;
})();

const penumbra = (() => {
  const offset = multiply(0.75);
  const blur = multiply(0.75);
  const color = mix(14);

  return `0 ${offset} ${blur} 0 ${color}`;
})();

const ambient = (() => {
  const offset = multiply(1.5);
  const blur = multiply(2);
  const color = mix(12);

  return `0 ${offset} ${blur} 0 ${color}`;
})();

const styles: string = await prettify(css`
  :host {
    ${pack};

    position: relative;
    box-shadow: ${penumbra};

    &::before,
    &::after {
      border-radius: inherit;
      inset: 0;
      position: absolute;
      transition-duration: inherit;
      transition-timing-function: inherit;
      transition-property: box-shadow;
      pointer-events: none;
    }

    &::before {
      box-shadow: ${umbra};
    }

    &::after {
      box-shadow: ${ambient};
    }
  }
`);

console.log(styles);

export default styles;
