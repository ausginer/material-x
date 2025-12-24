/* eslint-disable @typescript-eslint/no-namespace */
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type Button from './button/button.ts';
import type {
  ButtonCSSProperties,
  ButtonEvents,
  ButtonProperties,
} from './button/button.ts';
import type IconButton from './button/icon-button.ts';
import type {
  IconButtonCSSProperties,
  IconButtonEvents,
  IconButtonProperties,
} from './button/icon-button.ts';
import type LinkButton from './button/link-button.ts';
import type {
  LinkButtonCSSProperties,
  LinkButtonEvents,
  LinkButtonProperties,
} from './button/link-button.ts';
import type SplitButton from './button/split-button.ts';
import type {
  SplitButtonCSSProperties,
  SplitButtonEvents,
  SplitButtonProperties,
} from './button/split-button.ts';
import type SwitchButton from './button/switch-button.ts';
import type {
  SwitchButtonCSSProperties,
  SwitchButtonEvents,
  SwitchButtonProperties,
} from './button/switch-button.ts';
import type SwitchIconButton from './button/switch-icon-button.ts';
import type {
  SwitchIconButtonCSSProperties,
  SwitchIconButtonEvents,
  SwitchIconButtonProperties,
} from './button/switch-icon-button.ts';
import type {
  ButtonGroupCSSProperties,
  ButtonGroupEvents,
  ButtonGroupProperties,
} from './button-group/button-group.ts';
import type ButtonGroup from './button-group/button-group.ts';
import type {
  ConnectedButtonGroupCSSProperties,
  ConnectedButtonGroupEvents,
  ConnectedButtonGroupProperties,
} from './button-group/connected-button-group.ts';
import type ConnectedButtonGroup from './button-group/connected-button-group.ts';
import type FAB from './fab/fab.ts';
import type { FABCSSProperties, FABEvents, FABProperties } from './fab/fab.ts';
import type Icon from './icon/icon.ts';
import type {
  IconCSSProperties,
  IconEvents,
  IconProperties,
} from './icon/icon.ts';
import type TextField from './text-field/text-field.ts';
import type {
  TextFieldCSSProperties,
  TextFieldEvents,
  TextFieldProperties,
} from './text-field/text-field.ts';

type JSXWrapper<
  C extends HTMLElement,
  P extends Record<string, unknown>,
  E extends Record<string, Event>,
> = DetailedHTMLProps<
  HTMLAttributes<C> &
    P & {
      [K in keyof E as `on${K & string}`]?: (event: E) => void;
    },
  C
>;

type ButtonJSX = JSXWrapper<Button, ButtonProperties, ButtonEvents>;

type IconButtonJSX = JSXWrapper<
  IconButton,
  IconButtonProperties,
  IconButtonEvents
>;

type LinkButtonJSX = JSXWrapper<
  LinkButton,
  LinkButtonProperties,
  LinkButtonEvents
>;

type SplitButtonJSX = JSXWrapper<
  SplitButton,
  SplitButtonProperties,
  SplitButtonEvents
>;

type SwitchButtonJSX = JSXWrapper<
  SwitchButton,
  SwitchButtonProperties,
  SwitchButtonEvents
>;

type SwitchIconButtonJSX = JSXWrapper<
  SwitchIconButton,
  SwitchIconButtonProperties,
  SwitchIconButtonEvents
>;

type ButtonGroupJSX = JSXWrapper<
  ButtonGroup,
  ButtonGroupProperties,
  ButtonGroupEvents
>;

type ConnectedButtonGroupJSX = JSXWrapper<
  ConnectedButtonGroup,
  ConnectedButtonGroupProperties,
  ConnectedButtonGroupEvents
>;

type FABJSX = JSXWrapper<FAB, FABProperties, FABEvents>;

type IconJSX = JSXWrapper<Icon, IconProperties, IconEvents>;

type TextFieldJSX = JSXWrapper<TextField, TextFieldProperties, TextFieldEvents>;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'mx-button': ButtonJSX;
      'mx-icon-button': IconButtonJSX;
      'mx-link-button': LinkButtonJSX;
      'mx-split-button': SplitButtonJSX;
      'mx-switch-button': SwitchButtonJSX;
      'mx-switch-icon-button': SwitchIconButtonJSX;
      'mx-button-group': ButtonGroupJSX;
      'mx-connected-button-group': ConnectedButtonGroupJSX;
      'mx-fab': FABJSX;
      'mx-icon': IconJSX;
      'mx-text-field': TextFieldJSX;
    }
  }
  export interface CSSProperties
    extends
      ButtonCSSProperties,
      IconButtonCSSProperties,
      LinkButtonCSSProperties,
      SplitButtonCSSProperties,
      SwitchButtonCSSProperties,
      SwitchIconButtonCSSProperties,
      ButtonGroupCSSProperties,
      ConnectedButtonGroupCSSProperties,
      FABCSSProperties,
      IconCSSProperties,
      TextFieldCSSProperties {}
}
