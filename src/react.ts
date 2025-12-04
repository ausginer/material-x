/* eslint-disable @typescript-eslint/no-namespace */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type Button from './button/button.ts';
import type {
  ButtonAttributes,
  ButtonProperties,
  ButtonEvents,
  ButtonCSSProperties,
} from './button/button.ts';
import type IconButton from './button/icon-button.ts';
import type {
  IconButtonAttributes,
  IconButtonCSSProperties,
  IconButtonEvents,
  IconButtonProperties,
} from './button/icon-button.ts';
import type LinkButton from './button/link-button.ts';
import type {
  LinkButtonAttributes,
  LinkButtonCSSProperties,
  LinkButtonEvents,
  LinkButtonProperties,
} from './button/link-button.ts';
import type SplitButton from './button/split-button.ts';
import type {
  SplitButtonAttributes,
  SplitButtonProperties,
  SplitButtonEvents,
  SplitButtonCSSProperties,
} from './button/split-button.ts';
import type SwitchButton from './button/switch-button.ts';
import type {
  SwitchButtonAttributes,
  SwitchButtonCSSProperties,
  SwitchButtonEvents,
  SwitchButtonProperties,
} from './button/switch-button.ts';
import type SwitchIconButton from './button/switch-icon-button.ts';
import type {
  SwitchIconButtonAttributes,
  SwitchIconButtonCSSProperties,
  SwitchIconButtonEvents,
  SwitchIconButtonProperties,
} from './button/switch-icon-button.ts';
import type FAB from './fab/fab.ts';
import type {
  FABAttributes,
  FABCSSProperties,
  FABEvents,
  FABProperties,
} from './fab/fab.ts';
import type Icon from './icon/icon.ts';
import type {
  IconAttributes,
  IconCSSProperties,
  IconEvents,
  IconProperties,
} from './icon/icon.ts';

type JSXWrapper<
  C extends HTMLElement,
  A extends Record<string, unknown>,
  P extends Record<string, unknown>,
  E extends Record<string, Event>,
> = DetailedHTMLProps<
  HTMLAttributes<C> &
    A &
    P & {
      [K in keyof E as `on${K & string}`]: (event: E) => void;
    },
  C
>;

type ButtonJSX = JSXWrapper<
  Button,
  ButtonAttributes,
  ButtonProperties,
  ButtonEvents
>;

type IconButtonJSX = JSXWrapper<
  IconButton,
  IconButtonAttributes,
  IconButtonProperties,
  IconButtonEvents
>;

type LinkButtonJSX = JSXWrapper<
  LinkButton,
  LinkButtonAttributes,
  LinkButtonProperties,
  LinkButtonEvents
>;

type SplitButtonJSX = JSXWrapper<
  SplitButton,
  SplitButtonAttributes,
  SplitButtonProperties,
  SplitButtonEvents
>;

type SwitchButtonJSX = JSXWrapper<
  SwitchButton,
  SwitchButtonAttributes,
  SwitchButtonProperties,
  SwitchButtonEvents
>;

type SwitchIconButtonJSX = JSXWrapper<
  SwitchIconButton,
  SwitchIconButtonAttributes,
  SwitchIconButtonProperties,
  SwitchIconButtonEvents
>;

type FABJSX = JSXWrapper<FAB, FABAttributes, FABProperties, FABEvents>;

type IconJSX = JSXWrapper<Icon, IconAttributes, IconProperties, IconEvents>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mx-button': ButtonJSX;
      'mx-icon-button': IconButtonJSX;
      'mx-link-button': LinkButtonJSX;
      'mx-split-button': SplitButtonJSX;
      'mx-switch-button': SwitchButtonJSX;
      'mx-switch-icon-button': SwitchIconButtonJSX;
      'mx-fab': FABJSX;
      'mx-icon': IconJSX;
    }
  }
  export interface CSSProperties
    extends ButtonCSSProperties,
      IconButtonCSSProperties,
      LinkButtonCSSProperties,
      SplitButtonCSSProperties,
      SwitchButtonCSSProperties,
      SwitchIconButtonCSSProperties,
      FABCSSProperties,
      IconCSSProperties {}
}
