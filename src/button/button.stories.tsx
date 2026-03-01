import type { Meta } from '@storybook/react-vite';
import type { JSX } from 'react';
import '../icon/icon.ts';
import css from '../story.module.css';
import './button.ts';

const meta: Meta = {
  title: 'Button/Regular',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={css['layout2']}>
        <Component />
      </div>
    ),
  ],
};

export default meta;

export const States = (): JSX.Element => (
  <>
    <mx-button>Default</mx-button>
    <mx-button data-force="hovered">Hovered</mx-button>
    <mx-button data-force="focused">Focused</mx-button>
    <mx-button data-force="pressed">Pressed</mx-button>
    <mx-button disabled>Disabled</mx-button>
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

export const Color = (): JSX.Element => (
  <>
    <mx-button>Filled</mx-button>
    <mx-button color="elevated">Elevated</mx-button>
    <mx-button color="tonal">Tonal</mx-button>
    <mx-button color="outlined">Outlined</mx-button>
    <mx-button color="text">Text</mx-button>
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
