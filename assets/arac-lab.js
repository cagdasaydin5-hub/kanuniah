/* Laboratuvar değerlendirici: hemogram, biyokimya, elektrolit, KCFT, lipid ve glukoz değerlerinden türetilmiş
   göstergeleri hesaplar; yaş, cinsiyet, hastalık ve ilaç bilgisine göre DİKKAT EDİLECEK noktaları listeler.
   Tanı koymaz. Her uyarının altında kaynak bağlantısı vardır. Hesap tarayıcıda yapılır; hiçbir değer gönderilmez
   ya da saklanmaz. Kart çizimi için arac-mama.js'teki ortak katmanı (window.KanuniEk) kullanır. */
(function () {
  "use strict";

  /* ---------- kaynaklar (başlık, bağlantı); bağlantı olmayanlar yalnızca başlık gösterir ---------- */
  var S = {
    patra: ["Patra S ve ark. J Family Med Prim Care 2025;14:4568 (indeks formülleri ve eşikleri, Tablo 2)", "https://doi.org/10.4103/jfmpc.jfmpc_2075_24"],
    kumar: ["Kumar A ve ark. J Lab Physicians 2017;9:195 (indekslerin karşılaştırması)", "https://doi.org/10.4103/0974-2727.208256"],
    ntaios: ["Ntaios G ve ark. Ann Hematol 2007;86:487 (indekslerin duyarlılığı yetersiz)", "https://doi.org/10.1007/s00277-007-0302-x"],
    mentzer: ["Mentzer WC. Lancet 1973;1:882", "https://pubmed.ncbi.nlm.nih.gov/4123424/"],
    ef: ["England JM, Fraser PM. Lancet 1973;1:449", "https://pubmed.ncbi.nlm.nih.gov/4120365/"],
    pasricha: ["Pasricha SR ve ark. Iron deficiency. Lancet 2021;397:233", "https://doi.org/10.1016/S0140-6736(20)32594-0"],
    who: ["WHO. Haemoglobin concentrations for the diagnosis of anaemia and assessment of severity (WHO/NMH/NHD/MNM/11.1) – eşikler", null],
    eschf: ["ESC 2026 Kalp Yetersizliği Kılavuzu", "https://doi.org/10.1093/eurheartj/ehag100"],
    spasovski: ["Spasovski G ve ark. Hiponatremi klinik uygulama kılavuzu. Nephrol Dial Transplant 2014;29(Suppl 2):i1", "https://doi.org/10.1093/ndt/gfu040"],
    katz: ["Katz MA. N Engl J Med 1973;289:843 (glukoz başına 1,6 mmol/L Na düzeltmesi)", "https://pubmed.ncbi.nlm.nih.gov/4763428/"],
    hillier: ["Hillier TA ve ark. Am J Med 1999;106:399 (glukoz başına 2,4 mmol/L Na düzeltmesi)", "https://pubmed.ncbi.nlm.nih.gov/10225241/"],
    payne: ["Payne RB ve ark. BMJ 1973;4:643 (albümine göre düzeltilmiş kalsiyum)", "https://doi.org/10.1136/bmj.4.5893.643"],
    figge: ["Figge J ve ark. Crit Care Med 1998;26:1807 (albümin düzeltmeli anyon açığı)", "https://doi.org/10.1097/00003246-199811000-00019"],
    kraut: ["Kraut JA, Madias NE. Clin J Am Soc Nephrol 2007;2:162 (anyon açığı: kullanım ve sınırlar)", "https://doi.org/10.2215/CJN.03020906"],
    inker: ["Inker LA ve ark. N Engl J Med 2021;385:1737 (CKD-EPI 2021, ırk katsayısız)", "https://pubmed.ncbi.nlm.nih.gov/34554658/"],
    kdigo: ["KDIGO 2024 Kronik Böbrek Hastalığı Kılavuzu", "https://kdigo.org/guidelines/ckd-evaluation-and-management/"],
    fib4: ["Sterling RK ve ark. Hepatology 2006;43:1317 (FIB-4 formülü)", "https://pubmed.ncbi.nlm.nih.gov/16729309/"],
    shah: ["Shah AG ve ark. Clin Gastroenterol Hepatol 2009;7:1104 (FIB-4 ≤1,30 ve ≥2,67 eşikleri, NAFLD)", "https://doi.org/10.1016/j.cgh.2009.05.033"],
    mcpherson: ["McPherson S ve ark. Am J Gastroenterol 2017;112:740 (yaşa göre FIB-4: ≤35 yaşta zayıf, ≥65 yaşta eşik 2,0)", "https://doi.org/10.1038/ajg.2016.453"],
    easl: ["EASL 2021 Karaciğer hastalığı için non-invaziv testler kılavuzu. J Hepatol 2021;75:659", "https://doi.org/10.1016/j.jhep.2021.05.025"],
    wai: ["Wai CT ve ark. Hepatology 2003;38:518 (APRI formülü)", "https://doi.org/10.1053/jhep.2003.50346"],
    ada: ["ADA Standards of Care in Diabetes—2026", "https://professional.diabetes.org/standards-of-care"],
    temd: ["TEMD Diabetes Mellitus Kılavuzu 2026", "https://file.temd.org.tr/Uploads/publications/guides/documents/diabetesmellitus2026.pdf"],
    adag: ["Nathan DM ve ark. Diabetes Care 2008;31:1473 (HbA1c – ortalama glukoz)", "https://pubmed.ncbi.nlm.nih.gov/18540046/"],
    homa: ["Matthews DR ve ark. Diabetologia 1985;28:412 (HOMA)", "https://pubmed.ncbi.nlm.nih.gov/3899825/"],
    tyg: ["Simental-Mendía LE ve ark. Metab Syndr Relat Disord 2008;6:299 (TyG indeksi)", "https://pubmed.ncbi.nlm.nih.gov/19067533/"],
    friedewald: ["Friedewald WT ve ark. Clin Chem 1972;18:499", "https://pubmed.ncbi.nlm.nih.gov/4337382/"]
  };

  var EPS = 1e-9;
  function ok(x) { return typeof x === "number" && isFinite(x); }
  function fmt(x, d) { return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toLocaleString("tr-TR", { maximumFractionDigits: d, minimumFractionDigits: 0 }); }

  /* ---------- hesaplar ---------- */
  function egfr(kr, yas, kadin) {
    var k = kadin ? 0.7 : 0.9, a = kadin ? -0.241 : -0.302, r = kr / k;
    return 142 * Math.pow(Math.min(r, 1), a) * Math.pow(Math.max(r, 1), -1.2) * Math.pow(0.9938, yas) * (kadin ? 1.012 : 1);
  }
  function fib4(yas, ast, alt, plt) { return yas * ast / (plt * Math.sqrt(alt)); }
  function apri(ast, ustAst, plt) { return (ast / ustAst) / plt * 100; }
  function anyonAcigi(na, cl, hco3) { return na - (cl + hco3); }
  function anyonAcigiDuzeltilmis(ag, alb) { return ag + 2.5 * (4.4 - alb); }
  function kalsiyumDuzeltilmis(ca, alb) { return ca - alb + 4.0; }
  function sodyumDuzeltilmis(na, glk, katsayi) { return na + katsayi * (glk - 100) / 100; }
  function osmolalite(na, glk, ure) { return 2 * na + glk / 18 + ure / 6; }
  function ldlFriedewald(tk, hdl, tg) { return tk - hdl - tg / 5; }
  function homaIr(glk, ins) { return glk * ins / 405; }
  function tyg(tg, glk) { return Math.log(tg * glk / 2); }
  function ortGlukoz(a1c) { return 28.7 * a1c - 46.7; }

  /* Mikrositer anemi indeksleri (formül ve eşikler Patra 2025 Tablo 2'den). lehine: "tal" (talasemi taşıyıcılığı) ya da "de" (demir eksikliği). */
  function indeksler(g) {
    var r = [];
    function ekle(ad, formul, deger, tal, kaynak, not) { r.push({ ad: ad, formul: formul, deger: deger, lehine: tal ? "tal" : "de", kaynak: kaynak, not: not || "" }); }
    if (ok(g.mcv) && ok(g.rbc) && g.rbc > 0) {
      var m = g.mcv / g.rbc; ekle("Mentzer", "MCV / RBC", m, m < 13, S.mentzer, "<13 talasemi lehine");
      if (ok(g.rdw)) { var w = g.mcv * g.rdw / g.rbc; ekle("RDW indeksi", "MCV × RDW / RBC", w, w < 220, S.patra, "<220 talasemi lehine"); }
    }
    if (ok(g.mch) && ok(g.rbc) && g.rbc > 0) { var s = g.mch / g.rbc; ekle("Srivastava", "MCH / RBC", s, s < 3.8, S.patra, "<3,8 talasemi lehine"); }
    if (ok(g.mcv) && ok(g.hb) && ok(g.rbc)) { var e = g.mcv - 5 * g.hb - g.rbc - 3.4; ekle("England–Fraser", "MCV − 5×Hb − RBC − 3,4", e, e < 0, S.ef, "<0 talasemi lehine"); }
    if (ok(g.mcv) && ok(g.mch)) { var l = g.mcv * g.mcv * g.mch / 100; ekle("Shine–Lal", "MCV² × MCH / 100", l, l < 1530, S.kumar, "<1530 talasemi lehine; yalnızca tarama değeri (özgüllüğü çok düşük bulunmuş)"); }
    return r;
  }

  /* Ana değerlendirme. g: sayısal alanlar (boşsa NaN), cins "e"|"k"|"", yas, durum{}, ilac{}.
     Dönüş: { dikkat:[{b,m,k}], bilgi:[{b,m,k}] } */
  function degerlendir(g) {
    var D = g.durum || {}, I = g.ilac || {}, dikkat = [], bilgi = [];
    var kadin = g.cins === "k", cinsVar = g.cins === "e" || g.cins === "k", yasVar = ok(g.yas) && g.yas > 0;
    function dk(b, m, k) { dikkat.push({ b: b, m: m, k: k || [] }); }
    function bl(b, m, k) { bilgi.push({ b: b, m: m, k: k || [] }); }

    /* --- hemogram --- */
    var esik = D.gebe ? 11 : (cinsVar ? (kadin ? 12 : 13) : NaN);
    var anemi = ok(g.hb) && ok(esik) && g.hb < esik;
    if (ok(g.hb) && !ok(esik)) bl("Hemoglobin", "Anemi eşiği cinsiyete (ve gebeliğe) göre değişir; cinsiyeti seçin.", [S.who]);
    if (anemi) dk("Hemoglobin düşük (" + fmt(g.hb, 1) + " g/dL; eşik " + esik + ")", "Anemi tanımının altında. Eritrosit göstergelerine (MCV, RDW), ferritine ve klinik öyküye göre nedeni araştırılır.", [S.who]);
    var mikro = ok(g.mcv) && g.mcv < 80, makro = ok(g.mcv) && g.mcv > 100;
    if (ok(g.mcv)) {
      if (mikro) bl("MCV " + fmt(g.mcv, 0) + " fL: mikrositoz", "Sık nedenler demir eksikliği ve talasemi taşıyıcılığıdır; kronik hastalık anemisi de olabilir. Sınırlar laboratuvara göre küçük farklar gösterir.");
      else if (makro) dk("MCV " + fmt(g.mcv, 0) + " fL: makrositoz", "B12 ve folat düzeyi, TSH, alkol ve ilaç öyküsü, karaciğer hastalığı ve kemik iliği nedenleri akla getirilir.", []);
      else bl("MCV " + fmt(g.mcv, 0) + " fL", "Normositer aralıkta.");
    }
    if (mikro) {
      var ind = indeksler(g);
      var engel = D.transfuzyon || I.demir || D.hemoglobinopati;
      if (ind.length && !engel) {
        var tal = ind.filter(function (x) { return x.lehine === "tal"; }).length;
        var ozet = tal + " / " + ind.length + " indeks talasemi taşıyıcılığı lehine, " + (ind.length - tal) + " indeks demir eksikliği lehine.";
        var det = ind.map(function (x) { return x.ad + ": " + fmt(x.deger, 1) + " (" + (x.lehine === "tal" ? "talasemi lehine" : "demir eksikliği lehine") + ")"; }).join("; ");
        var yon = tal === 0 ? "" : (tal === ind.length ? " Tüm indeksler talasemi yönünde." : " İndeksler birbirini tutmuyor.");
        dk("Mikrositer anemi indeksleri: " + ozet,
          det + "." + yon + " Bu indeksler çalışmalar arasında tutarsızdır ve tek başına güvenli ayırım sağlamaz; demir eksikliği ile talasemi taşıyıcılığı birlikte de olabilir. " +
          "Önce ferritin; ferritin normal ya da yüksekse veya demir tedavisine rağmen MCV düzelmiyorsa Hb elektroforezi (HbA2) düşünülür. Demir eksikliği HbA2'yi yalancı düşürebilir.",
          [S.patra, S.kumar, S.ntaios, S.mentzer, S.ef]);
      } else if (ind.length && engel) {
        bl("Mikrositer anemi indeksleri hesaplanmadı", "Transfüzyon, demir tedavisi ya da bilinen hemoglobinopati indekslerin güvenilirliğini bozar.", [S.patra]);
      } else if (!ind.length) {
        bl("Mikrositer anemi indeksleri için eksik değer", "Mentzer için MCV ve RBC; diğerleri için Hb, MCH, RDW da gerekir.", []);
      }
      if (anemi && ((cinsVar && !kadin) || (kadin && yasVar && g.yas >= 50)))
        dk("Demir eksikliği anemisi doğrulanırsa kaynak araştırılmalı", "Erkekte ve postmenopozal kadında demir eksikliği anemisinde gastrointestinal kanama için endoskopik değerlendirme ve çölyak taraması düşünülür.", [S.pasricha]);
    }
    if (ok(g.ferritin) && (ok(g.hb) || ok(g.mcv))) {
      var tsat0 = (ok(g.demir) && ok(g.tibc) && g.tibc > 0) ? g.demir / g.tibc * 100 : NaN;
      if (D.kky) {
        var kkyDemir = g.ferritin < 100 || (g.ferritin <= 299 && ok(tsat0) && tsat0 < 20);
        if (kkyDemir) dk("Kalp yetersizliğinde demir eksikliği tanımı karşılanıyor", "Ferritin <100 ng/mL ya da 100–299 ng/mL ve transferrin satürasyonu <%20.", [S.eschf]);
        else if (g.ferritin <= 299 && !ok(tsat0)) bl("Kalp yetersizliği ve ferritin", "Ferritin 100–299 ng/mL aralığında demir eksikliği tanısı için transferrin satürasyonu gerekir (demir ve TİBC girin).", [S.eschf]);
      }
      if (D.enflamasyon) bl("Ferritin yorumu", "Enflamasyon ya da kronik hastalıkta ferritin akut faz yanıtı olarak yükselir; normal ferritin demir eksikliğini dışlamaz.", [S.pasricha]);
    }
    if (ok(g.demir) && ok(g.tibc) && g.tibc > 0) bl("Transferrin satürasyonu: %" + fmt(g.demir / g.tibc * 100, 0), "Demir / TİBC × 100.", []);

    /* --- elektrolit ve metabolik --- */
    if (ok(g.na) && g.na < 135) {
      var m = "Hiponatremi tanımı: serum sodyum <135 mmol/L.";
      if (I.tiyazid) m += " Tiyazid ya da tiyazid benzeri diüretik kullanılıyor: ilaca bağlı hiponatremi akla getirilmeli.";
      dk("Sodyum düşük (" + fmt(g.na, 0) + " mmol/L)", m + " Ölçülen osmolalite, hacim durumu ve idrar sodyumu ile nedeni ayrılır.", [S.spasovski]);
    }
    if (ok(g.na) && ok(g.glk) && g.glk > 100) {
      var k1 = sodyumDuzeltilmis(g.na, g.glk, 1.6), k2 = sodyumDuzeltilmis(g.na, g.glk, 2.4);
      var mt = "Düzeltilmiş sodyum: " + fmt(k1, 0) + " (Katz, 1,6) – " + fmt(k2, 0) + " (Hillier, 2,4) mmol/L.";
      if (g.na < 135 && k1 >= 135) mt += " Düşük sodyumun belirgin bölümü hiperglisemiye bağlı olabilir.";
      (g.glk >= 200 ? dk : bl)("Hiperglisemide sodyum düzeltmesi", mt, [S.katz, S.hillier]);
    }
    if (ok(g.ca) && ok(g.alb)) {
      var cd = kalsiyumDuzeltilmis(g.ca, g.alb);
      bl("Düzeltilmiş kalsiyum: " + fmt(cd, 1) + " mg/dL", "Kalsiyum − albümin + 4,0. Düzeltme tek laboratuvarda 200 örnekle türetilmiş yaklaşık bir formüldür; düzeltilmiş değer sınırdaysa iyonize kalsiyum ölçümü düşünülür.", [S.payne]);
    }
    if (ok(g.na) && ok(g.cl) && ok(g.hco3)) {
      var ag = anyonAcigi(g.na, g.cl, g.hco3), t = "Anyon açığı " + fmt(ag, 0) + " mEq/L";
      var agd = ok(g.alb) ? anyonAcigiDuzeltilmis(ag, g.alb) : NaN;
      if (ok(agd)) t += "; albümine göre düzeltilmiş " + fmt(agd, 0) + " mEq/L";
      t += ". Normal değer yönteme göre geniş değişir (kendi laboratuvarınızın aralığına bakın); hipoalbüminemi anyon açığını olduğundan düşük gösterir ve anlamlı bir açığı maskeleyebilir.";
      bl(t.split(".")[0], t.slice(t.indexOf(".") + 2), [S.figge, S.kraut]);
    }
    if (ok(g.na) && ok(g.glk) && ok(g.ure)) bl("Hesaplanan osmolalite: " + fmt(osmolalite(g.na, g.glk, g.ure), 0) + " mOsm/kg", "2×Na + glukoz/18 + üre/6 (üre mg/dL).", []);

    /* --- böbrek --- */
    if (ok(g.kr) && yasVar && cinsVar) {
      var e = egfr(g.kr, g.yas, kadin), evre = e >= 90 ? "G1" : e >= 60 ? "G2" : e >= 45 ? "G3a" : e >= 30 ? "G3b" : e >= 15 ? "G4" : "G5";
      var met = "CKD-EPI 2021 ile tahmini GFH " + fmt(e, 0) + " mL/dk/1,73 m² (" + evre + " aralığı). ";
      var kay = [S.inker, S.kdigo];
      if (e < 60) {
        met += "Tek ölçüm kronik böbrek hastalığı tanısı koydurmaz; GFH <60 değerinin ≥3 ay sürmesi ya da albüminüri/diğer böbrek hasarı belirteçleri gerekir. İlaç dozları böbrek fonksiyonuna göre gözden geçirilir.";
        if (I.metformin) { met += " Metformin kullanılıyor: eGFR <45'te doz gözden geçirilir, <30'da kullanılmaz."; kay = kay.concat([S.ada, S.temd]); }
        if (I.doak) met += " DOAK kullanılıyor: doz ayarı Kreatinin Klirensi (Cockcroft-Gault) ile yapılır; Araçlar sayfasındaki KrKl aracına bakın.";
        dk("Tahmini GFH düşük: " + fmt(e, 0), met, kay);
      } else bl("Tahmini GFH: " + fmt(e, 0), met + "Albüminüri ayrıca değerlendirilmelidir.", kay);
      if (D.gebe) dk("Gebelikte GFH formülü", "Bu eGFR denklemi gebelikte doğrulanmamıştır; gebelikte kreatininin referans aralığı da farklıdır.", [S.kdigo]);
    } else if (ok(g.kr)) bl("Kreatinin girildi", "eGFR için yaş ve cinsiyet gerekir.", []);

    /* --- karaciğer --- */
    if (ok(g.ast) && ok(g.alt) && ok(g.plt) && yasVar && g.alt > 0 && g.plt > 0) {
      if (D.karaciger) bl("FIB-4 / APRI hesaplanmadı", "Bilinen siroz ya da ileri karaciğer hastalığında bu fibrozis skorlarının ayırt edici değeri yoktur.", [S.easl]);
      else {
        var f = fib4(g.yas, g.ast, g.alt, g.plt), yuksek = g.yas >= 65 ? 2.0 : 1.3;
        var mm = "FIB-4 = " + fmt(f, 2) + ". ";
        if (g.yas <= 35) mm += "≤35 yaşta FIB-4'ün performansı zayıf bulunmuştur; sonuç dikkatle yorumlanmalı. ";
        if (f >= yuksek) {
          mm += "Eşik (" + (g.yas >= 65 ? "≥65 yaşta 2,0" : "1,3") + ") ve üzeri: ilerlemiş fibrozis dışlanamaz, elastografi gibi ikinci basamak testle değerlendirme ya da uzman yönlendirmesi düşünülür." + (f >= 2.67 ? " ≥2,67 değeri ilerlemiş fibrozis için yüksek olasılığa işaret eder." : "");
          dk("FIB-4 eşiğin üzerinde", mm + " Skor NAFLD ve viral hepatit gibi kronik karaciğer hastalığında kullanılır; akut hepatitte anlamsızdır.", [S.shah, S.mcpherson, S.fib4, S.easl]);
        } else bl("FIB-4 = " + fmt(f, 2), mm + "Eşiğin altında (≤1,30; ≥65 yaşta <2,0): ilerlemiş fibrozis olasılığı düşük.", [S.shah, S.mcpherson, S.fib4]);
        if (ok(g.astUst) && g.astUst > 0) bl("APRI = " + fmt(apri(g.ast, g.astUst, g.plt), 2), "(AST/üst sınır) / trombosit × 100. Kesim noktası kronik hepatit C verisinden gelir; yalnız ek bilgi olarak bakın.", [S.wai]);
      }
    }

    /* --- glukoz, HbA1c --- */
    var ada = [S.ada, S.temd];
    if (ok(g.glk)) {
      if (g.glk < 70) dk("Glukoz düşük (" + fmt(g.glk, 0) + " mg/dL)", "<70 mg/dL hipoglisemi sınırıdır." + (I.hipoglisemik ? " Sülfonilüre ya da insülin kullanılıyor: ilaç ilişkili hipoglisemi açısından doz gözden geçirilmeli." : ""), ada);
      else if (g.glk >= 300) dk("Glukoz çok yüksek (" + fmt(g.glk, 0) + " mg/dL)", "Hiperglisemik kriz (ketoz, hiperozmolarite) açısından klinik durum, ketonlar ve osmolalite değerlendirilmelidir.", ada);
      else if (D.gebe) bl("Gebelikte glukoz", "Gebelikte glukoz eşikleri ve tarama yaklaşımı farklıdır.", ada);
      else if (g.acl) {
        if (g.glk >= 126) dk("Açlık glukozu diyabet aralığında (" + fmt(g.glk, 0) + " mg/dL)", "Açlık glukozu ≥126 mg/dL. Belirti yoksa farklı bir günde tekrar ya da HbA1c ile doğrulanır.", ada);
        else if (g.glk >= 100) dk("Açlık glukozu yüksek (" + fmt(g.glk, 0) + " mg/dL)", "100–125 mg/dL bozulmuş açlık glukozu aralığıdır; diyabet riski için yaşam tarzı ve izlem.", ada);
      } else if (g.glk >= 200) bl("Rastgele glukoz " + fmt(g.glk, 0) + " mg/dL", "Açlık durumu belirtilmediği için tanı eşikleri uygulanmadı; ≥200 mg/dL ve klasik belirtiler varsa diyabet tanısı düşünülür.", ada);
    }
    if (ok(g.a1c)) {
      var mt2 = "Ortalama glukoz karşılığı ≈ " + fmt(ortGlukoz(g.a1c), 0) + " mg/dL. ";
      var etk = anemi || mikro || D.hemoglobinopati || D.kby;
      var kk = ada.concat([S.adag]);
      if (D.gebe) mt2 += "Gebelikte HbA1c güvenilir değildir. ";
      if (etk) mt2 += "Anemi, mikrositoz, hemoglobinopati ve böbrek hastalığında HbA1c yanıltıcı olabilir; glukoz ölçümleriyle birlikte değerlendirin.";
      if (g.a1c >= 6.5) dk("HbA1c diyabet aralığında (%" + fmt(g.a1c, 1) + ")", "HbA1c ≥%6,5. Belirti yoksa doğrulama için ikinci bir test gerekir. " + mt2, kk);
      else if (g.a1c >= 5.7) dk("HbA1c prediyabet aralığında (%" + fmt(g.a1c, 1) + ")", "%5,7–6,4 arası. " + mt2, kk);
      else bl("HbA1c %" + fmt(g.a1c, 1), mt2, kk);
    }
    if (ok(g.glk) && ok(g.ins) && g.ins > 0) bl("HOMA-IR = " + fmt(homaIr(g.glk, g.ins), 2), "Glukoz (mg/dL) × insülin (µIU/mL) / 405; açlık örneğinde anlamlıdır. Tek bir kesim noktası yoktur; popülasyona ve insülin yöntemine göre değişir.", [S.homa]);
    if (ok(g.glk) && ok(g.tg) && g.tg > 0 && g.glk > 0) bl("TyG indeksi = " + fmt(tyg(g.tg, g.glk), 2), "ln(TG × glukoz / 2); insülin direnci göstergesi, kesim noktası popülasyona göre değişir.", [S.tyg]);

    /* --- lipid --- */
    if (ok(g.tk) && ok(g.hdl)) {
      bl("Non-HDL kolesterol: " + fmt(g.tk - g.hdl, 0) + " mg/dL", "Toplam kolesterol − HDL.", []);
      if (ok(g.tg)) {
        if (g.tg >= 400) dk("Friedewald LDL hesaplanamaz (TG " + fmt(g.tg, 0) + " mg/dL)", "Formül trigliserid <400 mg/dL için geçerlidir; doğrudan LDL ölçümü isteyin.", [S.friedewald]);
        else bl("Hesaplanan LDL (Friedewald): " + fmt(ldlFriedewald(g.tk, g.hdl, g.tg), 0) + " mg/dL", "Toplam kolesterol − HDL − TG/5. Hedef değerler kişinin kardiyovasküler riskine göre belirlenir.", [S.friedewald]);
      }
    }
    return { dikkat: dikkat, bilgi: bilgi };
  }


  /* ---------- yapıştırılan sonuç metnini okuma ---------- */
  function katla(t) {
    return String(t).replace(/İ/g, "i").replace(/I/g, "i").toLowerCase().replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c");
  }
  /* alan: [takma adlar]; null = tanınır ama kullanılmaz (yanlış eşleşmeyi önlemek için metni tüketir) */
  var ADLAR = {
    hb: ["hemoglobin", "hgb", "hb"], rbc: ["eritrosit", "rbc", "kirmizi kan hucresi", "kirmizi kure"], mcv: ["mcv"], mch: ["mch"],
    rdw: ["rdw-cv", "rdw cv", "rdw"], plt: ["trombosit", "plt"], ferritin: ["ferritin"],
    demir: ["serum demiri", "demir (fe)", "demir", "iron"], tibc: ["demir baglama kapasitesi", "total demir baglama kapasitesi", "tdbk", "tibc"],
    na: ["sodyum", "na"], cl: ["klorur", "klor", "cl"], hco3: ["bikarbonat", "hco3"], ca: ["kalsiyum", "ca"], alb: ["albumin", "alb"],
    kr: ["kreatinin", "creatinine"], ure: ["ure", "urea"], bun: ["bun", "kan ure azotu"], ast: ["ast", "sgot"], alt: ["alt", "sgpt"],
    glk: ["aclik kan sekeri", "kan sekeri", "glukoz", "glucose", "glikoz", "aks"], a1c: ["hemoglobin a1c", "glikozile hemoglobin", "hba1c", "a1c"],
    ins: ["insulin"], tk: ["total kolesterol", "toplam kolesterol", "kolesterol"], hdl: ["hdl kolesterol", "hdl-kolesterol", "hdl"], tg: ["trigliserid", "trigliserit", "tg"]
  };
  var YOKSAY = ["rdw-sd", "rdw sd", "mchc", "kreatinin klirensi", "kreatinin kinaz", "kreatin kinaz", "ldl kolesterol", "ldl-kolesterol", "ldl", "vldl", "ubbk", "uibc",
    "hematokrit", "hct", "mpv", "pdw", "pct", "wbc", "lokosit", "lokosit", "notrofil", "lenfosit", "monosit", "eozinofil", "bazofil", "potasyum", "k+", "idrar", "crp", "tsh", "gfr", "egfr", "ck-mb", "total bilirubin", "direkt bilirubin", "alp", "ggt", "ldh", "magnezyum", "fosfor"];
  var ALIAS = (function () {
    var l = [];
    Object.keys(ADLAR).forEach(function (k) { ADLAR[k].forEach(function (a) { l.push([a, k]); }); });
    YOKSAY.forEach(function (a) { l.push([a, null]); });
    l.sort(function (x, y) { return y[0].length - x[0].length; });
    return l;
  })();
  function kacir(a) { return a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  var ALIAS_RE = new RegExp("(^|[^a-z0-9])(" + ALIAS.map(function (x) { return kacir(x[0]); }).join("|") + ")(?![a-z0-9])", "g");
  var ALIAS_MAP = (function () { var m = {}; ALIAS.forEach(function (x) { if (!(x[0] in m)) m[x[0]] = x[1]; }); return m; })();

  /* Metindeki test adlarını bulur; her adın ardından gelen ilk sayıyı sonuç sayar (sonraki test adına ya da satır sonuna kadar). */
  function metinOku(metin) {
    var t = katla(metin), bul = [], m, sonuc = { degerler: {}, yas: NaN, cins: "", okunan: [] };
    var ym = /(?:^|[^a-z])yas\s*[:=]?\s*(\d{1,3})(?![\d.,])/.exec(t); if (ym) sonuc.yas = parseInt(ym[1], 10);
    var cm = /cinsiyet\s*[:=]?\s*(kadin|erkek|bayan|k|e)\b/.exec(t); if (cm) sonuc.cins = (cm[1] === "kadin" || cm[1] === "bayan" || cm[1] === "k") ? "k" : "e";
    ALIAS_RE.lastIndex = 0;
    while ((m = ALIAS_RE.exec(t))) {
      var bas = m.index + m[1].length;
      bul.push({ ad: m[2], alan: ALIAS_MAP[m[2]], bas: bas, son: bas + m[2].length });
      ALIAS_RE.lastIndex = bas + m[2].length;
    }
    bul.forEach(function (b, i) {
      if (!b.alan) return;
      var bitis = i + 1 < bul.length ? bul[i + 1].bas : t.length, parca = t.slice(b.son, bitis), nl = parca.indexOf("\n");
      if (nl >= 0) parca = parca.slice(0, nl);
      var re = /([<>]?)\s*(-?\d+(?:[.,]\d+)?)/g, n;
      while ((n = re.exec(parca))) {
        if (n[1]) break; // "<0,5" gibi sınır değerleri sonuç değildir
        var v = parseFloat(n[2].replace(",", "."));
        if (!isFinite(v)) break;
        var a = b.alan;
        if (a === "bun") { a = "ure"; v = v * 2.14; }
        if (a === "plt" && v > 2000) v = v / 1000;
        if (a === "rdw" && v > 30) break; // RDW-SD (fL) olabilir
        if (!(a in sonuc.degerler)) { sonuc.degerler[a] = Math.round(v * 100) / 100; sonuc.okunan.push([a, sonuc.degerler[a]]); }
        break;
      }
    });
    return sonuc;
  }

  /* ---------- kart ---------- */
  var CSS = ".lab [hidden]{display:none!important}" +
    ".lab fieldset{border:1px solid var(--line);border-radius:6px;margin:12px 0 0;padding:8px 12px 12px}" +
    ".lab legend{font-weight:700;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:var(--muted);padding:0 6px}" +
    ".lab .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px 12px}" +
    ".lab .grid label{display:flex;flex-direction:column;gap:3px;font-size:13.5px;font-weight:600}" +
    ".lab .grid input,.lab .grid select{font:inherit;font-weight:400;font-size:16px;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:7px 9px;min-width:0;width:100%}" +
    ".lab .grid small{font-weight:400;color:var(--muted);font-size:12px}" +
    ".lab .chk{display:flex;align-items:flex-start;gap:8px;margin:5px 0;font-size:14.5px}.lab .chk input{margin-top:3px;accent-color:var(--pine)}" +
    ".lab .bul{border:1px solid var(--line);border-left-width:4px;border-radius:6px;padding:9px 12px;margin:8px 0}" +
    ".lab .bul.dk{border-left-color:#B3261E}.lab .bul.bl{border-left-color:var(--line)}" +
    ".lab .bul b{display:block}.lab .bul p{margin:4px 0 0;font-size:14.5px}" +
    ".lab .ks{margin:6px 0 0;padding:0;list-style:none;font-size:12.5px;color:var(--muted)}.lab .ks li{margin:2px 0}" +
    ".lab h4{margin:16px 0 4px;font-size:13px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}" +
    ".lab .not{font-size:13.5px;color:var(--muted);margin:10px 0 0}" +
    ".lab textarea.yap{width:100%;box-sizing:border-box;font:inherit;font-size:15px;color:var(--ink);background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:9px 10px;resize:vertical}";

  var ALANLAR = [
    ["Hemogram", [["hb", "Hb", "g/dL"], ["rbc", "RBC", "10¹²/L"], ["mcv", "MCV", "fL"], ["mch", "MCH", "pg"], ["rdw", "RDW-CV", "%"], ["plt", "Trombosit", "10⁹/L (bin/µL)"]]],
    ["Demir", [["ferritin", "Ferritin", "ng/mL"], ["demir", "Demir", "µg/dL"], ["tibc", "TİBC", "µg/dL"]]],
    ["Elektrolit ve minerâl", [["na", "Na", "mmol/L"], ["cl", "Cl", "mmol/L"], ["hco3", "HCO₃", "mmol/L"], ["ca", "Ca", "mg/dL"], ["alb", "Albümin", "g/dL"]]],
    ["Böbrek", [["kr", "Kreatinin", "mg/dL"], ["ure", "Üre", "mg/dL"]]],
    ["Karaciğer", [["ast", "AST", "U/L"], ["alt", "ALT", "U/L"], ["astUst", "AST üst sınırı", "U/L (APRI için)"]]],
    ["Glukoz", [["glk", "Glukoz", "mg/dL"], ["a1c", "HbA1c", "%"], ["ins", "Açlık insülin", "µIU/mL"]]],
    ["Lipid", [["tk", "Toplam kolesterol", "mg/dL"], ["hdl", "HDL", "mg/dL"], ["tg", "Trigliserid", "mg/dL"]]]
  ];
  var DURUM = [["dm", "Diyabet"], ["kky", "Kalp yetersizliği"], ["kby", "Kronik böbrek hastalığı"], ["karaciger", "Bilinen siroz / ileri karaciğer hastalığı"],
    ["enflamasyon", "Aktif enflamasyon / kronik hastalık"], ["hemoglobinopati", "Bilinen talasemi / hemoglobinopati"], ["transfuzyon", "Son aylarda transfüzyon"], ["gebe", "Gebe"]];
  var ILAC = [["metformin", "Metformin"], ["hipoglisemik", "Sülfonilüre ya da insülin"], ["tiyazid", "Tiyazid / indapamid"], ["doak", "DOAK (apiksaban, rivaroksaban, edoksaban, dabigatran)"], ["demir", "Demir tedavisi (son 3 ay)"]];

  function build(host) {
    var Ek = window.KanuniEk, el = Ek.el;
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    var form = el("form", "tool-body lab"); form.addEventListener("submit", function (e) { e.preventDefault(); });
    host.appendChild(form);
    form.appendChild(el("p", "not", "Bu araç tanı koymaz; girdiğiniz değerlere ve hasta bilgisine göre dikkat edilecek noktaları hatırlatır. Boş bıraktığınız değerler atlanır. Referans aralıkları laboratuvara göre değişir. Hasta adı ve kimlik bilgisi girmeyin; hiçbir şey kaydedilmez ya da gönderilmez."));

    var fp = el("fieldset"); fp.appendChild(el("legend", null, "Sonuçları yapıştırın"));
    var ta = document.createElement("textarea"); ta.name = "yapistir"; ta.rows = 6; ta.className = "yap";
    ta.placeholder = "HBYS ya da laboratuvar çıktısını kopyalayıp buraya yapıştırın (hemogram, biyokimya, lipid, HbA1c… hepsi birlikte). Değerler aşağıdaki alanlara otomatik dolar; yanlış okunanı alanda düzeltebilirsiniz. Yaş ve cinsiyet metinde varsa onlar da okunur.";
    fp.appendChild(ta); var okuma = el("p", "not"); fp.appendChild(okuma); form.appendChild(fp);
    ta.addEventListener("input", function () {
      var r = metinOku(ta.value), n = 0, gor = [];
      Object.keys(r.degerler).forEach(function (k) { var inp = form.elements[k]; if (inp) { inp.value = String(r.degerler[k]).replace(".", ","); n++; gor.push(k.toUpperCase() + " " + String(r.degerler[k]).replace(".", ",")); } });
      if (ok(r.yas) && form.elements.yas) form.elements.yas.value = String(r.yas);
      if (r.cins && form.elements.cins) form.elements.cins.value = r.cins;
      okuma.textContent = ta.value.trim() ? (n ? n + " değer okundu: " + gor.join(", ") + (ok(r.yas) ? "; yaş " + r.yas : "") + (r.cins ? "; " + (r.cins === "k" ? "kadın" : "erkek") : "") + ". Birimleri (mg/dL, g/dL) ve değerleri kontrol edin." : "Tanınan bir test adı bulunamadı.") : "";
      run();
    });

    var f0 = el("fieldset"); f0.appendChild(el("legend", null, "Hasta")); var g0 = el("div", "grid");
    function sayi(ad, etiket, birim) {
      var l = el("label", null, etiket); var i = document.createElement("input"); i.type = "text"; i.inputMode = "decimal"; i.name = ad; i.autocomplete = "off"; l.appendChild(i);
      if (birim) l.appendChild(el("small", null, birim)); return l;
    }
    g0.appendChild(sayi("yas", "Yaş", "yıl"));
    var lc = el("label", null, "Cinsiyet"), sc = document.createElement("select"); sc.name = "cins";
    [["", "Seçin"], ["k", "Kadın"], ["e", "Erkek"]].forEach(function (o) { var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; sc.appendChild(op); });
    lc.appendChild(sc); g0.appendChild(lc); f0.appendChild(g0);
    function chk(ad, etiket) { var l = el("label", "chk"); var c = document.createElement("input"); c.type = "checkbox"; c.name = ad; l.appendChild(c); l.appendChild(el("span", null, etiket)); return l; }
    DURUM.forEach(function (x) { f0.appendChild(chk("d_" + x[0], x[1])); });
    form.appendChild(f0);
    var fi = el("fieldset"); fi.appendChild(el("legend", null, "Kullandığı ilaçlar")); ILAC.forEach(function (x) { fi.appendChild(chk("i_" + x[0], x[1])); }); form.appendChild(fi);

    ALANLAR.forEach(function (grup) {
      var fs = el("fieldset"); fs.appendChild(el("legend", null, grup[0])); var gr = el("div", "grid");
      grup[1].forEach(function (a) { gr.appendChild(sayi(a[0], a[1], a[2])); });
      if (grup[0] === "Glukoz") gr.appendChild(chk("acl", "Glukoz açlık değeri"));
      fs.appendChild(gr); form.appendChild(fs);
    });
    var reset = el("button", "chip", "Temizle"); reset.type = "button"; form.appendChild(reset);
    var out = el("div"); out.setAttribute("aria-live", "polite"); form.appendChild(out);

    function oku(ad) { var v = form.elements[ad]; if (!v || !String(v.value).trim()) return NaN; var x = parseFloat(String(v.value).replace(",", ".")); return isFinite(x) ? x : NaN; }
    function on(ad) { return !!(form.elements[ad] && form.elements[ad].checked); }
    function bulKart(x, sinif) {
      var b = el("div", "bul " + sinif); b.appendChild(el("b", null, x.b)); if (x.m) b.appendChild(el("p", null, x.m));
      if (x.k.length) {
        var ul = el("ul", "ks"); x.k.forEach(function (k) {
          var li = el("li", null, "Kaynak: ");
          if (k[1]) { var a = el("a", null, k[0]); a.href = k[1]; a.target = "_blank"; a.rel = "noopener"; li.appendChild(a); } else li.appendChild(document.createTextNode(k[0] + " (bağlantı eklenmedi)"));
          ul.appendChild(li);
        }); b.appendChild(ul);
      }
      return b;
    }
    function run() {
      var g = { yas: oku("yas"), cins: form.elements.cins.value, acl: on("acl"), durum: {}, ilac: {} };
      ALANLAR.forEach(function (gr) { gr[1].forEach(function (a) { g[a[0]] = oku(a[0]); }); });
      DURUM.forEach(function (x) { g.durum[x[0]] = on("d_" + x[0]); });
      ILAC.forEach(function (x) { g.ilac[x[0]] = on("i_" + x[0]); });
      var r = degerlendir(g); out.innerHTML = "";
      if (!r.dikkat.length && !r.bilgi.length) { out.appendChild(el("p", "not", "Değerleri girdikçe sonuçlar burada belirir.")); return; }
      if (r.dikkat.length) { out.appendChild(el("h4", null, "Dikkat edilecek noktalar (" + r.dikkat.length + ")")); r.dikkat.forEach(function (x) { out.appendChild(bulKart(x, "dk")); }); }
      else out.appendChild(el("p", "not", "Girilen değerlerle uyarı çıkmadı. Bu, normal olduğu anlamına gelmez."));
      if (r.bilgi.length) { out.appendChild(el("h4", null, "Hesaplanan değerler ve notlar")); r.bilgi.forEach(function (x) { out.appendChild(bulKart(x, "bl")); }); }
    }
    form.addEventListener("input", function (e) { if (e.target !== ta) run(); }); form.addEventListener("change", run);
    reset.addEventListener("click", function () { form.reset(); okuma.textContent = ""; run(); });
    run();
  }

  var TOOL = {
    id: "lab", g: "lab", t: "Laboratuvar değerlendirici",
    d: "Hemogram, biyokimya, elektrolit, KCFT, lipid ve glukozdan hesaplanan göstergeler; yaş, cinsiyet, hastalık ve ilaca göre dikkat edilecek noktalar, her biri kaynaklı.",
    kw: "yapıştır kopyala laboratuvar tahlil hemogram cbc bft kcft elektrolit mentzer talasemi demir eksikliği anemi indeks düzeltilmiş sodyum kalsiyum anyon açığı egfr fib-4 apri hba1c homa ldl friedewald ferritin mcv rdw",
    custom: build,
    src: [S.patra, S.kumar, S.ntaios, S.inker, S.kdigo, S.shah, S.mcpherson, S.spasovski, S.katz, S.hillier, S.payne, S.figge, S.ada, S.temd, S.pasricha],
    note: "Bu araç tanı koymaz. Eşiklerin ve formüllerin kaynakları her uyarının altında verilir; kaynağı doğrulanamayan eşikler kullanılmamıştır (ör. potasyum ve sodyum için üst sınır uyarıları, ferritin kesim noktası). WHO anemi eşiklerinin bağlantısı eklenmemiştir. Değerler tarayıcıda hesaplanır, kaydedilmez ya da gönderilmez."
  };

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    var go = function () { if (window.KanuniEk) window.KanuniEk.register([["lab", "Laboratuvar"]], [TOOL]); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
  }
  if (typeof module !== "undefined") module.exports = { metinOku: metinOku, degerlendir: degerlendir, egfr: egfr, fib4: fib4, apri: apri, indeksler: indeksler, kalsiyumDuzeltilmis: kalsiyumDuzeltilmis, sodyumDuzeltilmis: sodyumDuzeltilmis, anyonAcigi: anyonAcigi, anyonAcigiDuzeltilmis: anyonAcigiDuzeltilmis, ldlFriedewald: ldlFriedewald, homaIr: homaIr, ortGlukoz: ortGlukoz, TOOL: TOOL };
})();
