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
if meta and not DATE.match(meta.get("checked","")): err.append("meta.checked tarihi hatalı")

# Reçete ve rapor (data/sut.json): düzenleyici alan ya null (kaynakta doğrulanamadı) ya da kaynağa dayalı değerdir.
S = j("sut.json")
RESMI = re.compile(r"^https://(www\.)?(mevzuat\.gov\.tr|resmigazete\.gov\.tr|sgk\.gov\.tr|titck\.gov\.tr)/")
RECETE = ("beyaz","kirmizi","yesil","mor","turuncu")
RAPOR = ("gerekmez","uzman-hekim","saglik-kurulu","kosullu")
if S:
    if not DATE.match(S.get("checked","")): err.append("sut.checked tarihi YYYY-AA-GG olmalı")
    srcs, grps = S.get("sources", {}), {g[0] for g in S.get("groups", [])}
    for k, s in srcs.items():
        if not RESMI.match(str(s.get("url",""))): err.append("sut kaynak %s: url yalnızca mevzuat/Resmî Gazete/SGK/TİTCK olabilir" % k)
    ids = set()
    for x in S.get("items", []):
        i = x.get("id")
        if i in ids: err.append("sut id tekrarı: %s" % i)
        ids.add(i)
        alan = ["odeme","rapor","raporUzman","yazabilir","sut","sutUrl"] + (["recete"] if x.get("tur") == "ilac" else [])
        for k in ["id","tur","ad","grup","kaynak","kontrol","durum"] + alan:
            if k not in x: err.append("sut %s: '%s' eksik (doğrulanamadıysa null yazın)" % (i, k))
        if x.get("tur") not in ("ilac","malzeme"): err.append("sut %s: tur ilac|malzeme" % i)
        if x.get("tur") == "malzeme" and "recete" in x: err.append("sut %s: malzemede recete alanı olmaz" % i)
        if x.get("grup") not in grps: err.append("sut %s: bilinmeyen grup %s" % (i, x.get("grup")))
        if not DATE.match(str(x.get("kontrol",""))): err.append("sut %s: kontrol tarihi YYYY-AA-GG olmalı" % i)
        elif S.get("checked") and x["kontrol"] > S["checked"]: err.append("sut %s: kontrol tarihi sut.checked'ten ileri olamaz" % i)
        if not x.get("kaynak") or any(k not in srcs for k in x.get("kaynak", [])): err.append("sut %s: kaynak boş ya da sources'ta yok" % i)
        v = {k: x.get(k) for k in alan}
        if v.get("recete") is not None and v["recete"] not in RECETE: err.append("sut %s: recete %s olmalı" % (i, "|".join(RECETE)))
        if v["odeme"] is not None and not isinstance(v["odeme"], bool): err.append("sut %s: odeme true|false|null" % i)
        if v["rapor"] is not None and v["rapor"] not in RAPOR: err.append("sut %s: rapor %s olmalı" % (i, "|".join(RAPOR)))
        for k in ("raporUzman","yazabilir"):
            if v[k] is not None and not (isinstance(v[k], list) and v[k] and all(isinstance(s, str) and s for s in v[k])):
                err.append("sut %s: %s dolu bir metin listesi ya da null olmalı" % (i, k))
        if v["sut"] is not None and not re.match(r"^\d+(\.\d+)*(\.[A-Z])?$", str(v["sut"])): err.append("sut %s: sut madde numarası (ör. 4.2.12) olmalı" % i)
        if (v["sut"] is None) != (v["sutUrl"] is None): err.append("sut %s: sut ve sutUrl birlikte dolu ya da birlikte null olmalı" % i)
        if v["sutUrl"] is not None and not RESMI.match(v["sutUrl"]): err.append("sut %s: sutUrl resmî kaynak olmalı" % i)
        dolu = [k for k in alan if v[k] is not None]
        beklenen = "dogrulandi" if len(dolu) == len(alan) else "kismen" if dolu else "dogrulanamadi"
        if x.get("durum") != beklenen: err.append("sut %s: durum '%s' olmalı (dolu alan %d/%d)" % (i, beklenen, len(dolu), len(alan)))
if err:
    print("\n".join(err)); sys.exit(1)
print("Veri dosyaları geçerli.")
