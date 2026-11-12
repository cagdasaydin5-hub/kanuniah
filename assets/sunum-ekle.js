/* Sunum ekle formu: makale alanları, aynı sunum uyarısı. */
(function () {
  "use strict";
  var V = JSON.parse(document.getElementById("sf-veri").textContent || "{}");
  var $ = function (id) { return document.getElementById(id); };
  var tur = $("sf-tur"), sunan = $("sf-sunan"), dan = $("sf-danisman"),
      baslik = $("sf-baslik");

  function fold(s) {
    return String(s || "").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
      .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/â/g, "a").replace(/î/g, "i")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }
  function cift() {
    var a = fold(sunan.value), b = fold(baslik.value);
    var x = a && b && (V.kayitlar || []).filter(function (k) { return fold(k[0]) === a && fold(k[1]) === b; })[0];
    $("sf-cift").textContent = x ? "Bu sunum kütüphanede zaten var (" + x[2] + ")." : "";
  }

  function turDegisti() {
    var t = tur.value, hoca = t === "Hoca Sunumu" || t === "Rehber";
    $("sf-makale").hidden = t !== "Makale Sunumu";
    $("sf-mad").required = t === "Makale Sunumu";
    // ASM dersinde danışman isteğe bağlı
    $("sf-dan-k").hidden = hoca; dan.required = !hoca && t !== "ASM Sunumu";
  }

  tur.addEventListener("change", turDegisti);
  sunan.addEventListener("input", cift);
  baslik.addEventListener("input", cift);


  // Ders seçimi: tarih → sunum → dosya → Kaydet. Seçilen sunum tür, sunan, tarih, danışman, başlık ve kategoriyi
  // programdan doldurur; bu alanlar gizli kalır. "Programda yok" seçilirse form elle doldurulur.
  var D = V.dersler || [], hafta = $("sf-hafta"), ders = $("sf-ders"), kat = $("sf-kat"), tarihEl = $("sf-tarih"),
      mad = $("sf-mad"), ozet = $("sf-ozet");
  var AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  var GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  var KISA = { "Seminer": "Seminer", "Makale Sunumu": "Makale", "Olgu Sunumu": "Olgu" };
  function gunAdi(iso) {
    var p = iso.split("-"), t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return t.getUTCDate() + " " + AY[t.getUTCMonth()] + " " + t.getUTCFullYear() + " " + GUN[t.getUTCDay()];
  }
  function opt(sel, value, text) { var o = document.createElement("option"); o.value = value; o.textContent = text; sel.appendChild(o); return o; }
  function secenekVar(sel, v) { return Array.prototype.some.call(sel.options, function (o) { return o.value === v; }); }
  function fld(el) { return el.closest(".fld") || el; }
  function secili() {
    var h = D[+hafta.value], m = /^p(\d+)$/.exec(ders.value);
    return h && m ? h[1][+m[1]] : null;
  }

  // program = true: yalnızca tarih, sunum ve dosya görünür
  function mod() {
    var elle = ders.value === "elle", x = secili(), program = !elle;
    [tur, sunan, tarihEl, dan, kat, baslik].forEach(function (e) { fld(e).hidden = program; });
    // Makale sunumunda programdan seçilse de yalnızca "Makale adı" sorulur (başlık da bundan olur)
    var mak = tur.value === "Makale Sunumu" && (elle || !!x);
    $("sf-makale").hidden = !mak;
    Array.prototype.forEach.call($("sf-makale").querySelectorAll(".fields"), function (f) { f.hidden = program && !f.contains(mad); });
    kat.required = baslik.required = sunan.required = elle;
    mad.required = mak;
    dan.required = elle && ["Hoca Sunumu", "Rehber", "ASM Sunumu"].indexOf(tur.value) === -1;
    ozet.hidden = !x;
    ozet.textContent = x ? (x[0] + " · " + x[1] + (x[2] ? " · " + x[2] : "") + (x[3] ? " · Danışman: " + x[3] : "")
      + (x[5] ? " — Bu sunum kütüphanede zaten görünüyor." : "")) : "";
  }
  function dersleriCiz() {
    ders.textContent = "";
    opt(ders, "", "Sunumu seçin");
    var h = D[+hafta.value];
    if (h) h[1].forEach(function (x, i) {
      opt(ders, "p" + i, KISA[x[0]] + " · " + x[1] + (x[2] ? " · " + x[2] : "") + (x[5] ? " ✓" : ""));
    });
    opt(ders, "elle", "Programda yok (ASM dersi vb.), elle dolduracağım");
    mod();
  }
  function dersSecildi() {
    var h = D[+hafta.value], x = secili();
    if (x) {
      if (secenekVar(tur, x[0])) tur.value = x[0];
      sunan.value = x[1];
      tarihEl.value = h[0];
      dan.value = x[3];
      baslik.value = x[2] || "";
      kat.value = x[4] && secenekVar(kat, x[4]) ? x[4] : "";
      turDegisti(); cift();
    }
    mod();
  }

  if (D.length) {
    D.forEach(function (h, i) { opt(hafta, String(i), gunAdi(h[0])); });
    // Bağlantıyla ya da hatalı gönderimden gelen değerler (sunan + tarih + tür) varsa o sunumu seç
    var on = fold(sunan.value), onT = tarihEl.value, bul = -1, bulD = -1;
    if (on) D.forEach(function (h, i) {
      if (h[0] !== onT) return;
      h[1].forEach(function (x, j) { if (fold(x[1]) === on && x[0] === tur.value) { bul = i; bulD = j; } });
    });
    hafta.value = String(bul > -1 ? bul : 0);
    dersleriCiz();
    if (bulD > -1) ders.value = "p" + bulD;
    else if (on) ders.value = "elle";
    ders.required = true;
    hafta.addEventListener("change", dersleriCiz);
    ders.addEventListener("change", dersSecildi);
    tur.addEventListener("change", mod);
    $("sf-ders-k").hidden = false;
    mod();
  }
  turDegisti(); cift();
  if (D.length) mod();
})();
