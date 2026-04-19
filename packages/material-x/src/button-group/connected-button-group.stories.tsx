import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, type ChangeEvent, type JSX } from 'react';
import '../button/button.ts';
import type {
  ButtonColor,
  ButtonShape,
  ButtonSize,
} from '../button/ButtonCore.ts';
import '../button/switch-button.ts';
import '../button/switch-icon-button.ts';
import type SwitchIconButton from '../button/switch-icon-button.ts';
import '../icon/icon.ts';
import css from '../story.module.css';
import './connected-button-group.ts';
import type ConnectedButtonGroup from './connected-button-group.ts';

const meta: Meta = {
  title: 'Button Group/Connected',
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
    const [selected, setSelected] = useState<string | undefined>();

    return (
      <mx-connected-button-group
        color={color === 'filled' ? undefined : color}
        size={size === 'small' ? undefined : size}
        shape={shape === 'round' ? undefined : shape}
        disabled={disabled}
        value={selected}
        onChange={(e: ChangeEvent<ConnectedButtonGroup, SwitchIconButton>) =>
          setSelected(e.target.value ?? undefined)
        }
      >
        <mx-switch-button value="day">Day</mx-switch-button>
        <mx-switch-button value="week">Week</mx-switch-button>
        <mx-switch-button value="month">Month</mx-switch-button>
      </mx-connected-button-group>
    );
  },
};

export const Sizes = (): JSX.Element => (
  <>
    <mx-connected-button-group size="xsmall">
      <mx-button>Button 1</mx-button>
      <mx-button>Button 2</mx-button>
      <mx-button>Button 3</mx-button>
    </mx-connected-button-group>

    <mx-connected-button-group>
      <mx-button>Button 1</mx-button>
      <mx-button>Button 2</mx-button>
      <mx-button>Button 3</mx-button>
    </mx-connected-button-group>

    <mx-connected-button-group size="medium">
      <mx-button>Button 1</mx-button>
      <mx-button>Button 2</mx-button>
      <mx-button>Button 3</mx-button>
    </mx-connected-button-group>

    <mx-connected-button-group size="large">
      <mx-button>Button 1</mx-button>
      <mx-button>Button 2</mx-button>
      <mx-button>Button 3</mx-button>
    </mx-connected-button-group>

    <mx-connected-button-group size="xlarge">
      <mx-button>Button 1</mx-button>
      <mx-button>Button 2</mx-button>
      <mx-button>Button 3</mx-button>
    </mx-connected-button-group>
  </>
);

export const Switch = (): JSX.Element => {
  const [selected, setSelected] = useState<string | undefined>();

  return (
    <mx-connected-button-group
      size="medium"
      value={selected}
      onChange={({
        target,
      }: ChangeEvent<ConnectedButtonGroup, SwitchIconButton>) =>
        setSelected(target.value ?? undefined)
      }
    >
      <mx-switch-icon-button width="narrow" value="bluetooth">
        <mx-icon>bluetooth</mx-icon>
      </mx-switch-icon-button>
      <mx-switch-icon-button value="alarm">
        <mx-icon>alarm</mx-icon>
      </mx-switch-icon-button>
      <mx-switch-icon-button width="narrow" value="link">
        <mx-icon>link</mx-icon>
      </mx-switch-icon-button>
      <mx-switch-icon-button width="wide" value="wifi">
        <mx-icon>wifi</mx-icon>
      </mx-switch-icon-button>
    </mx-connected-button-group>
  );
};
