# Ready-made games for the site. Run to add or refresh them in data/site.json.
# Each game goes near the top of its stripe (after the games made here that are already there).
import json, random, sys

random.seed(7)
PATH = '/home/user/Alephreview/data/site.json'

L = [("א","Alef"),("בּ","Beis"),("ב","Veis"),("ג","Gimmel"),("ד","Dalet"),("ה","Hey"),("ו","Vov"),("ז","Zayin"),("ח","Ches"),("ט","Tes"),("י","Yud"),("כּ","Kaf"),("כ","Chaf"),("ך","Final Chaf"),("ל","Lamed"),("מ","Mem"),("ם","Final Mem"),("נ","Nun"),("ן","Final Nun"),("ס","Samech"),("ע","Ayin"),("פּ","Pey"),("פ","Fey"),("ף","Final Fey"),("צ","Tzadik"),("ץ","Final Tzadik"),("ק","Kuf"),("ר","Reish"),("שׁ","Shin"),("שׂ","Sin"),("תּ","Tav"),("ת","Sav")]
NAME = dict(L)
LETTER = {n: l for l, n in L}
LOOK = {"בּ":"ב כּ כ","ב":"בּ כ פ","ג":"נ ז","ד":"ר ך","ה":"ח ת","ו":"ז ן י","ז":"ו ן","ח":"ה ת","ט":"מ ס","י":"ו ז","כּ":"בּ כ","כ":"ב כּ","ך":"ד ר ן","ל":"ך ו","מ":"ט ם ס","ם":"ס מ","נ":"ג כ","ן":"ו ז ך","ס":"ם ט","ע":"צ ט","פּ":"פ כּ","פ":"פּ כ","ף":"ך ץ","צ":"ע ץ","ץ":"צ ף","ק":"ה ר","ר":"ד ך","שׁ":"שׂ ע","שׂ":"שׁ ע","תּ":"ת ח","ת":"תּ ח ה","א":"ע ט"}

def letters(*names):
    return [LETTER[n] for n in names]

def span(first, last):
    ks = [l for l, _ in L]
    return ks[ks.index(first):ks.index(last) + 1]

def pairs(ls):
    return [{"a": l, "b": NAME[l]} for l in ls]

def which_q(l, pool, n_wrong=3):
    wrong = [x for x in LOOK.get(l, "").split() if x != l]
    extra = [x for x in pool if x != l and x not in wrong]
    random.shuffle(extra)
    wrong = (wrong + extra)[:n_wrong]
    return {"q": f"Which one is {NAME[l]}?", "answers": [l] + wrong}

def name_q(l, pool, n_wrong=3):
    wrong = [NAME[x] for x in LOOK.get(l, "").split() if x != l]
    extra = [NAME[x] for x in pool if x != l and NAME[x] not in wrong]
    random.shuffle(extra)
    wrong = (wrong + extra)[:n_wrong]
    return {"q": f"What is this letter?  {l}", "answers": [NAME[l]] + wrong}

KAMATZ, PATACH = "ָ", "ַ"

GAMES = []
def add(belt, stripe, kind, title, theme, **content):
    GAMES.append((belt, stripe, {"id": f"own-{belt}-{stripe}-{kind}", "title": title, "kind": kind, "own": {"kind": kind, "theme": theme, **content}}))

# ---- batch 1 ---------------------------------------------------------------
TEMPLATE = {"match": "Match it", "pairs": "Flip and match", "find": "Find it", "truefalse": "Right or wrong",
            "quiz": "Pick the answer", "gameshow": "Game show", "winlose": "Win or lose"}
GROUP = {"match": "match", "pairs": "match", "find": "match", "truefalse": "quiz", "quiz": "quiz", "gameshow": "quiz", "winlose": "quiz"}

