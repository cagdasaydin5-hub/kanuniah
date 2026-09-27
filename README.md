# kanuniah.tr

Kanuni Eğitim ve Araştırma Hastanesi Aile Hekimliği Kliniği'nin bilgi portalı: rehberler ve mevzuat, haftanın makaleleri, klinik araçlar.

## Yapı

- Statik site: HTML + CSS + JS, sunucu tarafı kod ya da veritabanı yok.
- İçerik `data/` altındaki JSON dosyalarında:
  - `rehberler.json` – rehber ve mevzuat kaynakları
  - `makaleler.json` – haftanın makaleleri (her hafta `issues` dizisinin başına yeni sayı eklenir)
  - `meta.json` – son kontrol tarihi ve güncelleme günlüğü
  - `mamalar.json` – enteral/oral beslenme ürünleri kataloğu (alanlar aşağıda)
  - `inr-algoritma.json` – varfarin idame doz algoritmasının eşikleri (aşağıda)
- Sayfa iskeletleri `tools/build_pages.py` ile üretilir (üst menü, alt bilgi, sitemap).
- `tools/validate.py` veri dosyalarını denetler; yayın akışı hatalı veriyi yayına almaz.
- Araçlar: `assets/araclar.js` temel hesaplayıcılar. Ek araç grupları ayrı dosyalardadır ve `araclar.js`'e dokunmadan
  aynı kart görünümüyle listeye eklenir: `assets/arac-mama.js` (enteral beslenme; ayrıca ek kartlar için ortak katman
  `window.KanuniEk`) ve `assets/arac-inr.js` (varfarin idame doz ayarı). Script sırası önemlidir:
  `araclar.js` → `arac-mama.js` → `arac-inr.js`. Hiçbir araç değer kaydetmez ya da göndermez.
- Testler: `node --test` (repo kökünden; `tests/*.test.js`). Formül ve eşik değişikliklerinde bilinen örneklerle test ekleyin.

### `data/mamalar.json` alanları

Her ürün **yalnızca üreticinin resmi ürün sayfasında** doğrulanan değerlerle eklenir; doğrulanamayan ürün eklenmez.

| Alan | Açıklama |
|---|---|
| `id`, `ad` | Tekil kimlik, ürün adı |
| `uretici` | `Nutricia`, `Abbott`, `Nestlé` ya da `Fresenius Kabi` |
| `tur` | Liste: `standart`, `yuksek-protein`, `diyabetik`, `bobrek`, `lifli`, `peptit` |
| `form` | `sivi` ya da `toz` |
| `kcal_ml`, `protein_100ml`, `lif_100ml`, `su_100ml` | Kullanıma hazır ürün için (toz üründe standart sulandırmada) enerji kcal/mL, protein/lif g/100 mL, su mL/100 mL |
| `ambalaj_ml` | Sıvı üründe şişe/paket hacmi |
| `ambalaj_g`, `olcek_g`, `olcek_ml` | Toz üründe kutu ağırlığı, bir ölçek (g) ve bir ölçekle hazırlanan hacim (mL) |
| `kaynak` | Üreticinin resmi ürün sayfası (https; alan adı `validate.py`'deki listede olmalı) |
| `dogrulama` | Değerlerin kaynakta son kontrol edildiği tarih (YYYY-AA-GG) |

## Yerelde açmak

```
python -m http.server 8000
```
Tarayıcıda `http://localhost:8000`.

## Yayın

`main` dalına her gönderimde `.github/workflows/deploy.yml` siteyi FTP ile hostinge yükler.
Repo ayarlarında (Settings → Secrets and variables → Actions) şu gizli değerler tanımlı olmalı:

| Secret | Değer |
|---|---|
| `FTP_SERVER` | DirectAdmin FTP sunucu adresi |
| `FTP_USERNAME` | Site için açılan FTP hesabının kullanıcı adı |
| `FTP_PASSWORD` | O hesabın şifresi |
| `FTP_DIR` | Yükleme klasörü, ör. `/domains/kanuniah.tr/public_html/` (sonu `/` ile bitmeli) |

## İçerik kuralları

- Yalnızca resmi kaynaklara link; belge kopyası yok.
- Özetler kendi cümlelerimizle; kaynaktan uzun alıntı yok.
- Yeni sürüm gelince eski kayıt silinmez, `status: "arsiv"` yapılır.
- Hasta verisi hiçbir koşulda eklenmez.

### `data/inr-algoritma.json`

Varfarin aracının eşikleri koddan ayrı tutulur ve **Kim YK ve ark. J Thromb Haemost 2010;8:101–6, Tablo 1**'den
birebir alınmıştır. Kaynağın kopyası `tools/kaynak/inr/kim-2010-tablo1.json`'dadır; `tests/arac-inr.test.js`
iki dosyayı satır satır karşılaştırır (eşik, %, koşul, doz atlama, kontrol zamanı). Tablo değişirse önce kaynak kopyası,
sonra veri dosyası güncellenir.

- `hedefler["2-3"]`, `hedefler["2.5-3.5"]`: artan INR sırasında satırlar. INR, `ust` değeri (dahil) kendisinden
  büyük ya da eşit olan ilk satıra düşer; son satırda `ust: null`.
- `degisim`: haftalık dozda % (`null` = tablo yeni doz vermiyor). `kosul`: `"iki-olcum"` (önceki INR de aralığın aynı
  tarafındaysa uygulanır; araç önceki INR'yi sorar) ya da `"aciklanamiyor"`. `atla`: `0`, `1` (1 gün ara),
  `"inr-aralikta"`, `"kes"`. `kontrol_gun` / `kontrol_metin`: sonraki INR. `yildiz`: klinik yargıyla sapılabilir.
- Tablodaki K vitamini dozları kullanılmaz; `yuksek_inr` Holbrook 2012 uyarılarını (INR 4,5–10, > 10, kanama)
  doz vermeden gösterir.

### Kaynak dosyaları (`tools/kaynak/`)

Bulut ortamının erişemediği resmi metinlerin kopyaları (SUT güncel metni, SGK/TİTCK listeleri, Kim 2010 Tablo 1,
Mearns 2014). Sunucuya yüklenmez. SUT 4.2.8.A kartı `tools/kaynak/sut/sut-guncel-2026-08-29.docx` içindeki
yürürlükteki (üstü çizili olmayan) metinden hazırlanmıştır.
