import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { fn } from 'storybook/test';
import './fab.ts';
import '../icon/icon.ts';
import type { FABColor, FABSize } from './fab.ts';

type FABProps = Readonly<{
  tonal?: boolean;
  color?: FABColor;
  label?: string;
  disabled?: boolean;
  size?: FABSize;
  icon?: TemplateResult | typeof nothing;
  extended?: boolean;
  style?: string;
  onClick?(): void;
}>;

const meta: Meta<FABProps> = {
  title: 'Button/Extended FAB',
  tags: ['autodocs'],
  render: ({
    tonal,
    color,
    onClick,
    disabled,
    extended,
    size,
    style,
    icon = nothing,
  }) =>
    html`<mx-fab
      ?disabled=${disabled}
      ?tonal=${tonal}
      ?extended=${extended}
      color=${ifDefined(color)}
      size=${ifDefined(size)}
      style=${ifDefined(style)}
      @click=${onClick}
      >${icon}</mx-fab
    >`,
  argTypes: {
    tonal: {
      control: {
        type: 'boolean',
      },
    },
    color: {
      control: {
        type: 'select',
        options: ['primary', 'secondary'],
      },
    },
    size: {
      control: {
        type: 'select',
        options: ['medium', 'large'],
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
  args: { onClick: fn(), disabled: false, extended: true },
};

export default meta;

type FABStories = StoryObj<FABProps>;

export const Primary: FABStories = {
  args: {
    color: 'primary',
    label: 'Primary FAB',
    icon: html`<mx-icon slot="icon">check</mx-icon>Extended Primary FAB`,
  },
};

export const Secondary: FABStories = {
  args: {
    color: 'secondary',
    label: 'Secondary FAB',
    icon: html`<mx-icon slot="icon">check</mx-icon>Extended Secondary FAB`,
  },
};

export const Tertiary: FABStories = {
  args: {
    label: 'Tertiary FAB',
    icon: html`<mx-icon slot="icon">check</mx-icon>Extended Tertiary FAB`,
  },
};

export const PrimaryTonal: FABStories = {
  args: {
    color: 'primary',
    label: 'Primary tonal FAB',
    icon: html`<mx-icon slot="icon">check</mx-icon>Extended Primary Tonal FAB`,
    tonal: true,
  },
};

export const SecondaryTonal: FABStories = {
  args: {
    color: 'secondary',
    label: 'Secondary tonal FAB',
    icon: html`<mx-icon slot="icon">check</mx-icon>Extended Secondary Tonal FAB`,
    tonal: true,
  },
};

export const TertiaryTonal: FABStories = {
  args: {
    label: 'Tertiary tonal FAB',
    icon: html`<mx-icon slot="icon">check</mx-icon>Extended Tertiary Tonal FAB`,
    tonal: true,
  },
};

export const MediumSize: FABStories = {
  args: {
    label: 'Medium FAB',
    size: 'medium',
    icon: html`<mx-icon slot="icon">check</mx-icon>Extended Medium FAB`,
  },
};

export const LargeSize: FABStories = {
  args: {
    label: 'Large FAB',
    size: 'large',
    icon: html`<mx-icon slot="icon">check</mx-icon>Extended Large FAB`,
  },
};

export const Reversed: FABStories = {
  args: {
    label: 'Reversed FAB',
    icon: html`<mx-icon slot="icon">check</mx-icon>Extended Large FAB`,
    style: '--md-extended-fab-direction: row-reverse;',
  },
};
