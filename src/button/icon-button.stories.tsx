import type { Story } from '@ladle/react';
import '../icon/react/icon.ts';
import './react/icon-button.ts';

// ================
// Color
// ================

export const ColorFilled: Story = () => (
  <mx-icon-button>
    <mx-icon>play_arrow</mx-icon>
  </mx-icon-button>
);
ColorFilled.storyName = 'Color / Default';

export const ColorElevated: Story = () => (
  <mx-icon-button color="elevated">
    <mx-icon>play_arrow</mx-icon>
  </mx-icon-button>
);
ColorElevated.storyName = 'Color / Elevated';

export const ColorOutlined: Story = () => (
  <mx-icon-button color="outlined">
    <mx-icon>play_arrow</mx-icon>
  </mx-icon-button>
);
ColorOutlined.storyName = 'Color / Outlined';

export const ColorTonal: Story = () => (
  <mx-icon-button color="tonal">
    <mx-icon>play_arrow</mx-icon>
  </mx-icon-button>
);
ColorTonal.storyName = 'Color / Tonal';

export const ColorStandard: Story = () => (
  <mx-icon-button color="standard">
    <mx-icon>play_arrow</mx-icon>
  </mx-icon-button>
);
ColorStandard.storyName = 'Color / Standard';

// ================
// Size
// ================

export const SizeXSmall: Story = () => (
  <mx-icon-button size="xsmall">
    <mx-icon>play_arrow</mx-icon>
  </mx-icon-button>
);
SizeXSmall.storyName = 'Size / XSmall';

export const SizeSmall: Story = () => (
  <mx-icon-button size="small">
    <mx-icon>play_arrow</mx-icon>
  </mx-icon-button>
);
SizeSmall.storyName = 'Size / Small';

export const SizeMedium: Story = () => (
  <mx-icon-button size="medium">
    <mx-icon>play_arrow</mx-icon>
  </mx-icon-button>
);
SizeMedium.storyName = 'Size / Medium';

export const SizeLarge: Story = () => (
  <mx-icon-button size="large">
    <mx-icon>play_arrow</mx-icon>
  </mx-icon-button>
);
SizeLarge.storyName = 'Size / Large';

export const SizeXLarge: Story = () => (
  <mx-icon-button size="large">
    <mx-icon>play_arrow</mx-icon>
  </mx-icon-button>
);
SizeXLarge.storyName = 'Size / XLarge';

// ================
// Shape
// ================

export const ShapeSquare: Story = () => (
  <mx-icon-button shape="square">
    <mx-icon>play_arrow</mx-icon>
  </mx-icon-button>
);
ShapeSquare.storyName = 'Shape / Square';

// ================
// Disabled
// ================
export const Disabled: Story = () => (
  <mx-icon-button disabled>
    <mx-icon>play_arrow</mx-icon>
  </mx-icon-button>
);
