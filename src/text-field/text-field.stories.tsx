import type { Story, StoryDefault } from '@ladle/react';
import '../icon/icon.ts';
import './text-field.ts';

const storyDefault: StoryDefault = {
  decorators: [
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    (Component) => (
      <div style={{ width: 220 }}>
        <Component />
      </div>
    ),
  ],
};

export default storyDefault;

export const TypeFilled: Story = () => (
  <mx-text-field>
    <mx-icon slot="lead">search</mx-icon>
    <mx-icon slot="trail">cancel</mx-icon>
    <div slot="label">Label Text</div>
    <div slot="support">Supporting text</div>
  </mx-text-field>
);
TypeFilled.storyName = 'Type / Default';
