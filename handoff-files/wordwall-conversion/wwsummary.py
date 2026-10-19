import json, glob, re
def t(x):
    if not isinstance(x, dict): return str(x)
    s = re.sub(r'<[^>]+>', '', x.get('text') or '').strip()
    if x.get('image'): s += '[IMG%s]' % x['image'].split('-')[-1]
    if x.get('sound'): s += '[SND]'
    return s or '∅'
out = []
for f in sorted(glob.glob('wwcontent/*.json'), key=lambda f: (json.load(open(f))['belt'], json.load(open(f))['stripe'])):
    d = json.load(open(f)); c = d['content']['content']
    out.append(f"##### {d['belt']} {d['stripe']} | {d['id']} | {d['game']} | {d['title']} | instr: {d['content'].get('instruction')}")
    for k, v in c.items():
        if k == 'pairs': out += [f"  {t(p['primary'])}  =  {t(p['secondary'])}" for p in v]
        elif k == 'questions': out += [f"  Q: {t(q['question'])}  A: " + ' | '.join(('*' if a['isCorrect'] else '') + t(a) for a in q['answers']) for q in v]
        elif k == 'groups': out += [f"  G {t(g['header'])}: " + ', '.join(t(i) for i in g['items']) for g in v]
        elif k == 'items': out.append('  ' + ', '.join(t(i) for i in v))
        elif k == 'sentences': out += [f"  S: {s['markupText']}  wrong: {s.get('wrongWords')}" for s in v]
        elif k == 'labels': out.append('  ' + ', '.join(f"{t(l)}@{l['x']:.2f},{l['y']:.2f}" for l in v))
        elif k == 'image': out.append(f'  board image: {v}')
        elif isinstance(v, list): out.append(f'  {k}: ' + ', '.join(t(i) for i in v))
        else: out.append(f'  {k}: {json.dumps(v, ensure_ascii=False)[:200]}')
open('wwsummary.txt', 'w').write('\n'.join(out))
print(len(out))
