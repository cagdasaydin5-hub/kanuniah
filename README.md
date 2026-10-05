# kanuniah.tr

Trabzon Kanuni Eğitim ve Araştırma Hastanesi Aile Hekimliği Anabilim Dalı'nın bilgi portalı: rehberler ve mevzuat, haftanın makaleleri, klinik araçlar.

## Yapı

- Statik site: HTML + CSS + JS, sunucu tarafı kod ya da veritabanı yok.
- İçerik `data/` altındaki JSON dosyalarında:
  - `rehberler.json` – rehber ve mevzuat kaynakları
  - `temel-makaleler.json` – Makaleler sayfasındaki kalıcı kitaplık (konuya göre önemli eski çalışmalar)
  - `makaleler.json` – Haftanın makaleleri sayfası (her hafta `issues` dizisinin başına yeni sayı eklenir)
  - `meta.json` – son kontrol tarihi ve güncelleme günlüğü
  - `mamalar.json` – enteral/oral beslenme ürünleri kataloğu (alanlar aşağıda)
  - `inr-algoritma.json` – varfarin idame doz algoritmasının eşikleri (aşağıda)
  - `sut.json` – "Reçete ve rapor" aracının verisi (aşağıya bakın)
  - `etkilesim/` – ilaç etkileşimi aracının verisi (aşağıya bakın)
  - `araclar.json` – ana sayfa araması için araç dizini (**üretilir**, elle düzenlenmez; aşağıya bakın)
