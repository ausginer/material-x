# Resolves oxlint --print-config to the effective severity per rule for a file
# name, applying matching overrides in order, then compares two captures.
import json, sys, fnmatch
def globs(p):
    if '{' in p:
        pre, rest = p.split('{', 1); alts, post = rest.split('}', 1)
        return [g for a in alts.split(',') for g in globs(pre + a + post)]
    return [p]
def matches(name, pats):
    return any(fnmatch.fnmatch(name, g.replace('**/', '')) for p in pats for g in globs(p))
def sev(v): return v[0] if isinstance(v, list) else v
def eff(cfg, name):
    r = {k: sev(v) for k, v in cfg['rules'].items()}
    for o in cfg['overrides']:
        if matches(name, o['files']):
            r.update({k: sev(v) for k, v in (o.get('rules') or {}).items()})
    return {k: ('off' if v in ('off', 'allow', 0) else 'on') for k, v in r.items()}
a, b = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
for name in sys.argv[3:]:
    ea, eb = eff(a, name), eff(b, name)
    for k in sorted(set(ea) | set(eb)):
        if ea.get(k, 'off') != eb.get(k, 'off'):
            print(name, k, ea.get(k, 'off'), '=>', eb.get(k, 'off'))
