import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { fn } from 'storybook/test';
import './fab.ts';
import '../icon/icon.ts';
import type { FABColor, FABExtended, FABSize } from './fab.ts';

type FABProps = Readonly<{
  tonal?: boolean;
  color?: FABColor;
  label?: string;
  disabled?: boolean;
  size?: FABSize;
  icon?: TemplateResult | typeof nothing;
  extended?: FABExtended;
  onClick?(): void;
}>;

const meta: Meta<FABProps> = {
  title: 'Button/FAB',
  tags: ['autodocs'],
  render: ({
    tonal,
    color,
    onClick,
    disabled,
    extended,
    size,
    icon = nothing,
  }) =>
    html`<mx-fab
      ?disabled=${disabled}
      ?tonal=${tonal}
      extended=${ifDefined(extended)}
      color=${ifDefined(color)}
      size=${ifDefined(size)}
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
  args: { onClick: fn(), disabled: false },
};

export default meta;

type FABStories = StoryObj<FABProps>;

export const Primary: FABStories = {
  args: {
    color: 'primary',
    label: 'Primary FAB',
    icon: html`<mx-icon slot="icon">check</mx-icon>`,
  },
};

export const Secondary: FABStories = {
  args: {
    color: 'secondary',
    label: 'Secondary FAB',
    icon: html`<mx-icon slot="icon">check</mx-icon>`,
  },
};

export const Tertiary: FABStories = {
  args: {
    label: 'Tertiary FAB',
    icon: html`<mx-icon slot="icon">check</mx-icon>`,
  },
};

export const PrimaryTonal: FABStories = {
  args: {
    color: 'primary',
    label: 'Primary tonal FAB',
    icon: html`<mx-icon slot="icon">check</mx-icon>`,
    tonal: true,
  },
};

export const SecondaryTonal: FABStories = {
  args: {
    color: 'secondary',
    label: 'Secondary tonal FAB',
    icon: html`<mx-icon slot="icon">check</mx-icon>`,
    tonal: true,
  },
};

export const TertiaryTonal: FABStories = {
  args: {
    label: 'Tertiary tonal FAB',
    icon: html`<mx-icon slot="icon">check</mx-icon>`,
    tonal: true,
  },
};

export const MediumSize: FABStories = {
  args: {
    label: 'Medium FAB',
    size: 'medium',
    icon: html`<mx-icon slot="icon">check</mx-icon>`,
  },
};

export const LargeSize: FABStories = {
  args: {
    label: 'Large FAB',
    size: 'large',
    icon: html`<mx-icon slot="icon">check</mx-icon>`,
  },
};
