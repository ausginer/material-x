import type { Story } from '@ladle/react';
import './react/button.ts';
import '../icon/react/icon.ts';

// ================
// Color
// ================

export const ColorFilled: Story = () => <mx-button>Click Me!</mx-button>;
ColorFilled.storyName = 'Color / Default';

export const ColorElevated: Story = () => (
  <mx-button color="elevated">Click Me!</mx-button>
);
ColorElevated.storyName = 'Color / Elevated';

export const ColorOutlined: Story = () => (
  <mx-button color="outlined">Click Me!</mx-button>
);
ColorOutlined.storyName = 'Color / Outlined';

export const ColorTonal: Story = () => (
  <mx-button color="tonal">Click Me!</mx-button>
);
ColorTonal.storyName = 'Color / Tonal';

export const ColorText: Story = () => (
  <mx-button color="text">Click Me!</mx-button>
);
ColorText.storyName = 'Color / Text';

// ================
// Size
// ================

export const SizeXSmall: Story = () => (
  <mx-button size="xsmall">Click Me!</mx-button>
);
SizeXSmall.storyName = 'Size / XSmall';

export const SizeSmall: Story = () => (
  <mx-button size="small">Click Me!</mx-button>
);
SizeSmall.storyName = 'Size / Small';

export const SizeMedium: Story = () => (
  <mx-button size="medium">Click Me!</mx-button>
);
SizeMedium.storyName = 'Size / Medium';

export const SizeLarge: Story = () => (
  <mx-button size="large">Click Me!</mx-button>
);
SizeLarge.storyName = 'Size / Large';

export const SizeXLarge: Story = () => (
  <mx-button size="xlarge">Click Me!</mx-button>
);
SizeXLarge.storyName = 'Size / XLarge';

// ================
// Shape
// ================

export const ShapeSquare: Story = () => (
  <mx-button shape="square">Click Me!</mx-button>
);
ShapeSquare.storyName = 'Shape / Square';

// ================
// Disabled
// ================

export const Disabled: Story = () => <mx-button disabled>Click Me!</mx-button>;

// ================
// With Icon
// ================

export const WithIcon: Story = () => (
  <mx-button>
    <mx-icon>check</mx-icon>
    Submit
  </mx-button>
);
