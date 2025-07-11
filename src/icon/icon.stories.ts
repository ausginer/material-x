import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import './icon.js';

type IconProps = Readonly<{
  icon?: string;
}>;

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories
const meta: Meta<IconProps> = {
  title: 'Icon',
  tags: ['autodocs'],
  render: ({ icon }) => html`<mx-icon>${icon}</mx-icon>`,
  argTypes: {
    icon: {
      control: {
        type: 'text',
      },
    },
  },
};

export default meta;

type ButtonStories = StoryObj<IconProps>;

export const Favorite: ButtonStories = {
  args: {
    icon: 'favorite',
  },
};
