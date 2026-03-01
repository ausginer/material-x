import type { Meta } from '@storybook/react-vite';
import {
  useState,
  type CSSProperties,
  type FC,
  type JSX,
  type PropsWithChildren,
} from 'react';
import '../icon/icon.ts';
import css from '../story.module.css';
import './button.ts';
import './icon-button.ts';
import './link-button.ts';
import './switch-button.ts';
import './switch-icon-button.ts';
import './split-button.ts';
import type { SplitButtonProperties } from './split-button.ts';
import type { SwitchButtonProperties } from './switch-button.ts';
import type { SwitchIconButtonProperties } from './switch-icon-button.ts';

const meta: Meta = {
  title: 'Button',
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
  <div className={css['row']}>
    <header>
      <h3>{title}</h3>
    </header>
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
  <Row title={title}>
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
  </Row>
);

export const Regular = (): JSX.Element => (
  <>
    <Row title="Size">
      <mx-button size="xsmall">Extra small</mx-button>
      <mx-button>Small</mx-button>
      <mx-button size="medium">Medium</mx-button>
      <mx-button size="large">Large</mx-button>
      <mx-button size="xlarge">Extra large</mx-button>
    </Row>

    <Row title="Shape">
      <mx-button>Round</mx-button>
      <mx-button shape="square">Square</mx-button>
    </Row>

    <Row title="Color">
      <mx-button>Filled</mx-button>
      <mx-button color="elevated">Elevated</mx-button>
      <mx-button color="tonal">Tonal</mx-button>
      <mx-button color="outlined">Outlined</mx-button>
      <mx-button color="text">Text</mx-button>
    </Row>

    <Row title="With Icon">
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
    </Row>

    <Row title="Misc">
      <mx-button disabled>Disabled</mx-button>
    </Row>
  </>
);

const HREF = 'https://m3.material.io/components/buttons/overview';
const TARGET = '_blank';

export const Link = (): JSX.Element => (
  <>
    <Row title="Size">
      <mx-link-button href={HREF} size="xsmall" target={TARGET}>
        Extra small
      </mx-link-button>
      <mx-link-button href={HREF} target={TARGET}>
        Small
      </mx-link-button>
      <mx-link-button href={HREF} size="medium" target={TARGET}>
        Medium
      </mx-link-button>
      <mx-link-button href={HREF} size="large" target={TARGET}>
        Large
      </mx-link-button>
      <mx-link-button href={HREF} size="xlarge" target={TARGET}>
        Extra large
      </mx-link-button>
    </Row>

    <Row title="Shape">
      <mx-link-button href={HREF} target={TARGET}>
        Round
      </mx-link-button>
      <mx-link-button href={HREF} shape="square" target={TARGET}>
        Square
      </mx-link-button>
    </Row>

    <Row title="Color">
      <mx-link-button href={HREF} target={TARGET}>
        Filled
      </mx-link-button>
      <mx-link-button color="elevated" href={HREF} target={TARGET}>
        Elevated
      </mx-link-button>
      <mx-link-button color="tonal" href={HREF} target={TARGET}>
        Tonal
      </mx-link-button>
      <mx-link-button color="outlined" href={HREF} target={TARGET}>
        Outlined
      </mx-link-button>
      <mx-link-button color="text" href={HREF} target={TARGET}>
        Text
      </mx-link-button>
    </Row>

    <Row title="With Icon">
      <mx-link-button href={HREF} target={TARGET}>
        <mx-icon slot="icon">edit</mx-icon>
        Filled
      </mx-link-button>
      <mx-link-button color="elevated" href={HREF} target={TARGET}>
        <mx-icon slot="icon">edit</mx-icon>
        Elevated
      </mx-link-button>
      <mx-link-button color="tonal" href={HREF} target={TARGET}>
        <mx-icon slot="icon">edit</mx-icon>
        Tonal
      </mx-link-button>
      <mx-link-button color="outlined" href={HREF} target={TARGET}>
        <mx-icon slot="icon">edit</mx-icon>
        Outlined
      </mx-link-button>
      <mx-link-button color="text" href={HREF} target={TARGET}>
        <mx-icon slot="icon">edit</mx-icon>
        Text
      </mx-link-button>
    </Row>

    <Row title="Misc">
      <mx-link-button disabled href={HREF} target={TARGET}>
        Disabled
      </mx-link-button>
    </Row>
  </>
);

