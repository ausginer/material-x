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
  leadingIcon: string;
  trailingIcon: string;
  prefix: string;
  suffix: string;
  outlined: boolean;
  type: TextFieldType;
  label: string;
  counter: string;
  supportText: string;
  disabled: boolean;
}>;

export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    outlined: false,
    type: 'text',
    label: 'Email',
    supportText: '',
    prefix: '',
    suffix: '',
    leadingIcon: '',
    trailingIcon: '',
    counter: '',
    disabled: false,
  },
  argTypes: {
    outlined: {
      control: 'boolean',
    },
    leadingIcon: {
      control: 'text',
    },
    trailingIcon: {
      control: 'text',
    },
    prefix: {
      control: 'text',
    },
    suffix: {
      control: 'text',
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
    counter: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
  },
  render({
    outlined,
    type,
    label,
    supportText,
    disabled,
    trailingIcon,
    leadingIcon,
    prefix,
    suffix,
    counter,
  }) {
    return (
      <mx-text-field
        outlined={outlined}
        type={type === 'text' ? undefined : type}
        disabled={disabled}
      >
        {leadingIcon && <mx-icon slot="lead">{leadingIcon}</mx-icon>}
        {prefix && <span slot="prefix">{prefix}</span>}
        <div slot="label">{label}</div>
        {suffix && <span slot="suffix">{suffix}</span>}
        {trailingIcon && <mx-icon slot="trail">{trailingIcon}</mx-icon>}
        {supportText && <div slot="support">{supportText}</div>}
        {counter && <div slot="counter">{counter}</div>}
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
