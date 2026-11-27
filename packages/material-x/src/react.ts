// oxlint-disable typescript/no-namespace, no-unused-vars
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
  SwitchIconButtonCSSProperties,
  SwitchIconButtonEvents,
  SwitchIconButtonProperties,
} from './button/IconButtonCore.ts';
import type LinkButton from './button/link-button.ts';
import type {
  LinkButtonCSSProperties,
  LinkButtonEvents,
  LinkButtonProps,
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
import type {
  CardCSSProperties,
  CardEvents,
  CardProperties,
} from './card/card.ts';
import type Card from './card/card.ts';
import type Checkbox from './checkbox/checkbox.ts';
import type {
  CheckboxCSSProperties,
  CheckboxEvents,
  CheckboxProperties,
} from './checkbox/checkbox.ts';
import type Divider from './divider/divider.ts';
import type {
  DividerCSSProperties,
  DividerEvents,
  DividerProperties,
} from './divider/divider.ts';
import type FAB from './fab/fab.ts';
import type { FABCSSProperties, FABEvents, FABProperties } from './fab/fab.ts';
import type Icon from './icon/icon.ts';
import type {
  IconCSSProperties,
  IconEvents,
  IconProperties,
} from './icon/icon.ts';
import type ListButtonItem from './list/list-button-item.ts';
import type {
  ListButtonItemCSSProperties,
  ListButtonItemEvents,
  ListButtonItemProperties,
} from './list/list-button-item.ts';
import type ListItem from './list/list-item.ts';
import type {
  ListItemCSSProperties,
  ListItemEvents,
  ListItemProperties,
} from './list/list-item.ts';
import type ListLinkItem from './list/list-link-item.ts';
import type {
  ListLinkItemCSSProperties,
  ListLinkItemEvents,
  ListLinkItemProperties,
} from './list/list-link-item.ts';
import type List from './list/list.ts';
import type {
  ListCSSProperties,
  ListEvents,
  ListProperties,
} from './list/list.ts';
import type SortableList from './list/sortable-list.ts';
import type {
  SortableListCSSProperties,
  SortableListEvents,
  SortableListProperties,
} from './list/sortable-list.ts';
import type Radio from './radio/radio.ts';
import type {
  RadioCSSProperties,
  RadioEvents,
  RadioProperties,
} from './radio/radio.ts';
import type Slider from './slider/slider.ts';
import type {
  SliderCSSProperties,
  SliderEvents,
  SliderProperties,
} from './slider/slider.ts';
import type MultilineTextField from './text-field/multiline-text-field.ts';
import type TextField from './text-field/text-field.ts';
import type {
  TextFieldCSSProperties,
  TextFieldEvents,
  TextFieldProperties,
} from './text-field/TextFieldCore.ts';
import type TopAppBar from './top-app-bar/top-app-bar.ts';
import type {
  TopAppBarCSSProperties,
  TopAppBarEvents,
  TopAppBarProperties,
} from './top-app-bar/top-app-bar.ts';

type JSXWrapper<
  C extends HTMLElement,
  P extends Record<string, unknown>,
  E extends Record<string, Event>,
> = DetailedHTMLProps<
  Omit<HTMLAttributes<C>, keyof P> &
    P & {
      [K in keyof E as `on${K & string}`]?: (event: E[K]) => void;
    },
  C
>;

type ButtonJSX = JSXWrapper<Button, ButtonProperties, ButtonEvents>;

type IconButtonJSX = JSXWrapper<
  IconButton,
  IconButtonProperties,
  IconButtonEvents
>;

type LinkButtonJSX = JSXWrapper<LinkButton, LinkButtonProps, LinkButtonEvents>;

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

type CardJSX = JSXWrapper<Card, CardProperties, CardEvents>;

type CheckboxJSX = JSXWrapper<Checkbox, CheckboxProperties, CheckboxEvents>;

type DividerJSX = JSXWrapper<Divider, DividerProperties, DividerEvents>;

type RadioJSX = JSXWrapper<Radio, RadioProperties, RadioEvents>;

type SliderJSX = JSXWrapper<Slider, SliderProperties, SliderEvents>;

type ListJSX = JSXWrapper<List, ListProperties, ListEvents>;

type ListItemJSX = JSXWrapper<ListItem, ListItemProperties, ListItemEvents>;

type ListButtonItemJSX = JSXWrapper<
  ListButtonItem,
  ListButtonItemProperties,
  ListButtonItemEvents
>;

type ListLinkItemJSX = JSXWrapper<
  ListLinkItem,
  ListLinkItemProperties,
  ListLinkItemEvents
>;

type SortableListJSX = JSXWrapper<
  SortableList,
  SortableListProperties,
  SortableListEvents
>;

type TextFieldJSX = JSXWrapper<TextField, TextFieldProperties, TextFieldEvents>;
type MultilineTextFieldJSX = JSXWrapper<
  MultilineTextField,
  TextFieldProperties,
  TextFieldEvents
>;

type TopAppBarJSX = JSXWrapper<TopAppBar, TopAppBarProperties, TopAppBarEvents>;

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
      'mx-card': CardJSX;
      'mx-checkbox': CheckboxJSX;
      'mx-divider': DividerJSX;
      'mx-fab': FABJSX;
      'mx-list': ListJSX;
      'mx-list-item': ListItemJSX;
      'mx-list-button-item': ListButtonItemJSX;
      'mx-list-link-item': ListLinkItemJSX;
      'mx-sortable-list': SortableListJSX;
      'mx-radio': RadioJSX;
      'mx-slider': SliderJSX;
      'mx-icon': IconJSX;
      'mx-text-field': TextFieldJSX;
      'mx-multiline-text-field': MultilineTextFieldJSX;
      'mx-top-app-bar': TopAppBarJSX;
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
      CardCSSProperties,
      CheckboxCSSProperties,
      DividerCSSProperties,
      FABCSSProperties,
      IconCSSProperties,
      ListCSSProperties,
      ListItemCSSProperties,
      ListButtonItemCSSProperties,
      ListLinkItemCSSProperties,
      SortableListCSSProperties,
      RadioCSSProperties,
      SliderCSSProperties,
      TextFieldCSSProperties,
      TopAppBarCSSProperties {}
}
