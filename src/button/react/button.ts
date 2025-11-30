/* eslint-disable @typescript-eslint/no-namespace */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type Button from '../button.ts';
import type { ButtonAttributes } from '../button.ts';

export * from '../button.ts';

type ButtonJSX = DetailedHTMLProps<
  HTMLAttributes<Button> & ButtonAttributes,
  Button
>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mx-button': ButtonJSX;
    }
  }
}