# Flip and match
add("white", 1, "pairs", "Flip and match: א to ו", "ocean", pairs=pairs(span("א", "ו")))
add("white", 3, "pairs", "Flip and match: look-alikes", "space", pairs=pairs(letters("Veis", "Chaf", "Dalet", "Reish", "Vov", "Zayin", "Gimmel", "Nun", "Samech", "Final Mem", "Hey", "Ches")))
add("red", 3, "pairs", "Flip and match: Shin and Sin", "meadow", pairs=[{"a": "שׁ", "b": "Shin"}, {"a": "שׂ", "b": "Sin"}, {"a": "שָׁ", "b": "Shin Kamatz"}, {"a": "שָׂ", "b": "Sin Kamatz"}, {"a": "שַׁ", "b": "Shin Patach"}, {"a": "שַׂ", "b": "Sin Patach"}])
add("orange", 2, "pairs", "Flip and match: Kamatz and Patach", "desert", pairs=[{"a": l + v, "b": f"{NAME[l]} {vn}"} for l in ["א", "ד", "ה", "ל", "נ", "ר"] for v, vn in [(KAMATZ, "Kamatz"), (PATACH, "Patach")]][:12])

# Find it
add("white", 2, "find", "Find it: א to י", "meadow", pairs=pairs(span("א", "י")))
add("white", 3, "find", "Find it: כ to ן", "ocean", pairs=pairs(span("כּ", "ן")))
add("red", 1, "find", "Find it: ס to ף", "desert", pairs=pairs(span("ס", "ף") + ["ם", "ן", "ך"]))
add("red", 2, "find", "Find the final letters", "space", pairs=pairs(letters("Final Chaf", "Chaf", "Final Mem", "Mem", "Final Nun", "Nun", "Final Fey", "Fey", "Final Tzadik", "Tzadik")))
add("orange", 1, "find", "Find it: letters with Kamatz", "meadow", pairs=[{"a": l + KAMATZ, "b": f"{NAME[l]} Kamatz"} for l in span("א", "י") if l not in ("ו",)][:8])

# Right or wrong
add("white", 2, "truefalse", "Right or wrong: Hey and Ches", "desert", pairs=pairs(letters("Hey", "Ches", "Sav", "Dalet", "Reish", "Vov", "Zayin", "Yud")))
add("red", 2, "truefalse", "Right or wrong: final letters", "ocean", pairs=pairs(letters("Final Chaf", "Final Mem", "Final Nun", "Final Fey", "Final Tzadik", "Chaf", "Mem", "Nun", "Tzadik", "Samech")))
add("red", 3, "truefalse", "Right or wrong: Shin and Sin", "space", pairs=pairs(letters("Shin", "Sin", "Tav", "Sav", "Reish", "Kuf", "Ayin", "Tes")))
add("orange", 2, "truefalse", "Right or wrong: Kamatz or Patach", "meadow", pairs=[{"a": l + v, "b": vn} for l, v, vn in [("בּ", KAMATZ, "Kamatz"), ("מ", PATACH, "Patach"), ("ג", KAMATZ, "Kamatz"), ("ל", PATACH, "Patach"), ("שׁ", KAMATZ, "Kamatz"), ("ת", PATACH, "Patach"), ("ד", PATACH, "Patach"), ("ר", KAMATZ, "Kamatz")]])

# Pick the answer (quiz)
pool = span("א", "ו")
add("white", 1, "quiz", "Beis or Veis?", "meadow", questions=[which_q(l, pool) for l in ["בּ", "ב", "א", "ג", "ד", "ה", "ו", "ב", "בּ"][:7]])
pool = span("ר", "ת") + ["ט", "ע", "ח", "ה"]
add("red", 3, "quiz", "Find the letter: ר to ת", "ocean", questions=[which_q(l, pool) for l in ["ר", "שׁ", "שׂ", "תּ", "ת", "ט", "ע", "ח"]])
add("orange", 2, "quiz", "Which has a Kamatz?", "space", questions=[
    {"q": "Which one has a Kamatz?", "answers": [l + KAMATZ, l + PATACH]} for l in ["בּ", "מ", "ל", "שׁ", "ג", "ת", "ד", "נ"]] + [
    {"q": "Which one has a Patach?", "answers": [l + PATACH, l + KAMATZ]} for l in ["ה", "ר", "ז", "כּ"]])

