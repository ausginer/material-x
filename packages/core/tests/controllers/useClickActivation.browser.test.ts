import { describe, expect, it } from 'vitest';
import { useClickActivation } from '../../src/controllers/useClickActivation.ts';
import { host } from '../browser.ts';

type Fixture = Readonly<{
  element: HTMLElement;
  target: HTMLButtonElement;
  /** The clicks that reach the host's parent, with whether each was cancelled. */
  parentClicks: boolean[];
  targetClicks: () => number;
}>;

function setup(): Fixture {
  let target!: HTMLButtonElement;
  const element = host((instance) => {
    target = instance
      .attachShadow({ mode: 'open' })
      .appendChild(document.createElement('button'));
    useClickActivation(instance, target);
  });
  const parent = document.createElement('div');
  const parentClicks: boolean[] = [];
  let targetClicks = 0;

  parent.addEventListener('click', (event) => {
    parentClicks.push(event.defaultPrevented);
  });
  target.addEventListener('click', () => {
    targetClicks += 1;
  });
  parent.append(element);
  document.body.append(parent);

  return { element, target, parentClicks, targetClicks: () => targetClicks };
}

describe('useClickActivation', () => {
  it('should click the target once for a click on the host', () => {
    const { element, targetClicks } = setup();

    element.click();

    expect(targetClicks()).toBe(1);
  });

  it('should cancel a click on the host', () => {
    const { element } = setup();

    const dispatched = element.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );

    expect(dispatched).toBe(false);
  });

  it("should let the host's parent receive only the target's click", () => {
    const { element, parentClicks } = setup();

    element.click();

    expect(parentClicks).toStrictEqual([false]);
  });

  it('should pass a click on the target unchanged', () => {
    const { target, parentClicks, targetClicks } = setup();

    target.click();

    expect({
      target: targetClicks(),
      parent: parentClicks,
    }).toStrictEqual({ target: 1, parent: [false] });
  });
});
