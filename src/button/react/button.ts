import * as React from 'react';
import type Button from '../button.ts';
import type { ButtonAttributes } from '../button.ts';

export * from '../button.ts';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mx-button': React.DetailedHTMLProps<
        React.HTMLAttributes<Button> & ButtonAttributes,
        Button
      >;
    }
  }
}
