"""DDInter indirme CSV'lerinden etkileşim aracının veri dosyalarını üretir.

Kullanım:
    python3 tools/etkilesim/derle.py <ddinter_csv_klasörü>

Klasörde DDInter'in indirme sayfasındaki sekiz dosya bulunmalı (ddinter_downloads_code_A.csv, _B, _D, _H, _L, _P, _R, _V).
Kaynak: https://ddinter.scbdd.com/download/ · Lisans: CC BY-NC-SA 4.0.

Çıktı:
    data/etkilesim/ilaclar.json      – eşleme tablosu (Türkçe ad → DDInter adı, etiketler, kapsam bilgisi)
    data/etkilesim/ilac/<id>.json    – her ilacın listedeki diğer ilaçlarla etkileşimleri (sayfa yalnızca seçilen ilaçları yükler)

Kapsam notu: DDInter indirme dosyaları ATC gruplarına bölünmüştür ve yalnızca A, B, D, H, L, P, R, V grupları
yayımlanmıştır. Bir çift, ilaçlardan en az birinin ATC kodu bu gruplardan birindeyse dosyalarda yer alır. İki ilacın da
bu grupların dışında kaldığı çiftler (ör. sertralin + tramadol) dosyalarda hiç bulunmaz; bu, etkileşim olmadığı anlamına
gelmez. Bu betik her ilacın bir gruba "üye" olup olmadığını veriden çıkarır: üye olan ilacın tüm etkileşimleri o grubun
dosyasında bulunur. Hiçbir gruba üye olmayan iki ilaç arasındaki çift sayfada "kapsam dışı" olarak gösterilir.
"""
import csv, glob, hashlib, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TSV = os.path.join(ROOT, "tools", "etkilesim", "ilaclar.tsv")
OUT = os.path.join(ROOT, "data", "etkilesim")
RANK = {"Major": 3, "Moderate": 2, "Minor": 1, "Unknown": 0}
ETIKET = {"pgpg", "1a2g", "pde5", "nitrat", "tiyazid", "loop", "mao", "vka", "doak", "kanama", "nsaii", "qt", "sero", "3a4g", "3a4", "ind", "statin3a4", "raas", "k", "diur"}


def tablo_oku():
    rows, ids = [], set()
    for n, line in enumerate(open(TSV, encoding="utf-8"), 1):
        if not line.strip() or line.startswith("#"):
            continue
        p = line.rstrip("\n").split("\t")
        if len(p) != 6:
            sys.exit("ilaclar.tsv satır %d: 6 sütun olmalı, %d var" % (n, len(p)))
        i, ad, diger, dd, grup, et = p
        if i in ids:
            sys.exit("ilaclar.tsv satır %d: id tekrarı %s" % (n, i))
        ids.add(i)
        e = [x for x in et.split(",") if x]
        bad = set(e) - ETIKET
        if bad:
            sys.exit("ilaclar.tsv satır %d: bilinmeyen etiket %s" % (n, bad))
        rows.append({"id": i, "ad": ad, "diger": [x.strip() for x in diger.split(",") if x.strip()],
                     "dd": [x.strip() for x in dd.split(";") if x.strip()], "g": grup, "e": e})
    return rows


