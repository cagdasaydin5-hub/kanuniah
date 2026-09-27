// node --test — varfarin idame doz aracı: Kim 2010 Tablo 1 eşikleri, koşullu satırlar, Holbrook 2012 uyarıları ve tablet dağılımı.
const test = require("node:test");
const assert = require("node:assert/strict");
const I = require("../assets/arac-inr.js");
const ALG = require("../data/inr-algoritma.json");
const KIM = require("../tools/kaynak/inr/kim-2010-tablo1.json");

const FULL5 = [4, 4, 4, 4, 4, 4, 4]; // her gün 1 × 5 mg = 35 mg/hafta
const run = (hedef, inr, extra = {}) =>
  I.hesapla(ALG, { hedef, inr, onceki: NaN, aciklanabilir: false, tabletMg: 5, ceyrekler: FULL5, kanama: false, degisim: NaN, ...extra });

test("Veri dosyası Kim 2010 Tablo 1 kaynak kopyasıyla satır satır aynı (eşik, %, koşul, atlama)", () => {
  for (const [hid, kaynakAnahtari] of [["2-3", "hedef_2_3"], ["2.5-3.5", "hedef_2_5_3_5"]]) {
    const bizim = ALG.hedefler[hid].satirlar, kaynak = KIM[kaynakAnahtari];
    assert.equal(bizim.length, kaynak.length, hid + " satır sayısı");
    kaynak.forEach((k, i) => {
      const b = bizim[i], yer = `${hid} satır ${i + 1}`;
      assert.equal(b.ust, k.inr_max, yer + " üst sınır");
      if (i > 0) assert.ok(Math.abs(k.inr_min - (bizim[i - 1].ust + 0.01)) < 1e-9, yer + " alt sınır bir önceki satırın 0,01 üstü");
      assert.equal(b.degisim, k.yuzde, yer + " yüzde");
      assert.equal(b.yildiz, !!k.yildiz, yer + " yıldız");
      const kosul = !k.kosul ? null : /iki veya daha fazla/.test(k.kosul) ? "iki-olcum" : /açıklanamıyorsa/.test(k.kosul) ? "aciklanamiyor" : "?";
      assert.equal(b.kosul, kosul, yer + " koşul");
      const atla = /Hold for 1 day/.test(k.eylem) ? 1 : /Hold warfarin and give/.test(k.eylem) ? "kes" :
        /Hold warfarin/.test(k.eylem) ? "inr-aralikta" : 0;
      if (k.atla !== undefined) assert.equal(k.atla === "kes" ? "kes" : k.atla === "INR hedefe inene kadar" ? "inr-aralikta" : k.atla, atla, yer + " kaynak atla alanı");
      assert.equal(b.atla, atla, yer + " atlama");
      if (/7–14 days/.test(k.eylem)) assert.deepEqual(b.kontrol_gun, [7, 14], yer + " kontrol");
      if (/weekly until stable/.test(k.eylem)) assert.match(b.kontrol_metin, /haftalık/, yer + " kontrol");
      if (k.yuzde === 0) assert.equal(b.kontrol_gun, null);
    });
  }
});

test("Tablet yazımı ve haftalık mg", () => {
  assert.equal(I.tabletYazi(0), "0"); assert.equal(I.tabletYazi(1), "¼"); assert.equal(I.tabletYazi(2), "½");
  assert.equal(I.tabletYazi(4), "1"); assert.equal(I.tabletYazi(6), "1 ½"); assert.equal(I.tabletYazi(11), "2 ¾");
  assert.equal(I.haftalikMg(FULL5, 5), 35);
  assert.equal(I.haftalikMg([2, 4, 4, 4, 4, 4, 4], 5), 32.5);
  assert.equal(I.haftalikMg(FULL5, 2), 14);
});

