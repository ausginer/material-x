import { describe, expect, it, vi, type Mock } from 'vitest';
import '../../src/button/button.ts';
import '../../src/button/icon-button.ts';
import '../../src/button/link-button.ts';
import '../../src/button-group/button-group.ts';
import { $ } from 'ydin/utils/DOM.js';

type ButtonTag = 'mx-button' | 'mx-icon-button';

function createElement<Tag extends keyof HTMLElementTagNameMap>(
  tag: Tag,
): HTMLElementTagNameMap[Tag] {
  const element = document.createElement(tag);
  document.body.append(element);
  return element;
}

function getNativeButton(element: HTMLElement): HTMLButtonElement {
  const button = $<HTMLButtonElement>(element, '.host');

  if (!button) {
    throw new Error('Missing internal native button');
  }

  return button;
}

function getNativeAnchor(element: HTMLElement): HTMLAnchorElement {
  const anchor = $<HTMLAnchorElement>(element, '.host');

  if (!anchor) {
    throw new Error('Missing internal native anchor');
  }

  return anchor;
}

describe.each<ButtonTag>(['mx-button', 'mx-icon-button'])('%s', (tag) => {
  it('should delegate focus to the native button', () => {
    const element = createElement(tag);

    element.focus();

    expect(element.shadowRoot?.activeElement).toBe(getNativeButton(element));
  });

  it('should expose disabled state to the native button', () => {
    const element = createElement(tag);

    element.disabled = true;

    expect(getNativeButton(element).disabled).toBe(true);
  });

  it('should suppress activation when disabled', () => {
    const element = createElement(tag);
    const click: Mock<EventListener> = vi.fn();
    element.disabled = true;
    element.addEventListener('click', click);

    getNativeButton(element).click();

    expect(click).not.toHaveBeenCalled();
  });
});

describe('mx-button', () => {
  it('should reflect the name property to the native button', () => {
    const element = createElement('mx-button');

    element.name = 'action';

    expect(getNativeButton(element).name).toBe('action');
  });

  it('should reflect the type property to the native button', () => {
    const element = createElement('mx-button');

    element.type = 'reset';

    expect(getNativeButton(element).type).toBe('reset');
  });

  it('should submit its associated form when activated', () => {
    const form = document.createElement('form');
    const button = document.createElement('mx-button');
    button.setAttribute('type', 'submit');
    form.append(button);
    document.body.append(form);

    const submit: Mock<EventListener> = vi.fn((event) => {
      event.preventDefault();
    });
    form.addEventListener('submit', submit);

    button.click();

    expect(submit).toHaveBeenCalledOnce();
  });

  it('should submit its associated form by default when it has no type', () => {
    const form = document.createElement('form');
    const button = document.createElement('mx-button');
    form.append(button);
    document.body.append(form);

    const submit: Mock<EventListener> = vi.fn((event) => {
      event.preventDefault();
    });
    form.addEventListener('submit', submit);

    button.click();

    expect(submit).toHaveBeenCalledOnce();
  });

  it('should attribute the submission to itself as the submitter', () => {
    const form = document.createElement('form');
    const button = document.createElement('mx-button');
    form.append(button);
    document.body.append(form);

    let submitEvent: SubmitEvent | undefined;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submitEvent = event;
    });

    button.click();

    expect(submitEvent?.submitter).toBe(button);
  });

  it('should reset its associated form when activated with type reset', () => {
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.name = 'field';
    input.defaultValue = 'initial';
    input.value = 'changed';
    const button = document.createElement('mx-button');
    button.setAttribute('type', 'reset');
    form.append(input, button);
    document.body.append(form);

    button.click();

    expect(input.value).toBe('initial');
  });

  it('should not submit its associated form with type button', () => {
    const form = document.createElement('form');
    const button = document.createElement('mx-button');
    button.setAttribute('type', 'button');
    form.append(button);
    document.body.append(form);

    const submit: Mock<EventListener> = vi.fn((event) => {
      event.preventDefault();
    });
    form.addEventListener('submit', submit);

    button.click();

    expect(submit).not.toHaveBeenCalled();
  });
});

describe('mx-button in a button group', () => {
  it('should derive disabled state from the group context', () => {
    const group = document.createElement('mx-button-group');
    group.toggleAttribute('disabled', true);
    const button = document.createElement('mx-button');
    group.append(button);
    document.body.append(group);

    expect(getNativeButton(button).disabled).toBe(true);
  });

  it('should re-enable when the group context clears disabled', () => {
    const group = document.createElement('mx-button-group');
    group.toggleAttribute('disabled', true);
    const button = document.createElement('mx-button');
    group.append(button);
    document.body.append(group);

    group.toggleAttribute('disabled', false);

    expect(getNativeButton(button).disabled).toBe(false);
  });
});

describe('mx-link-button', () => {
  it('should expose its destination on the native anchor', () => {
    const element = createElement('mx-link-button');

    element.href = '/destination';

    expect(getNativeAnchor(element).getAttribute('href')).toBe('/destination');
  });

  it('should reflect the navigation target to the native anchor', () => {
    const element = createElement('mx-link-button');

    element.target = '_blank';

    expect(getNativeAnchor(element).target).toBe('_blank');
  });

  it('should remove its destination when disabled', () => {
    const element = createElement('mx-link-button');
    element.href = '/destination';

    element.disabled = true;

    expect(getNativeAnchor(element).hasAttribute('href')).toBe(false);
  });

  it('should restore its destination when re-enabled', () => {
    const element = createElement('mx-link-button');
    element.href = '/destination';
    element.disabled = true;

    element.disabled = false;

    expect(getNativeAnchor(element).getAttribute('href')).toBe('/destination');
  });

  it('should mark the native anchor aria-disabled when disabled', () => {
    const element = createElement('mx-link-button');
    element.href = '/destination';

    element.disabled = true;

    expect(getNativeAnchor(element).getAttribute('aria-disabled')).toBe('true');
  });

  it('should remove the disabled anchor from the tab order', () => {
    const element = createElement('mx-link-button');
    element.href = '/destination';

    element.disabled = true;

    expect(getNativeAnchor(element).tabIndex).toBe(-1);
  });

  it('should suppress click propagation when disabled', () => {
    const element = createElement('mx-link-button');
    element.href = '/destination';
    element.disabled = true;
    const click: Mock<EventListener> = vi.fn();
    element.addEventListener('click', click);

    getNativeAnchor(element).click();

    expect(click).not.toHaveBeenCalled();
  });
});
