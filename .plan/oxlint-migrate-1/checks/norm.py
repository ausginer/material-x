# Prints ESLint JSON results as sorted "path:line:col rule severity" lines.
import json, sys, os
for path in sys.argv[1:]:
    text = open(path).read()
    start = text.find('[')
    end = text.rfind(']')
    data = json.loads(text[start:end+1])
    lines = []
    for f in data:
        rel = os.path.relpath(f['filePath'], '/workspaces/worktrees/b')
        for m in f['messages']:
            lines.append(f"{rel}:{m.get('line')}:{m.get('column')} {m.get('ruleId')} {m.get('severity')} {m.get('message')[:80]}")
    print(f"== {os.path.basename(path)} {len(data)} files, {len(lines)} messages")
    print("\n".join(sorted(lines)))
