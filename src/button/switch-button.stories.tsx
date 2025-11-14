import { Story } from '@ladle/react';
import './react/switch-button.ts';
import css from './story.module.css';

// ================
// Color
// ================

export const ColorFilled: Story = () => (
  <section className={css['story-list']}>
    <mx-switch-button>Check Me!</mx-switch-button>
    <mx-switch-button checked>I am checked!</mx-switch-button>
  </section>
);
ColorFilled.storyName = 'Color / Default';

export const ColorElevated: Story = () => (
  <>
    <mx-switch-button color="elevated">Check Me!</mx-switch-button>
    <mx-switch-button color="elevated" checked>
      I am checked!
    </mx-switch-button>
  </>
);
ColorElevated.storyName = 'Color / Elevated';

export const ColorOutlined: Story = () => (
  <>
    <mx-switch-button color="outlined">Check Me!</mx-switch-button>
    <mx-switch-button color="outlined" checked>
      I am checked!
    </mx-switch-button>
  </>
);
ColorOutlined.storyName = 'Color / Outlined';

export const ColorTonal: Story = () => (
  <>
    <mx-switch-button color="tonal">Check Me!</mx-switch-button>
    <mx-switch-button color="tonal" checked>
      I am checked!
    </mx-switch-button>
  </>
);
ColorTonal.storyName = 'Color / Tonal';

// ================
// Size
// ================

export const SizeXSmall: Story = () => (
  <>
    <mx-switch-button size="xsmall">Check Me!</mx-switch-button>
    <mx-switch-button size="xsmall" checked>
      I am checked!
    </mx-switch-button>
  </>
);
SizeXSmall.storyName = 'Size / XSmall';

export const SizeSmall: Story = () => (
  <mx-switch-button size="small">Click Me!</mx-switch-button>
);
SizeSmall.storyName = 'Size / Small';

export const SizeMedium: Story = () => (
  <mx-switch-button size="medium">Click Me!</mx-switch-button>
);
SizeMedium.storyName = 'Size / Medium';

export const SizeLarge: Story = () => (
  <mx-switch-button size="large">Click Me!</mx-switch-button>
);
SizeLarge.storyName = 'Size / Large';

export const SizeXLarge: Story = () => (
  <mx-switch-button size="xlarge">Click Me!</mx-switch-button>
);
SizeXLarge.storyName = 'Size / XLarge';

// ================
// Shape
// ================

export const ShapeSquare: Story = () => (
  <mx-switch-button shape="square">Click Me!</mx-switch-button>
);
ShapeSquare.storyName = 'Shape / Square';

// ================
// Disabled
// ================

export const Disabled: Story = () => (
  <mx-switch-button disabled>Click Me!</mx-switch-button>
);

// ================
// With Icon
// ================

export const WithIcon: Story = () => (
  <mx-switch-button>
    <mx-icon>check</mx-icon>
    Submit
  </mx-switch-button>
);
