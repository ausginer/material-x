/* eslint-disable @typescript-eslint/no-namespace */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type ConnectedButtonGroup from '../connected-button-group.ts';
import type { ConnectedButtonGroupAttributes } from '../connected-button-group.ts';

export * from '../connected-button-group.ts';

type ConnectedButtonGroupJSX = DetailedHTMLProps<
  HTMLAttributes<ConnectedButtonGroup> & ConnectedButtonGroupAttributes,
  ConnectedButtonGroup
>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mx-connected-button-group': ConnectedButtonGroupJSX;
    }
  }
}
