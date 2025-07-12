import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { fn } from 'storybook/test';
import type { ButtonVariant } from './button.js';
import './switch-button.js';

type SwitchButtonProps = Readonly<{
  variant?: ButtonVariant;
  onClick?(): void;
  label?: string;
  disabled?: boolean;
  href?: string;
  checked?: boolean;
}>;

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta: Meta<SwitchButtonProps> = {
  title: 'Button/Switch',
  tags: ['autodocs'],
  render: ({ variant, onClick, label, disabled, checked }) =>
    html`<mx-switch-button
      ?disabled=${disabled}
      ?checked=${checked}
      variant=${ifDefined(variant)}
      @click=${onClick}
      >${label}</mx-switch-button
    >`,
  argTypes: {
    variant: {
      control: {
        type: 'select',
        options: ['outlined', 'filled-tonal', 'elevated', 'text'],
      },
    },
    checked: {
      control: {
        type: 'boolean',
      },
    },
    label: {
      control: {
        type: 'text',
      },
    },
    disabled: {
      control: {
        type: 'boolean',
      },
    },
  },
  args: { onClick: fn(), disabled: false, checked: false },
};

export default meta;

type ButtonStories = StoryObj<SwitchButtonProps>;

export const Filled: ButtonStories = {
  args: {
    label: 'Filled Switch Button',
  },
};

export const Outlined: ButtonStories = {
  args: {
    variant: 'outlined',
    label: 'Outlined Switch Button',
  },
};

export const FilledTonal: ButtonStories = {
  args: {
    variant: 'filled-tonal',
    label: 'Filled Tonal Switch Button',
  },
};

export const Elevated: ButtonStories = {
  args: {
    variant: 'elevated',
    label: 'Elevated Switch Button',
  },
};

export const Text: ButtonStories = {
  args: {
    variant: 'text',
    label: 'Text Switch Button',
  },
};