def ddinter_oku(klasor):
    files = sorted(glob.glob(os.path.join(klasor, "ddinter_downloads_code_*.csv")))
    if not files:
        sys.exit("DDInter CSV dosyası bulunamadı: %s" % klasor)
    pairs, partners, infile, kimlik = {}, {}, {}, {}
    ozet = []
    for f in files:
        kod = os.path.basename(f).split("_")[-1].split(".")[0]
        ozet.append({"dosya": os.path.basename(f), "sha256": hashlib.sha256(open(f, "rb").read()).hexdigest()})
        for r in csv.DictReader(open(f, encoding="utf-8")):
            a, b, lv = r["Drug_A"].strip(), r["Drug_B"].strip(), r["Level"].strip()
            kimlik[a], kimlik[b] = r["DDInterID_A"].strip(), r["DDInterID_B"].strip()
            if lv not in RANK:
                sys.exit("%s: bilinmeyen düzey %r" % (f, lv))
            k = (a, b) if a < b else (b, a)
            if k in pairs and pairs[k] != lv:
                # dosyalar arasında çelişki olursa daha ciddi olanı al
                lv = max(pairs[k], lv, key=RANK.get)
            pairs[k] = lv
            for x, y in ((a, b), (b, a)):
                partners.setdefault(x, set()).add(y)
                infile.setdefault((x, kod), set()).add(y)
    kodlar = sorted({k for (_, k) in infile})
    # Bir ilaç, bir gruptaki dosyada tüm ortaklarıyla birlikte geçiyorsa o grubun üyesidir.
    uye = {d for d in partners if any(infile.get((d, k), set()) == partners[d] for k in kodlar)}
    return pairs, kimlik, uye, ozet


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    rows = tablo_oku()
    pairs, kimlik, uye, ozet = ddinter_oku(sys.argv[1])

    eksik = [(r["id"], d) for r in rows for d in r["dd"] if d not in kimlik]
    if eksik:
        sys.exit("DDInter verisinde bulunmayan adlar: %s" % eksik)

    # Kapsam varsayımının denetimi: üye olmayan iki ilaç arasında hiçbir çift bulunmamalı.
    ihlal = [k for k in pairs if k[0] not in uye and k[1] not in uye]
    if ihlal:
        sys.exit("Kapsam varsayımı tutmadı, örnek: %s" % ihlal[:5])

    for r in rows:
        r["k"] = any(d in uye for d in r["dd"])
        r["ddid"] = [kimlik[d] for d in r["dd"]]

    os.makedirs(os.path.join(OUT, "ilac"), exist_ok=True)
    for f in glob.glob(os.path.join(OUT, "ilac", "*.json")):
        os.remove(f)
    toplam = {k: 0 for k in RANK}
    for r in rows:
        x = {}
        for s in rows:
            if s is r or not r["dd"] or not s["dd"]:
                continue
            best = None
            for a in r["dd"]:
                for b in s["dd"]:
                    if a == b:
                        continue
                    lv = pairs.get((a, b) if a < b else (b, a))
                    if lv and (best is None or RANK[lv] > RANK[best]):
                        best = lv
            if best:
                x[s["id"]] = best
                if r["id"] < s["id"]:
                    toplam[best] += 1
        with open(os.path.join(OUT, "ilac", r["id"] + ".json"), "w", encoding="utf-8") as fh:
            json.dump({"id": r["id"], "x": dict(sorted(x.items()))}, fh, ensure_ascii=False, separators=(",", ":"))
            fh.write("\n")

    meta = {
        "kaynak": "DDInter – Drug-Drug Interaction Database (Xiong G ve ark. Nucleic Acids Res 2022;50:D1200–D1207)",
        "url": "https://ddinter.scbdd.com/",
        "lisans": "CC BY-NC-SA 4.0",
        "dosyalar": ozet,
        "cift_sayisi": toplam,
    }
    with open(os.path.join(OUT, "ilaclar.json"), "w", encoding="utf-8") as fh:
        json.dump({"meta": meta, "ilaclar": [{k: r[k] for k in ("id", "ad", "diger", "dd", "ddid", "g", "e", "k")} for r in rows]},
                  fh, ensure_ascii=False, separators=(",", ":"))
        fh.write("\n")
    print("%d ilaç; listedeki çiftler: %s; DDInter verisi olmayan: %s; kapsam grubu dışı: %s" % (
        len(rows), toplam, [r["id"] for r in rows if not r["dd"]],
        [r["id"] for r in rows if r["dd"] and not r["k"]]))


if __name__ == "__main__":
    main()
