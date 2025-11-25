import type { Story } from '@ladle/react';
import './react/button-group.ts';
import '../button/react/button.ts';

// ================
// Size
// ================

export const SizeXSmall: Story = () => (
  <mx-button-group size="xsmall">
    <mx-button>Button 1</mx-button>
    <mx-button>Button 2</mx-button>
    <mx-button>Button 3</mx-button>
  </mx-button-group>
);
SizeXSmall.storyName = 'Size / XSmall';

export const SizeSmall: Story = () => (
  <mx-button-group size="small">
    <mx-button>Button 1</mx-button>
    <mx-button>Button 2</mx-button>
    <mx-button>Button 3</mx-button>
  </mx-button-group>
);
SizeSmall.storyName = 'Size / Small';

export const SizeMedium: Story = () => (
  <mx-button-group size="medium">
    <mx-button>Button 1</mx-button>
    <mx-button>Button 2</mx-button>
    <mx-button>Button 3</mx-button>
  </mx-button-group>
);
SizeMedium.storyName = 'Size / Medium';

export const SizeLarge: Story = () => (
  <mx-button-group size="large">
    <mx-button>Button 1</mx-button>
    <mx-button>Button 2</mx-button>
    <mx-button>Button 3</mx-button>
  </mx-button-group>
);
SizeLarge.storyName = 'Size / Large';

export const SizeXLarge: Story = () => (
  <mx-button-group size="xlarge">
    <mx-button>Button 1</mx-button>
    <mx-button>Button 2</mx-button>
    <mx-button>Button 3</mx-button>
  </mx-button-group>
);
SizeXLarge.storyName = 'Size / XLarge';
