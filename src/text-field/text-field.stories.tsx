import type { Story, StoryDefault } from '@ladle/react';
import '../icon/icon.ts';
import './text-field.ts';

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

export const DefaultRegular: Story = () => (
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
DefaultRegular.storyName = 'Default / Regular';

export const DefaultNumber: Story = () => (
  <mx-text-field type="number">
    <div slot="label">Enter amount</div>
  </mx-text-field>
);
DefaultNumber.storyName = 'Default / Number';

export const DefaultError: Story = () => (
  <mx-text-field
    ref={(element) => {
      element?.setValidity({ customError: true }, 'Something went wrong');
      element?.reportValidity();
    }}
  >
    <div slot="label">Enter amount</div>
    <div slot="support">Something went wrong</div>
  </mx-text-field>
);
DefaultError.storyName = 'Default / Error';

export const DefaultDisabled: Story = () => (
  <mx-text-field disabled>
    <mx-icon slot="lead">search</mx-icon>
    <mx-icon slot="trail">cancel</mx-icon>
    <span slot="prefix">$</span>
    <div slot="label">Label Text</div>
    <span slot="suffix">/ 30</span>
    <div slot="support">Supporting text</div>
    <div slot="counter">5/25</div>
  </mx-text-field>
);
DefaultDisabled.storyName = 'Default / Disabled';

export const OutlinedRegular: Story = () => (
  <mx-text-field multiline outlined>
    <mx-icon slot="lead">search</mx-icon>
    <mx-icon slot="trail">cancel</mx-icon>
    <span slot="prefix">$</span>
    <div slot="label">Label Text</div>
    <span slot="suffix">/ 30</span>
    <div slot="support">Supporting text</div>
    <div slot="counter">5/25</div>
  </mx-text-field>
);
OutlinedRegular.storyName = 'Outlined / Regular';
