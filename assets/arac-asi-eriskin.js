/* Erişkin ve risk grubu aşı planlayıcı. Kurallar yalnızca Sağlık Bakanlığı belgelerinden alınmıştır
   (kaynaklar kartın altında). Hesap tarayıcıda yapılır; girilen hiçbir bilgi gönderilmez ya da saklanmaz.
   Kart çizimi için arac-mama.js'teki ortak katmanı (window.KanuniEk) kullanır. */
(function () {
  "use strict";

  /* ---------- tarih yardımcıları ---------- */
  var AYLAR = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  var GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  function trTarih(d) { return d.getDate() + " " + AYLAR[d.getMonth()] + " " + d.getFullYear() + " " + GUNLER[d.getDay()]; }
  function gunEkle(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function ayEkle(d, n) {
    var x = new Date(d.getFullYear(), d.getMonth(), 1); x.setMonth(x.getMonth() + n);
    var son = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
    x.setDate(Math.min(d.getDate(), son)); return x;
  }
  function tarihOku(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function yasHesap(dogum, bugun) {
    var y = bugun.getFullYear() - dogum.getFullYear();
    if (bugun.getMonth() < dogum.getMonth() || (bugun.getMonth() === dogum.getMonth() && bugun.getDate() < dogum.getDate())) y--;
    return y;
  }
  function enErken(d) { return d ? " En erken: " + trTarih(d) + "." : ""; }

  /* ---------- seçenekler ---------- */
  var DURUM = [
    ["kalp", "Kronik kalp hastalığı (kalp yetmezliği, siyanotik doğumsal kalp hastalığı dâhil)"],
    ["akciger", "Kronik akciğer hastalığı (astım dâhil)"],
    ["dm", "Diabetes mellitus"],
    ["karaciger", "Kronik karaciğer hastalığı / siroz (metabolik karaciğer hastalığı dâhil)"],
    ["hbvhcv", "Kronik hepatit B ya da C enfeksiyonu"],
    ["kby", "Kronik böbrek yetmezliği / nefrotik sendrom"],
    ["diyaliz", "Hemodiyaliz hastası"],
    ["hiv", "HIV/AIDS"],
    ["immun", "Bağışıklığı baskılayan durum: immünsüpresif tedavi, radyoterapi, malignite, lenfoma/lösemi, miyelom, doğuştan ya da edinsel immün yetmezlik"],
    ["aspleni", "Anatomik ya da fonksiyonel aspleni, orak hücreli anemi / hemoglobinopati"],
    ["bos", "BOS kaçağı"],
    ["koklear", "Koklear implant (planlanan ya da var)"],
    ["pihti", "Pıhtılaşma bozukluğu ya da sık kan / kan ürünü kullanmak zorunda kalan"],
    ["nakil", "Solid organ ya da kemik iliği nakli adayı / alıcısı (kök hücre nakli hariç)"],
    ["hsct", "Hematopoetik kök hücre nakli alıcısı"],
    ["antitnf", "Anti-TNF gibi immünmodülatör tedavi başlanacak"],
    ["alkol", "Alkolizm"],
    ["madde", "Madde bağımlılığı"],
    ["msm", "Eşcinsel / biseksüel erkek"],
    ["cinsel", "Çok sayıda cinsel eşi olan ya da para karşılığı cinsel ilişkide bulunan"],
    ["hbvtemas", "Hepatit B taşıyıcısının aile içi temaslısı"],
    ["bakim", "Zihinsel engelli bakımevinde ya da yetiştirme yurdunda bulunan"],
    ["cezaevi", "Cezaevi ya da ıslahevinde bulunan"],
    ["piercing", "Piercing ya da kalıcı dövme yaptırmayı planlayan"],
    ["kronikdiger", "Diğer kronik hastalık (yalnızca grip aşısı için)"],
    ["huzurevi", "Huzurevi / yaşlı bakımevinde kalan"]
  ];
  var MESLEK = [
    ["saglik", "Sağlık çalışanı ya da sağlık eğitimi öğrencisi (temizlik personeli, 112, UMKE dâhil)"],
    ["saglikalt", "Alt bakım servislerinde çalışan (çocuk, çocuk enfeksiyon, yetişkin yoğun bakım), fekal materyalle çalışan laboratuvar personeli, 112/UMKE"],
    ["mikrolab", "Mikrobiyoloji laboratuvarında meningokokla çalışan"],
    ["kanal", "Kanalizasyon işçisi"],
    ["atik", "Tıbbi atık yönetiminde çalışan"],
    ["kuafor", "Berber, kuaför, manikür-pedikürcü"],
    ["guvenlik", "Güvenlik personeli (asker, polis vb.; kan ve hasta çıkartıları ile temas riski yüksek)"],
    ["ilkyardim", "Kaza ve afetlerde ilk yardım uygulayan"],
    ["hac", "Hac ya da umreye gidecek"]
  ];

  /* ---------- kural motoru ---------- */
  function planla(g) {
    var o = [];
    function ekle(asi, tur, baslik, metin, ucret) { o.push({ asi: asi, tur: tur, baslik: baslik, metin: metin, ucret: ucret || "" }); }
    var d = g.durum || {}, m = g.meslek || {}, on = g.onceki || {}, yas = g.yas, gebe = !!g.gebe;
    var saglikAny = m.saglik || m.saglikalt;
    var yuksekPnomokok = !!(d.aspleni || d.bos || d.koklear || d.immun || d.nakil || d.hsct || d.hiv || d.diyaliz || d.kby);
    var kronikPnomokok = !!(d.kalp || d.akciger || d.dm || d.alkol || d.karaciger);
    var immunBask = !!(d.immun || (d.hiv && g.cd4 === "dusuk"));
    var uyarilar = [];

    if (yas < 18) return { uyarilar: ["Bu araç 18 yaş ve üzeri içindir. Çocuk ve ergenler için Aşı planlayıcı (Ulusal Çocukluk Dönemi Aşılama Takvimi) kartını kullanın; risk grubu şemaları ayrıdır."], liste: [] };

    /* Td / Tdap */
    if (gebe) {
      if (on.td === "hic" || on.td === "eksik") ekle("Td / Tdap", "simdi", "Gebelikte tetanos aşısı",
        "4 hafta arayla iki doz; en az biri Tdap (Tdab) olmalı. 18–24. haftada bir doz Tdap, 4 hafta sonra bir doz Td uygulanabilir. Aşı, doğumdan en az 1 ay önce tamamlanmalı.", "Ücretsiz (GBP)");
      else if (on.td === "tam10ustu") ekle("Td / Tdap", "simdi", "Gebelikte tetanos aşısı", "Birincil seri tamam ama son 10 yılda pekiştirme yok: bir doz tetanos aşısı (boğmaca içeren Tdap tercih edilir).", "Ücretsiz (GBP)");
      else ekle("Td / Tdap", "yok", "Gebelikte tetanos aşısı", "Birincil seri tamam ve son doz 10 yıl içinde: bu gebelikte zorunlu ek doz tanımlanmamış. Aşı kartında gebeler için Tdap yazılıdır; aşı kaydını ATS'den doğrulayın.");
    } else if (on.td === "hic") {
      ekle("Td", "simdi", "Td ilk seri (3 doz)", "Kayıtlı aşısı olmayan erişkine 3 doz: 1. ile 2. doz arası en az 1 ay, 2. ile 3. doz arası en az 6 ay. Sonra 10 yılda bir Td." + (saglikAny ? " Sağlık çalışanı için dozlardan biri boğmaca içeren (Tdap) olmalı." : ""), "Ücretsiz (GBP)");
    } else if (on.td === "eksik") {
      ekle("Td", "simdi", "Td serisini tamamla", "Seriye baştan başlamadan kaldığı yerden devam edilir (aralıklar: 1. – 2. doz en az 1 ay, 2. – 3. doz en az 6 ay). Sonra 10 yılda bir Td.", "Ücretsiz (GBP)");
    } else if (on.td === "tam10ustu") {
      ekle("Td", "simdi", "Td pekiştirme", "Son doz 10 yıldan eski: bir doz Td." + (saglikAny ? " Sağlık çalışanında bu doz boğmaca içeren (Tdap) olmalı." : ""), "Ücretsiz (GBP)");
    } else {
      ekle("Td", "yok", "Td", "Birincil seri tamam ve son doz 10 yıl içinde. Sonraki pekiştirme son dozdan 10 yıl sonra." + (saglikAny ? " Sağlık çalışanlarında bir dozun boğmaca içeren aşı olması önerilir." : ""));
    }

    /* KKK */
    if (gebe) {
      if (on.kkk !== "var") ekle("KKK", "kontra", "KKK (kızamık-kızamıkçık-kabakulak)", "Canlı aşıdır, gebelikte yapılmaz. Kayıtlı 2 doz yoksa doğum sonrasında (gebelik dışında) 4 hafta arayla 2 doz uygulanır.");
    } else if (on.kkk === "var") {
      ekle("KKK", "yok", "KKK", "İki doz KKK (ya da 1980 sonrası doğanlarda iki doz kızamık içeren aşı), kızamık geçirme kaydı ya da laboratuvarla gösterilmiş bağışıklık varsa aşı gerekmez.");
    } else if (d.hsct) {
      ekle("KKK", "plan", "KKK (kök hücre nakli sonrası)", "Aşılanma durumuna bakılmaksızın nakilden en az 24 ay sonra, graft versus host hastalığı ve immünsüpresif ilaç yoksa 3 ay arayla 2 doz.", "Ücretsiz (GBP)");
    } else if (d.immun) {
      ekle("KKK", "kontra", "KKK", "Canlı aşıdır; bağışıklığı baskılanmış kişide kontrendikedir. Kök hücre nakli sonrası ve HIV için ayrı koşullar vardır.");
    } else if (d.hiv) {
      ekle("KKK", g.cd4 === "dusuk" ? "kontra" : "simdi", "KKK (HIV/AIDS)", g.cd4 === "dusuk"
        ? "CD4 sayısı 200 ve altındaysa yapılmaz (7 yaş üstü ve erişkinde >200 gerekir)."
        : "CD4 sayısı >200 ise aşılanma durumuna bakılmaksızın en az 4 hafta arayla 2 doz.", "Ücretsiz (GBP)");
    } else if (d.nakil) {
      ekle("KKK", "simdi", "KKK (nakil adayı)", "Eksik aşılı ya da seronegatifse son doz nakilden en az 4 hafta önce olacak şekilde, 2 doza tamamlanacak biçimde uygulanır.", "Ücretsiz (GBP)");
    } else {
      ekle("KKK", "simdi", "KKK", "Kayıtlı 2 doz yok: 4 hafta arayla 2 doz. " + (g.kadin ? "Doğurganlık çağındaki kadınlarda özellikle önemlidir (2006 öncesi kızamık aşıları kızamıkçık içermiyordu); aşılanan kadın gebelikten korunmalıdır." : "") + (saglikAny ? " Sağlık çalışanı için en az 1 ay arayla 2 doz." : ""), "Ücretsiz (GBP), aile hekiminde");
    }

    /* Hepatit B */
    var hepbRisk = !!(d.diyaliz || d.nakil || d.hsct || d.pihti || d.madde || d.hbvtemas || d.cinsel || d.msm || d.karaciger || d.cezaevi || d.bakim || d.piercing ||
      m.saglik || m.kuafor || m.guvenlik || m.ilkyardim || m.atik);
    if (hepbRisk) {
      var yuksekDoz = (d.diyaliz || d.immun || d.hiv || d.hsct) && yas >= 20;
      var doz = yas < 20 ? "10 µg (0,5 mL)" : yuksekDoz ? "40 µg (2 mL)" : "20 µg (1 mL)";
      var onTarama = (m.saglik || d.hbvtemas || d.cezaevi) ? " Aşı öncesi HBsAg, anti-HBs ve anti-HBc total bakılır; HBsAg (+) ya da izole anti-HBc (+) ise uzmana yönlendirilir, HBsAg ve anti-HBs negatifse aşılanır." : "";
      if (on.hepb === "tam") {
        ekle("Hepatit B", "yok", "Hepatit B", "Seri tamam: bağışıklığı normal kişide pekiştirme dozu ve rutin antikor bakılması gerekmez." + (d.diyaliz ? " Hemodiyaliz hastasında ise yıllık anti-HBs bakılır; ≤10 mIU/mL ise bir pekiştirme dozu (≥20 yaşta iki katı doz) yapılır." : ""));
      } else {
        ekle("Hepatit B", "simdi", "Hepatit B aşısı (0-1-6. ay)", "Doz: " + doz + ". Aksarsa en az aralıklar: 1.–2. doz 1 ay, 2.–3. doz 2 ay, 1.–3. doz 4 ay." + onTarama +
          (m.saglik ? " Sağlık çalışanında 3. dozdan 8 hafta (en erken 4 hafta) sonra anti-HBs bakılır: ≥10 mIU/mL ise bağışık; <10 ise 3 dozluk seri tekrarlanır, 6 dozdan sonra da negatifse yanıtsız sayılır ve riskli temasta HBIG gerekir." : "") +
          (d.diyaliz ? " Hemodiyaliz hastasında her yıl anti-HBs bakılır; ≤10 mIU/mL ise pekiştirme dozu uygulanır." : ""), "Ücretsiz (risk grubu)");
      }
    }

    /* Hepatit A */
    var hepaRisk = !!(d.karaciger || d.hbvhcv || d.hiv || d.pihti || d.nakil || d.hsct || d.msm || m.kanal || m.atik || m.saglikalt);
    if (hepaRisk) {
      if (on.hepa === "tam") ekle("Hepatit A", "yok", "Hepatit A", "İki doz tamamlanmış.");
      else if (gebe && !(d.karaciger || d.hbvhcv || d.hiv)) ekle("Hepatit A", "kontra", "Hepatit A", "Gebelikte güvenli olduğuna dair kesin kanıt yoktur; yüksek enfeksiyon riski olmadıkça yapılmaz.");
      else ekle("Hepatit A", "simdi", "Hepatit A aşısı (2 doz)", "İki doz, aralarında en az 6 ay. Aşı öncesi antikor düzeyi değerlendirilir; kronik HBV/HCV'de mümkün olan en erken başlanır.", "Ücretsiz (risk grubu) ya da SUT kapsamında");
    }

    /* Pnömokok */
    if (yas >= 65 || yuksekPnomokok || kronikPnomokok) {
      var kpa = !!on.kpa, ppa = on.ppa || 0, ppaErken = !!on.ppa65oncesi;
      var arayuksek = yuksekPnomokok ? 8 : 52;
      var aralik = yuksekPnomokok ? "en az 8 hafta" : "en az 1 yıl";
      var kpaTar = g.sonKpa, ppaTar = g.sonPpa;
      var kpaSure = function (t) { return t ? enErken(gunEkle(t, arayuksek * 7)) : ""; };
      var sub = [];
      if (d.hsct) {
        ekle("Pnömokok", "plan", "Pnömokok (kök hücre nakli sonrası)", "Nakilden 6 ay sonra başlayarak 2'şer ay arayla 3 doz KPA13; nakilden 24 ay sonra graft versus host hastalığı yoksa PPA23.", "KPA13 ücretsiz; PPA23 SUT kapsamında");
      } else {
        if (!kpa && ppa === 0) {
          sub.push("Önce KPA13 (şimdi); ardından PPA23, KPA13'ten " + aralik + " sonra.");
        } else if (!kpa && ppa > 0) {
          sub.push("KPA13: son PPA23'ten en az 1 yıl sonra." + enErken(ppaTar ? ayEkle(ppaTar, 12) : null));
          if (yas >= 65 && ppaErken) sub.push("Ardından PPA23: KPA13'ten en az 1 yıl sonra ve önceki PPA23'ten en az 5 yıl sonra (65 yaş öncesi PPA23 yapılmış).");
        } else if (kpa && ppa === 0) {
          sub.push("PPA23: KPA13'ten " + aralik + " sonra." + kpaSure(kpaTar));
        } else if (kpa && ppa > 0 && yas >= 65 && ppaErken) {
          sub.push("PPA23: KPA13'ten en az 1 yıl sonra ve son PPA23'ten en az 5 yıl sonra (65 yaş öncesi PPA23 yapılmış).");
        }
        if (!sub.length) {
          ekle("Pnömokok", "yok", "Pnömokok", "KPA13 ve PPA23 şeması tamam." + (yuksekPnomokok ? " Bağışıklığı baskılı ya da aspleni gibi gruplarda PPA23 tekrar dozu gerekirse KPA13'ten en az 8 hafta sonra ve son PPA23'ten en az 5 yıl sonra uygulanır." : " Kronik kalp/akciğer/diyabet/karaciğer hastalığı ve alkolizmde PPA23 için tekrar doz gerekmez; 65 yaşında ya da sonrasında yapılan PPA23'ün tekrarı da gerekmez."));
        } else {
          ekle("Pnömokok", "simdi", "Pnömokok aşıları", sub.join(" ") +
            (!yuksekPnomokok && yas < 65 ? " Bağışıklığı baskılı olmayan kronik hastalıkta tek PPA23 yeterlidir, ancak önce KPA13 yapılırsa etkinlik artar." : "") +
            (d.aspleni ? " Splenektomi planlanıyorsa aşılar ameliyattan en az 2 hafta önce, ameliyat sonrasıysa en erken 2 hafta sonra yapılır." : "") +
            (d.koklear ? " Koklear implant planlanıyorsa pnömokok aşıları ameliyattan en az 2 hafta önce tamamlanır." : ""),
          "KPA13 ücretsiz; PPA23 yalnızca SUT'taki risk gruplarında reçete ile");
        }
      }
    } else {
      ekle("Pnömokok", "yok", "Pnömokok", "65 yaş altı, risk durumu seçilmedi: rutin pnömokok aşısı önerilmez.");
    }

    /* Meningokok */
    if (d.aspleni) {
      ekle("Meningokok", "simdi", "Meningokok ACWY (aspleni)", "18–55 yaşta en az 2 ay arayla 2 doz. Ardından 5 yıl sonra pekiştirme; risk sürüyorsa 5 yılda bir. Difteri toksoidi taşıyıcılı aşı 55 yaşına kadar, CRM197 ve tetanoz toksoidi taşıyıcılı aşılar üst yaş sınırı olmadan kullanılır.", "Ücretsiz (risk grubu)");
    }
    if (m.mikrolab) {
      ekle("Meningokok", "simdi", "Meningokok ACWY (laboratuvar personeli)", "Toplam 2 doz, 2 ay arayla; temas sürüyorsa 5 yılda bir tekrar.", "Ücretsiz (risk grubu)");
    }
    if (m.hac) {
      ekle("Meningokok", "plan", "Hac / umre için", "Dört bileşenli (ACYW135) konjuge meningokok aşısından en az 1 doz; Suudi Arabistan şart koşar. Ayrıca gitmeden en az 4 hafta önce OPA ve kayıtlı iki doz KKK yoksa KKK önerilir.");
    }

    /* Suçiçeği */
    var suc = on.sucicegi === "var";
    if (gebe) {
      if (!suc) ekle("Suçiçeği", "kontra", "Suçiçeği", "Canlı aşıdır, gebelikte yapılmaz.");
    } else if (!suc) {
      if (d.hsct) ekle("Suçiçeği", "plan", "Suçiçeği (kök hücre nakli sonrası)", "Nakilden en az 24 ay sonra, graft versus host hastalığı ve immünsüpresif ilaç yoksa 3 ay arayla 2 doz.", "Ücretsiz (risk grubu)");
      else if (d.immun) ekle("Suçiçeği", "kontra", "Suçiçeği", "Canlı aşıdır; bağışıklığı baskılı kişide kontrendikedir. Anti-TNF gibi tedavi başlanacaksa tedaviden önce yapılmalıdır.");
      else {
        var ek = [];
        if (d.antitnf) ek.push("anti-TNF vb. tedaviye başlanmadan önce");
        if (d.nakil) ek.push("nakil adayında tercihen nakilden 4 ay önce");
        if (m.saglik) ek.push("sağlık çalışanında önce antikor düzeyine bakılır");
        if (ek.length) ekle("Suçiçeği", "simdi", "Suçiçeği aşısı", "Suçiçeği geçirmemiş ya da aşılanmamışsa (" + ek.join("; ") + ") ≥13 yaşta bir ay (sağlık çalışanında en az 4 hafta) arayla 2 doz. Aşıdan sonra 6 hafta salisilattan kaçınılır.", "Ücretsiz (risk grubu)");
      }
    }

    /* Grip */
    var gripNedeni = [];
    if (yas >= 65) gripNedeni.push("65 yaş ve üzeri");
    if (gebe) gripNedeni.push("gebelik (her gebelikte tekrarlanır)");
    if (d.kalp || d.akciger || d.dm || d.kby || d.diyaliz || d.karaciger || d.immun || d.hiv || d.nakil || d.hsct || d.aspleni || d.kronikdiger) gripNedeni.push("kronik hastalık");
    if (saglikAny || m.atik) gripNedeni.push("meslek");
    if (d.huzurevi) gripNedeni.push("huzurevi / bakımevi");
    if (gripNedeni.length) {
      ekle("Grip", "simdi", "Mevsimsel influenza (her yıl)", "Yılda tek doz (" + gripNedeni.join(", ") + ")." + (gebe ? " Gebeliğin her döneminde yapılabilir." : "") +
        " Bedel: 65 yaş üstü ve huzurevinde kalanlarda belgelendirmeyle rapor aranmaz; kronik hastalıkta hastalığı belirten raporla tüm hekimlerce reçete edilir; gebelerde reçete ile ücretsiz; sağlık çalışanları için Bakanlık aşı temin eder.", "SUT / Bakanlık");
    }

    /* Hib, İPA */
    if (d.hsct) {
      ekle("Hib", "plan", "Hib (kök hücre nakli sonrası)", "Nakilden 6–12 ay sonra başlayarak en az 4 hafta arayla 3 doz.", "Ücretsiz (risk grubu)");
      ekle("İnaktif polio", "plan", "İPA (kök hücre nakli sonrası)", "Nakilden 6 ay sonra başlayarak 2'şer ay arayla 3 doz (İPA ya da İPA içeren aşı).", "Ücretsiz (risk grubu)");
    }
    if (d.aspleni) ekle("Hib", "simdi", "Hib (aspleni / orak hücre)", "Önceki aşılanmaya bakılmaksızın 1 doz; splenektomi planlanıyorsa ameliyattan en az 2 hafta önce (tercihen 6 hafta).", "Ücretsiz (risk grubu)");
    if (d.bos) ekle("Hib", "simdi", "Hib (BOS kaçağı)", "Önceki aşılanmaya bakılmaksızın 1 doz.", "Ücretsiz (risk grubu)");
    if (d.hiv) ekle("Hib", "yok", "Hib (HIV)", "HIV'li erişkinde Hib aşısı önerilmez.");
    if (d.immun && !d.hsct) ekle("İnaktif polio", "plan", "Polio", "Bağışıklık yetmezliği olanlarda ve aynı evde yaşayanlarda canlı OPA yerine İPA (önceki aşılanmaya göre en çok 3 doz) kullanılır.", "Ücretsiz (risk grubu)");
    if (m.hac) ekle("Polio", "plan", "Hac / umre için", "OPA, gitmeden mümkünse en az 4 hafta önce.");

    if (immunBask || d.immun) uyarilar.push("Canlı aşılar (KKK, suçiçeği, OPA) bağışıklığı baskılı kişide kontrendikedir; endikasyon varsa ilgili uzmanla zamanlama planlanır.");
    if (gebe) uyarilar.push("Gebelikte canlı aşılar (KKK, suçiçeği) yapılmaz.");
    return { liste: o, uyarilar: uyarilar };
  }

  /* ---------- kart ---------- */
  var CSS = ".asie [hidden]{display:none!important}" +
    ".asie fieldset{border:1px solid var(--line);border-radius:6px;margin:12px 0 0;padding:8px 12px 10px}" +
    ".asie legend{font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);padding:0 6px}" +
    ".asie .chk{display:flex;align-items:flex-start;gap:8px;margin:5px 0;font-size:14.5px;line-height:1.35}" +
    ".asie .chk input{margin-top:3px;accent-color:var(--pine)}" +
    ".asie .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px}" +
    ".asie .it{border:1px solid var(--line);border-left-width:4px;border-radius:6px;padding:9px 12px;margin:8px 0}" +
    ".asie .it.simdi{border-left-color:var(--pine)}.asie .it.plan{border-left-color:var(--brass)}.asie .it.kontra{border-left-color:#B3261E}.asie .it.yok{border-left-color:var(--line);color:var(--muted)}" +
    ".asie .it b{display:block}.asie .it small{display:block;color:var(--muted);margin-top:3px}" +
    ".asie .etk{font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;margin-right:6px}" +
    ".asie .uyari{color:#B3261E;font-weight:700;margin:10px 0}";
  var ETIKET = { simdi: "Şimdi", plan: "Planla", kontra: "Yapılmaz", yok: "Gerekmiyor" };

  function build(host) {
    var Ek = window.KanuniEk, el = Ek.el;
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    var form = el("form", "tool-body asie"); form.addEventListener("submit", function (e) { e.preventDefault(); });
    host.appendChild(form);

    function chk(name, label) { var l = el("label", "chk"); var c = document.createElement("input"); c.type = "checkbox"; c.name = name; l.appendChild(c); l.appendChild(el("span", null, label)); return l; }
    function sel(name, ad, opts) {
      var l = el("label", "fld"); l.appendChild(el("span", null, ad));
      var s = document.createElement("select"); s.name = name;
      opts.forEach(function (o) { var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; s.appendChild(op); });
      var w = el("span", "inp"); w.appendChild(s); l.appendChild(w); return l;
    }
    function dat(name, ad) {
      var l = el("label", "fld"); l.appendChild(el("span", null, ad));
      var i = document.createElement("input"); i.type = "date"; i.name = name; l.appendChild(i); return l;
    }

    var f0 = el("div", "fields");
    f0.appendChild(dat("dogum", "Doğum tarihi"));
    f0.appendChild(sel("cins", "Cinsiyet", [["", "Seçin"], ["k", "Kadın"], ["e", "Erkek"]]));
    form.appendChild(f0);
    var gebeBox = chk("gebe", "Gebe"); gebeBox.hidden = true; form.appendChild(gebeBox);

    function grup(ad, liste) { var fs = el("fieldset"); fs.appendChild(el("legend", null, ad)); liste.forEach(function (x) { fs.appendChild(chk(x[0], x[1])); }); form.appendChild(fs); return fs; }
    grup("Altta yatan hastalık ve durum", DURUM);
    var cdBox = sel("cd4", "HIV'li hastada CD4 sayısı", [["", "Bilinmiyor / yüksek"], ["yuksek", "200'ün üzerinde"], ["dusuk", "200 ve altında"]]); cdBox.hidden = true; form.appendChild(cdBox);
    grup("Meslek ve seyahat", MESLEK);

    var fs = el("fieldset"); fs.appendChild(el("legend", null, "Daha önce yapılanlar (ATS / aşı kartından)"));
    var gr = el("div", "grid");
    gr.appendChild(sel("td", "Td (tetanos-difteri)", [["hic", "Kayıt yok / bilinmiyor"], ["eksik", "Seri eksik (1–2 doz)"], ["tam10ustu", "Seri tamam, son doz 10 yıldan eski"], ["tam", "Seri tamam, son doz 10 yıl içinde"]]));
    gr.appendChild(sel("kkk", "KKK / kızamık", [["yok", "2 doz kaydı yok"], ["var", "2 doz kayıtlı, geçirmiş ya da bağışık"]]));
    gr.appendChild(sel("hepb", "Hepatit B", [["yok", "Yapılmamış / eksik"], ["tam", "3 doz tamamlanmış"]]));
    gr.appendChild(sel("hepa", "Hepatit A", [["yok", "Yapılmamış / eksik"], ["tam", "2 doz tamamlanmış"]]));
    gr.appendChild(sel("sucicegi", "Suçiçeği", [["yok", "Geçirmemiş / aşısız / bilinmiyor"], ["var", "Geçirmiş ya da 2 doz aşılı"]]));
    gr.appendChild(sel("kpa", "Konjuge pnömokok (KPA13)", [["0", "Yapılmamış / bilinmiyor"], ["1", "Yapılmış"]]));
    gr.appendChild(sel("ppa", "Polisakkarit pnömokok (PPA23)", [["0", "Yapılmamış / bilinmiyor"], ["1", "1 doz"], ["2", "2 doz ya da fazla"]]));
    gr.appendChild(sel("ppa65", "PPA23 hangi yaşta yapıldı?", [["0", "65 yaşında ya da sonrasında"], ["1", "65 yaşından önce"]]));
    gr.appendChild(dat("sonKpa", "Son KPA13 tarihi (isteğe bağlı)"));
    gr.appendChild(dat("sonPpa", "Son PPA23 tarihi (isteğe bağlı)"));
    fs.appendChild(gr); form.appendChild(fs);

    var out = el("div"); out.setAttribute("aria-live", "polite"); form.appendChild(out);

    function val(n) { var e = form.elements[n]; return e ? e.value : ""; }
    function on(n) { var e = form.elements[n]; return !!(e && e.checked); }

    function run() {
      var dogum = tarihOku(val("dogum")), bugun = new Date(); bugun.setHours(0, 0, 0, 0);
      gebeBox.hidden = !(val("cins") === "k" && dogum && yasHesap(dogum, bugun) >= 15 && yasHesap(dogum, bugun) <= 55);
      if (gebeBox.hidden && form.elements.gebe) form.elements.gebe.checked = false;
      cdBox.hidden = !on("hiv");
      out.innerHTML = "";
      if (!dogum) { out.appendChild(el("p", "hint", "Doğum tarihini girin; durum ve meslek seçeneklerini işaretleyin, öneriler anında oluşur.")); return; }
      var durum = {}, meslek = {};
      DURUM.forEach(function (x) { durum[x[0]] = on(x[0]); });
      MESLEK.forEach(function (x) { meslek[x[0]] = on(x[0]); });
      var yas = yasHesap(dogum, bugun);
      var r = planla({ yas: yas, kadin: val("cins") === "k", gebe: on("gebe"), durum: durum, meslek: meslek, cd4: val("cd4"),
        onceki: { td: val("td"), kkk: val("kkk"), hepb: val("hepb"), hepa: val("hepa"), sucicegi: val("sucicegi"), kpa: val("kpa") === "1", ppa: +val("ppa"), ppa65oncesi: val("ppa65") === "1" },
        sonKpa: tarihOku(val("sonKpa")), sonPpa: tarihOku(val("sonPpa")) });
      out.appendChild(el("p", "hint", yas + " yaşında. Bugün " + trTarih(bugun) + "."));
      r.uyarilar.forEach(function (u) { out.appendChild(el("p", "uyari", u)); });
      ["simdi", "plan", "kontra", "yok"].forEach(function (tur) {
        r.liste.filter(function (x) { return x.tur === tur; }).forEach(function (x) {
          var b = el("div", "it " + tur); var h = el("b"); h.appendChild(el("span", "etk", ETIKET[tur])); h.appendChild(document.createTextNode(x.baslik)); b.appendChild(h);
          b.appendChild(el("span", null, x.metin)); if (x.ucret) b.appendChild(el("small", null, x.ucret)); out.appendChild(b);
        });
      });
    }
    form.addEventListener("input", run); form.addEventListener("change", run);
    run();
  }

  var TOOL = {
    id: "asi-eriskin", g: "asi", t: "Erişkin ve risk grubu aşı planlayıcı",
    d: "Yaş, gebelik, hastalık, meslek ve önceki aşılara göre Td, KKK, hepatit A/B, pnömokok, grip, meningokok, suçiçeği, Hib önerileri.",
    kw: "aşı erişkin yetişkin risk grubu pnömokok kpa13 ppa23 hepatit b td tdap grip gebe sağlık çalışanı meningokok aspleni nakil hiv suçiçeği kkk",
    custom: build,
    src: [["T.C. Sağlık Bakanlığı Halk Sağlığı Kurumu, Risk Grubu Aşılamaları (Sayı 21001706) – şemalar", "https://www.antalyasm.gov.tr/DosyaIndir.ashx?Tip=4&Id=2135&U=.pdf&DosyaAd=Risk++Grubu+A%C5%9F%C4%B1lamalar%C4%B1+-+EKLER"],
          ["HSGM, Risk Grubu ve Sağlık Çalışanı Aşılamaları (Sayı 21001706-131.02) – üst yazı", "https://hsgm.saglik.gov.tr/depo/birimler/asi-ile-onlenebilir-hastaliklar-db/dokumanlar/Risk_Grubu_ve_Saglik.pdf"],
          ["HSGM, Sağlık Çalışanlarına Yönelik Uygulanması Gerekli Aşılar ve Uygulama Şemaları", "https://hsgm.saglik.gov.tr/tr/saglik-calisanlari-asilama.html"],
          ["Aşı Portalı – Erişkin Aşılama", "https://asi.saglik.gov.tr/kimlere-asi-yapilir/eriskin-asilama.html"],
          ["Aşı Portalı – Mesleğe Bağlı Riskler Nedeniyle Aşılama", "https://asi.saglik.gov.tr/kimlere-asi-yapilir/meslege-bagli-riskler-nedeniyle-asilama-2.html"],
          ["Sağlık Bakanlığı Erişkin Dönemi Aşı Uygulamaları (aşı kartı, 2026)", "https://hsgm.saglik.gov.tr/depo/birimler/asi-ile-onlenebilir-hastaliklar-db/dokumanlar/asi_karti_2026.pdf"]],
    note: "Şema metni, Bakanlığın risk grubu belgesinin (Sayı 21001706) bir il sağlık müdürlüğünde yayımlı, 2016 tarihli ekinden alınmıştır; belgenin üst yazısı 2018–2019'da Hib, meningokok, hepatit B ve konjuge pnömokok şemalarında değişiklik yapıldığını bildirir. Bu değişikliklerin ekleri bulunamadığı için aracın çıktısını güncel Bakanlık yazılarıyla doğrulayın. Kullanılan şema bölümleri: Hepatit A, Hepatit B, KKK, pnömokok, Hib, suçiçeği, İPA, aspleni, meningokok, influenza. Seyahat aşıları (sarı humma, kuduz vb.) bu araca dahil değildir. Aşı yapmadan önce ATS sorgulaması ve kontrendikasyon değerlendirmesi gerekir; öneri hekim kararının yerine geçmez."
  };

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    var go = function () { if (window.KanuniEk) window.KanuniEk.register([["asi", "Aşı"]], [TOOL]); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
  }
  if (typeof module !== "undefined") module.exports = { planla: planla, TOOL: TOOL };
})();
