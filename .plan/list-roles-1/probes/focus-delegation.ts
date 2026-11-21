// Probe for RF-68's re-ruling: does `host.focus()` reach the control through
// `delegatesFocus` when the host is `display: contents` (#c) and when it has a
// box (#k with a button, #d with a link), with no `FocusForwarding`?
//
// node focus-delegation.ts
import { chromium, firefox, webkit } from 'playwright';
for (const type of [chromium, firefox, webkit]) {
  const b = await type.launch();
  const p = await b.newPage();
  await p.setContent('<x-a id="c"></x-a><x-a id="k"></x-a><x-b id="d"></x-b>');
  const r = await p.evaluate(() => {
    for (const [name, tag] of [
      ['x-a', 'button'],
      ['x-b', 'a'],
    ] as const) {
      customElements.define(
        name,
        class extends HTMLElement {
          constructor() {
            super();
            const root = this.attachShadow({
              mode: 'open',
              delegatesFocus: true,
            });
            root.innerHTML =
              `<style>:host{display:${'${'}d}}</style><${tag} ${tag === 'a' ? 'href="#x"' : ''}>x</${tag}>`.replace(
                '${d}',
                'block',
              );
          }
        },
      );
    }
    document.getElementById('c')!.style.display = 'contents';
    const out: string[] = [];
    for (const id of ['c', 'k', 'd']) {
      const el = document.getElementById(id)!;
      (document.activeElement as HTMLElement | null)?.blur();
      el.focus();
      const inner = el.shadowRoot!.activeElement?.localName ?? '-';
      out.push(
        `${id}(${getComputedStyle(el).display}): active=${document.activeElement?.id || document.activeElement?.localName} inner=${inner}`,
      );
    }
    return out.join(' | ');
  });
  console.log(type.name(), b.version(), r);
  await b.close();
}
