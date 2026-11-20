# Lists rules whose ESLint --print-config entry differs between two captures.
import json, sys
a = json.load(open(sys.argv[1]))['rules']; b = json.load(open(sys.argv[2]))['rules']
sev = lambda v: None if v is None else (v[0] if isinstance(v, list) else v)
for r in sorted(set(a) | set(b)):
    if a.get(r) != b.get(r):
        print(r, sev(a.get(r)), '=>', sev(b.get(r)))
