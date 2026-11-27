import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, JSX } from 'react';
import '../card/card.ts';
import '../list/list-item.ts';
import '../list/list.ts';
import css from '../story.module.css';
// oxlint-disable-next-line import/no-duplicates
import './divider.ts';
import type { DividerInset, DividerOrientation } from './divider.ts';

const meta: Meta = {
  title: 'Divider',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={css['layout']}>
        <Component />
      </div>
    ),
  ],
};

export default meta;

const COLUMN_STYLES: CSSProperties = {
  display: 'grid',
  gap: '16px',
  inlineSize: '320px',
};

const ROW_STYLES: CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  blockSize: '48px',
};

type PlaygroundArgs = Readonly<{
  inset: DividerInset | 'full-width';
  orientation: DividerOrientation;
}>;

export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    inset: 'full-width',
    orientation: 'horizontal',
  },
  argTypes: {
    inset: {
      control: 'inline-radio',
      options: ['full-width', 'start', 'middle'],
    },
    orientation: {
      control: 'inline-radio',
      options: ['horizontal', 'vertical'],
    },
  },
  render({ inset, orientation }) {
    const divider = (
      <mx-divider
        inset={inset === 'full-width' ? undefined : inset}
        orientation={orientation}
      />
    );

    return orientation === 'vertical' ? (
      <div style={ROW_STYLES}>
        <span>Before</span>
        {divider}
        <span>After</span>
      </div>
    ) : (
      <div style={COLUMN_STYLES}>
        <span>Above</span>
        {divider}
        <span>Below</span>
      </div>
    );
  },
};

export const Insets = (): JSX.Element => (
  <div style={COLUMN_STYLES}>
    <span>Full width</span>
    <mx-divider />
    <span>Inset</span>
    <mx-divider inset="start" />
    <span>Middle inset</span>
    <mx-divider inset="middle" />
  </div>
);

export const Vertical = (): JSX.Element => (
  <div style={ROW_STYLES}>
    <span>Before</span>
    <mx-divider orientation="vertical" />
    <span>After</span>
  </div>
);

const LIST_STYLES: CSSProperties = { inlineSize: '320px' };

export const InAList = (): JSX.Element => (
  <mx-list style={LIST_STYLES}>
    <mx-list-item>Inbox</mx-list-item>
    <mx-list-item>Outbox</mx-list-item>
    <mx-divider inset="start" />
    <mx-list-item>Trash</mx-list-item>
  </mx-list>
);

const CARD_STYLES: CSSProperties = { inlineSize: '280px' };
const TEXT_STYLES: CSSProperties = { margin: 0 };
const CARD_DIVIDER_STYLES: CSSProperties = { marginBlock: '16px' };

export const InACard = (): JSX.Element => (
  <mx-card variant="outlined" style={CARD_STYLES}>
    <p style={TEXT_STYLES}>Supporting text about the subject of the card.</p>
    <mx-divider style={CARD_DIVIDER_STYLES} />
    <p style={TEXT_STYLES}>Details below the divider.</p>
  </mx-card>
);
