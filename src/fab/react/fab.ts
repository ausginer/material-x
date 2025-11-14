import * as React from 'react';
import type FAB from '../fab.ts';
import type { FABAttributes } from '../fab.ts';

export * from '../fab.ts';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mx-fab': React.DetailedHTMLProps<
        React.HTMLAttributes<FAB> & FABAttributes,
        FAB
      >;
    }
  }
}
