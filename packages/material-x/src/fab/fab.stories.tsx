import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX } from 'react';
import '../icon/icon.ts';
import css from '../story.module.css';
// oxlint-disable-next-line import/no-duplicates
import './fab.ts';
import type { FABColor, FABSize } from './fab.ts';

const meta: Meta = {
  title: 'FAB / Regular',
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
  color: FABColor | 'tertiary';
  size: FABSize;
  tonal: boolean;
  icon: string;
  disabled: boolean;
}>;

export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    color: 'tertiary',
    size: 'medium',
    tonal: false,
    icon: 'check',
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
    icon: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
  },
  render({ color, size, tonal, icon, disabled }) {
    return (
      <mx-fab
        color={color === 'tertiary' ? undefined : color}
        size={size === 'medium' ? undefined : size}
        tonal={tonal}
        disabled={disabled}
      >
        <mx-icon slot="icon">{icon}</mx-icon>
      </mx-fab>
    );
  },
};

export const States = (): JSX.Element => (
  <>
    <mx-fab color="primary">
      <mx-icon slot="icon">check</mx-icon>
    </mx-fab>
    <mx-fab color="primary" data-force="hovered">
      <mx-icon slot="icon">check</mx-icon>
    </mx-fab>
    <mx-fab color="primary" data-force="focused">
      <mx-icon slot="icon">check</mx-icon>
    </mx-fab>
    <mx-fab color="primary" data-force="pressed">
      <mx-icon slot="icon">check</mx-icon>
    </mx-fab>
  </>
);

export const Colors = (): JSX.Element => (
  <>
    <mx-fab>
      <mx-icon slot="icon">check</mx-icon>
    </mx-fab>
    <mx-fab color="primary">
      <mx-icon slot="icon">check</mx-icon>
    </mx-fab>
    <mx-fab color="secondary">
      <mx-icon slot="icon">check</mx-icon>
    </mx-fab>
  </>
);

export const TonalColors = (): JSX.Element => (
  <>
    <mx-fab tonal>
      <mx-icon slot="icon">check</mx-icon>
    </mx-fab>
    <mx-fab tonal color="primary">
      <mx-icon slot="icon">check</mx-icon>
    </mx-fab>
    <mx-fab tonal color="secondary">
      <mx-icon slot="icon">check</mx-icon>
    </mx-fab>
  </>
);

export const Sizes = (): JSX.Element => (
  <>
    <mx-fab size="medium">
      <mx-icon slot="icon">check</mx-icon>
    </mx-fab>
    <mx-fab size="large">
      <mx-icon slot="icon">check</mx-icon>
    </mx-fab>
  </>
);
