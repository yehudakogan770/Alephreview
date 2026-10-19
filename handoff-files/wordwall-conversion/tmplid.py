import re, json, subprocess
from concurrent.futures import ThreadPoolExecutor
names = {}
for l in open('tmpl.tsv'):
    i, t = l.rstrip('\n').split('\t'); names[i] = t.split(' - ')[-1].strip()
def get(i):
    h = subprocess.run(["curl","-sSL","-m","25",f"https://wordwall.net/resource/{i}"],capture_output=True,text=True).stdout
    m = re.search(r'"templateId":(\d+)', h)
    return i, int(m.group(1)) if m else None
with ThreadPoolExecutor(8) as ex: res = dict(ex.map(get, names))
tmap = {}
for i, tid in res.items():
    if tid and names[i] != 'Private resource':
        tmap.setdefault(tid, set()).add(names[i])
print({k: sorted(v) for k, v in sorted(tmap.items())})
json.dump({str(k): sorted(v)[0] for k, v in tmap.items()}, open('tmplids.json','w'), indent=1)
