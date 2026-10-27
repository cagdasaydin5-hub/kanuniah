/* Materyal kütüphanesi: dizin kutuphane.php?veri=1 ile gelir, arama tarayıcıda yapılır. */
(function () {
  "use strict";
  var KOK = "Kütüphane/";
  var ES = {
    ht: "hipertansiyon", tansiyon: "hipertansiyon", kb: "kan basinci",
    dm: "diyabet", seker: "diyabet", diabet: "diyabet", oad: "antidiyabetik",
    asi: "bagisiklama", asilar: "bagisiklama", koah: "kronik obstruktif",
    ky: "kalp yetmezligi", mi: "miyokard", af: "atrial fibrilasyon",
    iye: "idrar yolu", usye: "ust solunum", asye: "alt solunum", kby: "bobrek",
    gebe: "gebelik", hamile: "gebelik", cocuk: "pediatri", bebek: "cocuk",
    yasli: "geriatri", psm: "periyodik saglik", vaka: "olgu", olgu: "olgu",
    makale: "makale", seminer: "seminer", hoca: "hoca"
  };

  function fold(s) {
    return String(s || "").toLocaleLowerCase("tr")
      .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
      .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
      .replace(/â/g, "a").replace(/î/g, "i").replace(/û/g, "u").replace(/̇/g, "");
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function mb(b) { return b < 1048576 ? Math.round(b / 1024) + " KB" : (b / 1048576).toFixed(1).replace(".", ",") + " MB"; }
  function href(p, indir) { return "dosyalar.php?d=" + encodeURIComponent(KOK + p) + (indir ? "&indir=1" : ""); }

  var TUR = ["Seminer", "Makale Sunumu", "Olgu Sunumu", "Hoca Sunumu", "Rehber"];
  var TURK = { "Seminer": "Seminer", "Makale Sunumu": "Makale", "Olgu Sunumu": "Olgu", "Hoca Sunumu": "Hoca sunumu", "Rehber": "Rehber" };
  var TAG = { "Seminer": "int", "Makale Sunumu": "new", "Olgu Sunumu": "law", "Hoca Sunumu": "staff", "Rehber": "arch" };

  var veri = [], q = document.getElementById("q"), out = document.getElementById("kutuphane"),
      chips = document.getElementById("tur"), count = document.getElementById("count"),
      tur = "", acik = false, hepsi = document.getElementById("hepsi");

  fetch("kutuphane.php?veri=1", { cache: "no-store" }).then(function (r) {
    if (!r.ok) throw new Error("dizin");
    return r.json();
  }).then(function (d) {
    veri = d.map(function (x) {
      x.cat = x.cat || "Diğer";
      x.ad = duzenle(x.title); x.konu = duzenle(x.topic);
      x.hay = fold([x.title, x.topic, x.cat, x.group, x.presenter, x.advisor, x.year, TURK[x.type], x.article ? x.article.title + " " + x.article.journal : ""].join(" "));
      x.metin = fold(x.keywords || "");
      return x;
    });
    turChips(); ciz();
  }).catch(function () { out.innerHTML = ""; out.appendChild(el("p", "empty", "Dizin yüklenemedi. Sayfayı yenileyin ya da site yöneticisine haber verin.")); });

  function turChips() {
    chips.innerHTML = "";
    [["", "Tümü"]].concat(TUR.map(function (t) { return [t, TURK[t]]; })).forEach(function (p) {
      var n = p[0] ? veri.filter(function (x) { return x.type === p[0]; }).length : veri.length;
      if (!n) return;
      var b = el("button", "chip", p[1]); b.type = "button";
      b.setAttribute("aria-pressed", String(tur === p[0]));
      b.appendChild(el("span", "c", String(n)));
      b.onclick = function () { tur = p[0]; turChips(); ciz(); };
      chips.appendChild(b);
    });
  }

  // Her terim için alternatifler: yazılan kelime ve varsa eş anlamlısı (ht → hipertansiyon)
  function terimler() {
    return fold(q.value.trim()).split(/\s+/).filter(Boolean).map(function (t) { return ES[t] ? [t, ES[t]] : [t]; });
  }
  function icinde(s, alts) { return alts.some(function (w) { return s.indexOf(w) !== -1; }); }
  function uyar(x, t) {
    return t.every(function (alts) { return icinde(x.hay, alts); });
  }
  function metinde(x, t) {
    return t.every(function (alts) { return icinde(x.hay, alts) || icinde(x.metin, alts.filter(function (w) { return w.length >= 4; })); });
  }

  // Başlık düzeni: "aile hekimliğinin TARİHÇESİ" → "Aile Hekimliğinin Tarihçesi"; kısaltmalar (KOAH, HPV) korunur.
  var KUCUK = { "ve": 1, "ile": 1, "veya": 1, "ya": 1, "da": 1, "de": 1, "ki": 1, "mi": 1, "için": 1, "gibi": 1,
    "and": 1, "of": 1, "the": 1, "in": 1, "on": 1, "for": 1, "to": 1, "a": 1, "an": 1, "with": 1, "vs": 1, "or": 1, "at": 1, "by": 1 };
  var KISA = ("KOAH HPV DM HT ASM WONCA EKG KBY KKY KY MI AF BPH DEHB HIV TSH İYE ÜSYE ASYE GERD IBS KVKK TUS ABD DSÖ WHO NICE " +
    "ADA ESC ESH COVID SARS PCOS PKOS OSAS KPR PSM EAH KKKA RSV BCG KKK OPV BT USG MR MRG PET NSAİİ NSAID PPI ACE ARB SGLT2 " +
    "GLP-1 DPP-4 HBA1C LDL HDL B12 CRP INR OAK NOAK YOAK ALS MS SLE RA FMF TB TBC ÇKS DVT PE KAH SVO TİA AKS ABY KBH ICPC SOAP " +
    "BMJ JAMA NEJM AAFP USPSTF GINA GOLD KDIGO EULAR ACR AHA ACC TEMD TKD THD TAHUD AHEF EBM KDS RCT HbA1c").split(" ");
  var KISA_K = {}; KISA.forEach(function (k) { KISA_K[k.toLocaleUpperCase("tr")] = k; });
  function buyuk(w) { return w.charAt(0).toLocaleUpperCase("tr") + w.slice(1); }
  function duzenle(s) {
    s = String(s || "").replace(/\s+/g, " ").trim();
    var harf = s.replace(/[^A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû]/g, ""), bh = harf.replace(/[^A-ZÇĞİÖŞÜÂÎÛ]/g, "").length;
    var hepsiBuyuk = harf.length && bh / harf.length > 0.6;
    var n = 0;
    return s.split(" ").map(function (tok) {
      return tok.split(/([-\/(),:;"“”]+)/).map(function (w) {
        if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(w)) return w;
        var ilk = n++ === 0, ust = w.toLocaleUpperCase("tr"), kok = ust.replace(/['’].*$/, "");
        if (KISA_K[kok]) return KISA_K[kok] + w.slice(kok.length).toLocaleLowerCase("tr");
        // Karışık yazılmış metinde zaten büyük harfli kısa kelime ya da içinde rakam/iç büyük harf olan kelime kısaltmadır
        if (!hepsiBuyuk && (/^[A-ZÇĞİÖŞÜ0-9]{2,5}$/.test(w.replace(/['’].*$/, "")) || /[a-zçğıöşü][A-ZÇĞİÖŞÜ]/.test(w))) return w;
        var k = w.toLocaleLowerCase("tr");
        if (!ilk && KUCUK[k]) return k;
        return buyuk(k);
      }).join("");
    }).join(" ");
  }

  // Bir sunum: başlık (bağlantı) + tek satır bilgi
  function satir(x, konuGoster) {
    var a = el("article", "kitap");
    var t = el("a", "kitap-ad", x.ad); t.href = href(x.path, false); t.target = "_blank"; t.rel = "noopener";
    a.appendChild(t);
    var m = el("div", "meta");
    m.appendChild(el("span", "tag " + (TAG[x.type] || "arch"), TURK[x.type] || x.type));
    var bilgi = [];
    if (konuGoster) bilgi.push(x.konu);
    if (x.presenter) bilgi.push(x.presenter);
    if (x.advisor) bilgi.push("Danışman: " + x.advisor);
    bilgi.push(x.year);
    m.appendChild(el("span", "kitap-bilgi", bilgi.join(" · ")));
    var i = el("a", "kitap-indir", "İndir"); i.href = href(x.path, true);
    m.appendChild(i);
    a.appendChild(m);
    if (x.article && x.article.title) {
      var k = el("div", "meta kunye");
      k.appendChild(el("span", null, "Makale: " + x.article.title + (x.article.journal ? " · " + x.article.journal : "") + (x.article.year ? " " + x.article.year : "")));
      if (x.article.pmid || x.article.doi) {
        var l = el("a", null, x.article.pmid ? "PubMed" : "DOI");
        l.href = x.article.pmid ? "https://pubmed.ncbi.nlm.nih.gov/" + x.article.pmid + "/" : "https://doi.org/" + x.article.doi;
        l.target = "_blank"; l.rel = "noopener"; k.appendChild(l);
      }
      a.appendChild(k);
    }
    return a;
  }

  // Ana kategoriler sabit sırada; "Diğer" en sonda
  var KAT = ["Aile Hekimliği ve Birinci Basamak", "Koruyucu Hekimlik", "İç Hastalıkları", "Pediatri",
    "Kadın Hastalıkları ve Doğum", "Geriatri, Evde Sağlık ve Palyatif Bakım", "Psikiyatri", "Nöroloji",
    "Cerrahi ve Acil", "Deri, KBB ve Göz", "Diğer"];
  function katSira(c) { var i = KAT.indexOf(c); return i === -1 ? KAT.length : i; }

  // Kategori → konu → sunumlar
  function agac(liste) {
    var k = {};
    liste.forEach(function (x) {
      var c = k[x.cat] = k[x.cat] || {};
      (c[x.konu] = c[x.konu] || []).push(x);
    });
    return Object.keys(k).sort(function (a, b) { return katSira(a) - katSira(b); }).map(function (c) {
      var konular = Object.keys(k[c]).sort(function (a, b) { return a.localeCompare(b, "tr"); }).map(function (t) {
        return { ad: t, items: k[c][t].sort(function (a, b) { return TUR.indexOf(a.type) - TUR.indexOf(b.type) || String(b.year).localeCompare(String(a.year)); }) };
      });
      return { ad: c, konular: konular, n: konular.reduce(function (s, t) { return s + t.items.length; }, 0) };
    });
  }

  function katBlok(c, acik) {
    var d = el("details", "kat"); d.open = !!acik;
    var s = el("summary");
    s.appendChild(el("b", null, c.ad));
    s.appendChild(el("span", "c", c.n + " sunum"));
    d.appendChild(s);
    // Konu ara başlığı yok: sunumlar konu sırasıyla doğrudan kategorinin altında
    var k = el("div", "konu-grup");
    c.konular.forEach(function (t) { t.items.forEach(function (x) { k.appendChild(satir(x)); }); });
    d.appendChild(k);
    return d;
  }

  function ciz() {
    var t = terimler();
    var temel = tur ? veri.filter(function (x) { return x.type === tur; }) : veri;
    out.innerHTML = "";
    if (!t.length) {
      var a = agac(temel);
      count.textContent = temel.length + " sunum";
      a.forEach(function (c) { out.appendChild(katBlok(c, acik)); });
      dugme();
      return;
    }
    var basliktan = temel.filter(function (x) { return uyar(x, t); });
    var icerikten = temel.filter(function (x) { return !uyar(x, t) && metinde(x, t); });
    count.textContent = (basliktan.length + icerikten.length) + " sonuç";
    if (!basliktan.length && !icerikten.length) { out.appendChild(el("p", "empty", "Bu konuda materyal bulunamadı. Daha kısa ya da farklı bir kelime deneyin.")); return; }
    if (basliktan.length) {
      out.appendChild(el("h2", null, "Konu ve başlıkta eşleşenler"));
      agac(basliktan).forEach(function (c) { out.appendChild(katBlok(c, true)); });
    }
    if (icerikten.length) {
      out.appendChild(el("h2", null, "Slayt içeriğinde geçenler"));
      var d = el("details", "kat"); d.open = !basliktan.length;
      var s = el("summary"); s.appendChild(el("b", null, "Başlığında değil, slaytlarında geçenler"));
      s.appendChild(el("span", "c", icerikten.length + " sunum")); d.appendChild(s);
      var k = el("div", "konu-grup");
      icerikten.sort(function (a, b) { return a.konu.localeCompare(b.konu, "tr"); }).forEach(function (x) { k.appendChild(satir(x, true)); });
      d.appendChild(k);
      out.appendChild(d);
    }
    dugme();
  }

  // Tümünü aç / kapat
  function dugme() { if (hepsi) hepsi.textContent = acik ? "Tümünü kapat" : "Tümünü aç"; }
  if (hepsi) hepsi.onclick = function () {
    acik = !acik;
    Array.prototype.forEach.call(out.querySelectorAll("details.kat"), function (d) { d.open = acik; });
    dugme();
  };

  var zam = null;
  q.addEventListener("input", function () { clearTimeout(zam); zam = setTimeout(ciz, 120); });
})();