// Her eşiğin iki yanı: [hedef, INR, tablodaki %, koşul, atla]
const SINIRLAR = [
  ["2-3", 1.2, 15, null, 0], ["2-3", 1.5, 15, null, 0], ["2-3", 1.51, 10, "iki-olcum", 0], ["2-3", 1.99, 10, "iki-olcum", 0],
  ["2-3", 2.0, 0, null, 0], ["2-3", 3.0, 0, null, 0], ["2-3", 3.01, -10, "iki-olcum", 0], ["2-3", 3.99, -10, "iki-olcum", 0],
  ["2-3", 4.0, -10, null, 1], ["2-3", 4.99, -10, null, 1], ["2-3", 5.0, -15, null, "inr-aralikta"], ["2-3", 8.99, -15, null, "inr-aralikta"],
  ["2-3", 9.0, null, null, "kes"], ["2-3", 14, null, null, "kes"],
  ["2.5-3.5", 1.5, 20, null, 0], ["2.5-3.5", 1.51, 15, "aciklanamiyor", 0], ["2.5-3.5", 1.99, 15, "aciklanamiyor", 0],
  ["2.5-3.5", 2.0, 10, "iki-olcum", 0], ["2.5-3.5", 2.49, 10, "iki-olcum", 0], ["2.5-3.5", 2.5, 0, null, 0], ["2.5-3.5", 3.5, 0, null, 0],
  ["2.5-3.5", 3.51, -10, "iki-olcum", 0], ["2.5-3.5", 4.49, -10, "iki-olcum", 0], ["2.5-3.5", 4.5, -10, null, 1],
  ["2.5-3.5", 4.99, -10, null, 1], ["2.5-3.5", 5.0, -15, null, "inr-aralikta"], ["2.5-3.5", 9.0, null, null, "kes"]
];
for (const [h, inr, pct, kosul, atla] of SINIRLAR) {
  test(`Kim 2010 satırı: hedef ${h}, INR ${inr} → ${pct}%, koşul ${kosul}, atla ${atla}`, () => {
    const s = I.satirBul(ALG.hedefler[h], inr);
    assert.equal(s.degisim, pct); assert.equal(s.kosul, kosul); assert.equal(s.atla, atla);
  });
}

test("Aralıkta: doz değişmez, kontrol aralığı sürer", () => {
  const o = run("2-3", 2.4);
  assert.equal(o.aralikta, true); assert.equal(o.uygulanan, 0); assert.equal(o.plan.toplam, 35); assert.equal(o.gerceklesen, 0);
});

test("INR 1,4 (hedef 2–3), 35 mg/hafta: +%15 → 40,25 mg hedef, 5 mg tabletle 40 mg (+%14,3)", () => {
  const o = run("2-3", 1.4);
  assert.equal(o.onerilen, 15); assert.ok(Math.abs(o.hedefMg - 40.25) < 1e-9);
  assert.equal(o.plan.toplam, 40); assert.deepEqual(o.plan.mg, [5, 7.5, 5, 5, 5, 7.5, 5]);
  assert.ok(Math.abs(o.gerceklesen - 14.2857) < 0.001);
});

test("İki ölçüm koşulu: önceki INR yoksa karar beklenir; tek düşük ölçümde değişiklik yok; iki düşük ölçümde +%10", () => {
  const bekle = run("2-3", 1.7);
  assert.equal(bekle.kosul, "bekliyor"); assert.equal(bekle.plan, undefined);
  const tek = run("2-3", 1.7, { onceki: 2.4 });
  assert.equal(tek.kosul, "saglanmadi"); assert.equal(tek.onerilen, 0); assert.equal(tek.plan.toplam, 35);
  const iki = run("2-3", 1.7, { onceki: 1.8 });
  assert.equal(iki.kosul, "saglandi"); assert.equal(iki.onerilen, 10);
  assert.ok(Math.abs(iki.hedefMg - 38.5) < 1e-9); assert.equal(iki.plan.toplam, 38.75);
  assert.deepEqual(iki.plan.mg.slice().sort(), [5, 5, 5, 5, 6.25, 6.25, 6.25].sort());
});

test("İki ölçüm koşulu, yüksek taraf: INR 3,5 ve önceki 3,2 (hedef 2–3) → −%10, varfarine ara verilmez", () => {
  const o = run("2-3", 3.5, { onceki: 3.2 });
  assert.equal(o.onerilen, -10); assert.equal(o.satir.atla, 0);
  assert.ok(Math.abs(o.hedefMg - 31.5) < 1e-9); assert.equal(o.plan.toplam, 31.25);
  assert.equal(run("2-3", 3.5, { onceki: 2.9 }).onerilen, 0, "önceki aralıkta: tek yüksek ölçüm");
});

test("Hedef 2,5–3,5, INR 1,8: açıklanamıyorsa +%15; açıklanabilir nedende değişiklik yok", () => {
  assert.equal(run("2.5-3.5", 1.8).onerilen, 15);
  assert.ok(Math.abs(run("2.5-3.5", 1.8).hedefMg - 40.25) < 1e-9);
  assert.equal(run("2.5-3.5", 1.8, { aciklanabilir: true }).onerilen, 0);
  assert.equal(run("2.5-3.5", 1.4).onerilen, 20);
});

