# Turns each saved Wordwall game (wwcontent/<id>.json) into a game made on the site,
# with the same title, instruction and content. Pictures of letters become typed
# letters: worked out from the text next to them (a name, a right answer, a group
# name). Where the data can't tell, a best guess is used and logged in GUESSES.
import json, glob, re, random, unicodedata, os

HERE = os.path.dirname(os.path.abspath(__file__))
random.seed(11)
KAMATZ, PATACH = "ָ", "ַ"

NAMES = {
    "aleph": "א", "alef": "א", "bet": "בּ", "beis": "בּ", "vet": "ב", "veis": "ב",
    "gimel": "ג", "gimmel": "ג", "dalet": "ד", "daled": "ד", "hey": "ה", "hay": "ה", "heh": "ה",
    "vav": "ו", "vov": "ו", "zayin": "ז", "zayn": "ז", "chet": "ח", "ches": "ח",
    "tet": "ט", "tes": "ט", "yud": "י", "kaf": "כּ", "caf": "כּ", "chaf": "כ", "khaf": "כ",
    "lamed": "ל", "mem": "מ", "nun": "נ", "samech": "ס", "samach": "ס", "ayin": "ע", "ayn": "ע",
    "pay": "פּ", "pey": "פּ", "peh": "פּ", "fay": "פ", "fey": "פ",
    "tzadik": "צ", "tzadee": "צ", "tsadee": "צ", "tzaddik": "צ", "tzadi": "צ",
    "koof": "ק", "kuf": "ק", "resh": "ר", "reish": "ר", "shin": "שׁ", "sin": "שׂ", "tav": "תּ", "sav": "ת",
}
FINAL = {"כ": "ך", "כּ": "ך", "מ": "ם", "נ": "ן", "פ": "ף", "פּ": "ף", "צ": "ץ"}
# Speech for letters: the names these games used.
SAY = {"א": "Aleph", "בּ": "Bet", "ב": "Vet", "ג": "Gimmel", "ד": "Dalet", "ה": "Hey", "ו": "Vav", "ז": "Zayin",
       "ח": "Chet", "ט": "Tet", "י": "Yud", "כּ": "Kaf", "כ": "Chaf", "ך": "Final Chaf", "ל": "Lamed", "מ": "Mem",
       "ם": "Final Mem", "נ": "Nun", "ן": "Final Nun", "ס": "Samech", "ע": "Ayin", "פּ": "Pey", "פ": "Fey",
       "ף": "Final Fey", "צ": "Tzadik", "ץ": "Final Tzadik", "ק": "Kuf", "ר": "Reish", "שׁ": "Shin", "שׂ": "Sin",
       "תּ": "Tav", "ת": "Sav"}
ORDER = list(SAY.keys())
LOOK = {"בּ": "ב כּ כ פּ", "ב": "בּ כ פ כּ", "ג": "נ ז ו", "ד": "ר ך ה", "ה": "ח ת ד", "ו": "ז ן י", "ז": "ו ן ג", "ח": "ה ת ד",
        "ט": "מ ס ם", "י": "ו ז ן", "כּ": "בּ כ פּ", "כ": "ב כּ פ", "ך": "ד ר ן", "ל": "ך ו ז", "מ": "ט ם ס", "ם": "ס מ ט",
        "נ": "ג כ ן", "ן": "ו ז ך", "ס": "ם ט מ", "ע": "צ ט א", "פּ": "פ כּ בּ", "פ": "פּ כ ב", "ף": "ך ץ ן", "צ": "ע ץ ט",
        "ץ": "צ ף ן", "ק": "ה ר ח", "ר": "ד ך ה", "שׁ": "שׂ ע ט", "שׂ": "שׁ ע ס", "תּ": "ת ח ה", "ת": "תּ ח ה", "א": "ע ט צ"}

GUESSES = {}   # ww id -> what was guessed (for the owner to check)

def guess(wid, note):
    GUESSES.setdefault(wid, []).append(note)

