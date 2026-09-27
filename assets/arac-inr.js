/* Varfarin idame doz ayarı (INR). Eşikler data/inr-algoritma.json'dadır; hesap tarayıcıda yapılır,
   hiçbir değer gönderilmez ya da saklanmaz. Kart çizimi için arac-mama.js'teki ortak katmanı (window.KanuniEk) kullanır. */
(function () {
  "use strict";

  var GUNLER = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
  var EPS = 1e-9;

  function fmt(x, d) { var p = Math.pow(10, d || 0); return (Math.round(x * p) / p).toLocaleString("tr-TR", { maximumFractionDigits: d || 0 }); }

  /* Çeyrek tablet sayısını yazıya çevirir: 5 → "1 ¼", 2 → "½", 0 → "0". */
  function tabletYazi(ceyrek) {
    var tam = Math.floor(ceyrek / 4), k = ceyrek % 4, fr = ["", "¼", "½", "¾"][k];
    if (!tam && !k) return "0";
    return (tam ? String(tam) : "") + (tam && k ? " " : "") + fr;
  }

  /* Günlük tablet çizelgesinden (çeyrek tablet sayıları) haftalık mg. */
  function haftalikMg(ceyrekler, tabletMg) {
    return ceyrekler.reduce(function (a, c) { return a + c; }, 0) * tabletMg / 4;
  }

  /* INR'nin düştüğü algoritma satırı: üst sınırı INR'den büyük ya da eşit olan ilk satır. */
  function satirBul(hedef, inr) {
    var s = hedef.satirlar;
    for (var i = 0; i < s.length; i++) if (s[i].ust == null || inr <= s[i].ust + EPS) return s[i];
    return s[s.length - 1];
  }

  /* Hedef haftalık dozu tek tablet gücüyle (¼ tablet adımlarıyla, günde en çok 3 tablet) 7 güne dağıtır.
     En fazla iki farklı günlük doz kullanılır. Öncelik: hedefe en yakın toplam → dozsuz gün yok →
     günler arası fark ½ tableti aşmasın → ¼ ya da ¾ tablet gereken gün az → günler arası fark küçük. */
  function dagit(hedefMg, tabletMg) {
    var q = tabletMg / 4, best = null;
    for (var lo = 0; lo <= 12; lo++) for (var hi = lo; hi <= 12; hi++) for (var m = 0; m <= 7; m++) {
      if (hi === lo && m > 0) continue;
      var toplam = ((7 - m) * lo + m * hi) * q;
      var cey = function (c) { return c % 2 === 1; };
      var puan = [
        Math.round(Math.abs(toplam - hedefMg) * 1e6),
        (lo === 0 ? 7 - m : 0) + (hi === 0 ? m : 0),
        Math.max(0, hi - lo - 2),
        (cey(lo) ? 7 - m : 0) + (cey(hi) ? m : 0),
        hi - lo,
        m
      ];
      if (!best || kucuk(puan, best.puan)) best = { puan: puan, lo: lo, hi: hi, m: m, toplam: toplam };
    }
    var gun = [];
    for (var i = 0; i < 7; i++) gun.push(best.lo);
    for (var j = 0; j < best.m; j++) gun[Math.floor((2 * j + 1) * 7 / (2 * best.m))] = best.hi;
    return { ceyrekler: gun, mg: gun.map(function (c) { return c * q; }), toplam: best.toplam };
  }
  function kucuk(a, b) { for (var i = 0; i < a.length; i++) { if (a[i] !== b[i]) return a[i] < b[i]; } return false; }

  /* Ana hesap. g: {hedef:"2-3"|"2.5-3.5", inr, onceki (önceki INR; yoksa NaN), aciklanabilir (düşüklüğün açıklanabilir
     nedeni var mı), ceyrekler[7], tabletMg, kanama, degisim (hekimin %'si; boşsa NaN)} */
  function hesapla(alg, g) {
    var hedef = alg.hedefler[g.hedef];
    if (!hedef || !(g.inr > 0)) return null;
    var out = { hedef: hedef, uyarilar: [] };
    if (g.kanama) {
      out.kanama = true;
      out.uyarilar.push(yuksek(alg, "kanama").metin);
      return out;
    }
    if (g.inr >= 4.5 - EPS && g.inr <= 10 + EPS) out.uyarilar.push(yuksek(alg, "inr-4.5-10").metin);
    else if (g.inr > 10) out.uyarilar.push(yuksek(alg, "inr-10-ustu").metin);
    var satir = satirBul(hedef, g.inr);
    out.satir = satir;
    out.aralikta = g.inr >= hedef.alt - EPS && g.inr <= hedef.ust + EPS;
    /* Koşullu satırlar. 'iki-olcum': önceki INR de aralığın aynı tarafındaysa (iki ölçümde düşük ya da yüksek) uygulanır.
       'aciklanamiyor': düşüklüğün açıklanabilir nedeni yoksa uygulanır. Koşul sağlanmazsa tablo doz değişikliği önermez. */
    out.kosul = null;
    if (satir.kosul === "iki-olcum") {
      if (!(g.onceki > 0)) out.kosul = "bekliyor";
      else out.kosul = (satir.degisim > 0 ? g.onceki < hedef.alt - EPS : g.onceki > hedef.ust + EPS) ? "saglandi" : "saglanmadi";
    } else if (satir.kosul === "aciklanamiyor") out.kosul = g.aciklanabilir ? "saglanmadi" : "saglandi";
    out.onerilen = satir.degisim == null ? null : out.kosul === "saglanmadi" ? 0 : satir.degisim;
    var eski = haftalikMg(g.ceyrekler, g.tabletMg);
    out.eskiMg = eski;
    if (!(eski > 0)) return out;
    var hekim = isFinite(g.degisim);
    if (!hekim && (out.kosul === "bekliyor" || out.onerilen == null)) return out; // karar önceki INR'ye bağlı ya da tablo doz vermiyor
    var uyg = hekim ? g.degisim : out.onerilen;
    out.uygulanan = uyg;
    out.hedefMg = eski * (1 + uyg / 100);
    out.plan = dagit(out.hedefMg, g.tabletMg);
    out.gerceklesen = (out.plan.toplam / eski - 1) * 100;
    return out;
  }
  function yuksek(alg, kosul) { return alg.yuksek_inr.filter(function (x) { return x.kosul === kosul; })[0]; }

  function atlaYazi(s) {
    if (s.atla === "kes") return "Varfarini kesin. Tablo bu INR düzeyinde yeni doz vermez; yeniden başlama dozunu hekim belirler.";
    if (s.atla === "inr-aralikta") return "Varfarine ara verin; INR hedef aralığa inince yeni (azaltılmış) haftalık dozla yeniden başlayın.";
    if (s.atla > 0) return s.atla + " gün varfarin vermeyin, sonra yeni haftalık dozla devam edin.";
    if (s.degisim < 0) return "Varfarine ara vermeyin.";
    return "";
  }
  function kontrolYazi(s) {
    var kg = s.kontrol_gun;
    if (s.kontrol_metin) return "Sonraki INR: " + s.kontrol_metin + ".";
    if (!kg) return "Sonraki INR: önceki kontrol aralığını sürdürün.";
    var d0 = new Date(); d0.setHours(0, 0, 0, 0);
    var tarih = function (n) { var d = new Date(d0.getTime()); d.setDate(d.getDate() + n); return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "short" }); };
    return "Sonraki INR: " + (kg[0] === kg[1] ? kg[0] + " gün sonra (" + tarih(kg[0]) + ")" : kg[0] + "–" + kg[1] + " gün sonra (" + tarih(kg[0]) + " – " + tarih(kg[1]) + ")") + ".";
  }

  /* ---------- arayüz ---------- */
  var algPromise = null;
  function yukle() {
    if (!algPromise) algPromise = fetch("data/inr-algoritma.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    return algPromise;
  }

  function build(host) {
    var Ek = window.KanuniEk, el = Ek.el, num = Ek.num;
    var form = el("form", "tool-body"); form.addEventListener("submit", function (e) { e.preventDefault(); });
    host.appendChild(form);

    function fld(label, input, unit, cls) {
      var lab = el("label", "fld" + (cls ? " " + cls : "")); lab.appendChild(el("span", null, label));
      if (input.type === "checkbox") { lab.className = "fld chk"; lab.insertBefore(input, lab.firstChild); return lab; }
      var w = el("span", "inp"); w.appendChild(input); if (unit) w.appendChild(el("i", null, unit)); lab.appendChild(w); return lab;
    }
    function sel(name, opts) {
      var s = document.createElement("select"); s.name = name;
      opts.forEach(function (o) { var op = document.createElement("option"); op.value = o[0]; op.textContent = o[1]; s.appendChild(op); });
      return s;
    }
    function txt(name, ph) { var i = document.createElement("input"); i.type = "text"; i.name = name; i.inputMode = "decimal"; i.autocomplete = "off"; if (ph) i.placeholder = ph; return i; }

    var f1 = el("div", "fields");
    var hedef = sel("hedef", [["2-3", "2,0–3,0"], ["2.5-3.5", "2,5–3,5"]]);
    var inr = txt("inr"), onceki = txt("onceki", "koşullu satırlarda sorulur");
    var tablet = sel("tablet", [["5", "5 mg"], ["10", "10 mg"]]); // Türkiye'de ruhsatlı varfarin tabletleri: 5 ve 10 mg (TİTCK e-reçete listesi, 22.09.2026)
    f1.appendChild(fld("Hedef INR aralığı", hedef));
    f1.appendChild(fld("Güncel INR", inr));
    f1.appendChild(fld("Önceki INR", onceki));
    f1.appendChild(fld("Kullanılan tablet", tablet));
    form.appendChild(f1);

    var kan = document.createElement("input"); kan.type = "checkbox"; kan.name = "kanama";
    var acik = document.createElement("input"); acik.type = "checkbox"; acik.name = "aciklanabilir";
    var f2 = el("div", "fields col"); f2.appendChild(fld("Hastada kanama var", kan));
    var acikLab = fld("Düşük INR'nin açıklanabilir nedeni var (atlanmış doz, yeni ilaç, beslenme değişikliği)", acik);
    acikLab.style.display = "none"; f2.appendChild(acikLab); form.appendChild(f2);

    form.appendChild(el("p", "hint", "Şu an kullandığı günlük tablet sayısı (¼ tablet adımlarıyla):"));
    var f3 = el("div", "fields"); f3.style.gridTemplateColumns = "repeat(auto-fit,minmax(118px,1fr))";
    var opts = []; for (var k = 0; k <= 12; k++) opts.push([k, tabletYazi(k) + " tb"]);
    var gunSel = GUNLER.map(function (g, i) { var s = sel("g" + i, opts); f3.appendChild(fld(g, s)); return s; });
    form.appendChild(f3);

    var f4 = el("div", "fields");
    var deg = txt("degisim", "önerilen");
    f4.appendChild(fld("Uygulanacak değişim (boş bırakılırsa önerilen)", deg, "%"));
    form.appendChild(f4);

    var res = el("div", "result"); res.setAttribute("aria-live", "polite"); form.appendChild(res);
    var reset = el("button", "reset", "Temizle"); reset.type = "button"; form.appendChild(reset);

    var alg = null;
    function run() {
      res.innerHTML = ""; res.className = "result";
      if (!alg) { res.appendChild(el("span", "hint", "Algoritma yükleniyor…")); return; }
      var tb = +tablet.value;
      var o = hesapla(alg, { hedef: hedef.value, inr: num(inr.value), onceki: num(onceki.value), aciklanabilir: acik.checked,
        tabletMg: tb, kanama: kan.checked, ceyrekler: gunSel.map(function (s) { return +s.value; }), degisim: num(deg.value) });
      acikLab.style.display = o && o.satir && o.satir.kosul === "aciklanamiyor" ? "" : "none";
      if (!o) { res.appendChild(el("span", "hint", "Hedef aralığı, güncel INR'yi ve şu anki günlük tablet çizelgesini girin.")); return; }
      function p(t, c) { res.appendChild(el("p", c || null, t)); }
      function uyar() { o.uyarilar.forEach(function (u) { p(u, "warn"); }); }
      if (o.kanama) { res.className += " high"; res.appendChild(el("b", null, "Kanama – acil değerlendirme")); uyar(); return; }
      var s = o.satir, isaret = function (x) { return (x > 0 ? "+" : x < 0 ? "−" : "") + "%" + fmt(Math.abs(x), 1); };
      deg.placeholder = o.onerilen == null ? "tabloda yok" : "önerilen " + isaret(o.onerilen);
      res.className += " " + (o.aralikta ? "ok" : s.atla ? "high" : "mid");
      var satirYazi = "INR " + fmt(num(inr.value), 2) + " (hedef " + o.hedef.ad + "; Kim 2010 satırı " + s.aralik + ")";
      var kosulYazi = "";
      if (o.kosul === "bekliyor") kosulYazi = "Bu satırda doz, INR iki veya daha fazla ölçümde " + (s.degisim > 0 ? "düşük" : "yüksek") + " ise değiştirilir: önceki INR'yi girin.";
      else if (s.kosul === "iki-olcum") kosulYazi = o.kosul === "saglandi" ?
        "Önceki INR de aralığın " + (s.degisim > 0 ? "altında" : "üstünde") + ": iki ölçümde " + (s.degisim > 0 ? "düşük" : "yüksek") + " → " + isaret(s.degisim) + "." :
        "Önceki INR aralığın " + (s.degisim > 0 ? "altında" : "üstünde") + " değil: tek ölçüm, tablo doz değişikliği önermez.";
      else if (s.kosul === "aciklanamiyor") kosulYazi = o.kosul === "saglandi" ? "Açıklanabilir neden yok → " + isaret(s.degisim) + "." :
        "Açıklanabilir neden var: tablo doz değişikliği önermez; nedeni düzeltin.";
      if (!o.plan) {
        res.appendChild(el("b", null, o.kosul === "bekliyor" ? "Önceki INR gerekli" : o.onerilen == null ? "Varfarini kesin" :
          "Önerilen değişim " + isaret(o.onerilen)));
        uyar();
        p(satirYazi + ".");
        if (kosulYazi) p(kosulYazi);
        var a0 = atlaYazi(s); if (a0) p(a0);
        if (!(o.eskiMg > 0)) p("Yeni haftalık dozu hesaplamak için şu anki günlük tablet çizelgesini girin.");
        else if (o.onerilen == null) p("Yeniden başlama dozunu belirlediyseniz değişim % alanına girerek günlere dağılımı görebilirsiniz.");
        p(kontrolYazi(s));
        return;
      }
      res.appendChild(el("b", null, fmt(o.eskiMg, 2) + " → " + fmt(o.plan.toplam, 2) + " mg/hafta"));
      uyar();
      p(satirYazi + ": önerilen değişim " + (o.onerilen == null ? "tabloda yok" : isaret(o.onerilen)) +
        (o.uygulanan !== o.onerilen ? "; hekimin uyguladığı " + isaret(o.uygulanan) : "") + ".");
      if (kosulYazi) p(kosulYazi);
      var a = atlaYazi(s); if (a) p(a);
      if (o.uygulanan === 0) p("Haftalık doz değişmez; şu anki çizelgeyle devam edin.");
      else {
        p("Hedeflenen " + fmt(o.hedefMg, 2) + " mg; " + tb + " mg tabletle ulaşılan " + fmt(o.plan.toplam, 2) + " mg; gerçekleşen değişim " + isaret(o.gerceklesen) + ".");
        var tw = el("div", "tablewrap"), t = el("table", "asi"), th = el("tr");
        ["Gün", "Tablet (" + tb + " mg)", "Doz"].forEach(function (h) { th.appendChild(el("th", null, h)); });
        var thead = el("thead"); thead.appendChild(th); t.appendChild(thead);
        var tbody = el("tbody");
        o.plan.ceyrekler.forEach(function (c, i) {
          var tr = el("tr"); tr.appendChild(el("td", null, GUNLER[i])); tr.appendChild(el("td", null, tabletYazi(c)));
          tr.appendChild(el("td", "mono", fmt(o.plan.mg[i], 2) + " mg")); tbody.appendChild(tr);
        });
        t.appendChild(tbody); t.style.minWidth = "0"; tw.appendChild(t); res.appendChild(tw);
      }
      p(kontrolYazi(s));
      if (s.yildiz) p("Bu satırda klinik yargıyla algoritmadan sapılabilir (Kim 2010, Tablo 1 dipnotu).");
    }
    form.addEventListener("input", run); form.addEventListener("change", run);
    reset.addEventListener("click", function () { form.reset(); run(); });
    run();
    yukle().then(function (d) { alg = d; run(); }).catch(function () { res.innerHTML = ""; res.appendChild(el("span", "hint", "Algoritma dosyası yüklenemedi.")); });
  }

  var TOOL = {
    id: "varfarin", g: "kardiyo", t: "Varfarin idame doz ayarı (INR)",
    d: "INR ve haftalık doza göre yeni haftalık doz, ¼/½ tabletle günlük dağılım ve sonraki INR zamanı.",
    kw: "varfarin warfarin coumadin orfarin inr doz ayarı antikoagülan kumadin k vitamini kanama",
    custom: build,
    src: [["Kim YK ve ark. J Thromb Haemost 2010;8:101–6, Tablo 1 (iki basamaklı idame algoritması)", "https://doi.org/10.1111/j.1538-7836.2009.03652.x"],
          ["Holbrook A ve ark. Chest 2012;141:e152S–84S (yüksek INR ve kanama)", "https://doi.org/10.1378/chest.11-2295"],
          ["Nieuwlaat R ve ark. J Thromb Thrombolysis 2014;37:435–42", "https://doi.org/10.1007/s11239-013-0969-x"],
          ["Mearns ES ve ark. Thromb J 2014;12:14", "https://doi.org/10.1186/1477-9560-12-14"]],
    note: "Eşikler ve yüzdeler Kim 2010 Tablo 1'den birebir alınmıştır; algoritma varfarinle stabil idame hastaları içindir. Tablodaki K vitamini dozları kullanılmaz; yerine Holbrook 2012 uyarıları gösterilir. Algoritma bir antikoagülasyon kliniğinin deneyimine dayanır ve resmi olarak valide edilmemiştir: Kim 2010'daki öncesi–sonrası çalışmada TTR hedef 2–3'te %67,2'den %73,2'ye, 2,5–3,5'te %49,8'den %63,8'e çıktı; birinci basamakta yapılan küme randomize çalışmada olağan bakıma üstün bulunmadı (ortalama TTR %72,1'e karşı %71,4; p = 0,73 – Nieuwlaat 2014). AF'de VKA meta-analizinde tromboembolilerin %57'si INR < 2, kanamaların %42'si INR > 3 iken oldu (Mearns 2014). Öneri hekim kararının yerine geçmez; ilaç etkileşimi, beslenme ve uyum ayrıca değerlendirilmelidir."
  };

  if (typeof window !== "undefined" && typeof document !== "undefined") {
    var go = function () { if (window.KanuniEk) window.KanuniEk.register([["kardiyo", "Kardiyovasküler & antikoagülasyon"]], [TOOL]); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
  }
  if (typeof module !== "undefined") module.exports = { hesapla: hesapla, dagit: dagit, satirBul: satirBul, haftalikMg: haftalikMg, tabletYazi: tabletYazi, TOOL: TOOL };
})();
