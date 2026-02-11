import type { Story, StoryDefault } from '@ladle/react';
import '../icon/icon.ts';
import './text-field.ts';

const storyDefault: StoryDefault = {
  decorators: [
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    (Component) => (
      <div
        style={{
          columnGap: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 250px)',
          rowGap: 24,
          width: 'fit-content',
          alignItems: 'start',
        }}
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

const filledInputValue = 'Input';
const filledPrefixValue = '1.43';
const filledSuffixValue = '25';
const filledMultilineValue =
  'This is a long input in a multi-line text field that wraps overflow text onto a new line';

export const Filled: Story = () => (
  <>
    <mx-text-field>
      <div slot="label">Label</div>
      <div slot="support">Supporting text</div>
    </mx-text-field>
    <mx-text-field value={filledInputValue}>
      <div slot="label">Label</div>
      <div slot="support">Supporting text</div>
    </mx-text-field>

    <mx-text-field>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field value={filledInputValue}>
      <div slot="label">Label</div>
      <mx-icon slot="trail">cancel</mx-icon>
    </mx-text-field>

    <mx-text-field>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field value={filledInputValue}>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
    </mx-text-field>

    <mx-text-field>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field value={filledInputValue}>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
      <mx-icon slot="trail">cancel</mx-icon>
    </mx-text-field>

    <mx-text-field>
      <div slot="label">Label</div>
      <span slot="prefix">$</span>
    </mx-text-field>
    <mx-text-field value={filledPrefixValue}>
      <div slot="label">Label</div>
      <span slot="prefix">$</span>
    </mx-text-field>

    <mx-text-field>
      <div slot="label">Label</div>
      <span slot="suffix">lbs</span>
    </mx-text-field>
    <mx-text-field value={filledSuffixValue}>
      <div slot="label">Label</div>
      <span slot="suffix">lbs</span>
    </mx-text-field>

    <mx-text-field multiline>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field multiline value={filledMultilineValue}>
      <div slot="label">Label</div>
    </mx-text-field>
  </>
);
Filled.storyName = 'Filled';

export const Outlined: Story = () => (
  <>
    <mx-text-field outlined>
      <div slot="label">Label</div>
      <div slot="support">Supporting text</div>
    </mx-text-field>
    <mx-text-field outlined value={filledInputValue}>
      <div slot="label">Label</div>
      <div slot="support">Supporting text</div>
    </mx-text-field>

    <mx-text-field outlined>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field outlined value={filledInputValue}>
      <div slot="label">Label</div>
      <mx-icon slot="trail">cancel</mx-icon>
    </mx-text-field>

    <mx-text-field outlined>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field outlined value={filledInputValue}>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
    </mx-text-field>

    <mx-text-field outlined>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field outlined value={filledInputValue}>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
      <mx-icon slot="trail">cancel</mx-icon>
    </mx-text-field>

    <mx-text-field outlined>
      <div slot="label">Label</div>
      <span slot="prefix">$</span>
    </mx-text-field>
    <mx-text-field outlined value={filledPrefixValue}>
      <div slot="label">Label</div>
      <span slot="prefix">$</span>
    </mx-text-field>

    <mx-text-field outlined>
      <div slot="label">Label</div>
      <span slot="suffix">lbs</span>
    </mx-text-field>
    <mx-text-field outlined value={filledSuffixValue}>
      <div slot="label">Label</div>
      <span slot="suffix">lbs</span>
    </mx-text-field>

    <mx-text-field outlined multiline>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field outlined multiline value={filledMultilineValue}>
      <div slot="label">Label</div>
    </mx-text-field>
  </>
);
Outlined.storyName = 'Outlined';
