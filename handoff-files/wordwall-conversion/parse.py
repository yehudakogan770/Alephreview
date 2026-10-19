import zipfile,re,html,json,glob
out={}
for f in sorted(glob.glob('ww/Wordwall/[ORW]*.docx')):
    z=zipfile.ZipFile(f); x=z.read('word/document.xml').decode()
    rels=z.read('word/_rels/document.xml.rels').decode()
    rm=dict(re.findall(r'Id="(\w+)"[^>]*Target="([^"]+)"',rels))
    cur=None
    for para in re.findall(r'<w:p[ >].*?</w:p>',x,re.S):
        text=html.unescape(''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>',para))).strip()
        links=[rm.get(i,'') for i in re.findall(r'r:id="(\w+)"',para)]
        m=re.match(r'(White|Red|Orange)\s+Level\s+(\d)',text,re.I)
        if m: cur=(m.group(1).capitalize(),int(m.group(2))); out.setdefault(cur,[]); continue
        if cur is None: continue
        blob=text+' '+' '.join(links)
        for em in re.finditer(r'<a[^>]*href="https://wordwall.net/resource/(\d+)[^"]*"[^>]*>.*?<img src="([^"]+)".*?<span>(.*?)</span>',text,re.S):
            out[cur].append(dict(id=em.group(1),thumb=em.group(2),title=em.group(3).strip()))
        if '<a' in text: continue
        ids=re.findall(r'wordwall.net/resource/(\d+)',blob)
        plays=re.findall(r'wordwall.net/play/(\d+/\d+/\d+)',blob)
        for i in dict.fromkeys(ids):
            out[cur].append(dict(id=i,play=plays[0] if plays else None))
res={}
for k,items in out.items():
    merged={}
    for it in items:
        d=merged.setdefault(it['id'],{'id':it['id']})
        for kk,v in it.items():
            if v and not d.get(kk): d[kk]=v
    res[f'{k[0]}-{k[1]}']=list(merged.values())
for k,v in res.items():
    print(k,len(v))
    for g in v: print('  ',g.get('id'),g.get('play'),'|',g.get('title'),'|', 'thumb' if g.get('thumb') else '-')
json.dump(res,open('games.json','w'),ensure_ascii=False,indent=1)
