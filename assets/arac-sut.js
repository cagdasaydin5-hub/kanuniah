/* Reçete ve rapor aracı. Veri data/sut.json'dan okunur; arama yalnızca tarayıcıda yapılır.
   araclar.js'e dokunmadan onun kart görünümünü (details.tool) kullanır ve sayfadaki arama/grup düğmelerine uyar. */
(function () {
  "use strict";

  /* Ana sayfa araması için dizin kaydı: tools/build_pwa.py bu iki tanımı okuyup data/araclar.json'a yazar.
     Kart aşağıda init() içinde elle kurulduğu için bu nesne yalnızca arama dizini içindir. */
  var GROUPS = [["recete", "Reçete & rapor"]];
  var DIZIN = { id: "recete-rapor", g: "recete", t: "Reçete ve rapor (SUT)",
    d: "Etken madde ya da ilaç adıyla (preparat) reçete türü, SGK ödemesi, rapor ve yazabilecek hekim; tıbbi malzeme raporları.",
    kw: "reçete rapor sut sgk titck ödeme ek-4/a kırmızı yeşil mor turuncu uzman aile hekimi ilaç malzeme preparat ilaç adı marka etken madde" };

  var YOK = "kaynakta doğrulanamadı";
  var RECETE = { beyaz: "Beyaz (normal) reçete", kirmizi: "Kırmızı reçete", yesil: "Yeşil reçete", mor: "Mor reçete", turuncu: "Turuncu reçete" };
  var RAPOR = { gerekmez: "Rapor gerekmez", "uzman-hekim": "Uzman hekim raporu gerekir", "saglik-kurulu": "Sağlık kurulu raporu gerekir",
    kosullu: "Endikasyona / koşula göre rapor gerekir" };

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function fold(s) {
    return String(s || "").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
      .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function trDate(s) { var p = String(s).split("-"); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }); }
  function link(txt, url) { var a = el("a", null, txt); a.href = url; a.target = "_blank"; a.rel = "noopener"; return a; }
  function unv() { var e = el("em", null, YOK); e.style.color = "var(--muted)"; return e; }

  function ddVal(v, fmt) {
    var dd = el("dd");
    if (v == null) dd.appendChild(unv());
    else if (fmt) { var r = fmt(v); if (typeof r === "string") dd.textContent = r; else dd.appendChild(r); }
    else if (Array.isArray(v)) {
      if (v.length === 1) dd.textContent = v[0];
      else { var ul = el("ul"); ul.style.cssText = "margin:0;padding-left:18px"; v.forEach(function (t) { ul.appendChild(el("li", null, t)); }); dd.appendChild(ul); }
    } else dd.textContent = String(v);
    return dd;
  }
  function small(dd, txt) { if (txt) { var s = el("small", null, txt); s.style.cssText = "display:block;color:var(--muted);font-size:13px;margin-top:2px"; dd.appendChild(s); } return dd; }

  function card(x, D) {
    var res = el("div", "result");
    var n = ["odeme", "rapor", "raporUzman", "yazabilir", "sut"].concat(x.tur === "ilac" ? ["recete"] : [])
      .filter(function (k) { return x[k] != null; }).length;
    res.className += x.durum === "dogrulandi" ? " ok" : " mid";
    res.appendChild(el("b", null, x.ad));
    var grp = (D.groups.filter(function (g) { return g[0] === x.grup; })[0] || [0, ""])[1];
    res.appendChild(el("p", null, grp + (x.durum === "dogrulandi" ? " · tüm alanlar kaynakta bulundu" :
      x.durum === "kismen" ? " · bazı alanlar kaynakta doğrulanamadı" : " · bu kaydın alanları kaynakta doğrulanamadı")));
    var dl = el("dl", "kv");
    function row(t, dd) { dl.appendChild(el("dt", null, t)); dl.appendChild(dd); }
    if (x.tur === "ilac") row("Reçete türü", small(ddVal(x.recete, function (v) { return v.map(function (r) { return RECETE[r]; }).join(" · "); }),
      x.recete && x.atc && x.atc.length ? "TİTCK aktif ürün listesi, " + x.urun + " ürün (" + x.atc.join("; ") + ")" : ""));
    row("SGK ödeme listesi", small(ddVal(x.odeme, function (v) { return x.tur === "ilac" ? (v ? "Ek-4/A'da (bedeli ödenir)" : "Ek-4/A'da yok") : (v ? "SGK karşılar (koşullu)" : "SGK karşılamaz"); }), x.odemeNot));
    row("Rapor", ddVal(x.rapor, function (v) { return RAPOR[v]; }));
    row("Raporu düzenleyen", x.raporUzman && !x.raporUzman.length ? ddVal("Rapor gerekmez") : ddVal(x.raporUzman));
    row("Raporla yazabilen", ddVal(x.yazabilir));
    row("SUT maddesi", ddVal(x.sut, function (v) {
      var t = v.map(function (m) { return /^\d/.test(m) ? "SUT " + m : m; }).join(", ");
      return x.sutUrl ? link(t, x.sutUrl) : t;
    }));
    if (x.alinti) {
      var q = el("dd"), bq = el("blockquote", null, "“" + x.alinti + "”");
      bq.style.cssText = "margin:0;padding-left:10px;border-left:3px solid var(--line);font-size:14.5px;color:var(--muted)"; q.appendChild(bq); row("Kaynak metinden", q);
    }
    if (x.not) row("Not", ddVal(x.not));
    var kd = el("dd");
    x.kaynak.forEach(function (k, i) { var s = D.sources[k]; if (!s) return; if (i) kd.appendChild(document.createTextNode(" · ")); kd.appendChild(link(s.kurum + " – " + s.ad, s.url)); });
    row("Kaynak", kd);
    row("Kontrol tarihi", ddVal(trDate(x.kontrol)));
    res.appendChild(dl);
    if (n < (x.tur === "ilac" ? 6 : 5)) res.appendChild(el("p", "hint", "Boş alanlar tahminle doldurulmaz. Karar vermeden önce yukarıdaki resmî kaynaklara bakın."));
    return res;
  }

  /* İlaç adı (preparat) dizini: data/ilac-urun.json (tools/build_ilac_urun.py üretir). Tıbbi bilgi yoktur;
     yalnızca TİTCK ürün adı → ATC/etken madde, reçete türü ve SGK Ek-4/A durumu. Araç açılınca ya da sayfa
     aramasına 3+ harf yazılınca bir kez yüklenir. */
  var URUN = null, urunYukleniyor = null;
  var RT = { N: "beyaz", K: "kirmizi", Y: "yesil", M: "mor", T: "turuncu" };
  var EK = ["Ek-4/A'da yok", "Ek-4/A'da (ödenir)", "Ek-4/A'da pasif (ödenmez)"];
  function urunYukle() {
    if (!urunYukleniyor) urunYukleniyor = fetch("data/ilac-urun.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (U) {
        U.f = U.u.map(function (x) { return " " + fold(x[0]).replace(/[^a-z0-9]+/g, " "); });
        U.af = U.atc.map(function (a) { return " " + fold(a[1]).replace(/[^a-z0-9]+/g, " "); });
        URUN = U; return U;
      }).catch(function () { urunYukleniyor = null; return null; });
    return urunYukleniyor;
  }
  function cap(s) { return s ? s.charAt(0).toLocaleUpperCase("tr") + s.slice(1) : s; }
  // her kelime, adın bir kelimesinin başı olmalı ("cres 10" → CRESTOR 10 MG …)
  function kelimeEslesir(h, words) { return words.every(function (w) { return h.indexOf(" " + w) >= 0; }); }
  function mesafe(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    var d = [], i, j;
    for (i = 0; i <= a.length; i++) d[i] = [i];
    for (j = 1; j <= b.length; j++) d[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }

  function urunListesi(idx, once) {
    // idx: ürün sıra numaraları; once: aramayla eşleşenler (başa alınır)
    var on = {}; (once || []).forEach(function (i) { on[i] = 1; });
    idx = idx.slice().sort(function (a, b) { return (on[b] || 0) - (on[a] || 0); });
    var box = el("div");
    function satir(i) {
      var x = URUN.u[i], li = el("li");
      li.appendChild(el(on[i] ? "strong" : "span", null, x[0]));
      li.appendChild(el("small", null, " — " + (RECETE[RT[x[2]]] || "reçete türü belirtilmemiş") + " · " + EK[x[3]]))
        .style.color = "var(--muted)";
      return li;
    }
    var ul = el("ul"); ul.style.cssText = "margin:0;padding-left:18px;font-size:14.5px";
    idx.slice(0, 15).forEach(function (i) { ul.appendChild(satir(i)); }); box.appendChild(ul);
    if (idx.length > 15) {
      var det = el("details"), sm = el("summary", null, "+" + (idx.length - 15) + " ürün daha");
      sm.style.cssText = "cursor:pointer;font-size:14px;color:var(--muted)";
      var ul2 = ul.cloneNode(false); idx.slice(15).forEach(function (i) { ul2.appendChild(satir(i)); });
      det.appendChild(sm); det.appendChild(ul2); box.appendChild(det);
    }
    return box;
  }
  function urunlerAtc(ai) { var r = []; URUN.u.forEach(function (x, i) { if (x[1] === ai) r.push(i); }); return r; }

  // sut.json'da kaydı olmayan etken madde: yalnızca TİTCK ve Ek-4/A bilgisi
  function atcKart(ai, eslesen) {
    var a = URUN.atc[ai], idx = urunlerAtc(ai), res = el("div", "result mid");
    res.appendChild(el("b", null, cap(a[1]) + " (" + a[0] + ")"));
    res.appendChild(el("p", null, "Bu etken madde için SUT rapor/uzman bilgisi araca henüz işlenmedi; aşağıdakiler TİTCK ve SGK listelerinden."));
    var dl = el("dl", "kv");
    function row(t, dd) { dl.appendChild(el("dt", null, t)); dl.appendChild(dd); }
    var rt = {}; idx.forEach(function (i) { var r = URUN.u[i][2]; if (r) rt[r] = 1; });
    row("Reçete türü", small(ddVal(Object.keys(rt).length ? Object.keys(rt).map(function (r) { return RECETE[RT[r]]; }).join(" · ") : null), "TİTCK aktif ürün listesi, " + idx.length + " ürün"));
    var ode = idx.filter(function (i) { return URUN.u[i][3] === 1; }).length;
    row("SGK ödeme listesi", ddVal(ode ? "Ek-4/A'da: " + ode + "/" + idx.length + " ürün" : "Aktif ürünlerin hiçbiri Ek-4/A'da değil"));
    row("Rapor", ddVal(null));
    var pd = el("dd"); pd.appendChild(urunListesi(idx, eslesen)); row("Ürünler", pd);
    var kd = el("dd");
    URUN.kaynak.forEach(function (k, i) { var s = KAYNAK[k]; if (!s) return; if (i) kd.appendChild(document.createTextNode(" · ")); kd.appendChild(link(s.kurum + " – " + s.ad, s.url)); });
    row("Kaynak", kd);
    res.appendChild(dl);
    return res;
  }
  var KAYNAK = {};

  function build(host, D) {
    KAYNAK = D.sources;
    var byId = {}; D.items.forEach(function (x) { byId[x.id] = x; });
    var body = el("div", "tool-body");
    body.appendChild(el("p", "warn", "SUT sık değişir; son kontrol: " + trDate(D.checked) + ". Reçete ve rapor koşullarını yazmadan önce güncel metne bakın."))
      .style.cssText = "font-weight:700;color:var(--brass);margin:14px 0 0";
    var fields = el("div", "fields");
    var lab = el("label", "fld"); lab.appendChild(el("span", null, "Etken madde, ilaç adı ya da tıbbi malzeme"));
    var w = el("span", "inp"), inp = document.createElement("input");
    inp.type = "search"; inp.autocomplete = "off"; inp.placeholder = "ör. rosuvastatin, Crestor, Eliquis 5, hasta bezi";
    w.appendChild(inp); lab.appendChild(w); fields.appendChild(lab); body.appendChild(fields);
    var out = el("div"); out.setAttribute("aria-live", "polite"); body.appendChild(out);

    function itemKart(x, eslesen) {
      var c = card(x, D);
      if (URUN) {
        var idx = []; URUN.atc.forEach(function (a, ai) { if (a[2] === x.id) idx = idx.concat(urunlerAtc(ai)); });
        if (idx.length) {
          var dl = c.querySelector("dl"), dd = el("dd");
          dd.appendChild(urunListesi(idx, eslesen));
          dl.insertBefore(dd, dl.querySelector("dt:nth-last-of-type(2)"));
          dl.insertBefore(el("dt", null, "Piyasadaki ürünler"), dd);
        }
      }
      return c;
    }
    function goster(e) { out.innerHTML = ""; out.appendChild(e.item ? itemKart(e.item, e.u) : atcKart(e.ai, e.u)); }

    function run() {
      out.innerHTML = "";
      var q = fold(inp.value).trim();
      if (!q) { out.appendChild(el("p", "hint", D.items.filter(function (x) { return x.tur === "ilac"; }).length + " etken madde (SUT bilgisiyle), " +
        (URUN ? URUN.u.length + " ilaç adı (TİTCK) " : "") + "ve " + D.items.filter(function (x) { return x.tur === "malzeme"; }).length +
        " tıbbi malzeme raporu kayıtlı. Etken madde ya da ilaç adı yazın.")); return; }
      var words = q.replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);

      // 1) sut.json kayıtları (etken madde / malzeme)
      var hit = D.items.filter(function (x) { return fold(x.ad) === q; })[0];
      var items = hit ? [hit] : D.items.filter(function (x) {
        var h = fold(x.ad + " " + (x.ara || "")); return h.indexOf(q) >= 0 || kelimeEslesir(" " + h.replace(/[^a-z0-9]+/g, " "), words);
      });
      // 2) ilaç adları ve ATC adları → etken madde grupları
      var gr = {}, sira = [];
      function ekle(key, e) { if (!gr[key]) { gr[key] = e; sira.push(key); } return gr[key]; }
      items.forEach(function (x) { ekle("i:" + x.id, { item: x, u: [] }); });
      if (URUN && !hit) {
        URUN.f.forEach(function (h, i) {
          if (!kelimeEslesir(h, words)) return;
          var ai = URUN.u[i][1], a = URUN.atc[ai];
          ekle(a[2] ? "i:" + a[2] : "a:" + ai, a[2] ? { item: byId[a[2]], u: [] } : { ai: ai, u: [] }).u.push(i);
        });
        URUN.af.forEach(function (h, ai) {
          if (!kelimeEslesir(h, words)) return;
          var a = URUN.atc[ai]; ekle(a[2] ? "i:" + a[2] : "a:" + ai, a[2] ? { item: byId[a[2]], u: [] } : { ai: ai, u: [] });
        });
      }
      var list = sira.map(function (k) { return gr[k]; });
      if (list.length === 1) { goster(list[0]); return; }

      if (!list.length) {
        // Yapıştırılan serbest metin (ör. "Rosuvastatin 10 mg 1x1, apiksaban 5 mg"): içindeki kayıtlı adları bul.
        var t = " " + q + " ", metin = D.items.filter(function (x) {
          var a = fold(x.ad); if (a.length < 4) return false;
          var i = t.indexOf(" " + a); if (i < 0) return false;
          var c = t.charAt(i + 1 + a.length); return c === " " || (a.length >= 5 && /[a-z]/.test(c));
        });
        if (metin.length) {
          if (metin.length > 1) out.appendChild(el("p", "hint", "Metinde " + metin.length + " kayıtlı ad bulundu" + (metin.length > 8 ? " (ilk 8 gösteriliyor)" : "") + ":"));
          metin.slice(0, 8).forEach(function (x) { out.appendChild(itemKart(x)); });
          return;
        }
        // Yazım hatası: ilk kelimeye en yakın etken madde / ilaç adı
        var w0 = words[0] || "", aday = {};
        if (w0.length >= 4) {
          D.items.forEach(function (x) { fold(x.ad).split(/[^a-z0-9]+/).forEach(function (k) { if (mesafe(w0, k) <= (w0.length >= 7 ? 2 : 1)) aday[k] = cap(k); }); });
          if (URUN) URUN.f.forEach(function (h) { var k = h.slice(1, h.indexOf(" ", 1) > 0 ? h.indexOf(" ", 1) : h.length); if (!aday[k] && mesafe(w0, k) <= (w0.length >= 7 ? 2 : 1)) aday[k] = k.toLocaleUpperCase("tr"); });
        }
        var ak = Object.keys(aday).slice(0, 6);
        var p0 = el("p", "hint", ak.length ? "Bu adla kayıt yok. Bunlardan biri mi: " : "Bu adla kayıt yok." +
          (URUN ? " İlaç adları TİTCK aktif ürün listesinden (" + URUN.u.length + " ürün); piyasadan çekilmiş ürünler listede yoktur." : ""));
        ak.forEach(function (k, i) {
          if (i) p0.appendChild(document.createTextNode(", "));
          var b = el("a", null, aday[k]); b.href = "#"; b.addEventListener("click", function (e) { e.preventDefault(); inp.value = k; run(); }); p0.appendChild(b);
        });
        out.appendChild(p0); return;
      }
      var p = el("p", "hint", list.length + " etken madde eşleşti: ");
      list.slice(0, 20).forEach(function (e, i) {
        if (i) p.appendChild(document.createTextNode(", "));
        var ad = e.item ? e.item.ad : cap(URUN.atc[e.ai][1]);
        var b = el("a", null, ad); b.href = "#"; b.addEventListener("click", function (ev) { ev.preventDefault(); goster(e); }); p.appendChild(b);
        if (e.u.length) {
          var mk = {}; e.u.forEach(function (i2) { mk[URUN.u[i2][0].split(" ")[0]] = 1; });
          var ks = Object.keys(mk);
          p.appendChild(document.createTextNode(" (" + ks.slice(0, 3).join(", ") + (ks.length > 3 ? "…" : "") + ")"));
        }
      });
      if (list.length > 20) p.appendChild(document.createTextNode(" … Daha fazla harf ya da doz yazın."));
      out.appendChild(p);
    }
    inp.addEventListener("input", run);
    body._set = function (v) { inp.value = v; run(); };
    run();
    urunYukle().then(function () { run(); });
    host.appendChild(body);
    var src = el("p", "src"); src.appendChild(el("b", null, "Kaynak: "));
    Object.keys(D.sources).forEach(function (k, i) { var s = D.sources[k]; if (i) src.appendChild(document.createTextNode(" · ")); src.appendChild(link(s.kurum + " – " + s.ad, s.url)); });
    src.appendChild(el("br")); src.appendChild(el("span", null, "Yalnızca Resmî Gazete'deki güncel SUT metni, SGK ve TİTCK kaynakları kullanılır; doğrulanamayan alan boş bırakılır. İlaç adları TİTCK aktif ürün listesinden alınır."));
    host.appendChild(src);
    return body;
  }

  function init() {
    var list = document.getElementById("tools"); if (!list) return;
    fetch("data/sut.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (D) {
      var d = document.createElement("details"); d.className = "tool"; d.id = "recete-rapor";
      var s = document.createElement("summary");
      s.appendChild(el("span", "tg", "Reçete & rapor")); s.appendChild(el("b", null, "Reçete ve rapor (SUT)"));
      s.appendChild(el("span", "td", "Etken madde ya da ilaç adıyla (preparat) reçete türü, SGK ödemesi, rapor ve yazabilecek hekim; tıbbi malzeme raporları."));
      d.appendChild(s);
      var hay = fold("reçete rapor sut sgk titck ödeme ek-4/a kırmızı yeşil mor turuncu uzman aile hekimi ilaç malzeme preparat marka etken madde " +
        D.items.map(function (x) { return x.ad + " " + (x.ara || ""); }).join(" "));
      var body = null, bekleyen = null;
      d.addEventListener("toggle", function () {
        if (d.open) urunYukle();
        if (d.open && !body) { body = build(d, D); if (bekleyen) body._set(bekleyen); }
        if (d.open && history.replaceState) history.replaceState(null, "", "#" + d.id);
      });
      list.appendChild(d);

      /* sayfa araması ve grup düğmeleri araclar.js'te; bu kart onlara sonradan uyar */
      var q = document.getElementById("q"), chips = document.getElementById("chips"), cnt = document.getElementById("count");
      var urunHay = false;
      function sync() {
        var raw = q ? q.value : "", words = fold(raw).split(/\s+/).filter(Boolean);
        if (!urunHay && fold(raw).replace(/\s/g, "").length >= 3) urunYukle().then(function (U) {
          if (!U || urunHay) return; urunHay = true;
          hay += U.f.join("") + U.af.join(""); d._hay = hay;
          if (q) q.dispatchEvent(new Event("input"));
        });
        var pr = chips && chips.querySelector('[aria-pressed="true"]'), g = pr ? pr.dataset.g : "all";
        d.hidden = !((g === "all" || g === DIZIN.g) && words.every(function (w) { return hay.indexOf(w) >= 0; }));
        var n = list.querySelectorAll("details.tool:not([hidden])").length;
        if (cnt) cnt.textContent = n + " araç";
        var em = document.getElementById("empty"); if (em) em.hidden = n > 0;
        // sayfa aramasına etken madde ya da ilaç adı yazılınca kart o aramayla açılmaya hazır olur
        var m = D.items.filter(function (x) { return words.some(function (w) { return fold(x.ad) === w; }); })[0];
        var mu = !m && urunHay && words.length && URUN.f.some(function (h) { return kelimeEslesir(h, words); });
        bekleyen = m ? m.ad : mu ? raw.trim() : null;
        if (bekleyen && body) body._set(bekleyen);
      }
      if (q) q.addEventListener("input", sync);
      if (chips) chips.addEventListener("click", sync);
      d._g = DIZIN.g; d._hay = hay; // arac-mama.js'teki ortak süzgeç (KanuniEk) bu alanları okur
      if (chips && !chips.querySelector('[data-g="' + DIZIN.g + '"]')) {
        var ch = el("button", "chip", GROUPS[0][1]); ch.type = "button"; ch.dataset.g = DIZIN.g;
        ch.setAttribute("aria-pressed", "false"); ch.appendChild(el("span", "c", "1")); chips.appendChild(ch);
      }
      var tum = chips && chips.querySelector('[data-g="all"] .c'); if (tum) tum.textContent = String(+tum.textContent + 1);
      sync();
      if (location.hash === "#" + d.id) { d.open = true; d.scrollIntoView(); }
    }).catch(function () { /* veri okunamazsa kart eklenmez; diğer araçlar etkilenmez */ });
  }

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
  }
})();
