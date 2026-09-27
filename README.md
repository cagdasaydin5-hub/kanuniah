# kanuniah.tr

Kanuni Eğitim ve Araştırma Hastanesi Aile Hekimliği Kliniği'nin bilgi portalı: rehberler ve mevzuat, haftanın makaleleri, klinik araçlar.

## Yapı

- Statik site: HTML + CSS + JS, sunucu tarafı kod ya da veritabanı yok.
- İçerik `data/` altındaki JSON dosyalarında:
  - `rehberler.json` – rehber ve mevzuat kaynakları
  - `makaleler.json` – haftanın makaleleri (her hafta `issues` dizisinin başına yeni sayı eklenir)
  - `meta.json` – son kontrol tarihi ve güncelleme günlüğü
  - `etkilesim/` – ilaç etkileşimi aracının verisi (aşağıya bakın)
- Sayfa iskeletleri `tools/build_pages.py` ile üretilir (üst menü, alt bilgi, sitemap).
- `tools/validate.py` veri dosyalarını denetler; yayın akışı hatalı veriyi yayına almaz.

## İlaç etkileşimi aracı

Araçlar sayfasındaki "İlaç etkileşimi denetleyici" kartı `assets/arac-etkilesim.js` ile çalışır; kartı kendisi ekler,
`assets/araclar.js`'e bağımlı değildir. Kullanıcı 2–15 ilaç girer; tüm ikili etkileşimler DDInter ciddiyet düzeyine
(Major/Moderate/Minor) göre listelenir. Varfarin, DOAK, QT uzatan ve serotonerjik kombinasyonlar için üstte ayrı uyarı kutusu çıkar.

- **Veri kaynağı:** [DDInter](https://ddinter.scbdd.com/) indirme dosyaları, lisans **CC BY-NC-SA 4.0**. Atıf kartın altında yazılıdır;
  bu klasördeki türetilmiş veri de aynı lisansla paylaşılır. Sitede ticari kullanım yoktur.
  Şu anki veri, resmî sayfaya derleme ortamından erişilemediği için DDInter'in sekiz indirme dosyasının GitHub'daki bir kopyasından
  (`hitesh19426/ddinter-main`, 2024) üretildi; dosyaların SHA-256 özetleri `ilaclar.json` içindeki `meta.dosyalar`da. Resmî
  indirme sayfasındaki dosyalarla yeniden üretilmesi önerilir.
- **Eşleme tablosu:** `tools/etkilesim/ilaclar.tsv` (Türkçe etken madde → DDInter İngilizce adı, diğer adlar, etiketler).
  Etiketler (`vka`, `doak`, `kanama`, `nsaii`, `qt`, `sero`, `mao`, `3a4g`, `3a4`, `ind`, `statin3a4`, `raas`, `k`, `diur`) uyarı
  kutularını ve sınıf notlarını belirler. QT etiketi CredibleMeds "bilinen TdP riski" listesine dayanır.
- **Üretilen dosyalar:** `data/etkilesim/ilaclar.json` (kart açılınca yüklenir, ~45 KB) ve `data/etkilesim/ilac/<id>.json`
  (yalnızca seçilen ilaçlar yüklenir). Elle düzenlenmez, yeniden üretilir:
  ```
  python3 tools/etkilesim/derle.py <DDInter CSV klasörü>
  node --test tools/etkilesim/test_etkilesim.js
  ```
- **Mekanizma ve öneri:** DDInter indirme dosyalarında yalnızca ciddiyet düzeyi vardır. Kartta mekanizma/öneri olarak görünen metinler
  kliniğin eklediği sınıf notlarıdır (`KURAL` dizisi); her DDInter kaydında ilgili ilacın DDInter sayfasına bağlantı verilir.
- **Bilinen kapsam sınırı:** DDInter indirme dosyaları yalnızca A, B, D, H, L, P, R, V ATC gruplarını kapsar. İki ilacın da bu grupların
  dışında kaldığı çiftler (ör. SSRI + tramadol, ACEİ + spironolakton) veride yoktur; kart bunları "kontrol edilemeyen çiftler" olarak
  ayrıca gösterir, sınıf kuralına uyanlar için not düşer. Listedeki 29 ilaç (ör. dabigatran, gliklazid, metamizol) DDInter verisinde
  hiç yoktur; bunlar için yalnızca sınıf uyarıları çalışır.
- Yeni ilaç eklemek: `ilaclar.tsv`'ye satır ekleyin, `derle.py`'yi çalıştırın, testlerin geçtiğini görün. Testler bilinen eşlemeleri,
  Türkçe ad ile İngilizce adın ses uyumunu ve bilinen etkileşimleri (varfarin + NSAİİ, SSRI + tramadol, klaritromisin + statin) denetler.

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
