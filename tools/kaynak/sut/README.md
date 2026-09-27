# SUT / reçete aracı için resmî kaynaklar

Bu klasördeki dosyalar resmî kurum sitelerinden, Türkiye IP'siyle **28 Eylül 2026** tarihinde indirilmiştir
(bulut ortamları bu sitelere erişemediği için repoya konmuştur). `tools/` klasörü sunucuya yüklenmez.

| Dosya | Kaynak | Açıklama |
|---|---|---|
| `sut-guncel-2026-08-29.docx` | SGK duyurusu "29/08/2026 SUT Değişiklik Tebliği İşlenmiş Güncel 2013 SUT" – https://www.sgk.gov.tr/duyuru/detay/29082026-SUT-Degisiklik-Tebligi-Islenmis-Guncel-2013-SUT-2026-08-31-03-06-04 | SUT'un değişiklikleri işlenmiş güncel tam metni (4.2 ilaç kullanım ilkeleri, rapor kuralları, 3.x tıbbi malzeme maddeleri). Birincil metin budur. |
| `ek-3c-ayakta-tedavi-tibbi-malzeme.xls`, `ek-3c-4-tibbi-sarf-malzeme.xls`, `ek-3c-5-ozel-hallerde-tibbi-malzeme.xls` | Aynı SGK paketi (EK-3 listeleri) | Ayakta tedavide karşılanan tıbbi malzemeler (hasta bezi, havalı yatak, oksijen konsantratörü vb. için). |
| `titck-skrs-erecete-ilac-listesi-2026-09-22.xlsx` | TİTCK – SKRS E-Reçete İlaç ve Diğer Farmasötik Ürünler Listesi, https://www.titck.gov.tr/dinamikmodul/43 (22.09.2026 sürümü) | Her ürün için ATC kodu, ATC adı (etken madde) ve **Reçete Türü** (Normal / Kırmızı / Yeşil / Mor / Turuncu). Reçete rengi buradan alınmalı. |
| `sgk-ek-4a-bedeli-odenecek-ilaclar-2026-04-08.xlsx` | SGK – 08.04.2026 tarihli 33218 sayılı RG SUT değişikliği eki (Ek-1 Ek-4/A) | Bedeli Ödenecek İlaçlar Listesi (tam liste, 08.04.2026). |
| `sgk-ek-4a-degisiklik-2026-09-23-duyuru-2026-37.xlsx` | SGK – Bedeli Ödenecek İlaçlar Listesinde Yapılan Düzenlemeler Hakkında Duyuru 2026/37 | Ek-4/A'daki son değişiklikler (tam liste değil). |
| `sgk-ek-4a-degisiklik-2026-09-25-igok.xlsx` | SGK – 2026 Yılı 2. Olağanüstü İlaç Geri Ödeme Komisyonu kararına istinaden duyuru (25.09.2026) | Ek-4/A'ya son eklemeler (tam liste değil). |
| `sut-degisiklik-teblig-2026-04-08.docx` | Aynı 08.04.2026 duyurusu | Değişiklik tebliği metni. |

Notlar:
- Ek-4/A tam listesi 08.04.2026 tarihlidir; sonraki haftalık SGK duyurularıyla değişmiş olabilir. Araçta "SGK listesinde" bilgisi bu tarihle birlikte gösterilmeli.
- Rapor/uzman/yazabilir hekim bilgisi yalnızca `sut-guncel-2026-08-29.docx` metninden alınmalı; ilgili madde numarası (ör. 4.2.x) kayda yazılmalı.
