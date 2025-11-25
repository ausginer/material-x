import type { Story } from '@ladle/react';
import './react/link-button.ts';

// ================
// Color
// ================

export const ColorFilled: Story = () => (
  <mx-link-button>Click Me!</mx-link-button>
);
ColorFilled.storyName = 'Color / Default';

export const ColorElevated: Story = () => (
  <mx-link-button color="elevated">Click Me!</mx-link-button>
);
ColorElevated.storyName = 'Color / Elevated';

export const ColorOutlined: Story = () => (
  <mx-link-button color="outlined">Click Me!</mx-link-button>
);
ColorOutlined.storyName = 'Color / Outlined';

export const ColorTonal: Story = () => (
  <mx-link-button color="tonal">Click Me!</mx-link-button>
);
ColorTonal.storyName = 'Color / Tonal';

export const ColorText: Story = () => (
  <mx-link-button color="text">Click Me!</mx-link-button>
);
ColorText.storyName = 'Color / Text';

// ================
// Size
// ================

export const SizeXSmall: Story = () => (
  <mx-link-button size="xsmall">Click Me!</mx-link-button>
);
SizeXSmall.storyName = 'Size / XSmall';

export const SizeSmall: Story = () => (
  <mx-link-button size="small">Click Me!</mx-link-button>
);
SizeSmall.storyName = 'Size / Small';

export const SizeMedium: Story = () => (
  <mx-link-button size="medium">Click Me!</mx-link-button>
);
SizeMedium.storyName = 'Size / Medium';

export const SizeLarge: Story = () => (
  <mx-link-button size="large">Click Me!</mx-link-button>
);
SizeLarge.storyName = 'Size / Large';

export const SizeXLarge: Story = () => (
  <mx-link-button size="xlarge">Click Me!</mx-link-button>
);
SizeXLarge.storyName = 'Size / XLarge';

// ================
// Shape
// ================

export const ShapeSquare: Story = () => (
  <mx-link-button shape="square">Click Me!</mx-link-button>
);
ShapeSquare.storyName = 'Shape / Square';

// ================
// Disabled
// ================

export const Disabled: Story = () => (
  <mx-link-button disabled>Click Me!</mx-link-button>
);

// ================
// With Icon
// ================

export const WithIcon: Story = () => (
  <mx-link-button>
    <mx-icon>check</mx-icon>
    Submit
  </mx-link-button>
);
