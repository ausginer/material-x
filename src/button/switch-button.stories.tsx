import type { Meta } from '@storybook/react-vite';
import { useState, type JSX, type PropsWithChildren } from 'react';
import '../icon/icon.ts';
import css from '../story.module.css';
import './switch-button.ts';
import type { SwitchButtonProperties } from './switch-button.ts';

const meta: Meta = {
  title: 'Button/Switch',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={css['layout']}>
        <Component />
      </div>
    ),
  ],
};

export default meta;

function ControlledSwitchButton({
  children,
  ...other
}: PropsWithChildren<SwitchButtonProperties>) {
  const [state, setState] = useState(false);

  return (
    <mx-switch-button
      checked={state}
      onChange={() => {
        setState(!state);
      }}
      {...other}
    >
      {children}
    </mx-switch-button>
  );
}

export const States = (): JSX.Element => (
  <>
    <mx-switch-button>Default</mx-switch-button>
    <mx-switch-button data-force="hovered">Hovered</mx-switch-button>
    <mx-switch-button data-force="focused">Focused</mx-switch-button>
    <mx-switch-button data-force="pressed">Pressed</mx-switch-button>
    <mx-switch-button disabled>Disabled</mx-switch-button>
  </>
);

export const Sizes = (): JSX.Element => (
  <>
    <ControlledSwitchButton size="xsmall">Extra small</ControlledSwitchButton>
    <ControlledSwitchButton>Small</ControlledSwitchButton>
    <ControlledSwitchButton size="medium">Medium</ControlledSwitchButton>
    <ControlledSwitchButton size="large">Large</ControlledSwitchButton>
    <ControlledSwitchButton size="xlarge">Extra large</ControlledSwitchButton>
  </>
);

export const Shape = (): JSX.Element => (
  <>
    <ControlledSwitchButton color="outlined">Round</ControlledSwitchButton>
    <ControlledSwitchButton color="outlined" shape="square">
      Square
    </ControlledSwitchButton>
  </>
);

export const Color = (): JSX.Element => (
  <>
    <ControlledSwitchButton>Filled</ControlledSwitchButton>
    <ControlledSwitchButton color="elevated">Elevated</ControlledSwitchButton>
    <ControlledSwitchButton color="tonal">Tonal</ControlledSwitchButton>
    <ControlledSwitchButton color="outlined">Outlined</ControlledSwitchButton>
  </>
);

export const WithIcon = (): JSX.Element => (
  <>
    <ControlledSwitchButton>
      <mx-icon slot="icon">edit</mx-icon>
      Filled
    </ControlledSwitchButton>
    <ControlledSwitchButton color="elevated">
      <mx-icon slot="icon">edit</mx-icon>
      Elevated
    </ControlledSwitchButton>
    <ControlledSwitchButton color="tonal">
      <mx-icon slot="icon">edit</mx-icon>
      Tonal
    </ControlledSwitchButton>
    <ControlledSwitchButton color="outlined">
      <mx-icon slot="icon">edit</mx-icon>
      Outlined
    </ControlledSwitchButton>
  </>
);