def clean(s):
    s = re.sub(r"<[^>]+>", "", s or "")
    s = s.replace("‎", "").replace("‏", "")
    return re.sub(r"\s+", " ", s).strip()

def txt(x):
    return clean((x or {}).get("text"))

def img(x):
    return bool((x or {}).get("image"))

def snd(x):
    return bool((x or {}).get("sound"))

def base(letter):
    """The letter without vowels (dagesh kept)."""
    return "".join(ch for ch in letter if not ("ְ" <= ch <= "ֻ") and ch not in "ׇ")

def letter_of(name):
    """'Kumatz Bet = "Bah"' -> בָּ, 'Final Tzaddik - Tzadik Sofit is correct' -> ץ, 'Find the Vet?' -> ב."""
    s = clean(name).lower()
    s = re.sub(r"is correct.*", "", s).split(" - ")[0]
    s = s.replace("thechaf", "the chaf")
    vowel = KAMATZ if re.search(r"k[au]matz", s) else PATACH if "patach" in s else ""
    final = bool(re.search(r"final|sofit|soffit", s))
    for w in re.findall(r"[a-z]+", s):
        if w in NAMES:
            l = NAMES[w]
            if final:
                l = FINAL.get(l, l)
            if vowel:
                l = unicodedata.normalize("NFC", l + vowel)
            return l
    return None

def with_vowel(l, v):
    return unicodedata.normalize("NFC", l + v)

def wrong_for(right, pool, n, wid, why):
    """n wrong answers for a picture quiz, since the real wrong pictures can't be seen."""
    b = base(right)
    v = right[len(b):] if right.startswith(b) else ""
    cands = [x for x in LOOK.get(b, "").split()] + [x for x in pool if x != b]
    out = []
    for c in cands:
        c2 = with_vowel(c, v) if v else c
        if c2 != right and c2 not in out:
            out.append(c2)
        if len(out) == n:
            break
    guess(wid, why)
    return out

# ---- one converter per Wordwall template ------------------------------------------

