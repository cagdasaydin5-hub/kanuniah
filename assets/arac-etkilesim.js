/* İlaç etkileşimi aracı. Veri: DDInter (https://ddinter.scbdd.com/, CC BY-NC-SA 4.0).
   Araçlar sayfasına kendi kartını ekler; veri kart ilk açıldığında, ilaç dosyaları ilaç seçildikçe yüklenir.
   Girilen ilaçlar hiçbir yere gönderilmez ve saklanmaz. */
(function () {
  "use strict";

  var VERI = "data/etkilesim/";
  var EN_AZ = 2, EN_COK = 15;
  var DUZEY = ["Major", "Moderate", "Minor", "Unknown"];
  var DUZEY_AD = { Major: "Ciddi (Major)", Moderate: "Orta (Moderate)", Minor: "Hafif (Minor)", Unknown: "Düzeyi belirtilmemiş" };

  /* ---------- yardımcılar ---------- */
  function fold(s) {
    return String(s || "").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
      .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }
  function has(d, t) { return d.e.indexOf(t) >= 0; }
  function adlar(list) { return list.map(function (d) { return d.ad; }).join(", "); }

  /* ---------- ilaç arama ve eşleme ---------- */
  function indeksle(ilaclar) {
    var byId = {};
    ilaclar.forEach(function (d) {
      byId[d.id] = d;
      d._adlar = [d.ad].concat(d.diger, d.dd).map(fold).filter(Boolean);
    });
    return byId;
  }

  /* Yazılan metne uyan ilaçlar: tam eşleşme > ad başı > kelime başı > içerir. */
  function ara(ilaclar, q, n) {
    q = fold(q); if (!q) return [];
    var sc = [];
    ilaclar.forEach(function (d) {
      var best = 0;
      d._adlar.forEach(function (a, i) {
        var s = a === q ? 4 : a.indexOf(q) === 0 ? 3 : (" " + a).indexOf(" " + q) >= 0 ? 2 : a.indexOf(q) >= 0 ? 1 : 0;
        if (s && i === 0) s += 0.5; // Türkçe ad önce
        if (s > best) best = s;
      });
      if (best) sc.push([best, d]);
    });
    sc.sort(function (a, b) { return b[0] - a[0] || a[1].ad.localeCompare(b[1].ad, "tr"); });
    return sc.slice(0, n || 8).map(function (x) { return x[1]; });
  }

  /* Tek bir adı kesin olarak çözer (Türkçe ad, diğer ad, DDInter İngilizce adı ya da id). */
  function coz(ilaclar, q) {
    var f = fold(q); if (!f) return null;
    for (var i = 0; i < ilaclar.length; i++) {
      if (ilaclar[i].id === q || ilaclar[i]._adlar.indexOf(f) >= 0) return ilaclar[i];
    }
    var r = ara(ilaclar, q, 2);
    return r.length === 1 ? r[0] : null;
  }

  /* ---------- sınıf kuralları (DDInter dışı, kliniğin eklediği kısa notlar) ---------- */
  var ANTIKOAG = function (d) { return has(d, "vka") || has(d, "doak"); };
  var KURAL = [
    { t: function (a, b) { return ANTIKOAG(a) && (ANTIKOAG(b) || has(b, "kanama")); },
      m: "Antitrombotik etkiler toplanır; NSAİİ ve SSRI/SNRI ayrıca trombosit işlevini ve mide mukozasını etkiler.",
      o: "Birlikte kullanım gerçekten gerekli mi gözden geçirin. Ağrıda NSAİİ yerine parasetamol tercih edin; kombinasyon sürecekse mide koruması (PPI) ve kanama belirtileri konusunda hasta eğitimi. Varfarinde INR'yi yakın izleyin." },
    { t: function (a, b) { return !ANTIKOAG(a) && !ANTIKOAG(b) && has(a, "kanama") && has(b, "kanama") && !has(a, "sero") && !(has(a, "nsaii") && has(b, "nsaii")); },
      m: "Kanama, özellikle gastrointestinal kanama riski artar (trombosit işlevi ve mide mukozası birlikte etkilenir).",
      o: "Kombinasyonun gerekçesini gözden geçirin. 65 yaş üstü, peptik ülser öyküsü ya da steroid kullanımında PPI ile mide koruması düşünün; NSAİİ'yi en kısa süre ve en düşük dozda kullanın." },
    { t: function (a, b) { return has(a, "nsaii") && has(b, "nsaii"); },
      m: "İki NSAİİ (asetilsalisilik asit dahil) birlikte: yan etkiler toplanır, ek analjezik yarar yoktur; ibuprofen düşük doz aspirinin kardiyoprotektif etkisini azaltabilir.",
      o: "İki NSAİİ'yi birlikte kullanmayın. Düşük doz aspirin kullanan hastada gerekiyorsa ibuprofeni aspirinden en az birkaç saat sonra verin ya da başka analjezik seçin." },
    { t: function (a, b) { return has(a, "sero") && has(b, "sero"); },
      m: "Serotonerjik etkiler toplanır; serotonin sendromu riski.",
      o: "Kombinasyon gerekli değilse kaçının; gerekliyse düşük dozla başlayıp yavaş artırın. Ajitasyon, tremor, klonus, terleme, ateş ve ishal gibi belirtiler için hastayı uyarın." },
    { t: function (a, b) { return has(a, "mao") && has(b, "sero"); },
      m: "MAO inhibitörü ile serotonerjik ilaç: ağır serotonin sendromu riski.",
      o: "Genellikle kontrendikedir. Geçişlerde KÜB'deki arınma sürelerine uyun (ör. fluoksetin sonrası uzun ara gerekir)." },
    { t: function (a, b) { return has(a, "qt") && has(b, "qt"); },
      m: "İki ilaç da QT aralığını uzatır (CredibleMeds: bilinen torsades de pointes riski); etki toplanabilir.",
      o: "Mümkünse QT'yi uzatmayan bir alternatif seçin. Birlikte kullanılacaksa başlangıçta ve doz artışında EKG; potasyum ve magnezyumu düzeltin. Yaşlılık, kadın cinsiyet, bradikardi, kalp yetersizliği ve diüretik kullanımı riski artırır." },
    { t: function (a, b) { return has(a, "doak") && (has(b, "3a4g") || has(b, "3a4")); },
      m: "CYP3A4 ve/veya P-glikoprotein inhibisyonu: DOAK kan düzeyi ve kanama riski artar.",
      o: "Güçlü inhibitörlerle (ör. ketokonazol, itrakonazol, vorikonazol, dronedaron) birçok DOAK'ın birlikte kullanımı önerilmez; orta düzey inhibitörlerde doz ve böbrek fonksiyonuyla birlikte değerlendirin. İlgili DOAK'ın KÜB'üne ve EHRA DOAK rehberinin etkileşim tablosuna bakın." },
    { t: function (a, b) { return ANTIKOAG(a) && has(b, "ind"); },
      m: "Güçlü CYP3A4/P-gp indüksiyonu: antikoagülan düzeyi düşer, tromboemboli riski artar.",
      o: "DOAK'larla birlikte kullanımından kaçının. Varfarinde başlarken ve keserken INR'yi sık izleyin; indüksiyonun etkisi ilaç kesildikten sonra haftalarca sürebilir." },
    { t: function (a, b) { return has(a, "vka") && (has(b, "3a4g") || has(b, "3a4")); },
      m: "Varfarin yıkımı azalabilir; INR yükselir.",
      o: "Başlarken ve keserken INR'yi yakın aralıklarla kontrol edin; gerekirse varfarin dozunu ayarlayın." },
    { t: function (a, b) { return has(a, "statin3a4") && has(b, "3a4g"); },
      m: "Güçlü CYP3A4 inhibisyonu simvastatin/atorvastatin düzeyini belirgin artırır; miyopati ve rabdomiyoliz riski.",
      o: "Simvastatin bu ilaçlarla birlikte kullanılmamalı. Kısa antibiyotik kürü boyunca statine ara verilebilir ya da CYP3A4 ile yıkılmayan bir statin (pravastatin, rosuvastatin) seçilebilir. Atorvastatinde dozu KÜB'deki sınırda tutun; kas ağrısı için uyarın." },
    { t: function (a, b) { return has(a, "statin3a4") && has(b, "3a4"); },
      m: "Orta düzey CYP3A4 inhibisyonu statin düzeyini artırır; miyopati riski.",
      o: "Simvastatin için KÜB'deki üst doz sınırına uyun; kas ağrısı ve güçsüzlük için hastayı uyarın." },
    { t: function (a, b) { return a.id === "sakubitril-valsartan" && has(b, "raas") && b.dd.indexOf("Valsartan") < 0; },
      m: "Neprilizin inhibitörü ile ACE inhibitörü ya da ikinci bir RAAS blokeri: anjiyoödem, hiperkalemi ve böbrek işlevinde bozulma riski.",
      o: "ACE inhibitörüyle birlikte kontrendikedir; ACEİ kesildikten sonra en az 36 saat ara verin. ARB ile birlikte kullanılmaz." },
    { t: function (a, b) { return has(a, "raas") && has(b, "raas") && a.id !== "sakubitril-valsartan" && b.id !== "sakubitril-valsartan"; },
      m: "Çift RAAS blokajı: hiperkalemi, hipotansiyon ve akut böbrek hasarı riski.",
      o: "ACEİ ile ARB'nin birlikte kullanımı önerilmez." },
    { t: function (a, b) { return has(a, "k") && has(b, "k") && !(has(a, "raas") && has(b, "raas")); },
      m: "İki ilaç da serum potasyumunu yükseltebilir; hiperkalemi riski.",
      o: "Başlangıçta ve 1–2 hafta sonra potasyum ve kreatinin kontrolü; böbrek işlevi bozuk ve yaşlı hastada özellikle dikkat." },
    { t: function (a, b) { return has(a, "nsaii") && (has(b, "raas") || has(b, "diur")) && a.id !== "asa"; },
      m: "NSAİİ böbrek prostaglandinlerini baskılar: antihipertansif/diüretik etki azalır, böbrek işlevi bozulabilir.",
      o: "Kısa süreli ve düşük dozda kullanın; yaşlı, KBH ya da dehidratasyonda kreatinin ve tansiyonu izleyin." }
  ];

  /* Kaynak künyeleri (PubMed'de doğrulandı) */
  function pm(kunye, pmid) { return [kunye, "https://pubmed.ncbi.nlm.nih.gov/" + pmid + "/"]; }
  var KAY = {
    webb: pm("Webb DJ ve ark. J Am Coll Cardiol 2000;36:25–31", "10898408"),
    granforsCipro: pm("Granfors MT ve ark. Clin Pharmacol Ther 2004;76:598–606", "15592331"),
    granforsFluv: pm("Granfors MT ve ark. Clin Pharmacol Ther 2004;75:331–41", "15060511"),
    juurlinkLi: pm("Juurlink DN ve ark. J Am Geriatr Soc 2004;52:794–8", "15086664"),
    finley: pm("Finley PR. Clin Pharmacokinet 2016;55:925–41", "26936045"),
    juurlinkDig: pm("Juurlink DN ve ark. JAMA 2003;289:1652–8", "12672733"),
    moysey: pm("Moysey JO ve ark. Br Med J 1981;282:272", "6779981"),
    klein: pm("Klein HO ve ark. Circulation 1982;65:998–1003", "7074765"),
    hohnloser: pm("Hohnloser SH ve ark. Circ Arrhythm Electrophysiol 2014;7:1019–25", "25378467"),
    hung: pm("Hung IF ve ark. Clin Infect Dis 2005;41:291–300", "16007523"),
    terkeltaub: pm("Terkeltaub RA ve ark. Arthritis Rheum 2011;63:2226–37", "21480191"),
    kdigo: pm("KDIGO 2022 Diyabet ve KBH kılavuzu. Kidney Int 2022;102(5S):S1–S127", "36272764")
  };

  /* DDInter indirme verisinde bulunmayan ya da düşük düzeyde görünen kontrendike/ciddi çiftler.
     sev: "Major" olan kural, çifti DDInter düzeyinden bağımsız olarak "Ciddi" grubuna taşır. */
  var DIG_ARTIRAN = ["amiodaron", "verapamil", "klaritromisin", "dronedaron"];
  var CIDDI = [
    { t: function (a, b) { return has(a, "pde5") && has(b, "nitrat"); }, sev: "Major", kon: true,
      m: "PDE5 inhibitörü nitratların (NO vericiler) vazodilatör etkisini güçlendirir; ağır ve uzun süren hipotansiyon, senkop, miyokard iskemisi.",
      o: "Birlikte kullanım kontrendikedir. Nitrat kullanan hastaya PDE5 inhibitörü verilmez; PDE5 inhibitörü alan hastada göğüs ağrısında nitrat vermeden önce son doz sorulmalı (sildenafil/vardenafil için en az 24 saat, tadalafil için en az 48 saat).",
      kay: [KAY.webb] },
    { t: function (a, b) { return a.id === "tizanidin" && has(b, "1a2g"); }, sev: "Major", kon: true,
      m: "Güçlü CYP1A2 inhibisyonu tizanidin yıkımını durdurur: plazma düzeyi siprofloksasinle ~10 kat, fluvoksaminle ~33 kat artar; ağır hipotansiyon, bradikardi ve sedasyon.",
      o: "Birlikte kullanım kontrendikedir. Kas gevşetici gerekiyorsa başka bir ilaç seçin ya da antibiyotik/antidepresan için CYP1A2'yi inhibe etmeyen bir alternatif kullanın.",
      kay: [KAY.granforsCipro, KAY.granforsFluv] },
    { t: function (a, b) { return a.id === "lityum" && (has(b, "raas") || has(b, "tiyazid") || has(b, "loop") || (has(b, "nsaii") && b.id !== "asa")); }, sev: "Major",
      m: "Lityum böbrekten sodyumla birlikte atılır; ACEİ/ARB, tiyazid ve kıvrım diüretikleri ile NSAİİ lityum klirensini azaltır ve lityum düzeyini yükseltir. Toksisite: tremor, ataksi, konfüzyon, ishal, kusma.",
      o: "Mümkünse kombinasyondan kaçının. Kaçınılamıyorsa başlangıçtan ~5–7 gün sonra ve doz değişikliklerinde serum lityum, kreatinin ve sodyum düzeyine bakın; lityum dozunu gerekirse azaltın. Özellikle yaşlıda ilk ay yüksek risklidir. Hastaya toksisite belirtilerini ve kusma/ishal/dehidratasyonda hekime başvurmasını anlatın.",
      kay: [KAY.juurlinkLi, KAY.finley] },
    { t: function (a, b) { return a.id === "digoksin" && DIG_ARTIRAN.indexOf(b.id) >= 0; }, sev: "Major",
      m: "P-glikoprotein inhibisyonu (amiodaron, dronedaron, verapamil, klaritromisin) ve azalmış böbrek atılımı digoksin düzeyini belirgin artırır; bradikardi, AV blok, bulantı, görme bozukluğu, aritmi.",
      o: "Dronedaronla birlikte kullanımdan kaçının. Amiodaron ya da verapamil başlarken digoksin dozunu yaklaşık yarıya indirmeyi düşünün, 1 hafta içinde ve sonra düzenli digoksin düzeyi ve EKG. Klaritromisin yerine digoksinle etkileşmeyen bir antibiyotik seçin (ör. amoksisilin).",
      kay: [KAY.juurlinkDig, KAY.moysey, KAY.klein, KAY.hohnloser] },
    { t: function (a, b) { return a.id === "kolsisin" && (has(b, "3a4g") || has(b, "pgpg")); }, sev: "Major",
      m: "Kolşisin CYP3A4 ile yıkılır ve P-glikoprotein ile atılır; güçlü inhibitörler kolşisin düzeyini birkaç kat artırır. Kas hasarı, rabdomiyoliz, pansitopeni; böbrek ya da karaciğer yetmezliğinde ölümcül olabilir.",
      o: "Böbrek ya da karaciğer işlevi bozuk hastada birlikte kullanım kontrendikedir. Diğer hastalarda inhibitörü kullanırken kolşisine ara verin ya da dozu belirgin azaltın; mümkünse etkileşmeyen alternatif seçin (ör. klaritromisin yerine azitromisin).",
      kay: [KAY.hung, KAY.terkeltaub] }
  ];

  /* Tek başına seçildiğinde de gösterilen ilaç bilgi kutuları */
  var BILGI = {
    metformin: { baslik: "Metformin: böbrek işlevine dikkat",
      metin: "eGFR 30 mL/dk/1,73 m²'nin altında kontrendikedir (laktik asidoz riski). eGFR 30–44 arasında yeni başlanmaz; kullanan hastada doz azaltılır (günlük en çok 1000 mg). eGFR en az yılda bir, 60'ın altındaysa 3–6 ayda bir izlenir. İyotlu kontrast, dehidratasyon ve akut hastalıkta geçici olarak kesilmesi düşünülmelidir.",
      kay: [KAY.kdigo] }
  };

  function kuralNotlari(a, b) {
    var out = [];
    CIDDI.concat(KURAL).forEach(function (k) {
      if (k.t(a, b) || k.t(b, a)) out.push({ m: k.m, o: k.o, sev: k.sev || null, kon: !!k.kon, kay: k.kay || [] });
    });
    return out;
  }
  var RANK = { Major: 3, Moderate: 2, Minor: 1, Unknown: 0 };

  /* ---------- çözümleme ----------
     byId: ilaclar.json'daki ilaçlar (id → kayıt); secili: id dizisi; dosyalar: id → ilac/<id>.json içeriği.
     Sonuç: üst uyarı kutuları, düzeye göre çiftler, kaydı olmayan çiftler. */
  function analiz(byId, secili, dosyalar) {
    var ds = secili.map(function (id) { return byId[id]; });
    var R = { kutular: [], ciftler: { Major: [], Moderate: [], Minor: [], Unknown: [], Not: [] },
              kayitYok: [], kapsamDisi: [], veriYok: ds.filter(function (d) { return !d.dd.length; }), ayniEtken: [],
              bilgi: ds.filter(function (d) { return BILGI[d.id]; }).map(function (d) { return BILGI[d.id]; }) };
    for (var i = 0; i < ds.length; i++) {
      for (var j = i + 1; j < ds.length; j++) {
        var a = ds[i], b = ds[j];
        var ortak = a.dd.filter(function (x) { return b.dd.indexOf(x) >= 0; });
        if (ortak.length) R.ayniEtken.push({ a: a, b: b, ortak: ortak });
        var lv = null;
        if (dosyalar[a.id] && dosyalar[a.id].x[b.id]) lv = dosyalar[a.id].x[b.id];
        else if (dosyalar[b.id] && dosyalar[b.id].x[a.id]) lv = dosyalar[b.id].x[a.id];
        var c = { a: a, b: b, lv: lv, not: kuralNotlari(a, b) };
        /* Ciddi sınıf kuralı DDInter düzeyinden yüksekse ya da DDInter'de kayıt yoksa çift "Ciddi" grubuna alınır */
        c.kural = c.not.some(function (n) { return n.sev === "Major"; }) && (!lv || RANK[lv] < RANK.Major);
        c.kon = c.not.some(function (n) { return n.kon; });
        c.sev = c.kural ? "Major" : lv;
        if (c.sev) R.ciftler[c.sev].push(c);
        else if (c.not.length) R.ciftler.Not.push(c);
        else if (!a.dd.length || !b.dd.length) { /* veriYok listesinde gösterilir */ }
        else if (!a.k && !b.k) R.kapsamDisi.push(c);
        else R.kayitYok.push(c);
      }
    }

    function ciftleri(pred) {
      var out = [];
      DUZEY.concat("Not").forEach(function (lv) { R.ciftler[lv].forEach(function (c) { if (pred(c)) out.push(c); }); });
      return out;
    }
    var vka = ds.filter(function (d) { return has(d, "vka"); });
    if (vka.length && ds.length > 1) {
      R.kutular.push({ id: "varfarin", sev: "high", baslik: "Varfarin kullanılıyor",
        ciftler: ciftleri(function (c) { return has(c.a, "vka") || has(c.b, "vka"); }),
        metin: "Varfarinin çok sayıda ilaçla etkileşimi vardır; aşağıdaki listede olmasa bile yeni bir ilaç başlarken, doz değiştirirken ya da keserken INR'yi yakın aralıklarla kontrol edin. Antibiyotikler, azol antifungaller, amiodaron ve NSAİİ'ler en sık sorun çıkaranlardır." });
    }
    var doak = ds.filter(function (d) { return has(d, "doak"); });
    if (doak.length && ds.length > 1) {
      var ilgili = ds.filter(function (d) { return !has(d, "doak") && (ANTIKOAG(d) || has(d, "kanama") || has(d, "3a4g") || has(d, "3a4") || has(d, "ind")); });
      R.kutular.push({ id: "doak", sev: ilgili.length ? "high" : "mid", baslik: "DOAK kullanılıyor (" + adlar(doak) + ")",
        ciftler: ciftleri(function (c) { return has(c.a, "doak") || has(c.b, "doak"); }),
        metin: (ilgili.length ? "Dikkat gerektiren eş ilaçlar: " + adlar(ilgili) + ". " : "Listede kanama riskini artıran ya da DOAK düzeyini değiştiren bilinen bir ilaç görünmüyor. ") +
          "Antiplatelet, NSAİİ ve SSRI/SNRI kanama riskini; güçlü CYP3A4/P-gp inhibitörleri ve indükleyicileri DOAK düzeyini değiştirir. Doz ve böbrek işlevi için ilgili DOAK'ın KÜB'üne bakın." });
    }
    var qt = ds.filter(function (d) { return has(d, "qt"); });
    if (qt.length >= 2) {
      R.kutular.push({ id: "qt", sev: "high", baslik: "QT uzatan ilaçlar birlikte (" + qt.length + ")",
        ciftler: ciftleri(function (c) { return has(c.a, "qt") && has(c.b, "qt"); }),
        metin: adlar(qt) + ". Birlikte kullanım torsades de pointes riskini artırabilir. Mümkünse birini QT'yi uzatmayan bir alternatifle değiştirin; kullanılacaksa EKG ile QTc'yi izleyin, potasyum ve magnezyumu düzeltin." });
    }
    var sero = ds.filter(function (d) { return has(d, "sero"); });
    if (sero.length >= 2) {
      var mao = sero.filter(function (d) { return has(d, "mao"); });
      R.kutular.push({ id: "sero", sev: "high", baslik: "Serotonerjik kombinasyon (" + sero.length + " ilaç)",
        ciftler: ciftleri(function (c) { return has(c.a, "sero") && has(c.b, "sero"); }),
        metin: adlar(sero) + ". Serotonin sendromu riski: ajitasyon, tremor, klonus, hiperrefleksi, terleme, ateş, ishal. " +
          (mao.length ? "Listede MAO inhibitörü var (" + adlar(mao) + "); diğer serotonerjiklerle birlikte kullanım genellikle kontrendikedir. " : "") +
          "Kombinasyon gerekliyse düşük dozla başlayın ve hastayı belirtiler konusunda bilgilendirin." });
    }
    var ns = ds.filter(function (d) { return has(d, "nsaii") && d.id !== "asa"; }),
        ra = ds.filter(function (d) { return has(d, "raas"); }), di = ds.filter(function (d) { return has(d, "diur"); });
    if (ns.length && ra.length && di.length) {
      R.kutular.push({ id: "ucludarbe", sev: "high", baslik: "NSAİİ + RAAS blokeri + diüretik (\"üçlü darbe\")", ciftler: [],
        metin: adlar(ns.concat(ra, di)) + ". Bu üçlü akut böbrek hasarı riskini belirgin artırır. NSAİİ'den kaçının; kaçınılamıyorsa kısa süreli kullanın ve kreatinini izleyin." });
    }
    return R;
  }

  if (typeof module !== "undefined") module.exports = { KAY: KAY, BILGI: BILGI, fold: fold, indeksle: indeksle, ara: ara, coz: coz, analiz: analiz, kuralNotlari: kuralNotlari, EN_COK: EN_COK };
  if (typeof window === "undefined" || typeof document === "undefined") return;

  /* ---------- arayüz ---------- */
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function link(txt, href) { var a = el("a", null, txt); a.href = href; a.target = "_blank"; a.rel = "noopener"; return a; }

  var CSS =
    ".etk-in{position:relative}" +
    ".etk-sug{position:absolute;left:0;right:0;top:100%;z-index:5;margin:4px 0 0;padding:4px;list-style:none;background:var(--surface);border:1px solid var(--line);border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.12);max-height:280px;overflow:auto}" +
    ".etk-sug li{padding:7px 10px;border-radius:6px;cursor:pointer;font-weight:400}" +
    ".etk-sug li small{color:var(--muted);margin-left:6px}" +
    ".etk-sug li[aria-selected=true],.etk-sug li:hover{background:var(--sunk)}" +
    ".etk-sel{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}" +
    ".etk-sel .chip{display:inline-flex;align-items:center;gap:6px}" +
    ".etk-sel .chip b{font-weight:700;color:var(--muted)}" +
    ".etk-msg{margin:8px 0 0;font-size:14px;color:var(--muted)}" +
    ".etk-box{margin-top:12px}.etk-box b{font-family:var(--serif);font-size:18px}" +
    ".etk-box ul,.etk-grp ul{margin:8px 0 0;padding:0;list-style:none}" +
    ".etk-grp{margin-top:18px}.etk-grp h4{font-family:var(--serif);font-size:17px;margin:0 0 4px}" +
    ".etk-pair{padding:9px 0;border-bottom:1px solid var(--line)}" +
    ".etk-pair>span{font-weight:600}" +
    ".etk-pair p{margin:4px 0 0;font-size:14.5px;max-width:78ch}" +
    ".etk-pair p i{font-style:normal;font-weight:700;color:var(--muted)}" +
    ".etk-lv{display:inline-block;font-size:11.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;border-radius:6px;padding:1px 7px;margin-right:8px;vertical-align:1px}" +
    ".etk-lv.Major{background:#B3261E;color:#fff}.etk-lv.Moderate{background:var(--brass-soft);color:var(--brass)}" +
    ".etk-lv.Minor{background:var(--pine-soft);color:var(--pine)}.etk-lv.Unknown,.etk-lv.Not{background:var(--sunk);color:var(--muted)}" +
    ".etk-grp details summary{cursor:pointer;color:var(--pine);font-weight:600}" +
    ".etk-note{margin:10px 0 0;font-size:13.5px;color:var(--muted)}";

  function kaynakP(kay) {
    var p = el("p", "etk-note"); p.appendChild(el("i", null, "Kaynak: "));
    kay.forEach(function (k, i) { if (i) p.appendChild(document.createTextNode(" · ")); p.appendChild(link(k[0], k[1])); });
    return p;
  }

  function pairItem(c, withLv) {
    var li = el("li", "etk-pair");
    var sev = c.sev || c.lv;
    if (withLv) li.appendChild(el("span", "etk-lv " + (sev || "Not"),
      c.kural ? (c.kon ? "Kontrendike" : "Ciddi") + " (sınıf kuralı)" : sev ? DUZEY_AD[sev] : "Klinik not"));
    li.appendChild(el("span", null, c.a.ad + " + " + c.b.ad));
    if (c.kural) li.appendChild(el("p", "etk-note", c.lv ? "DDInter düzeyi: " + DUZEY_AD[c.lv] + "; klinik kaynaklara göre ciddi kabul edildi."
      : "DDInter indirme verisinde bu çift yok; klinik kaynaklara göre ciddi kabul edildi."));
    c.not.forEach(function (n) {
      var p1 = el("p"); p1.appendChild(el("i", null, "Mekanizma: ")); p1.appendChild(document.createTextNode(n.m)); li.appendChild(p1);
      var p2 = el("p"); p2.appendChild(el("i", null, "Öneri: ")); p2.appendChild(document.createTextNode(n.o)); li.appendChild(p2);
      if (n.kay.length) li.appendChild(kaynakP(n.kay));
    });
    if (c.lv && c.a.ddid.length && c.b.ddid.length) {
      var p = el("p", "etk-note"); p.appendChild(document.createTextNode("Mekanizma ve yönetim için DDInter: "));
      p.appendChild(link(c.a.dd.join(" + "), "https://ddinter.scbdd.com/ddinter/drug-detail/" + c.a.ddid[0] + "/"));
      p.appendChild(document.createTextNode(" · "));
      p.appendChild(link(c.b.dd.join(" + "), "https://ddinter.scbdd.com/ddinter/drug-detail/" + c.b.ddid[0] + "/"));
      li.appendChild(p);
    }
    return li;
  }

  function group(title, list, lv, open, note) {
    var g = el("div", "etk-grp"), ul = el("ul");
    list.forEach(function (c) { ul.appendChild(pairItem(c, true)); });
    if (open) { g.appendChild(el("h4", null, title + " · " + list.length)); if (note) g.appendChild(el("p", "etk-note", note)); g.appendChild(ul); }
    else {
      var d = el("details"); d.appendChild(el("summary", null, title + " · " + list.length));
      if (note) d.appendChild(el("p", "etk-note", note)); d.appendChild(ul); g.appendChild(d);
    }
    return g;
  }

  function build(host) {
    var body = el("div", "tool-body"); host.appendChild(body);
    var res = el("div"); res.setAttribute("aria-live", "polite");
    var lab = el("label", "fld"); lab.appendChild(el("span", null, "İlaç ekle (etken madde; 2–15 ilaç)"));
    var wrap = el("div", "etk-in");
    var inp = document.createElement("input"); inp.type = "text"; inp.autocomplete = "off"; inp.spellcheck = false;
    inp.placeholder = "ör. varfarin, ibuprofen, klaritromisin"; inp.setAttribute("role", "combobox");
    inp.setAttribute("aria-autocomplete", "list"); inp.setAttribute("aria-expanded", "false"); inp.setAttribute("aria-controls", "etk-sug");
    var sug = el("ul", "etk-sug"); sug.id = "etk-sug"; sug.setAttribute("role", "listbox"); sug.hidden = true;
    wrap.appendChild(inp); wrap.appendChild(sug); lab.appendChild(wrap);
    var fields = el("div", "fields col"); fields.appendChild(lab); body.appendChild(fields);
    var msg = el("p", "etk-msg", "Veri yükleniyor…"); body.appendChild(msg);
    var sel = el("div", "etk-sel"); body.appendChild(sel);
    body.appendChild(res);
    var reset = el("button", "reset", "Temizle"); reset.type = "button"; body.appendChild(reset);

    var ilaclar = [], byId = {}, dosyalar = {}, secili = [], cur = [], act = -1, hazir = false;

    function yukle(id) {
      if (dosyalar[id]) return Promise.resolve();
      return fetch(VERI + "ilac/" + id + ".json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (j) { dosyalar[id] = j; });
    }
    function ekle(d) {
      if (!d || secili.indexOf(d.id) >= 0) return;
      if (secili.length >= EN_COK) { msg.textContent = "En fazla " + EN_COK + " ilaç eklenebilir."; return; }
      secili.push(d.id); msg.textContent = ""; ciz();
      yukle(d.id).then(ciz, function () { msg.textContent = d.ad + " verisi yüklenemedi; sayfayı yenileyip tekrar deneyin."; });
    }
    function cikar(id) { secili = secili.filter(function (x) { return x !== id; }); ciz(); }

    function oneriCiz() {
      sug.innerHTML = "";
      cur.forEach(function (d, i) {
        var li = el("li", null, d.ad); li.id = "etk-o" + i; li.setAttribute("role", "option");
        li.setAttribute("aria-selected", i === act ? "true" : "false");
        var alt = d.diger.concat(d.dd.length ? [d.dd.join(" + ")] : []).filter(function (x) { return fold(x) !== fold(d.ad); });
        if (alt.length) li.appendChild(el("small", null, alt.join(" · ")));
        if (secili.indexOf(d.id) >= 0) li.appendChild(el("small", null, "eklendi"));
        li.addEventListener("mousedown", function (e) { e.preventDefault(); ekle(d); inp.value = ""; kapat(); });
        sug.appendChild(li);
      });
      sug.hidden = !cur.length; inp.setAttribute("aria-expanded", cur.length ? "true" : "false");
      if (act >= 0) inp.setAttribute("aria-activedescendant", "etk-o" + act); else inp.removeAttribute("aria-activedescendant");
    }
    function kapat() { cur = []; act = -1; oneriCiz(); }

    function coklu(text) {
      var parts = text.split(/[,;\n+]+/).map(function (s) { return s.trim(); }).filter(Boolean), bulunmayan = [];
      parts.forEach(function (p) { var d = coz(ilaclar, p); if (d) ekle(d); else bulunmayan.push(p); });
      if (bulunmayan.length) msg.textContent = "Tanınmadı: " + bulunmayan.join(", ") + ". Etken madde adıyla yazın; bu listede olmayan ilaçlar için kapsamlı bir veritabanına bakın.";
    }

    inp.addEventListener("input", function () {
      if (!hazir) return;
      if (/[,;\n]/.test(inp.value)) { coklu(inp.value); inp.value = ""; kapat(); return; }
      cur = ara(ilaclar, inp.value, 8); act = cur.length ? 0 : -1; oneriCiz();
    });
    inp.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" && cur.length) { act = (act + 1) % cur.length; oneriCiz(); e.preventDefault(); }
      else if (e.key === "ArrowUp" && cur.length) { act = (act - 1 + cur.length) % cur.length; oneriCiz(); e.preventDefault(); }
      else if (e.key === "Enter") {
        e.preventDefault();
        if (act >= 0 && cur[act]) { ekle(cur[act]); inp.value = ""; kapat(); }
        else if (inp.value.trim()) { coklu(inp.value); inp.value = ""; kapat(); }
      } else if (e.key === "Escape") kapat();
      else if (e.key === "Backspace" && !inp.value && secili.length) cikar(secili[secili.length - 1]);
    });
    inp.addEventListener("paste", function (e) {
      var t = (e.clipboardData || window.clipboardData).getData("text");
      if (hazir && /[,;\n]/.test(t)) { e.preventDefault(); coklu(t); kapat(); }
    });
    inp.addEventListener("blur", function () { setTimeout(kapat, 100); });
    reset.addEventListener("click", function () { secili = []; inp.value = ""; msg.textContent = ""; kapat(); ciz(); });

    function ciz() {
      sel.innerHTML = "";
      secili.forEach(function (id) {
        var b = el("button", "chip"); b.type = "button"; b.setAttribute("aria-label", byId[id].ad + " listeden çıkar");
        b.appendChild(el("span", null, byId[id].ad)); b.appendChild(el("b", null, "×"));
        b.addEventListener("click", function () { cikar(id); inp.focus(); }); sel.appendChild(b);
      });
      res.innerHTML = "";
      secili.forEach(function (id) {
        var b = BILGI[id]; if (!b) return;
        var bx = el("div", "result etk-box mid"); bx.appendChild(el("b", null, b.baslik)); bx.appendChild(el("p", null, b.metin));
        bx.appendChild(kaynakP(b.kay)); res.appendChild(bx);
      });
      if (secili.length < EN_AZ) {
        var r0 = el("div", "result"); r0.appendChild(el("span", "hint", "En az iki ilaç ekleyin; tüm ikili etkileşimler ciddiyete göre burada listelenir.")); res.appendChild(r0); return;
      }
      var bekleyen = secili.filter(function (id) { return !dosyalar[id]; });
      if (bekleyen.length) { var r1 = el("div", "result"); r1.appendChild(el("span", "hint", "Yükleniyor…")); res.appendChild(r1); return; }
      var R = analiz(byId, secili, dosyalar);

      R.kutular.forEach(function (k) {
        var bx = el("div", "result etk-box " + k.sev); bx.appendChild(el("b", null, k.baslik)); bx.appendChild(el("p", null, k.metin));
        if (k.ciftler.length) { var ul = el("ul"); k.ciftler.forEach(function (c) { ul.appendChild(pairItem({ a: c.a, b: c.b, lv: c.lv, sev: c.sev, kural: c.kural, kon: c.kon, not: [] }, true)); }); bx.appendChild(ul); }
        res.appendChild(bx);
      });
      if (R.ayniEtken.length) {
        var ax = el("div", "result etk-box mid"); ax.appendChild(el("b", null, "Aynı etken madde iki kez"));
        ax.appendChild(el("p", null, R.ayniEtken.map(function (x) { return x.a.ad + " ve " + x.b.ad + " (" + x.ortak.join(", ") + ")"; }).join("; ") + ". Çift doz riskine dikkat."));
        res.appendChild(ax);
      }
      var toplam = DUZEY.reduce(function (s, lv) { return s + R.ciftler[lv].length; }, 0);
      var n = secili.length, cift = n * (n - 1) / 2;
      var sum = el("div", "result " + (R.ciftler.Major.length ? "high" : R.ciftler.Moderate.length ? "mid" : "ok"));
      sum.appendChild(el("b", null, cift + " çiftten " + toplam + " etkileşim"));
      sum.appendChild(el("p", null, "Ciddi " + R.ciftler.Major.length + " · Orta " + R.ciftler.Moderate.length + " · Hafif " + R.ciftler.Minor.length +
        " · Düzeyi belirtilmemiş " + R.ciftler.Unknown.length + (R.ciftler.Not.length ? " · Yalnız klinik not " + R.ciftler.Not.length : "")));
      res.appendChild(sum);

      if (R.ciftler.Major.length) res.appendChild(group("Ciddi (Major)", R.ciftler.Major, "Major", true));
      if (R.ciftler.Moderate.length) res.appendChild(group("Orta (Moderate)", R.ciftler.Moderate, "Moderate", true));
      if (R.ciftler.Minor.length) res.appendChild(group("Hafif (Minor)", R.ciftler.Minor, "Minor", true));
      if (R.ciftler.Not.length) res.appendChild(group("DDInter verisinde kaydı yok, sınıf özelliği nedeniyle not düşülen çiftler", R.ciftler.Not, "Not", true,
        "Bu çiftler DDInter indirme verisinde yer almıyor; not, ilaçların sınıf özelliğine (serotonerjik, QT uzatan, kanama riski vb.) dayanır."));
      if (R.ciftler.Unknown.length) res.appendChild(group("Düzeyi belirtilmemiş", R.ciftler.Unknown, "Unknown", false,
        "DDInter bu çiftler için etkileşim kaydı içeriyor ancak ciddiyet düzeyi belirtmiyor. Ayrıntı için ilacın DDInter sayfasına bakın."));
      if (R.kapsamDisi.length) {
        var g1 = el("div", "etk-grp"), d1 = el("details");
        d1.appendChild(el("summary", null, "Kontrol edilemeyen çiftler · " + R.kapsamDisi.length));
        d1.appendChild(el("p", "etk-note", "DDInter'in indirilebilir verisi yalnızca bazı ATC gruplarını (A, B, D, H, L, P, R, V) kapsar. İki ilacın da bu grupların dışında kaldığı çiftler veride bulunmaz; etkileşim olmadığı anlamına gelmez. Bu çiftleri kapsamlı bir veritabanında kontrol edin."));
        d1.appendChild(el("p", null, R.kapsamDisi.map(function (c) { return c.a.ad + " + " + c.b.ad; }).join(" · ")));
        g1.appendChild(d1); res.appendChild(g1);
      }
      if (R.veriYok.length) {
        res.appendChild(el("p", "etk-note", "DDInter verisinde bulunmayan ilaçlar: " + adlar(R.veriYok) + ". Bu ilaçlar için yalnızca sınıf uyarıları gösterilir; etkileşimleri ayrıca kontrol edin."));
      }
      if (R.kayitYok.length) {
        res.appendChild(el("p", "etk-note", "DDInter'de kaydı olmayan " + R.kayitYok.length + " çift: " + R.kayitYok.map(function (c) { return c.a.ad + " + " + c.b.ad; }).join(" · ") + "."));
      }
    }

    fetch(VERI + "ilaclar.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (j) {
      ilaclar = j.ilaclar; byId = indeksle(ilaclar); hazir = true;
      msg.textContent = ilaclar.length + " ilaç tanımlı. Adı yazıp listeden seçin ya da virgülle ayırarak birden çok ilacı yapıştırın.";
      ciz();
    }, function () { msg.textContent = "Etkileşim verisi yüklenemedi; bağlantınızı kontrol edip sayfayı yenileyin."; });
  }

  function srcBlock() {
    var p = el("p", "src"); p.appendChild(el("b", null, "Kaynak: "));
    p.appendChild(link("DDInter – Drug-Drug Interaction Database", "https://ddinter.scbdd.com/"));
    p.appendChild(document.createTextNode(" (Xiong G ve ark. "));
    p.appendChild(link("Nucleic Acids Res 2022;50:D1200–D1207", "https://pubmed.ncbi.nlm.nih.gov/34634800/"));
    p.appendChild(document.createTextNode("). Veri "));
    p.appendChild(link("CC BY-NC-SA 4.0", "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.tr"));
    p.appendChild(document.createTextNode(" lisansıyla kullanılmış; Türkçe eşleme tablosu, sınıf notları ve uyarı kutuları klinik tarafından eklenmiştir (değiştirilmiş eser, aynı lisansla). QT listesi: "));
    p.appendChild(link("CredibleMeds", "https://crediblemeds.org/"));
    p.appendChild(document.createTextNode(" · DOAK etkileşimleri: "));
    p.appendChild(link("EHRA DOAK rehberi", "https://www.escardio.org/Education/Practice-Tools/EHRA-NOAC-Practical-Guide"));
    p.appendChild(el("br"));
    p.appendChild(el("strong", null, "İlk bakış aracıdır, kapsamlı etkileşim veritabanının yerini tutmaz. "));
    p.appendChild(document.createTextNode("Sonuç yoksa etkileşim olmadığı anlamına gelmez; doz, böbrek ve karaciğer işlevi, yaş gibi hastaya özgü etkenler hesaba katılmaz."));
    return p;
  }

  /* ---------- araçlar sayfasına kart ekleme ---------- */
  var GROUPS = [["ilac", "İlaç etkileşimi"]];
  var KART = { id: "etkilesim", g: "ilac", gl: GROUPS[0][1], t: "İlaç etkileşimi denetleyici (DDInter)",
    d: "2–15 ilaç girin; tüm ikili etkileşimler ciddiyete göre listelenir. Varfarin, DOAK, QT ve serotonerjik kombinasyonlar için ayrı uyarı.",
    kw: "ilaç etkileşimi etkilesim interaksiyon ddinter varfarin doak qt serotonin sendromu polifarmasi" };

  function init() {
    var list = document.getElementById("tools"), chips = document.getElementById("chips"),
        q = document.getElementById("q"), cnt = document.getElementById("count"), empty = document.getElementById("empty");
    if (!list || document.getElementById(KART.id)) return;
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);

    var d = document.createElement("details"); d.className = "tool"; d.id = KART.id;
    var s = document.createElement("summary");
    s.appendChild(el("span", "tg", KART.gl)); s.appendChild(el("b", null, KART.t)); s.appendChild(el("span", "td", KART.d));
    d.appendChild(s);
    var built = false;
    d.addEventListener("toggle", function () {
      if (d.open && !built) { built = true; build(d); d.appendChild(srcBlock()); }
      if (d.open && history.replaceState) history.replaceState(null, "", "#" + KART.id);
    });
    list.insertBefore(d, list.firstChild);
    var hay = fold(KART.t + " " + KART.d + " " + KART.kw + " " + KART.gl);
    d._g = KART.g; d._hay = hay; // diğer araç dosyalarının ortak süzgeci (arac-mama.js KanuniEk) bu alanları okur

    /* araclar.js'in arama ve grup düğmeleriyle uyum: bu kart onun listesinde olmadığından görünürlüğü burada yönetilir. */
    var yalniz = false, bizimChip = null;
    function uygula() {
      var words = fold(q ? q.value : "").split(/\s+/).filter(Boolean);
      var pressed = chips ? chips.querySelector('[aria-pressed="true"]') : null;
      var g = yalniz ? KART.g : pressed ? pressed.dataset.g : "all";
      var eslesir = words.every(function (w) { return hay.indexOf(w) >= 0; });
      d.hidden = !((g === "all" || g === KART.g) && eslesir);
      if (yalniz) {
        Array.prototype.forEach.call(list.children, function (c) { if (c !== d) c.hidden = true; });
        Array.prototype.forEach.call(chips.children, function (b) { b.setAttribute("aria-pressed", b === bizimChip ? "true" : "false"); });
      }
      if (cnt) {
        var n = Array.prototype.filter.call(list.children, function (c) { return !c.hidden; }).length;
        cnt.textContent = n + " araç"; if (empty) empty.hidden = n > 0;
      }
    }
    if (chips) {
      var tumu = chips.querySelector('[data-g="all"] .c'); if (tumu) tumu.textContent = String(+tumu.textContent + 1);
      bizimChip = el("button", "chip", KART.gl); bizimChip.type = "button"; bizimChip.dataset.g = KART.g;
      bizimChip.setAttribute("aria-pressed", "false"); bizimChip.appendChild(el("span", "c", "1"));
      chips.insertBefore(bizimChip, chips.children[1] || null);
      chips.addEventListener("click", function (e) {
        var b = e.target.closest ? e.target.closest(".chip") : null; if (!b) return;
        yalniz = b === bizimChip; uygula();
      });
    }
    if (q) q.addEventListener("input", uygula);
    uygula();
    if (location.hash === "#" + KART.id) { d.open = true; d.scrollIntoView(); }
  }

  /* araclar.js kendi kartlarını DOMContentLoaded'da çizer; bu betik ondan sonra yüklendiği için sıra korunur. */
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
