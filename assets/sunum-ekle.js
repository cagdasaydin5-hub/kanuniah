/* Sunum ekle formu: akademik programdan öneri, konu/grup, çift kayıt uyarısı, makale künyesi (PubMed). Asıl kontroller sunucuda. */
(function () {
  "use strict";
  var V = JSON.parse(document.getElementById("sf-veri").textContent || "{}");
  var $ = function (id) { return document.getElementById(id); };
  var tur = $("sf-tur"), sunan = $("sf-sunan"), tarih = $("sf-tarih"), dan = $("sf-danisman"),
      konu = $("sf-konu"), grupK = $("sf-grup-k"), grup = $("sf-grup"), baslik = $("sf-baslik");
  var AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  var GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

  function fold(s) {
    return String(s || "").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
      .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[âî]/g, function (c) { return c === "â" ? "a" : "i"; })
      .replace(/[^a-z0-9]+/g, " ").trim();
  }
  function gun(iso) { var d = new Date(iso + "T12:00:00"); return d.getDate() + " " + AY[d.getMonth()] + " " + d.getFullYear() + " " + GUN[d.getDay()]; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  var konuBul = {}; Object.keys(V.konular || {}).forEach(function (k) { konuBul[fold(k)] = k; });

  // Akademik programda bu kişinin bu türdeki sunumları: tıklayınca tarih, danışman ve (seminerde) başlık dolar
  function program() {
    var kutu = $("sf-program"); kutu.innerHTML = "";
    var ad = fold(sunan.value), t = tur.value;
    if (ad.split(" ").length < 2 || !/^(Seminer|Makale Sunumu|Olgu Sunumu)$/.test(t)) return;
    var bul = (V.program || []).filter(function (s) { return s[0] === t && fold(s[1]) === ad; });
    if (!bul.length) { kutu.textContent = "Akademik programda bu adla " + t.toLocaleLowerCase("tr") + " bulunamadı. Yine de ekleyebilirsiniz; kayıt \"programda yok\" olarak işaretlenir."; return; }
    var cogul = { "Seminer": "seminerleriniz", "Makale Sunumu": "makale sunumlarınız", "Olgu Sunumu": "olgu sunumlarınız" }[t];
    kutu.appendChild(document.createTextNode("Akademik programdaki " + cogul + " (seçince tarih ve danışman dolar): "));
    bul.sort(function (a, b) { return b[3].localeCompare(a[3]); }).forEach(function (s) {
      var b = el("button", "chip", gun(s[3]) + (s[2] ? " · " + s[2] : "")); b.type = "button";
      b.onclick = function () {
        tarih.value = s[3];
        if (s[4]) dan.value = s[4];
        if (s[2]) {
          if (!baslik.value) baslik.value = s[2];
          if (!konu.value && konuBul[fold(s[2])]) konu.value = konuBul[fold(s[2])];
        }
        konuDegisti(); cift();
      };
      kutu.appendChild(b);
    });
  }

  function konuDegisti() {
    var var_ = konuBul[fold(konu.value)], not = $("sf-konu-not");
    var yeni = konu.value.trim().length >= 3 && !var_;
    grupK.hidden = !yeni; grup.required = yeni;
    not.textContent = var_ ? "Kütüphanede “" + var_ + "” konusunun altına girecek (" + V.konular[var_] + ")." :
      (yeni ? "Bu konu kütüphanede yok; yeni konu açılacak. Benzer bir konu varsa listeden onu seçin ki aynı konudaki sunumlar bir arada dursun." : "");
  }

  function cift() {
    var a = fold(sunan.value), b = fold(baslik.value), not = $("sf-cift");
    var x = a && b && (V.kayitlar || []).filter(function (k) { return fold(k[0]) === a && fold(k[1]) === b; })[0];
    not.textContent = x ? "Bu sunan ve başlıkla bir kayıt zaten var (" + x[2] + "). Aynı sunumu ikinci kez eklemeyin." : "";
  }

  function turDegisti() {
    var t = tur.value;
    $("sf-makale").hidden = t !== "Makale Sunumu";
    var hoca = t === "Hoca Sunumu" || t === "Rehber";
    $("sf-dan-k").hidden = hoca; dan.required = !hoca;
    program();
  }

  $("sf-getir").onclick = function () {
    var g = $("sf-kimlik").value.trim() || $("sf-mad").value.trim(), not = $("sf-kunye"), btn = this;
    if (!g) { not.textContent = "Önce PMID, DOI ya da makale adını yazın."; return; }
    btn.disabled = true; not.textContent = "PubMed'de aranıyor…";
    fetch("sunum-ekle.php?kunye=" + encodeURIComponent(g), { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (k) {
      btn.disabled = false;
      if (k.hata) { not.textContent = k.hata; return; }
      $("sf-mad").value = k.title; $("sf-dergi").value = k.journal; $("sf-myil").value = k.year;
      if (!$("sf-kimlik").value.trim()) $("sf-kimlik").value = k.pmid || k.doi;
      not.innerHTML = "";
      not.appendChild(document.createTextNode("✓ " + k.kaynak + " künyesi: " + (k.authors ? k.authors + ". " : "") + k.title + ". " + k.journal + " " + k.year + ". "));
      var a = el("a", null, k.pmid ? "PMID " + k.pmid : "DOI " + k.doi);
      a.href = k.pmid ? "https://pubmed.ncbi.nlm.nih.gov/" + k.pmid + "/" : "https://doi.org/" + k.doi; a.target = "_blank"; a.rel = "noopener";
      not.appendChild(a);
      not.appendChild(document.createTextNode(" — Doğru makale değilse PMID/DOI'yi düzeltin."));
    }).catch(function () { btn.disabled = false; not.textContent = "Künye alınamadı; makale bilgilerini elle yazın."; });
  };

  tur.addEventListener("change", turDegisti);
  sunan.addEventListener("input", function () { program(); cift(); });
  baslik.addEventListener("input", cift);
  konu.addEventListener("input", konuDegisti);
  $("sf").addEventListener("submit", function (e) {
    var b = e.target.querySelector("button[type=submit]");
    setTimeout(function () { b.disabled = true; b.textContent = "Kontrol ediliyor…"; }, 0);
  });
  turDegisti(); konuDegisti(); cift();
})();
