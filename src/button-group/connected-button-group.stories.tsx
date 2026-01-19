import type { Story } from '@ladle/react';
import '../button/button.ts';
import '../icon/icon.ts';
import '../button/switch-icon-button.ts';
import './connected-button-group.ts';
import { useState } from 'react';

// ================
// Size
// ================

export const SizeDefault: Story = () => (
  <mx-connected-button-group>
    <mx-button>Button 1</mx-button>
    <mx-button>Button 2</mx-button>
    <mx-button>Button 3</mx-button>
    <mx-button>Button 4</mx-button>
    <mx-button>Button 5</mx-button>
  </mx-connected-button-group>
);
SizeDefault.storyName = 'Size / Default';

export const SizeXSmall: Story = () => (
  <mx-connected-button-group size="xsmall">
    <mx-button>Button 1</mx-button>
    <mx-button>Button 2</mx-button>
    <mx-button>Button 3</mx-button>
    <mx-button>Button 4</mx-button>
    <mx-button>Button 5</mx-button>
  </mx-connected-button-group>
);
SizeXSmall.storyName = 'Size / XSmall';

export const SizeMedium: Story = () => (
  <mx-connected-button-group size="medium">
    <mx-button>Button 1</mx-button>
    <mx-button>Button 2</mx-button>
    <mx-button>Button 3</mx-button>
    <mx-button>Button 4</mx-button>
    <mx-button>Button 5</mx-button>
  </mx-connected-button-group>
);
SizeMedium.storyName = 'Size / Medium';

export const SizeLarge: Story = () => (
  <mx-connected-button-group size="large">
    <mx-button>Button 1</mx-button>
    <mx-button>Button 2</mx-button>
    <mx-button>Button 3</mx-button>
    <mx-button>Button 4</mx-button>
    <mx-button>Button 5</mx-button>
  </mx-connected-button-group>
);
SizeLarge.storyName = 'Size / Large';

export const SizeXLarge: Story = () => (
  <mx-connected-button-group size="xlarge">
    <mx-button>Button 1</mx-button>
    <mx-button>Button 2</mx-button>
    <mx-button>Button 3</mx-button>
    <mx-button>Button 4</mx-button>
    <mx-button>Button 5</mx-button>
  </mx-connected-button-group>
);
SizeXLarge.storyName = 'Size / XLarge';

// ================
// Switch
// ================

export const Switch: Story = () => {
  const [selected, setSelected] = useState<string | undefined>();

  return (
    <mx-connected-button-group size="medium" value={selected}>
      <mx-switch-icon-button
        width="narrow"
        checked={selected === 'bluetooth'}
        value="bluetooth"
        onChange={() => setSelected('bluetooth')}
      >
        <mx-icon>bluetooth</mx-icon>
      </mx-switch-icon-button>
      <mx-switch-icon-button
        checked={selected === 'alarm'}
        value="alarm"
        onChange={() => setSelected('alarm')}
      >
        <mx-icon>alarm</mx-icon>
      </mx-switch-icon-button>
      <mx-switch-icon-button
        width="narrow"
        checked={selected === 'link'}
        value="link"
        onChange={() => setSelected('link')}
      >
        <mx-icon>link</mx-icon>
      </mx-switch-icon-button>
      <mx-switch-icon-button
        width="wide"
        checked={selected === 'wifi'}
        value="wifi"
        onChange={() => setSelected('wifi')}
      >
        <mx-icon>wifi</mx-icon>
      </mx-switch-icon-button>
    </mx-connected-button-group>
  );
};

Switch.storyName = 'Switch Example';