# Game show
pool = span("א", "ו")
add("white", 1, "gameshow", "Game show: א to ו", "space", questions=[name_q(l, pool) for l in pool] + [which_q(l, pool) for l in ["ג", "ה"]])
pool = span("א", "ן")
add("white", 3, "gameshow", "Game show: א to ן", "desert", questions=[name_q(l, pool) for l in span("כּ", "ן")] + [which_q(l, pool) for l in ["ך", "ן"]])
pool = span("א", "ת")
add("red", 1, "gameshow", "Game show: ס to ף", "ocean", questions=[name_q(l, pool) for l in span("ס", "ף")] + [which_q(l, pool) for l in ["ע", "ף"]])

# Win or lose
pool = span("א", "ת")
add("red", 3, "winlose", "Win or lose: ק to ת", "meadow", questions=[name_q(l, pool) for l in span("ק", "ת")] + [which_q(l, pool) for l in ["שׂ", "ק"]])
add("red", 2, "winlose", "Win or lose: look-alikes", "desert", questions=[which_q(l, pool) for l in ["ד", "ר", "ך", "ע", "צ", "ץ", "ף", "ן"]])

# ---- batch 2 ---------------------------------------------------------------
TEMPLATE.update({"sort": "Sort it", "speedsort": "Fast sort", "categorize": "Sort the table", "order": "Put in order",
                 "anagram": "Build the word", "gaps": "Fill the gaps", "label": "Label it"})
GROUP.update({"sort": "sort", "speedsort": "sort", "categorize": "sort", "order": "order", "anagram": "order", "gaps": "quiz", "label": "match"})
K = lambda ls: [l + KAMATZ for l in ls]
P = lambda ls: [l + PATACH for l in ls]

# Sort it
add("white", 2, "sort", "Sort it: first or second half", "meadow", groups=[{"name": "א–ה", "items": span("א", "ה")}, {"name": "ו–י", "items": span("ו", "י")}])
add("red", 3, "sort", "Sort it: Shin or Sin", "desert", groups=[{"name": "Shin", "items": ["שׁ", "שָׁ", "שַׁ", "שָׁם", "שַׁבָּת"]}, {"name": "Sin", "items": ["שׂ", "שָׂ", "שַׂ", "שָׂם", "שַׂר"]}])
add("orange", 2, "sort", "Sort it: Kamatz or Patach", "ocean", groups=[{"name": "Kamatz", "items": K(["בּ", "ג", "ד", "מ", "ל", "שׁ"])}, {"name": "Patach", "items": P(["בּ", "ה", "ר", "נ", "ת", "ק"])}])

# Fast sort
add("white", 3, "speedsort", "Fast sort: dot or no dot", "space", groups=[{"name": "Dot", "items": ["בּ", "כּ", "בּ", "כּ", "בּ", "כּ"]}, {"name": "No dot", "items": ["ב", "כ", "ב", "כ", "ב", "כ"]}])
add("red", 2, "speedsort", "Fast sort: final or not", "meadow", groups=[{"name": "Final", "items": letters("Final Chaf", "Final Mem", "Final Nun", "Final Fey", "Final Tzadik")}, {"name": "Not final", "items": letters("Chaf", "Mem", "Nun", "Fey", "Tzadik")}])
add("orange", 1, "speedsort", "Fast sort: Kamatz or no vowel", "desert", groups=[{"name": "Kamatz", "items": K(["א", "בּ", "ג", "ד", "ה", "ז"])}, {"name": "No vowel", "items": ["א", "בּ", "ג", "ד", "ה", "ז"]}])

# Sort the table
add("red", 1, "categorize", "Sort the table: dot or no dot", "ocean", groups=[{"name": "Dot", "items": ["בּ", "כּ", "פּ", "תּ"]}, {"name": "No dot", "items": ["ב", "כ", "פ", "ת"]}])
add("orange", 2, "categorize", "Sort the table: vowels", "space", groups=[{"name": "Kamatz", "items": K(["א", "ל", "מ", "שׁ"])}, {"name": "Patach", "items": P(["א", "ל", "מ", "שׁ"])}, {"name": "No vowel", "items": ["א", "ל", "מ", "שׁ"]}])

