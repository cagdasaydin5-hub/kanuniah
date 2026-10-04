"""DDInter etkileşim sayfası kimliklerini (interaction_id) ilaç dosyalarına ekler.

Kullanım:
    python3 tools/etkilesim/iid_ekle.py <ddinter_iid.json>

Girdi: {"iid": {"ilacA|ilacB": interaction_id, ...}} (anahtardaki kimlikler bu sitenin ilaç kimlikleridir, alfabetik sırada).
Kimlikler DDInter'in her ilaç sayfasındaki etkileşim listesinden alınır; sayfa bağlantısı:
https://ddinter.scbdd.com/ddinter/interact/<interaction_id>/
Çıktı: data/etkilesim/ilac/<id>.json dosyalarına "i": {diğer_ilaç: interaction_id} alanı (yalnızca "x"te kaydı olan çiftler).
"""
import glob, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
iid = json.load(open(sys.argv[1], encoding="utf-8"))["iid"]
n = 0
for f in glob.glob(os.path.join(ROOT, "data", "etkilesim", "ilac", "*.json")):
    j = json.load(open(f, encoding="utf-8"))
    i = {}
    for b in j["x"]:
        k = "|".join(sorted([j["id"], b]))
        if k in iid:
            i[b] = iid[k]
    j.pop("i", None)
    if i:
        j["i"] = dict(sorted(i.items())); n += len(i)
    with open(f, "w", encoding="utf-8") as fh:
        json.dump(j, fh, ensure_ascii=False, separators=(",", ":")); fh.write("\n")
print("bağlantı eklenen çift (iki yönlü):", n)
