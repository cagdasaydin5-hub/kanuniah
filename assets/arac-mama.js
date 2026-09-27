/* Enteral beslenme araçları ve ek araç kartları için ortak katman.
   assets/araclar.js'e dokunmadan aynı kart görünümüyle #tools listesine araç ekler; arama kutusu ve grup
   düğmeleri eklenen kartları da süzer. Tüm hesaplar tarayıcıda yapılır; hiçbir değer gönderilmez ya da saklanmaz.
   Yükleme sırası: araclar.js → arac-mama.js → arac-inr.js (hepsi defer). */
(function (root) {
  "use strict";

  /* ---------- yardımcılar (araclar.js ile aynı davranış) ---------- */
  function fold(s) {
    return String(s || "").toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
      .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function r(x, d) { var p = Math.pow(10, d || 0); return Math.round(x * p) / p; }
  function fmt(x, d) { return r(x, d).toLocaleString("tr-TR", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function num(v) { if (v === "" || v == null) return NaN; return parseFloat(String(v).replace(",", ".")); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  /* ---------- ortak katman: kart çizimi + arama/grup süzme ---------- */
  var Ek = (function () {
    var groups = [], cards = [], ready = false, state = { q: "", g: "all" };

    function readVals(tool, form) {
      var v = {};
      tool.f.forEach(function (f) {
        var e = form.querySelector('[name="' + f.id + '"]');
        if (!e) return;
        if (f.k === "chk") v[f.id] = e.checked ? (f.p == null ? 1 : f.p) : 0;
        else if (f.k === "num") v[f.id] = num(e.value);
        else if (f.k === "sel") { var x = e.value; v[f.id] = x === "" ? "" : isNaN(+x) ? x : +x; }
        else v[f.id] = e.value;
      });
      return v;
    }

    function buildTool(tool, host) {
      var form = el("form", "tool-body"); form.addEventListener("submit", function (e) { e.preventDefault(); });
      var fields = el("div", tool.col || tool.f.some(function (f) { return f.k === "chk"; }) || tool.f.length > 6 ? "fields col" : "fields");
      tool.f.forEach(function (f) {
        if (f.k === "head") { fields.appendChild(el("p", "hint", f.l)); return; }
        var lab = el("label", "fld" + (f.k === "chk" ? " chk" : ""));
        if (f.k === "chk") {
          var c = document.createElement("input"); c.type = "checkbox"; c.name = f.id; lab.appendChild(c);
          lab.appendChild(el("span", null, f.l));
          if (f.p != null) lab.appendChild(el("em", "pts", (f.p > 0 ? "+" : "") + String(f.p).replace(".", ",")));
        } else {
          lab.appendChild(el("span", null, f.l));
          var inp;
          if (f.k === "sel") {
            inp = document.createElement("select"); inp.name = f.id;
            f.o.forEach(function (o) { var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; inp.appendChild(op); });
            if (f.def != null) inp.value = f.def;
          } else {
            inp = document.createElement("input"); inp.name = f.id; inp.type = "text"; inp.inputMode = "decimal"; inp.autocomplete = "off";
          }
          var w = el("span", "inp"); w.appendChild(inp); if (f.u) w.appendChild(el("i", null, f.u)); lab.appendChild(w);
        }
        fields.appendChild(lab);
      });
      form.appendChild(fields);
      var res = el("div", "result"); res.setAttribute("aria-live", "polite"); form.appendChild(res);
      function run() {
        var out = tool.calc(readVals(tool, form), tool);
        res.innerHTML = ""; res.className = "result";
        if (!out) { res.appendChild(el("span", "hint", tool.empty || "Değerleri girin, sonuç burada görünür.")); return; }
        if (out.level) res.className += " " + out.level;
        res.appendChild(el("b", null, out.main));
        if (out.sub) res.appendChild(el("p", null, out.sub));
        (out.list || []).forEach(function (t) { res.appendChild(el("p", null, t)); });
        if (out.warn) res.appendChild(el("p", "warn", out.warn));
      }
      form.addEventListener("input", run); form.addEventListener("change", run);
      var reset = el("button", "reset", "Temizle"); reset.type = "button";
      reset.addEventListener("click", function () { form.reset(); tool.f.forEach(function (f) { if (f.def != null) form.querySelector('[name="' + f.id + '"]').value = f.def; }); run(); });
      form.appendChild(reset);
      run();
      host.appendChild(form);
    }

    function srcBlock(tool) {
      var p = el("p", "src"); if ((tool.src || []).length) p.appendChild(el("b", null, "Kaynak: "));
      (tool.src || []).forEach(function (s, i) {
        if (i) p.appendChild(document.createTextNode(" · "));
        var a = el("a", null, s[0]); a.href = s[1]; a.target = "_blank"; a.rel = "noopener"; p.appendChild(a);
      });
      if (tool.note) { if ((tool.src || []).length) p.appendChild(el("br")); p.appendChild(el("span", null, tool.note)); }
      return p;
    }

    function groupLabel(id) { var g = groups.filter(function (x) { return x[0] === id; })[0]; return g ? g[1] : ""; }

    /* Arama ve grup düğmeleri: araclar.js kendi kartlarını süzdükten sonra (dinleyiciler ondan sonra eklenir)
       listedeki tüm kartları, araclar.js'in kartlara koyduğu _hay/_g alanlarıyla yeniden süzeriz. */
    function refilter() {
      var list = document.getElementById("tools"), chips = document.getElementById("chips");
      if (!list || !chips) return;
      var all = list.querySelectorAll("details.tool"), words = fold(state.q).split(/\s+/).filter(Boolean), n = 0;
      Array.prototype.forEach.call(all, function (c) {
        var ok = (state.g === "all" || c._g === state.g) && words.every(function (w) { return String(c._hay || "").indexOf(w) >= 0; });
        c.hidden = !ok; if (ok) n++;
      });
      Array.prototype.forEach.call(chips.querySelectorAll(".chip"), function (b) {
        b.setAttribute("aria-pressed", b.dataset.g === state.g ? "true" : "false");
        var c = b.querySelector(".c");
        if (c) c.textContent = String(b.dataset.g === "all" ? all.length :
          Array.prototype.filter.call(all, function (d) { return d._g === b.dataset.g; }).length);
      });
      var cnt = document.getElementById("count"), em = document.getElementById("empty");
      if (cnt) cnt.textContent = n + " araç";
      if (em) em.hidden = n > 0;
    }

    function wire() {
      if (ready) return; ready = true;
      var chips = document.getElementById("chips"), q = document.getElementById("q");
      var pressed = chips.querySelector('.chip[aria-pressed="true"]');
      if (pressed) state.g = pressed.dataset.g;
      if (q) { state.q = q.value; q.addEventListener("input", function () { state.q = q.value; refilter(); }); }
      chips.addEventListener("click", function (e) {
        var b = e.target.closest ? e.target.closest(".chip") : null;
        if (b && b.dataset.g) { state.g = b.dataset.g; refilter(); }
      });
    }

    function register(newGroups, tools) {
      var list = document.getElementById("tools"), chips = document.getElementById("chips");
      if (!list || !chips) return;
      wire();
      newGroups.forEach(function (g) {
        if (groups.some(function (x) { return x[0] === g[0]; })) return;
        groups.push(g);
        if (chips.querySelector('.chip[data-g="' + g[0] + '"]')) return; // araclar.js'teki mevcut grup
        var b = el("button", "chip", g[1]); b.type = "button"; b.dataset.g = g[0];
        b.appendChild(el("span", "c", ""));
        chips.appendChild(b);
      });
      tools.forEach(function (t) {
        var d = document.createElement("details"); d.className = "tool"; d.id = t.id;
        var s = document.createElement("summary"), gl = groupLabel(t.g);
        s.appendChild(el("span", "tg", gl)); s.appendChild(el("b", null, t.t)); s.appendChild(el("span", "td", t.d));
        d.appendChild(s);
        var built = false;
        d.addEventListener("toggle", function () {
          if (d.open && !built) { built = true; (t.custom || function (h) { buildTool(t, h); })(d); d.appendChild(srcBlock(t)); }
          if (d.open && history.replaceState) history.replaceState(null, "", "#" + t.id);
        });
        d._hay = fold(t.t + " " + t.d + " " + (t.kw || "") + " " + gl); d._g = t.g;
        list.appendChild(d); cards.push(d);
        if (location.hash === "#" + t.id) { d.open = true; setTimeout(function () { d.scrollIntoView(); }, 0); }
      });
      refilter();
    }

    return { register: register, buildTool: buildTool, fold: fold, fmt: fmt, num: num, el: el };
  })();

  /* ---------- NRS-2002 (Kondrup 2003) ---------- */
  function nrs2002(v) {
    if (!(v.yas > 0) || v.durum === "" || v.hastalik === "") return null;
    var on = v.i1 || v.i2 || v.i3 || v.i4;
    var yasP = v.yas >= 70 ? 1 : 0, s = v.durum + v.hastalik + yasP;
    return { score: s, initial: !!on, risk: s >= 3, yasP: yasP };
  }

  /* ---------- MNA-SF (Kaiser 2009) ---------- */
  function mnasf(v) {
    var keys = ["a", "b", "c", "d", "e"];
    if (keys.some(function (k) { return v[k] === "" || v[k] == null; })) return null;
    var f = v.f1 !== "" && v.f1 != null ? v.f1 : v.f2 !== "" && v.f2 != null ? v.f2 : null;
    if (f == null) return null;
    var s = v.a + v.b + v.c + v.d + v.e + f;
    return { score: s, cls: s >= 12 ? "normal" : s >= 8 ? "risk" : "malnutrisyon" };
  }

  /* ---------- SUT 4.2.8.A (yetişkin) ---------- */
  function sut428(v) {
    var muaf = v.m1 || v.m2 || v.m3;
    if (muaf) return { durum: "muaf", yatan: !!v.m1 };
    var any = v.k1 || v.k2 || v.k3 || v.k4 || v.k5;
    if (!any) return null;
    return { durum: (v.k1 || v.k2) && v.k3 && (v.k4 || v.k5) ? "karsilaniyor" : "karsilanmiyor" };
  }

  /* ---------- mama kataloğu ---------- */
  var TUR = [["standart", "Standart"], ["yuksek-enerji", "Yüksek enerji"], ["yuksek-protein", "Yüksek protein"], ["diyabetik", "Diyabetik"],
             ["bobrek", "Böbrek"], ["lifli", "Lifli"], ["peptit", "Peptit"], ["immun", "İmmün / yara"]];
  var YOL = { tup: "Tüple", oral: "Ağızdan", "oral-tup": "Ağızdan ya da tüple" };
  function turAdi(id) { var t = TUR.filter(function (x) { return x[0] === id; })[0]; return t ? t[1] : id; }

  function filterProducts(list, tur, q) {
    var words = fold(q).split(/\s+/).filter(Boolean);
    return list.filter(function (p) {
      if (tur && tur !== "all" && (p.tur || []).indexOf(tur) < 0) return false;
      var hay = fold([p.ad, p.uretici, (p.tur || []).map(turAdi).join(" ")].join(" "));
      return words.every(function (w) { return hay.indexOf(w) >= 0; });
    });
  }

  var dataPromise = null;
  function loadProducts() {
    if (!dataPromise) dataPromise = fetch("data/mamalar.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    return dataPromise;
  }

  var styled = false;
  function addStyle() {
    if (styled) return; styled = true;
    var st = document.createElement("style");
    st.textContent =
      ".mama-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-top:14px}" +
      ".mama-bar .fld{flex:1 1 200px}" +
      ".mama-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px;margin-top:12px}" +
      ".mama{border:1px solid var(--line);border-radius:var(--radius);padding:12px 14px;background:var(--bg);min-width:0}" +
      ".mama b{display:block;font-family:var(--serif);font-size:17px;line-height:1.25}" +
      ".mama .tg{font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--pine)}" +
      ".mama dl{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:8px 0 6px;font-size:14px}" +
      ".mama dt{color:var(--muted)}.mama dd{margin:0;font-family:var(--mono);font-size:13px}" +
      ".mama a{font-size:13.5px;font-weight:600}";
    document.head.appendChild(st);
  }

  function productCard(p) {
    var c = el("article", "mama");
    c.appendChild(el("span", "tg", p.uretici + " · " + (p.tur || []).map(turAdi).join(", ")));
    c.appendChild(el("b", null, p.ad));
    var dl = el("dl");
    function row(k, v) { dl.appendChild(el("dt", null, k)); dl.appendChild(el("dd", null, v)); }
    row("Enerji", fmt(p.kcal_ml, 2) + " kcal/mL");
    row("Protein", fmt(p.protein_100ml, 1) + " g/100 mL");
    row("Lif", p.lif_100ml == null ? "belirtilmemiş" : fmt(p.lif_100ml, 1) + " g/100 mL");
    if (p.osm) row("Ozmolarite", p.osm + " mOsm/L");
    row("Kullanım", YOL[p.yol] || "belirtilmemiş");
    row("Ambalaj", p.form === "toz" ? p.ambalaj_g + " g toz" : p.ambalaj_ml ? p.ambalaj_ml + " mL" : "belirtilmemiş");
    c.appendChild(dl);
    if (p.not) c.appendChild(el("p", "hint", p.not));
    var a = el("a", null, "Üretici ürün sayfası ↗"); a.href = p.kaynak; a.target = "_blank"; a.rel = "noopener"; c.appendChild(a);
    return c;
  }

  function buildKatalog(host) {
    addStyle();
    var box = el("div", "tool-body");
    var bar = el("div", "mama-bar");
    var lab = el("label", "fld"); lab.appendChild(el("span", null, "Ürün ara"));
    var q = document.createElement("input"); q.type = "search"; q.autocomplete = "off"; q.placeholder = "ör. Nutricia, lifli";
    var w = el("span", "inp"); w.appendChild(q); lab.appendChild(w); bar.appendChild(lab);
    box.appendChild(bar);
    var chips = el("div", "chips"); chips.setAttribute("role", "group"); chips.setAttribute("aria-label", "Ürün türü"); chips.style.marginTop = "10px";
    box.appendChild(chips);
    var info = el("p", "hint"), grid = el("div", "mama-grid");
    box.appendChild(info); box.appendChild(grid);
    host.appendChild(box);

    var products = [], tur = "all";
    function draw() {
      Array.prototype.forEach.call(chips.children, function (b) { b.setAttribute("aria-pressed", b.dataset.t === tur ? "true" : "false"); });
      var list = filterProducts(products, tur, q.value);
      grid.innerHTML = "";
      list.forEach(function (p) { grid.appendChild(productCard(p)); });
      info.textContent = products.length ? list.length + " ürün" + (list.length ? "" : " – bu süzgeçle eşleşen ürün yok.") :
        "Henüz resmi üretici sayfasında doğrulanmış ürün eklenmedi.";
    }
    [["all", "Tümü"]].concat(TUR).forEach(function (t) {
      var b = el("button", "chip", t[1]); b.type = "button"; b.dataset.t = t[0];
      b.addEventListener("click", function () { tur = t[0]; draw(); }); chips.appendChild(b);
    });
    q.addEventListener("input", draw);
    info.textContent = "Yükleniyor…";
    loadProducts().then(function (d) { products = d.urunler || []; draw(); })
      .catch(function () { info.textContent = "Ürün listesi yüklenemedi."; });
  }

  /* ---------- araç tanımları ---------- */
  var GROUPS = [["enteral", "Enteral beslenme"]];
  var OPT = function (arr) { return [["", "Seçin"]].concat(arr); };

  var TOOLS = [
    {
      id: "mama-katalog", g: "enteral", t: "Enteral ve oral beslenme ürünleri kataloğu",
      d: "Türkiye'de satılan yetişkin ürünleri: enerji, protein, lif ve ambalaj; türe göre süzme.",
      kw: "mama enteral oral nutrisyon ons sonda peg ürün katalog nutricia abbott nestle fresenius", custom: buildKatalog,
      src: [],
      note: "Her ürünün değerleri yalnızca üreticinin resmi ürün sayfasından alınır; bağlantı ürün kartındadır. Reçetelemeden önce güncel etiketi kontrol edin."
    },
    {
      id: "sut-enteral", g: "enteral", t: "SUT 4.2.8.A – yetişkinde enteral ürün raporu",
      d: "SGK'nın enteral beslenme ürünü bedelini ödeme koşulları: malnütrisyon tanımı, rapor süresi ve içeriği.",
      kw: "sut sgk rapor enteral mama sağlık kurulu malnütrisyon 1200 kcal kıvam artırıcı reçete 4.2.8",
      col: true,
      empty: "Hastanın durumuna uyan maddeleri işaretleyin. Koşulsuz gruplardan biri varsa malnütrisyon tanımı aranmaz.",
      f: [{ k: "head", l: "Malnütrisyon koşulu aranmayan hastalar:" },
          { id: "m1", k: "chk", l: "Yatan hasta" },
          { id: "m2", k: "chk", l: "Kanser hastası" },
          { id: "m3", k: "chk", l: "Tüple beslenen hasta (orogastrik, nazogastrik, nazoenterik sonda ya da gastrostomi, jejunostomi, gastrojejunostomi)" },
          { k: "head", l: "Malnütrisyon tanımı – 1, 2 ve 3 birlikte gerekir:" },
          { id: "k1", k: "chk", l: "1a. İstemsiz kilo kaybı: son 6 ayda %5'ten fazla ya da 6 aydan uzun sürede %10'dan fazla" },
          { id: "k2", k: "chk", l: "1b. VKİ: 70 yaş ve üzerinde 22'nin, 70 yaşın altında 20'nin altında (1a ya da 1b yeterli)" },
          { id: "k3", k: "chk", l: "2. Malnütrisyona yol açan eşlik eden hastalık ya da travma" },
          { id: "k4", k: "chk", l: "3a. Besin alımında azalma: 1 hafta boyunca enerji ihtiyacının %50'sinden az ya da 2 hafta boyunca herhangi bir azalma" },
          { id: "k5", k: "chk", l: "3b. Sindirimi ya da emilimi bozan bir gastrointestinal hastalık (3a ya da 3b yeterli)" }],
      calc: function (v) {
        var x = sut428(v); if (!x) return null;
        var icerik = "Raporda: ürünün adı, günlük kalori ihtiyacı ve buna göre günlük kullanım miktarı, vücut ağırlığı, boy ve varsa eşlik eden hastalığın ICD-10 kodu. Reçete en fazla 30 günlük doz.";
        if (x.durum === "muaf") return { main: "Malnütrisyon koşulu aranmaz", level: "ok",
          sub: (x.yatan ? "Yatan hastada rapor koşulu yoktur. " : "") + "Yatan hastalar dışında bu durumun yazıldığı 6 ay süreli (nörolojik hastalıklarda 1 yıl) sağlık kurulu raporuyla tüm hekimler reçete edebilir. " + icerik };
        if (x.durum === "karsilaniyor") return { main: "SUT malnütrisyon tanımı karşılanıyor", level: "ok",
          sub: "3 ay süreli sağlık kurulu raporuyla tüm hekimler reçete edebilir; günlük en fazla 1200 kcal. " + icerik };
        return { main: "Tanım karşılanmıyor", level: "mid",
          sub: "Kilo kaybı ya da VKİ ölçütü (1), eşlik eden hastalık ya da travma (2) ve besin alımında azalma ya da GİS hastalığı (3) birlikte gerekir. Diyet tedavisi ya da obezite cerrahisine bağlı kilo kaybı malnütrisyon sayılmaz." };
      },
      src: [["Sağlık Uygulama Tebliği, madde 4.2.8.A – SGK, 29.08.2026 değişiklikleri işlenmiş güncel metin",
             "https://www.sgk.gov.tr/duyuru/detay/29082026-SUT-Degisiklik-Tebligi-Islenmis-Guncel-2013-SUT-2026-08-31-03-06-04"]],
      note: "Diğer hükümler (aynı madde): kıvam artırıcı ürünler – inme, kronik nörolojik bozukluk, baş-boyun kanseri ve cerrahi rezeksiyona bağlı yutma güçlüğünde; nöroloji, KBB, genel cerrahi, beyin cerrahisi, anestezi ve yoğun bakım, geriatri, tıbbi onkoloji ya da radyasyon onkolojisi uzmanlarından en az birinin bulunduğu sağlık kurulu raporuyla tüm uzman hekimler, ayda en fazla iki kutu. Dallı zincirli aminoasitten zengin ürünler – evre 2 ve üzeri ensefalopatili karaciğer yetmezliğinde, malnütrisyon ölçütü aranmadan, gastroenteroloji ya da iç hastalıkları uzman raporuyla tüm hekimler. Özet kendi cümlelerimizledir; karar için metnin kendisine bakın."
    },
    {
      id: "nrs2002", g: "enteral", t: "NRS-2002 (beslenme riski taraması)",
      d: "Yatan ve evde izlenen erişkinde malnütrisyon riskini tarar.",
      kw: "nrs 2002 nrs-2002 malnütrisyon beslenme riski tarama kondrup espen",
      col: true,
      empty: "Ön tarama sorularının hepsi “hayır” ise son tarama gerekmez; hasta haftalık aralarla yeniden taranır. Son tarama için beslenme durumu, hastalık şiddeti ve yaşı girin.",
      f: [{ k: "head", l: "Ön tarama – herhangi biri “evet” ise son taramaya geçilir:" },
          { id: "i1", k: "chk", l: "VKİ < 20,5 kg/m²" },
          { id: "i2", k: "chk", l: "Son 3 ayda kilo kaybı" },
          { id: "i3", k: "chk", l: "Son haftada besin alımında azalma" },
          { id: "i4", k: "chk", l: "Ağır hastalık (ör. yoğun bakım)" },
          { id: "durum", k: "sel", l: "Beslenme durumunun bozulması", o: OPT([
            [0, "0 – Normal beslenme durumu"],
            [1, "1 – Hafif: 3 ayda > %5 kilo kaybı ya da son hafta alım gereksinimin %50–75'i"],
            [2, "2 – Orta: 2 ayda > %5 kilo kaybı, ya da VKİ 18,5–20,5 + genel durum bozuk, ya da son hafta alım %25–60"],
            [3, "3 – Ağır: 1 ayda > %5 (3 ayda > %15) kilo kaybı, ya da VKİ < 18,5 + genel durum bozuk, ya da son hafta alım %0–25"]]) },
          { id: "hastalik", k: "sel", l: "Hastalık şiddeti (gereksinim artışı)", o: OPT([
            [0, "0 – Normal gereksinim"],
            [1, "1 – Hafif: kalça kırığı, akut komplikasyonlu kronik hasta (siroz, KOAH, kronik hemodiyaliz, diyabet, kanser)"],
            [2, "2 – Orta: büyük abdominal cerrahi, inme, ağır pnömoni, hematolojik malignite"],
            [3, "3 – Ağır: kafa travması, kemik iliği nakli, yoğun bakım hastası (APACHE > 10)"]]) },
          { id: "yas", k: "num", l: "Yaş (70 ve üzeri +1)", u: "yıl" }],
      calc: function (v) {
        var x = nrs2002(v); if (!x) return null;
        var detay = "Beslenme " + v.durum + " + hastalık " + v.hastalik + " + yaş " + x.yasP + " = " + x.score + ".";
        if (!x.initial) return { main: "Ön tarama negatif", level: "ok",
          sub: "Ön tarama sorularının hepsi “hayır”: hasta haftalık aralarla yeniden taranır. Büyük ameliyat planlanıyorsa riski önlemek için beslenme planı düşünülür. (Son tarama puanı bilgi için: " + x.score + ".)" };
        return x.risk ? { main: x.score + " puan – beslenme riski var", level: "high",
          sub: detay + " Puan ≥ 3: beslenme bakım planı başlatılır." } :
          { main: x.score + " puan – şu an risk yok", level: "ok",
          sub: detay + " Puan < 3: haftalık yeniden tarama. Büyük ameliyat planlanıyorsa önleyici beslenme planı düşünülür." };
      },
      src: [["Kondrup J ve ark. Clin Nutr 2003;22:321–36 (ESPEN tarama kılavuzu)", "https://pubmed.ncbi.nlm.nih.gov/12765673/"]]
    },
    {
      id: "mnasf", g: "enteral", t: "MNA-SF (yaşlıda kısa beslenme değerlendirmesi)",
      d: "65 yaş üstünde malnütrisyon ve risk taraması; VKİ yoksa baldır çevresi kullanılır.",
      kw: "mna mna-sf mini nutritional assessment yaşlı malnütrisyon baldır çevresi",
      col: true,
      f: [{ id: "a", k: "sel", l: "A. Son 3 ayda iştahsızlık, sindirim, çiğneme ya da yutma sorunu nedeniyle besin alımı azaldı mı?",
            o: OPT([[0, "Ciddi azalma (0)"], [1, "Orta azalma (1)"], [2, "Azalma yok (2)"]]) },
          { id: "b", k: "sel", l: "B. Son 3 ayda kilo kaybı",
            o: OPT([[0, "3 kg'dan fazla (0)"], [1, "Bilmiyor (1)"], [2, "1–3 kg (2)"], [3, "Kilo kaybı yok (3)"]]) },
          { id: "c", k: "sel", l: "C. Hareketlilik",
            o: OPT([[0, "Yatağa ya da sandalyeye bağımlı (0)"], [1, "Yataktan/sandalyeden kalkıyor ama dışarı çıkmıyor (1)"], [2, "Dışarı çıkabiliyor (2)"]]) },
          { id: "d", k: "sel", l: "D. Son 3 ayda psikolojik stres ya da akut hastalık",
            o: OPT([[0, "Evet (0)"], [2, "Hayır (2)"]]) },
          { id: "e", k: "sel", l: "E. Nöropsikolojik sorun",
            o: OPT([[0, "Ağır demans ya da depresyon (0)"], [1, "Hafif demans (1)"], [2, "Sorun yok (2)"]]) },
          { id: "f1", k: "sel", l: "F1. VKİ (kg/m²)",
            o: [["", "Ölçülmedi – F2'yi kullan"], [0, "< 19 (0)"], [1, "19 – < 21 (1)"], [2, "21 – < 23 (2)"], [3, "≥ 23 (3)"]] },
          { id: "f2", k: "sel", l: "F2. Baldır çevresi (yalnızca VKİ ölçülemiyorsa)",
            o: [["", "Seçin"], [0, "< 31 cm (0)"], [3, "≥ 31 cm (3)"]] }],
      calc: function (v) {
        var x = mnasf(v); if (!x) return null;
        var m = { normal: ["Normal beslenme durumu", "ok"], risk: ["Malnütrisyon riski", "mid"], malnutrisyon: ["Malnütrisyon", "high"] }[x.cls];
        return { main: x.score + " / 14 puan – " + m[0], level: m[1],
          sub: "12–14: normal · 8–11: malnütrisyon riski · 0–7: malnütrisyon." + (v.f1 !== "" ? "" : " F2 (baldır çevresi) ile hesaplandı.") };
      },
      src: [["Kaiser MJ ve ark. J Nutr Health Aging 2009;13:782–8", "https://doi.org/10.1007/s12603-009-0214-7"]]
    }
  ];

  var api = { Ek: Ek, TOOLS: TOOLS, GROUPS: GROUPS, TUR: TUR, nrs2002: nrs2002, mnasf: mnasf, sut428: sut428, filterProducts: filterProducts };
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    window.KanuniEk = Ek;
    var go = function () { Ek.register(GROUPS, TOOLS); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
  }
  if (typeof module !== "undefined") module.exports = api;
})(this);
