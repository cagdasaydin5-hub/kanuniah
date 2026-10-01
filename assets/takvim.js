/* Etkinlik takvimi. Veri data/etkinlikler.json'dan okunur; sıralama yalnızca tarihe göredir,
   önem düzeyi (1–5) yalnızca görsel vurgudur (renk ve yazı kalınlığı). */
(function () {
  "use strict";

  var TUR = { kongre: "Kongre", sempozyum: "Sempozyum", kurs: "Kurs / çalıştay", okul: "Okul", arastirma: "Araştırma günleri", webinar: "Webinar" };
  var KAPSAM = { bolgesel: "Bölgesel", ulusal: "Ulusal", uluslararasi: "Uluslararası katılımlı" };
  var BICIM = { "yuz-yuze": null, hibrit: "Hibrit", cevrimici: "Çevrim içi" };
  var TARIH = [["bildiri", "Bildiri son günü"], ["erken_kayit", "Erken kayıt son günü"], ["burs", "Burs başvurusu son günü"]];
  var AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  var GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function d(iso) { var p = iso.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function bugun() { var t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
  function gunFark(iso) { return Math.round((d(iso) - bugun()) / 864e5); }
  function uzun(iso) { var x = d(iso); return x.getDate() + " " + AY[x.getMonth()] + " " + x.getFullYear() + " " + GUN[x.getDay()]; }
  function kisa(iso) { var x = d(iso); return x.getDate() + " " + AY[x.getMonth()]; }
  function aralik(e) {
    if (!e.baslangic) return (e.yil ? e.yil + ", " : "") + "tarih açıklanmadı";
    if (!e.bitis || e.bitis === e.baslangic) return uzun(e.baslangic);
    var a = d(e.baslangic), b = d(e.bitis);
    var sol = a.getDate() + (a.getMonth() !== b.getMonth() ? " " + AY[a.getMonth()] : "") + (a.getFullYear() !== b.getFullYear() ? " " + a.getFullYear() : "");
    return sol + "–" + b.getDate() + " " + AY[b.getMonth()] + " " + b.getFullYear() + " (" + GUN[a.getDay()] + "–" + GUN[b.getDay()] + ")";
  }
  function kalanYazi(n) { return n === 0 ? "bugün" : n === 1 ? "yarın" : n + " gün kaldı"; }

  var CSS =
    ".tk-yakin{background:var(--brass-soft);border:1px solid color-mix(in srgb,var(--brass) 35%,transparent);border-radius:var(--radius);padding:12px 16px;margin:14px 0 4px}" +
    ".tk-yakin b{color:var(--brass)}.tk-yakin ul{margin:6px 0 0;padding-left:18px}.tk-yakin li{margin:2px 0}" +
    ".tk-ay{font-family:var(--serif);font-size:21px;margin:26px 0 8px;padding-bottom:4px;border-bottom:1px solid var(--line)}" +
    ".tk{display:grid;grid-template-columns:76px 1fr;gap:4px 16px;background:var(--surface);border:1px solid var(--line);border-left:5px solid var(--d,var(--line));border-radius:var(--radius);padding:14px 16px;margin:10px 0}" +
    ".tk.gecmis{opacity:.62}" +
    ".tk .tg{text-align:center;line-height:1.1}.tk .tg b{display:block;font-family:var(--mono);font-size:26px;color:var(--d,var(--ink))}.tk .tg span{font-size:12px;color:var(--muted)}" +
    ".tk h3{margin:4px 0 4px;font-size:18px;font-weight:500}.tk h3 a{color:inherit}" +
    ".tk.d1 h3{font-size:21px;font-weight:700}.tk.d2 h3{font-weight:650}.tk.d3 h3{font-weight:600}" +
    ".tk .rozet{display:flex;flex-wrap:wrap;gap:5px;align-items:center}" +
    ".tk .rz{font-size:11.5px;font-weight:700;letter-spacing:.04em;border-radius:4px;padding:2px 7px;background:var(--sunk);color:var(--ink)}" +
    ".tk .rz.dz{background:var(--d);color:#fff}.tk .rz.free{background:var(--pine-soft);color:var(--pine)}" +
    ".tk .when{font-weight:600}.tk .yer{color:var(--muted);font-size:14.5px}" +
    ".tk .tarihler{margin:6px 0 0;padding:0;list-style:none;font-size:14px}.tk .tarihler li{margin:1px 0}" +
    ".tk .tarihler .acil{color:var(--brass);font-weight:700}.tk .tarihler .gecti{color:var(--muted);text-decoration:line-through}" +
    ".tk .not{font-size:14px;color:var(--muted);margin:4px 0 0}" +
    ".tk .lnk{margin-top:6px;font-size:14px;font-weight:600}" +
    ".d1{--d:#B07A12}.d2{--d:var(--pine)}.d3{--d:#3B489C}.d4{--d:#5F7A8A}.d5{--d:#8A8F8C}" +
    "@media (prefers-color-scheme:dark){.d1{--d:#E3AE5C}.d3{--d:#9FACF0}.d4{--d:#8FB0C2}.d5{--d:#9AA29E}.tk .rz.dz{color:#08201C}}" +
    ".lejant{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:13px;color:var(--muted);margin-top:8px}.lejant span::before{content:'';display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--d);margin-right:5px;vertical-align:-1px}" +
    "@media (max-width:640px){.tk{grid-template-columns:58px 1fr;gap:4px 12px;padding:12px}.tk .tg b{font-size:21px}}";

  function kart(e, DZ) {
    var gecmis = e.baslangic && gunFark(e.bitis || e.baslangic) < 0;
    var a = el("article", "tk d" + e.duzey + (gecmis ? " gecmis" : "")); a.id = e.id;
    var tg = el("div", "tg");
    if (e.baslangic) { var x = d(e.baslangic); tg.appendChild(el("b", null, String(x.getDate()))); tg.appendChild(el("span", null, AY[x.getMonth()].slice(0, 3) + " · " + GUN[x.getDay()].slice(0, 3))); }
    else tg.appendChild(el("span", null, e.yil ? String(e.yil) : "—"));
    a.appendChild(tg);
    var b = el("div");
    var rz = el("div", "rozet");
    rz.appendChild(el("span", "rz dz", DZ[e.duzey] || ""));
    if (TUR[e.tur]) rz.appendChild(el("span", "rz", TUR[e.tur]));
    if (KAPSAM[e.kapsam]) rz.appendChild(el("span", "rz", KAPSAM[e.kapsam]));
    if (BICIM[e.bicim]) rz.appendChild(el("span", "rz", BICIM[e.bicim]));
    if (e.ucret === "ucretsiz") rz.appendChild(el("span", "rz free", "Ücretsiz"));
    b.appendChild(rz);
    var h = el("h3");
    if (e.url) { var l = el("a", null, e.ad); l.href = e.url; l.target = "_blank"; l.rel = "noopener"; h.appendChild(l); } else h.textContent = e.ad;
    b.appendChild(h);
    b.appendChild(el("div", "when", aralik(e) + (e.saat ? " · " + e.saat : "")));
    var yer = [e.sehir, e.yer].filter(Boolean).join(" · "); if (yer) b.appendChild(el("div", "yer", yer));
    if (e.duzenleyen) b.appendChild(el("div", "yer", "Düzenleyen: " + e.duzenleyen));
    var ul = el("ul", "tarihler"), var_ = false;
    TARIH.forEach(function (t) {
      var iso = (e.tarihler || {})[t[0]]; if (!iso) return;
      var n = gunFark(iso); if (n < 0 && !gecmis) return; /* geçmiş son tarihler yalnızca geçmiş etkinlikte gösterilir */
      var li = el("li", n < 0 ? "gecti" : n <= 21 ? "acil" : null, t[1] + ": " + uzun(iso) + (n >= 0 ? " (" + kalanYazi(n) + ")" : ""));
      ul.appendChild(li); var_ = true;
    });
    if (var_) b.appendChild(ul);
    if (e.not) b.appendChild(el("p", "not", e.not));
    if (e.url) { var lk = el("a", "lnk", "Resmi sayfa ↗"); lk.href = e.url; lk.target = "_blank"; lk.rel = "noopener"; b.appendChild(el("div")).appendChild(lk); }
    else if (e.kaynak) b.appendChild(el("p", "not", "Kaynak: " + e.kaynak));
    a.appendChild(b);
    return a;
  }

  function init() {
    var list = document.getElementById("events"); if (!list) return;
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    fetch("data/etkinlikler.json", { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (D) {
      var DZ = {}; D.duzeyler.forEach(function (z) { DZ[z.id] = z.ad; });
      var lej = document.getElementById("lejant");
      D.duzeyler.forEach(function (z) { var s = el("span", "d" + z.id, z.ad); s.title = z.aciklama; lej.appendChild(s); });
      var chips = document.getElementById("chips"), state = { tur: "all", gecmis: false, q: "" };
      var turler = Object.keys(TUR).filter(function (t) { return D.etkinlikler.some(function (e) { return e.tur === t; }); });
      [["all", "Tümü"]].concat(turler.map(function (t) { return [t, TUR[t]]; })).forEach(function (t) {
        var c = el("button", "chip", t[1]); c.type = "button"; c.dataset.t = t[0];
        c.addEventListener("click", function () { state.tur = t[0]; ciz(); }); chips.appendChild(c);
      });
      var gc = document.getElementById("showPast"); gc.addEventListener("change", function () { state.gecmis = gc.checked; ciz(); });
      var q = document.getElementById("q"); q.addEventListener("input", function () { state.q = q.value.toLocaleLowerCase("tr"); ciz(); });

      /* yaklaşan son tarihler (45 gün) */
      var yak = [];
      D.etkinlikler.forEach(function (e) { TARIH.forEach(function (t) { var iso = (e.tarihler || {})[t[0]]; if (iso) { var n = gunFark(iso); if (n >= 0 && n <= 45) yak.push([iso, n, t[1], e]); } }); });
      yak.sort(function (a, b) { return a[1] - b[1]; });
      var ybox = document.getElementById("yakin");
      if (yak.length) {
        ybox.hidden = false; ybox.appendChild(el("b", null, "Yaklaşan son tarihler"));
        var ul = el("ul"); yak.forEach(function (y) { var li = el("li"); li.appendChild(document.createTextNode(kisa(y[0]) + " (" + kalanYazi(y[1]) + ") – " + y[2] + ": ")); var a = el("a", null, y[3].ad); a.href = "#" + y[3].id; li.appendChild(a); ul.appendChild(li); });
        ybox.appendChild(ul);
      }

      function ciz() {
        Array.prototype.forEach.call(chips.children, function (c) { c.setAttribute("aria-pressed", c.dataset.t === state.tur ? "true" : "false"); });
        var rows = D.etkinlikler.filter(function (e) {
          if (state.tur !== "all" && e.tur !== state.tur) return false;
          var bitti = e.baslangic && gunFark(e.bitis || e.baslangic) < 0;
          if (bitti && !state.gecmis) return false;
          if (state.q && [e.ad, e.sehir, e.yer, e.duzenleyen, (e.konu || []).join(" ")].join(" ").toLocaleLowerCase("tr").indexOf(state.q) < 0) return false;
          return true;
        }).sort(function (a, b) {
          if (!a.baslangic !== !b.baslangic) return a.baslangic ? -1 : 1;
          return (a.baslangic || String(a.yil)).localeCompare(b.baslangic || String(b.yil));
        });
        list.textContent = ""; var ay = null;
        rows.forEach(function (e) {
          var k = e.baslangic ? AY[d(e.baslangic).getMonth()] + " " + d(e.baslangic).getFullYear() : "Tarihi açıklanacak";
          if (k !== ay) { list.appendChild(el("h2", "tk-ay", k)); ay = k; }
          list.appendChild(kart(e, DZ));
        });
        if (!rows.length) list.appendChild(el("p", "empty", "Bu süzgeçle eşleşen etkinlik yok."));
        document.getElementById("count").textContent = rows.length + " etkinlik";
      }
      ciz();
      if (location.hash) { var t = document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView(); }
    }).catch(function () { list.appendChild(el("p", "empty", "Takvim yüklenemedi. Sayfayı yenileyin.")); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
