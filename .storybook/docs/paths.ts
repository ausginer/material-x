const DOCS_ORIGIN = 'https://material-x.local';

export function withDocsBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = path.replace(/^\/+/, '');

  return new URL(normalizedPath, new URL(normalizedBase, DOCS_ORIGIN)).pathname;
}
