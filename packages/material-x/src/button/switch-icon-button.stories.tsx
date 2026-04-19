import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type JSX, type PropsWithChildren } from 'react';
import '../icon/icon.ts';
import css from '../story.module.css';
import type { ButtonShape, ButtonSize } from './ButtonCore.ts';
// oxlint-disable-next-line import/no-duplicates
import './switch-icon-button.ts';
import type { IconButtonColor, IconButtonWidth } from './icon-button.ts';
import type { SwitchIconButtonProperties } from './switch-icon-button.ts';

const meta: Meta = {
  title: 'Button/Switch Icon',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={css['layout']}>
        <Component />
      </div>
    ),
  ],
};

export default meta;

function ControlledSwitchIconButton(
  props: PropsWithChildren<SwitchIconButtonProperties>,
) {
  const [state, setState] = useState(false);

  return (
    <mx-switch-icon-button
      checked={state}
      onChange={() => {
        setState(!state);
      }}
      {...props}
    />
  );
}

type PlaygroundArgs = Readonly<{
  color: IconButtonColor | 'filled';
  size: ButtonSize | 'small';
  shape: ButtonShape | 'round';
  width: IconButtonWidth | 'default';
  icon: string;
  checked: boolean;
  disabled: boolean;
}>;

export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    color: 'filled',
    size: 'small',
    shape: 'round',
    width: 'default',
    icon: 'wifi',
    checked: false,
    disabled: false,
  },
  argTypes: {
    color: {
      control: 'inline-radio',
      options: ['filled', 'elevated', 'tonal', 'outlined', 'standard'],
    },
    size: {
      control: 'inline-radio',
      options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
    },
    shape: {
      control: 'inline-radio',
      options: ['round', 'square'],
    },
    width: {
      control: 'inline-radio',
      options: ['default', 'wide', 'narrow'],
    },
    icon: {
      control: 'text',
    },
    checked: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
  render({ color, size, shape, width, icon, checked, disabled }) {
    return (
      <mx-switch-icon-button
        color={color === 'filled' ? undefined : color}
        size={size === 'small' ? undefined : size}
        shape={shape === 'round' ? undefined : shape}
        width={width === 'default' ? undefined : width}
        checked={checked}
        disabled={disabled}
      >
        <mx-icon>{icon}</mx-icon>
      </mx-switch-icon-button>
    );
  },
};

export const States = (): JSX.Element => (
  <>
    <mx-switch-icon-button>
      <mx-icon>wifi</mx-icon>
    </mx-switch-icon-button>
    <mx-switch-icon-button data-force="hovered">
      <mx-icon>bluetooth</mx-icon>
    </mx-switch-icon-button>
    <mx-switch-icon-button data-force="focused">
      <mx-icon>alarm</mx-icon>
    </mx-switch-icon-button>
    <mx-switch-icon-button data-force="pressed">
      <mx-icon>search</mx-icon>
    </mx-switch-icon-button>
    <mx-switch-icon-button disabled>
      <mx-icon>play_arrow</mx-icon>
    </mx-switch-icon-button>
  </>
);

export const Sizes = (): JSX.Element => (
  <>
    <ControlledSwitchIconButton size="xsmall">
      <mx-icon>wifi</mx-icon>
    </ControlledSwitchIconButton>
    <ControlledSwitchIconButton>
      <mx-icon>bluetooth</mx-icon>
    </ControlledSwitchIconButton>
    <ControlledSwitchIconButton size="medium">
      <mx-icon>alarm</mx-icon>
    </ControlledSwitchIconButton>
    <ControlledSwitchIconButton size="large">
      <mx-icon>search</mx-icon>
    </ControlledSwitchIconButton>
    <ControlledSwitchIconButton size="xlarge">
      <mx-icon>favorite</mx-icon>
    </ControlledSwitchIconButton>
  </>
);

export const Shape = (): JSX.Element => (
  <>
    <ControlledSwitchIconButton>
      <mx-icon>favorite</mx-icon>
    </ControlledSwitchIconButton>
    <ControlledSwitchIconButton shape="square">
      <mx-icon>search</mx-icon>
    </ControlledSwitchIconButton>
  </>
);

export const Color = (): JSX.Element => (
  <>
    <ControlledSwitchIconButton>
      <mx-icon>wifi</mx-icon>
    </ControlledSwitchIconButton>
    <ControlledSwitchIconButton color="elevated">
      <mx-icon>bluetooth</mx-icon>
    </ControlledSwitchIconButton>
    <ControlledSwitchIconButton color="tonal">
      <mx-icon>alarm</mx-icon>
    </ControlledSwitchIconButton>
    <ControlledSwitchIconButton color="outlined">
      <mx-icon>search</mx-icon>
    </ControlledSwitchIconButton>
    <ControlledSwitchIconButton color="standard">
      <mx-icon>favorite</mx-icon>
    </ControlledSwitchIconButton>
  </>
);

export const Width = (): JSX.Element => (
  <>
    <ControlledSwitchIconButton width="wide">
      <mx-icon>favorite</mx-icon>
    </ControlledSwitchIconButton>
    <ControlledSwitchIconButton width="narrow">
      <mx-icon>search</mx-icon>
    </ControlledSwitchIconButton>
  </>
);
