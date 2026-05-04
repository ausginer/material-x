import type { Meta, StoryObj } from '@storybook/react-vite';
import type { JSX } from 'react';
import '../button/icon-button.ts';
import '../icon/icon.ts';
import css from '../story.module.css';
import './list-button-item.ts';
import './list-item.ts';
import './list-link-item.ts';
import './list.ts';

const meta: Meta = {
  title: 'List',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div className={`${css['layout']} ${css['list-preview']}`}>
        <Component />
      </div>
    ),
  ],
};

export default meta;

type PlaygroundArgs = Readonly<{
  selected: boolean;
  disabled: boolean;
  overline: string;
  label: string;
  supportingText: string;
  useTrailingText: boolean;
  leadingVideo: boolean;
  leadingImage: boolean;
  leadingAvatar: boolean;
  leadingIcon: string;
  trailingIconOrText: string;
}>;

export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    selected: false,
    disabled: false,
    overline: '',
    label: 'List item',
    supportingText: '',
    useTrailingText: false,
    leadingVideo: false,
    leadingImage: false,
    leadingAvatar: false,
    leadingIcon: 'folder',
    trailingIconOrText: 'chevron_right',
  },
  argTypes: {
    selected: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    overline: {
      control: 'text',
    },
    label: {
      control: 'text',
    },
    supportingText: {
      control: 'text',
    },
    useTrailingText: {
      control: 'boolean',
    },
    leadingVideo: {
      control: 'boolean',
    },
    leadingImage: {
      control: 'boolean',
    },
    leadingAvatar: {
      control: 'boolean',
    },
    leadingIcon: {
      control: 'text',
    },
    trailingIconOrText: {
      control: 'text',
    },
  },
  render({
    selected,
    disabled,
    overline,
    label,
    supportingText,
    useTrailingText,
    leadingVideo,
    leadingImage,
    leadingAvatar,
    leadingIcon,
    trailingIconOrText,
  }) {
    return (
      <mx-list>
        <mx-list-button-item selected={selected} disabled={disabled}>
          {leadingVideo ? (
            <video data-wide slot="lead" muted autoPlay playsInline loop>
              <source
                src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
                type="video/mp4"
              />
            </video>
          ) : leadingImage ? (
            <img
              slot="lead"
              alt="image"
              src="https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg"
            />
          ) : leadingAvatar ? (
            <div slot="lead" className={css['avatar']} data-avatar>
              MX
            </div>
          ) : (
            leadingIcon && <mx-icon slot="lead">{leadingIcon}</mx-icon>
          )}
          {overline && <span slot="overline">{overline}</span>}
          {label}
          {supportingText && <span slot="support">{supportingText}</span>}
          {trailingIconOrText &&
            (useTrailingText ? (
              <span slot="trail">{trailingIconOrText}</span>
            ) : (
              <mx-icon slot="trail">{trailingIconOrText}</mx-icon>
            ))}
        </mx-list-button-item>
      </mx-list>
    );
  },
};

export const ContentDensity = (): JSX.Element => (
  <mx-list>
    <mx-list-item>
      <mx-icon slot="lead">inbox</mx-icon>
      One-line item
      <mx-icon slot="trail">chevron_right</mx-icon>
    </mx-list-item>
    <mx-list-item>
      <mx-icon slot="lead">draft</mx-icon>
      Two-line item
      <span slot="support">Supporting text</span>
      <span slot="trail">12:30</span>
    </mx-list-item>
    <mx-list-item>
      <span slot="lead" data-avatar="">
        A
      </span>
      Three-line item
      <span slot="overline">Overline</span>
      <span slot="support">
        Longer supporting text can wrap across a denser list row.
      </span>
      <mx-icon slot="trail">more_vert</mx-icon>
    </mx-list-item>
  </mx-list>
);

export const Interactive = (): JSX.Element => (
  <mx-list>
    <mx-list-button-item>
      <mx-icon slot="lead">archive</mx-icon>
      Button item
    </mx-list-button-item>
    <mx-list-link-item href="https://m3.material.io/components/lists/overview">
      <mx-icon slot="lead">open_in_new</mx-icon>
      Link item
      <mx-icon slot="trail">chevron_right</mx-icon>
    </mx-list-link-item>
    <mx-list-button-item selected>
      <mx-icon slot="lead">check</mx-icon>
      Selected item
    </mx-list-button-item>
    <mx-list-link-item
      href="https://m3.material.io/components/lists/overview"
      selected
    >
      <mx-icon slot="lead">bookmark</mx-icon>
      Current page item
      <mx-icon slot="trail">chevron_right</mx-icon>
    </mx-list-link-item>
    <mx-list-button-item disabled>
      <mx-icon slot="lead">block</mx-icon>
      Disabled item
    </mx-list-button-item>
  </mx-list>
);

export const Media = (): JSX.Element => (
  <mx-list>
    <mx-list-item>
      <video data-wide slot="lead" muted autoPlay playsInline loop>
        <source
          src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
          type="video/mp4"
        />
      </video>
      Videos
      <span slot="support">Leading video treatment</span>
    </mx-list-item>
    <mx-list-item>
      <img
        slot="lead"
        alt=""
        src="https://interactive-examples.mdn.mozilla.net/media/cc0-images/grapefruit-slice-332-332.jpg"
      />
      Photos
      <span slot="support">Leading image treatment</span>
    </mx-list-item>
    <mx-list-item>
      <span slot="lead" data-avatar="">
        M
      </span>
      Morgan Lee
      <span slot="support">Leading avatar treatment</span>
      <mx-icon-button color="standard" slot="trail">
        <mx-icon>chat</mx-icon>
      </mx-icon-button>
    </mx-list-item>
  </mx-list>
);
