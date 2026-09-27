# kanuniah.tr

Kanuni Eğitim ve Araştırma Hastanesi Aile Hekimliği Kliniği'nin bilgi portalı: rehberler ve mevzuat, haftanın makaleleri, klinik araçlar.

## Yapı

- Statik site: HTML + CSS + JS, sunucu tarafı kod ya da veritabanı yok.
- İçerik `data/` altındaki JSON dosyalarında:
  - `rehberler.json` – rehber ve mevzuat kaynakları
  - `makaleler.json` – haftanın makaleleri (her hafta `issues` dizisinin başına yeni sayı eklenir)
  - `meta.json` – son kontrol tarihi ve güncelleme günlüğü
  - `etkilesim/` – ilaç etkileşimi aracının verisi (aşağıya bakın)
  - `araclar.json` – ana sayfa araması için araç dizini (**üretilir**, elle düzenlenmez; aşağıya bakın)
- Sayfa iskeletleri `tools/build_pages.py` ile üretilir (üst menü, alt bilgi, sitemap). Betik sonunda `tools/build_pwa.py`'yi de çalıştırır.
- `tools/validate.py` veri dosyalarını denetler; yayın akışı hatalı veriyi yayına almaz.
- `tools/check_links.py` rehberlerdeki bağlantıları denetler (bkz. [Bağlantı denetimi](#bağlantı-denetimi)).

## Ana sayfa araması

Ana sayfadaki arama kutusu rehberleri (mevzuat dahil), tüm sayıların makalelerini ve araçları birlikte arar.
Araçlarda adı, kısa açıklaması, anahtar kelimeleri (`kw`) ve grup adı taranır. Başlığında eşleşen kayıtlar önce gelir;
Enter ilk sonuca gider.

Araç tanımları `assets/araclar.js` içinde durduğu için ana sayfa bunları `data/araclar.json`'dan okur. Bu dosyayı
`tools/build_pwa.py`, `assets/araclar.js` ve `assets/arac-*.js` dosyalarındaki `id`, `g`, `t`, `d`, `kw` alanlarından
çıkarır (JS dosyaları değiştirilmez). Yeni bir `arac-*.js` eklerken araç nesnelerinde bu alanları aynı adlarla kullanın.

## Çevrimdışı çalışma (PWA)

Site telefona ya da bilgisayara uygulama olarak kurulabilir (Android/Chrome: menü → *Uygulamayı yükle*;
iPhone/Safari: Paylaş → *Ana Ekrana Ekle*) ve bir kez açıldıktan sonra internetsiz de çalışır.

- `sw.js` (service worker) **üretilen** bir dosyadır: `tools/build_pwa.py` tüm `.html` sayfalarını, `data/*.json`
  dosyalarını ve `assets/` altındaki her dosyayı önbellek listesine yazar. Sonradan eklenen `assets/arac-*.js`
  dosyaları da kendiliğinden listeye girer; listede olmayan bir varlık istenirse ilk açılışta önbelleğe eklenir.
- Sürüm numarası bu dosyaların içeriğinden hesaplanır. Bir rehber, makale ya da araç değişince `sw.js` değişir,
  tarayıcı yeni sürümü kurar ve eski önbelleği siler.
- Sayfalar ve `data/*.json` önce ağdan istenir (çevrimiçiyken hep güncel), ağ yoksa önbellekten verilir.
  CSS/JS/görseller önbellekten verilir; Google Fonts arka planda tazelenir.
- Yayın akışı her yüklemeden önce `python3 tools/build_pwa.py` çalıştırır; bu yüzden `sw.js` hiçbir zaman
  yayındaki veriden geri kalmaz. Yerelde veri düzenledikten sonra da çalıştırmanız, repodaki `sw.js`'i güncel tutar.
- Ikonlar (`assets/icon-*.png`, `assets/apple-touch-icon.png`) `assets/emblem.svg`'den üretilmiştir;
  amblem değişirse yeniden üretilmeleri gerekir.
- Service worker yalnızca HTTPS'te ya da `localhost`'ta çalışır. Yerel denemede önbellek kafa karıştırırsa
  tarayıcının geliştirici araçlarında *Application → Service workers → Unregister* yapın.

## Bağlantı denetimi

`.github/workflows/link-check.yml` her gece 04:17'de (TSİ; elle de *Actions → Bağlantı denetimi → Run workflow*)
`data/rehberler.json`'daki tüm ana ve ek bağlantıları (`url`, `alt[].url`, arşiv kayıtları dahil) dener:

- **Kırık**: 404, 410 ve diğer kesin 4xx hataları ya da çözülemeyen alan adı. Bunlar `kirik-link` etiketli
  **tek bir issue**'da listelenir; issue yoksa açılır, varsa gövdesi güncellenir, kırık kalmayınca kapatılır.
- **Doğrulanamadı**: zaman aşımı, 401/403/429, 5xx, bağlantı ya da TLS hatası. Türk devlet siteleri yurt dışı
  IP'lerini (GitHub sunucuları) engelleyebildiği için bunlar kırık sayılmaz; aynı issue'da ayrı bölümde ve
  iş akışı özetinde listelenir. Gerekirse Türkiye'den elle kontrol edin.

Her bağlantı başarısız olursa 3 sn sonra bir kez daha denenir. Yerelde: `python tools/check_links.py --out rapor.md`.

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
  Etiketler (`vka`, `doak`, `kanama`, `nsaii`, `qt`, `sero`, `mao`, `3a4g`, `3a4`, `ind`, `pgpg`, `1a2g`, `statin3a4`, `raas`, `k`,
  `diur`, `tiyazid`, `loop`, `pde5`, `nitrat`) uyarı
  kutularını ve sınıf notlarını belirler. QT etiketi CredibleMeds "bilinen TdP riski" listesine dayanır.
- **Üretilen dosyalar:** `data/etkilesim/ilaclar.json` (kart açılınca yüklenir, ~45 KB) ve `data/etkilesim/ilac/<id>.json`
  (yalnızca seçilen ilaçlar yüklenir). Elle düzenlenmez, yeniden üretilir:
  ```
  python3 tools/etkilesim/derle.py <DDInter CSV klasörü>
  node --test tools/etkilesim/test_etkilesim.js
  ```
- **Mekanizma ve öneri:** DDInter indirme dosyalarında yalnızca ciddiyet düzeyi vardır. Kartta mekanizma/öneri olarak görünen metinler
  kliniğin eklediği sınıf notlarıdır (`KURAL` dizisi); her DDInter kaydında ilgili ilacın DDInter sayfasına bağlantı verilir.
- **Ciddi sınıf kuralları (`CIDDI` dizisi):** klinik incelemede DDInter verisinde eksik ya da düşük düzeyde bulunan çiftler, DDInter
  düzeyinden bağımsız olarak "Ciddi" grubunda ve kaynak künyesiyle (PubMed) gösterilir: PDE5 inhibitörü + nitrat (kontrendike),
  tizanidin + siprofloksasin/fluvoksamin (kontrendike), lityum + ACEİ/ARB/tiyazid/kıvrım diüretiği/NSAİİ, digoksin + amiodaron/
  verapamil/klaritromisin/dronedaron, kolşisin + güçlü CYP3A4/P-gp inhibitörleri. Metformin seçildiğinde (tek başına da) eGFR < 30
  kontrendikasyonu için bilgi kutusu çıkar (`BILGI`).
- **Bilinen kapsam sınırı:** DDInter indirme dosyaları yalnızca A, B, D, H, L, P, R, V ATC gruplarını kapsar. İki ilacın da bu grupların
  dışında kaldığı çiftler (ör. SSRI + tramadol, ACEİ + spironolakton) veride yoktur; kart bunları "kontrol edilemeyen çiftler" olarak
  ayrıca gösterir, sınıf kuralına uyanlar için not düşer. Listedeki 29 ilaç (ör. dabigatran, gliklazid, metamizol) DDInter verisinde
  hiç yoktur; bunlar için yalnızca sınıf uyarıları çalışır.
- Yeni ilaç eklemek: `ilaclar.tsv`'ye satır ekleyin, `derle.py`'yi çalıştırın, testlerin geçtiğini görün. Testler bilinen eşlemeleri,
  Türkçe ad ile İngilizce adın ses uyumunu, bilinen etkileşimleri (varfarin + NSAİİ, SSRI + tramadol, klaritromisin + statin) ve
  her ciddi sınıf kuralını denetler.

## Yerelde açmak

```
python -m http.server 8000
```
Tarayıcıda `http://localhost:8000`.

## Yayın

`main` dalına her gönderimde `.github/workflows/deploy.yml` önce `tools/build_pwa.py` ile araç dizinini ve
service worker'ı üretir, veriyi denetler, sonra siteyi FTP ile hostinge yükler.
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
