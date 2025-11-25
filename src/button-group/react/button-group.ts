/* eslint-disable @typescript-eslint/no-unnecessary-qualifier */
import type * as React from 'react';
import type ButtonGroup from '../button-group.ts';
import type { ButtonGroupAttributes } from '../button-group.ts';

export * from '../button-group.ts';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'mx-button-group': React.DetailedHTMLProps<
        React.HTMLAttributes<ButtonGroup> & ButtonGroupAttributes,
        ButtonGroup
      >;
    }
  }
}
