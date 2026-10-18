/* Akademik program: veri akademik.php sayfasına gömülüdür; süzme ve arama tarayıcıda yapılır. */
(function () {
  "use strict";
  var kutu = document.getElementById("ak-veri");
  var d = null;
  try { d = JSON.parse(kutu.textContent); } catch (e) { d = null; }
  if (!d || !d.haftalar) return;

  var AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  var GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  var ROL = { seminer: "Seminer", makale: "Makale sunumu", olgu: "Olgu sunumu", danisman: "Danışman" };
  var unvan = d.unvan || {};

  function fold(s) {
    return String(s || "").toLocaleLowerCase("tr")
      .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
      .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/̇/g, "");
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function parca(iso) { var p = iso.split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function tarih(iso, kisa) {
    var t = parca(iso);
    return t.getUTCDate() + " " + AY[t.getUTCMonth()] + (kisa ? "" : " " + t.getUTCFullYear()) + " " + GUN[t.getUTCDay()];
  }
  function bugun() {
    var p = {};
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return p.year + "-" + p.month + "-" + p.day;
  }
  function tamAd(ad) { return unvan[ad] ? unvan[ad] + " " + ad : ad; }
  function depo(k, v) {
    try { if (v === undefined) return localStorage.getItem(k) || ""; if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { return ""; }
  }

  var BUGUN = bugun();
  var H = d.haftalar;
  var siradaki = null;
  for (var i = 0; i < H.length; i++) if (H[i].tarih >= BUGUN) { siradaki = H[i]; break; }

  // Her haftanın aranabilir metni ve kişileri
  var sayac = {};
  H.forEach(function (h) {
    var kisiler = [], metin = [];
    h.seminer.forEach(function (s) { if (s.ad) kisiler.push(s.ad); metin.push(s.konu, s.ad); });
    h.makale.concat(h.olgu).forEach(function (a) { kisiler.push(a); metin.push(a); });
    if (h.danisman) { kisiler.push(h.danisman); metin.push(h.danisman); }
    metin.push(tarih(h.tarih));
    h._kisi = kisiler;
    h._metin = fold(metin.join(" "));
    kisiler.forEach(function (k) { sayac[k] = (sayac[k] || 0) + 1; });
  });

  // Üst bilgi
  if (d.baslik) {
    document.getElementById("ak-baslik").textContent = d.baslik.replace(/^Aile Hekimliği Kliniği\s*/, "").replace(/^(\d{4}-\d{4}) Yılı /, "$1 ");
    document.title = "Akademik program · Eğitim";
  }
  var ust = [];
  if (d.saat) ust.push("Toplantı saati " + d.saat.replace("-", "–") + (d.ara ? ", ara " + d.ara.replace("-", "–") : ""));
  if (d.koordinator) ust.push("Koordinatör: " + d.koordinator);
  ust.push(H.length + " toplantı: " + tarih(H[0].tarih) + " – " + tarih(H[H.length - 1].tarih));
  document.getElementById("ak-ust").textContent = ust.join(" · ");

  // Denetimler
  var q = document.getElementById("q"), sel = document.getElementById("ak-kisi"),
      donemKutu = document.getElementById("ak-donem"), count = document.getElementById("count"),
      out = document.getElementById("ak-tablo"), gorev = document.getElementById("ak-gorev"),
      siraKutu = document.getElementById("ak-sira");
  var coll = (window.Intl && Intl.Collator) ? new Intl.Collator("tr").compare : function (a, b) { return a < b ? -1 : 1; };
  Object.keys(sayac).sort(coll).forEach(function (k) {
    var o = el("option", null, k + " (" + sayac[k] + ")");
    o.value = k;
    sel.appendChild(o);
  });
  var kayitli = depo("ak-kisi");
  if (kayitli && sayac[kayitli]) sel.value = kayitli;

  var DONEM = [["gelecek", "Gelecek"], ["gecmis", "Geçmiş"], ["tumu", "Tümü"]];
  var donem = "gelecek";
  DONEM.forEach(function (x) {
    var b = el("button", "chip", x[1]);
    b.type = "button";
    b.setAttribute("aria-pressed", String(x[0] === donem));
    b.addEventListener("click", function () {
      donem = x[0];
      Array.prototype.forEach.call(donemKutu.children, function (c) { c.setAttribute("aria-pressed", String(c === b)); });
      ciz();
    });
    donemKutu.appendChild(b);
  });

  function adEl(ad, kisi) {
    var s = el("span", "ak-ad" + (kisi && ad === kisi ? " ben" : ""), tamAd(ad));
    return s;
  }
  function liste(adlar, kisi) {
    var ul = el("ul", "ak-liste");
    adlar.forEach(function (a) { var li = el("li"); li.appendChild(adEl(a, kisi)); ul.appendChild(li); });
    return ul;
  }
  function seminerler(h, kisi) {
    var ul = el("ul", "ak-liste ak-sem");
    h.seminer.forEach(function (s) {
      var li = el("li");
      li.appendChild(el("span", "ak-konu", s.konu));
      if (s.ad) li.appendChild(adEl(s.ad, kisi));
      if (kisi && s.ad === kisi) li.className = "ben";
      ul.appendChild(li);
    });
    return ul;
  }
  function hucre(tr, etiket, icerik, cls) {
    var td = el("td", cls);
    td.setAttribute("data-k", etiket);
    if (typeof icerik === "string") td.textContent = icerik; else if (icerik) td.appendChild(icerik);
    tr.appendChild(td);
  }

  function siraCiz() {
    siraKutu.textContent = "";
    if (!siradaki) return;
    var h = siradaki, kisi = sel.value;
    var k = el("section", "ak-kart");
    var bas = el("div", "ak-kart-bas");
    bas.appendChild(el("span", "eyebrow", siradaki.tarih === BUGUN ? "Bugünkü toplantı" : "Sıradaki toplantı"));
    bas.appendChild(el("b", null, tarih(h.tarih)));
    k.appendChild(bas);
    if (h.seminer.length) k.appendChild(seminerler(h, kisi));
    var alt = el("p", "ak-kart-alt");
    [["Makale", h.makale], ["Olgu", h.olgu]].forEach(function (x) {
      if (!x[1].length) return;
      alt.appendChild(el("span", "ak-et", x[0]));
      alt.appendChild(document.createTextNode(x[1].join(", ") + "   "));
    });
    if (h.danisman) { alt.appendChild(el("span", "ak-et", "Danışman")); alt.appendChild(document.createTextNode(tamAd(h.danisman))); }
    if (alt.childNodes.length) k.appendChild(alt);
    siraKutu.appendChild(k);
  }

  function gorevCiz(kisi) {
    gorev.textContent = "";
    if (!kisi) return;
    var satir = [];
    H.forEach(function (h) {
      h.seminer.forEach(function (s) { if (s.ad === kisi) satir.push([h.tarih, ROL.seminer, s.konu]); });
      if (h.makale.indexOf(kisi) > -1) satir.push([h.tarih, ROL.makale, ""]);
      if (h.olgu.indexOf(kisi) > -1) satir.push([h.tarih, ROL.olgu, ""]);
      if (h.danisman === kisi) satir.push([h.tarih, ROL.danisman, ""]);
    });
    var k = el("section", "ak-gorevler");
    k.appendChild(el("h2", null, tamAd(kisi) + " · " + satir.length + " görev"));
    var ul = el("ul", "ak-liste");
    satir.forEach(function (s) {
      var li = el("li", s[0] < BUGUN ? "gecmis" : "");
      li.appendChild(el("span", "ak-tarih", tarih(s[0])));
      li.appendChild(el("span", "ak-et", s[1]));
      if (s[2]) li.appendChild(el("span", "ak-konu", s[2]));
      ul.appendChild(li);
    });
    k.appendChild(ul);
    gorev.appendChild(k);
  }

  function ciz() {
    var kisi = sel.value, terim = fold(q.value.trim()).split(/\s+/).filter(Boolean);
    siraCiz();
    gorevCiz(kisi);
    var secili = H.filter(function (h) {
      if (donem === "gelecek" && h.tarih < BUGUN) return false;
      if (donem === "gecmis" && h.tarih >= BUGUN) return false;
      if (kisi && h._kisi.indexOf(kisi) < 0) return false;
      return terim.every(function (t) { return h._metin.indexOf(t) > -1; });
    });
    if (donem === "gecmis") secili.reverse();
    count.textContent = secili.length + " / " + H.length + " toplantı";
    out.textContent = "";
    if (!secili.length) { out.appendChild(el("p", "empty", "Bu süzgeçle toplantı yok.")); return; }
    var wrap = el("div", "tablewrap");
    var t = el("table", "asi ak");
    var thead = el("thead"), hr = el("tr");
    ["Tarih", "Seminerler", "Makale", "Olgu", "Danışman"].forEach(function (x) { hr.appendChild(el("th", null, x)); });
    thead.appendChild(hr); t.appendChild(thead);
    var tb = el("tbody");
    secili.forEach(function (h) {
      var tr = el("tr", (h.tarih < BUGUN ? "gecmis" : "") + (h === siradaki ? " siradaki" : ""));
      var td = el("td", "ak-t");
      td.setAttribute("data-k", "Tarih");
      td.appendChild(el("b", null, tarih(h.tarih, true)));
      td.appendChild(el("small", null, h.tarih.slice(0, 4)));
      tr.appendChild(td);
      hucre(tr, "Seminerler", h.seminer.length ? seminerler(h, kisi) : "");
      hucre(tr, "Makale", h.makale.length ? liste(h.makale, kisi) : "", h.makale.length ? "" : "bos");
      hucre(tr, "Olgu", h.olgu.length ? liste(h.olgu, kisi) : "", h.olgu.length ? "" : "bos");
      hucre(tr, "Danışman", h.danisman ? adEl(h.danisman, kisi) : "", h.danisman ? "" : "bos");
      tb.appendChild(tr);
    });
    t.appendChild(tb); wrap.appendChild(t); out.appendChild(wrap);
  }

  q.addEventListener("input", ciz);
  sel.addEventListener("change", function () { depo("ak-kisi", sel.value); ciz(); });
  ciz();
})();
