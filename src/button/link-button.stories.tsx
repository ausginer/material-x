import type { Meta } from '@storybook/react-vite';
import type { JSX } from 'react';
import '../icon/icon.ts';
import css from '../story.module.css';
import './link-button.ts';

const meta: Meta = {
  title: 'Button/Link',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={css['layout2']}>
        <Component />
      </div>
    ),
  ],
};

export default meta;

const HREF = 'https://m3.material.io/components/buttons/overview';
const TARGET = '_blank';

export const States = (): JSX.Element => (
  <>
    <mx-link-button href={HREF} target={TARGET}>
      Default
    </mx-link-button>
    <mx-link-button data-force="hovered" href={HREF} target={TARGET}>
      Hovered
    </mx-link-button>
    <mx-link-button data-force="focused" href={HREF} target={TARGET}>
      Focused
    </mx-link-button>
    <mx-link-button data-force="pressed" href={HREF} target={TARGET}>
      Pressed
    </mx-link-button>
    <mx-link-button disabled href={HREF} target={TARGET}>
      Disabled
    </mx-link-button>
  </>
);

export const Sizes = (): JSX.Element => (
  <>
    <mx-link-button href={HREF} size="xsmall" target={TARGET}>
      Extra small
    </mx-link-button>
    <mx-link-button href={HREF} target={TARGET}>
      Small
    </mx-link-button>
    <mx-link-button href={HREF} size="medium" target={TARGET}>
      Medium
    </mx-link-button>
    <mx-link-button href={HREF} size="large" target={TARGET}>
      Large
    </mx-link-button>
    <mx-link-button href={HREF} size="xlarge" target={TARGET}>
      Extra large
    </mx-link-button>
  </>
);

export const Shape = (): JSX.Element => (
  <>
    <mx-link-button href={HREF} target={TARGET}>
      Round
    </mx-link-button>
    <mx-link-button href={HREF} shape="square" target={TARGET}>
      Square
    </mx-link-button>
  </>
);

export const Color = (): JSX.Element => (
  <>
    <mx-link-button href={HREF} target={TARGET}>
      Filled
    </mx-link-button>
    <mx-link-button color="elevated" href={HREF} target={TARGET}>
      Elevated
    </mx-link-button>
    <mx-link-button color="tonal" href={HREF} target={TARGET}>
      Tonal
    </mx-link-button>
    <mx-link-button color="outlined" href={HREF} target={TARGET}>
      Outlined
    </mx-link-button>
    <mx-link-button color="text" href={HREF} target={TARGET}>
      Text
    </mx-link-button>
  </>
);

export const WithIcon = (): JSX.Element => (
  <>
    <mx-link-button href={HREF} target={TARGET}>
      <mx-icon slot="icon">edit</mx-icon>
      Filled
    </mx-link-button>
    <mx-link-button color="elevated" href={HREF} target={TARGET}>
      <mx-icon slot="icon">edit</mx-icon>
      Elevated
    </mx-link-button>
    <mx-link-button color="tonal" href={HREF} target={TARGET}>
      <mx-icon slot="icon">edit</mx-icon>
      Tonal
    </mx-link-button>
    <mx-link-button color="outlined" href={HREF} target={TARGET}>
      <mx-icon slot="icon">edit</mx-icon>
      Outlined
    </mx-link-button>
    <mx-link-button color="text" href={HREF} target={TARGET}>
      <mx-icon slot="icon">edit</mx-icon>
      Text
    </mx-link-button>
  </>
);
