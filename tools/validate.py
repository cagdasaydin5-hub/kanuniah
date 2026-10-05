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
TM = j("temel-makaleler.json")
if TM and R:
    gids2 = {g["id"] for g in R["guides"]}
    kons = {k["id"] for k in TM["konular"]}; tid = set(); tpm = set()
    for p in TM["makaleler"]:
        for k in ("id","pmid","journal","year","title","title_en","design","konu","what","practice"):
            if k not in p: err.append("temel makale %s: '%s' eksik" % (p.get("id"), k))
        if p.get("id") in tid: err.append("temel makale id tekrarı: %s" % p.get("id"))
        if p.get("pmid") in tpm: err.append("temel makale pmid tekrarı: %s" % p.get("pmid"))
        tid.add(p.get("id")); tpm.add(p.get("pmid"))
        if p.get("konu") not in kons: err.append("temel makale %s: bilinmeyen konu %s" % (p.get("id"), p.get("konu")))
        if not isinstance(p.get("year"), int): err.append("temel makale %s: year sayı olmalı" % p.get("id"))
        for r in p.get("rel", []):
            if r not in gids2: err.append("temel makale %s: ilgili rehber bulunamadı: %s" % (p["id"], r))
MAMA = j("mamalar.json")
# Üretici -> resmi alan adları (kaynak URL'si bunlardan birinde ya da alt alan adında olmalı)
RESMI = {"Nutricia": ("nutricia.com.tr", "nutricia.com"),
         "Abbott": ("abbott.com.tr", "abbottnutrition.com.tr", "abbott.com", "abbottnutrition.com"),
         "Nestlé": ("nestlehealthscience.com.tr", "nestlehealthscience.com"),
         "Fresenius Kabi": ("fresenius-kabi.com",)}
TURLER = {"standart", "yuksek-protein", "yuksek-enerji", "diyabetik", "bobrek", "lifli", "peptit", "immun"}
YOLLAR = {"tup", "oral", "oral-tup"}
def sayi(x, a, b):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and a <= x <= b
if MAMA is not None:
    if not isinstance(MAMA.get("urunler"), list): err.append("mamalar.json: 'urunler' listesi eksik")
    ids = set()
    for u in MAMA.get("urunler") or []:
        i = u.get("id")
        for k in ("id","ad","uretici","tur","form","kcal_ml","protein_100ml","lif_100ml","kaynak","dogrulama"):
            if k not in u: err.append("mama %s: '%s' eksik" % (i, k))
        if i in ids: err.append("mama id tekrarı: %s" % i)
        ids.add(i)
        if u.get("uretici") not in RESMI: err.append("mama %s: üretici %s olmalı" % (i, "|".join(RESMI)))
        t = u.get("tur")
        if not isinstance(t, list) or not t or not set(t) <= TURLER: err.append("mama %s: tur %s değerlerinden oluşan boş olmayan liste olmalı" % (i, "|".join(sorted(TURLER))))
        if not sayi(u.get("kcal_ml"), 0.5, 2.5): err.append("mama %s: kcal_ml 0,5–2,5 arası sayı olmalı" % i)
        if not sayi(u.get("protein_100ml"), 0, 15): err.append("mama %s: protein_100ml 0–15 arası sayı olmalı" % i)
        if u.get("lif_100ml") is not None and not sayi(u.get("lif_100ml"), 0, 5): err.append("mama %s: lif_100ml 0–5 arası sayı ya da null (kaynakta belirtilmemiş) olmalı" % i)
        if u.get("su_100ml") is not None and not sayi(u.get("su_100ml"), 40, 100): err.append("mama %s: su_100ml 40–100 arası sayı olmalı" % i)
        if u.get("osm") is not None and not sayi(u.get("osm"), 150, 1000): err.append("mama %s: osm (mOsm/L) 150–1000 arası olmalı" % i)
        if u.get("yol") is not None and u.get("yol") not in YOLLAR: err.append("mama %s: yol %s olmalı" % (i, "|".join(sorted(YOLLAR))))
        if u.get("form") == "sivi":
            if u.get("ambalaj_ml") is not None and not sayi(u.get("ambalaj_ml"), 50, 2000): err.append("mama %s: sıvı üründe ambalaj_ml 50–2000 arası ya da null olmalı" % i)
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
E = j("etkinlikler.json")
if E is not None:
    ids, dz = set(), {z.get("id") for z in E.get("duzeyler", [])}
    for e in E.get("etkinlikler", []):
        i = e.get("id")
        if not i or i in ids: err.append("etkinlik id eksik ya da tekrar: %s" % i)
        ids.add(i)
        for k in ("ad", "tur", "duzey", "kapsam", "dogrulama"):
            if not e.get(k): err.append("etkinlik %s: '%s' eksik" % (i, k))
        if e.get("duzey") not in dz: err.append("etkinlik %s: duzey %s tanımsız" % (i, e.get("duzey")))
        if e.get("tur") not in ("kongre", "sempozyum", "kurs", "okul", "arastirma", "webinar"): err.append("etkinlik %s: tur geçersiz" % i)
        if e.get("kapsam") not in ("bolgesel", "ulusal", "uluslararasi"): err.append("etkinlik %s: kapsam geçersiz" % i)
        b, s = e.get("baslangic"), e.get("bitis")
        if b is None and not e.get("yil"): err.append("etkinlik %s: baslangic ya da yil gerekli" % i)
        for x in [b, s] + list((e.get("tarihler") or {}).values()) + [e.get("dogrulama")]:
            if x is not None and not DATE.match(str(x)): err.append("etkinlik %s: tarih YYYY-AA-GG olmalı (%s)" % (i, x))
        if b and s and s < b: err.append("etkinlik %s: bitis başlangıçtan önce" % i)
        u = e.get("url")
        if u is not None and not str(u).startswith("https://"): err.append("etkinlik %s: url https olmalı" % i)
        if not u and not e.get("kaynak"): err.append("etkinlik %s: url ya da kaynak gerekli" % i)

