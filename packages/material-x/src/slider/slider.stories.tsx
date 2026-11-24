import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties, JSX } from 'react';
// oxlint-disable-next-line import/no-duplicates
import './slider.ts';
// oxlint-disable-next-line import/no-duplicates
import type Slider from './slider.ts';
import type { SliderSize } from './slider.ts';

const STACK_STYLES: CSSProperties = {
  display: 'grid',
  gap: '24px',
  inlineSize: 'min(360px, 80vw)',
  // Room for the value indicator of the first slider.
  paddingBlockStart: '56px',
};

const meta: Meta = {
  title: 'Slider',
  decorators: [
    (Component: () => JSX.Element): JSX.Element => (
      <div style={STACK_STYLES}>
        <Component />
      </div>
    ),
  ],
};

export default meta;

type PlaygroundArgs = Readonly<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  size: SliderSize | 'xsmall';
  indicator: boolean;
  disabled: boolean;
}>;

export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    label: 'Volume',
    value: 40,
    min: 0,
    max: 100,
    step: 1,
    size: 'xsmall',
    indicator: true,
    disabled: false,
  },
  argTypes: {
    label: { control: 'text' },
    value: { control: 'number' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
    size: {
      control: 'inline-radio',
      options: ['xsmall', 'small', 'medium', 'large', 'xlarge'],
    },
    indicator: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  render({ label, value, min, max, step, size, indicator, disabled }) {
    return (
      <mx-slider
        value={value}
        min={min}
        max={max}
        step={step}
        size={size === 'xsmall' ? undefined : size}
        indicator={indicator}
        disabled={disabled}
      >
        <span slot="label">{label}</span>
      </mx-slider>
    );
  },
};

export const Sizes = (): JSX.Element => (
  <>
    <mx-slider value={40}>
      <span slot="label">Extra small</span>
    </mx-slider>
    <mx-slider value={40} size="small">
      <span slot="label">Small</span>
    </mx-slider>
    <mx-slider value={40} size="medium">
      <span slot="label">Medium</span>
    </mx-slider>
    <mx-slider value={40} size="large">
      <span slot="label">Large</span>
    </mx-slider>
    <mx-slider value={40} size="xlarge">
      <span slot="label">Extra large</span>
    </mx-slider>
  </>
);

function showDegrees(event: Event): void {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const slider = event.currentTarget as Slider;

  slider.valuetext = `${slider.value}°`;
}

export const ValueIndicator = (): JSX.Element => (
  <mx-slider
    min={-55}
    max={55}
    value={-18}
    valuetext="-18°"
    indicator
    oninput={showDegrees}
  >
    <span slot="label">Rotation</span>
  </mx-slider>
);

export const Disabled = (): JSX.Element => (
  <mx-slider value={40} disabled>
    <span slot="label">Disabled</span>
  </mx-slider>
);

export const RightToLeft = (): JSX.Element => (
  <div dir="rtl">
    <mx-slider value={40} indicator>
      <span slot="label">Right to left</span>
    </mx-slider>
  </div>
);

const HUE_STYLES: CSSProperties = {
  background:
    'linear-gradient(to right, red, yellow, lime, aqua, blue, magenta, red) center / 100% 16px no-repeat',
  '--md-slider-active-track-color': 'transparent',
  '--md-slider-inactive-track-color': 'transparent',
  '--md-slider-stop-indicator-color': 'transparent',
  '--md-slider-handle-color': 'black',
};

export const OverGradient = (): JSX.Element => (
  <mx-slider max={360} value={120} aria-label="Hue" style={HUE_STYLES} />
);

const SCROLL_STYLES: CSSProperties = {
  display: 'grid',
  gap: '160px',
  paddingBlock: '40px 100vh',
};

/** A page that scrolls, to try touch scrolling that starts on a slider. */
export const ScrollingPage = (): JSX.Element => (
  <div style={SCROLL_STYLES}>
    <mx-slider value={40} indicator>
      <span slot="label">First</span>
    </mx-slider>
    <mx-slider value={60} indicator size="medium">
      <span slot="label">Second</span>
    </mx-slider>
    <mx-slider value={20} indicator>
      <span slot="label">Third</span>
    </mx-slider>
  </div>
);