export const Icon = (): JSX.Element => (
  <>
    <Row title="Size">
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
    </Row>

    <Row title="Shape">
      <mx-icon-button>
        <mx-icon>favorite</mx-icon>
      </mx-icon-button>
      <mx-icon-button shape="square">
        <mx-icon>search</mx-icon>
      </mx-icon-button>
    </Row>

    <Row title="Color">
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
    </Row>

    <Row title="Width">
      <mx-icon-button width="wide">
        <mx-icon>favorite</mx-icon>
      </mx-icon-button>
      <mx-icon-button width="narrow">
        <mx-icon>search</mx-icon>
      </mx-icon-button>
    </Row>

    <Row title="Misc">
      <mx-icon-button disabled>
        <mx-icon>play_arrow</mx-icon>
      </mx-icon-button>
    </Row>
  </>
);

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

export const Switch = (): JSX.Element => (
  <>
    <Row title="Size">
      <ControlledSwitchButton size="xsmall">Extra small</ControlledSwitchButton>
      <ControlledSwitchButton>Small</ControlledSwitchButton>
      <ControlledSwitchButton size="medium">Medium</ControlledSwitchButton>
      <ControlledSwitchButton size="large">Large</ControlledSwitchButton>
      <ControlledSwitchButton size="xlarge">Extra large</ControlledSwitchButton>
    </Row>

    <Row title="Shape">
      <ControlledSwitchButton color="outlined">Round</ControlledSwitchButton>
      <ControlledSwitchButton color="outlined" shape="square">
        Square
      </ControlledSwitchButton>
    </Row>

    <Row title="Color">
      <ControlledSwitchButton>Filled</ControlledSwitchButton>
      <ControlledSwitchButton color="elevated">Elevated</ControlledSwitchButton>
      <ControlledSwitchButton color="tonal">Tonal</ControlledSwitchButton>
      <ControlledSwitchButton color="outlined">Outlined</ControlledSwitchButton>
    </Row>

    <Row title="With Icon">
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
    </Row>

    <Row title="Misc">
      <ControlledSwitchButton disabled>Disabled</ControlledSwitchButton>
    </Row>
  </>
);

function ControlledSwitchIconButton(
  props: PropsWithChildren<SwitchIconButtonProperties>,
) {
  const [state, setState] = useState(false);

  return (
    <mx-switch-icon-button
      checked={state}
      onChange={() => {
        setState(!state);
      }}
      {...props}
    />
  );
}

export const SwitchIcon = (): JSX.Element => (
  <>
    <Row title="Size">
      <ControlledSwitchIconButton size="xsmall">
        <mx-icon>wifi</mx-icon>
      </ControlledSwitchIconButton>
      <ControlledSwitchIconButton>
        <mx-icon>bluetooth</mx-icon>
      </ControlledSwitchIconButton>
      <ControlledSwitchIconButton size="medium">
        <mx-icon>alarm</mx-icon>
      </ControlledSwitchIconButton>
      <ControlledSwitchIconButton size="large">
        <mx-icon>search</mx-icon>
      </ControlledSwitchIconButton>
      <ControlledSwitchIconButton size="xlarge">
        <mx-icon>favorite</mx-icon>
      </ControlledSwitchIconButton>
    </Row>

    <Row title="Shape">
      <ControlledSwitchIconButton>
        <mx-icon>favorite</mx-icon>
      </ControlledSwitchIconButton>
      <ControlledSwitchIconButton shape="square">
        <mx-icon>search</mx-icon>
      </ControlledSwitchIconButton>
    </Row>

    <Row title="Color">
      <ControlledSwitchIconButton>
        <mx-icon>wifi</mx-icon>
      </ControlledSwitchIconButton>
      <ControlledSwitchIconButton color="elevated">
        <mx-icon>bluetooth</mx-icon>
      </ControlledSwitchIconButton>
      <ControlledSwitchIconButton color="tonal">
        <mx-icon>alarm</mx-icon>
      </ControlledSwitchIconButton>
      <ControlledSwitchIconButton color="outlined">
        <mx-icon>search</mx-icon>
      </ControlledSwitchIconButton>
      <ControlledSwitchIconButton color="standard">
        <mx-icon>favorite</mx-icon>
      </ControlledSwitchIconButton>
    </Row>

    <Row title="Size">
      <ControlledSwitchIconButton width="wide">
        <mx-icon>favorite</mx-icon>
      </ControlledSwitchIconButton>
      <ControlledSwitchIconButton width="narrow">
        <mx-icon>search</mx-icon>
      </ControlledSwitchIconButton>
    </Row>

    <Row title="Size">
      <ControlledSwitchIconButton disabled>
        <mx-icon>play_arrow</mx-icon>
      </ControlledSwitchIconButton>
    </Row>
  </>
);

