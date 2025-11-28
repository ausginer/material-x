import type { Story } from '@ladle/react';
import './react/link-button.ts';

// ================
// Color
// ================

export const ColorFilled: Story = () => (
  <mx-link-button
    href="https://m3.material.io/components/buttons/overview"
    target="_blank"
  >
    Click Me!
  </mx-link-button>
);
ColorFilled.storyName = 'Color / Default';

export const ColorElevated: Story = () => (
  <mx-link-button
    color="elevated"
    href="https://m3.material.io/components/buttons/overview"
    target="_blank"
  >
    Click Me!
  </mx-link-button>
);
ColorElevated.storyName = 'Color / Elevated';

export const ColorOutlined: Story = () => (
  <mx-link-button
    color="outlined"
    href="https://m3.material.io/components/buttons/overview"
    target="_blank"
  >
    Click Me!
  </mx-link-button>
);
ColorOutlined.storyName = 'Color / Outlined';

export const ColorTonal: Story = () => (
  <mx-link-button
    color="tonal"
    href="https://m3.material.io/components/buttons/overview"
    target="_blank"
  >
    Click Me!
  </mx-link-button>
);
ColorTonal.storyName = 'Color / Tonal';

export const ColorText: Story = () => (
  <mx-link-button
    color="text"
    href="https://m3.material.io/components/buttons/overview"
    target="_blank"
  >
    Click Me!
  </mx-link-button>
);
ColorText.storyName = 'Color / Text';

// ================
// Size
// ================

export const SizeXSmall: Story = () => (
  <mx-link-button
    size="xsmall"
    href="https://m3.material.io/components/buttons/overview"
    target="_blank"
  >
    Click Me!
  </mx-link-button>
);
SizeXSmall.storyName = 'Size / XSmall';

export const SizeSmall: Story = () => (
  <mx-link-button
    size="small"
    href="https://m3.material.io/components/buttons/overview"
    target="_blank"
  >
    Click Me!
  </mx-link-button>
);
SizeSmall.storyName = 'Size / Small';

export const SizeMedium: Story = () => (
  <mx-link-button
    size="medium"
    href="https://m3.material.io/components/buttons/overview"
    target="_blank"
  >
    Click Me!
  </mx-link-button>
);
SizeMedium.storyName = 'Size / Medium';

export const SizeLarge: Story = () => (
  <mx-link-button
    size="large"
    href="https://m3.material.io/components/buttons/overview"
    target="_blank"
  >
    Click Me!
  </mx-link-button>
);
SizeLarge.storyName = 'Size / Large';

export const SizeXLarge: Story = () => (
  <mx-link-button
    size="xlarge"
    href="https://m3.material.io/components/buttons/overview"
    target="_blank"
  >
    Click Me!
  </mx-link-button>
);
SizeXLarge.storyName = 'Size / XLarge';

// ================
// Shape
// ================

export const ShapeSquare: Story = () => (
  <mx-link-button
    shape="square"
    href="https://m3.material.io/components/buttons/overview"
    target="_blank"
  >
    Click Me!
  </mx-link-button>
);
ShapeSquare.storyName = 'Shape / Square';

// ================
// Disabled
// ================

export const Disabled: Story = () => (
  <mx-link-button
    disabled
    href="https://m3.material.io/components/buttons/overview"
    target="_blank"
  >
    Click Me!
  </mx-link-button>
);

// ================
// With Icon
// ================

export const WithIcon: Story = () => (
  <mx-link-button
    href="https://m3.material.io/components/buttons/overview"
    target="_blank"
  >
    <mx-icon>check</mx-icon>
    Submit
  </mx-link-button>
);
