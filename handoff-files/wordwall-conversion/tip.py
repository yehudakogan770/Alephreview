import sys, json, urllib.request, os
from concurrent.futures import ThreadPoolExecutor
import subprocess
rows=[l.split() for l in open(sys.argv[1])]
def get(r):
    gid, emb = r
    html = subprocess.run(["curl","-sSL","-m","25",f"https://wordwall.net/embed/{emb}"],capture_output=True,text=True).stdout
    i = html.find("window.pageData=")
    if i < 0: return gid, None
    try:
        obj,_ = json.JSONDecoder().raw_decode(html[i+len("window.pageData="):])
        return gid, (obj.get("activityInstruction") or "").strip()
    except Exception:
        return gid, None
with ThreadPoolExecutor(8) as ex:
    out = dict(ex.map(get, rows))
json.dump(out, open(sys.argv[2],"w"), ensure_ascii=False, indent=0)
print("total", len(out), "with tip", sum(1 for v in out.values() if v), "failed", sum(1 for v in out.values() if v is None))
for k,v in list(out.items()):
    print(k, "|", v)
