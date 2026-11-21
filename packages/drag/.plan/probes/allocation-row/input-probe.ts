// P5 probe. Runs as tests/probe-input.browser.test.ts, copied there and removed afterwards.
import { expect, it } from 'vitest';
import { commands, frames, isChromium, onCleanup } from './support/harness.ts';

type Seen = Readonly<{
  type: string;
  clientX: number;
  clientY: number;
  buttons: number;
  pointerType: string;
  isTrusted: boolean;
  pressure: number;
}>;

it.runIf(isChromium)('should probe the two held moves', async () => {
  const box = document.createElement('div');

  box.style.cssText =
    'position:fixed;left:0;top:0;width:400px;height:400px;touch-action:none';
  document.body.append(box);

  const seen: Seen[] = [];
  const record = (event: PointerEvent): void => {
    seen.push({
      type: event.type,
      clientX: event.clientX,
      clientY: event.clientY,
      buttons: event.buttons,
      pointerType: event.pointerType,
      isTrusted: event.isTrusted,
      pressure: event.pressure,
    });
  };

  for (const type of ['pointermove', 'pointerup', 'pointerdown'] as const) {
    window.addEventListener(type, record, true);
  }
  onCleanup(() => {
    for (const type of ['pointermove', 'pointerup', 'pointerdown'] as const) {
      window.removeEventListener(type, record, true);
    }
  });

  await commands.pointerMove(100, 100);
  await commands.pointerDown();
  await frames();
  seen.length = 0;

  // P5: one move each, to the same point, with the button held.
  await commands.pointerMove(150.5, 120.25);
  await frames();
  const byPlaywright = seen.splice(0);

  await commands.pointerMove(100, 100);
  await frames();
  seen.length = 0;
  await commands.pointerMoveHeldByCdp(150.5, 120.25);
  await frames();
  const byCdp = seen.splice(0);

  // Property 3: where Playwright's release lands after a CDP move, without and
  // with the row's synchronizing move.
  await commands.pointerMoveHeldByCdp(170, 130);
  await frames();
  seen.length = 0;
  await commands.pointerUp();
  await frames();
  const upWithoutSync = seen.splice(0);

  await commands.pointerMove(100, 100);
  await commands.pointerDown();
  await commands.pointerMoveHeldByCdp(170, 130);
  await commands.pointerMove(170, 130);
  await frames();
  seen.length = 0;
  await commands.pointerUp();
  await frames();
  const upWithSync = seen.splice(0);

  console.log(
    'P5PROBE ' +
      JSON.stringify({ byPlaywright, byCdp, upWithoutSync, upWithSync }),
  );
  expect(byCdp).toEqual(byPlaywright);
});