# Put in order
add("white", 1, "order", "Put in order: א to ו", "desert", items=span("א", "ו"))
add("white", 2, "order", "Put in order: א to י", "ocean", items=span("א", "י"))
add("white", 3, "order", "Put in order: כ to ן", "meadow", items=span("כּ", "ן"))
add("red", 1, "order", "Put in order: ס to ף", "space", items=span("ס", "ף"))
add("red", 3, "order", "Put in order: ק to ת", "desert", items=span("ק", "ת"))

# Build the word
add("white", 3, "anagram", "Build it: letters in order", "ocean", items=["אבגד", "הוזח", "טיכל", "למנס"])
add("red", 3, "anagram", "Build it: letters in order", "meadow", items=["סעפצ", "צקרש", "רשת", "אבגדה"])
add("orange", 2, "anagram", "Build the word", "desert", items=["אַבָּא", "יָד", "דָּג", "גַּן", "חַם", "בַּת"])

# Fill the gaps
add("white", 2, "gaps", "Missing letter: א to י", "space", sentences=["א בּ ב [ג] ד", "ד ה [ו] ז", "ז [ח] ט י", "[א] בּ ב ג", "ה ו ז ח [ט] י"])
add("red", 3, "gaps", "Missing letter: ל to ת", "ocean", sentences=["ל מ [נ] ס", "ס [ע] פּ פ", "צ [ק] ר", "ר שׁ [שׂ] תּ ת", "מ נ ס ע [פּ]"])
add("orange", 1, "gaps", "Missing letter with Kamatz", "meadow", sentences=["אָ בָּ [בָ] גָ", "דָ [הָ] וָ", "זָ חָ [טָ] יָ", "[אָ] בָּ בָ"])

# Label it
add("white", 1, "label", "Label it: א to ה", "classic", pairs=pairs(span("א", "ה")))
add("red", 2, "label", "Label it: final letters", "classic", pairs=pairs(letters("Final Chaf", "Final Mem", "Final Nun", "Final Fey", "Final Tzadik")))
add("red", 1, "label", "Label it: ס to ף", "classic", pairs=pairs(span("ס", "ף")))

