/* Çalışma listesi: veri calisma.php sayfasına gömülüdür; gün, kişi ve birim görünümü tarayıcıda hazırlanır. */
(function () {
  "use strict";
  var d = null;
  try { d = JSON.parse(document.getElementById("cl-veri").textContent); } catch (e) { d = null; }
  if (!d || !d.gunler) return;

  var AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  var GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function parca(iso) { var p = iso.split("-"); return new Date(Date.UTC(+p[0], +p[1] - 1, +p[2])); }
  function tarih(iso, yilsiz) {
    var t = parca(iso);
    return t.getUTCDate() + " " + AY[t.getUTCMonth()] + (yilsiz ? "" : " " + t.getUTCFullYear()) + " " + GUN[t.getUTCDay()];
  }
  function aralik(a, b) {
    if (a === b) return tarih(a);
    return tarih(a, a.slice(0, 4) === b.slice(0, 4)) + " – " + tarih(b);
  }
  function bugun() {
    var p = {};
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit" })
      .formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    return p.year + "-" + p.month + "-" + p.day;
  }
  function depo(k, v) {
    try { if (v === undefined) return localStorage.getItem(k) || ""; if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { return ""; }
  }

  var BUGUN = bugun();
  var TAR = Object.keys(d.gunler).sort();
  var DOLU = TAR.filter(function (t) { return Object.keys(d.gunler[t]).length > 0; });
  var birimler = d.birimler.slice();

  // Aynı adlı sütunlar "Ad#2" gibi ayrı anahtarlarla gelir; sayfada yalnızca ad gösterilir
  function etiket(b) { return b.replace(/#\d+$/, ""); }
  function kisiBirim(t, kisi) {
    var g = d.gunler[t], b = [];
    birimler.forEach(function (x) { if (g[x] && g[x].indexOf(kisi) > -1 && b.indexOf(etiket(x)) < 0) b.push(etiket(x)); });
    return b;
  }

  // Kişi listesi (gün sayısıyla)
  var sayac = {};
  TAR.forEach(function (t) {
    var gor = {};
    Object.keys(d.gunler[t]).forEach(function (b) { d.gunler[t][b].forEach(function (a) { if (!gor[a]) { gor[a] = 1; sayac[a] = (sayac[a] || 0) + 1; } }); });
  });
  var sel = document.getElementById("ak-kisi"), gunSel = document.getElementById("cl-gun");
  var coll = (window.Intl && Intl.Collator) ? new Intl.Collator("tr").compare : function (a, b) { return a < b ? -1 : 1; };
  Object.keys(sayac).sort(coll).forEach(function (k) {
    var o = el("option", null, k);
    o.value = k;
    sel.appendChild(o);
  });
  var kayitli = depo("ak-kisi");
  if (kayitli && sayac[kayitli]) sel.value = kayitli;

  var tum = el("option", null, "Tüm program"); tum.value = ""; gunSel.appendChild(tum);
  TAR.forEach(function (t) { var o = el("option", null, tarih(t)); o.value = t; gunSel.appendChild(o); });
  function varsayilan() {
    for (var i = 0; i < TAR.length; i++) if (TAR[i] >= BUGUN) return TAR[i];
    return TAR[TAR.length - 1];
  }
  gunSel.value = "";

  function kisiCiz() {
    var kutu = document.getElementById("cl-kisi"), kisi = sel.value, t = gunSel.value || varsayilan();
    kutu.textContent = "";
    if (!kisi) return;
    var k = el("section", "ak-kart");
    var bas = el("div", "ak-kart-bas");
    bas.appendChild(el("span", "eyebrow", t === BUGUN ? "Bugün" : tarih(t)));
    var b = kisiBirim(t, kisi);
    bas.appendChild(el("b", null, b.length ? b.join(" · ") : (Object.keys(d.gunler[t]).length ? "Listede yok" : "Bu gün için atama yok")));
    k.appendChild(bas);
    // Dönemler: aynı birim(ler)de geçen ardışık liste günleri bir dönem olur; boş günler (atama yapılmamış) atlanır
    var donem = [], son = null;
    DOLU.forEach(function (g) {
      var x = kisiBirim(g, kisi).join(" · ") || "Listede yok";
      if (son && son.yer === x) son.bitis = g; else { son = { yer: x, bas: g, bitis: g }; donem.push(son); }
    });
    var ul = el("ul", "ak-liste cl-donem");
    donem.forEach(function (p) {
      var li = el("li", (p.bitis < BUGUN ? "gecmis" : "") + (p.bas <= t && t <= p.bitis ? " simdi" : ""));
      li.appendChild(el("span", "ak-tarih", aralik(p.bas, p.bitis)));
      li.appendChild(el("span", p.yer === "Listede yok" ? "muted" : "ak-konu", p.yer));
      ul.appendChild(li);
    });
    k.appendChild(el("h2", "cl-alt", kisi + " · dönemler"));
    k.appendChild(ul);
    kutu.appendChild(k);
  }

  function adlar(td, liste, kisi) {
    liste.forEach(function (a, i) {
      if (i) td.appendChild(document.createTextNode(", "));
      td.appendChild(el("span", "ak-ad" + (a === kisi ? " ben" : ""), a));
    });
  }
  function tablo(basliklar) {
    var tb = el("table", "asi cl"), th = el("thead"), tr = el("tr");
    basliklar.forEach(function (x) { tr.appendChild(el("th", null, x)); });
    th.appendChild(tr); tb.appendChild(th);
    return tb;
  }

  // Tüm program: her birim için, aynı kişilerin çalıştığı ardışık günler tek satır
  function programCiz() {
    var out = document.getElementById("cl-gunluk"), kisi = sel.value;
    out.textContent = "";
    out.appendChild(el("h2", "cl-baslik", "Tüm program · " + aralik(TAR[0], TAR[TAR.length - 1])));
    var tb = tablo(["Birim", "Tarih", "Asistan"]), body = el("tbody");
    birimler.forEach(function (b) {
      var donem = [], son = null;
      DOLU.forEach(function (g) {
        var x = d.gunler[g][b] || [], key = x.join("|");
        if (son && son.key === key) son.bitis = g; else { son = { key: key, ad: x, bas: g, bitis: g }; donem.push(son); }
      });
      donem = donem.filter(function (p) { return p.ad.length; });
      donem.forEach(function (p, i) {
        var r = el("tr", (kisi && p.ad.indexOf(kisi) > -1 ? "ben" : "") + (p.bitis < BUGUN ? " gecmis" : "") + (i === 0 ? " ilk" : ""));
        if (i === 0) { var tdb = el("td", "cl-b", etiket(b)); tdb.rowSpan = donem.length; r.appendChild(tdb); }
        r.appendChild(el("td", "cl-t", aralik(p.bas, p.bitis)));
        var td = el("td"); adlar(td, p.ad, kisi);
        if (i > 0) {
          // Önceki döneme göre kim gitti, kim geldi
          var once = donem[i - 1].ad;
          var gelen = p.ad.filter(function (a) { return once.indexOf(a) < 0; });
          var giden = once.filter(function (a) { return p.ad.indexOf(a) < 0; });
          var not = gelen.length && giden.length ? giden.join(", ") + " → " + gelen.join(", ")
                  : gelen.length ? "Katılan: " + gelen.join(", ") : giden.length ? "Ayrılan: " + giden.join(", ") : "";
          if (not) td.appendChild(el("small", "cl-degisim", not));
        }
        r.appendChild(td);
        body.appendChild(r);
      });
    });
    tb.appendChild(body);
    var wrap = el("div", "tablewrap"); wrap.appendChild(tb); out.appendChild(wrap);
    var bos = TAR.filter(function (t) { return !Object.keys(d.gunler[t]).length; });
    if (bos.length) out.appendChild(el("p", "muted", "Atama yapılmamış gün: " + bos.map(function (t) { return tarih(t); }).join(", ") + "."));
  }

  function gunCiz() {
    var out = document.getElementById("cl-gunluk"), t = gunSel.value, kisi = sel.value, g = d.gunler[t];
    out.textContent = "";
    out.appendChild(el("h2", "cl-baslik", tarih(t)));
    if (!Object.keys(g).length) { out.appendChild(el("p", "empty", "Bu gün için atama yok.")); return; }
    var tb = tablo(["Birim", "Asistan"]), body = el("tbody");
    birimler.forEach(function (b) {
      if (!g[b]) return;
      var r = el("tr", kisi && g[b].indexOf(kisi) > -1 ? "ben" : "");
      r.appendChild(el("td", "cl-b", etiket(b)));
      var td = el("td"); adlar(td, g[b], kisi); r.appendChild(td);
      body.appendChild(r);
    });
    tb.appendChild(body);
    var wrap = el("div", "tablewrap"); wrap.appendChild(tb); out.appendChild(wrap);
  }

  function notCiz() {
    var kutu = document.getElementById("cl-not"), t = gunSel.value;
    kutu.textContent = "";
    (d.notlar || []).forEach(function (n) {
      if (!t || (n.bas <= t && t <= n.son)) {
        var p = el("p", "callout");
        p.appendChild(el("b", null, "Listedeki not: "));
        p.appendChild(document.createTextNode(n.metin));
        kutu.appendChild(p);
      }
    });
  }

  function ciz() { kisiCiz(); if (gunSel.value) gunCiz(); else programCiz(); notCiz(); }
  function kaydir(n) {
    if (!gunSel.value) { gunSel.value = varsayilan(); ciz(); return; }
    var i = TAR.indexOf(gunSel.value) + n;
    if (i >= 0 && i < TAR.length) { gunSel.value = TAR[i]; ciz(); }
  }
  sel.addEventListener("change", function () { depo("ak-kisi", sel.value); ciz(); });
  gunSel.addEventListener("change", ciz);
  document.getElementById("cl-onceki").addEventListener("click", function () { kaydir(-1); });
  document.getElementById("cl-sonraki").addEventListener("click", function () { kaydir(1); });
  document.getElementById("cl-bugun").addEventListener("click", function () { gunSel.value = varsayilan(); ciz(); });
  ciz();
})();
