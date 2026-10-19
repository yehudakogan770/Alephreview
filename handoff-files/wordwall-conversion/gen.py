import json,re
d=json.load(open('games.json'))
# fix copy/paste errors in source docs (play link belongs to a different game)
for k,v in d.items():
    for g in v:
        if g['id']=='94393866': g['play']=None; g['title']=g.get('title') or 'Kamatz Patach Review'
        if g['id']=='8506651': g['play']=None
RULES=[
 ('flash',  r'flash|wheel'),
 ('order',  r'order|rank|right to left|sort'),
 ('arcade', r'balloon|ballon|whack|flying fruit|cloud tap|catch|swim'),
 ('match',  r'match|vs\.?|look alike|drag|התאמת|זיכרון'),
 ('quiz',   r'find|where is|quiz|gameshow|win or lose|missing|can you|choose'),
 ('reading',r'read|syllable|קריאת|letter plus'),
]
def typ(t):
    t=(t or '').lower()
    for k,p in RULES:
        if re.search(p,t): return k
    return 'review'
def clean(t):
    t=re.sub(r'\s*Copy of\b.*$','',t or '').strip(' -')
    return re.sub(r'\s*Copy$','',t).strip() or t
lines=['// Game list for each belt and stripe.',
 '// To add a game: copy a line into the right stripe and change the id, title and type.',
 '// id    = the number in the Wordwall link (wordwall.net/resource/12345678)',
 '// play  = optional student link path (wordwall.net/play/12345/678/901)',
 '// type  = one of the keys in GAME_TYPES below',
 '','const GAME_TYPES = {',
 '  match:   { label: "Matching",        icon: "🔗" },',
 '  order:   { label: "Put in Order",    icon: "🔢" },',
 '  arcade:  { label: "Arcade",          icon: "🎈" },',
 '  quiz:    { label: "Find It & Quiz",  icon: "🔍" },',
 '  reading: { label: "Reading Practice",icon: "📖" },',
 '  flash:   { label: "Flash Cards & Wheels", icon: "🎡" },',
 '  review:  { label: "Mixed Review",    icon: "⭐" },',
 '};','','const GAMES = {']
for belt in ['White','Red','Orange']:
    lines.append(f'  {belt.lower()}: {{')
    for s in (1,2,3):
        lines.append(f'    {s}: [')
        for g in d.get(f'{belt}-{s}',[]):
            o={'id':g['id'],'title':clean(g.get('title')),'type':typ(g.get('title'))}
            if g.get('play'): o['play']=g['play']
            if g.get('thumb'): o['thumb']=g['thumb'].replace('https://screens.cdn.wordwall.net/200/','')
            lines.append('      '+json.dumps(o,ensure_ascii=False)+',')
        lines.append('    ],')
    lines.append('  },')
lines.append('};')
open('/home/user/Alephreview/js_games.js','w').write('\n'.join(lines)+'\n')
from collections import Counter
print(Counter(typ(g.get('title')) for v in d.values() for g in v))
for v in d.values():
  for g in v: print(typ(g.get('title')),'|',clean(g.get('title')))
