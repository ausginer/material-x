import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX } from 'react';
import '../icon/icon.ts';
import css from '../story.module.css';
import './button.ts';
import type { ButtonColor, ButtonShape, ButtonSize } from './ButtonCore.ts';

const meta: Meta = {
  title: 'Button/Regular',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={css['layout']}>
        <Component />
      </div>
    ),
  ],
};

export default meta;

type PlaygroundArgs = Readonly<{
  color: ButtonColor | 'filled';
  size: ButtonSize | 'small';
  shape: ButtonShape | 'round';
  icon: string;
  label: string;
  disabled: boolean;
}>;

export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    color: 'filled',
    size: 'small',
    shape: 'round',
    label: 'Submit',
    icon: '',
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
    disabled: {
      control: 'boolean',
    },
  },
  render({ color, size, shape, icon, label, disabled }) {
    return (
      <mx-button
        color={color === 'filled' ? undefined : color}
        size={size === 'small' ? undefined : size}
        shape={shape === 'round' ? undefined : shape}
        disabled={disabled}
      >
        {icon && <mx-icon slot="icon">{icon}</mx-icon>}
        {label}
      </mx-button>
    );
  },
};

export const Color = (): JSX.Element => (
  <>
    <mx-button>Filled</mx-button>
    <mx-button color="elevated">Elevated</mx-button>
    <mx-button color="tonal">Tonal</mx-button>
    <mx-button color="outlined">Outlined</mx-button>
    <mx-button color="text">Text</mx-button>
  </>
);

export const Sizes = (): JSX.Element => (
  <>
    <mx-button size="xsmall">Extra small</mx-button>
    <mx-button>Small</mx-button>
    <mx-button size="medium">Medium</mx-button>
    <mx-button size="large">Large</mx-button>
    <mx-button size="xlarge">Extra large</mx-button>
  </>
);

export const Shape = (): JSX.Element => (
  <>
    <mx-button>Round</mx-button>
    <mx-button shape="square">Square</mx-button>
  </>
);

export const WithIcon = (): JSX.Element => (
  <>
    <mx-button>
      <mx-icon slot="icon">edit</mx-icon>
      Filled
    </mx-button>
    <mx-button color="elevated">
      <mx-icon slot="icon">edit</mx-icon>
      Elevated
    </mx-button>
    <mx-button color="tonal">
      <mx-icon slot="icon">edit</mx-icon>
      Tonal
    </mx-button>
    <mx-button color="outlined">
      <mx-icon slot="icon">edit</mx-icon>
      Outlined
    </mx-button>
    <mx-button color="text">
      <mx-icon slot="icon">edit</mx-icon>
      Text
    </mx-button>
  </>
);
