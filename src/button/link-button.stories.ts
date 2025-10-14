import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, type nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { fn } from 'storybook/test';
import type { ButtonColor, ButtonSize } from './core-button.ts';
import '../icon/icon.ts';
import './link-button.ts';

type LinkButtonProps = Readonly<{
  color?: ButtonColor;
  onClick?(): void;
  href?: string;
  target?: string;
  label?: string;
  disabled?: boolean;
  size?: ButtonSize;
  icon?: TemplateResult | typeof nothing;
}>;

const meta: Meta<LinkButtonProps> = {
  title: 'Button/Link',
  tags: ['autodocs'],
  render: ({ color, onClick, label, disabled, size, href, target, icon }) =>
    html`<mx-link-button
      ?disabled=${disabled}
      color=${ifDefined(color)}
      href=${ifDefined(href)}
      target=${ifDefined(target)}
      size=${ifDefined(size)}
      @click=${onClick}
      >${icon}${label}</mx-link-button
    >`,
  argTypes: {
    color: {
      control: {
        type: 'select',
        options: ['outlined', 'tonal', 'elevated', 'text'],
      },
    },
    size: {
      controle: {
        type: 'select',
        options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
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
  args: {
    onClick: fn(),
    disabled: false,
    href: 'https://m3.material.io/',
    target: '_blank',
  },
};

export default meta;

type ButtonStories = StoryObj<LinkButtonProps>;

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
