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
import './fab.ts';
import type { FABProperties } from './fab.ts';

const meta: Meta = {
  title: 'FAB',
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

export const Regular = (): JSX.Element => (
  <>
    <Row title="Color">
      <mx-fab>
        <mx-icon slot="icon">check</mx-icon>
      </mx-fab>
      <mx-fab color="primary">
        <mx-icon slot="icon">check</mx-icon>
      </mx-fab>
      <mx-fab color="secondary">
        <mx-icon slot="icon">check</mx-icon>
      </mx-fab>
    </Row>

    <Row title="Tonal Color">
      <mx-fab tonal>
        <mx-icon slot="icon">check</mx-icon>
      </mx-fab>
      <mx-fab tonal color="primary">
        <mx-icon slot="icon">check</mx-icon>
      </mx-fab>
      <mx-fab tonal color="secondary">
        <mx-icon slot="icon">check</mx-icon>
      </mx-fab>
    </Row>

    <Row title="Size">
      <mx-fab size="medium">
        <mx-icon slot="icon">check</mx-icon>
      </mx-fab>
      <mx-fab size="large">
        <mx-icon slot="icon">check</mx-icon>
      </mx-fab>
    </Row>
  </>
);

type ControlledFABExtendedProps = Omit<FABProperties, 'extended'> &
  Readonly<{
    className?: string;
    dir?: 'ltr' | 'rtl' | 'auto';
    style?: CSSProperties;
  }>;

function ControlledFABExtended({
  children,
  ...other
}: PropsWithChildren<ControlledFABExtendedProps>) {
  const [open, setOpen] = useState(false);
  const canHover =
    // oxlint-disable-next-line typescript/prefer-optional-chain
    typeof window !== 'undefined' &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  return (
    <mx-fab
      extended={open ? 'open' : 'closed'}
      onMouseEnter={canHover ? () => setOpen(true) : undefined}
      onMouseLeave={canHover ? () => setOpen(false) : undefined}
      onClick={!canHover ? () => setOpen((v) => !v) : undefined}
      {...other}
    >
      {children}
    </mx-fab>
  );
}

export const Extended = (): JSX.Element => (
  <>
    <Row title="Color">
      <ControlledFABExtended>
        <mx-icon slot="icon">check</mx-icon>
        Submit
      </ControlledFABExtended>
      <ControlledFABExtended color="primary">
        <mx-icon slot="icon">check</mx-icon>
        Submit
      </ControlledFABExtended>
      <ControlledFABExtended color="secondary">
        <mx-icon slot="icon">check</mx-icon>
        Submit
      </ControlledFABExtended>
    </Row>

    <Row title="Tonal Color">
      <ControlledFABExtended tonal>
        <mx-icon slot="icon">check</mx-icon>
        Submit
      </ControlledFABExtended>
      <ControlledFABExtended tonal color="primary">
        <mx-icon slot="icon">check</mx-icon>
        Submit
      </ControlledFABExtended>
      <ControlledFABExtended tonal color="secondary">
        <mx-icon slot="icon">check</mx-icon>
        Submit
      </ControlledFABExtended>
    </Row>

    <Row title="Size">
      <ControlledFABExtended tonal size="medium">
        <mx-icon slot="icon">check</mx-icon>
        Submit
      </ControlledFABExtended>
      <ControlledFABExtended tonal size="large">
        <mx-icon slot="icon">check</mx-icon>
        Submit
      </ControlledFABExtended>
    </Row>

    <Row title="Direction">
      <ControlledFABExtended>
        <mx-icon slot="icon">check</mx-icon>
        Submit
      </ControlledFABExtended>
      <ControlledFABExtended dir="rtl">
        <mx-icon slot="icon">check</mx-icon>
        ارسال
      </ControlledFABExtended>
      <ControlledFABExtended
        style={{
          writingMode: 'vertical-rl',
          textOrientation: 'upright',
        }}
      >
        <mx-icon slot="icon">check</mx-icon>
        送信
      </ControlledFABExtended>
    </Row>
  </>
);

export const Variants = (): JSX.Element => (
  <>
    <Regular />
    <Extended />
  </>
);

export const VariantsDark = (): JSX.Element => <Variants />;
VariantsDark.parameters = darkThemeParameters;

export const States = (): JSX.Element => (
  <Row title="States">
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
      <tbody>
        <tr>
          <th scope="row" style={stateCellStyle}>
            Standard
          </th>
          <td style={stateCellStyle}>
            <mx-fab>
              <mx-icon slot="icon">check</mx-icon>
            </mx-fab>
          </td>
          <td style={stateCellStyle}>
            <mx-fab data-force="hover">
              <mx-icon slot="icon">check</mx-icon>
            </mx-fab>
          </td>
          <td style={stateCellStyle}>
            <mx-fab data-force="active">
              <mx-icon slot="icon">check</mx-icon>
            </mx-fab>
          </td>
          <td style={stateCellStyle}>
            <mx-fab data-force="focus">
              <mx-icon slot="icon">check</mx-icon>
            </mx-fab>
          </td>
          <td style={stateCellStyle}>
            <mx-fab disabled>
              <mx-icon slot="icon">check</mx-icon>
            </mx-fab>
          </td>
        </tr>
        <tr>
          <th scope="row" style={stateCellStyle}>
            Extended
          </th>
          <td style={stateCellStyle}>
            <mx-fab extended="open">
              <mx-icon slot="icon">check</mx-icon>
              Compose
            </mx-fab>
          </td>
          <td style={stateCellStyle}>
            <mx-fab data-force="hover" extended="open">
              <mx-icon slot="icon">check</mx-icon>
              Compose
            </mx-fab>
          </td>
          <td style={stateCellStyle}>
            <mx-fab data-force="active" extended="open">
              <mx-icon slot="icon">check</mx-icon>
              Compose
            </mx-fab>
          </td>
          <td style={stateCellStyle}>
            <mx-fab data-force="focus" extended="open">
              <mx-icon slot="icon">check</mx-icon>
              Compose
            </mx-fab>
          </td>
          <td style={stateCellStyle}>
            <mx-fab disabled extended="open">
              <mx-icon slot="icon">check</mx-icon>
              Compose
            </mx-fab>
          </td>
        </tr>
      </tbody>
    </table>
  </Row>
);

export const StatesDark = (): JSX.Element => <States />;
StatesDark.parameters = darkThemeParameters;
