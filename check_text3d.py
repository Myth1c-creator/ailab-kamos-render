"""Text rules for the words that live inside the 3D picture of "Kámoš tomu uvěřil" (cdp.mjs check only sees the DOM: the captions).
Every 3D word is screen-anchored (src/worlds/common.ts place): its centre and width in px are set in the code, so the margins are
exact; this mirrors those numbers (intro.ts WIN, drop.ts W, cta.ts CTA) and checks, for each word,
  EDGE  >= 150 px from the side edges at rest (with the punches and the sway at their worst) and at the peak of its slam (the user's
        rule: never at the edge, never across the whole width; sim_layout.mjs measures the projected boxes of every frame with the
        camera shake on top and needs the same 150 px);
  SIZE  no word wider than 760 px at rest, the labels / counter <= 260 px;
  DUP   no caption (capwords.json) while the same word is big on screen.
python check_text3d.py  ->  CHECK PASS / FAIL (and logs/text3d_check.json)
"""
import json
import sys
import unicodedata
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).resolve().parent
cut = json.loads((HERE / "audio/cut.json").read_text(encoding="utf-8"))
BPM, FPS, FRAMES = cut["bpm"], 60, 806
END = FRAMES / FPS
f = lambda fr: fr / FPS  # noqa: E731
W = json.loads((HERE / "audio/vo-words.json").read_text(encoding="utf-8"))
ws = lambda i: W[i]["start"]  # noqa: E731
fr_ = lambda s: round(s * FPS)  # noqa: E731
B = lambda i: f(fr_(cut["beats"][i]))  # noqa: E731
WS = lambda i: f(fr_(ws(i)))  # noqa: E731
FONT = json.loads((HERE / "public/fonts/unbounded_800_clean.typeface.json").read_text(encoding="utf-8"))
G = FONT["glyphs"]
adv = lambda s: sum(G[c]["ha"] for c in s) / FONT["resolution"]  # noqa: E731

PUNCH = 1.05 * 1.05  # a punch (5 %) + the sway / tilt
SLAM = 1.08
DROP, PANEL, LOCK = B(10), B(5), B(19)
HEND = f(fr_(ws(7))) - 2 / 60  # the hook's words end just before A NENI!
W0 = 620  # the width of every big word at rest (intro.ts WIN.W, drop.ts W, cta.ts CTA)
CTA_PUSH = 1 + 0.015 * (END - WS(25))  # cta.ts: the slow push of the whole CTA at the end
LOGO_W = max(520 * 1.3, 280 * 1.6) * CTA_PUSH  # the wordmark 520 px (slam 130 %), the mark 280 px (pop 160 %)

# (text, shown from, to (s), centre x, sway (px), width at rest at its worst (px), width at the slam peak (px), rest cap)
WORDS = [
    ("KÁMOŠ", WS(0), HEND, 540, 0, W0 * PUNCH, W0 * SLAM, 760),
    ("MYSLEL", WS(2), HEND, 540, 0, W0 * PUNCH, W0 * SLAM, 760),
    ("ŽE JE", WS(3), HEND, 540, 0, W0 * PUNCH, W0 * SLAM, 760),
    ("SKUTEČNÁ", WS(5), HEND, 540, 0, W0 * PUNCH, W0 * SLAM, 760),
    ("A NENÍ!", WS(7), WS(8) + 6 / 60, 540, 0, W0 * PUNCH, W0 * SLAM, 760),
    ("JEDEN", WS(10), WS(16), 540, 0, W0 * PUNCH, W0 * SLAM, 760),
    ("PROMPT", WS(11), WS(16), 540, 0, W0 * PUNCH, W0 * SLAM, 760),
    ("UDĚLAL", WS(16), DROP, 540, 0, W0 * PUNCH, W0 * SLAM, 760),
    ("VIDEO", WS(17), DROP, 540, 0, W0 * PUNCH, W0 * SLAM, 760),
    ("A TOHLE", DROP, WS(21), 540, 0, W0 * PUNCH, W0 * SLAM, 760),
    ("TAKY!", WS(20), WS(21), 540, 0, W0 * PUNCH, W0 * SLAM, 760),
    ("ŽÁDNÁ", WS(21), WS(23), 540, 0, W0 * PUNCH, W0 * SLAM, 760),
    ("KAMERA", WS(22), WS(23), 540, 0, W0 * PUNCH, W0 * SLAM, 760),
    ("ŽÁDNÝ", WS(23), WS(25), 540, 0, W0 * PUNCH, W0 * SLAM, 760),
    ("ŠTÁB", WS(24), WS(25), 540, 0, W0 * PUNCH, W0 * SLAM, 760),
    ("POŠLI TO", WS(25), LOCK, 540, 0, W0 * CTA_PUSH * PUNCH, W0 * CTA_PUSH * SLAM, 760),
    ("KÁMOŠOVI", WS(27), LOCK, 540, 0, W0 * CTA_PUSH * PUNCH, W0 * CTA_PUSH * SLAM, 760),
    ("KTERÝ BY", WS(28), LOCK, 540, 0, 520 * CTA_PUSH * PUNCH, 520 * CTA_PUSH * SLAM, 760),
    ("TOMU UVĚŘIL", WS(30), LOCK, 540, 0, 600 * CTA_PUSH * PUNCH, 600 * CTA_PUSH * SLAM, 760),
    ("AI LAB (logo)", LOCK, END, 540, 0, LOGO_W, LOGO_W, 760),
]
norm = lambda s: "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").lower()  # noqa: E731

caps = [(w, a * 60 / BPM, b * 60 / BPM) for w, a, b in json.loads((HERE / "capwords.json").read_text(encoding="utf-8"))]
edge, size, dup, margins = [], [], [], {}
for text, t0, t1, cx, sway, w_rest, w_slam, cap in WORDS:
    for kind, w in (("rest", w_rest), ("slam", w_slam)):
        m = min(cx - sway - w / 2, 1080 - (cx + sway + w / 2))
        margins[f"{text} {kind}"] = round(m)
        if m < 150 - 1e-6:
            edge.append({"text": text, "kind": kind, "margin": round(m), "width": round(w)})
    if w_rest > cap:
        size.append({"text": text, "width": round(w_rest), "cap": cap})
    toks = set(norm(text).replace(".", "").replace("?", "").replace("(", "").replace(")", "").split())
    for cw, a, b in caps:
        if a < t1 and b > t0 and (norm(cw) in toks or (len(cw) >= 4 and norm(cw) in norm(text))):
            dup.append({"caption": cw, "t": [round(a, 3), round(b, 3)], "word": text})
res = {"edge": edge, "size": size, "dup": dup, "margins": margins}
(HERE / "logs").mkdir(exist_ok=True)
(HERE / "logs" / "text3d_check.json").write_text(json.dumps(res, ensure_ascii=False, indent=1), encoding="utf-8")
for e in edge:
    print(f"EDGE  {e['text']} ({e['kind']}): {e['margin']} px, {e['width']} px wide (min 150)")
for s in size:
    print(f"SIZE  {s['text']}: {s['width']} px (cap {s['cap']})")
for d in dup:
    print(f"DUP   caption '{d['caption']}' {d['t']} under '{d['word']}'")
print("min margin", min(margins.values()), "px;", "CHECK PASS" if not edge and not dup and not size else "CHECK FAIL")