function ControlledSplitButton(
  props: PropsWithChildren<SplitButtonProperties>,
) {
  const [open, setOpen] = useState(false);

  return (
    <mx-split-button open={open} ontoggle={() => setOpen(!open)} {...props} />
  );
}

export const Split = (): JSX.Element => (
  <>
    <Row title="Size">
      <ControlledSplitButton size="xsmall">Extra small</ControlledSplitButton>
      <ControlledSplitButton>Small</ControlledSplitButton>
      <ControlledSplitButton size="medium">Medium</ControlledSplitButton>
      <ControlledSplitButton size="large">Large</ControlledSplitButton>
      <ControlledSplitButton size="xlarge">Extra large</ControlledSplitButton>
    </Row>

    <Row title="Shape">
      <ControlledSplitButton>Round</ControlledSplitButton>
      <ControlledSplitButton shape="square">Square</ControlledSplitButton>
    </Row>

    <Row title="Color">
      <ControlledSplitButton>Filled</ControlledSplitButton>
      <ControlledSplitButton color="elevated">Elevated</ControlledSplitButton>
      <ControlledSplitButton color="tonal">Tonal</ControlledSplitButton>
      <ControlledSplitButton color="outlined">Outlined</ControlledSplitButton>
      <ControlledSplitButton color="text">Text</ControlledSplitButton>
    </Row>

    <Row title="With Icon">
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
    </Row>

    <Row title="Misc">
      <ControlledSplitButton disabled>Disabled</ControlledSplitButton>
    </Row>
  </>
);

export const ButtonVariants = (): JSX.Element => <Regular />;

export const ButtonVariantsDark = (): JSX.Element => <Regular />;
ButtonVariantsDark.parameters = darkThemeParameters;

export const ButtonStates = (): JSX.Element => (
  <StateTable title="Button States">
    <tr>
      <th scope="row" style={stateCellStyle}>
        Filled
      </th>
      <td style={stateCellStyle}>
        <mx-button>Action</mx-button>
      </td>
      <td style={stateCellStyle}>
        <mx-button data-force="hover">Action</mx-button>
      </td>
      <td style={stateCellStyle}>
        <mx-button data-force="active">Action</mx-button>
      </td>
      <td style={stateCellStyle}>
        <mx-button data-force="focus">Action</mx-button>
      </td>
      <td style={stateCellStyle}>
        <mx-button disabled>Action</mx-button>
      </td>
    </tr>
  </StateTable>
);

export const ButtonStatesDark = (): JSX.Element => <ButtonStates />;
ButtonStatesDark.parameters = darkThemeParameters;

export const LinkButtonVariants = (): JSX.Element => <Link />;

export const LinkButtonVariantsDark = (): JSX.Element => <Link />;
LinkButtonVariantsDark.parameters = darkThemeParameters;

export const LinkButtonStates = (): JSX.Element => (
  <StateTable title="Link Button States">
    <tr>
      <th scope="row" style={stateCellStyle}>
        Filled
      </th>
      <td style={stateCellStyle}>
        <mx-link-button href={HREF} target={TARGET}>
          Action
        </mx-link-button>
      </td>
      <td style={stateCellStyle}>
        <mx-link-button data-force="hover" href={HREF} target={TARGET}>
          Action
        </mx-link-button>
      </td>
      <td style={stateCellStyle}>
        <mx-link-button data-force="active" href={HREF} target={TARGET}>
          Action
        </mx-link-button>
      </td>
      <td style={stateCellStyle}>
        <mx-link-button data-force="focus" href={HREF} target={TARGET}>
          Action
        </mx-link-button>
      </td>
      <td style={stateCellStyle}>
        <mx-link-button disabled href={HREF} target={TARGET}>
          Action
        </mx-link-button>
      </td>
    </tr>
  </StateTable>
);

export const LinkButtonStatesDark = (): JSX.Element => <LinkButtonStates />;
LinkButtonStatesDark.parameters = darkThemeParameters;

export const IconButtonVariants = (): JSX.Element => <Icon />;

export const IconButtonVariantsDark = (): JSX.Element => <Icon />;
IconButtonVariantsDark.parameters = darkThemeParameters;

export const IconButtonStates = (): JSX.Element => (
  <StateTable title="Icon Button States">
    <tr>
      <th scope="row" style={stateCellStyle}>
        Standard
      </th>
      <td style={stateCellStyle}>
        <mx-icon-button>
          <mx-icon>search</mx-icon>
        </mx-icon-button>
      </td>
      <td style={stateCellStyle}>
        <mx-icon-button data-force="hover">
          <mx-icon>search</mx-icon>
        </mx-icon-button>
      </td>
      <td style={stateCellStyle}>
        <mx-icon-button data-force="active">
          <mx-icon>search</mx-icon>
        </mx-icon-button>
      </td>
      <td style={stateCellStyle}>
        <mx-icon-button data-force="focus">
          <mx-icon>search</mx-icon>
        </mx-icon-button>
      </td>
      <td style={stateCellStyle}>
        <mx-icon-button disabled>
          <mx-icon>search</mx-icon>
        </mx-icon-button>
      </td>
    </tr>
  </StateTable>
);

