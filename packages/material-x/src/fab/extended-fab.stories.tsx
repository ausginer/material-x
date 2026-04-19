import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  useState,
  type CSSProperties,
  type JSX,
  type PropsWithChildren,
} from 'react';
import css from '../story.module.css';
// oxlint-disable-next-line import/no-duplicates
import './fab.ts';
import type { FABColor, FABExtended, FABProperties, FABSize } from './fab.ts';

const meta: Meta = {
  title: 'FAB / Extended',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={css['layout']}>
        <Component />
      </div>
    ),
  ],
};

export default meta;

type ControlledFABExtendedProps = Omit<FABProperties, 'extended'> &
  Readonly<{
    className?: string;
    dir?: 'ltr' | 'rtl' | 'auto';
    style?: CSSProperties;
  }>;

function ControlledFABExtended({
  children,
  ...other
}: PropsWithChildren<ControlledFABExtendedProps>) {
  const [open, setOpen] = useState(false);
  const canHover =
    // oxlint-disable-next-line typescript/prefer-optional-chain
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  return (
    <mx-fab
      extended={open ? 'open' : 'closed'}
      onMouseEnter={canHover ? () => setOpen(true) : undefined}
      onMouseLeave={canHover ? () => setOpen(false) : undefined}
      onClick={!canHover ? () => setOpen((v) => !v) : undefined}
      {...other}
    >
      {children}
    </mx-fab>
  );
}

type PlaygroundArgs = Readonly<{
  color: FABColor | 'tertiary';
  size: FABSize;
  tonal: boolean;
  extended: FABExtended;
  icon: string;
  label: string;
  disabled: boolean;
}>;

export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    color: 'tertiary',
    size: 'medium',
    tonal: false,
    extended: 'open',
    icon: 'check',
    label: 'Create',
    disabled: false,
  },
  argTypes: {
    color: {
      control: 'inline-radio',
      options: ['tertiary', 'primary', 'secondary'],
    },
    size: {
      control: 'inline-radio',
      options: ['medium', 'large'],
    },
    tonal: {
      control: 'boolean',
    },
    extended: {
      control: 'inline-radio',
      options: ['open', 'closed'],
    },
    icon: {
      control: 'text',
    },
    label: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
  },
  render({ color, size, tonal, extended, icon, label, disabled }) {
    return (
      <mx-fab
        color={color === 'tertiary' ? undefined : color}
        size={size === 'medium' ? undefined : size}
        tonal={tonal}
        extended={extended}
        disabled={disabled}
      >
        <mx-icon slot="icon">{icon}</mx-icon>
        {label}
      </mx-fab>
    );
  },
};

export const States = (): JSX.Element => (
  <>
    <ControlledFABExtended color="primary">
      <mx-icon slot="icon">check</mx-icon>
      Default
    </ControlledFABExtended>
    <ControlledFABExtended color="primary" data-force="hovered">
      <mx-icon slot="icon">check</mx-icon>
      Hovered
    </ControlledFABExtended>
    <ControlledFABExtended color="primary" data-force="focused">
      <mx-icon slot="icon">check</mx-icon>
      Focused
    </ControlledFABExtended>
    <ControlledFABExtended color="primary" data-force="pressed">
      <mx-icon slot="icon">check</mx-icon>
      Pressed
    </ControlledFABExtended>
  </>
);

export const Colors = (): JSX.Element => (
  <>
    <ControlledFABExtended>
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
    <ControlledFABExtended color="primary">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
    <ControlledFABExtended color="secondary">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
  </>
);

export const TonalColors = (): JSX.Element => (
  <>
    <ControlledFABExtended tonal>
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
    <ControlledFABExtended tonal color="primary">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
    <ControlledFABExtended tonal color="secondary">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
  </>
);

export const Sizes = (): JSX.Element => (
  <>
    <ControlledFABExtended tonal size="medium">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
    <ControlledFABExtended tonal size="large">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
  </>
);

export const Direction = (): JSX.Element => (
  <>
    <ControlledFABExtended>
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
    <ControlledFABExtended dir="rtl">
      <mx-icon slot="icon">check</mx-icon>
      ارسال
    </ControlledFABExtended>
    <ControlledFABExtended
      style={{
        writingMode: 'vertical-rl',
        textOrientation: 'upright',
      }}
    >
      <mx-icon slot="icon">check</mx-icon>
      送信
    </ControlledFABExtended>
  </>
);
