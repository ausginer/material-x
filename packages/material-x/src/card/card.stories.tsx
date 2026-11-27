import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, JSX } from 'react';
import '../button/button.ts';
import '../divider/divider.ts';
import css from '../story.module.css';
// oxlint-disable-next-line import/no-duplicates
import './card.ts';
import type { CardVariant } from './card.ts';

const meta: Meta = {
  title: 'Card',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={css['layout']}>
        <Component />
      </div>
    ),
  ],
};

export default meta;

type PlaygroundArgs = Readonly<{
  variant: CardVariant | 'filled';
  content: string;
}>;

export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    variant: 'filled',
    content: 'Card content',
  },
  argTypes: {
    variant: {
      control: 'inline-radio',
      options: ['filled', 'elevated', 'outlined'],
    },
    content: {
      control: 'text',
    },
  },
  render({ variant, content }) {
    return (
      <mx-card variant={variant === 'filled' ? undefined : variant}>
        {content}
      </mx-card>
    );
  },
};

export const Variants = (): JSX.Element => (
  <>
    <mx-card>Filled</mx-card>
    <mx-card variant="elevated">Elevated</mx-card>
    <mx-card variant="outlined">Outlined</mx-card>
  </>
);

const CONTENT_STYLES: CSSProperties = { inlineSize: '280px' };
const HEADING_STYLES: CSSProperties = { margin: 0 };

export const ContentWithActions = (): JSX.Element => (
  <mx-card variant="outlined" style={CONTENT_STYLES}>
    <h3 style={HEADING_STYLES}>Heading</h3>
    <p>Supporting text about the subject of the card.</p>
    <mx-button color="text">Details</mx-button>
  </mx-card>
);

const MEDIA_STYLES: CSSProperties = {
  inlineSize: '280px',
  '--md-card-padding-inline': '0',
  '--md-card-padding-block': '0',
};

const IMAGE_STYLES: CSSProperties = {
  blockSize: '160px',
  borderStartStartRadius: 'inherit',
  borderStartEndRadius: 'inherit',
  background: 'linear-gradient(135deg, #b2dfdb, #004d40)',
};

const BODY_STYLES: CSSProperties = { padding: '16px' };

export const FullBleedMedia = (): JSX.Element => (
  <mx-card variant="elevated" style={MEDIA_STYLES}>
    <div role="img" aria-label="Green gradient" style={IMAGE_STYLES} />
    <div style={BODY_STYLES}>
      <h3 style={HEADING_STYLES}>Heading</h3>
      <p>Supporting text about the subject of the card.</p>
    </div>
  </mx-card>
);

const DIVIDER_STYLES: CSSProperties = { marginBlock: '16px' };

export const WithADivider = (): JSX.Element => (
  <mx-card variant="outlined" style={CONTENT_STYLES}>
    <h3 style={HEADING_STYLES}>Heading</h3>
    <p>Supporting text about the subject of the card.</p>
    <mx-divider style={DIVIDER_STYLES} />
    <mx-button color="text">Details</mx-button>
  </mx-card>
);
