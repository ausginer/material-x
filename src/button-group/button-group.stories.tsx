import type { Meta } from '@storybook/react-vite';
import { useState, type FC, type JSX, type PropsWithChildren } from 'react';
import '../button/button.ts';
import '../button/switch-icon-button.ts';
import '../icon/icon.ts';
import css from '../story.module.css';
import './button-group.ts';
import './connected-button-group.ts';

const meta: Meta = {
  title: 'Button Group',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={css['layout']}>
        <Component />
      </div>
    ),
  ],
};

export default meta;

type RowProps = Readonly<
  PropsWithChildren<{
    title?: string;
  }>
>;

const Row: FC<RowProps> = ({ children }) => (
  <div className={`${css['row']} ${css['group-of-elements']}`}>
    <section>{children}</section>
  </div>
);

export const Regular = (): JSX.Element => (
  <>
    <Row title="Size">
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
    </Row>
  </>
);

export const Connected = (): JSX.Element => (
  <>
    <Row title="Size">
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
    </Row>
  </>
);

export const Switch = (): JSX.Element => {
  const [selected, setSelected] = useState<string | undefined>();

  return (
    <>
      <Row title="Switch">
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
      </Row>
    </>
  );
};

export const ConnectedSwitch = (): JSX.Element => {
  const [selected, setSelected] = useState<string | undefined>();

  return (
    <Row title="Switch">
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
    </Row>
  );
};