# ---- batch 3 (arcade) and 4 (cards) -----------------------------------------
if "--more" in sys.argv:
    TEMPLATE.update({"balloon": "Pop the balloons", "fruit": "Fruit catch", "whack": "Whack it", "plane": "Fly the plane", "watch": "Watch and remember",
                     "spin": "Spin it", "openbox": "Open a box", "flip": "Flip cards", "deal": "Pick a card"})
    GROUP.update({"balloon": "arcade", "fruit": "arcade", "whack": "arcade", "plane": "arcade", "watch": "match",
                  "spin": "cards", "openbox": "cards", "flip": "cards", "deal": "cards"})
    SHIN_SIN = [{"a": "שׁ", "b": "Shin"}, {"a": "שׂ", "b": "Sin"}, {"a": "שָׁ", "b": "Shin Kamatz"}, {"a": "שָׂ", "b": "Sin Kamatz"}, {"a": "שַׁ", "b": "Shin Patach"}, {"a": "שַׂ", "b": "Sin Patach"}]
    KAM = [{"a": l + KAMATZ, "b": f"{NAME[l]} Kamatz"} for l in ["א", "בּ", "ג", "ד", "ה", "ז", "ח", "ט"]]
    KP = [{"a": l + v, "b": f"{NAME[l]} {vn}"} for l in ["בּ", "מ", "ל", "נ"] for v, vn in [(KAMATZ, "Kamatz"), (PATACH, "Patach")]]

    # Pop the balloons
    add("white", 1, "balloon", "Pop the balloons: א to ו", "meadow", pairs=pairs(span("א", "ו")))
    add("white", 3, "balloon", "Pop the balloons: כ to ן", "desert", pairs=pairs(span("כּ", "ן")))
    add("red", 3, "balloon", "Pop the balloons: Shin and Sin", "ocean", pairs=SHIN_SIN)
    add("orange", 1, "balloon", "Pop the balloons: Kamatz", "space", pairs=KAM)

    # Fruit catch
    add("white", 2, "fruit", "Fruit catch: א to י", "meadow", pairs=pairs(span("א", "י")))
    add("red", 2, "fruit", "Fruit catch: final letters", "desert", pairs=pairs(letters("Final Chaf", "Final Mem", "Final Nun", "Final Fey", "Final Tzadik", "Chaf", "Mem", "Nun")))
    add("orange", 1, "fruit", "Fruit catch: Kamatz", "ocean", pairs=KAM)

    # Whack it
    add("red", 1, "whack", "Whack it: Pey and Fey", "meadow", pairs=pairs(letters("Pey", "Fey", "Final Fey", "Kaf", "Chaf", "Samech", "Ayin")))
    add("red", 3, "whack", "Whack it: Shin and Sin", "desert", pairs=SHIN_SIN)
    add("orange", 2, "whack", "Whack it: Kamatz and Patach", "ocean", pairs=KP)

    # Fly the plane
    add("white", 2, "plane", "Fly the plane: א to י", "ocean", pairs=pairs(span("א", "י")))
    add("red", 3, "plane", "Fly the plane: ר to ת", "meadow", pairs=pairs(span("ר", "ת") + ["ט", "ע"]))
    add("orange", 2, "plane", "Fly the plane: Kamatz and Patach", "space", pairs=KP)

    # Watch and remember
    add("white", 3, "watch", "Watch and remember: letters", "space", items=span("א", "ן"))
    add("orange", 2, "watch", "Watch and remember: Kamatz and Patach", "meadow", items=[x["a"] for x in KP] + K(["ג", "ד", "ה", "ר"]))

    # Spin it
    add("white", 3, "spin", "Spin it: read the letter", "classic", items=span("א", "ן"))
    add("orange", 2, "spin", "Spin it: read with Kamatz and Patach", "classic", items=K(["בּ", "ג", "ד", "ל", "מ", "נ"]) + P(["בּ", "ג", "ד", "ל", "מ", "נ"]))
    # Open a box
    add("white", 2, "openbox", "Open a box: א to י", "desert", items=span("א", "י"))
    add("orange", 1, "openbox", "Open a box: Kamatz", "ocean", items=K(span("א", "י")))
    # Flip cards
    add("white", 1, "flip", "Flip cards: א to ו", "classic", pairs=pairs(span("א", "ו")))
    add("red", 3, "flip", "Flip cards: all the letters", "classic", pairs=pairs([l for l, _ in L]))
    # Pick a card
    add("red", 1, "deal", "Pick a card: read it", "space", items=[l for l, _ in L])
    add("orange", 2, "deal", "Pick a card: read it", "meadow", items=["בָּא", "אַבָּא", "גַּן", "דָּג", "יָד", "חַם", "בַּת", "שָׁם", "מָה", "לָמָּה"])

# ----------------------------------------------------------------------------
def main():
    d = json.load(open(PATH))
    for belt, stripe, g in GAMES:
        kind = g.pop("kind")
        g["type"] = GROUP[kind]
        g["game"] = TEMPLATE[kind]
        g = {"id": g["id"], "title": g["title"], "type": g["type"], "game": g["game"], "own": g["own"]}
        lst = d["games"][belt][str(stripe)]
        ids = [x["id"] for x in lst]
        if g["id"] in ids:
            lst[ids.index(g["id"])] = g
        else:
            at = 0
            while at < len(lst) and lst[at].get("own"):
                at += 1
            lst.insert(at, g)
    json.dump(d, open(PATH, "w"), ensure_ascii=False, indent=1)
    open(PATH, "a").write("\n")
    print("games:", len(GAMES))

if __name__ == "__main__":
    main()
