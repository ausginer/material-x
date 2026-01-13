import { computed, type ReadonlySignal } from '@preact/signals-core';
import { t, type TokenPackage } from '../../.tproc/index.ts';
import * as CSSVariable from '../../.tproc/variable.ts';

function multiply(multiplier: number): string {
  return `calc(${CSSVariable.ref('level')} * ${multiplier}px)`;
}

function mix(percent: number): string {
  return `color-mix(in srgb, ${CSSVariable.ref('shadow-color')} ${percent}%, transparent);`;
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
      level: 'md.sys.elevation.level0',
      'shadow-color': 'md.sys.color.surface-tint',
      'elevation.umbra': umbra,
      'elevation.penumbra': penumbra,
      'elevation.ambient': ambient,
    })
    .build();
}

export const elevationTokens: ReadonlySignal<TokenPackage> = computed(() =>
  createPackage(),
);
