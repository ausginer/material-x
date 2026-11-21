/** Reads m3.material.io, whose dated releases the store is converted from. */
import type { ManifestDatabase } from '../src/store/schema.ts';

export async function fetchText(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url}: ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

/** The release the site shows now: `environment.carbonVersion` in its bundle. */
export async function readCurrentRelease(): Promise<string> {
  const site = 'https://m3.material.io/';
  const page = await fetchText(site);
  const bundle = /static\/angular\/main\.[\da-f]+\.js/u.exec(page)?.[0];
  if (bundle == null) {
    throw new Error(`${site}: names no main bundle`);
  }
  const url = new URL(bundle, site).href;
  const release = /carbonVersion:"([^"]+)"/u.exec(await fetchText(url))?.[1];
  if (release == null) {
    throw new Error(`${url}: names no carbonVersion`);
  }
  return release;
}

/**
 * The database version that the table at `url` reports. The table is read in
 * memory, and only its `system.version` is kept.
 */
export async function readDatabase(url: string): Promise<ManifestDatabase> {
  const { system } = JSON.parse(await fetchText(url)) as {
    system: {
      version: { name: string; versionName: string; createTime: string };
    };
  };
  const { name, versionName, createTime } = system.version;
  return {
    versionName,
    versionId: name.slice(name.lastIndexOf('/') + 1),
    publishTime: createTime,
  };
}
