import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, type JSX } from 'react';
import '../button/icon-button.ts';
import '../icon/icon.ts';
import './top-app-bar.ts';

const meta: Meta = {
  title: 'Top app bar',
};

export default meta;

type PlaygroundArgs = Readonly<{
  headline: string;
  lead: boolean;
  trail: boolean;
}>;

export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    headline: 'Headline',
    lead: true,
    trail: true,
  },
  argTypes: {
    headline: {
      control: 'text',
    },
    lead: {
      control: 'boolean',
    },
    trail: {
      control: 'boolean',
    },
  },
  render({ headline, lead, trail }) {
    return (
      <mx-top-app-bar style={{ inlineSize: '100%' }}>
        {lead && (
          <mx-icon-button slot="lead" color="standard" aria-label="Menu">
            <mx-icon>menu</mx-icon>
          </mx-icon-button>
        )}
        <h1>{headline}</h1>
        {trail && (
          <mx-icon-button slot="trail" color="standard" aria-label="More">
            <mx-icon>more_vert</mx-icon>
          </mx-icon-button>
        )}
      </mx-top-app-bar>
    );
  },
};

export const Actions = (): JSX.Element => (
  <mx-top-app-bar style={{ inlineSize: '100%' }}>
    <mx-icon-button slot="lead" color="standard" aria-label="Back">
      <mx-icon>arrow_back</mx-icon>
    </mx-icon-button>
    <h1>Photos</h1>
    <mx-icon-button slot="trail" color="standard" aria-label="Attach">
      <mx-icon>attach_file</mx-icon>
    </mx-icon-button>
    <mx-icon-button slot="trail" color="standard" aria-label="Calendar">
      <mx-icon>today</mx-icon>
    </mx-icon-button>
    <mx-icon-button slot="trail" color="standard" aria-label="More">
      <mx-icon>more_vert</mx-icon>
    </mx-icon-button>
  </mx-top-app-bar>
);

const PARAGRAPHS = Array.from({ length: 40 }, (_, index) => index + 1);

function ScrollingPageStory(): JSX.Element {
  // The page's own rule: a pinned bar covers focused and targeted content
  // without it.
  useEffect(() => {
    const { style } = document.documentElement;
    style.scrollPaddingBlockStart = '64px';

    return () => {
      style.scrollPaddingBlockStart = '';
    };
  }, []);

  return (
    <div style={{ inlineSize: '100%' }}>
      <mx-top-app-bar role="banner">
        <mx-icon-button slot="lead" color="standard" aria-label="Menu">
          <mx-icon>menu</mx-icon>
        </mx-icon-button>
        <h1>Scrolling page</h1>
        <mx-icon-button slot="trail" color="standard" aria-label="Search">
          <mx-icon>search</mx-icon>
        </mx-icon-button>
      </mx-top-app-bar>
      <main style={{ padding: '16px' }}>
        {PARAGRAPHS.map((number) => (
          <p key={number}>
            <a href={`#paragraph-${number}`} id={`paragraph-${number}`}>
              Paragraph {number}
            </a>
          </p>
        ))}
      </main>
    </div>
  );
}

export const ScrollingPage: StoryObj = {
  parameters: {
    // A frame of its own in the docs page, because the bar follows its
    // document's scroll.
    docs: { story: { inline: false, height: '320px' } },
  },
  render: () => <ScrollingPageStory />,
};
