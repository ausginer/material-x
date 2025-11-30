/* eslint-disable @typescript-eslint/no-namespace */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type FAB from '../fab.ts';
import type { FABAttributes } from '../fab.ts';

export * from '../fab.ts';

type FABJSX = DetailedHTMLProps<HTMLAttributes<FAB> & FABAttributes, FAB>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mx-fab': FABJSX;
    }
  }
}
