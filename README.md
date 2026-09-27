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

`assets/arac-sut.js` araçlar sayfasına bir kart ekler: etken madde ya da tıbbi malzeme aranınca reçete türü, SGK ödeme listesi (Ek-4/A), rapor gereği, raporu düzenleyecek uzman, raporla yazabilecek hekimler, SUT maddesi, metinden kısa alıntı ve kaynak tek kartta görünür. Veri `data/sut.json`'dadır.

- Kapsam: aile hekimliğinde sık kullanılan 150 etken madde (antihipertansif, antidiyabetik, statin, antikoagülan/antiagregan, KOAH/astım, antidepresan, antipsikotik, demans, osteoporoz, PPI, opioid/analjezik) ve 4 tıbbi malzeme raporu (hasta bezi, havalı yatak, oksijen konsantratörü, enteral ürün).
- Kaynaklar `tools/kaynak/sut/` klasöründedir (her dosyanın kaynağı ve tarihi o klasörün README'sinde). Başka site, özet ya da hafıza kullanılmaz.
  - **Reçete türü**: TİTCK SKRS e-reçete aktif ürün listesi; kaydın `atc` alanındaki ATC adlarına sahip ürünlerin "Reçete Türü" değerleri (birden fazla renk varsa hepsi). Aktif listede ürünü olmayan etken maddede `null`.
  - **SGK ödeme**: Ek-4/A 08.04.2026 tam listesi + klasördeki iki değişiklik dosyası (2026/37 ve 25.09.2026 İGÖK); TİTCK ürünleri barkodla eşlenir, en az bir ürün Ek-4/A'da aktifse `true`. Aradaki haftalık SGK duyuruları klasörde olmadığından işlenmedi; bu `odemeNot`'ta yazar.
  - **Rapor, uzman, yazabilen hekim, madde**: yalnızca `sut-guncel-2026-08-29.docx`. Üstü çizili (yürürlükten kalkmış) hükümler yok sayılır. Her kayıtta madde numarası (`sut`) ve metinden kısa alıntı (`alinti`) vardır; alıntılar RG değişiklik notları "(Ek:/Değişik:/Mülga: … Yürürlük: …)" çıkarılmış metinle birebir aynıdır, " … " ayrı parçaları ayırır. Etken madde SUT'ta adıyla değil sınıfıyla geçiyorsa (ör. SSRI, bifosfonat, analog insülin) eşleme `not` alanında yazar.
  - **Tıbbi malzeme**: SUT 3.3.34 (hasta bezi), 3.3.6/3.3.6.B (oksijen konsantratörü), 4.2.8.A (enteral ürün) ve EK-3/C listeleri. Havalı yatak kaynaklarda bulunamadı.
- Metinde bulunamayan alan `null` bırakılır; sayfada "kaynakta doğrulanamadı" yazar. SUT'ta özel hükmü olmayan ilaçların rapor koşulu SUT eki EK-4/F'de olabilir; bu liste klasörde yok.
- Alan değerleri: `recete` [beyaz | kirmizi | yesil | mor | turuncu] (yalnız ilaçta); `odeme` true | false (+ `odemeNot`); `rapor` gerekmez | uzman-hekim | saglik-kurulu | kosullu; `raporUzman` ve `yazabilir` metin listesi (`raporUzman: []` yalnızca rapor gerekmezse); `sut` madde listesi, `sutUrl` ve `alinti` birlikte.
- `durum`, dolu alan sayısına göre `dogrulandi`, `kismen` ya da `dogrulanamadi` olmalıdır. Kaynaklar güncellenince üst düzey `checked` ve kayıtların `kontrol` tarihi yenilenir; sayfadaki "SUT sık değişir; son kontrol: …" uyarısı `checked`'ten gelir.
- `tools/validate.py` bu kuralları denetler; bağlantılar yalnızca mevzuat.gov.tr, resmigazete.gov.tr, sgk.gov.tr ve titck.gov.tr olabilir, `dosya` alanındaki kaynak dosyalar repoda bulunmalıdır.
- Durum (28.09.2026): 80 kayıt tüm alanlarıyla, 66 kayıt kısmen dolu; 8 kayıtta hiçbir alan doğrulanamadı.

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
