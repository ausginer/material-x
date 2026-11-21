# drf2.py <logs>: the same count for the drag:DRF-2 row's window, with handleEvent's tier there.
import sys, re, json
for f in sys.argv[1:]:
    phase='pre'; churn=0
    for line in open(f, errors='replace'):
        m = re.search(r'PROBE-MARK ([\w-]+)', line)
        if m: phase=m.group(1); continue
        if phase=='drf2-start' and 'dependent property cell changed' in line: churn+=1
    t=open(f, errors='replace').read(); m=re.search(r'DRF2PROBE (\{.*\})', t)
    if not m: print(f, 'no drf2'); continue
    d=json.loads(m.group(1)); b=d['bytes']
    print(f"{f.rsplit('/',1)[1]:20} DRF2 st={d['drf2Before']}->{d['drf2After']} churn={churn} handleEvent={b.get('kernel/session.ts:handleEvent',0)} kernel={sum(v for k,v in b.items() if k.startswith('kernel/'))}")
