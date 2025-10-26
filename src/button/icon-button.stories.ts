import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, nothing } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { fn } from 'storybook/test';
import '../icon/icon.ts';
import './icon-button.ts';
import type { IconButtonAttributes } from './icon-button.ts';
import {
  colorControl,
  shapeControl,
  sizeControl,
  widthControl,
} from './stories-utils.ts';

type IconButtonProps = Readonly<
  IconButtonAttributes & {
    onClick?(): void;
    disabled?: boolean;
    icon?: string;
  }
>;

const meta: Meta<IconButtonProps> = {
  title: 'Button/Icon',
  tags: ['autodocs'],
  render: ({ color, onClick, disabled, size, shape, icon, width }) => {
    const iconElement = icon ? html`<mx-icon>${icon}</mx-icon>` : nothing;

    return html`<mx-icon-button
      ?disabled=${disabled}
      color=${ifDefined(color)}
      size=${ifDefined(size)}
      shape=${ifDefined(shape)}
      width=${ifDefined(width)}
      @click=${onClick}
      >${iconElement}</mx-icon-button
    >`;
  },
  argTypes: {
    color: colorControl,
    size: sizeControl,
    shape: shapeControl,
    width: widthControl,
    disabled: {
      control: {
        type: 'boolean',
      },
    },
  },
  args: { onClick: fn(), disabled: false },
};

export default meta;

type IconButtonStories = StoryObj<IconButtonProps>;

export const FilledColor: IconButtonStories = {
  args: {
    icon: 'play_arrow',
  },
};

export const OutlinedColor: IconButtonStories = {
  args: {
    color: 'outlined',
    icon: 'play_arrow',
  },
};

export const TonalColor: IconButtonStories = {
  args: {
    color: 'tonal',
    icon: 'play_arrow',
  },
};

export const ElevatedColor: IconButtonStories = {
  args: {
    color: 'elevated',
    icon: 'play_arrow',
  },
};

export const TextColor: IconButtonStories = {
  args: {
    color: 'text',
    icon: 'play_arrow',
  },
};

export const SquareShape: IconButtonStories = {
  args: {
    icon: 'play_arrow',
    shape: 'square',
  },
};

export const XSmallSize: IconButtonStories = {
  args: {
    icon: 'play_arrow',
    size: 'xsmall',
  },
};

export const SmallSize: IconButtonStories = {
  args: {
    icon: 'play_arrow',
    size: 'small',
  },
};

export const MediumSize: IconButtonStories = {
  args: {
    icon: 'play_arrow',
    size: 'medium',
  },
};

export const LargeSize: IconButtonStories = {
  args: {
    icon: 'play_arrow',
    size: 'large',
  },
};

export const XLargeSize: IconButtonStories = {
  args: {
    icon: 'play_arrow',
    size: 'xlarge',
  },
};
