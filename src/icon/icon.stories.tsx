import type { Meta } from '@storybook/react-vite';
import type { CSSProperties, FC, JSX, PropsWithChildren } from 'react';
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

type RowProps = Readonly<
  PropsWithChildren<{
    title?: string;
    style?: CSSProperties;
  }>
>;

const Row: FC<RowProps> = ({ title, children, style }) => (
  <div className={css['row']}>
    <header>
      <h3>{title}</h3>
    </header>
    <section style={style}>{children}</section>
  </div>
);

const DEFAULTS: CSSProperties = {
  fontSize: '40px',
  color: 'var(--md-sys-color-primary)',
};

export const Default = (): JSX.Element => (
  <>
    <Row title="Outlined" style={DEFAULTS}>
      <mx-icon>wifi</mx-icon>
      <mx-icon>bluetooth</mx-icon>
      <mx-icon>alarm</mx-icon>
      <mx-icon>search</mx-icon>
      <mx-icon>favorite</mx-icon>
    </Row>

    <Row
      title="Rounded"
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
    </Row>
  </>
);
