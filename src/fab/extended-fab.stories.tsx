import type { Meta } from '@storybook/react-vite';
import {
  useState,
  type CSSProperties,
  type JSX,
  type PropsWithChildren,
} from 'react';
import css from '../story.module.css';
import type { FABProperties } from './fab.ts';

const meta: Meta = {
  title: 'FAB / Extended',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={css['layout']}>
        <Component />
      </div>
    ),
  ],
};

export default meta;

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

export const States = (): JSX.Element => (
  <>
    <ControlledFABExtended color="primary">
      <mx-icon slot="icon">check</mx-icon>
      Default
    </ControlledFABExtended>
    <ControlledFABExtended color="primary" data-force="hovered">
      <mx-icon slot="icon">check</mx-icon>
      Hovered
    </ControlledFABExtended>
    <ControlledFABExtended color="primary" data-force="focused">
      <mx-icon slot="icon">check</mx-icon>
      Focused
    </ControlledFABExtended>
    <ControlledFABExtended color="primary" data-force="pressed">
      <mx-icon slot="icon">check</mx-icon>
      Pressed
    </ControlledFABExtended>
  </>
);

export const Colors = (): JSX.Element => (
  <>
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
  </>
);

export const TonalColors = (): JSX.Element => (
  <>
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
  </>
);

export const Sizes = (): JSX.Element => (
  <>
    <ControlledFABExtended tonal size="medium">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
    <ControlledFABExtended tonal size="large">
      <mx-icon slot="icon">check</mx-icon>
      Submit
    </ControlledFABExtended>
  </>
);

export const Direction = (): JSX.Element => (
  <>
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
  </>
);
