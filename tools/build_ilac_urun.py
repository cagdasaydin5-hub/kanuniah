"""Reçete ve rapor aracı için ilaç adı (preparat) dizini: data/ilac-urun.json.

Kullanım (repo kökünden):
  python3 tools/build_ilac_urun.py TITCK.xlsx EK4A_PAKET.xlsx [EK4A_DEGISIKLIK.xlsx ...]

- TITCK.xlsx: TİTCK SKRS E-Reçete İlaç ve Diğer Farmasötik Ürünler Listesi; yalnızca
  "AKTİF ÜRÜNLER LİSTESİ" sayfası okunur (ürün adı, barkod, ATC kodu/adı, reçete türü).
- EK4A_PAKET.xlsx: SGK Ek-4/A tam listesi (SUT paketi). Barkod (güncel + eski) eşleşmesiyle
  ürünün listede aktif/pasif olup olmadığı yazılır.
- EK4A_DEGISIKLIK.xlsx: sonraki SGK duyuruları; sayfa adında EKLENEN/AKTİFLENEN geçenler aktif,
  PASİF geçenler pasif yapılır (sırayla uygulanır).

ATC kodu data/sut.json'daki bir kaydın atc listesindeyse ürün o kayda bağlanır. Başka hiçbir
alan tahmin edilmez; rapor/uzman bilgisi yalnızca sut.json kayıtlarındadır."""
import json, os, re, sys
import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RECETE = {"normal": "N", "kirmizi": "K", "yesil": "Y", "mor": "M", "turuncu": "T"}
TR = str.maketrans("ıİşŞğĞüÜöÖçÇ", "iisSgGuUoOcC")


def key(s):
    return str(s or "").translate(TR).lower().strip()


def barkodlar(*vals):
    out = set()
    for v in vals:
        for p in re.split(r"[^0-9]+", str(v or "")):
            if len(p) >= 8:
                out.add(p)
    return out


def tablo(ws):
    """Başlık satırını ('Barkod' içeren ilk satır) bulup sözlük satırları döndürür."""
    head = None
    for r in ws.iter_rows(values_only=True):
        if head is None:
            if any(c and "Barkod" in str(c) for c in r):
                head = [str(c or "").replace("\n", " ").strip() for c in r]
            continue
        yield dict(zip(head, r))


def sut_atc():
    S = json.load(open(os.path.join(ROOT, "data/sut.json"), encoding="utf-8"))
    m = {}
    for x in S["items"]:
        for a in x.get("atc") or []:
            m.setdefault(a.split()[0], x["id"])
    return m


def main(titck, paket, degisiklik):
    # Ek-4/A durumu: barkod -> 1 aktif, 2 pasif
    ek = {}
    wb = openpyxl.load_workbook(paket, read_only=True)
    for r in tablo(wb.worksheets[0]):
        d = 2 if r.get("Pasiflenme Tarihi") else 1
        for b in barkodlar(r.get("Güncel Barkod"), r.get("Eski Barkodlar")):
            ek[b] = d
    for f in degisiklik:
        wb = openpyxl.load_workbook(f, read_only=True)
        for ws in wb.worksheets:
            ad = key(ws.title)
            d = 2 if "pasif" in ad else 1 if ("eklenen" in ad or "aktif" in ad) else 0
            if not d:
                continue
            for r in tablo(ws):
                bk = [v for k, v in r.items() if "Barkod" in k]
                for b in barkodlar(*bk):
                    ek[b] = d

    bag = sut_atc()
    wb = openpyxl.load_workbook(titck, read_only=True)
    ws = [w for w in wb.worksheets if "AKT" in w.title.upper()][0]
    atc, atci, u = [], {}, []
    for r in tablo(ws):
        ad, kod = r.get("İlaç Adı"), r.get("ATC Kodu")
        if not ad or not kod or str(r.get("Durumu", "")).strip().lower() != "aktif":
            continue
        kod = str(kod).strip()
        if kod not in atci:
            atci[kod] = len(atc)
            atc.append([kod, str(r.get("ATC Adı") or "").strip(), bag.get(kod, "")])
        rt = RECETE.get(key(r.get("Reçete Türü")).split()[0] if r.get("Reçete Türü") else "", "")
        b = barkodlar(r.get("Barkod"))
        o = max([ek.get(x, 0) for x in b] or [0])
        u.append([re.sub(r"\s+", " ", str(ad)).strip(), atci[kod], rt, o])
    u.sort(key=lambda x: key(x[0]))
    out = {"not": "Ürün adı, ATC ve reçete türü TİTCK SKRS e-reçete aktif ürün listesinden; Ek-4/A durumu SGK listesinden barkod eşleşmesiyle (0 listede yok, 1 aktif, 2 pasif). Reçete türü kodu: N normal, K kırmızı, Y yeşil, M mor, T turuncu.",
           "kaynak": ["titck-skrs", "sgk-ek4a-2026-08-29", "sgk-ek4a-2026-37", "sgk-ek4a-2026-09-25"],
           "atc": atc, "u": u}
    p = os.path.join(ROOT, "data/ilac-urun.json")
    json.dump(out, open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("%d ürün, %d ATC (%d tanesi sut.json kaydına bağlı), Ek-4/A eşleşen %d" %
          (len(u), len(atc), sum(1 for a in atc if a[2]), sum(1 for x in u if x[3])))


if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2], sys.argv[3:])