def conv(d):
    wid = d["id"]
    w = d["content"]
    c = w["content"]
    t = d["page"]["templateId"]
    title = d["title"]
    instr = clean(w.get("instruction"))
    speak = False
    speech = {}
    out = None

    def note_speech(letter):
        if letter in SAY:
            speech[letter] = SAY[letter]

    if t == 3 and all(txt(p["primary"]).isdigit() for p in c["pairs"]):
        # Numbers next to letter pictures: the letters in alef-bet order.
        seq = ORDER[: len(c["pairs"])]
        pairs = [{"a": txt(p["primary"]), "b": seq[int(txt(p["primary"])) - 1]} for p in c["pairs"]]
        guess(wid, "Pictures: made them the letters " + " ".join(seq) + ", each next to its number in alef-bet order.")
        out = ("match", {"pairs": pairs})

    elif t == 3:  # Match up: primary is dragged onto secondary
        pairs = []
        for p in c["pairs"]:
            a, b = txt(p["primary"]), txt(p["secondary"])
            if img(p["primary"]) and not a:
                a = letter_of(b)
            if img(p["secondary"]) and not b:
                b = letter_of(a) if a and letter_of(a) else None
            speak = speak or snd(p["primary"])
            pairs.append([a, b])
        if all(p[0] is None for p in pairs) or any(p[0] is None or p[1] is None for p in pairs):
            if "Sofeet" in title or "sofeet" in title:
                pairs = [[l, FINAL[l]] for l in ["כ", "מ", "נ", "פ", "צ"]][:len(pairs)]
                guess(wid, "Pictures only: made it each letter next to its final letter (כ-ך, מ-ם, נ-ן, פ-ף, צ-ץ).")
            else:
                ls = ORDER[:len(pairs)] if "Vav" in title else ORDER[:len(pairs)]
                ls = ["א", "בּ", "ב", "ג", "ד", "ה", "ו"][:len(pairs)]
                pairs = [[l, SAY[l]] for l in ls]
                speak = True
                guess(wid, "Pictures only: made it each letter א to ו next to its name.")
        for a, b in pairs:
            note_speech(a)
        out = ("match", {"pairs": [{"a": a, "b": b} for a, b in pairs]})

    elif t == 25:  # Matching pairs
        if "pairs" in c:
            pairs = []
            for p in c["pairs"]:
                a, b = txt(p["primary"]), txt(p["secondary"])
                speak = speak or snd(p["primary"]) or snd(p["secondary"])
                if img(p["primary"]) and not a and b:
                    a = letter_of(b)
                pairs.append([a, b])
            if any(not a or not b for a, b in pairs):
                ls = ["כ", "מ", "נ", "פ", "צ", "כּ"]
                pairs = [[l, "ךּ" if l == "כּ" else FINAL[l]] for l in ls][:len(pairs)]
                guess(wid, "Pictures only: made it each letter with its final letter (כ-ך, מ-ם, נ-ן, פ-ף, צ-ץ, כּ-ךּ).")
            for a, b in pairs:
                note_speech(a); note_speech(b)
            out = ("pairs", {"pairs": [{"a": a, "b": b} for a, b in pairs], "repeatB": True})
        else:
            items = c["items"]
            speak = any(snd(i) for i in items)
            ls = MATCH_GUESS[wid]
            guess(wid, "Pictures only: the letters are a guess: " + " ".join(ls) + ". Each card has a twin to find.")
            for l in ls:
                note_speech(l)
            out = ("pairs", {"pairs": [{"a": l, "b": l} for l in ls]})

    elif t == 46:  # Find the match: primary is shown, tap its secondary
        pairs = []
        for p in c["pairs"]:
            a, b = txt(p["primary"]), txt(p["secondary"])
            if img(p["primary"]) and not a:
                a = letter_of(b)
            if img(p["secondary"]) and not b:
                b = letter_of(a)
            pairs.append({"a": b, "b": a})
        out = ("find", {"pairs": pairs})

    elif t == 2 or t == 81:  # Group sort / Speed sorting
        groups = []
        gs = c["groups"]
        for gi, g in enumerate(gs):
            name = txt(g["header"])
            items = []
            for it in g["items"]:
                x = txt(it)
                if not x and img(it):
                    x = GROUP_GUESS.get(wid, {}).get(gi) or letter_of(name)
                items.append(x)
            if any(isinstance(x, list) for x in items):
                items = [y for x in items for y in (x if isinstance(x, list) else [x])]
            groups.append({"name": name, "items": items})
        if wid in GROUP_GUESS:
            for gi, ls in GROUP_GUESS[wid].items():
                groups[gi]["items"] = ls if isinstance(ls, list) else [ls] * len(groups[gi]["items"])
            guess(wid, "Pictures: " + "; ".join(f"{g['name']}: {' '.join(g['items'])}" for g in groups))
        elif any(img(it) for g in gs for it in g["items"]):
            guess(wid, "Pictures: each one is its group's letter (" + ", ".join(f"{g['name']} = {g['items'][0]}" for g in groups) + ").")
        out = ("sort" if t == 2 else "speedsort", {"groups": groups})

    elif t == 50:  # Rank order
        ls = ORDER_GUESS[wid]
        speak = any(snd(i) for i in c["items"])
        for l in ls:
            note_speech(l)
        guess(wid, "Pictures only: the letters are a guess: " + " ".join(ls) + " (in alef-bet order).")
        out = ("order", {"items": ls})

    elif t == 71:  # Balloon pop: primary on the balloon, secondary on the cart
        pairs = []
        for p in c["pairs"]:
            a, b = txt(p["primary"]), txt(p["secondary"])
            if img(p["primary"]) and not a:
                a = letter_of(b)
            if img(p["secondary"]) and not b:
                b = letter_of(a)
            pairs.append({"a": a, "b": b})
        out = ("balloon", {"pairs": pairs})

    elif t == 45:  # Whack-a-mole: hit the first group
        groups = []
        for gi, g in enumerate(c["groups"]):
            name = txt(g["header"])
            items = []
            for it in g["items"]:
                x = txt(it)
                if not x:
                    x = WHACK_GUESS.get(wid, {}).get(gi) or letter_of(name)
                items.append(x)
            groups.append({"name": name, "items": items})
        if wid in WHACK_GUESS:
            guess(wid, "Pictures: " + "; ".join(f"{g['name']}: {g['items'][0]}" for g in groups))
        out = ("whack", {"prompt": instr or groups[0]["name"], "groups": groups})
        instr = ""

    elif t in (82, 48, 5, 69, 78):  # questions: Flying fruit, Airplane, Quiz, Gameshow, Win or lose
        qs = []
        for qi, q in enumerate(c["questions"]):
            qt = txt(q["question"])
            speak = speak or snd(q["question"])
            ans = q["answers"]
            right = [a for a in ans if a["isCorrect"]]
            wrong = [a for a in ans if not a["isCorrect"]]
            rt = [txt(a) for a in right]
            wt = [txt(a) for a in wrong]
            # A question that's only a picture: it shows the right answer's letter.
            if img(q["question"]) and not qt.replace("Which letter is this?", "").strip():
                l = letter_of(rt[0])
                qt = (qt + " " + l).strip() if qt else l
            elif not qt and snd(q["question"]):
                qt = SOUND_PROMPT[wid][qi]
                guess(wid, f"Question {qi + 1} was only a sound: it now says \"{qt}\".")
            # Answers that are pictures.
            if any(not x for x in rt + wt):
                pics = PICTURE_ANSWERS.get(wid)
                if pics:
                    rt, wt = pics(qt, len(rt), len(wt))
                else:
                    l = letter_of(qt)
                    rt = [l] if len(rt) == 1 else [l, l]
                    pool = ORDER
                    wt = wrong_for(l, pool, len(wt), wid, "Wrong answers were pictures: they're look-alike letters.")
            qs.append({"q": qt, "answers": rt + wt, **({"right": len(rt)} if len(rt) > 1 else {})})
        kind = {82: "fruit", 48: "plane", 5: "quiz", 69: "gameshow", 78: "winlose"}[t]
        out = (kind, {"questions": qs})

    elif t == 35:  # True or false: groups
        gs = c["groups"]
        names = [txt(g["header"]) for g in gs]
        if wid == "62271598":
            out = ("truefalse", {"statements": KP_STATEMENTS})
            guess(wid, "Pictures: the Hebrew words are a guess (each word next to how it's read; wrong ones are misread).")
        else:
            pairs = []
            for g, name in zip(gs, names):
                for it in g["items"]:
                    x = txt(it) or letter_of(name)
                    pairs.append({"a": x, "b": name})
            if any(img(it) for g in gs for it in g["items"]):
                guess(wid, "Pictures: each one is its group's letter.")
            out = ("truefalse", {"pairs": pairs, "repeatB": True})

    elif t == 37:  # Categorize
        heads = [txt(x) for x in c["listB"]]
        groups = [{"name": heads[0], "items": ["שׁ", "שָׁ", "שַׁ", "שׁ", "שַׁ"]}, {"name": heads[1], "items": ["שׂ", "שָׂ", "שַׂ", "שׂ", "שָׂ"]}]
        guess(wid, "Pictures only, no answer key in the data: made it Shin letters and Sin letters (with Kamatz and Patach).")
        out = ("categorize", {"groups": groups})

    elif t == 22:  # Labelled diagram
        labels = [txt(l) for l in c["labels"]]
        if wid == "23634831":
            pairs = [{"a": FINAL[l], "b": l} for l in labels]
            guess(wid, "The picture: made it the final letters, each labeled with its regular letter.")
        else:
            pairs = [{"a": letter_of(l), "b": l} for l in labels]
        out = ("label", {"pairs": pairs})

    elif t == 36:  # Complete the sentence
        out = ("gaps", {"sentences": [clean(s["markupText"]) for s in c["sentences"]]})

    elif t == 38:  # Anagram
        out = ("anagram", {"items": [txt(i) for i in c["items"]]})

    elif t == 76:  # Flash cards
        pairs = []
        for p in c["pairs"]:
            a, b = txt(p["primary"]), txt(p["secondary"])
            if not a:
                a = letter_of(b)
                if b == "TAV" and any(x["a"] == "תּ" for x in pairs):
                    a = "ת"
            pairs.append({"a": a, "b": b})
        out = ("flip", {"pairs": pairs, "repeatB": True})

    elif t in (70, 30, 8, 23):  # Speaking cards, Open the box, Spin the wheel, Watch and memorize
        if "questions" in c:
            qs = []
            for q in c["questions"]:
                qt = txt(q["question"])
                rt = [txt(a) for a in q["answers"] if a["isCorrect"]]
                wt = [txt(a) for a in q["answers"] if not a["isCorrect"]]
                if not qt:
                    qt = letter_of(rt[0])
                qs.append({"q": qt, "answers": rt + wt})
            out = ({30: "boxquiz", 8: "spinquiz"}[t], {"questions": qs})
        else:
            items = [txt(i) for i in c["items"]]
            speak = any(snd(i) for i in c["items"])
            if not all(items) or wid in CARD_GUESS:
                items = CARD_GUESS[wid]
                guess(wid, "Pictures only: the cards are a guess: " + " ".join(items))
            for l in items:
                note_speech(l)
            kind = {70: "deal", 30: "openbox", 8: "spin", 23: "watch"}[t]
            out = (kind, {"items": items})

    else:
        raise SystemExit(f"no converter for template {t} ({wid})")

    kind, content = out
    if speak:
        content["speak"] = True
        if speech:
            content["speech"] = speech
    return kind, content, instr

