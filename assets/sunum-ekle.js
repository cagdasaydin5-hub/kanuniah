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
    $("sf-dan-k").hidden = hoca; dan.required = !hoca;
  }

  tur.addEventListener("change", turDegisti);
  sunan.addEventListener("input", cift);
  baslik.addEventListener("input", cift);

  // Ders seçimi: akademik programdan tarih + ders; seçilen ders formu doldurur.
  var D = V.dersler || [], hafta = $("sf-hafta"), ders = $("sf-ders"), kat = $("sf-kat"), tarihEl = $("sf-tarih");
  var AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  var GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  var KISA = { "Seminer": "Seminer", "Makale Sunumu": "Makale", "Olgu Sunumu": "Olgu" };
  function gunAdi(iso) {
    var p = iso.split("-"), t = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return t.getUTCDate() + " " + AY[t.getUTCMonth()] + " " + t.getUTCFullYear() + " " + GUN[t.getUTCDay()];
  }
  function opt(sel, value, text) { var o = document.createElement("option"); o.value = value; o.textContent = text; sel.appendChild(o); return o; }
  function secenekVar(sel, v) { return Array.prototype.some.call(sel.options, function (o) { return o.value === v; }); }
  function dersleriCiz() {
    ders.textContent = "";
    opt(ders, "", "Dersi seçin");
    var h = D[+hafta.value];
    if (h) h[1].forEach(function (x, i) {
      opt(ders, String(i), KISA[x[0]] + " · " + x[1] + (x[2] ? " · " + x[2] : "") + (x[5] ? " (eklendi)" : ""));
    });
    opt(ders, "elle", "Programda yok, elle dolduracağım");
  }
  function dersSecildi() {
    var h = D[+hafta.value], x = h && ders.value !== "" && ders.value !== "elle" ? h[1][+ders.value] : null;
    if (!x) return;
    if (secenekVar(tur, x[0])) tur.value = x[0];
    sunan.value = x[1];
    tarihEl.value = h[0];
    dan.value = x[3];
    if (x[2]) baslik.value = x[2];
    if (x[4] && secenekVar(kat, x[4])) kat.value = x[4];
    turDegisti(); cift();
    var hedef = x[0] === "Makale Sunumu" ? $("sf-mad") : (!baslik.value ? baslik : (!kat.value ? kat : null));
    if (hedef) hedef.focus();
  }
  // Makale sunumunda sunum başlığı boşsa makale adını başlığa da yaz
  $("sf-mad").addEventListener("input", function () {
    if (tur.value !== "Makale Sunumu" || (baslik.value && !baslik.dataset.oto)) return;
    baslik.value = $("sf-mad").value; baslik.dataset.oto = "1"; cift();
  });
  baslik.addEventListener("input", function () { delete baslik.dataset.oto; });
  if (D.length) {
    D.forEach(function (h, i) { opt(hafta, String(i), gunAdi(h[0])); });
    // Bağlantıyla gelen ön doldurma (sunan + tarih) varsa o dersi seç
    var on = fold(sunan.value), onT = tarihEl.value, bul = -1, bulD = -1;
    if (on) D.forEach(function (h, i) {
      if (h[0] !== onT) return;
      h[1].forEach(function (x, j) { if (fold(x[1]) === on && x[0] === tur.value) { bul = i; bulD = j; } });
    });
    hafta.value = String(bul > -1 ? bul : 0);
    dersleriCiz();
    if (bulD > -1) ders.value = String(bulD);
    hafta.addEventListener("change", dersleriCiz);
    ders.addEventListener("change", dersSecildi);
    $("sf-ders-k").hidden = false; $("sf-ders-not").hidden = false;
  }
  turDegisti(); cift();
})();
