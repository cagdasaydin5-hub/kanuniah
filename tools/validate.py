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
MAMA = j("mamalar.json")
# Üretici -> resmi alan adları (kaynak URL'si bunlardan birinde ya da alt alan adında olmalı)
RESMI = {"Nutricia": ("nutricia.com.tr", "nutricia.com"),
         "Abbott": ("abbott.com.tr", "abbottnutrition.com.tr", "abbott.com", "abbottnutrition.com"),
         "Nestlé": ("nestlehealthscience.com.tr", "nestlehealthscience.com"),
         "Fresenius Kabi": ("fresenius-kabi.com",)}
TURLER = {"standart", "yuksek-protein", "diyabetik", "bobrek", "lifli", "peptit"}
def sayi(x, a, b):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and a <= x <= b
if MAMA is not None:
    if not isinstance(MAMA.get("urunler"), list): err.append("mamalar.json: 'urunler' listesi eksik")
    ids = set()
    for u in MAMA.get("urunler") or []:
        i = u.get("id")
        for k in ("id","ad","uretici","tur","form","kcal_ml","protein_100ml","lif_100ml","su_100ml","kaynak","dogrulama"):
            if k not in u: err.append("mama %s: '%s' eksik" % (i, k))
        if i in ids: err.append("mama id tekrarı: %s" % i)
        ids.add(i)
        if u.get("uretici") not in RESMI: err.append("mama %s: üretici %s olmalı" % (i, "|".join(RESMI)))
        t = u.get("tur")
        if not isinstance(t, list) or not t or not set(t) <= TURLER: err.append("mama %s: tur %s değerlerinden oluşan boş olmayan liste olmalı" % (i, "|".join(sorted(TURLER))))
        if not sayi(u.get("kcal_ml"), 0.5, 2.5): err.append("mama %s: kcal_ml 0,5–2,5 arası sayı olmalı" % i)
        if not sayi(u.get("protein_100ml"), 0, 15): err.append("mama %s: protein_100ml 0–15 arası sayı olmalı" % i)
        if not sayi(u.get("lif_100ml"), 0, 5): err.append("mama %s: lif_100ml 0–5 arası sayı olmalı" % i)
        if not sayi(u.get("su_100ml"), 40, 100): err.append("mama %s: su_100ml 40–100 arası sayı olmalı" % i)
        if u.get("form") == "sivi":
            if not sayi(u.get("ambalaj_ml"), 50, 2000): err.append("mama %s: sıvı üründe ambalaj_ml 50–2000 arası olmalı" % i)
        elif u.get("form") == "toz":
            for k, a, b in (("ambalaj_g", 50, 2000), ("olcek_g", 1, 50), ("olcek_ml", 5, 500)):
                if not sayi(u.get(k), a, b): err.append("mama %s: toz üründe %s %d–%d arası olmalı" % (i, k, a, b))
        else: err.append("mama %s: form sivi|toz" % i)
        if "lifli" in (t or []) and not (u.get("lif_100ml") or 0) > 0: err.append("mama %s: 'lifli' türünde lif_100ml > 0 olmalı" % i)
        url = str(u.get("kaynak", ""))
        m = re.match(r"^https://([^/]+)/", url)
        host = m.group(1).lower() if m else ""
        if not host or not any(host == d or host.endswith("." + d) for d in RESMI.get(u.get("uretici"), ())):
            err.append("mama %s: kaynak üreticinin resmi sitesinde https adresi olmalı" % i)
        if not DATE.match(str(u.get("dogrulama", ""))): err.append("mama %s: dogrulama tarihi YYYY-AA-GG olmalı" % i)
INR = j("inr-algoritma.json")
if INR is not None:
    k = INR.get("kaynak", {})
    if not str(k.get("url", "")).startswith("https://") or not k.get("kunye"): err.append("inr-algoritma: kaynak künyesi ve https bağlantısı gerekli")
    for hid in ("2-3", "2.5-3.5"):
        h = INR.get("hedefler", {}).get(hid)
        if not h: err.append("inr-algoritma: hedef %s eksik" % hid); continue
        rows, onceki = h.get("satirlar") or [], -1
        if not rows: err.append("inr-algoritma %s: satır yok" % hid)
        for n, s in enumerate(rows):
            for kk in ("aralik", "ust", "degisim", "kosul", "atla", "kontrol_gun", "yildiz", "dogrulama"):
                if kk not in s: err.append("inr-algoritma %s satır %d: '%s' eksik" % (hid, n + 1, kk))
            u = s.get("ust")
            if u is None and n != len(rows) - 1: err.append("inr-algoritma %s: üst sınırı olmayan satır yalnızca sonda olabilir" % hid)
            if u is not None:
                if not sayi(u, 0, 20) or u <= onceki: err.append("inr-algoritma %s satır %d: ust artan sırada sayı olmalı" % (hid, n + 1))
                else: onceki = u
            a = s.get("atla")
            if not (a in ("inr-aralikta", "kes") or (isinstance(a, int) and not isinstance(a, bool) and 0 <= a <= 3)):
                err.append("inr-algoritma %s satır %d: atla 0-3, 'inr-aralikta' ya da 'kes'" % (hid, n + 1))
            if s.get("degisim") is None:
                if a != "kes": err.append("inr-algoritma %s satır %d: degisim yalnızca atla 'kes' iken boş olabilir" % (hid, n + 1))
            elif not sayi(s.get("degisim"), -50, 50): err.append("inr-algoritma %s satır %d: degisim -50..50 olmalı" % (hid, n + 1))
            if s.get("kosul") not in (None, "iki-olcum", "aciklanamiyor"): err.append("inr-algoritma %s satır %d: kosul null|iki-olcum|aciklanamiyor" % (hid, n + 1))
            kg = s.get("kontrol_gun")
            if kg is not None and not (isinstance(kg, list) and len(kg) == 2 and all(sayi(x, 1, 84) for x in kg) and kg[0] <= kg[1]):
                err.append("inr-algoritma %s satır %d: kontrol_gun [en erken, en geç] gün olmalı" % (hid, n + 1))
        ic = [s for s in rows if s.get("degisim") == 0]
        if len(ic) != 1 or ic[0].get("ust") != h.get("ust"): err.append("inr-algoritma %s: hedef aralık satırı (degisim 0) tek olmalı ve üst sınırı hedefin üst sınırı olmalı" % hid)
    for kosul in ("inr-4.5-10", "inr-10-ustu", "kanama"):
        if not any(x.get("kosul") == kosul and x.get("metin") for x in INR.get("yuksek_inr", [])): err.append("inr-algoritma: yuksek_inr '%s' eksik" % kosul)
if meta and not DATE.match(meta.get("checked","")): err.append("meta.checked tarihi hatalı")
if err:
    print("\n".join(err)); sys.exit(1)
print("Veri dosyaları geçerli.")
