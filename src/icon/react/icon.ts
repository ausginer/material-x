import * as React from 'react';
import type Icon from '../icon.ts';
export * from '../icon.ts';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mx-icon': React.DetailedHTMLProps<React.HTMLAttributes<Icon>, Icon>;
    }
  }
}
