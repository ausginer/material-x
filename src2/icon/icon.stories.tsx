import type { Story } from '@ladle/react';
import type { CSSProperties } from 'react';
import './icon.ts';

const largeIconStyles: CSSProperties = {
  '--md-icon-size': '40px',
};

const roundedIconStyles: CSSProperties = {
  '--md-icon-font': '"Material Symbols Rounded"',
};

export const Default: Story = () => <mx-icon>check</mx-icon>;
Default.storyName = 'Default';

export const SizeLarge: Story = () => (
  <mx-icon style={largeIconStyles}>check_circle</mx-icon>
);
SizeLarge.storyName = 'Size / Large';

export const FontRounded: Story = () => (
  <mx-icon style={roundedIconStyles}>favorite</mx-icon>
);
FontRounded.storyName = 'Font / Rounded';
