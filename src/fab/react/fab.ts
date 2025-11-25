import type * as React from 'react';
import type FAB from '../fab.ts';
import type { FABAttributes } from '../fab.ts';

export * from '../fab.ts';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-qualifier
      'mx-fab': React.DetailedHTMLProps<
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-qualifier
        React.HTMLAttributes<FAB> & FABAttributes,
        FAB
      >;
    }
  }
}
