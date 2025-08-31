import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { fn } from 'storybook/test';
import type { ButtonColor, ButtonSize } from './core-button.ts';
import '../icon/icon.ts';
import './button.ts';

type ButtonProps = Readonly<{
  color?: ButtonColor;
  onClick?(): void;
  label?: string;
  disabled?: boolean;
  size?: ButtonSize;
  icon?: TemplateResult | typeof nothing;
}>;

const meta: Meta<ButtonProps> = {
  title: 'Button/Button',
  tags: ['autodocs'],
  render: ({ color, onClick, label, disabled, size, icon }) =>
    html`<mx-button
      ?disabled=${disabled}
      color=${ifDefined(color)}
      size=${ifDefined(size)}
      @click=${onClick}
      >${icon}${label}</mx-button
    >`,
  argTypes: {
    color: {
      control: {
        type: 'select',
        options: ['outlined', 'tonal', 'elevated', 'tonal', 'text'],
      },
    },
    size: {
      controle: {
        type: 'select',
        options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
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
  args: { onClick: fn(), disabled: false, icon: nothing },
};

export default meta;

type ButtonStories = StoryObj<ButtonProps>;

export const FilledColor: ButtonStories = {
  args: {
    label: 'Filled Button',
  },
};

export const OutlinedColor: ButtonStories = {
  args: {
    color: 'outlined',
    label: 'Outlined Button',
  },
};

export const TonalColor: ButtonStories = {
  args: {
    color: 'tonal',
    label: 'Tonal Button',
  },
};

export const ElevatedColor: ButtonStories = {
  args: {
    color: 'elevated',
    label: 'Elevated Button',
  },
};

export const TextColor: ButtonStories = {
  args: {
    color: 'text',
    label: 'Text Button',
  },
};

export const XSmallSize: ButtonStories = {
  args: {
    label: 'Extra Small Filled Button',
    size: 'xsmall',
  },
};

export const SmallSize: ButtonStories = {
  args: {
    label: 'Small Filled Button',
    size: 'small',
  },
};

export const MediumSize: ButtonStories = {
  args: {
    label: 'Medium Filled Button',
    size: 'medium',
  },
};

export const LargeSize: ButtonStories = {
  args: {
    label: 'Large Filled Button',
    size: 'large',
  },
};

export const XLargeSize: ButtonStories = {
  args: {
    label: 'Extra Large Filled Button',
    size: 'xlarge',
  },
};

export const WithIcon: ButtonStories = {
  args: {
    label: 'Button with Icon',
    icon: html`<mx-icon slot="icon">check</mx-icon>`,
  },
};
