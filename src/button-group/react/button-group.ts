/* eslint-disable @typescript-eslint/no-namespace */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type ButtonGroup from '../button-group.ts';
import type { ButtonGroupAttributes } from '../button-group.ts';

export * from '../button-group.ts';

type ButtonGroupJSX = DetailedHTMLProps<
  HTMLAttributes<ButtonGroup> & ButtonGroupAttributes,
  ButtonGroup
>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mx-button-group': ButtonGroupJSX;
    }
  }
}
