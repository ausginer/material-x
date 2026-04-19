import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX } from 'react';
import '../icon/icon.ts';
import './text-field.ts';
import css from './text-field.story.module.css';
import type { TextFieldType } from './TextFieldCore.ts';

const meta: Meta = {
  title: 'Text Field / Regular',
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

export default meta;

const FILLED_INPUT_VALUE = 'Input';
const FILLED_PREFIX_VALUE = '1.43';
const FILLED_SUFFIX_VALUE = '25';

type PlaygroundArgs = Readonly<{
  outlined: boolean;
  type: TextFieldType;
  label: string;
  supportText: string;
  disabled: boolean;
}>;

export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    outlined: false,
    type: 'text',
    label: 'Email',
    supportText: '',
    disabled: false,
  },
  argTypes: {
    outlined: {
      control: 'boolean',
    },
    type: {
      control: 'inline-radio',
      options: ['text', 'password', 'email', 'tel', 'number', 'search', 'url'],
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
  render({ outlined, type, label, supportText, disabled }) {
    return (
      <mx-text-field
        outlined={outlined}
        type={type === 'text' ? undefined : type}
        disabled={disabled}
      >
        <div slot="label">{label}</div>
        {supportText && <div slot="support">{supportText}</div>}
      </mx-text-field>
    );
  },
};

export const Filled = (): JSX.Element => (
  <>
    <mx-text-field>
      <div slot="label">Label</div>
      <div slot="support">Supporting text</div>
    </mx-text-field>
    <mx-text-field value={FILLED_INPUT_VALUE}>
      <div slot="label">Label</div>
      <div slot="support">Supporting text</div>
    </mx-text-field>

    <mx-text-field>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field value={FILLED_INPUT_VALUE}>
      <div slot="label">Label</div>
      <mx-icon slot="trail">cancel</mx-icon>
    </mx-text-field>

    <mx-text-field>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field value={FILLED_INPUT_VALUE}>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
    </mx-text-field>

    <mx-text-field>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field value={FILLED_INPUT_VALUE}>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
      <mx-icon slot="trail">cancel</mx-icon>
    </mx-text-field>

    <mx-text-field>
      <div slot="label">Label</div>
      <span slot="prefix">$</span>
    </mx-text-field>
    <mx-text-field value={FILLED_PREFIX_VALUE}>
      <div slot="label">Label</div>
      <span slot="prefix">$</span>
    </mx-text-field>

    <mx-text-field>
      <div slot="label">Label</div>
      <span slot="suffix">lbs</span>
    </mx-text-field>
    <mx-text-field value={FILLED_SUFFIX_VALUE}>
      <div slot="label">Label</div>
      <span slot="suffix">lbs</span>
    </mx-text-field>
  </>
);

export const Outlined = (): JSX.Element => (
  <>
    <mx-text-field outlined>
      <div slot="label">Label</div>
      <div slot="support">Supporting text</div>
    </mx-text-field>
    <mx-text-field outlined value={FILLED_INPUT_VALUE}>
      <div slot="label">Label</div>
      <div slot="support">Supporting text</div>
    </mx-text-field>

    <mx-text-field outlined>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field outlined value={FILLED_INPUT_VALUE}>
      <div slot="label">Label</div>
      <mx-icon slot="trail">cancel</mx-icon>
    </mx-text-field>

    <mx-text-field outlined>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field outlined value={FILLED_INPUT_VALUE}>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
    </mx-text-field>

    <mx-text-field outlined>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
    </mx-text-field>
    <mx-text-field outlined value={FILLED_INPUT_VALUE}>
      <mx-icon slot="lead">search</mx-icon>
      <div slot="label">Label</div>
      <mx-icon slot="trail">cancel</mx-icon>
    </mx-text-field>

    <mx-text-field outlined>
      <div slot="label">Label</div>
      <span slot="prefix">$</span>
    </mx-text-field>
    <mx-text-field outlined value={FILLED_PREFIX_VALUE}>
      <div slot="label">Label</div>
      <span slot="prefix">$</span>
    </mx-text-field>

    <mx-text-field outlined>
      <div slot="label">Label</div>
      <span slot="suffix">lbs</span>
    </mx-text-field>
    <mx-text-field outlined value={FILLED_SUFFIX_VALUE}>
      <div slot="label">Label</div>
      <span slot="suffix">lbs</span>
    </mx-text-field>
  </>
);

export const FilledStates = (): JSX.Element => (
  <>
    <mx-text-field>
      <div slot="label">Default</div>
    </mx-text-field>
    <mx-text-field data-force="hovered">
      <div slot="label">Hovered</div>
    </mx-text-field>
    <mx-text-field data-force="focused">
      <div slot="label">Focused</div>
    </mx-text-field>
    <mx-text-field disabled>
      <div slot="label">Disabled</div>
    </mx-text-field>
  </>
);

export const OutlinedStates = (): JSX.Element => (
  <>
    <mx-text-field outlined>
      <div slot="label">Default</div>
    </mx-text-field>
    <mx-text-field data-force="hovered" outlined>
      <div slot="label">Hovered</div>
    </mx-text-field>
    <mx-text-field data-force="focused" outlined>
      <div slot="label">Focused</div>
    </mx-text-field>
    <mx-text-field outlined disabled>
      <div slot="label">Disabled</div>
    </mx-text-field>
  </>
);
