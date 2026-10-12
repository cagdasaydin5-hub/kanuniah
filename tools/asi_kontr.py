"""Aşı kontrendikasyonu rehberi sayfasının gövdesi (build_pages.py içe aktarır)."""
CDC = "https://www.cdc.gov/vaccines/hcp/imz-best-practices/contraindications-precautions.html"

TABLO = [
 ("Td / DT", "—", "Önceki tetanoz toksoidli aşıdan sonraki 6 hafta içinde GBS; Arthus tipi aşırı duyarlılık öyküsü (son dozdan ≥10 yıl geçene dek ertele)"),
 ("DTaP", "Önceki DTP/DTaP dozundan sonraki 7 gün içinde başka nedene bağlanamayan ensefalopati", "İlerleyici nörolojik hastalık (infantil spazm, kontrolsüz epilepsi, ilerleyici ensefalopati; durum netleşip stabilize olana dek ertele); 6 hafta içinde GBS; Arthus öyküsü"),
 ("Tdap", "Önceki DTP/DTaP/Tdap dozundan sonraki 7 gün içinde başka nedene bağlanamayan ensefalopati", "İlerleyici veya stabil olmayan nörolojik hastalık, kontrolsüz nöbet; 6 hafta içinde GBS; Arthus öyküsü"),
 ("Hepatit A", "—", "—"),
 ("Hepatit B", "Maya aşırı duyarlılığı", "—"),
 ("Hib", "6 haftadan küçük bebek", "—"),
 ("HPV", "Maya dahil bileşen alerjisi", "Gebelikte önerilmez"),
 ("IPV", "—", "Gebelik"),
 ("İnfluenza – inaktif (IIV)", "Önceki grip aşısı veya bileşeninden sonra anafilaksi", "Önceki grip aşısından sonraki 6 hafta içinde GBS"),
 ("İnfluenza – rekombinant (RIV)", "RIV bileşenine anafilaksi", "6 hafta içinde GBS"),
 ("İnfluenza – canlı atenüe (LAIV)", "Gebelik; immünsüpresyon; aspleni; çocuk/ergende aspirin-salisilat; 2–4 yaşta son 12 ayda astım/hışıltı; aktif BOS sızıntısı; koklear implant; ağır immünsüprese kişiyi koruyucu ortamda bakan temaslılar; yakın zamanda grip antiviral ilacı (oseltamivir/zanamivir 48 saat, peramivir 5 gün, baloksavir 17 gün)", "6 hafta içinde GBS; ≥5 yaşta astım; gripten komplikasyon riskini artıran tıbbi durumlar"),
 ("MenACWY", "—", "Prematürite (MenACWY-CRM, 9 aydan küçük bebek)"),
 ("MenB", "—", "Gebelik; lateks duyarlılığı (MenB-4C)"),
 ("KKK (MMR)", "Gebelik; bilinen ağır immün yetmezlik (hematolojik/solid tümör, kemoterapi, konjenital immün yetmezlik, uzun süreli immünsüpresif tedavi, ağır immünsüprese HIV); birinci derece akrabada kalıtsal immün yetmezlik öyküsü (bağışıklık kanıtlanmadıysa)", "Son 11 ay içinde antikor içeren kan ürünü (aralık ürüne göre değişir); trombositopeni/trombositopenik purpura öyküsü; TCT veya IGRA gerekliliği; aktif TB şüphesi (MMR ertelenir)"),
 ("Suçiçeği", "Gebelik; bilinen ağır immün yetmezlik (MMR ile aynı); birinci derece akrabada kalıtsal immün yetmezlik öyküsü", "Son 11 ay içinde antikor içeren kan ürünü; aşıdan 24 saat önce asiklovir/famsiklovir/valasiklovir (aşı sonrası 14 gün kullanmaktan kaçın); aspirin veya aspirin içeren ürün"),
 ("Zoster", "—", "—"),
 ("Pnömokok konjuge (PCV)", "Önceki PCV veya difteri toksoidi içeren aşıdan/bileşeninden sonra anafilaksi", "—"),
 ("PPSV23", "—", "—"),
 ("Rotavirüs", "SCID; invajinasyon öyküsü", "SCID dışı immün yetmezlik; kronik gastrointestinal hastalık; spina bifida veya mesane ekstrofisi (RV1, lateks nedeniyle)"),
]
YANLIS_GENEL = ["Hafif akut hastalık, ateşli olsa da", "Önceden fizik muayene yapılmamış, iyi görünümlü kişi", "Antimikrobiyal tedavi (oral tifo Ty21a, bazı antiviraller suçiçeği aşısı ve LAIV hariç)", "Nekahet dönemi", "Prematürite (hepatit B aşısında bazı durumlar istisna)", "Enfeksiyon hastalığına yakın zamanda maruziyet", "Penisilin veya aşı dışı alerjiler, ailede alerji, alerjen immünoterapisi", "GBS öyküsü (istisna: grip veya tetanoz toksoidli aşıdan sonraki 6 hafta içindeki GBS = önlem)"]
YANLIS = [
 ("DTaP / Tdap", "Önceki dozdan sonra 48 saat içinde ateş (Tdap için ≥40,5 °C), HHE, ≥3 saat inatçı ağlama; ≤3 gün içinde nöbet; ailede nöbet/SIDS; stabil nörolojik durum (serebral palsi, iyi kontrollü nöbet, gelişimsel gerilik); Tdap: Arthus olmayan yaygın uzuv şişliği, brakiyal nörit, anafilaktik olmayan lateks alerjisi, emzirme, immünsüpresyon"),
 ("Hepatit B", "Gebelik; otoimmün hastalık (SLE, RA)"),
 ("HPV", "İmmünsüpresyon; önceki anormal Pap testi; bilinen HPV enfeksiyonu; emzirme; genital siğil öyküsü"),
 ("İnaktif influenza", "Ağır olmayan (örn. kontakt) lateks, timerosal veya yumurta alerjisi; warfarin veya aminofilin kullanımı"),
 ("IPV", "Önceden ≥1 doz oral polio aşısı almış olmak"),
 ("LAIV", "Kronik hastalığı/immün yetmezliği olan hastalara bakan sağlık çalışanı veya temaslıları (koruyucu ortamdaki ağır immünsüprese hasta istisna); emzirme"),
 ("KKK (MMR)", "Pozitif TCT; aynı gün TCT/IGRA; emzirme; alıcının annesinin veya ev içi temaslının gebeliği; alıcının doğurganlık çağında kadın olması; ev içinde immün yetmezlikli kişi; asemptomatik/hafif semptomlu HIV; yumurta alerjisi"),
 ("Suçiçeği", "Ev içi temaslının gebeliği; ev içinde immün yetmezlikli kişi (aşı sonrası 7–25. günlerde döküntü çıkarsa döküntü geçene dek immünsüprese kişilerle doğrudan temastan kaçın); asemptomatik/hafif semptomlu HIV; hümoral immün yetmezlik"),
 ("Zoster", "Düşük doz metotreksat (≤0,4 mg/kg/hafta), azatiyoprin (≤3 mg/kg/gün) veya 6-MP (≤1,5 mg/kg/gün); kronik hastalığı olan hastalara bakan sağlık çalışanı/temaslılar"),
 ("PPSV23", "İnvaziv pnömokok hastalığı veya pnömoni öyküsü"),
 ("Rotavirüs", "Prematürite; ev içinde immünsüprese veya gebe kişi"),
]
ENF = [
 ("Hafif ÜSYE, hafif ishal, otitis media (ateşli/ateşsiz)", "Aşı yapılır"),
 ("Orta veya ağır akut hastalık", "Ertele; düzelince aşıla (tanısal karışıklığı önlemek için)"),
 ("Antibiyotik kullanımı, nekahet dönemi", "Aşı yapılır"),
 ("Enfeksiyona yakın zamanda maruziyet; hastalıktan iyileşme", "Genelde engel değil"),
 ("Aktif TB şüphesi", "MMR ertelenir"),
 ("Ağır immünsüpresyonla giden enfeksiyon (örn. ağır immünsüprese HIV)", "Canlı aşı yapılmaz; HIV'de CD4 eşiklerine göre karar (dipnot 2)"),
 ("Asemptomatik/hafif semptomlu HIV", "MMR ve suçiçeği aşısı yapılabilir (eşiklere göre)"),
 ("Antikor içeren kan ürünü (≤11 ay)", "MMR ve suçiçeği için önlem; aralık ürüne göre değişir"),
 ("Yakın zamanda antiviral kullanımı", "Suçiçeği aşısı ve LAIV için bekleme süreleri geçerli"),
]
YASLI = [
 ("Pnömokok (PCV, PPSV23)", "Önceki doz/bileşenden sonra anafilaksi (PCV'de difteri toksoidli aşılar dahil)", "Orta/ağır akut hastalık", "Önceki pnömokok hastalığı veya pnömoni (PPSV23)"),
 ("İnfluenza (IIV, RIV)", "Önceki grip aşısı/bileşenden sonra anafilaksi", "6 hafta içinde GBS; orta/ağır akut hastalık", "Ağır olmayan yumurta, lateks, timerosal alerjisi; warfarin/aminofilin"),
 ("Zoster", "Önceki doz/bileşenden sonra ciddi alerjik reaksiyon", "Orta/ağır akut hastalık", "Düşük doz metotreksat, azatiyoprin, 6-MP"),
 ("Td/Tdap", "Önceki doz/bileşenden sonra anafilaksi", "6 hafta içinde GBS; Arthus öyküsü (10 yıl kuralı); orta/ağır akut hastalık", "Brakiyal nörit; stabil nörolojik hastalık; immünsüpresyon; emzirme"),
]

