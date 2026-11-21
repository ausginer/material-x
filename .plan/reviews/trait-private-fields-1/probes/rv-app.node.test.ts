import { readFile, writeFile } from 'node:fs/promises';
import { it } from 'vitest';
import { fixtureId, transformTrait } from './helpers.ts';
it('app build', async () => {
  const id = fixtureId('rv-traits.ts');
  const src = await readFile(id, 'utf8');
  await writeFile(
    process.env.RV_OUT!,
    `--- library\n${transformTrait(id, src, false)}\n--- application\n${transformTrait(id, src, true)}`,
  );
});
