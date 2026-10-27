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

  function satir(x) {
    var a = el("article", "kitap");
    var b = el("div", "kitap-bas");
    var tag = el("span", "tag " + (TAG[x.type] || "arch"), TURK[x.type] || x.type);
    b.appendChild(tag);
    var t = el("a", "kitap-ad", x.title); t.href = href(x.path, false); t.target = "_blank"; t.rel = "noopener";
    b.appendChild(t);
    a.appendChild(b);
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
    var m = el("div", "meta");
    if (x.presenter) m.appendChild(el("span", null, x.presenter));
    if (x.advisor) m.appendChild(el("span", null, "Danışman: " + x.advisor));
    m.appendChild(el("span", null, x.year));
    if (x.slides) m.appendChild(el("span", null, x.slides + " slayt"));
    m.appendChild(el("span", null, mb(x.size) + " · " + x.path.split(".").pop().toUpperCase()));
    var i = el("a", "chip", "İndir"); i.href = href(x.path, true);
    m.appendChild(i);
    a.appendChild(m);
    return a;
  }

  function grupla(liste) {
    var g = {}; var sira = [];
    liste.forEach(function (x) {
      var k = x.cat + "›" + x.topic;
      if (!g[k]) { g[k] = { group: x.cat, topic: x.topic, items: [] }; sira.push(k); }
      g[k].items.push(x);
    });
    sira.sort(function (a, b) { return katSira(g[a].group) - katSira(g[b].group) || g[a].topic.localeCompare(g[b].topic, "tr"); });
    return sira.map(function (k) { return g[k]; });
  }

  // Ana kategoriler sabit sırada; "Diğer" en sonda
  var KAT = ["Aile Hekimliği ve Birinci Basamak", "Koruyucu Hekimlik", "İç Hastalıkları", "Pediatri",
    "Kadın Hastalıkları ve Doğum", "Geriatri, Evde Sağlık ve Palyatif Bakım", "Psikiyatri", "Nöroloji",
    "Cerrahi ve Acil", "Deri, KBB ve Göz", "Diğer"];
  function katSira(c) { var i = KAT.indexOf(c); return i === -1 ? KAT.length : i; }

  function konuBlok(k, acik) {
    var d = el("details", "konu"); d.open = !!acik;
    var s = el("summary"); s.appendChild(el("b", null, k.topic));
    s.appendChild(el("span", "c", k.items.length + " materyal"));
    d.appendChild(s);
    k.items.sort(function (a, b) { return TUR.indexOf(a.type) - TUR.indexOf(b.type) || b.year.localeCompare(a.year); })
      .forEach(function (x) { d.appendChild(satir(x)); });
    return d;
  }

  function ciz() {
    var t = terimler();
    var temel = tur ? veri.filter(function (x) { return x.type === tur; }) : veri;
    out.innerHTML = "";
    if (!t.length) {
      // Konu dizini: tüm gruplar ve konular açık; isteyen aşağı kaydırır ya da üstteki bağlantılarla atlar
      var liste = grupla(temel);
      count.textContent = temel.length + " materyal · " + liste.length + " konu";
      var gruplar = {};
      liste.forEach(function (k) { (gruplar[k.group] = gruplar[k.group] || []).push(k); });
      var adlar = Object.keys(gruplar).sort(function (a, b) { return katSira(a) - katSira(b); });
      var atla = el("nav", "chips atla"); atla.setAttribute("aria-label", "Kategoriye atla");
      adlar.forEach(function (gad) {
        var a = el("a", "chip", gad); a.href = "#g-" + fold(gad).replace(/[^a-z0-9]+/g, "-");
        a.appendChild(el("span", "c", String(gruplar[gad].reduce(function (n, k) { return n + k.items.length; }, 0))));
        atla.appendChild(a);
      });
      out.appendChild(atla);
      adlar.forEach(function (gad) {
        var sec = el("section", "grup");
        var h = el("h2", null, gad); h.id = "g-" + fold(gad).replace(/[^a-z0-9]+/g, "-");
        sec.appendChild(h);
        gruplar[gad].forEach(function (k) { sec.appendChild(konuBlok(k, acik)); });
        out.appendChild(sec);
      });
      dugme();
      return;
    }
    var basliktan = temel.filter(function (x) { return uyar(x, t); });
    var icerikten = temel.filter(function (x) { return !uyar(x, t) && metinde(x, t); });
    count.textContent = (basliktan.length + icerikten.length) + " sonuç";
    if (!basliktan.length && !icerikten.length) { out.appendChild(el("p", "empty", "Bu konuda materyal bulunamadı. Daha kısa ya da farklı bir kelime deneyin.")); return; }
    if (basliktan.length) {
      var h = el("h2", null, "Konu ve başlıkta eşleşenler"); out.appendChild(h);
      grupla(basliktan).forEach(function (k) { out.appendChild(konuBlok(k, acik)); });
    }
    if (icerikten.length) {
      var h2 = el("h2", null, "Slayt içeriğinde geçenler"); out.appendChild(h2);
      var d = el("details", "konu"); d.open = !basliktan.length;
      var s = el("summary"); s.appendChild(el("b", null, "Başlığında değil ama içinde bu kelime geçen sunumlar"));
      s.appendChild(el("span", "c", icerikten.length + " materyal")); d.appendChild(s);
      icerikten.sort(function (a, b) { return a.topic.localeCompare(b.topic, "tr"); }).forEach(function (x) {
        var r = satir(x); r.firstChild.appendChild(el("span", "c", " · " + x.topic)); d.appendChild(r);
      });
      out.appendChild(d);
    }
    dugme();
  }

  // Tümünü aç / kapat
  function dugme() { if (hepsi) hepsi.textContent = acik ? "Tümünü kapat" : "Tümünü aç"; }
  if (hepsi) hepsi.onclick = function () {
    acik = !acik;
    Array.prototype.forEach.call(out.querySelectorAll("details.konu"), function (d) { d.open = acik; });
    dugme();
  };

  var zam = null;
  q.addEventListener("input", function () { clearTimeout(zam); zam = setTimeout(ciz, 120); });
})();
