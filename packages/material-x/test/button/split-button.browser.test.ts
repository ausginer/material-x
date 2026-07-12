import { describe, expect, it, vi, type Mock } from 'vitest';
import { $ } from 'ydin/utils/DOM.js';
import '../../src/button/split-button.ts';

function createSplitButton(): HTMLElement {
  const splitButton = document.createElement('mx-split-button');
  document.body.append(splitButton);
  return splitButton;
}

function getTrailingButton(splitButton: HTMLElement): HTMLButtonElement {
  const trailing = $(splitButton, 'mx-icon-button');
  const button = trailing && $<HTMLButtonElement>(trailing, '.host');

  if (!button) {
    throw new Error('Missing trailing split button action');
  }

  return button;
}

describe('mx-split-button events', () => {
  it('should expose a secondary action without exposing its internal click', () => {
    const splitButton = createSplitButton();
    const click: Mock<EventListener> = vi.fn();
    const secondaryAction = vi.fn<(event: Event) => void>();

    splitButton.addEventListener('click', click);
    splitButton.addEventListener('secondaryaction', secondaryAction);

    getTrailingButton(splitButton).click();

    expect(click).not.toHaveBeenCalled();
    expect(secondaryAction).toHaveBeenCalledOnce();
  });

  it('should emit a bubbling composed non-cancelable secondary action', () => {
    const splitButton = createSplitButton();
    const events: Event[] = [];

    splitButton.addEventListener('secondaryaction', (event) => {
      events.push(event);
    });

    getTrailingButton(splitButton).click();

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(
      expect.objectContaining({
        bubbles: true,
        cancelable: false,
        composed: true,
        target: splitButton,
      }),
    );
  });
});
