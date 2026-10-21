/* Sunum ekle formu: konu/grup, makale alanları, aynı sunum uyarısı. */
(function () {
  "use strict";
  var V = JSON.parse(document.getElementById("sf-veri").textContent || "{}");
  var $ = function (id) { return document.getElementById(id); };
  var tur = $("sf-tur"), sunan = $("sf-sunan"), dan = $("sf-danisman"),
      konu = $("sf-konu"), grupK = $("sf-grup-k"), grup = $("sf-grup"), baslik = $("sf-baslik");

  function fold(s) {
    return String(s || "").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
      .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/â/g, "a").replace(/î/g, "i")
      .replace(/[^a-z0-9]+/g, " ").trim();
  }
  var konuBul = {}; Object.keys(V.konular || {}).forEach(function (k) { konuBul[fold(k)] = k; });

  // Kütüphanede olmayan konu yazılırsa grup sorulur
  function konuDegisti() {
    var yeni = konu.value.trim().length >= 3 && !konuBul[fold(konu.value)];
    grupK.hidden = !yeni; grup.required = yeni;
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
  konu.addEventListener("input", konuDegisti);
  turDegisti(); konuDegisti(); cift();
})();
