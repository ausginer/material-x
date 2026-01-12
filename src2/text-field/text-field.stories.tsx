/* eslint-disable @typescript-eslint/no-unsafe-type-assertion */
import type { Story, StoryDefault } from '@ladle/react';
import '../icon/icon.ts';
import './text-field.ts';
import type TextField from './text-field.ts';

const storyDefault: StoryDefault = {
  decorators: [
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    (Component) => (
      <div
        style={{ width: 250 }}
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
    <div slot="counter">5/25</div>
  </mx-text-field>
);
TypeDefault.storyName = 'Type / Default';

export const ModeNumeric: Story = () => (
  <>
    <mx-text-field
      mode="numeric"
      ontfincrease={({ target }) => {
        const initial = parseInt((target as TextField).value ?? '0', 10);

        if (isNaN(initial)) {
          (target as TextField).setValidity(
            { badInput: true },
            'Cannot parse wrong integer',
          );
          (target as TextField).reportValidity();
        } else {
          (target as TextField).value = String(initial + 1);
        }
      }}
    >
      <div slot="label">Enter amount</div>
    </mx-text-field>
  </>
);
ModeNumeric.storyName = 'Mode / Numeric';
