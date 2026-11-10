#!/usr/bin/env bash
# Patch npm bundled with Zed, under the devcontainer user's data directory.
shopt -s nullglob
zed_node_dir="${XDG_DATA_HOME:-$HOME/.local/share}/zed/node"
found=0

for node in "$zed_node_dir"/node-v*-linux-*/bin/node; do
  npm="${node%/node}/npm"
  [[ -x "$node" && -f "$npm" ]] || continue
  found=1

  if ! "$node" - "$npm" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const file = fs.realpathSync(process.argv[2]);
const source = fs.readFileSync(file, 'utf8');
const marker = '/* Zed npm timeout patch */';
if (source.includes(marker)) process.exit(0);

const patch = `
${marker}
for (let i = 2; i < process.argv.length && process.argv[i] !== '--'; i++) {
  if (process.argv[i] === '--fetch-timeout=5000') {
    process.argv[i] = '--fetch-timeout=60000';
  } else if (process.argv[i] === '--fetch-timeout' && process.argv[i + 1] === '5000') {
    process.argv[++i] = '60000';
  }
}
`;

const backup = file + '.zed-timeout-backup';
try {
  fs.copyFileSync(file, backup, fs.constants.COPYFILE_EXCL);
} catch (error) {
  if (error.code !== 'EEXIST' || fs.readFileSync(backup, 'utf8') !== source) throw error;
}

// Keep the npm symlink intact and replace its target atomically.
const tempDir = fs.mkdtempSync(path.join(path.dirname(file), '.zed-npm-timeout-'));
const tempFile = path.join(tempDir, 'npm-cli.js');
try {
  fs.writeFileSync(tempFile, source.replace(/^(#![^\n]*\n)?/, head => head + patch));
  fs.chmodSync(tempFile, fs.statSync(file).mode & 0o777);
  fs.renameSync(tempFile, file);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}

console.log('[zed-npm-timeout] Patched ' + file + ' (5s -> 60s)');
NODE
  then
    printf '[zed-npm-timeout] Could not patch %s; continuing startup.\n' "$npm" >&2
  fi
done

if (( ! found )); then
  printf '[zed-npm-timeout] Bundled npm not found; rerun after Zed downloads Node.js.\n'
fi
