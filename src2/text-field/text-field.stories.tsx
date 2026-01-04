import type { Story, StoryDefault } from '@ladle/react';
import '../icon/icon.ts';
import './text-field.ts';

const storyDefault: StoryDefault = {
  decorators: [
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    (Component) => (
      <div
        style={{ width: 220 }}
        onKeyDown={(ev) => {
          ev.stopPropagation();
        }}
      >
        <Component />
      </div>
    ),
  ],
};

export default storyDefault;

export const TypeDefault: Story = () => (
  <mx-text-field>
    <mx-icon slot="lead">search</mx-icon>
    <mx-icon slot="trail">cancel</mx-icon>
    <span slot="prefix">$</span>
    <div slot="label">Label Text</div>
    <span slot="suffix">/ 30</span>
    <div slot="support">Supporting text</div>
  </mx-text-field>
);
TypeDefault.storyName = 'Type / Default';

export const ModeNumeric: Story = () => (
  <>
    <mx-text-field mode="numeric">
      <div slot="label">Enter amount</div>
    </mx-text-field>
  </>
);
ModeNumeric.storyName = 'Mode / Numeric';
