import type { Meta } from '@storybook/react-vite';
import type { CSSProperties, JSX } from 'react';
import '../icon/icon.ts';
import './text-field.ts';
import css from './text-field.story.module.css';

const meta: Meta = {
  title: 'Text Field',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div
        className={css['layout']}
        onKeyDown={(ev) => {
          ev.stopPropagation();
        }}
      >
        <Component />
      </div>
    ),
  ],
};

export default meta;

const darkThemeParameters = {
  themes: { themeOverride: 'dark' },
} as const;

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

const filledInputValue = 'Input';
const filledPrefixValue = '1.43';
const filledSuffixValue = '25';

export const Filled = (): JSX.Element => (
  <>
    <mx-text-field>
      <div slot="label">Label</div>
      <div slot="support">Supporting text</div>
    </mx-text-field>
    <mx-text-field value={filledInputValue}>
      <div slot="label">Label</div>
      <div slot="support">Supporting text</div>
    </mx-text-field>

    <mx-text-field>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field value={filledInputValue}>
      <div slot="label">Label</div>
      <mx-icon slot="trail">cancel</mx-icon>
    </mx-text-field>

    <mx-text-field>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field value={filledInputValue}>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
    </mx-text-field>

    <mx-text-field>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field value={filledInputValue}>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
      <mx-icon slot="trail">cancel</mx-icon>
    </mx-text-field>

    <mx-text-field>
      <div slot="label">Label</div>
      <span slot="prefix">$</span>
    </mx-text-field>
    <mx-text-field value={filledPrefixValue}>
      <div slot="label">Label</div>
      <span slot="prefix">$</span>
    </mx-text-field>

    <mx-text-field>
      <div slot="label">Label</div>
      <span slot="suffix">lbs</span>
    </mx-text-field>
    <mx-text-field value={filledSuffixValue}>
      <div slot="label">Label</div>
      <span slot="suffix">lbs</span>
    </mx-text-field>
  </>
);

export const Outlined = (): JSX.Element => (
  <>
    <mx-text-field outlined>
      <div slot="label">Label</div>
      <div slot="support">Supporting text</div>
    </mx-text-field>
    <mx-text-field outlined value={filledInputValue}>
      <div slot="label">Label</div>
      <div slot="support">Supporting text</div>
    </mx-text-field>

    <mx-text-field outlined>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field outlined value={filledInputValue}>
      <div slot="label">Label</div>
      <mx-icon slot="trail">cancel</mx-icon>
    </mx-text-field>

    <mx-text-field outlined>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field outlined value={filledInputValue}>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
    </mx-text-field>

    <mx-text-field outlined>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field outlined value={filledInputValue}>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
      <mx-icon slot="trail">cancel</mx-icon>
    </mx-text-field>

    <mx-text-field outlined>
      <div slot="label">Label</div>
      <span slot="prefix">$</span>
    </mx-text-field>
    <mx-text-field outlined value={filledPrefixValue}>
      <div slot="label">Label</div>
      <span slot="prefix">$</span>
    </mx-text-field>

    <mx-text-field outlined>
      <div slot="label">Label</div>
      <span slot="suffix">lbs</span>
    </mx-text-field>
    <mx-text-field outlined value={filledSuffixValue}>
      <div slot="label">Label</div>
      <span slot="suffix">lbs</span>
    </mx-text-field>
  </>
);

export const Variants = (): JSX.Element => (
  <>
    <Filled />
    <Outlined />
  </>
);

export const VariantsDark = (): JSX.Element => <Variants />;
VariantsDark.parameters = darkThemeParameters;

export const States = (): JSX.Element => (
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
          Filled
        </th>
        <td style={stateCellStyle}>
          <mx-text-field>
            <div slot="label">Label</div>
          </mx-text-field>
        </td>
        <td style={stateCellStyle}>
          <mx-text-field data-force="hover">
            <div slot="label">Label</div>
          </mx-text-field>
        </td>
        <td style={stateCellStyle}>
          <mx-text-field data-force="active">
            <div slot="label">Label</div>
          </mx-text-field>
        </td>
        <td style={stateCellStyle}>
          <mx-text-field data-force="focus">
            <div slot="label">Label</div>
          </mx-text-field>
        </td>
        <td style={stateCellStyle}>
          <mx-text-field disabled>
            <div slot="label">Label</div>
          </mx-text-field>
        </td>
      </tr>
      <tr>
        <th scope="row" style={stateCellStyle}>
          Outlined
        </th>
        <td style={stateCellStyle}>
          <mx-text-field outlined>
            <div slot="label">Label</div>
          </mx-text-field>
        </td>
        <td style={stateCellStyle}>
          <mx-text-field data-force="hover" outlined>
            <div slot="label">Label</div>
          </mx-text-field>
        </td>
        <td style={stateCellStyle}>
          <mx-text-field data-force="active" outlined>
            <div slot="label">Label</div>
          </mx-text-field>
        </td>
        <td style={stateCellStyle}>
          <mx-text-field data-force="focus" outlined>
            <div slot="label">Label</div>
          </mx-text-field>
        </td>
        <td style={stateCellStyle}>
          <mx-text-field disabled outlined>
            <div slot="label">Label</div>
          </mx-text-field>
        </td>
      </tr>
    </tbody>
  </table>
);

export const StatesDark = (): JSX.Element => <States />;
StatesDark.parameters = darkThemeParameters;
