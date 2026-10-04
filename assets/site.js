/* Trabzon Kanuni EAH Aile Hekimliği – site betiği. Veriler /data/*.json dosyalarından okunur. */
(function () {
  "use strict";

  var page = document.body.getAttribute("data-page");
  var cache = {};

  function load(name) {
    if (!cache[name]) {
      cache[name] = fetch("data/" + name + ".json", { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error(name + " yüklenemedi");
        return r.json();
      });
    }
    return cache[name];
  }

  function fold(s) {
    return String(s || "").toLocaleLowerCase("tr")
      .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
      .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
      .replace(/â/g, "a").replace(/î/g, "i").replace(/û/g, "u");
  }
  function terms(q) { return fold(q.trim()).split(/\s+/).filter(Boolean); }
  function match(hay, t) { return t.every(function (x) { return hay.indexOf(x) !== -1; }); }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function ext(href, label) {
    var a = el("a", null, label);
    a.href = href; a.target = "_blank"; a.rel = "noopener";
    return a;
  }
  function fmt(iso) {
    if (!iso) return "";
    var d = new Date(iso + "T00:00:00");
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  }
  function daysBetween(a, b) { return (new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 864e5; }

  var TODAY = null;
  function isNew(g) {
    if (!g.pub || !TODAY) return false;
    var d = daysBetween(g.pub, TODAY);
    return d >= 0 && d <= 122;
  }

  /* ---------- puan ---------- */
  function total(s) { return (s.kanit || 0) + (s.poem || 0) + (s.bb || 0) + (s.etki || 0); }
  function dots(s) { return Math.max(1, Math.round(total(s) * 5 / 8)); }

  /* ---------- rehber satırı ---------- */
  function guideRow(g) {
    var li = el("li", "g" + (g.status === "arsiv" ? " arch" : ""));
    li.id = g.id;
    li.appendChild(el("div", "yr" + (g.year ? "" : " none"), g.year ? String(g.year) : "sürekli"));
    var b = el("div");
    var m = el("div", "meta");
    m.appendChild(el("span", "org", g.org));
    if (isNew(g)) m.appendChild(el("span", "tag new", "Yeni"));
    if (g.kind === "law") m.appendChild(el("span", "tag law", "Mevzuat"));
    if (g.scope === "INT") m.appendChild(el("span", "tag int", "Uluslararası"));
    if (g.status === "arsiv") m.appendChild(el("span", "tag arch", "Arşiv"));
    b.appendChild(m);
    var h = el("h3"); h.appendChild(ext(g.url, g.title)); b.appendChild(h);
    b.appendChild(el("p", "sum", g.summary));
    if (g.note) b.appendChild(el("p", "note", g.note));
    var l = el("div", "links");
    l.appendChild(ext(g.url, "Kaynağı aç ↗"));
    (g.alt || []).forEach(function (x) { l.appendChild(ext(x.url, x.label + " ↗")); });
    if (g.pub) l.appendChild(el("span", "chk", "yayın " + fmt(g.pub)));
    b.appendChild(l);
    li.appendChild(b);
    return li;
  }

  function sortGuides(a, b) {
    var an = isNew(a) ? 1 : 0, bn = isNew(b) ? 1 : 0;
    if (an !== bn) return bn - an;
    if (a.status !== b.status) return a.status === "arsiv" ? 1 : -1;
    return (b.year || 0) - (a.year || 0) || a.title.localeCompare(b.title, "tr");
  }

  /* ---------- makale kartı ---------- */
  function paperCard(p, guidesById) {
    var art = el("article", "paper");
    art.id = p.id;
    var body = el("div", "body");
    var jr = el("div", "jr");
    var jb = el("b", null, p.journal); jr.appendChild(jb);
    jr.appendChild(document.createTextNode(" · " + fmt(p.date)));
    body.appendChild(jr);
    var h = el("h3"); h.appendChild(ext("https://pubmed.ncbi.nlm.nih.gov/" + p.pmid + "/", p.title)); body.appendChild(h);
    body.appendChild(el("p", "en", p.title_en));
    body.appendChild(el("span", "design", p.design));
    var dl = el("dl", "kv");
    [["Ne buldu", p.what], ["Pratiğe etkisi", p.practice], ["Sınırlılık", p.limits]].forEach(function (x) {
      if (!x[1]) return;
      dl.appendChild(el("dt", null, x[0]));
      dl.appendChild(el("dd", null, x[1]));
    });
    if (p.rel && p.rel.length && guidesById) {
      var rels = p.rel.map(function (id) { return guidesById[id]; }).filter(Boolean);
      if (rels.length) {
        dl.appendChild(el("dt", null, "İlgili rehber"));
        var dd = el("dd");
        rels.forEach(function (g, i) {
          var a = el("a", null, g.title);
          a.href = "rehberler.html#" + g.id;
          if (i) dd.appendChild(document.createTextNode(" · "));
          dd.appendChild(a);
        });
        dl.appendChild(dd);
      }
    }
    body.appendChild(dl);
    var why = el("details", "why");
    why.appendChild(el("summary", null, "Önem puanı nasıl hesaplandı?"));
    var t = el("table"); var s = p.score;
    [["Kanıt gücü", s.kanit, 3], ["Hasta odaklı sonuç", s.poem, 1], ["Birinci basamağa uygunluk", s.bb, 2], ["Pratiğe etkisi", s.etki, 2], ["Toplam", total(s), 8]].forEach(function (r) {
      var tr = el("tr"); tr.appendChild(el("td", null, r[0])); tr.appendChild(el("td", null, r[1] + " / " + r[2])); t.appendChild(tr);
    });
    why.appendChild(t);
    body.appendChild(why);
    var l = el("div", "links");
    l.appendChild(ext("https://pubmed.ncbi.nlm.nih.gov/" + p.pmid + "/", "PubMed ↗"));
    if (p.doi) l.appendChild(ext("https://doi.org/" + p.doi, "Makale (DOI) ↗"));
    body.appendChild(l);
    art.appendChild(body);

    var sc = el("div", "score");
    sc.setAttribute("aria-label", "Önem puanı " + dots(p.score) + " / 5");
    sc.appendChild(el("div", "lbl", "Önem"));
    var d = el("div", "dots");
    for (var i = 1; i <= 5; i++) d.appendChild(el("i", i <= dots(p.score) ? "on" : null));
    sc.appendChild(d);
    sc.appendChild(el("div", "eff", p.effect));
    art.appendChild(sc);
    return art;
  }

  /* ---------- filtrelenebilir rehber listesi (Rehberler sayfası) ---------- */
  function guideList(opts) {
    Promise.all([load("rehberler"), load("meta")]).then(function (r) {
      var R = r[0]; TODAY = r[1].checked;
      var pool = R.guides.filter(opts.filter || function () { return true; });
      pool.forEach(function (g) { g._h = fold([g.title, g.org, g.summary, g.note, g.kw, g.year].join(" ")); });
      var state = { q: "", cat: "all", onlyNew: false, arch: false };
      var list = document.getElementById("list");
      var chips = document.getElementById("chips");
      var count = document.getElementById("count");

      var cats = R.categories.filter(function (c) {
        return pool.some(function (g) { return g.cat === c.id && g.status !== "arsiv"; });
      });
      function chip(id, label) {
        var b = el("button", "chip", label); b.type = "button"; b.dataset.cat = id;
        var n = pool.filter(function (g) { return g.status !== "arsiv" && (id === "all" || g.cat === id); }).length;
        b.appendChild(el("span", "c", String(n)));
        b.addEventListener("click", function () { state.cat = id; sync(); render(); });
        chips.appendChild(b);
      }
      if (cats.length > 1) { chip("all", "Tümü"); cats.forEach(function (c) { chip(c.id, c.label); }); }
      function sync() {
        Array.prototype.forEach.call(chips.children, function (b) { b.setAttribute("aria-pressed", b.dataset.cat === state.cat ? "true" : "false"); });
      }
      sync();

      function render() {
        var t = terms(state.q);
        var rows = pool.filter(function (g) {
          if (g.status === "arsiv" && !state.arch) return false;
          if (state.cat !== "all" && g.cat !== state.cat) return false;
          if (state.onlyNew && !isNew(g)) return false;
          return match(g._h, t);
        }).sort(sortGuides);
        list.textContent = "";
        if (!rows.length) list.appendChild(el("li", "empty", "Bu aramayla eşleşen kayıt yok. Başka bir kelime deneyin ya da kategoriyi “Tümü” yapın."));
        rows.forEach(function (g) { list.appendChild(guideRow(g)); });
        count.textContent = rows.length + " kayıt";
      }
      var q = document.getElementById("q");
      q.addEventListener("input", function () { state.q = q.value; render(); });
      var on = document.getElementById("onlyNew"); if (on) on.addEventListener("change", function () { state.onlyNew = on.checked; render(); });
      var ar = document.getElementById("showArch"); if (ar) ar.addEventListener("change", function () { state.arch = ar.checked; render(); });
      render();
      if (location.hash) {
        var tgt = document.getElementById(location.hash.slice(1));
        if (tgt) tgt.scrollIntoView();
      }
    }).catch(fail);
  }

  function fail(err) {
    var m = document.querySelector("main");
    var p = el("p", "empty", "İçerik yüklenemedi. Sayfayı yenileyin; sorun sürerse internet bağlantınızı kontrol edin.");
    if (m) m.appendChild(p);
    if (window.console) console.error(err);
  }

  /* ---------- sayfalar ---------- */
  var pages = {
    home: function () {
      /* araç dizini yüklenemezse ana sayfa yine çalışsın */
      var tools = load("araclar").catch(function () { return { groups: [], tools: [] }; });
      load("etkinlikler").then(function (E) {
        var bugun = new Date().toISOString().slice(0, 10);
        var n = E.etkinlikler.filter(function (e) { return (e.bitis || e.baslangic || "9999") >= bugun; }).length;
        var x = document.getElementById("nEvents"); if (x) x.textContent = n;
      }).catch(function () {});
      Promise.all([load("rehberler"), load("makaleler"), load("meta"), tools]).then(function (r) {
        var R = r[0], M = r[1], meta = r[2], A = r[3]; TODAY = meta.checked;
        var guides = R.guides.filter(function (g) { return g.status !== "arsiv"; });
        var issue = M.issues[0];
        document.getElementById("nGuides").textContent = guides.filter(function (g) { return g.aud.indexOf("hekim") !== -1; }).length;
        document.getElementById("nPapers").textContent = issue ? issue.items.length : 0;
        if (A.tools.length) document.getElementById("nTools").textContent = A.tools.length;
        document.getElementById("nLaw").textContent = guides.filter(function (g) { return g.kind === "law"; }).length;
        document.getElementById("checked").textContent = fmt(meta.checked);

        var laws = guides.filter(function (g) { return g.kind === "law" && isNew(g); });
        if (laws.length) {
          var n = document.getElementById("notice"); n.hidden = false;
          var p = el("p"); p.appendChild(el("strong", null, "Yeni mevzuat: "));
          laws.forEach(function (g, i) {
            if (i) p.appendChild(document.createTextNode("; "));
            var a = el("a", null, g.title); a.href = "rehberler.html#" + g.id; p.appendChild(a);
            p.appendChild(document.createTextNode(" (" + fmt(g.pub) + ")"));
          });
          n.appendChild(p);
        }

        var byId = {}; R.guides.forEach(function (g) { byId[g.id] = g; });
        var top = document.getElementById("topPapers");
        if (issue) {
          issue.items.slice().sort(function (a, b) { return total(b.score) - total(a.score); }).slice(0, 3)
            .forEach(function (p) { top.appendChild(paperCard(p, byId)); });
        }
        var fresh = document.getElementById("freshGuides");
        guides.filter(isNew).sort(sortGuides).slice(0, 5).forEach(function (g) { fresh.appendChild(guideRow(g)); });

        var log = document.getElementById("log");
        meta.log.slice().sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 8).forEach(function (x) {
          var li = el("li"); var t = el("time", null, fmt(x.date)); t.dateTime = x.date;
          li.appendChild(t);
          if (x.items) x.items.forEach(function (it, i) {
            if (i) li.appendChild(document.createTextNode(" · "));
            var lab = it.ad + ": " + it.n;
            if (it.href) { var a = el("a", null, lab); a.href = it.href; li.appendChild(a); }
            else li.appendChild(document.createTextNode(lab));
          });
          else li.appendChild(document.createTextNode(x.text));
          log.appendChild(li);
        });

        /* genel arama: rehberler, makaleler ve araçlar birlikte */
        var idx = [];
        function add(k, t, s, h, extra) { idx.push({ k: k, t: t, s: s, h: h, ft: fold(t), x: fold([t].concat(extra).join(" ")) }); }
        guides.forEach(function (g) { add(g.kind === "law" ? "Mevzuat" : "Rehber", g.title, g.org + (g.year ? " · " + g.year : ""), "rehberler.html#" + g.id, [g.org, g.summary, g.kw]); });
        M.issues.forEach(function (is) { is.items.forEach(function (p) { add("Makale", p.title, p.journal + " · " + fmt(p.date), "makaleler.html#" + p.id, [p.title_en, p.journal, p.what, p.practice, p.design, (p.tags || []).join(" ")]); }); });
        var gl = {}; A.groups.forEach(function (g) { gl[g[0]] = g[1]; });
        A.tools.forEach(function (x) { add("Araç", x.t, gl[x.g] || "Klinik araç", "araclar.html#" + x.id, [x.d, x.kw, gl[x.g]]); });
        var q = document.getElementById("q"), res = document.getElementById("results");
        q.addEventListener("keydown", function (e) {
          var first = res.querySelector("a.hit");
          if (e.key === "Enter" && first) { e.preventDefault(); location.href = first.href; }
        });
        q.addEventListener("input", function () {
          var t = terms(q.value); res.textContent = "";
          if (!t.length) { res.hidden = true; return; }
          /* başlığında geçenler önce, sonra eklenme sırası */
          var hits = idx.map(function (i, n) { return { i: i, n: n, top: match(i.ft, t) ? 0 : 1 }; })
            .filter(function (h) { return match(h.i.x, t); })
            .sort(function (a, b) { return a.top - b.top || a.n - b.n; })
            .slice(0, 15).map(function (h) { return h.i; });
          res.hidden = false;
          if (!hits.length) { res.appendChild(el("p", "empty", "Sonuç bulunamadı.")); return; }
          hits.forEach(function (i) {
            var a = el("a", "hit"); a.href = i.h;
            a.appendChild(el("span", "kind", i.k)); a.appendChild(document.createTextNode(i.t));
            a.appendChild(el("small", null, i.s)); res.appendChild(a);
          });
        });
      }).catch(fail);
    },

    rehberler: function () {
      guideList({ filter: function (g) { return (g.aud || []).indexOf("hekim") !== -1; } });
    },


    makaleler: function () {
      Promise.all([load("makaleler"), load("rehberler"), load("meta")]).then(function (r) {
        var M = r[0], R = r[1]; TODAY = r[2].checked;
        var byId = {}; R.guides.forEach(function (g) { byId[g.id] = g; });
        document.getElementById("method").appendChild(document.createTextNode(M.scoring.note));
        var wrap = document.getElementById("issues");
        var q = document.getElementById("q"), count = document.getElementById("count");
        M.issues.forEach(function (is) { is.items.forEach(function (p) { p._h = fold([p.title, p.title_en, p.journal, p.what, p.practice, p.design, (p.tags || []).join(" ")].join(" ")); }); });
        var sortByScore = document.getElementById("byScore");
        function render() {
          var t = terms(q.value); wrap.textContent = ""; var n = 0;
          M.issues.forEach(function (is) {
            var items = is.items.filter(function (p) { return match(p._h, t); });
            if (sortByScore.checked) items = items.slice().sort(function (a, b) { return total(b.score) - total(a.score); });
            if (!items.length) return;
            var h = el("div", "issue-head"); h.appendChild(el("h2", null, is.title)); h.appendChild(el("span", null, is.range));
            wrap.appendChild(h);
            items.forEach(function (p) { wrap.appendChild(paperCard(p, byId)); n++; });
          });
          if (!n) wrap.appendChild(el("p", "empty", "Bu aramayla eşleşen makale yok."));
          count.textContent = n + " makale";
        }
        q.addEventListener("input", render);
        sortByScore.addEventListener("change", render);
        render();
        if (location.hash) { var tg = document.getElementById(location.hash.slice(1)); if (tg) tg.scrollIntoView(); }
      }).catch(fail);
    }
  };

  if (pages[page]) pages[page]();

  /* çevrimdışı çalışma ve telefona kurulum (PWA) */
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function (e) { if (window.console) console.warn("Service worker kaydedilemedi", e); });
    });
  }
})();
