// RF-61: what a page served over plain HTTP from a host other than localhost has of `crypto`.
// Run as: node probe.mjs <checkout with playwright installed>
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';

const pw = createRequire(`${process.argv[2]}/package.json`)('playwright');
const ip = Object.values(networkInterfaces())
  .flat()
  .find((a) => a.family === 'IPv4' && !a.internal).address;
const page = `<!doctype html><script type="module">
  const out = { origin: location.origin, isSecureContext, randomUUID: typeof crypto.randomUUID, getRandomValues: typeof crypto.getRandomValues };
  try { out.call = String(crypto.randomUUID()).length; } catch (e) { out.call = String(e); }
  const bytes = crypto.getRandomValues(new Uint8Array(16)); out.getRandomValuesBytes = bytes.length;
  window.__out = out;
</script>`;
const server = createServer((_, res) => res.end(page)).listen(0, '0.0.0.0');
await new Promise((r) => server.once('listening', r));
const { port } = server.address();
for (const name of ['chromium', 'firefox', 'webkit']) {
  const browser = await pw[name].launch();
  for (const host of [ip, 'localhost']) {
    const p = await browser.newPage();
    await p.goto(`http://${host}:${port}/`);
    await p.waitForFunction(() => window.__out);
    console.log(
      `${name} ${browser.version()}\t${JSON.stringify(await p.evaluate(() => window.__out))}`,
    );
    await p.close();
  }
  await browser.close();
}
server.close();
