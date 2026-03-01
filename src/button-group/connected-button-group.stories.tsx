import type { Meta } from '@storybook/react-vite';
import { useState, type JSX } from 'react';
import '../button/button.ts';
import '../button/switch-icon-button.ts';
import '../icon/icon.ts';
import css from '../story.module.css';
import './connected-button-group.ts';

const meta: Meta = {
  title: 'Button Group/Connected',
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
  <mx-connected-button-group size="medium">
    <mx-button>Default</mx-button>
    <mx-button data-force="hovered">Hovered</mx-button>
    <mx-button data-force="focused">Focused</mx-button>
    <mx-button data-force="pressed">Pressed</mx-button>
    <mx-button disabled>Disabled</mx-button>
  </mx-connected-button-group>
);

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
    <mx-connected-button-group size="medium" value={selected}>
      <mx-switch-icon-button
        width="narrow"
        checked={selected === 'bluetooth'}
        value="bluetooth"
        onChange={() => setSelected('bluetooth')}
      >
        <mx-icon>bluetooth</mx-icon>
      </mx-switch-icon-button>
      <mx-switch-icon-button
        checked={selected === 'alarm'}
        value="alarm"
        onChange={() => setSelected('alarm')}
      >
        <mx-icon>alarm</mx-icon>
      </mx-switch-icon-button>
      <mx-switch-icon-button
        width="narrow"
        checked={selected === 'link'}
        value="link"
        onChange={() => setSelected('link')}
      >
        <mx-icon>link</mx-icon>
      </mx-switch-icon-button>
      <mx-switch-icon-button
        width="wide"
        checked={selected === 'wifi'}
        value="wifi"
        onChange={() => setSelected('wifi')}
      >
        <mx-icon>wifi</mx-icon>
      </mx-switch-icon-button>
    </mx-connected-button-group>
  );
};
