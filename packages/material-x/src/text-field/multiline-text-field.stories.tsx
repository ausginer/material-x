import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX } from 'react';
import '../icon/icon.ts';
import './text-field.ts';
import './multiline-text-field.ts';
import css from './text-field.story.module.css';

const Meta: Meta = {
  title: 'Text Field / Multiline',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div
        className={css['layout']}
        onKeyDown={(ev) => {
          ev.stopPropagation();
        }}
      >
        <Component />
      </div>
    ),
  ],
};

export default Meta;

const FILLED_MULTILINE_VALUE =
  'This is a long input in a multi-line text field that wraps overflow text onto a new line';

type PlaygroundArgs = Readonly<{
  outlined: boolean;
  label: string;
  supportText: string;
  disabled: boolean;
}>;

export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    outlined: false,
    label: 'Message',
    supportText: '',
    disabled: false,
  },
  argTypes: {
    outlined: {
      control: 'boolean',
    },
    label: {
      control: 'text',
    },
    supportText: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
  },
  render({ outlined, label, supportText, disabled }) {
    return (
      <mx-multiline-text-field outlined={outlined} disabled={disabled}>
        <div slot="label">{label}</div>
        {supportText && <div slot="support">{supportText}</div>}
      </mx-multiline-text-field>
    );
  },
};

export const Filled = (): JSX.Element => (
  <>
    <mx-multiline-text-field>
      <div slot="label">Label</div>
    </mx-multiline-text-field>
    <mx-multiline-text-field value={FILLED_MULTILINE_VALUE}>
      <div slot="label">Label</div>
    </mx-multiline-text-field>
  </>
);

export const Outlined = (): JSX.Element => (
  <>
    <mx-multiline-text-field outlined>
      <div slot="label">Label</div>
    </mx-multiline-text-field>
    <mx-multiline-text-field outlined value={FILLED_MULTILINE_VALUE}>
      <div slot="label">Label</div>
    </mx-multiline-text-field>
  </>
);

export const FilledStates = (): JSX.Element => (
  <>
    <mx-multiline-text-field>
      <div slot="label">Default</div>
    </mx-multiline-text-field>
    <mx-multiline-text-field data-force="hovered">
      <div slot="label">Hovered</div>
    </mx-multiline-text-field>
    <mx-multiline-text-field data-force="focused">
      <div slot="label">Focused</div>
    </mx-multiline-text-field>
    <mx-multiline-text-field disabled>
      <div slot="label">Disabled</div>
    </mx-multiline-text-field>
  </>
);

export const OutlinedStates = (): JSX.Element => (
  <>
    <mx-multiline-text-field outlined>
      <div slot="label">Default</div>
    </mx-multiline-text-field>
    <mx-multiline-text-field data-force="hovered" outlined>
      <div slot="label">Hovered</div>
    </mx-multiline-text-field>
    <mx-multiline-text-field data-force="focused" outlined>
      <div slot="label">Focused</div>
    </mx-multiline-text-field>
    <mx-multiline-text-field outlined disabled>
      <div slot="label">Disabled</div>
    </mx-multiline-text-field>
  </>
);
