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
  turDegisti(); cift();
})();