A = j("araclar.json")
if A:
    tids = [t.get("id") for t in A.get("tools", [])]
    if not tids: err.append("araclar.json: araç yok (python tools/build_pwa.py)")
    if len(tids) != len(set(tids)): err.append("araclar.json: araç id tekrarı")
    for t in A.get("tools", []):
        if not t.get("t"): err.append("araç %s: ad (t) eksik" % t.get("id"))
if meta and not DATE.match(meta.get("checked","")): err.append("meta.checked tarihi hatalı")
for x in (meta or {}).get("log", []):
    if not DATE.match(x.get("date", "")): err.append("meta.log tarihi hatalı: %r" % x)
    for it in x.get("items", []):
        if not it.get("ad") or not isinstance(it.get("n"), int): err.append("meta.log kalemi hatalı: %r" % it)
    if not x.get("items") and not x.get("text"): err.append("meta.log kaydı boş: %r" % x)

# Reçete ve rapor (data/sut.json): düzenleyici alan ya null (kaynakta doğrulanamadı) ya da kaynağa dayalı değerdir.
S = j("sut.json")
RESMI = re.compile(r"^https://(www\.)?(mevzuat\.gov\.tr|resmigazete\.gov\.tr|sgk\.gov\.tr|titck\.gov\.tr)/")
RECETE = ("beyaz","kirmizi","yesil","mor","turuncu")
RAPOR = ("gerekmez","uzman-hekim","saglik-kurulu","kosullu")
MADDE = re.compile(r"^(\d+(\.\d+)+(\.[A-ZÇĞİÖŞÜ](-\d+)?)?|EK-4/[EF] \d+(\.\d+)?(-\d+)?)$")
def metinler(v): return isinstance(v, list) and all(isinstance(s, str) and s.strip() for s in v)
if S:
    if not DATE.match(S.get("checked","")): err.append("sut.checked tarihi YYYY-AA-GG olmalı")
    srcs, grps = S.get("sources", {}), {g[0] for g in S.get("groups", [])}
    for k, s in srcs.items():
        if not RESMI.match(str(s.get("url",""))): err.append("sut kaynak %s: url yalnızca mevzuat/Resmî Gazete/SGK/TİTCK olabilir" % k)
        if s.get("dosya") and not os.path.exists(os.path.join(ROOT, s["dosya"])): err.append("sut kaynak %s: dosya yok: %s" % (k, s["dosya"]))
    ids = set()
    for x in S.get("items", []):
        i = x.get("id")
        if i in ids: err.append("sut id tekrarı: %s" % i)
        ids.add(i)
        alan = ["odeme","rapor","raporUzman","yazabilir","sut"] + (["recete"] if x.get("tur") == "ilac" else [])
        for k in ["id","tur","ad","grup","kaynak","kontrol","durum","sutUrl","alinti","odemeNot"] + alan:
            if k not in x: err.append("sut %s: '%s' eksik (doğrulanamadıysa null yazın)" % (i, k))
        if x.get("tur") not in ("ilac","malzeme"): err.append("sut %s: tur ilac|malzeme" % i)
        if x.get("tur") == "malzeme" and "recete" in x: err.append("sut %s: malzemede recete alanı olmaz" % i)
        if x.get("grup") not in grps: err.append("sut %s: bilinmeyen grup %s" % (i, x.get("grup")))
        if not DATE.match(str(x.get("kontrol",""))): err.append("sut %s: kontrol tarihi YYYY-AA-GG olmalı" % i)
        elif S.get("checked") and x["kontrol"] > S["checked"]: err.append("sut %s: kontrol tarihi sut.checked'ten ileri olamaz" % i)
        if not x.get("kaynak") or any(k not in srcs for k in x.get("kaynak", [])): err.append("sut %s: kaynak boş ya da sources'ta yok" % i)
        v = {k: x.get(k) for k in alan}
        if v.get("recete") is not None and not (metinler(v["recete"]) and v["recete"] and set(v["recete"]) <= set(RECETE) and len(set(v["recete"])) == len(v["recete"])):
            err.append("sut %s: recete %s değerlerinden oluşan liste olmalı" % (i, "|".join(RECETE)))
        if v["odeme"] is not None and not isinstance(v["odeme"], bool): err.append("sut %s: odeme true|false|null" % i)
        if (v["odeme"] is None) != (x.get("odemeNot") is None): err.append("sut %s: odeme doluysa odemeNot (kaynak ve tarih) da dolu olmalı" % i)
        if v["rapor"] is not None and v["rapor"] not in RAPOR: err.append("sut %s: rapor %s olmalı" % (i, "|".join(RAPOR)))
        if v["raporUzman"] is not None and not (metinler(v["raporUzman"]) and (v["raporUzman"] or v["rapor"] == "gerekmez")):
            err.append("sut %s: raporUzman metin listesi olmalı (boş liste yalnızca rapor gerekmez ise)" % i)
        if v["yazabilir"] is not None and not (metinler(v["yazabilir"]) and v["yazabilir"]): err.append("sut %s: yazabilir dolu metin listesi ya da null" % i)
        if v["sut"] is not None and not (metinler(v["sut"]) and v["sut"] and all(MADDE.match(m) for m in v["sut"])):
            err.append("sut %s: sut madde numaraları listesi olmalı (ör. [\"4.2.28.A-1\", \"EK-4/F 51\"])" % i)
        if (v["sut"] is None) != (x.get("sutUrl") is None) or (v["sut"] is None) != (x.get("alinti") is None):
            err.append("sut %s: sut, sutUrl ve alinti birlikte dolu ya da birlikte null olmalı" % i)
        if x.get("sutUrl") is not None and not RESMI.match(x["sutUrl"]): err.append("sut %s: sutUrl resmî kaynak olmalı" % i)
        if x.get("alinti") is not None and not (20 <= len(x["alinti"]) <= 700): err.append("sut %s: alıntı kısa olmalı (20-700 karakter)" % i)
        if v["rapor"] is not None and not {"sut-guncel","sgk-ek4f","sgk-ek4e"} & set(x.get("kaynak", [])): err.append("sut %s: rapor bilgisi yalnızca SUT metni ya da EK-4/F, EK-4/E'den alınır" % i)
        for m in v["sut"] or []:
            if m.startswith("EK-4/F") and "sgk-ek4f" not in x.get("kaynak", []): err.append("sut %s: EK-4/F maddesi için sgk-ek4f kaynağı gerekli" % i)
            if m.startswith("EK-4/E") and "sgk-ek4e" not in x.get("kaynak", []): err.append("sut %s: EK-4/E maddesi için sgk-ek4e kaynağı gerekli" % i)
        if v.get("recete") is not None and "titck-skrs" not in x.get("kaynak", []): err.append("sut %s: reçete türü için titck-skrs kaynağı gerekli" % i)
        dolu = [k for k in alan if v[k] is not None]
        beklenen = "dogrulandi" if len(dolu) == len(alan) else "kismen" if dolu else "dogrulanamadi"
        if x.get("durum") != beklenen: err.append("sut %s: durum '%s' olmalı (dolu alan %d/%d)" % (i, beklenen, len(dolu), len(alan)))
if err:
    print("\n".join(err)); sys.exit(1)
print("Veri dosyaları geçerli.")