- Sayfa iskeletleri `tools/build_pages.py` ile üretilir (üst menü, alt bilgi, sitemap). Betik sonunda `tools/build_pwa.py`'yi de çalıştırır.
- `tools/validate.py` veri dosyalarını denetler; yayın akışı hatalı veriyi yayına almaz.
- `tools/check_links.py` rehberlerdeki bağlantıları denetler (bkz. [Bağlantı denetimi](#bağlantı-denetimi)).
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
| `tur` | Liste: `standart`, `yuksek-enerji`, `yuksek-protein`, `diyabetik`, `bobrek`, `lifli`, `peptit`, `immun` |
| `form` | `sivi` ya da `toz` |
| `yol` | `tup`, `oral` ya da `oral-tup`; sayfada belirtilmemişse `null` |
| `kcal_ml`, `protein_100ml`, `lif_100ml` | Kullanıma hazır ürün için (toz üründe standart sulandırmada) enerji kcal/mL, protein ve lif g/100 mL. Şişe başına verilen değerler 100 mL'ye çevrilir. Lif sayfada belirtilmemişse `null` (0 değil). |
| `osm`, `su_100ml` | İsteğe bağlı: ozmolarite (mOsm/L) ve su (mL/100 mL) |
| `ambalaj_ml` | Sıvı üründe şişe/paket hacmi; sayfada yoksa `null` |
| `ambalaj_g`, `olcek_g`, `olcek_ml` | Toz üründe kutu ağırlığı, bir ölçek (g) ve bir ölçekle hazırlanan hacim (mL) |
| `not` | İsteğe bağlı kısa açıklama (aroma farkı, özel içerik, hesaplama notu) |
| `kaynak` | Üreticinin resmi ürün sayfası (https; alan adı `validate.py`'deki listede olmalı) |
| `dogrulama` | Değerlerin kaynakta son kontrol edildiği tarih (YYYY-AA-GG) |

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

## Reçete ve rapor aracı

`assets/arac-sut.js` araçlar sayfasına bir kart ekler: etken madde ya da tıbbi malzeme aranınca reçete türü, SGK ödeme listesi (Ek-4/A), rapor gereği, raporu düzenleyecek uzman, raporla yazabilecek hekimler, SUT maddesi, metinden kısa alıntı ve kaynak tek kartta görünür. Veri `data/sut.json`'dadır.

- Kapsam: aile hekimliğinde sık kullanılan 150 etken madde (antihipertansif, antidiyabetik, statin, antikoagülan/antiagregan, KOAH/astım, antidepresan, antipsikotik, demans, osteoporoz, PPI, opioid/analjezik) ve 4 tıbbi malzeme raporu (hasta bezi, havalı yatak, oksijen konsantratörü, enteral ürün).
- Kaynaklar `tools/kaynak/sut/` klasöründedir (her dosyanın kaynağı ve tarihi o klasörün README'sinde). Başka site, özet ya da hafıza kullanılmaz.
  - **Reçete türü**: TİTCK SKRS e-reçete aktif ürün listesi; kaydın `atc` alanındaki ATC adlarına sahip ürünlerin "Reçete Türü" değerleri (birden fazla renk varsa hepsi). Aktif listede ürünü olmayan etken maddede `null`.
  - **SGK ödeme**: 29.08.2026 SUT paketindeki Ek-4/A + sonrasında yayımlanan iki değişiklik dosyası (2026/37 ve 25.09.2026 İGÖK); TİTCK ürünleri barkodla eşlenir, en az bir ürün Ek-4/A'da aktifse `true`. 29.08 ile 23.09 arasındaki haftalık SGK duyuruları klasörde olmadığından işlenmedi; bu `odemeNot`'ta yazar.
  - **Rapor, uzman, yazabilen hekim, madde**: önce `sut-guncel-2026-08-29.docx`; SUT'ta ilaca özel hüküm yoksa aynı paketteki EK-4/F (rapor ile verilen ilaçlar; SUT 4.1.8'e göre raporla tüm hekimler) ve EK-4/E (reçeteleme kuralları). Madde numaraları `sut` alanında `4.2.28.A-1`, `EK-4/F 51`, `EK-4/E 13-3` biçimindedir. `.doc` dosyaları LibreOffice ile docx'e çevrilerek, EK-4/F madde numaraları antiword çıktısından okunur. Tüm belgelerde üstü çizili (yürürlükten kalkmış) hükümler yok sayılır. Her kayıtta madde numarası (`sut`) ve metinden kısa alıntı (`alinti`) vardır; alıntılar RG değişiklik notları "(Ek:/Değişik:/Mülga: … Yürürlük: …)" çıkarılmış metinle birebir aynıdır, " … " ayrı parçaları ayırır. Etken madde SUT'ta adıyla değil sınıfıyla geçiyorsa (ör. SSRI, bifosfonat, analog insülin) eşleme `not` alanında yazar.
  - **Tıbbi malzeme**: SUT 3.3.34 (hasta bezi), 3.3.6/3.3.6.B (oksijen konsantratörü), 4.2.8.A (enteral ürün) ve EK-3/C listeleri. Havalı yatak kaynaklarda bulunamadı.
- Metinde bulunamayan alan `null` bırakılır; sayfada "kaynakta doğrulanamadı" yazar. SUT, EK-4/F ve EK-4/E'de hükmü bulunmayan ilaçlar (ör. çoğu ACE inhibitörü, KKB, beta bloker, PPI, GLP-1) için rapor alanları boştur; bu listelerde yer almamaları rapor gerekmediğine işaret edebilir, ancak metinde açıkça yazmadığından alan doldurulmaz.
- Alan değerleri: `recete` [beyaz | kirmizi | yesil | mor | turuncu] (yalnız ilaçta); `odeme` true | false (+ `odemeNot`); `rapor` gerekmez | uzman-hekim | saglik-kurulu | kosullu; `raporUzman` ve `yazabilir` metin listesi (`raporUzman: []` yalnızca rapor gerekmezse); `sut` madde listesi, `sutUrl` ve `alinti` birlikte.
- `durum`, dolu alan sayısına göre `dogrulandi`, `kismen` ya da `dogrulanamadi` olmalıdır. Kaynaklar güncellenince üst düzey `checked` ve kayıtların `kontrol` tarihi yenilenir; sayfadaki "SUT sık değişir; son kontrol: …" uyarısı `checked`'ten gelir.
- `tools/validate.py` bu kuralları denetler; bağlantılar yalnızca mevzuat.gov.tr, resmigazete.gov.tr, sgk.gov.tr ve titck.gov.tr olabilir, `dosya` alanındaki kaynak dosyalar repoda bulunmalıdır.
- Durum (28.09.2026): 94 kayıt tüm alanlarıyla, 54 kayıt kısmen dolu; 6 kayıtta hiçbir alan doğrulanamadı.

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
