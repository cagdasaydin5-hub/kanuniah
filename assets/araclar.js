/* Klinik hesaplayıcılar. Tüm hesaplar tarayıcıda yapılır; hiçbir değer sunucuya gönderilmez ya da saklanmaz. */
(function () {
  "use strict";

  /* ---------- yardımcılar ---------- */
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function fold(s) {
    return String(s || "").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
      .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function r(x, d) { var p = Math.pow(10, d || 0); return Math.round(x * p) / p; }
  function fmt(x, d) { return r(x, d).toLocaleString("tr-TR", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function num(v) { if (v === "" || v == null) return NaN; return parseFloat(String(v).replace(",", ".")); }
  function sum(v, keys) { return keys.reduce(function (a, k) { return a + (v[k] || 0); }, 0); }
  function band(x, rows) { for (var i = 0; i < rows.length; i++) if (x <= rows[i][0]) return rows[i]; return rows[rows.length - 1]; }
  function addMonths(d, m) { var x = new Date(d.getTime()); var day = x.getDate(); x.setMonth(x.getMonth() + m); if (x.getDate() < day) x.setDate(0); return x; }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function trDate(d) { return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" }); }
  function today() { var t = new Date(); t.setHours(0, 0, 0, 0); return t; }
  function parseDate(s) { if (!s) return null; var p = s.split("-"); var d = new Date(+p[0], +p[1] - 1, +p[2]); return isNaN(d) ? null : d; }

  var YN = [[0, "Hayır"], [1, "Evet"]];
  var SEX = [["K", "Kadın"], ["E", "Erkek"]];

  /* ---------- araç tanımları ----------
     alan türleri: num (sayı), sel (seçim; değer puan ya da kod), chk (onay kutusu; pts puan), date
     calc(v) -> {main, sub, level: 'ok'|'mid'|'high'|null, list:[..], warn} ya da null (eksik veri) */
  var GROUPS = [
    ["bobrek", "Böbrek & ölçüm"], ["kardiyo", "Kardiyovasküler & antikoagülasyon"], ["akut", "Akut & enfeksiyon"],
    ["metabolik", "Diyabet riski"], ["yasli", "Evde sağlık & yaşlı"], ["ruh", "Ruh sağlığı"],
    ["cocuk", "Çocuk & gebelik"], ["asi", "Aşı"]
  ];

  var TOOLS = [
    {
      id: "crcl", g: "bobrek", t: "Kreatinin klirensi (Cockcroft-Gault)",
      d: "İlaç doz ayarında kullanılan tahmini kreatinin klirensi.",
      kw: "crcl cockcroft gault böbrek doz ayarı doak kreatinin klirens",
      f: [{ id: "yas", k: "num", l: "Yaş", u: "yıl" }, { id: "kg", k: "num", l: "Kilo", u: "kg" },
          { id: "cr", k: "num", l: "Serum kreatinin", u: "mg/dL", step: "0.01" }, { id: "sex", k: "sel", l: "Cinsiyet", o: SEX }],
      calc: function (v) {
        if (!(v.yas > 0 && v.kg > 0 && v.cr > 0)) return null;
        var c = (140 - v.yas) * v.kg / (72 * v.cr) * (v.sex === "K" ? 0.85 : 1);
        return { main: fmt(c, 0) + " mL/dk", level: c < 30 ? "high" : c < 60 ? "mid" : "ok",
          sub: "Gerçek vücut ağırlığıyla hesaplandı. Belirgin obezitede ve kas kütlesi çok düşük yaşlıda sonuç yanıltıcı olabilir." };
      },
      src: [["Cockcroft DW, Gault MH. Nephron 1976;16:31–41", "https://pubmed.ncbi.nlm.nih.gov/1244564/"]]
    },
    {
      id: "egfr", g: "bobrek", t: "eGFR (CKD-EPI 2021, ırk katsayısız)",
      d: "Kronik böbrek hastalığı evrelemesi için tahmini GFR.",
      kw: "egfr ckd-epi gfr böbrek kbh evre kdigo",
      f: [{ id: "yas", k: "num", l: "Yaş", u: "yıl" }, { id: "cr", k: "num", l: "Serum kreatinin", u: "mg/dL", step: "0.01" },
          { id: "sex", k: "sel", l: "Cinsiyet", o: SEX }],
      calc: function (v) {
        if (!(v.yas >= 18 && v.cr > 0)) return null;
        var f = v.sex === "K", k = f ? 0.7 : 0.9, a = f ? -0.241 : -0.302;
        var e = 142 * Math.pow(Math.min(v.cr / k, 1), a) * Math.pow(Math.max(v.cr / k, 1), -1.2) * Math.pow(0.9938, v.yas) * (f ? 1.012 : 1);
        var st = band(-e, [[-90, "G1", "normal ya da yüksek"], [-60, "G2", "hafif azalmış"], [-45, "G3a", "hafif–orta azalmış"],
          [-30, "G3b", "orta–ağır azalmış"], [-15, "G4", "ağır azalmış"], [0, "G5", "böbrek yetmezliği"]]);
        return { main: fmt(e, 0) + " mL/dk/1,73 m²", level: e < 30 ? "high" : e < 60 ? "mid" : "ok",
          sub: "KDIGO evresi " + st[1] + " (" + st[2] + "). KBH tanısı için 3 aydan uzun süre ve albüminüri birlikte değerlendirilir." };
      },
      src: [["Inker LA ve ark. N Engl J Med 2021;385:1737–49", "https://pubmed.ncbi.nlm.nih.gov/34554658/"],
            ["KDIGO 2024 KBH kılavuzu", "https://kdigo.org/guidelines/ckd-evaluation-and-management/"]]
    },
    {
      id: "vki", g: "bobrek", t: "Vücut kitle indeksi ve vücut yüzey alanı",
      d: "VKİ sınıfı (DSÖ) ve Mosteller formülüyle vücut yüzey alanı.",
      kw: "vki bmi beden kitle obezite vya bsa yüzey alanı mosteller",
      f: [{ id: "kg", k: "num", l: "Kilo", u: "kg" }, { id: "cm", k: "num", l: "Boy", u: "cm" }],
      calc: function (v) {
        if (!(v.kg > 0 && v.cm > 0)) return null;
        var b = v.kg / Math.pow(v.cm / 100, 2), s = Math.sqrt(v.cm * v.kg / 3600);
        var c = band(b, [[18.49, "Zayıf", "mid"], [24.99, "Normal", "ok"], [29.99, "Fazla kilolu", "mid"], [34.99, "Obez, sınıf I", "high"],
          [39.99, "Obez, sınıf II", "high"], [1e9, "Obez, sınıf III", "high"]]);
        return { main: "VKİ " + fmt(b, 1) + " kg/m²", level: c[2], sub: c[1] + ". Vücut yüzey alanı " + fmt(s, 2) + " m²." };
      },
      src: [["DSÖ – Obezite sınıflaması", "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight"],
            ["Mosteller RD. N Engl J Med 1987;317:1098", "https://pubmed.ncbi.nlm.nih.gov/3657876/"]]
    },
    {
      id: "ca", g: "bobrek", t: "Albümine göre düzeltilmiş kalsiyum",
      d: "Hipoalbüminemide total kalsiyumun yorumlanması için.",
      kw: "kalsiyum düzeltilmiş albümin hiperkalsemi hipokalsemi",
      f: [{ id: "ca", k: "num", l: "Total kalsiyum", u: "mg/dL", step: "0.1" }, { id: "alb", k: "num", l: "Albümin", u: "g/dL", step: "0.1" }],
      calc: function (v) {
        if (!(v.ca > 0 && v.alb > 0)) return null;
        var c = v.ca + 0.8 * (4 - v.alb);
        return { main: fmt(c, 1) + " mg/dL", level: (c < 8.5 || c > 10.5) ? "mid" : "ok",
          sub: "Formül: Ca + 0,8 × (4 − albümin). Kesin değerlendirme gerekiyorsa iyonize kalsiyum ölçülmeli." };
      },
      src: [["Payne RB ve ark. Br Med J 1973;4:643–6", "https://pubmed.ncbi.nlm.nih.gov/4758544/"]]
    },
    {
      id: "cha2ds2va", g: "kardiyo", t: "CHA₂DS₂-VA (AF'de inme riski)",
      d: "ESC 2024 AF kılavuzunun önerdiği, cinsiyet puanı çıkarılmış skor.",
      kw: "cha2ds2va chads vasc af atriyal fibrilasyon inme antikoagülan oak",
      f: [{ id: "kkY", k: "chk", l: "Kalp yetersizliği ya da sol ventrikül sistolik disfonksiyonu", p: 1 },
          { id: "ht", k: "chk", l: "Hipertansiyon", p: 1 },
          { id: "yas", k: "sel", l: "Yaş", o: [[0, "65'in altı"], [1, "65–74"], [2, "75 ve üzeri"]] },
          { id: "dm", k: "chk", l: "Diyabet", p: 1 },
          { id: "inme", k: "chk", l: "İnme, TİA ya da arteriyel tromboemboli öyküsü", p: 2 },
          { id: "vask", k: "chk", l: "Vasküler hastalık (MI, periferik arter hastalığı, aort plağı)", p: 1 }],
      calc: function (v) {
        var s = sum(v, ["kkY", "ht", "yas", "dm", "inme", "vask"]);
        if (s >= 2) return { main: s + " puan", level: "high", sub: "Oral antikoagülan önerilir (ESC 2024, sınıf I)." };
        if (s === 1) return { main: "1 puan", level: "mid", sub: "Oral antikoagülan düşünülmeli (ESC 2024, sınıf IIa); hasta tercihi ve kanama riskiyle birlikte karar verin." };
        return { main: "0 puan", level: "ok", sub: "İnme riski düşük; antikoagülan genellikle gerekmez. Risk faktörleri değiştikçe yeniden hesaplayın." };
      },
      src: [["ESC 2024 Atriyal Fibrilasyon Kılavuzu", "https://www.escardio.org/Guidelines/Clinical-Practice-Guidelines/Atrial-Fibrillation"]]
    },
    {
      id: "hasbled", g: "kardiyo", t: "HAS-BLED (antikoagülanda kanama riski)",
      d: "Kanama riskini ve düzeltilebilir risk faktörlerini belirlemek için.",
      kw: "hasbled has-bled kanama riski varfarin antikoagülan",
      f: [{ id: "h", k: "chk", l: "Kontrolsüz hipertansiyon (sistolik > 160 mmHg)", p: 1 },
          { id: "b", k: "chk", l: "Anormal böbrek fonksiyonu (diyaliz, nakil ya da kreatinin > 2,26 mg/dL)", p: 1 },
          { id: "k", k: "chk", l: "Anormal karaciğer fonksiyonu (siroz ya da bilirubin > 2 kat, AST/ALT > 3 kat)", p: 1 },
          { id: "s", k: "chk", l: "İnme öyküsü", p: 1 },
          { id: "bl", k: "chk", l: "Majör kanama öyküsü ya da kanamaya yatkınlık", p: 1 },
          { id: "l", k: "chk", l: "Değişken INR (terapötik aralıkta kalma < %60)", p: 1 },
          { id: "e", k: "chk", l: "Yaş 65'in üzerinde", p: 1 },
          { id: "d", k: "chk", l: "Antiplatelet ya da NSAİİ kullanımı", p: 1 },
          { id: "a", k: "chk", l: "Alkol (haftada 8 birim ve üzeri)", p: 1 }],
      calc: function (v) {
        var s = sum(v, ["h", "b", "k", "s", "bl", "l", "e", "d", "a"]);
        return { main: s + " puan", level: s >= 3 ? "high" : s === 2 ? "mid" : "ok",
          sub: (s >= 3 ? "Yüksek kanama riski: " : "") + "Yüksek skor tek başına antikoagülanı kesme nedeni değildir; kontrolsüz tansiyon, NSAİİ, alkol ve değişken INR gibi düzeltilebilir etkenleri ele alın, izlemi sıklaştırın." };
      },
      src: [["Pisters R ve ark. Chest 2010;138:1093–100", "https://pubmed.ncbi.nlm.nih.gov/20299623/"]]
    },
    {
      id: "wellsdvt", g: "kardiyo", t: "Wells skoru – derin ven trombozu",
      d: "DVT ön test olasılığı.",
      kw: "wells dvt derin ven trombozu d-dimer",
      f: [{ id: "a", k: "chk", l: "Aktif kanser (son 6 ayda tedavi ya da palyatif)", p: 1 },
          { id: "b", k: "chk", l: "Alt ekstremitede felç, parezi ya da yakın zamanda alçı", p: 1 },
          { id: "c", k: "chk", l: "3 günden uzun yatak istirahati ya da son 12 haftada büyük cerrahi", p: 1 },
          { id: "d", k: "chk", l: "Derin venöz sistem boyunca lokal hassasiyet", p: 1 },
          { id: "e", k: "chk", l: "Tüm bacakta şişlik", p: 1 },
          { id: "f", k: "chk", l: "Baldır çevresi karşı taraftan 3 cm'den fazla", p: 1 },
          { id: "g", k: "chk", l: "Yalnız semptomatik bacakta gode bırakan ödem", p: 1 },
          { id: "h", k: "chk", l: "Kollateral yüzeyel venler (varis değil)", p: 1 },
          { id: "i", k: "chk", l: "Daha önce belgelenmiş DVT", p: 1 },
          { id: "j", k: "chk", l: "DVT kadar olası başka bir tanı var", p: -2 }],
      calc: function (v) {
        var s = sum(v, ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]);
        return s >= 2 ? { main: s + " puan – DVT olası", level: "high", sub: "Doppler ultrasonografi ile değerlendirme önerilir." }
          : { main: s + " puan – DVT olası değil", level: "ok", sub: "D-dimer negatifse DVT büyük olasılıkla dışlanır; pozitifse görüntüleme gerekir." };
      },
      src: [["Wells PS ve ark. N Engl J Med 2003;349:1227–35", "https://pubmed.ncbi.nlm.nih.gov/14507948/"]]
    },
    {
      id: "wellspe", g: "kardiyo", t: "Wells skoru – pulmoner emboli",
      d: "PE ön test olasılığı (iki basamaklı yorum).",
      kw: "wells pe pulmoner emboli d-dimer",
      f: [{ id: "a", k: "chk", l: "DVT'nin klinik bulguları", p: 3 },
          { id: "b", k: "chk", l: "PE en olası tanı", p: 3 },
          { id: "c", k: "chk", l: "Nabız > 100/dk", p: 1.5 },
          { id: "d", k: "chk", l: "Son 4 haftada immobilizasyon (≥ 3 gün) ya da cerrahi", p: 1.5 },
          { id: "e", k: "chk", l: "Daha önce DVT ya da PE", p: 1.5 },
          { id: "f", k: "chk", l: "Hemoptizi", p: 1 },
          { id: "g", k: "chk", l: "Aktif kanser", p: 1 }],
      calc: function (v) {
        var s = sum(v, ["a", "b", "c", "d", "e", "f", "g"]);
        return s > 4 ? { main: fmt(s, 1) + " puan – PE olası", level: "high", sub: "Acil değerlendirme ve BT anjiyografi için sevk." }
          : { main: fmt(s, 1) + " puan – PE olası değil", level: "ok", sub: "D-dimer ile dışlama yoluna gidilebilir; pozitifse görüntüleme gerekir." };
      },
      src: [["Wells PS ve ark. Thromb Haemost 2000;83:416–20", "https://pubmed.ncbi.nlm.nih.gov/10744147/"]]
    },
    {
      id: "curb65", g: "akut", t: "CRB-65 / CURB-65 (toplum kökenli pnömoni)",
      d: "Birinci basamakta laboratuvarsız CRB-65; üre varsa CURB-65.",
      kw: "curb65 crb65 pnömoni zatürre yatış",
      f: [{ id: "c", k: "chk", l: "Yeni gelişen bilinç bulanıklığı", p: 1 },
          { id: "u", k: "chk", l: "Üre > 42 mg/dL (BUN > 19 mg/dL; 7 mmol/L) – ölçüldüyse", p: 1 },
          { id: "r", k: "chk", l: "Solunum sayısı ≥ 30/dk", p: 1 },
          { id: "b", k: "chk", l: "Sistolik < 90 ya da diyastolik ≤ 60 mmHg", p: 1 },
          { id: "y", k: "chk", l: "Yaş ≥ 65", p: 1 }],
      calc: function (v) {
        var crb = sum(v, ["c", "r", "b", "y"]), curb = crb + (v.u || 0);
        var t1 = crb === 0 ? "CRB-65 = 0: düşük risk, genellikle ayaktan tedavi." :
          crb <= 2 ? "CRB-65 = " + crb + ": hastanede değerlendirme düşünülmeli." : "CRB-65 = " + crb + ": yüksek risk, acil hastane yatışı.";
        var t2 = curb <= 1 ? "düşük risk" : curb === 2 ? "orta risk, kısa yatış ya da yakın izlem" : "ağır pnömoni; 4–5 puanda yoğun bakım değerlendirmesi";
        return { main: "CRB-65 " + crb + " · CURB-65 " + curb, level: crb >= 3 || curb >= 3 ? "high" : crb >= 1 || curb === 2 ? "mid" : "ok",
          sub: t1 + " CURB-65 (üre işaretlendiyse): " + t2 + "." };
      },
      src: [["Lim WS ve ark. Thorax 2003;58:377–82", "https://pubmed.ncbi.nlm.nih.gov/12728155/"],
            ["BTS Toplum Kökenli Pnömoni Kılavuzu", "https://www.brit-thoracic.org.uk/quality-improvement/guidelines/pneumonia-adults/"]]
    },
    {
      id: "qsofa", g: "akut", t: "qSOFA (sepsis şüphesinde kötü seyir riski)",
      d: "Enfeksiyon şüphesi olan hastada hızlı yatak başı tarama.",
      kw: "qsofa sepsis enfeksiyon",
      f: [{ id: "a", k: "chk", l: "Solunum sayısı ≥ 22/dk", p: 1 },
          { id: "b", k: "chk", l: "Bilinç değişikliği", p: 1 },
          { id: "c", k: "chk", l: "Sistolik kan basıncı ≤ 100 mmHg", p: 1 }],
      calc: function (v) {
        var s = sum(v, ["a", "b", "c"]);
        return { main: s + " puan", level: s >= 2 ? "high" : s === 1 ? "mid" : "ok",
          sub: s >= 2 ? "Kötü seyir riski yüksek: acil değerlendirme ve sevk." : "Negatif qSOFA sepsisi dışlamaz; klinik şüphe sürüyorsa değerlendirmeyi tekrarlayın." };
      },
      src: [["Seymour CW ve ark. JAMA 2016;315:762–74", "https://pubmed.ncbi.nlm.nih.gov/26903335/"]]
    },
    {
      id: "findrisc", g: "metabolik", t: "FINDRISC (10 yıllık tip 2 diyabet riski)",
      d: "Laboratuvarsız diyabet risk taraması.",
      kw: "findrisc diyabet risk tarama tip 2 prediyabet",
      f: [{ id: "yas", k: "sel", l: "Yaş", o: [[0, "45'in altı"], [2, "45–54"], [3, "55–64"], [4, "64'ün üzeri"]] },
          { id: "vki", k: "sel", l: "VKİ", o: [[0, "25'in altı"], [1, "25–30"], [3, "30'un üzeri"]] },
          { id: "bel", k: "sel", l: "Bel çevresi", o: [[0, "E < 94 / K < 80 cm"], [3, "E 94–102 / K 80–88 cm"], [4, "E > 102 / K > 88 cm"]] },
          { id: "fa", k: "sel", l: "Günde en az 30 dk fiziksel aktivite", o: [[0, "Evet"], [2, "Hayır"]] },
          { id: "sebze", k: "sel", l: "Her gün sebze-meyve", o: [[0, "Evet"], [1, "Hayır"]] },
          { id: "ht", k: "sel", l: "Tansiyon ilacı kullanıyor", o: [[0, "Hayır"], [2, "Evet"]] },
          { id: "gl", k: "sel", l: "Daha önce yüksek kan şekeri saptanmış", o: [[0, "Hayır"], [5, "Evet"]] },
          { id: "aile", k: "sel", l: "Ailede diyabet", o: [[0, "Yok"], [3, "İkinci derece (büyükanne-baba, hala, teyze, amca, dayı, kuzen)"], [5, "Birinci derece (anne, baba, kardeş, çocuk)"]] }],
      calc: function (v) {
        var s = sum(v, ["yas", "vki", "bel", "fa", "sebze", "ht", "gl", "aile"]);
        var b = band(s, [[6, "Düşük: yaklaşık 100'de 1", "ok"], [11, "Hafif artmış: yaklaşık 25'te 1", "ok"], [14, "Orta: yaklaşık 6'da 1", "mid"],
          [20, "Yüksek: yaklaşık 3'te 1", "high"], [99, "Çok yüksek: yaklaşık 2'de 1", "high"]]);
        return { main: s + " puan", level: b[2], sub: "10 yılda tip 2 diyabet riski – " + b[1] + "." + (s >= 12 ? " Açlık glukozu ya da HbA1c ile değerlendirme önerilir." : "") };
      },
      src: [["Lindström J, Tuomilehto J. Diabetes Care 2003;26:725–31", "https://pubmed.ncbi.nlm.nih.gov/12610029/"]]
    },
    {
      id: "braden", g: "yasli", t: "Braden (basınç yarası riski)",
      d: "Evde ve yatan hastada basınç yarası risk değerlendirmesi.",
      kw: "braden basınç yarası bası yarası dekübit risk evde sağlık",
      f: [{ id: "a", k: "sel", l: "Duyusal algılama", o: [[1, "1 – Tamamen kısıtlı"], [2, "2 – Çok kısıtlı"], [3, "3 – Hafif kısıtlı"], [4, "4 – Kısıtlılık yok"]], def: 4 },
          { id: "b", k: "sel", l: "Nem", o: [[1, "1 – Sürekli nemli"], [2, "2 – Çok nemli"], [3, "3 – Ara sıra nemli"], [4, "4 – Nadiren nemli"]], def: 4 },
          { id: "c", k: "sel", l: "Aktivite", o: [[1, "1 – Yatağa bağımlı"], [2, "2 – Sandalyeye bağımlı"], [3, "3 – Ara sıra yürüyor"], [4, "4 – Sık yürüyor"]], def: 4 },
          { id: "d", k: "sel", l: "Hareket", o: [[1, "1 – Tamamen hareketsiz"], [2, "2 – Çok kısıtlı"], [3, "3 – Hafif kısıtlı"], [4, "4 – Kısıtlılık yok"]], def: 4 },
          { id: "e", k: "sel", l: "Beslenme", o: [[1, "1 – Çok yetersiz"], [2, "2 – Muhtemelen yetersiz"], [3, "3 – Yeterli"], [4, "4 – Çok iyi"]], def: 4 },
          { id: "f", k: "sel", l: "Sürtünme ve kayma", o: [[1, "1 – Sorun var"], [2, "2 – Olası sorun"], [3, "3 – Belirgin sorun yok"]], def: 3 }],
      calc: function (v) {
        var s = sum(v, ["a", "b", "c", "d", "e", "f"]);
        var b = band(s, [[9, "Çok yüksek risk", "high"], [12, "Yüksek risk", "high"], [14, "Orta risk", "mid"], [18, "Hafif risk", "mid"], [23, "Risk saptanmadı", "ok"]]);
        return { main: s + " puan – " + b[1], level: b[2], sub: "Puan düştükçe risk artar. Düşük alt puanlar (ör. nem, beslenme) hangi önlemin öncelikli olduğunu gösterir." };
      },
      src: [["Bergstrom N ve ark. Nurs Res 1987;36:205–10", "https://pubmed.ncbi.nlm.nih.gov/3299278/"],
            ["EPUAP/NPIAP/PPPIA Kılavuzu 2025", "https://internationalguideline.com/"]]
    },
    {
      id: "barthel", g: "yasli", t: "Barthel Günlük Yaşam Aktiviteleri İndeksi",
      d: "Fonksiyonel bağımlılık düzeyi (0–100).",
      kw: "barthel gya günlük yaşam aktiviteleri bağımlılık evde sağlık",
      f: [{ id: "a", k: "sel", l: "Beslenme", o: [[0, "Bağımlı"], [5, "Yardımla"], [10, "Bağımsız"]], def: 10 },
          { id: "b", k: "sel", l: "Banyo", o: [[0, "Bağımlı"], [5, "Bağımsız"]], def: 5 },
          { id: "c", k: "sel", l: "Kişisel bakım (yüz, saç, diş, tıraş)", o: [[0, "Yardıma muhtaç"], [5, "Bağımsız"]], def: 5 },
          { id: "d", k: "sel", l: "Giyinme", o: [[0, "Bağımlı"], [5, "Yardımla"], [10, "Bağımsız"]], def: 10 },
          { id: "e", k: "sel", l: "Bağırsak kontrolü", o: [[0, "İnkontinans"], [5, "Ara sıra kaçırma"], [10, "Kontinan"]], def: 10 },
          { id: "f", k: "sel", l: "Mesane kontrolü", o: [[0, "İnkontinans ya da kateter"], [5, "Ara sıra kaçırma"], [10, "Kontinan"]], def: 10 },
          { id: "g", k: "sel", l: "Tuvalet kullanımı", o: [[0, "Bağımlı"], [5, "Yardımla"], [10, "Bağımsız"]], def: 10 },
          { id: "h", k: "sel", l: "Yatak–sandalye transferi", o: [[0, "Yapamıyor"], [5, "Çok yardımla"], [10, "Az yardımla"], [15, "Bağımsız"]], def: 15 },
          { id: "i", k: "sel", l: "Mobilite (düz zeminde)", o: [[0, "Hareketsiz"], [5, "Tekerlekli sandalyeyle bağımsız"], [10, "Yardımla yürüyor"], [15, "Bağımsız"]], def: 15 },
          { id: "j", k: "sel", l: "Merdiven", o: [[0, "Çıkamıyor"], [5, "Yardımla"], [10, "Bağımsız"]], def: 10 }],
      calc: function (v) {
        var s = sum(v, ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]);
        var b = band(s, [[20, "Tam bağımlı", "high"], [60, "İleri derecede bağımlı", "high"], [90, "Orta derecede bağımlı", "mid"], [99, "Hafif bağımlı", "mid"], [100, "Bağımsız", "ok"]]);
        return { main: s + " / 100 – " + b[1], level: b[2], sub: "Yorum aralıkları Shah ve ark. (1989) sınıflamasına göredir." };
      },
      src: [["Mahoney FI, Barthel DW. Md State Med J 1965;14:61–5", "https://pubmed.ncbi.nlm.nih.gov/14258950/"],
            ["Shah S ve ark. J Clin Epidemiol 1989;42:703–9", "https://pubmed.ncbi.nlm.nih.gov/2760661/"]]
    },
    {
      id: "katz", g: "yasli", t: "Katz Günlük Yaşam Aktiviteleri",
      d: "Altı temel aktivitede bağımsızlık.",
      kw: "katz gya bağımsızlık yaşlı değerlendirme",
      f: [{ id: "a", k: "chk", l: "Banyo – bağımsız", p: 1 }, { id: "b", k: "chk", l: "Giyinme – bağımsız", p: 1 },
          { id: "c", k: "chk", l: "Tuvalete gitme – bağımsız", p: 1 }, { id: "d", k: "chk", l: "Transfer (yatak/sandalye) – bağımsız", p: 1 },
          { id: "e", k: "chk", l: "Kontinans – tam", p: 1 }, { id: "f", k: "chk", l: "Beslenme – bağımsız", p: 1 }],
      calc: function (v) {
        var s = sum(v, ["a", "b", "c", "d", "e", "f"]);
        return { main: s + " / 6", level: s <= 2 ? "high" : s < 6 ? "mid" : "ok",
          sub: s === 6 ? "Tam bağımsız." : s <= 2 ? "Ağır fonksiyonel bağımlılık." : "Kısmi bağımlılık; eksik alanlara yönelik destek planlayın." };
      },
      src: [["Katz S ve ark. JAMA 1963;185:914–9", "https://pubmed.ncbi.nlm.nih.gov/14044222/"]]
    },
    {
      id: "morse", g: "yasli", t: "Morse Düşme Ölçeği",
      d: "Düşme riski değerlendirmesi.",
      kw: "morse düşme riski yaşlı evde sağlık",
      f: [{ id: "a", k: "sel", l: "Son 3 ayda düşme öyküsü", o: [[0, "Yok"], [25, "Var"]] },
          { id: "b", k: "sel", l: "Birden fazla tıbbi tanı", o: [[0, "Yok"], [15, "Var"]] },
          { id: "c", k: "sel", l: "Yürümeye yardımcı", o: [[0, "Yok / yatak istirahati / hemşire yardımı"], [15, "Koltuk değneği, baston, yürüteç"], [30, "Eşyalara tutunarak yürüyor"]] },
          { id: "d", k: "sel", l: "Damar yolu / heparin kilidi", o: [[0, "Yok"], [20, "Var"]] },
          { id: "e", k: "sel", l: "Yürüyüş", o: [[0, "Normal / yatak istirahati / tekerlekli sandalye"], [10, "Zayıf"], [20, "Bozuk"]] },
          { id: "f", k: "sel", l: "Mental durum", o: [[0, "Kendi kısıtlılığının farkında"], [15, "Kısıtlılığını unutuyor, abartıyor"]] }],
      calc: function (v) {
        var s = sum(v, ["a", "b", "c", "d", "e", "f"]);
        var b = band(s, [[24, "Düşük risk", "ok"], [44, "Orta risk", "mid"], [125, "Yüksek risk", "high"]]);
        return { main: s + " puan – " + b[1], level: b[2], sub: "Kesme noktaları kurumdan kuruma değişebilir; en sık kullanılan 25 ve 45 eşikleri uygulanmıştır." };
      },
      src: [["AHRQ Düşme Önleme Araç Seti – Morse Düşme Ölçeği", "https://www.ahrq.gov/patient-safety/settings/hospital/fall-prevention/toolkit/morse-fall-scale.html"]]
    },
    {
      id: "gds15", g: "ruh", t: "Geriatrik Depresyon Ölçeği – kısa form (GDS-15)",
      d: "Yaşlıda depresyon taraması. Sorular hastaya okunur, evet/hayır yanıtı alınır.",
      kw: "gds geriatrik depresyon yaşlı tarama",
      f: [["Genel olarak hayatınızdan memnun musunuz?", 0], ["Etkinliklerinizin ve ilgi alanlarınızın çoğunu bıraktınız mı?", 1],
          ["Hayatınızın boş olduğunu hissediyor musunuz?", 1], ["Sık sık sıkılır mısınız?", 1],
          ["Çoğu zaman keyfiniz yerinde mi?", 0], ["Başınıza kötü bir şey geleceğinden korkuyor musunuz?", 1],
          ["Çoğu zaman kendinizi mutlu hissediyor musunuz?", 0], ["Sık sık kendinizi çaresiz hissediyor musunuz?", 1],
          ["Dışarı çıkıp yeni şeyler yapmak yerine evde kalmayı mı tercih edersiniz?", 1], ["Hafızanızla ilgili, çoğu kişiden daha fazla sorununuz olduğunu düşünüyor musunuz?", 1],
          ["Şu anda yaşıyor olmanın harika bir şey olduğunu düşünüyor musunuz?", 0], ["Şu anki halinizle kendinizi değersiz hissediyor musunuz?", 1],
          ["Kendinizi enerji dolu hissediyor musunuz?", 0], ["Durumunuzun umutsuz olduğunu düşünüyor musunuz?", 1],
          ["Çoğu insanın sizden daha iyi durumda olduğunu düşünüyor musunuz?", 1]
        ].map(function (q, i) { return { id: "q" + i, k: "sel", l: (i + 1) + ". " + q[0], o: [["", "—"], ["E", "Evet"], ["H", "Hayır"]], dep: q[1] }; }),
      calc: function (v, tool) {
        var s = 0, n = 0;
        tool.f.forEach(function (q) { var a = v[q.id]; if (a === "E" || a === "H") { n++; if ((a === "E") === (q.dep === 1)) s++; } });
        if (n < 15) return { main: s + " puan (" + n + "/15 yanıt)", level: null, sub: "Tüm sorular yanıtlanınca yorum görünür." };
        return { main: s + " / 15", level: s >= 10 ? "high" : s > 5 ? "mid" : "ok",
          sub: s > 5 ? "Depresyon lehine (> 5); klinik görüşmeyle değerlendirin." + (s >= 10 ? " 10 ve üzeri puan büyük olasılıkla depresyonu gösterir." : "") : "Tarama negatif." };
      },
      src: [["Stanford – Geriatric Depression Scale (kamu malı)", "https://web.stanford.edu/~yesavage/GDS.html"],
            ["Yesavage JA ve ark. J Psychiatr Res 1982;17:37–49", "https://pubmed.ncbi.nlm.nih.gov/7183759/"]],
      note: "Soru metinleri bu site için Türkçeleştirilmiştir; araştırmada geçerliği gösterilmiş Türkçe sürümü kullanın."
    },
    {
      id: "phq9", g: "ruh", t: "PHQ-9 (depresyon şiddeti)",
      d: "Son 2 haftada her sorunun ne sıklıkla yaşandığı sorulur.",
      kw: "phq9 phq-9 depresyon tarama şiddet",
      f: ["İş yapmaya karşı az ilgi ya da zevk alma", "Kendini çökkün, depresif ya da umutsuz hissetme",
          "Uykuya dalmada ya da uykuyu sürdürmede güçlük ya da çok fazla uyuma", "Yorgun hissetme ya da enerjinin az olması",
          "İştahsızlık ya da aşırı yeme", "Kendini kötü hissetme; başarısız olduğunu ya da kendini veya aileni hayal kırıklığına uğrattığını düşünme",
          "Gazete okuma ya da televizyon izleme gibi şeylere odaklanmada güçlük",
          "Başkalarının fark edeceği kadar yavaş hareket etme ya da konuşma; ya da tersine, çok kıpır kıpır ve huzursuz olma",
          "Ölmüş olmanın daha iyi olacağı ya da kendine bir şekilde zarar verme düşünceleri"
        ].map(function (q, i) { return { id: "q" + i, k: "sel", l: (i + 1) + ". " + q, o: [[0, "0 – Hiç"], [1, "1 – Birkaç gün"], [2, "2 – Günlerin yarısından fazlası"], [3, "3 – Neredeyse her gün"]] }; }),
      calc: function (v) {
        var s = 0; for (var i = 0; i < 9; i++) s += v["q" + i] || 0;
        var b = band(s, [[4, "Minimal", "ok"], [9, "Hafif", "mid"], [14, "Orta", "mid"], [19, "Orta-ağır", "high"], [27, "Ağır", "high"]]);
        return { main: s + " / 27 – " + b[1], level: b[2], sub: "10 ve üzeri puan majör depresyon için anlamlı kabul edilir.",
          warn: v.q8 > 0 ? "9. soru pozitif: intihar düşüncesi aynı görüşmede ayrıca ve ayrıntılı değerlendirilmeli." : null };
      },
      src: [["Kroenke K ve ark. J Gen Intern Med 2001;16:606–13", "https://pubmed.ncbi.nlm.nih.gov/11556941/"]],
      note: "PHQ-9 izin gerektirmeden kullanılabilir. Soru metinleri bu site için Türkçeleştirilmiştir."
    },
    {
      id: "holliday", g: "cocuk", t: "Günlük idame sıvı ihtiyacı (Holliday-Segar)",
      d: "Kiloya göre günlük ve saatlik idame sıvısı (4-2-1 kuralı).",
      kw: "holliday segar sıvı idame 4-2-1 çocuk hidrasyon",
      f: [{ id: "kg", k: "num", l: "Kilo", u: "kg", step: "0.1" }],
      calc: function (v) {
        if (!(v.kg > 0)) return null;
        var k = v.kg, g = k <= 10 ? 100 * k : k <= 20 ? 1000 + 50 * (k - 10) : 1500 + 20 * (k - 20);
        var h = k <= 10 ? 4 * k : k <= 20 ? 40 + 2 * (k - 10) : 60 + (k - 20);
        return { main: fmt(g, 0) + " mL/gün · " + fmt(h, 0) + " mL/saat", level: null,
          sub: "Sağlıklı idame ihtiyacıdır; açık, süregen kayıp, ateş, böbrek ya da kalp hastalığında ayrıca hesaplanmalı." };
      },
      src: [["Holliday MA, Segar WE. Pediatrics 1957;19:823–32", "https://pubmed.ncbi.nlm.nih.gov/13431307/"]]
    },
    {
      id: "gebelik", g: "cocuk", t: "Gebelik haftası ve tahmini doğum tarihi",
      d: "Son adet tarihine göre (Naegele: SAT + 280 gün).",
      kw: "gebelik haftası tdt doğum tarihi sat son adet naegele",
      f: [{ id: "sat", k: "date", l: "Son adet tarihinin ilk günü" }],
      calc: function (v) {
        var s = parseDate(v.sat); if (!s) return null;
        var t = today(), gun = Math.round((t - s) / 864e5), tdt = addDays(s, 280);
        if (gun < 0) return { main: "Tarih ileride", level: "mid", sub: "Son adet tarihini kontrol edin." };
        var hf = Math.floor(gun / 7), g = gun % 7, tri = hf < 14 ? "1. trimester" : hf < 28 ? "2. trimester" : "3. trimester";
        return { main: hf + " hafta " + g + " gün", level: hf >= 42 ? "high" : null,
          sub: tri + ". Tahmini doğum tarihi: " + trDate(tdt) + ". Düzensiz siklusta ya da SAT belirsizse erken dönem USG (CRL) esas alınır." };
      },
      src: [["Doğum Öncesi Bakım Yönetim Rehberi (Sağlık Bakanlığı)", "https://platform.who.int/docs/default-source/mca-documents/policy-documents/guideline/TUR-MN-21-01-GUIDELINE-2018-tur-Antenatal-Care-Management-Guidelines.pdf"]]
    }
  ];

  /* ---------- aşı planlayıcı (Ulusal Çocukluk Dönemi Aşılama Takvimi, 1 Eylül 2026) ---------- */
  var ASI = [
    ["Hepatit B", "1. doz", 0], ["BCG (verem)", "1. doz", 2],
    ["Konjuge pnömokok (KPA)", "1. doz", 2], ["Konjuge pnömokok (KPA)", "2. doz", 4], ["Konjuge pnömokok (KPA)", "Rapel", 12],
    ["6'lı karma (DaBT-İPA-Hib-HepB)", "1. doz", 2], ["6'lı karma (DaBT-İPA-Hib-HepB)", "2. doz", 4],
    ["6'lı karma (DaBT-İPA-Hib-HepB)", "3. doz", 6], ["6'lı karma (DaBT-İPA-Hib-HepB)", "Rapel", 18],
    ["Oral polio (OPA)", "1. doz", 6], ["Oral polio (OPA)", "2. doz", 18],
    ["KKK (kızamık-kızamıkçık-kabakulak)", "Ek doz", 9], ["KKK (kızamık-kızamıkçık-kabakulak)", "1. doz", 12], ["KKK (kızamık-kızamıkçık-kabakulak)", "2. doz", 48],
    ["Suçiçeği", "1. doz", 12], ["Suçiçeği", "2. doz", 48],
    ["Hepatit A", "1. doz", 18], ["Hepatit A", "2. doz", 24],
    ["DaBT-İPA", "Rapel", 48], ["Td (erişkin tetanoz-difteri)", "Rapel", 156]
  ];
  function ayYazi(m) { return m === 0 ? "Doğumda" : m === 156 ? "13 yaş" : m === 48 ? "48. ay" : m + ". ay sonu"; }

  function buildAsi(host) {
    var box = el("div", "tool-body");
    var row = el("div", "fields");
    var lab = el("label", "fld"); lab.appendChild(el("span", null, "Doğum tarihi"));
    var inp = document.createElement("input"); inp.type = "date"; inp.id = "asi-dt"; lab.appendChild(inp); row.appendChild(lab);
    box.appendChild(row);
    var out = el("div", "asi-out"); box.appendChild(out);
    function draw() {
      out.innerHTML = "";
      var dt = parseDate(inp.value); if (!dt) { out.appendChild(el("p", "hint", "Doğum tarihini girin; takvimdeki tüm dozların tarihi listelenir. Yapılan dozları işaretleyin, zamanı geçmiş olanlar kırmızıyla görünür.")); return; }
      var t = today(), ayGun = Math.floor((t - dt) / 864e5);
      out.appendChild(el("p", "hint", "Bugün " + Math.floor(ayGun / 30.4375) + " aylık (" + ayGun + " gün). Kutucuklar yalnızca bu ekranda tutulur, hiçbir yere kaydedilmez."));
      var tb = el("table", "asi"); var th = el("thead"); var tr = el("tr");
      ["Yapıldı", "Aşı", "Doz", "Zamanı", "Tarih", "Durum"].forEach(function (h) { tr.appendChild(el("th", null, h)); }); th.appendChild(tr); tb.appendChild(th);
      var tbody = el("tbody"); var gec = 0;
      ASI.forEach(function (a, i) {
        var due = addMonths(dt, a[2]); var tr = el("tr");
        var c = document.createElement("input"); c.type = "checkbox"; c.setAttribute("aria-label", a[0] + " " + a[1] + " yapıldı");
        var td0 = el("td"); td0.appendChild(c); tr.appendChild(td0);
        tr.appendChild(el("td", null, a[0])); tr.appendChild(el("td", null, a[1])); tr.appendChild(el("td", null, ayYazi(a[2])));
        tr.appendChild(el("td", "mono", due.toLocaleDateString("tr-TR")));
        var st = el("td", "st"); tr.appendChild(st);
        function upd() {
          tr.className = "";
          if (c.checked) { st.textContent = "Yapıldı"; tr.className = "done"; }
          else if (due > t) { var gun = Math.round((due - t) / 864e5); st.textContent = gun <= 30 ? gun + " gün sonra" : "Henüz zamanı gelmedi"; if (gun <= 30) tr.className = "soon"; }
          else { st.textContent = "Zamanı geçti"; tr.className = "late"; }
          count();
        }
        c.addEventListener("change", upd); tr._upd = upd; tbody.appendChild(tr);
      });
      tb.appendChild(tbody); var wrap = el("div", "tablewrap"); wrap.appendChild(tb); out.appendChild(wrap);
      var sumEl = el("p", "asi-sum"); out.appendChild(sumEl);
      function count() {
        var n = tbody.querySelectorAll("tr.late").length;
        sumEl.textContent = n ? n + " doz zamanı geçmiş ve yapılmamış görünüyor. Yakalama şeması (en kısa aralıklar, yaş sınırları) için Genişletilmiş Bağışıklama Programı Genelgesi'ne göre plan yapın." : "Zamanı geçmiş eksik doz görünmüyor.";
        sumEl.className = "asi-sum" + (n ? " bad" : " good");
      }
      Array.prototype.forEach.call(tbody.children, function (tr) { tr._upd(); });
    }
    inp.addEventListener("input", draw); draw();
    host.appendChild(box);
  }

  /* ---------- çizim ---------- */
  function readVals(tool, form) {
    var v = {};
    tool.f.forEach(function (f) {
      var e = form.querySelector('[name="' + f.id + '"]');
      if (!e) return;
      if (f.k === "chk") v[f.id] = e.checked ? f.p : 0;
      else if (f.k === "num") v[f.id] = num(e.value);
      else if (f.k === "sel") { var x = e.value; v[f.id] = x === "" ? "" : isNaN(+x) ? x : +x; }
      else v[f.id] = e.value;
    });
    return v;
  }

  function buildTool(tool, host) {
    var form = el("form", "tool-body"); form.addEventListener("submit", function (e) { e.preventDefault(); });
    var fields = el("div", tool.f.some(function (f) { return f.k === "chk"; }) || tool.f.length > 6 ? "fields col" : "fields");
    tool.f.forEach(function (f) {
      var lab = el("label", "fld" + (f.k === "chk" ? " chk" : ""));
      if (f.k === "chk") {
        var c = document.createElement("input"); c.type = "checkbox"; c.name = f.id; lab.appendChild(c);
        lab.appendChild(el("span", null, f.l)); lab.appendChild(el("em", "pts", (f.p > 0 ? "+" : "") + String(f.p).replace(".", ",")));
      } else {
        lab.appendChild(el("span", null, f.l));
        var inp;
        if (f.k === "sel") {
          inp = document.createElement("select"); inp.name = f.id;
          f.o.forEach(function (o) { var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; inp.appendChild(op); });
          if (f.def != null) inp.value = f.def;
        } else {
          inp = document.createElement("input"); inp.name = f.id;
          if (f.k === "num") { inp.type = "text"; inp.inputMode = "decimal"; inp.autocomplete = "off"; }
          else inp.type = "date";
        }
        var w = el("span", "inp"); w.appendChild(inp); if (f.u) w.appendChild(el("i", null, f.u)); lab.appendChild(w);
      }
      fields.appendChild(lab);
    });
    form.appendChild(fields);
    var res = el("div", "result"); res.setAttribute("aria-live", "polite"); form.appendChild(res);
    function run() {
      var out = tool.calc(readVals(tool, form), tool);
      res.innerHTML = ""; res.className = "result";
      if (!out) { res.appendChild(el("span", "hint", "Değerleri girin, sonuç burada görünür.")); return; }
      if (out.level) res.className += " " + out.level;
      res.appendChild(el("b", null, out.main));
      if (out.sub) res.appendChild(el("p", null, out.sub));
      if (out.warn) res.appendChild(el("p", "warn", out.warn));
    }
    form.addEventListener("input", run); form.addEventListener("change", run);
    var reset = el("button", "reset", "Temizle"); reset.type = "button";
    reset.addEventListener("click", function () { form.reset(); tool.f.forEach(function (f) { if (f.def != null) form.querySelector('[name="' + f.id + '"]').value = f.def; }); run(); });
    form.appendChild(reset);
    run();
    host.appendChild(form);
  }

  function srcBlock(tool) {
    var p = el("p", "src"); p.appendChild(el("b", null, "Kaynak: "));
    tool.src.forEach(function (s, i) {
      if (i) p.appendChild(document.createTextNode(" · "));
      var a = el("a", null, s[0]); a.href = s[1]; a.target = "_blank"; a.rel = "noopener"; p.appendChild(a);
    });
    if (tool.note) { p.appendChild(el("br")); p.appendChild(el("span", null, tool.note)); }
    return p;
  }

  function init() {
    var list = document.getElementById("tools"); if (!list) return;
    var all = TOOLS.slice();
    all.push({ id: "asi", g: "asi", t: "Aşı planlayıcı (Ulusal Aşı Takvimi 2026)", d: "Doğum tarihine göre tüm doz tarihleri ve zamanı geçmiş dozlar.",
      kw: "aşı takvimi planlayıcı yakalama geciken doz bebek çocuk suçiçeği kkk", custom: buildAsi,
      src: [["Ulusal Çocukluk Dönemi Aşılama Takvimi (1 Eylül 2026 güncellemesi)", "https://hsgm.saglik.gov.tr/depo/birimler/asi-ile-onlenebilir-hastaliklar-db/dokumanlar/asi_karti_2026.pdf"],
            ["Aşı Portalı – son güncellemeler", "https://asi.saglik.gov.tr/bagisiklama-programi-ve-asi-takvimi/asi-takvimindeki-son-guencellemeler.html"]],
      note: "Takvim, Bakanlığın 2026 aşı kartından aktarılmıştır. Yakalama dozlarının aralıkları hesaplanmaz; genelgeye göre planlanmalıdır." });

    var groups = GROUPS.filter(function (g) { return all.some(function (t) { return t.g === g[0]; }); });
    var state = { q: "", g: "all" };
    var chips = document.getElementById("chips");
    function chip(id, label) {
      var b = el("button", "chip", label); b.type = "button"; b.dataset.g = id;
      var n = id === "all" ? all.length : all.filter(function (t) { return t.g === id; }).length;
      b.appendChild(el("span", "c", String(n)));
      b.addEventListener("click", function () { state.g = id; render(); }); chips.appendChild(b);
    }
    chip("all", "Tümü"); groups.forEach(function (g) { chip(g[0], g[1]); });

    var cards = all.map(function (t) {
      var d = document.createElement("details"); d.className = "tool"; d.id = t.id;
      var s = document.createElement("summary");
      var gl = (GROUPS.filter(function (g) { return g[0] === t.g; })[0] || [0, ""])[1];
      s.appendChild(el("span", "tg", gl)); s.appendChild(el("b", null, t.t)); s.appendChild(el("span", "td", t.d));
      d.appendChild(s);
      var built = false;
      d.addEventListener("toggle", function () {
        if (d.open && !built) { built = true; (t.custom || function (h) { buildTool(t, h); })(d); d.appendChild(srcBlock(t)); }
        if (d.open && history.replaceState) history.replaceState(null, "", "#" + t.id);
      });
      d._hay = fold(t.t + " " + t.d + " " + t.kw + " " + gl); d._g = t.g;
      list.appendChild(d); return d;
    });

    var q = document.getElementById("q"), cnt = document.getElementById("count");
    function render() {
      Array.prototype.forEach.call(chips.children, function (b) { b.setAttribute("aria-pressed", b.dataset.g === state.g ? "true" : "false"); });
      var words = fold(state.q).split(/\s+/).filter(Boolean), n = 0;
      cards.forEach(function (c) {
        var ok = (state.g === "all" || c._g === state.g) && words.every(function (w) { return c._hay.indexOf(w) >= 0; });
        c.hidden = !ok; if (ok) n++;
      });
      cnt.textContent = n + " araç";
      document.getElementById("empty").hidden = n > 0;
    }
    q.addEventListener("input", function () { state.q = q.value; render(); });
    render();
    if (location.hash) {
      var tgt = document.getElementById(location.hash.slice(1));
      if (tgt && tgt.tagName === "DETAILS") { tgt.open = true; tgt.scrollIntoView(); }
    }
  }

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  }
  if (typeof module !== "undefined") module.exports = { TOOLS: TOOLS, ASI: ASI, addMonths: addMonths };
})();
