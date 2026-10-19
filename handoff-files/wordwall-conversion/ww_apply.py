# Puts each recreated Wordwall game into data/site.json where the Wordwall game
# was, and hides the Wordwall game (kept, so it can be shown again).
import json
PATH = '/home/user/Alephreview/data/site.json'
conv = json.load(open('ww_converted.json'))['games']
TEMPLATE = {"match": "Match it", "pairs": "Flip and match", "find": "Find it", "truefalse": "Right or wrong", "quiz": "Pick the answer",
            "gameshow": "Game show", "winlose": "Win or lose", "sort": "Sort it", "speedsort": "Fast sort", "categorize": "Sort the table",
            "order": "Put in order", "anagram": "Build the word", "gaps": "Fill the gaps", "label": "Label it", "balloon": "Pop the balloons",
            "fruit": "Fruit catch", "whack": "Whack it", "plane": "Fly the plane", "watch": "Watch and remember", "spin": "Spin it",
            "openbox": "Open a box", "flip": "Flip cards", "deal": "Pick a card", "spinquiz": "Spin and answer", "boxquiz": "Open a box quiz"}
GROUP = {"match": "match", "pairs": "match", "find": "match", "label": "match", "watch": "match", "truefalse": "quiz", "quiz": "quiz",
         "gameshow": "quiz", "winlose": "quiz", "gaps": "quiz", "sort": "sort", "speedsort": "sort", "categorize": "sort", "order": "order",
         "anagram": "order", "balloon": "arcade", "fruit": "arcade", "whack": "arcade", "plane": "arcade",
         "spin": "cards", "openbox": "cards", "flip": "cards", "deal": "cards", "spinquiz": "cards", "boxquiz": "cards"}
THEMES = ["meadow", "ocean", "desert", "space"]
d = json.load(open(PATH))
n = 0
for belt, stripes in d['games'].items():
    for s, lst in stripes.items():
        out = []
        for g in lst:
            wid = g['id']
            if not g.get('own') and wid in conv:
                c = conv[wid]
                content = {k: v for k, v in c['content'].items() if k != 'repeatB'}
                new = {"id": f"own-{belt}-{s}-ww{wid}", "title": c['title'], "type": GROUP[c['kind']], "game": TEMPLATE[c['kind']],
                       "own": {"kind": c['kind'], "theme": THEMES[n % 4], **content}}
                if c['tip']:
                    new['tip'] = c['tip']
                # replace an earlier copy, if this runs again
                out = [x for x in out if x['id'] != new['id']]
                out.append(new)
                g['hidden'] = True
                n += 1
            if not any(x['id'] == g['id'] for x in out):
                out.append(g)
        # drop older copies that were placed before (runs again)
        seen = set(); final = []
        for x in out:
            if x['id'] in seen: continue
            seen.add(x['id']); final.append(x)
        stripes[s] = final
json.dump(d, open(PATH, 'w'), ensure_ascii=False, indent=1)
open(PATH, 'a').write('\n')
print('recreated', n)
