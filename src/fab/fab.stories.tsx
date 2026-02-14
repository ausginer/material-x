import type { Story, StoryDefault } from '@ladle/react';
import {
  useState,
  type CSSProperties,
  type FC,
  type PropsWithChildren,
} from 'react';
import '../icon/icon.ts';
import css from '../story.module.css';
import fabCss from './fab.story.module.css';
import './fab.ts';
import type { FABProperties } from './fab.ts';

const storyDefault: StoryDefault = {
  decorators: [
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    (Component) => (
      <div className={css['layout']}>
        <Component />
      </div>
    ),
  ],
};

export default storyDefault;

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

export const Regular: Story = () => (
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

export const Extended: Story = () => (
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
        <mx-icon slot="icon">arrow_right_alt</mx-icon>
        Right
      </ControlledFABExtended>
      <ControlledFABExtended
        style={{
          '--md-extended-fab-direction': 'row-reverse',
        }}
      >
        <mx-icon slot="icon">arrow_left_alt</mx-icon>
        Left
      </ControlledFABExtended>
      <ControlledFABExtended
        style={{
          '--md-extended-fab-direction': 'column',
        }}
      >
        <mx-icon slot="icon">arrow_downward_alt</mx-icon>
        D<br />
        o<br />
        w<br />
        n<br />
      </ControlledFABExtended>
      <ControlledFABExtended
        style={{
          '--md-extended-fab-direction': 'column-reverse',
        }}
      >
        <mx-icon slot="icon">arrow_upward_alt</mx-icon>
        U<br />
        p<br />
      </ControlledFABExtended>
    </Row>

    <Row title="Direction by languages">
      <ControlledFABExtended>
        <mx-icon slot="icon">check</mx-icon>
        Submit
      </ControlledFABExtended>
      <ControlledFABExtended dir="rtl">
        <mx-icon slot="icon">check</mx-icon>
        ارسال
      </ControlledFABExtended>
      <ControlledFABExtended className={fabCss['ja']}>
        <mx-icon slot="icon">check</mx-icon>
        送信
      </ControlledFABExtended>
    </Row>
  </>
);
