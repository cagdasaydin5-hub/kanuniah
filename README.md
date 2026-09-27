# kanuniah.tr

Kanuni Eğitim ve Araştırma Hastanesi Aile Hekimliği Kliniği'nin bilgi portalı: rehberler ve mevzuat, haftanın makaleleri, klinik araçlar.

## Yapı

- Statik site: HTML + CSS + JS, sunucu tarafı kod ya da veritabanı yok.
- İçerik `data/` altındaki JSON dosyalarında:
  - `rehberler.json` – rehber ve mevzuat kaynakları
  - `makaleler.json` – haftanın makaleleri (her hafta `issues` dizisinin başına yeni sayı eklenir)
  - `meta.json` – son kontrol tarihi ve güncelleme günlüğü
  - `sut.json` – "Reçete ve rapor" aracının verisi (aşağıya bakın)
- Sayfa iskeletleri `tools/build_pages.py` ile üretilir (üst menü, alt bilgi, sitemap).
- `tools/validate.py` veri dosyalarını denetler; yayın akışı hatalı veriyi yayına almaz.

## Reçete ve rapor aracı

`assets/arac-sut.js` araçlar sayfasına bir kart ekler: etken madde ya da tıbbi malzeme aranınca reçete türü, SGK ödeme listesi (Ek-4/A), rapor gereği, raporu düzenleyecek uzman, raporla yazabilecek hekimler, SUT maddesi ve bağlantısı tek kartta görünür. Veri `data/sut.json`'dadır.

- Kapsam: aile hekimliğinde sık kullanılan 150 etken madde (antihipertansif, antidiyabetik, statin, antikoagülan/antiagregan, KOAH/astım, antidepresan, antipsikotik, demans, osteoporoz, PPI, opioid/analjezik) ve 4 tıbbi malzeme raporu (hasta bezi, havalı yatak, oksijen konsantratörü, enteral ürün).
- Kaynak: yalnızca Resmî Gazete'deki güncel SUT metni, SGK ve TİTCK. Başka site, özet ya da hafıza kullanılmaz.
- Doğrulanamayan alan `null` bırakılır; sayfada "kaynakta doğrulanamadı" yazar. Tahminle doldurulmaz.
- Her kayıtta `kaynak` (üst düzey `sources` anahtarları) ve `kontrol` (YYYY-AA-GG) bulunur. `durum`, dolu alan sayısına göre `dogrulandi`, `kismen` ya da `dogrulanamadi` olmalıdır.
- Alan değerleri: `recete` beyaz | kirmizi | yesil | mor | turuncu (yalnız ilaçta); `odeme` true | false; `rapor` gerekmez | uzman-hekim | saglik-kurulu | kosullu; `raporUzman` ve `yazabilir` metin listesi; `sut` madde numarası (ör. 4.2.12) ve `sutUrl` birlikte.
- Bir kaydı doğrularken: alanı doldurun, `kaynak`a kullandığınız belgeyi, `kontrol`e bugünün tarihini yazın; en sonda üst düzey `checked`i güncelleyin (sayfadaki "SUT sık değişir; son kontrol: …" uyarısı buradan gelir).
- `tools/validate.py` bu kuralları denetler; bağlantılar yalnızca mevzuat.gov.tr, resmigazete.gov.tr, sgk.gov.tr ve titck.gov.tr olabilir.
- Durum (27.09.2026): ilk kontrolde resmî kaynaklara erişilemedi; tüm düzenleyici alanlar boş, kayıtlar `dogrulanamadi`.

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
