/* eslint-disable @typescript-eslint/no-namespace */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type Icon from '../icon.ts';

export * from '../icon.ts';

type IconJSX = DetailedHTMLProps<HTMLAttributes<Icon>, Icon>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mx-icon': IconJSX;
    }
  }
}
