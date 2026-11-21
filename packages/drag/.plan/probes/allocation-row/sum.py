# sum.py '<glob of logs>': one line per run: the kernel's bytes per move, handleEvent's tier, the largest keys.
import json, re, sys, glob
for f in sorted(glob.glob(sys.argv[1]), key=lambda x: (x.rsplit('-',1)[0], int(re.search(r'-(\d+)\.log$', x).group(1)))):
    t = open(f).read()
    m = re.search(r'PROBE (\{.*\})', t)
    failed = 'should allocate per sample only' in t and '×' in t
    if not m:
        print(f.rsplit('/',1)[1], 'no probe', 'FAIL' if failed else ''); continue
    d = json.loads(m.group(1)); b = d['bytes']
    kern = sum(v for k, v in b.items() if k.startswith('kernel/') or k.startswith('draggable.ts:'))
    total = sum(b.values())
    top = sorted(b.items(), key=lambda kv: -kv[1])[:6]
    print(f"{f.rsplit('/',1)[1]:14} kern/move={kern/300:7.2f} total/move={total/300:7.2f} w={d.get("warm")} st={d.get("statusStart")}->{d["statusBefore"]}->{d['statusAfter']} {'FAIL' if kern/300>=16 else 'pass'} " + ' '.join(f"{k}={v}" for k, v in top))
