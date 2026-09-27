"""Veri dosyalarını denetler: python tools/validate.py. Hata varsa 1 ile çıkar."""
import json, os, sys, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
err = []
def j(n):
    try:
        return json.load(open(os.path.join(ROOT, "data", n), encoding="utf-8"))
    except Exception as e:
        err.append("%s okunamadı: %s" % (n, e)); return None
R, M, meta = j("rehberler.json"), j("makaleler.json"), j("meta.json")
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
if R:
    cats = {c["id"] for c in R["categories"]}
    ids = set()
    for g in R["guides"]:
        for k in ("id","cat","kind","scope","status","aud","title","org","summary","url"):
            if k not in g: err.append("rehber %s: '%s' eksik" % (g.get("id"), k))
        if g.get("id") in ids: err.append("rehber id tekrarı: %s" % g["id"])
        ids.add(g.get("id"))
        if g.get("cat") not in cats: err.append("rehber %s: bilinmeyen kategori %s" % (g["id"], g.get("cat")))
        if g.get("pub") and not DATE.match(g["pub"]): err.append("rehber %s: pub tarihi YYYY-AA-GG olmalı" % g["id"])
        if not str(g.get("url","")).startswith("https://"): err.append("rehber %s: url https olmalı" % g["id"])
        if g.get("status") not in ("guncel","arsiv"): err.append("rehber %s: status guncel|arsiv" % g["id"])
if M and R:
    gids = {g["id"] for g in R["guides"]}
    for iss in M["issues"]:
        for p in iss["items"]:
            for k in ("id","pmid","journal","date","title","title_en","design","score","effect","what","practice"):
                if k not in p: err.append("makale %s: '%s' eksik" % (p.get("id"), k))
            s = p.get("score", {})
            lim = {"kanit":(1,3),"poem":(0,1),"bb":(0,2),"etki":(0,2)}
            for k,(a,b) in lim.items():
                if not isinstance(s.get(k), int) or not a <= s[k] <= b: err.append("makale %s: puan %s %d-%d arası olmalı" % (p.get("id"), k, a, b))
            for r in p.get("rel", []):
                if r not in gids: err.append("makale %s: ilgili rehber bulunamadı: %s" % (p["id"], r))
A = j("araclar.json")
if A:
    tids = [t.get("id") for t in A.get("tools", [])]
    if not tids: err.append("araclar.json: araç yok (python tools/build_pwa.py)")
    if len(tids) != len(set(tids)): err.append("araclar.json: araç id tekrarı")
    for t in A.get("tools", []):
        if not t.get("t"): err.append("araç %s: ad (t) eksik" % t.get("id"))
if meta and not DATE.match(meta.get("checked","")): err.append("meta.checked tarihi hatalı")
if err:
    print("\n".join(err)); sys.exit(1)
print("Veri dosyaları geçerli.")
