// Collects personal values from the raw tables (author and revisionAuthor
// fields, settings' email addresses) and reports, per category, how many
// distinct values exist and how many tracked files at HEAD contain any of
// them. It prints counts and file paths only, never a value.
const fs = require('fs'),
  path = require('path'),
  { execFileSync } = require('child_process');
const [tables, repo] = process.argv.slice(2);
const found = {
  email: new Set(),
  gaiaId: new Set(),
  imageUrl: new Set(),
  displayName: new Set(),
};
const walk = (v, key, inPerson) => {
  if (Array.isArray(v)) {
    for (const x of v) walk(x, key, inPerson);
    return;
  }
  if (v && typeof v === 'object') {
    for (const [k, x] of Object.entries(v))
      walk(x, k, inPerson || k === 'author' || k === 'revisionAuthor');
    return;
  }
  if (typeof v !== 'string' || v === '') return;
  if (key === 'email' || key === 'emailAddress') found.email.add(v);
  else if (inPerson && key in found) found[key].add(v);
};
for (const f of fs.readdirSync(tables))
  walk(JSON.parse(fs.readFileSync(path.join(tables, f), 'utf8')), '', false);
const files = execFileSync('git', ['-C', repo, 'ls-files', '-z'], {
  encoding: 'utf8',
  maxBuffer: 1 << 26,
})
  .split('\0')
  .filter(Boolean);
for (const [category, values] of Object.entries(found)) {
  const hits = [];
  for (const file of files) {
    let text;
    try {
      text = fs.readFileSync(path.join(repo, file), 'utf8');
    } catch {
      continue;
    }
    if ([...values].some((value) => text.includes(value))) hits.push(file);
  }
  console.log(
    `${category}: ${values.size} distinct values; tracked files containing one: ${hits.length}${hits.length ? ' — ' + hits.join(', ') : ''}`,
  );
}
