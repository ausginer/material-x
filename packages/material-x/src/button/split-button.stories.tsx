import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type JSX, type PropsWithChildren } from 'react';
import '../icon/icon.ts';
import css from '../story.module.css';
import type { ButtonColor, ButtonShape, ButtonSize } from './ButtonCore.ts';
// oxlint-disable-next-line import/no-duplicates
import './split-button.ts';
import type { SplitButtonProperties } from './split-button.ts';

const meta: Meta = {
  title: 'Button/Split',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={css['layout']}>
        <Component />
      </div>
    ),
  ],
};

export default meta;

function ControlledSplitButton(
  props: PropsWithChildren<SplitButtonProperties>,
) {
  const [open, setOpen] = useState(false);

  return (
    <mx-split-button open={open} ontoggle={() => setOpen(!open)} {...props} />
  );
}

type PlaygroundArgs = Readonly<{
  color: ButtonColor | 'filled';
  size: ButtonSize | 'small';
  shape: ButtonShape | 'round';
  icon: string;
  label: string;
  open: boolean;
  disabled: boolean;
}>;

export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    color: 'filled',
    size: 'small',
    shape: 'round',
    icon: '',
    label: 'Submit',
    open: false,
    disabled: false,
  },
  argTypes: {
    color: {
      control: 'inline-radio',
      options: ['filled', 'elevated', 'outlined', 'tonal', 'text'],
    },
    size: {
      control: 'inline-radio',
      options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
    },
    shape: {
      control: 'inline-radio',
      options: ['round', 'square'],
    },
    icon: {
      control: 'text',
    },
    label: {
      control: 'text',
    },
    open: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
  render({ color, size, shape, icon, label, open, disabled }) {
    return (
      <mx-split-button
        color={color === 'filled' ? undefined : color}
        size={size === 'small' ? undefined : size}
        shape={shape === 'round' ? undefined : shape}
        open={open}
        disabled={disabled}
      >
        {icon && <mx-icon slot="icon">{icon}</mx-icon>}
        {label}
      </mx-split-button>
    );
  },
};

export const States = (): JSX.Element => (
  <>
    <mx-split-button>Default</mx-split-button>
    <mx-split-button data-force="hovered">Hovered</mx-split-button>
    <mx-split-button data-force="focused">Focused</mx-split-button>
    <mx-split-button data-force="pressed">Pressed</mx-split-button>
    <mx-split-button disabled>Disabled</mx-split-button>
  </>
);

export const Sizes = (): JSX.Element => (
  <>
    <ControlledSplitButton size="xsmall">Extra small</ControlledSplitButton>
    <ControlledSplitButton>Small</ControlledSplitButton>
    <ControlledSplitButton size="medium">Medium</ControlledSplitButton>
    <ControlledSplitButton size="large">Large</ControlledSplitButton>
    <ControlledSplitButton size="xlarge">Extra large</ControlledSplitButton>
  </>
);

export const Shape = (): JSX.Element => (
  <>
    <ControlledSplitButton>Round</ControlledSplitButton>
    <ControlledSplitButton shape="square">Square</ControlledSplitButton>
  </>
);

export const Color = (): JSX.Element => (
  <>
    <ControlledSplitButton>Filled</ControlledSplitButton>
    <ControlledSplitButton color="elevated">Elevated</ControlledSplitButton>
    <ControlledSplitButton color="tonal">Tonal</ControlledSplitButton>
    <ControlledSplitButton color="outlined">Outlined</ControlledSplitButton>
    <ControlledSplitButton color="text">Text</ControlledSplitButton>
  </>
);

export const WithIcon = (): JSX.Element => (
  <>
    <ControlledSplitButton>
      <mx-icon slot="icon">edit</mx-icon>
      Filled
    </ControlledSplitButton>
    <ControlledSplitButton color="elevated">
      <mx-icon slot="icon">edit</mx-icon>
      Elevated
    </ControlledSplitButton>
    <ControlledSplitButton color="tonal">
      <mx-icon slot="icon">edit</mx-icon>
      Tonal
    </ControlledSplitButton>
    <ControlledSplitButton color="outlined">
      <mx-icon slot="icon">edit</mx-icon>
      Outlined
    </ControlledSplitButton>
    <ControlledSplitButton color="text">
      <mx-icon slot="icon">edit</mx-icon>
      Text
    </ControlledSplitButton>
  </>
);
