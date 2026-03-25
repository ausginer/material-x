import type { Meta } from '@storybook/react-vite';
import type { JSX } from 'react';
import '../icon/icon.ts';
import css from '../story.module.css';
import './fab.ts';

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