# ---- guesses for games that are only pictures -----------------------------------------

K = lambda ls: [with_vowel(l, KAMATZ) for l in ls]
P = lambda ls: [with_vowel(l, PATACH) for l in ls]
ALEF_TO = lambda last: ORDER[: ORDER.index(last) + 1]

MATCH_GUESS = {
    "28882149": ["ו", "ז", "ח", "ט", "י"],                     # 123 Kriah 01 page 04 (White 2)
    "28882522": ["כּ", "כ", "ך", "ל", "מ", "ם"],               # 123 Kriah 01 Page 07 (White 3)
    "29162023": ["מ", "ם", "נ", "ן", "ס", "ל"],               # 123 Kriah 01 Page 20 (White 3)
    "59409436": ["ו", "ג", "ז", "נ"],                          # Vov Gimmel Zayin Nun
    "38450327": [l for l in ALEF_TO("ן") if l != "ך"],         # Alef - Nun Match (18)
    "59597547": ["ב", "כ", "ו", "ז", "ג", "נ", "ד", "ר"],     # Look Alike Match W3
    "94191324": ["ס", "ע", "פּ", "פ", "ף", "ם"],               # Match the Letters R1
    "29160429": ["ס", "ע", "פּ", "פ", "ף", "ם", "ן"],          # 123 Kriah 01 Page 08
    "29161449": ["ר", "שׁ", "שׂ", "ת"],                        # 123 Kriah 01 Page 16
    "9124068": ["שׁ", "שׂ", "שָׁ", "שָׂ", "שַׁ", "שַׂ"],       # Shin and Sin Matching game
    "94304286": ["שׁ", "שׂ", "שָׁ", "שָׂ", "שַׁ", "שַׂ"],      # Shin Sin Match
    "27258529": P(["א", "בּ", "ג", "ד", "ה", "ו", "ז", "ח"]),   # Alef Bet Gan 13.3
    "37659225": P(["א", "בּ", "ב", "ג", "ד", "ה"]),            # first letters with Patach
}
ORDER_GUESS = {
    "27621153": ["א", "בּ", "ב", "ג"],                         # Alef Bet Gan 04.11
    "27259465": ALEF_TO("ה"),                                  # Alef Bet Gan 06.7
    "59697148": ALEF_TO("ו"),                                  # Rank order with Sound (White 1)
    "59697259": ALEF_TO("י"),                                  # Rank order with Sound (White 2)
    "27260003": ALEF_TO("ך"),                                  # Alef Bet Gan 14.7
    "94190594": ALEF_TO("ף"),                                  # Hebrew Letter Order Red 1
    "94192438": ALEF_TO("ר"),                                  # Hebrew Letter Order R2
    "94302110": ORDER[ORDER.index("י"):],                      # Rank order from Yud to Sav R3
}
GROUP_GUESS = {
    "15310820": {0: ["ך", "ם", "ן", "ף", "ץ"], 1: ["כ", "מ", "נ", "פ", "צ"]},   # Final Letters Sort
}
WHACK_GUESS = {
    "59699648": {0: "שׂ", 1: "שׁ"},   # Find the letter Sin: hit Sin, the others are Shin
    "8506651": {0: "שׁ", 1: "שׂ"},    # where is Shin?: hit Shin, the others are Sin
}
CARD_GUESS = {
    "38449199": [l for l in ALEF_TO("ף") if l != "ך"],         # Alef - Final Fey Review (23)
    "52227625": P(["א", "בּ", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כּ", "כ", "ל", "מ", "נ", "ס"]),  # Alef Bet Gan P 18.41
    "28882327": ALEF_TO("י"),                                  # 123 Kriah 01 Page 05 (spin)
    "28339377": P(["א", "בּ", "ג", "ד", "ה", "ו", "ז", "ח", "ט"]),  # Alef Bet Gan 16.5 (spin)
    "38552490": K(["א", "בּ", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כּ", "כ", "ל", "מ", "נ", "ס", "ע"]),  # Alef Bet Gan K 18.7 (watch)
    "62270115": K(["א", "בּ", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י", "כּ", "כ", "ל", "מ", "נ", "ס", "ע", "פּ", "פ", "צ", "ק", "ר", "שׁ", "תּ"]),  # Alef Bet Gan 30.4 (boxes)
}
SOUND_PROMPT = {
    "94310389": ["Lah", "Vah", "Rah", "Bah", "Nah"],   # Catch the Answer Open Syllables O1
}

# Picture answers for sound quizzes whose answers are letters with vowels.
def sound_pics(sounds, pool):
    def f(qt, nr, nw):
        key = re.sub(r"[^a-z]", "", qt.lower().replace("find", "").replace("the", "").replace("letter", "").replace("thatstartswitha", "").replace("sound", ""))
        rights = sounds[key][:nr] if key in sounds else sounds.get(key[:1], [None])[:nr]
        if len(rights) < nr:
            rights = (rights * nr)[:nr]
        wrongs = [x for x in pool if x not in rights][:nw]
        random.shuffle(wrongs)
        return rights, wrongs
    return f

LESSON3 = {"bah": K(["בּ"]), "shah": K(["שׁ"]), "hah": K(["ה"]), "kah": K(["כּ"]), "tah": K(["ט"]), "t": ["ט"], "b": ["בּ"],
           "h": ["ה"], "sh": ["שׁ"], "k": ["כּ"], "m": ["מ"], "l": ["ל"], "mah": K(["מ"]), "lah": K(["ל"])}
FINDIT = {"bah": K(["בּ"]) + P(["בּ"]), "shah": K(["שׁ"]) + P(["שׁ"]), "tah": K(["תּ"]) + P(["תּ"]), "t": ["ט", "תּ"], "b": ["בּ"], "sh": ["שׁ"]}
LESSON_POOL = K(["בּ", "שׁ", "ה", "כּ", "ט", "מ", "ל"]) + ["ט", "בּ", "ה", "שׁ", "כּ", "מ", "ל"]
FINDIT_POOL = K(["בּ", "שׁ", "תּ", "ט"]) + P(["ב", "שׂ", "ת"]) + ["ט", "תּ", "בּ", "שׁ", "ס", "ב"]

def lesson3(qt, nr, nw):
    key = re.sub(r"[^a-z]", "", re.sub(r"(?i)find the|sound|find", "", qt).lower())
    rights = LESSON3[key][:nr]
    pool = [x for x in LESSON_POOL if x not in rights and base(x) != base(rights[0])] + [x for x in LESSON_POOL if x not in rights]
    wrongs = []
    for x in pool:
        if x not in wrongs:
            wrongs.append(x)
    return rights, wrongs[:nw]

def findit(qt, nr, nw):
    s = qt.lower()
    key = "t" if "t\" sound" in s or "a \"t\"" in s else "b" if "\"b\" sound" in s else re.sub(r"[^a-z]", "", s.replace("find", ""))
    rights = FINDIT[key][:nr]
    wrongs = []
    for x in FINDIT_POOL:
        if x not in rights and x not in wrongs:
            wrongs.append(x)
    return rights, wrongs[:nw]

def kumatz_fruit(qt, nr, nw):
    l = letter_of(qt)
    pool = K([x for x in ORDER if x not in ("ך", "ם", "ן", "ף", "ץ")])
    wrongs = [x for x in pool if x != l]
    random.shuffle(wrongs)
    return [l], wrongs[:nw]

def shin_sin_fruit(qt, nr, nw):
    l = "שׂ" if "Sin" in qt else "שׁ"
    other = "שׁ" if l == "שׂ" else "שׂ"
    return [l], [other, "ס", "ע", "צ"][:nw]

PICTURE_ANSWERS = {
    "6027501": lesson3,        # Lesson 3: Swim into the Hebrew letter
    "94350205": findit,        # Find It
    "72337792": kumatz_fruit,  # Flying Fruit Kumatz O1
    "94307410": shin_sin_fruit,  # Flying fruit Shin or Sin
}

# Hebrew kamatz and patach (true or false): each word with how it's read.
KP_WORDS = [("בַּד", "bahd"), ("יָם", "yahm"), ("צָן", "tzahn"), ("סָץ", "sahtz"), ("עַל", "ahl"), ("חַג", "chag"), ("מָן", "mahn"),
            ("גַּג", "gahg"), ("גַּם", "gahm"), ("צָף", "tzahf"), ("חַלָּה", "challah"), ("שַׁבָּת", "shabbat"), ("מַצָּה", "matza"), ("אָדָם", "Adam")]
KP_WRONG = ["vad", "hat", "ant", "mat", "fat", "chan", "lad", "vav", "nap", "chat", "happy", "strawberry", "money", "Eve"]
KP_STATEMENTS = [{"a": h, "b": r, "right": True} for h, r in KP_WORDS] + [{"a": KP_WORDS[i][0], "b": w, "right": False} for i, w in enumerate(KP_WRONG)]

# ---- run ----------------------------------------------------------------------------

def main():
    games = {}
    for f in sorted(glob.glob(os.path.join(HERE, "wwcontent", "*.json"))):
        d = json.load(open(f))
        kind, content, instr = conv(d)
        games[d["id"]] = {"belt": d["belt"], "stripe": d["stripe"], "title": d["title"], "kind": kind, "content": content, "tip": instr}
    json.dump({"games": games, "guesses": GUESSES}, open(os.path.join(HERE, "ww_converted.json"), "w"), ensure_ascii=False, indent=1)
    kinds = {}
    for g in games.values():
        kinds[g["kind"]] = kinds.get(g["kind"], 0) + 1
    print("converted", len(games), kinds)
    print("games with guesses:", len(GUESSES))

if __name__ == "__main__":
    main()
