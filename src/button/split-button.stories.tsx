import type { Meta } from '@storybook/react-vite';
import { useState, type JSX, type PropsWithChildren } from 'react';
import '../icon/icon.ts';
import css from '../story.module.css';
import './split-button.ts';
import type { SplitButtonProperties } from './split-button.ts';

const meta: Meta = {
  title: 'Button/Split',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={css['layout2']}>
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
