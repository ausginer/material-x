import type { Story } from '@ladle/react';
import './react/fab.ts';
import '../icon/react/icon.ts';

// ================
// Color
// ================

export const ColorDefault: Story = () => (
  <mx-fab>
    <mx-icon slot="icon">check</mx-icon>
  </mx-fab>
);
ColorDefault.storyName = 'Color / Default';

export const ColorPrimary: Story = () => (
  <mx-fab color="primary">
    <mx-icon slot="icon">check</mx-icon>
  </mx-fab>
);
ColorPrimary.storyName = 'Color / Primary';

export const ColorSecondary: Story = () => (
  <mx-fab color="secondary">
    <mx-icon slot="icon">check</mx-icon>
  </mx-fab>
);
ColorSecondary.storyName = 'Color / Secondary';

// ================
// Tonal Color
// ================

export const ColorTonalDefault: Story = () => (
  <mx-fab tonal>
    <mx-icon slot="icon">check</mx-icon>
  </mx-fab>
);
ColorTonalDefault.storyName = 'Tonal Color / Default';

export const ColorTonalPrimary: Story = () => (
  <mx-fab tonal color="primary">
    <mx-icon slot="icon">check</mx-icon>
  </mx-fab>
);
ColorTonalPrimary.storyName = 'Tonal Color / Primary';

export const ColorTonalSecondary: Story = () => (
  <mx-fab tonal color="secondary">
    <mx-icon slot="icon">check</mx-icon>
  </mx-fab>
);
ColorTonalSecondary.storyName = 'Tonal Color / Secondary';

// ================
// Size
// ================

export const SizeMedium: Story = () => (
  <mx-fab size="medium">
    <mx-icon slot="icon">check</mx-icon>
  </mx-fab>
);
SizeMedium.storyName = 'Size / Medium';

export const SizeLarge: Story = () => (
  <mx-fab size="large">
    <mx-icon slot="icon">check</mx-icon>
  </mx-fab>
);
SizeLarge.storyName = 'Size / Large';
