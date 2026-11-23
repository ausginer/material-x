/**
 * The 15 base type styles that material-web publishes, the only values in
 * tproc's tests that come from outside its store.
 *
 * Source: `tokens/versions/v0_192/_md-sys-typescale.scss`, with the references
 * it makes read from `_md-ref-typeface.scss` beside it, in
 * material-components/material-web at commit
 * `a0bab1d9448bbcecab053e6085b8ec621e4cae3e`. Both files name their context as
 * "Audience": "3P", "Platform": "Web" and "Scheme": "Dynamic". Lengths are in
 * `rem`, as published.
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
};
