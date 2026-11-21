# tree.py <profile.json>: handleEvent's subtree in a raw sampling profile, with self and total bytes.
import json, sys
p = json.load(open(sys.argv[1]))
def name(n):
    cf = n['callFrame']; u = cf['url']
    return f"{cf['functionName'] or '(anon)'}@{u.split('/src/')[-1] if '/src/' in u else (u.rsplit('/',1)[-1] or '-')}:{cf.get('lineNumber')}"
def total(n): return n['selfSize'] + sum(total(c) for c in n['children'])
def find(n, path):
    if n['callFrame']['functionName'] == 'handleEvent' and 'session.ts' in n['callFrame']['url']:
        yield n, path
    for c in n['children']:
        yield from find(c, path + [name(n)])
def dump(n, d=0):
    t = total(n)
    if t == 0: return
    print('  '*d + f"{name(n)} self={n['selfSize']} total={t}")
    for c in sorted(n['children'], key=lambda c: -total(c)):
        dump(c, d+1)
for n, path in find(p['head'], []):
    print('PATH', ' > '.join(path[-6:]))
    dump(n)
