import type { Meta } from '@storybook/react-vite';
import type { CSSProperties, JSX } from 'react';
import '../icon/icon.ts';
import './text-field.ts';
import './multiline-text-field.ts';
import css from './text-field.story.module.css';

const meta: Meta = {
  title: 'Multiline Text Field',
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

const filledMultilineValue =
  'This is a long input in a multi-line text field that wraps overflow text onto a new line';

export const Filled = (): JSX.Element => (
  <>
    <mx-multiline-text-field>
      <div slot="label">Label</div>
    </mx-multiline-text-field>
    <mx-multiline-text-field value={filledMultilineValue}>
      <div slot="label">Label</div>
    </mx-multiline-text-field>
  </>
);

export const Outlined = (): JSX.Element => (
  <>
    <mx-multiline-text-field outlined>
      <div slot="label">Label</div>
    </mx-multiline-text-field>
    <mx-multiline-text-field outlined value={filledMultilineValue}>
      <div slot="label">Label</div>
    </mx-multiline-text-field>
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
          <mx-multiline-text-field>
            <div slot="label">Label</div>
          </mx-multiline-text-field>
        </td>
        <td style={stateCellStyle}>
          <mx-multiline-text-field data-force="hover">
            <div slot="label">Label</div>
          </mx-multiline-text-field>
        </td>
        <td style={stateCellStyle}>
          <mx-multiline-text-field data-force="active">
            <div slot="label">Label</div>
          </mx-multiline-text-field>
        </td>
        <td style={stateCellStyle}>
          <mx-multiline-text-field data-force="focus">
            <div slot="label">Label</div>
          </mx-multiline-text-field>
        </td>
        <td style={stateCellStyle}>
          <mx-multiline-text-field disabled>
            <div slot="label">Label</div>
          </mx-multiline-text-field>
        </td>
      </tr>
      <tr>
        <th scope="row" style={stateCellStyle}>
          Outlined
        </th>
        <td style={stateCellStyle}>
          <mx-multiline-text-field outlined>
            <div slot="label">Label</div>
          </mx-multiline-text-field>
        </td>
        <td style={stateCellStyle}>
          <mx-multiline-text-field data-force="hover" outlined>
            <div slot="label">Label</div>
          </mx-multiline-text-field>
        </td>
        <td style={stateCellStyle}>
          <mx-multiline-text-field data-force="active" outlined>
            <div slot="label">Label</div>
          </mx-multiline-text-field>
        </td>
        <td style={stateCellStyle}>
          <mx-multiline-text-field data-force="focus" outlined>
            <div slot="label">Label</div>
          </mx-multiline-text-field>
        </td>
        <td style={stateCellStyle}>
          <mx-multiline-text-field disabled outlined>
            <div slot="label">Label</div>
          </mx-multiline-text-field>
        </td>
      </tr>
    </tbody>
  </table>
);

export const StatesDark = (): JSX.Element => <States />;
StatesDark.parameters = darkThemeParameters;
