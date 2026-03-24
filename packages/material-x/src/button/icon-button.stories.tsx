import type { Meta } from '@storybook/react-vite';
import type { JSX } from 'react';
import '../icon/icon.ts';
import css from '../story.module.css';
import './icon-button.ts';

const meta: Meta = {
  title: 'Button/Icon',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={css['layout']}>
        <Component />
      </div>
    ),
  ],
};

export default meta;

export const States = (): JSX.Element => (
  <>
    <mx-icon-button>
      <mx-icon>wifi</mx-icon>
    </mx-icon-button>
    <mx-icon-button data-force="hovered">
      <mx-icon>bluetooth</mx-icon>
    </mx-icon-button>
    <mx-icon-button data-force="focused">
      <mx-icon>alarm</mx-icon>
    </mx-icon-button>
    <mx-icon-button data-force="pressed">
      <mx-icon>search</mx-icon>
    </mx-icon-button>
    <mx-icon-button disabled>
      <mx-icon>play_arrow</mx-icon>
    </mx-icon-button>
  </>
);

export const Sizes = (): JSX.Element => (
  <>
    <mx-icon-button size="xsmall">
      <mx-icon>wifi</mx-icon>
    </mx-icon-button>
    <mx-icon-button>
      <mx-icon>bluetooth</mx-icon>
    </mx-icon-button>
    <mx-icon-button size="medium">
      <mx-icon>alarm</mx-icon>
    </mx-icon-button>
    <mx-icon-button size="large">
      <mx-icon>search</mx-icon>
    </mx-icon-button>
    <mx-icon-button size="xlarge">
      <mx-icon>favorite</mx-icon>
    </mx-icon-button>
  </>
);

export const Shape = (): JSX.Element => (
  <>
    <mx-icon-button>
      <mx-icon>favorite</mx-icon>
    </mx-icon-button>
    <mx-icon-button shape="square">
      <mx-icon>search</mx-icon>
    </mx-icon-button>
  </>
);

export const Color = (): JSX.Element => (
  <>
    <mx-icon-button>
      <mx-icon>wifi</mx-icon>
    </mx-icon-button>
    <mx-icon-button color="elevated">
      <mx-icon>bluetooth</mx-icon>
    </mx-icon-button>
    <mx-icon-button color="tonal">
      <mx-icon>alarm</mx-icon>
    </mx-icon-button>
    <mx-icon-button color="outlined">
      <mx-icon>search</mx-icon>
    </mx-icon-button>
    <mx-icon-button color="standard">
      <mx-icon>favorite</mx-icon>
    </mx-icon-button>
  </>
);

export const Width = (): JSX.Element => (
  <>
    <mx-icon-button width="wide">
      <mx-icon>favorite</mx-icon>
    </mx-icon-button>
    <mx-icon-button width="narrow">
      <mx-icon>search</mx-icon>
    </mx-icon-button>
  </>
);