test("INR 4,2 (hedef 2–3): 1 gün ara, −%10; INR 6: ara ver, −%15 ile yeniden başla", () => {
  const a = run("2-3", 4.2); assert.equal(a.satir.atla, 1); assert.equal(a.onerilen, -10);
  const b = run("2-3", 6); assert.equal(b.satir.atla, "inr-aralikta"); assert.equal(b.onerilen, -15);
  assert.ok(Math.abs(b.hedefMg - 29.75) < 1e-9); assert.equal(b.plan.toplam, 30);
  assert.match(b.satir.kontrol_metin, /haftalık/);
});

test("INR ≥ 9: tablo yeni doz vermez (hekim % girerse dağılım yapılır)", () => {
  const o = run("2-3", 9.5);
  assert.equal(o.onerilen, null); assert.equal(o.plan, undefined); assert.equal(o.satir.atla, "kes");
  assert.equal(run("2-3", 9.5, { degisim: -20 }).plan.toplam, 27.5); // 28 mg'a en yakın ¼ tablet adımı
});

test("Holbrook 2012: INR 4,5–10 kanamasız rutin K vitamini önerilmez; > 10 oral K vitamini; doz yazılmaz", () => {
  assert.deepEqual(run("2-3", 4.4).uyarilar, []);
  assert.match(run("2-3", 4.5).uyarilar[0], /rutin K vitamini önerilmez/);
  assert.match(run("2-3", 10).uyarilar[0], /rutin K vitamini önerilmez/);
  assert.match(run("2-3", 10.1).uyarilar[0], /oral K vitamini önerilir/);
  for (const u of ALG.yuksek_inr) assert.doesNotMatch(u.metin, /\d\s*mg/, "K vitamini dozu önerilmez");
});

test("Kanama: doz hesabı yapılmaz, acil uyarısı verilir", () => {
  const o = run("2-3", 2.5, { kanama: true });
  assert.equal(o.kanama, true); assert.equal(o.plan, undefined);
  assert.match(o.uyarilar[0], /acil/);
});

test("Hekim önerilen %'yi değiştirebilir", () => {
  const o = run("2-3", 1.4, { degisim: 5 });
  assert.equal(o.onerilen, 15); assert.equal(o.uygulanan, 5);
  assert.ok(Math.abs(o.hedefMg - 36.75) < 1e-9); assert.equal(o.plan.toplam, 36.25);
});

test("Eksik veri: INR yoksa sonuç yok; tablet çizelgesi boşsa yalnızca önerilen %", () => {
  assert.equal(run("2-3", NaN), null);
  const o = run("2-3", 1.4, { ceyrekler: [0, 0, 0, 0, 0, 0, 0] });
  assert.equal(o.onerilen, 15); assert.equal(o.plan, undefined);
});

test("Dağılım: tam/yarım tablet yeterliyse ¼ kullanılmaz, dozsuz gün yok, günler arası fark ≤ ½ tablet", () => {
  const p = I.dagit(30, 5);
  assert.equal(p.toplam, 30);
  assert.ok(p.ceyrekler.every((c) => c % 2 === 0 && c > 0));
  for (const w of [17.5, 22, 26.25, 31.5, 38.5, 44, 52.5]) {
    const d = I.dagit(w, 5);
    assert.ok(Math.max(...d.ceyrekler) - Math.min(...d.ceyrekler) <= 2, w + " mg");
    assert.ok(Math.abs(d.toplam - w) <= 5 / 8 + 1e-9, w + " mg: en yakın ¼ tablet adımı");
  }
});

test("Dağılım: 2 mg tabletle 14 mg → her gün 1 tablet; 15,4 mg → 15,5 mg; az sayıdaki yüksek günler yayılır", () => {
  assert.deepEqual(I.dagit(14, 2).ceyrekler, FULL5);
  assert.equal(I.dagit(15.4, 2).toplam, 15.5);
  assert.deepEqual(I.dagit(37.5, 5).mg, [5, 5, 5, 7.5, 5, 5, 5]);
});

test("Her algoritma satırı kaynağını taşır", () => {
  for (const h of Object.values(ALG.hedefler)) for (const s of h.satirlar) assert.equal(s.dogrulama, "Kim 2010 Tablo 1");
});
