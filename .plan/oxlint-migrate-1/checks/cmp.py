# Summarises the differences between two oxlint --print-config outputs.
import json, sys
a = json.load(open(sys.argv[1])); b = json.load(open(sys.argv[2]))
for k in sorted(set(a) | set(b)):
    if k in ('rules', 'overrides'):
        continue
    if a.get(k) != b.get(k):
        print('KEY', k, json.dumps(a.get(k))[:200], '=>', json.dumps(b.get(k))[:200])
def rdiff(tag, x, y):
    for r in sorted(set(x) | set(y)):
        if x.get(r) != y.get(r):
            print(tag, r, json.dumps(x.get(r)), '=>', json.dumps(y.get(r)))
rdiff('rules', a.get('rules', {}), b.get('rules', {}))
oa, ob = a.get('overrides', []), b.get('overrides', [])
if len(oa) != len(ob): print('override count', len(oa), len(ob))
for i, (x, y) in enumerate(zip(oa, ob)):
    for k in sorted(set(x) | set(y)):
        if k != 'rules' and x.get(k) != y.get(k):
            print(f'override {i} key', k, x.get(k), '=>', y.get(k))
    rdiff(f'override {i}', x.get('rules') or {}, y.get('rules') or {})
