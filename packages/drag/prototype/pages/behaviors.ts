import { canvasGroup } from '../examples/canvas-group.ts';
import { dropZone } from '../examples/drop-zone.ts';
import { resizeHandle } from '../examples/resize-handle.ts';
import { scratch } from '../examples/scratch.ts';
import { checked, mountLog } from './shared.ts';

const log = mountLog();
const page = document.querySelector('#page')!;

page.innerHTML = `
  <h2>Resize handle: no lift, no verdict. Escape restores.</h2>
  <div class="resizable" id="resizable">Resize me<div class="grabber" id="grabber"></div></div>

  <h2>Drop zone: lift, hit-test, async verdict, landing</h2>
  <div class="controls"><label><input id="zone-fail" type="checkbox" /> The save rejects the drop</label></div>
  <div class="board" id="board">
    <div class="zone"><div class="card">Card A</div><div class="card">Card B</div></div>
    <div class="zone"></div>
    <div class="zone"></div>
  </div>

  <h2>Canvas group: no lift in a scaled canvas</h2>
  <div class="controls">
    <label><input id="canvas-fail" type="checkbox" /> The save fails</label>
    <button id="canvas-destroy">Destroy mid-drag, in 2s</button>
  </div>
  <p>Shift-press to add to the selection. During a drag, <kbd>N</kbd> nudges the group through <code>requestApply</code>, and Escape rolls it back. Edges snap to the other nodes.</p>
  <div class="canvas" id="canvas">
    <div class="guide" id="guide-x" hidden style="top:0;bottom:0;width:1px"></div>
    <div class="guide" id="guide-y" hidden style="left:0;right:0;height:1px"></div>
    <div class="node" style="left:30px;top:30px">One</div>
    <div class="node" style="left:150px;top:60px">Two</div>
    <div class="node" style="left:280px;top:40px">Three</div>
    <div class="node" style="left:90px;top:170px">Four</div>
  </div>

  <h2>Scratch: edit <code>examples/scratch.ts</code> and save</h2>
  <div class="arena" id="scratch" style="height:140px"><div class="card free" style="top:30px">Scratch</div></div>`;

resizeHandle(
  document.querySelector<HTMLElement>('#grabber')!,
  document.querySelector<HTMLElement>('#resizable')!,
  (size) => {
    log(
      `resize: ${typeof size === 'string' ? size : `${size.width}×${size.height}`}`,
    );
  },
);

dropZone(
  document.querySelector<HTMLElement>('#board')!,
  (card, _zone, signal) => {
    log(`drop zone: saving ${card.textContent}`);

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        const accepted = !checked('zone-fail');

        log(`drop zone: ${accepted ? 'accepted' : 'rejected'}`);
        resolve(accepted);
      }, 500);

      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        log('drop zone: save aborted', 'request');
      });
    });
  },
);

const guideX = document.querySelector<HTMLElement>('#guide-x')!;
const guideY = document.querySelector<HTMLElement>('#guide-y')!;
const group = canvasGroup(
  document.querySelector<HTMLElement>('#canvas')!,
  (moves, signal) => {
    log(`canvas: saving ${moves.length} node(s)`);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (checked('canvas-fail')) {
          reject(new Error('the save failed'));
        } else {
          log('canvas: saved');
          resolve();
        }
      }, 400);

      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        log('canvas: save aborted', 'request');
      });
    });
  },
  (x, y) => {
    guideX.hidden = x === null;
    guideY.hidden = y === null;
    guideX.style.left = `${x}px`;
    guideY.style.top = `${y}px`;
  },
);

addEventListener('keydown', (event) => {
  if (event.key === 'n' || event.key === 'N') {
    group.nudge(10);
    log('canvas: nudge', 'request');
  }
});

document.querySelector('#canvas-destroy')!.addEventListener('click', () => {
  setTimeout(() => {
    log('canvas: requestDestroy', 'request');
    void group.panel.requestDestroy();
  }, 2000);
});

// The hot-reload seam: only the scratch behavior is swapped.
const scratchRoot = document.querySelector<HTMLElement>('#scratch')!;
const scratchLog = (text: string): void => {
  log(`scratch: ${text}`);
};
let scratchPanel = scratch(scratchRoot, scratchLog);

if (import.meta.hot) {
  import.meta.hot.accept('../examples/scratch.ts', (next) => {
    if (next) {
      void scratchPanel.requestDestroy().then(() => {
        scratchPanel = (next as unknown as { scratch: typeof scratch }).scratch(
          scratchRoot,
          scratchLog,
        );
        log('scratch: reloaded');
      });
    }
  });
}