export const IconButtonStatesDark = (): JSX.Element => <IconButtonStates />;
IconButtonStatesDark.parameters = darkThemeParameters;

export const SwitchButtonVariants = (): JSX.Element => <Switch />;

export const SwitchButtonVariantsDark = (): JSX.Element => <Switch />;
SwitchButtonVariantsDark.parameters = darkThemeParameters;

export const SwitchButtonStates = (): JSX.Element => (
  <StateTable title="Switch Button States">
    <tr>
      <th scope="row" style={stateCellStyle}>
        Filled
      </th>
      <td style={stateCellStyle}>
        <mx-switch-button checked>Toggle</mx-switch-button>
      </td>
      <td style={stateCellStyle}>
        <mx-switch-button checked data-force="hover">
          Toggle
        </mx-switch-button>
      </td>
      <td style={stateCellStyle}>
        <mx-switch-button checked data-force="active">
          Toggle
        </mx-switch-button>
      </td>
      <td style={stateCellStyle}>
        <mx-switch-button checked data-force="focus">
          Toggle
        </mx-switch-button>
      </td>
      <td style={stateCellStyle}>
        <mx-switch-button checked disabled>
          Toggle
        </mx-switch-button>
      </td>
    </tr>
  </StateTable>
);

export const SwitchButtonStatesDark = (): JSX.Element => <SwitchButtonStates />;
SwitchButtonStatesDark.parameters = darkThemeParameters;

export const SwitchIconButtonVariants = (): JSX.Element => <SwitchIcon />;

export const SwitchIconButtonVariantsDark = (): JSX.Element => <SwitchIcon />;
SwitchIconButtonVariantsDark.parameters = darkThemeParameters;

export const SwitchIconButtonStates = (): JSX.Element => (
  <StateTable title="Switch Icon Button States">
    <tr>
      <th scope="row" style={stateCellStyle}>
        Standard
      </th>
      <td style={stateCellStyle}>
        <mx-switch-icon-button checked>
          <mx-icon>favorite</mx-icon>
        </mx-switch-icon-button>
      </td>
      <td style={stateCellStyle}>
        <mx-switch-icon-button checked data-force="hover">
          <mx-icon>favorite</mx-icon>
        </mx-switch-icon-button>
      </td>
      <td style={stateCellStyle}>
        <mx-switch-icon-button checked data-force="active">
          <mx-icon>favorite</mx-icon>
        </mx-switch-icon-button>
      </td>
      <td style={stateCellStyle}>
        <mx-switch-icon-button checked data-force="focus">
          <mx-icon>favorite</mx-icon>
        </mx-switch-icon-button>
      </td>
      <td style={stateCellStyle}>
        <mx-switch-icon-button checked disabled>
          <mx-icon>favorite</mx-icon>
        </mx-switch-icon-button>
      </td>
    </tr>
  </StateTable>
);

export const SwitchIconButtonStatesDark = (): JSX.Element => (
  <SwitchIconButtonStates />
);
SwitchIconButtonStatesDark.parameters = darkThemeParameters;

export const SplitButtonVariants = (): JSX.Element => <Split />;

export const SplitButtonVariantsDark = (): JSX.Element => <Split />;
SplitButtonVariantsDark.parameters = darkThemeParameters;

export const SplitButtonStates = (): JSX.Element => (
  <StateTable title="Split Button States">
    <tr>
      <th scope="row" style={stateCellStyle}>
        Filled
      </th>
      <td style={stateCellStyle}>
        <mx-split-button>Action</mx-split-button>
      </td>
      <td style={stateCellStyle}>
        <mx-split-button data-force="hover">Action</mx-split-button>
      </td>
      <td style={stateCellStyle}>
        <mx-split-button data-force="active">Action</mx-split-button>
      </td>
      <td style={stateCellStyle}>
        <mx-split-button data-force="focus">Action</mx-split-button>
      </td>
      <td style={stateCellStyle}>
        <mx-split-button disabled>Action</mx-split-button>
      </td>
    </tr>
  </StateTable>
);

export const SplitButtonStatesDark = (): JSX.Element => <SplitButtonStates />;
SplitButtonStatesDark.parameters = darkThemeParameters;