def _t(rows, heads):
    h = "".join("<th>%s</th>" % x for x in heads)
    b = "".join("<tr>" + "".join("<td>%s</td>" % c for c in r) + "</tr>" for r in rows)
    return '<div class="tablewrap"><table class="asi"><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (h, b)

def body():
    return """<div class="wrap">
  <div class="page-head">
    <div class="eyebrow">Aşı · Hızlı başvuru</div>
    <h1>Aşı kontrendikasyonları ve önlemleri</h1>
    <p class="lede">CDC/ACIP “General Best Practice Guidelines for Immunization” (kontrendikasyon ve önlem tabloları; CDC sayfası son güncelleme 25 Temmuz 2024) özetidir.</p>
  </div>
  <div class="prose">
    <div class="callout"><b>Türkiye'de uygulama.</b> Bu sayfa ABD (ACIP) önerilerinin Türkçe özetidir; Türkiye'de uygulama Sağlık Bakanlığı genelgeleri ve ürün prospektüsleri esas alınarak yapılır, çelişkide bunlar geçerlidir. Bakanlığın güncel genelgesi bu sayfaya henüz işlenmemiştir. Türkiye için okunabilen kaynak: Türk Tabipleri Birliği, <i>Birinci Basamak Sağlık Çalışanları İçin Aşı Rehberi</i> (2019): ateş 38,5–39 °C'ye kadar tek başına aşı için engel sayılmaz; yumurta alerjisi KKK için kontrendikasyon değildir; canlı aşılar gebelikte ve immünsüpresyonda kontrendikedir; kan ürünü sonrası canlı aşı için bekleme süresi gerekir. Aşı Portalı'ndaki güncel talimatla karşılaştırın.</div>

    <h2>1. Temel kavramlar</h2>
    <ul>
      <li><b>Kontrendikasyon:</b> ciddi advers reaksiyon riskini artıran durum; aşı yapılmaz. Çoğu geçicidir.</li>
      <li><b>Önlem (precaution):</b> ciddi reaksiyon riskini artırabilecek, tanıyı karıştırabilecek veya yanıtı azaltabilecek durum; genelde ertelenir, fayda riski aşıyorsa yapılabilir.</li>
      <li>Her dozdan önce kontrendikasyon ve önlem taraması yapılır.</li>
      <li>Orta/ağır akut hastalık (ateşli ya da ateşsiz) tüm aşılarda önlemdir; hafif hastalıkta aşı güvenlidir.</li>
      <li>Görünüşte sağlıklı kişide rutin muayene veya ateş ölçümü ön koşul değildir. Planlı ameliyat/yatış tek başına kontrendikasyon değildir.</li>
      <li><b>Tüm aşılar için ortak kontrendikasyon:</b> önceki dozdan veya bileşenden sonra ciddi alerjik reaksiyon (anafilaksi).</li>
      <li>Ağır immünsüprese kişiye canlı aşı genelde yapılmaz; gebelikte canlı atenüe virüs aşıları genelde yapılmaz.</li>
    </ul>

    <h2>2. Aşıya göre kontrendikasyon ve önlemler</h2>
    <p>Anafilaksi tüm satırlarda kontrendikasyondur ve tekrar yazılmamıştır; orta/ağır akut hastalık tüm aşılarda önlemdir.</p>
    """ + _t([(a, b, c) for a, b, c in TABLO], ["Aşı", "Ek kontrendikasyonlar", "Önlemler"]) + """
    <p class="method"><b>Dipnotlar (CDC).</b> (1) Yüksek doz steroid: ≥2 hafta günde 20 mg veya 2 mg/kg prednizon eşdeğeri. (2) HIV'li çocukta suçiçeği aşısı CD4 ≥%15 ise, KKK ≥12 aylıkta ve ağır immünsüpresyon yoksa yapılır (≤5 yaşta CD4 ≥%15 en az 6 ay; >5 yaşta CD4 ≥%15 ve ≥200/mm³ en az 6 ay). (3) KKK ve suçiçeği aynı gün yapılabilir; aynı gün yapılmazsa en az 28 gün ara. (4) KKK aynı gün TCT/IGRA ile yapılabilir; test sonraya kalırsa aşıdan sonra ≥4 hafta ertelenir. (5) Suçiçeği aşısı sonrası aspirinden üretici 6 hafta kaçınmayı önerir (Reye sendromu). (6) Zoster için CDC tablosunda yalnızca anafilaksi ve orta/ağır hastalık yazılıdır; rekombinant zosterde ürün prospektüsüne bakın. Dengue ve MPSV4 kapsam dışıdır.</p>

    <h2>3. Yanlış kontrendikasyonlar (aşı yapılabilir)</h2>
    <h3>Tüm aşılar için</h3>
    <ul>""" + "".join("<li>%s</li>" % x for x in YANLIS_GENEL) + """</ul>
    <h3>Aşıya göre</h3>
    """ + _t(YANLIS, ["Aşı", "Engel olmayan durumlar"]) + """

    <h2>4. Enfeksiyon durumlarında karar</h2>
    """ + _t(ENF, ["Durum", "Karar"]) + """
    <p>CDC “hafif” ve “orta/ağır” için sayısal ateş eşiği vermez; karar klinik yargıyla verilir. Türkiye'de TTB 2019 rehberi ateşte 38,5–39 °C eşiğini anar (yukarıdaki kutu).</p>

    <h2>5. Yaşlı erişkin</h2>
    <p>Kontrendikasyonlar yaşa göre değil aşıya göre belirlenir.</p>
    """ + _t(YASLI, ["Aşı", "Kontrendikasyon", "Önlem", "Engel olmayan"]) + """
    <ul>
      <li>KOAH, kalp yetmezliği, diyabet gibi kronik hastalıklar kontrendikasyon veya önlem değildir; bu hastalar öncelikli gruptadır.</li>
      <li>İmmünsüpresif tedavi (steroid, biyolojik ajan vb.) alan hastada canlı aşılar kontrendikedir; inaktif aşılarda kısıt yoktur, yanıt azalabilir.</li>
    </ul>

    <h2>Kaynaklar</h2>
    <ul>
      <li>CDC. Contraindications and Precautions. General Best Practice Guidelines for Immunization (ACIP), Tablo 4-1 ve 4-2. <a href="%s" rel="noopener">cdc.gov</a></li>
      <li>Türk Tabipleri Birliği. Birinci Basamak Sağlık Çalışanları İçin Aşı Rehberi, 2019.</li>
      <li>T.C. Sağlık Bakanlığı. Aşı Portalı: <a href="https://asi.saglik.gov.tr" rel="noopener">asi.saglik.gov.tr</a> (güncel takvim ve talimatlar).</li>
    </ul>
    <p class="method">Hızlı başvuru özetidir; tanı ve uygulama kararı hekime aittir. Hazırlanma: 12 Ekim 2026 Pazartesi.</p>
  </div>
</div>
""" % CDC
