import type { Meta } from '@storybook/react-vite';
import {
  useState,
  type CSSProperties,
  type FC,
  type JSX,
  type PropsWithChildren,
} from 'react';
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

const darkThemeParameters = {
  themes: { themeOverride: 'dark' },
} as const;

type RowProps = Readonly<
  PropsWithChildren<{
    title?: string;
  }>
>;

const Row: FC<RowProps> = ({ title, children }) => (
  <div className={`${css['row']} ${css['group-of-elements']}`}>
    {title ? (
      <header>
        <h3>{title}</h3>
      </header>
    ) : null}
    <section>{children}</section>
  </div>
);

const stateTableStyle: CSSProperties = {
  borderCollapse: 'collapse',
  minWidth: 'min(100%, 740px)',
};

const stateCellStyle: CSSProperties = {
  borderBottom:
    '1px solid color-mix(in srgb, var(--md-sys-color-outline) 28%, transparent)',
  padding: '8px 12px',
  textAlign: 'left',
  verticalAlign: 'middle',
};

type StateTableProps = Readonly<
  PropsWithChildren<{
    title: string;
  }>
>;

const StateTable: FC<StateTableProps> = ({ title, children }) => (
  <div className={css['row']}>
    <header>
      <h3>{title}</h3>
    </header>
    <section>
      <table style={stateTableStyle}>
        <thead>
          <tr>
            <th style={stateCellStyle}>Variant</th>
            <th style={stateCellStyle}>Default</th>
            <th style={stateCellStyle}>Hover</th>
            <th style={stateCellStyle}>Active</th>
            <th style={stateCellStyle}>Focus</th>
            <th style={stateCellStyle}>Disabled</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </section>
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

export const ButtonGroupVariants = (): JSX.Element => <Regular />;

export const ButtonGroupVariantsDark = (): JSX.Element => <Regular />;
ButtonGroupVariantsDark.parameters = darkThemeParameters;

export const ButtonGroupStates = (): JSX.Element => (
  <StateTable title="Button Group States">
    <tr>
      <th scope="row" style={stateCellStyle}>
        Group
      </th>
      <td style={stateCellStyle}>
        <mx-button-group size="medium">
          <mx-button>One</mx-button>
          <mx-button>Two</mx-button>
          <mx-button>Three</mx-button>
        </mx-button-group>
      </td>
      <td style={stateCellStyle}>
        <mx-button-group size="medium">
          <mx-button data-force="hover">One</mx-button>
          <mx-button>Two</mx-button>
          <mx-button>Three</mx-button>
        </mx-button-group>
      </td>
      <td style={stateCellStyle}>
        <mx-button-group size="medium">
          <mx-button data-force="active">One</mx-button>
          <mx-button>Two</mx-button>
          <mx-button>Three</mx-button>
        </mx-button-group>
      </td>
      <td style={stateCellStyle}>
        <mx-button-group size="medium">
          <mx-button data-force="focus">One</mx-button>
          <mx-button>Two</mx-button>
          <mx-button>Three</mx-button>
        </mx-button-group>
      </td>
      <td style={stateCellStyle}>
        <mx-button-group size="medium">
          <mx-button disabled>One</mx-button>
          <mx-button>Two</mx-button>
          <mx-button>Three</mx-button>
        </mx-button-group>
      </td>
    </tr>
  </StateTable>
);

export const ButtonGroupStatesDark = (): JSX.Element => <ButtonGroupStates />;
ButtonGroupStatesDark.parameters = darkThemeParameters;

export const ConnectedButtonGroupVariants = (): JSX.Element => <Connected />;

export const ConnectedButtonGroupVariantsDark = (): JSX.Element => (
  <Connected />
);
ConnectedButtonGroupVariantsDark.parameters = darkThemeParameters;

export const ConnectedButtonGroupStates = (): JSX.Element => (
  <StateTable title="Connected Button Group States">
    <tr>
      <th scope="row" style={stateCellStyle}>
        Group
      </th>
      <td style={stateCellStyle}>
        <mx-connected-button-group size="medium" value="one">
          <mx-switch-icon-button checked value="one">
            <mx-icon>wifi</mx-icon>
          </mx-switch-icon-button>
          <mx-switch-icon-button value="two">
            <mx-icon>bluetooth</mx-icon>
          </mx-switch-icon-button>
          <mx-switch-icon-button value="three">
            <mx-icon>alarm</mx-icon>
          </mx-switch-icon-button>
        </mx-connected-button-group>
      </td>
      <td style={stateCellStyle}>
        <mx-connected-button-group size="medium" value="one">
          <mx-switch-icon-button checked data-force="hover" value="one">
            <mx-icon>wifi</mx-icon>
          </mx-switch-icon-button>
          <mx-switch-icon-button value="two">
            <mx-icon>bluetooth</mx-icon>
          </mx-switch-icon-button>
          <mx-switch-icon-button value="three">
            <mx-icon>alarm</mx-icon>
          </mx-switch-icon-button>
        </mx-connected-button-group>
      </td>
      <td style={stateCellStyle}>
        <mx-connected-button-group size="medium" value="one">
          <mx-switch-icon-button checked data-force="active" value="one">
            <mx-icon>wifi</mx-icon>
          </mx-switch-icon-button>
          <mx-switch-icon-button value="two">
            <mx-icon>bluetooth</mx-icon>
          </mx-switch-icon-button>
          <mx-switch-icon-button value="three">
            <mx-icon>alarm</mx-icon>
          </mx-switch-icon-button>
        </mx-connected-button-group>
      </td>
      <td style={stateCellStyle}>
        <mx-connected-button-group size="medium" value="one">
          <mx-switch-icon-button checked data-force="focus" value="one">
            <mx-icon>wifi</mx-icon>
          </mx-switch-icon-button>
          <mx-switch-icon-button value="two">
            <mx-icon>bluetooth</mx-icon>
          </mx-switch-icon-button>
          <mx-switch-icon-button value="three">
            <mx-icon>alarm</mx-icon>
          </mx-switch-icon-button>
        </mx-connected-button-group>
      </td>
      <td style={stateCellStyle}>
        <mx-connected-button-group size="medium" value="one">
          <mx-switch-icon-button checked disabled value="one">
            <mx-icon>wifi</mx-icon>
          </mx-switch-icon-button>
          <mx-switch-icon-button value="two">
            <mx-icon>bluetooth</mx-icon>
          </mx-switch-icon-button>
          <mx-switch-icon-button value="three">
            <mx-icon>alarm</mx-icon>
          </mx-switch-icon-button>
        </mx-connected-button-group>
      </td>
    </tr>
  </StateTable>
);

export const ConnectedButtonGroupStatesDark = (): JSX.Element => (
  <ConnectedButtonGroupStates />
);
ConnectedButtonGroupStatesDark.parameters = darkThemeParameters;
