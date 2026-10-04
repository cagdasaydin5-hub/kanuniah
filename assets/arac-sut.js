/* Reçete ve rapor aracı. Veri data/sut.json'dan okunur; arama yalnızca tarayıcıda yapılır.
   araclar.js'e dokunmadan onun kart görünümünü (details.tool) kullanır ve sayfadaki arama/grup düğmelerine uyar. */
(function () {
  "use strict";

  /* Ana sayfa araması için dizin kaydı: tools/build_pwa.py bu iki tanımı okuyup data/araclar.json'a yazar.
     Kart aşağıda init() içinde elle kurulduğu için bu nesne yalnızca arama dizini içindir. */
  var GROUPS = [["recete", "Reçete & rapor"]];
  var DIZIN = { id: "recete-rapor", g: "recete", t: "Reçete ve rapor (SUT)",
    d: "Etken maddeye göre reçete türü, SGK ödemesi, rapor ve yazabilecek hekim; tıbbi malzeme raporları.",
    kw: "reçete rapor sut sgk titck ödeme ek-4/a kırmızı yeşil mor turuncu uzman aile hekimi ilaç malzeme" };

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

  function build(host, D) {
    var body = el("div", "tool-body");
    body.appendChild(el("p", "warn", "SUT sık değişir; son kontrol: " + trDate(D.checked) + ". Reçete ve rapor koşullarını yazmadan önce güncel metne bakın."))
      .style.cssText = "font-weight:700;color:var(--brass);margin:14px 0 0";
    var fields = el("div", "fields");
    var lab = el("label", "fld"); lab.appendChild(el("span", null, "Etken madde ya da tıbbi malzeme"));
    var w = el("span", "inp"), inp = document.createElement("input");
    inp.type = "text"; inp.autocomplete = "off"; inp.setAttribute("list", "sut-liste"); inp.placeholder = "ör. rosuvastatin, apiksaban, hasta bezi";
    var dlist = document.createElement("datalist"); dlist.id = "sut-liste";
    D.items.forEach(function (x) { var o = document.createElement("option"); o.value = x.ad; dlist.appendChild(o); });
    w.appendChild(inp); lab.appendChild(w); lab.appendChild(dlist); fields.appendChild(lab); body.appendChild(fields);
    var out = el("div"); out.setAttribute("aria-live", "polite"); body.appendChild(out);
    function run() {
      out.innerHTML = "";
      var q = fold(inp.value).trim();
      if (!q) { out.appendChild(el("p", "hint", D.items.filter(function (x) { return x.tur === "ilac"; }).length + " etken madde ve " +
        D.items.filter(function (x) { return x.tur === "malzeme"; }).length + " tıbbi malzeme raporu kayıtlı. Yazmaya başlayın.")); return; }
      var hit = D.items.filter(function (x) { return fold(x.ad) === q; })[0];
      var many = hit ? [hit] : D.items.filter(function (x) { return fold(x.ad + " " + (x.ara || "")).indexOf(q) >= 0; });
      if (many.length === 1) { out.appendChild(card(many[0], D)); return; }
      if (!many.length) {
        // Yapıştırılan serbest metin (ör. "Rosuvastatin 10 mg 1x1, apiksaban 5 mg"): içindeki kayıtlı adları bul.
        var t = " " + q + " ", metin = D.items.filter(function (x) {
          var a = fold(x.ad); if (a.length < 4) return false;
          var i = t.indexOf(" " + a); if (i < 0) return false;
          var c = t.charAt(i + 1 + a.length); return c === " " || (a.length >= 5 && /[a-z]/.test(c));
        });
        if (metin.length) {
          if (metin.length > 1) out.appendChild(el("p", "hint", "Metinde " + metin.length + " kayıtlı ad bulundu" + (metin.length > 8 ? " (ilk 8 gösteriliyor)" : "") + ":"));
          metin.slice(0, 8).forEach(function (x) { out.appendChild(card(x, D)); });
          return;
        }
      }
      if (!many.length) { out.appendChild(el("p", "hint", "Bu adla kayıt yok. Kapsam: aile hekimliğinde sık kullanılan 150 etken madde ve 4 tıbbi malzeme raporu.")); return; }
      var p = el("p", "hint", many.length + " eşleşme: ");
      many.slice(0, 12).forEach(function (x, i) {
        if (i) p.appendChild(document.createTextNode(", "));
        var b = el("a", null, x.ad); b.href = "#"; b.addEventListener("click", function (e) { e.preventDefault(); inp.value = x.ad; run(); }); p.appendChild(b);
      });
      if (many.length > 12) p.appendChild(document.createTextNode(" …"));
      out.appendChild(p);
    }
    inp.addEventListener("input", run);
    body._set = function (v) { inp.value = v; run(); };
    run();
    host.appendChild(body);
    var src = el("p", "src"); src.appendChild(el("b", null, "Kaynak: "));
    Object.keys(D.sources).forEach(function (k, i) { var s = D.sources[k]; if (i) src.appendChild(document.createTextNode(" · ")); src.appendChild(link(s.kurum + " – " + s.ad, s.url)); });
    src.appendChild(el("br")); src.appendChild(el("span", null, "Yalnızca Resmî Gazete'deki güncel SUT metni, SGK ve TİTCK kaynakları kullanılır; doğrulanamayan alan boş bırakılır."));
    host.appendChild(src);
    return body;
  }

  function init() {
    var list = document.getElementById("tools"); if (!list) return;
    fetch("data/sut.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (D) {
      var d = document.createElement("details"); d.className = "tool"; d.id = "recete-rapor";
      var s = document.createElement("summary");
      s.appendChild(el("span", "tg", "Reçete & rapor")); s.appendChild(el("b", null, "Reçete ve rapor (SUT)"));
      s.appendChild(el("span", "td", "Etken maddeye göre reçete türü, SGK ödemesi, rapor ve yazabilecek hekim; tıbbi malzeme raporları."));
      d.appendChild(s);
      var hay = fold("reçete rapor sut sgk titck ödeme ek-4/a kırmızı yeşil mor turuncu uzman aile hekimi ilaç malzeme " +
        D.items.map(function (x) { return x.ad + " " + (x.ara || ""); }).join(" "));
      var body = null, bekleyen = null;
      d.addEventListener("toggle", function () {
        if (d.open && !body) { body = build(d, D); if (bekleyen) body._set(bekleyen); }
        if (d.open && history.replaceState) history.replaceState(null, "", "#" + d.id);
      });
      list.appendChild(d);

      /* sayfa araması ve grup düğmeleri araclar.js'te; bu kart onlara sonradan uyar */
      var q = document.getElementById("q"), chips = document.getElementById("chips"), cnt = document.getElementById("count");
      function sync() {
        var words = fold(q ? q.value : "").split(/\s+/).filter(Boolean);
        var pr = chips && chips.querySelector('[aria-pressed="true"]'), g = pr ? pr.dataset.g : "all";
        d.hidden = !((g === "all" || g === DIZIN.g) && words.every(function (w) { return hay.indexOf(w) >= 0; }));
        var n = list.querySelectorAll("details.tool:not([hidden])").length;
        if (cnt) cnt.textContent = n + " araç";
        var em = document.getElementById("empty"); if (em) em.hidden = n > 0;
        var m = D.items.filter(function (x) { return words.some(function (w) { return fold(x.ad) === w; }); })[0];
        bekleyen = m ? m.ad : null;
        if (m && body) body._set(m.ad);
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
