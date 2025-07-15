import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { fn } from 'storybook/test';
import type { ButtonFlavor } from './core-button.ts';
import './link-button.js';

type LinkButtonProps = Readonly<{
  flavor?: ButtonFlavor;
  onClick?(): void;
  label?: string;
  disabled?: boolean;
  href?: string;
}>;

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta: Meta<LinkButtonProps> = {
  title: 'Button/Link',
  tags: ['autodocs'],
  render: ({
    flavor,
    href = 'https://example.com',
    onClick,
    label,
    disabled = false,
  }) =>
    html`<mx-link-button
      ?disabled=${disabled}
      flavor=${ifDefined(flavor)}
      href=${ifDefined(href)}
      @click=${onClick}
      >${label}</mx-link-button
    >`,
  argTypes: {
    flavor: {
      control: {
        type: 'select',
        options: ['outlined', 'filled-tonal', 'elevated', 'text'],
      },
    },
    href: {
      control: {
        type: 'text',
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
  args: { onClick: fn(), disabled: false },
};

export default meta;

type ButtonStories = StoryObj<LinkButtonProps>;

export const Filled: ButtonStories = {
  args: {
    label: 'Filled Link Button',
  },
};

export const Outlined: ButtonStories = {
  args: {
    flavor: 'outlined',
    label: 'Outlined Link Button',
  },
};

export const FilledTonal: ButtonStories = {
  args: {
    flavor: 'filled-tonal',
    label: 'Filled Tonal Link Button',
  },
};

export const Elevated: ButtonStories = {
  args: {
    flavor: 'elevated',
    label: 'Elevated Link Button',
  },
};

export const Text: ButtonStories = {
  args: {
    flavor: 'text',
    label: 'Text Button',
  },
};
