# sizes.py <profile.json>: the histogram of sampled sizes per src function.
import json, sys, collections
p = json.load(open(sys.argv[1]))
ids = {}
def walk(n):
    ids[n['id']] = n
    for c in n['children']: walk(c)
walk(p['head'])
by = collections.defaultdict(collections.Counter)
for s in p.get('samples', []):
    n = ids[s['nodeId']]; cf = n['callFrame']
    if '/src/' in cf['url']:
        by[cf['url'].split('/src/')[-1] + ':' + cf['functionName']][s['size']] += 1
for k, c in sorted(by.items()):
    print(k, dict(sorted(c.items())))
print('nsamples', len(p.get('samples', [])), 'keys', list(p.keys()))
