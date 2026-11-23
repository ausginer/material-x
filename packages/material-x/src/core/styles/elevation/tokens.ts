import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '@ydinjs/tproc/index.js';
import * as CSSVariable from '@ydinjs/tproc/variable.js';

function multiply(multiplier: number): string {
  return `calc(${CSSVariable.ref('level')} * ${multiplier}px)`;
}

/*
 * A layer's colour is transparent at level 0, because Firefox paints a
 * zero-size shadow at a rounded box's corners. The mix rises with the level up
 * to 1, so a change of level animates with no step. The component's own
 * `--_shadow-color` wins over the package's default whatever order the two
 * stylesheets are adopted in.
 */
function mix(percent: number): string {
  const color = CSSVariable.ref(
    'shadow-color',
    CSSVariable.ref('default-shadow-color'),
  );

  return `color-mix(in srgb, ${color} calc(min(${CSSVariable.ref('level')}, 1) * ${percent}%), transparent);`;
}

function createShadowColor(
  offsetMultiplier: number,
  blurMultiplier: number,
  colorMultiplier: number,
) {
  const offset = multiply(offsetMultiplier);
  const blur = multiply(blurMultiplier);
  const color = mix(colorMultiplier);

  return `0 ${offset} ${blur} 0 ${color}`;
}

const umbra = createShadowColor(0.5, 0.7, 20);
const penumbra = createShadowColor(0.75, 0.75, 14);
const ambient = createShadowColor(1.5, 2, 12);

function createPackage() {
  return t
    .set({
      'default-shadow-color': 'md.sys.color.shadow',
      'elevation.umbra': umbra,
      'elevation.penumbra': penumbra,
      'elevation.ambient': ambient,
    })
    .build();
}

export const elevationTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(),
);
