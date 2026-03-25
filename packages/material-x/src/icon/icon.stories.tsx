import type { Meta } from '@storybook/react-vite';
import type { CSSProperties, JSX } from 'react';
import css from '../story.module.css';
import './icon.ts';

const meta: Meta = {
  title: 'Icon',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={css['layout']}>
        <Component />
      </div>
    ),
  ],
};

export default meta;

const DEFAULTS: CSSProperties = {
  fontSize: '40px',
  color: 'var(--md-sys-color-primary)',
};

export const Outlined = (): JSX.Element => (
  <div style={DEFAULTS}>
    <mx-icon>wifi</mx-icon>
    <mx-icon>bluetooth</mx-icon>
    <mx-icon>alarm</mx-icon>
    <mx-icon>search</mx-icon>
    <mx-icon>favorite</mx-icon>
  </div>
);

export const Rounded = (): JSX.Element => (
  <div
    style={{
      '--md-icon-font': '"Material Symbols Rounded"',
      ...DEFAULTS,
    }}
  >
    <mx-icon>wifi</mx-icon>
    <mx-icon>bluetooth</mx-icon>
    <mx-icon>alarm</mx-icon>
    <mx-icon>search</mx-icon>
    <mx-icon>favorite</mx-icon>
  </div>
);
