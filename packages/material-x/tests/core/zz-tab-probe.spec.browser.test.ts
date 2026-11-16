// Scratch probe for RD-12 property 10's Tab preference, removed after its reading.
import { expect, it } from 'vitest';
import { server, userEvent } from 'vitest/browser';
import '../../src/button/button.ts';

it('should report where Tab puts focus', async () => {
  const element = document.createElement('mx-button');
  element.textContent = 'label';
  document.body.append(element);
  (document.activeElement as HTMLElement | null)?.blur();
  await userEvent.keyboard('{Tab}');
  const native = element.shadowRoot!.querySelector('.host');
  // oxlint-disable-next-line no-console
  console.log(
    `TABPROBE ${server.browser} activeElement=${document.activeElement?.localName} shadow=${element.shadowRoot!.activeElement === native ? 'native button' : (element.shadowRoot!.activeElement?.localName ?? 'null')}`,
  );
  expect(true).toBe(true);
});
