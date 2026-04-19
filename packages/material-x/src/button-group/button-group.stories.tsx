import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type JSX } from 'react';
import '../button/button.ts';
import '../button/switch-icon-button.ts';
import '../icon/icon.ts';
import type {
  ButtonColor,
  ButtonShape,
  ButtonSize,
} from '../button/ButtonCore.ts';
import css from '../story.module.css';
import './button-group.ts';

const meta: Meta = {
  title: 'Button Group/Standard',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={`${css['layout']} ${css['vertical']}`}>
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
  disabled: boolean;
}>;

export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    color: 'filled',
    size: 'small',
    shape: 'round',
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
    disabled: {
      control: 'boolean',
    },
  },
  render({ color, size, shape, disabled }) {
    return (
      <mx-button-group
        color={color === 'filled' ? undefined : color}
        size={size === 'small' ? undefined : size}
        shape={shape === 'round' ? undefined : shape}
        disabled={disabled}
      >
        <mx-button>Back</mx-button>
        <mx-button>Save</mx-button>
        <mx-button>Next</mx-button>
      </mx-button-group>
    );
  },
};

export const States = (): JSX.Element => (
  <mx-button-group size="medium">
    <mx-button>Default</mx-button>
    <mx-button data-force="hovered">Hovered</mx-button>
    <mx-button data-force="focused">Focused</mx-button>
    <mx-button data-force="pressed">Pressed</mx-button>
    <mx-button disabled>Disabled</mx-button>
  </mx-button-group>
);

export const Sizes = (): JSX.Element => (
  <>
    <mx-button-group size="xsmall">
      <mx-button>Button 1</mx-button>
      <mx-button>Button 2</mx-button>
      <mx-button>Button 3</mx-button>
    </mx-button-group>

    <mx-button-group>
      <mx-button>Button 1</mx-button>
      <mx-button>Button 2</mx-button>
      <mx-button>Button 3</mx-button>
    </mx-button-group>

    <mx-button-group size="medium">
      <mx-button>Button 1</mx-button>
      <mx-button>Button 2</mx-button>
      <mx-button>Button 3</mx-button>
    </mx-button-group>

    <mx-button-group size="large">
      <mx-button>Button 1</mx-button>
      <mx-button>Button 2</mx-button>
      <mx-button>Button 3</mx-button>
    </mx-button-group>

    <mx-button-group size="xlarge">
      <mx-button>Button 1</mx-button>
      <mx-button>Button 2</mx-button>
      <mx-button>Button 3</mx-button>
    </mx-button-group>
  </>
);

export const Switch = (): JSX.Element => {
  const [selected, setSelected] = useState<string | undefined>();

  return (
    <mx-button-group size="medium">
      <mx-switch-icon-button
        width="narrow"
        checked={selected === 'bluetooth'}
        onChange={() => setSelected('bluetooth')}
      >
        <mx-icon>bluetooth</mx-icon>
      </mx-switch-icon-button>
      <mx-switch-icon-button
        checked={selected === 'alarm'}
        onChange={() => setSelected('alarm')}
      >
        <mx-icon>alarm</mx-icon>
      </mx-switch-icon-button>
      <mx-switch-icon-button
        width="narrow"
        checked={selected === 'link'}
        onChange={() => setSelected('link')}
      >
        <mx-icon>link</mx-icon>
      </mx-switch-icon-button>
      <mx-switch-icon-button
        width="wide"
        checked={selected === 'wifi'}
        onChange={() => setSelected('wifi')}
      >
        <mx-icon>wifi</mx-icon>
      </mx-switch-icon-button>
    </mx-button-group>
  );
};
