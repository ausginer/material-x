// Copyright 2026 Google LLC
// SPDX-License-Identifier: Apache-2.0

/**
 * The base and emphasized type styles that material-web publishes, which judge
 * the store's selection from outside it. Lengths are in `rem`, as published, and
 * the references to the typefaces and weights are resolved.
 *
 * Source: `_md-sys-typescale.scss`, `_md-sys-typescale-emphasized.scss` and,
 * for the references, `_md-ref-typeface.scss`, in `tokens/versions/latest/sass`
 * of material-components/material-web, at commit
 * `a0bab1d9448bbcecab053e6085b8ec621e4cae3e`. Design system Google Material 3,
 * version 34.0.21, with the context tags `audience: 3p`, `font: static` and
 * `platform: web`.
 */
export type PublishedTypeStyle = Readonly<{
  font: string;
  weight: number;
  size: number;
  'line-height': number;
  tracking: number;
}>;

export const MATERIAL_WEB_TYPESCALE: Readonly<
  Record<string, PublishedTypeStyle>
> = {
  'display-large': {
    font: 'Roboto',
    weight: 400,
    size: 3.5625,
    'line-height': 4,
    tracking: -0.015625,
  },
  'display-medium': {
    font: 'Roboto',
    weight: 400,
    size: 2.8125,
    'line-height': 3.25,
    tracking: 0,
  },
  'display-small': {
    font: 'Roboto',
    weight: 400,
    size: 2.25,
    'line-height': 2.75,
    tracking: 0,
  },
  'headline-large': {
    font: 'Roboto',
    weight: 400,
    size: 2,
    'line-height': 2.5,
    tracking: 0,
  },
  'headline-medium': {
    font: 'Roboto',
    weight: 400,
    size: 1.75,
    'line-height': 2.25,
    tracking: 0,
  },
  'headline-small': {
    font: 'Roboto',
    weight: 400,
    size: 1.5,
    'line-height': 2,
    tracking: 0,
  },
  'title-large': {
    font: 'Roboto',
    weight: 400,
    size: 1.375,
    'line-height': 1.75,
    tracking: 0,
  },
  'title-medium': {
    font: 'Roboto',
    weight: 500,
    size: 1,
    'line-height': 1.5,
    tracking: 0.009375,
  },
  'title-small': {
    font: 'Roboto',
    weight: 500,
    size: 0.875,
    'line-height': 1.25,
    tracking: 0.00625,
  },
  'body-large': {
    font: 'Roboto',
    weight: 400,
    size: 1,
    'line-height': 1.5,
    tracking: 0.03125,
  },
  'body-medium': {
    font: 'Roboto',
    weight: 400,
    size: 0.875,
    'line-height': 1.25,
    tracking: 0.015625,
  },
  'body-small': {
    font: 'Roboto',
    weight: 400,
    size: 0.75,
    'line-height': 1,
    tracking: 0.025,
  },
  'label-large': {
    font: 'Roboto',
    weight: 500,
    size: 0.875,
    'line-height': 1.25,
    tracking: 0.00625,
  },
  'label-medium': {
    font: 'Roboto',
    weight: 500,
    size: 0.75,
    'line-height': 1,
    tracking: 0.03125,
  },
  'label-small': {
    font: 'Roboto',
    weight: 500,
    size: 0.6875,
    'line-height': 1,
    tracking: 0.03125,
  },
  'emphasized.display-large': {
    font: 'Roboto',
    weight: 500,
    size: 3.5625,
    'line-height': 4,
    tracking: -0.015625,
  },
  'emphasized.display-medium': {
    font: 'Roboto',
    weight: 500,
    size: 2.8125,
    'line-height': 3.25,
    tracking: 0,
  },
  'emphasized.display-small': {
    font: 'Roboto',
    weight: 500,
    size: 2.25,
    'line-height': 2.75,
    tracking: 0,
  },
  'emphasized.headline-large': {
    font: 'Roboto',
    weight: 500,
    size: 2,
    'line-height': 2.5,
    tracking: 0,
  },
  'emphasized.headline-medium': {
    font: 'Roboto',
    weight: 500,
    size: 1.75,
    'line-height': 2.25,
    tracking: 0,
  },
  'emphasized.headline-small': {
    font: 'Roboto',
    weight: 500,
    size: 1.5,
    'line-height': 2,
    tracking: 0,
  },
  'emphasized.title-large': {
    font: 'Roboto',
    weight: 500,
    size: 1.375,
    'line-height': 1.75,
    tracking: 0,
  },
  'emphasized.title-medium': {
    font: 'Roboto',
    weight: 700,
    size: 1,
    'line-height': 1.5,
    tracking: 0.009375,
  },
  'emphasized.title-small': {
    font: 'Roboto',
    weight: 700,
    size: 0.875,
    'line-height': 1.25,
    tracking: 0.00625,
  },
  'emphasized.body-large': {
    font: 'Roboto',
    weight: 500,
    size: 1,
    'line-height': 1.5,
    tracking: 0.03125,
  },
  'emphasized.body-medium': {
    font: 'Roboto',
    weight: 500,
    size: 0.875,
    'line-height': 1.25,
    tracking: 0.015625,
  },
  'emphasized.body-small': {
    font: 'Roboto',
    weight: 500,
    size: 0.75,
    'line-height': 1,
    tracking: 0.025,
  },
  'emphasized.label-large': {
    font: 'Roboto',
    weight: 700,
    size: 0.875,
    'line-height': 1.25,
    tracking: 0.00625,
  },
  'emphasized.label-medium': {
    font: 'Roboto',
    weight: 700,
    size: 0.75,
    'line-height': 1,
    tracking: 0.03125,
  },
  'emphasized.label-small': {
    font: 'Roboto',
    weight: 700,
    size: 0.6875,
    'line-height': 1,
    tracking: 0.03125,
  },
};
