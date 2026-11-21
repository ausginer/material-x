# corr.py <logs>: per traced run, the recompiles inside the window ("dependent property cell changed") against handleEvent's bytes.
import sys, re, json
for f in sys.argv[1:]:
    phase='pre'; churn=0; hopt=None; n=0
    for line in open(f, errors='replace'):
        m = re.search(r'PROBE-MARK ([\w-]+)', line)
        if m: phase=m.group(1); continue
        if phase=='window-start' and 'pw:browser' in line:
            if 'dependent property cell changed' in line: churn+=1
            if 'JSFunction handleEvent' in line and 'marking' in line: hopt=churn
    t=open(f, errors='replace').read(); m=re.search(r'PROBE (\{.*\})', t)
    b=json.loads(m.group(1))['bytes']
    he=b.get('kernel/session.ts:handleEvent',0)
    print(f"{f.rsplit('/',1)[1]:20} churn_in_window={churn:4} handleEvent_marked_after_churn#={hopt} handleEvent={he:6} per_churn={he/churn if churn else float('nan'):6.1f}")
