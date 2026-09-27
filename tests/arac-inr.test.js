// node --test — varfarin idame doz aracı: eşikler (data/inr-algoritma.json) ve tablet dağılımı, bilinen örneklerle.
const test = require("node:test");
const assert = require("node:assert/strict");
const I = require("../assets/arac-inr.js");
const ALG = require("../data/inr-algoritma.json");

const FULL5 = [4, 4, 4, 4, 4, 4, 4]; // her gün 1 × 5 mg = 35 mg/hafta
const run = (hedef, inr, extra = {}) => I.hesapla(ALG, { hedef, inr, tabletMg: 5, ceyrekler: FULL5, kanama: false, degisim: NaN, ...extra });

test("Tablet yazımı ve haftalık mg", () => {
  assert.equal(I.tabletYazi(0), "0"); assert.equal(I.tabletYazi(1), "¼"); assert.equal(I.tabletYazi(2), "½");
  assert.equal(I.tabletYazi(4), "1"); assert.equal(I.tabletYazi(6), "1 ½"); assert.equal(I.tabletYazi(11), "2 ¾");
  assert.equal(I.haftalikMg(FULL5, 5), 35);
  assert.equal(I.haftalikMg([2, 4, 4, 4, 4, 4, 4], 5), 32.5);
  assert.equal(I.haftalikMg([4, 4, 4, 4, 4, 4, 4], 2), 14);
});

// Her eşiğin iki yanı: [hedef, INR, beklenen % değişim, atla]
const SINIRLAR = [
  ["2-3", 1.2, 15, 0], ["2-3", 1.5, 15, 0], ["2-3", 1.51, 10, 0], ["2-3", 1.99, 10, 0],
  ["2-3", 2.0, 0, 0], ["2-3", 2.5, 0, 0], ["2-3", 3.0, 0, 0], ["2-3", 3.01, -10, 0], ["2-3", 3.99, -10, 0],
  ["2-3", 4.0, -10, 1], ["2-3", 4.99, -10, 1], ["2-3", 5.0, -15, "inr-aralikta"], ["2-3", 9, -15, "inr-aralikta"],
  ["2.5-3.5", 2.0, 15, 0], ["2.5-3.5", 2.01, 10, 0], ["2.5-3.5", 2.49, 10, 0], ["2.5-3.5", 2.5, 0, 0],
  ["2.5-3.5", 3.5, 0, 0], ["2.5-3.5", 3.51, -10, 0], ["2.5-3.5", 4.49, -10, 0], ["2.5-3.5", 4.5, -10, 1],
  ["2.5-3.5", 5.49, -10, 1], ["2.5-3.5", 5.5, -15, "inr-aralikta"]
];
for (const [h, inr, pct, atla] of SINIRLAR) {
  test(`Algoritma satırı: hedef ${h}, INR ${inr} → %${pct}, atla ${atla}`, () => {
    const s = I.satirBul(ALG.hedefler[h], inr);
    assert.equal(s.degisim, pct); assert.equal(s.atla, atla);
  });
}

test("Aralıkta: doz değişmez", () => {
  const o = run("2-3", 2.4);
  assert.equal(o.aralikta, true); assert.equal(o.uygulanan, 0); assert.equal(o.plan.toplam, 35); assert.equal(o.gerceklesen, 0);
});

test("35 mg/hafta, INR 1,7 (hedef 2–3): %10 artış → 38,5 mg hedef, 5 mg tabletle 38,75 mg", () => {
  const o = run("2-3", 1.7);
  assert.equal(o.onerilen, 10); assert.ok(Math.abs(o.hedefMg - 38.5) < 1e-9);
  assert.equal(o.plan.toplam, 38.75); // 4 gün 5 mg + 3 gün 6,25 mg
  assert.deepEqual(o.plan.mg.slice().sort(), [5, 5, 5, 5, 6.25, 6.25, 6.25].sort());
  assert.ok(Math.abs(o.gerceklesen - 10.714) < 0.01);
  assert.equal(o.yakin, true, "aralığın 0,5 altında: Holbrook notu gösterilir");
});

test("35 mg/hafta, INR 3,5 (hedef 2–3): %10 azalma → 31,5 mg hedef; ½ tabletli dağılım yeğlenir", () => {
  const o = run("2-3", 3.5);
  assert.equal(o.onerilen, -10); assert.ok(Math.abs(o.hedefMg - 31.5) < 1e-9);
  assert.equal(o.plan.toplam, 31.25);
  assert.equal(o.plan.ceyrekler.filter((c) => c % 2 === 1).length, 3, "¼ adım gerekiyor: 31,25 = 4×5 + 3×3,75");
});

test("Tam sayı tablet yeterliyse ¼ tablet kullanılmaz: 30 mg/hafta hedefi", () => {
  const p = I.dagit(30, 5);
  assert.equal(p.toplam, 30);
  assert.ok(p.ceyrekler.every((c) => c % 2 === 0));
  assert.ok(p.ceyrekler.every((c) => c > 0), "dozsuz gün yok");
});

test("2 mg tabletle dağılım: 14 mg → her gün 1 tablet; 15,4 mg → 15,5 mg", () => {
  assert.deepEqual(I.dagit(14, 2).ceyrekler, [4, 4, 4, 4, 4, 4, 4]);
  assert.equal(I.dagit(15.4, 2).toplam, 15.5);
});

test("Az sayıdaki yüksek doz günleri haftaya yayılır", () => {
  const p = I.dagit(37.5, 5); // 6 gün 5 mg + 1 gün 7,5 mg
  assert.equal(p.toplam, 37.5);
  assert.deepEqual(p.mg, [5, 5, 5, 7.5, 5, 5, 5]);
  assert.deepEqual(I.dagit(40, 5).mg, [5, 7.5, 5, 5, 5, 7.5, 5]);
});

test("Hekim %'yi değiştirebilir", () => {
  const o = run("2-3", 1.7, { degisim: 5 });
  assert.equal(o.onerilen, 10); assert.equal(o.uygulanan, 5);
  assert.ok(Math.abs(o.hedefMg - 36.75) < 1e-9); assert.equal(o.plan.toplam, 36.25);
});

test("INR 4,5–10 kanamasız: rutin K vitamini önerilmez; > 10: oral K vitamini", () => {
  assert.match(run("2-3", 4.4).uyarilar.join(" "), /^$/);
  assert.match(run("2-3", 4.5).uyarilar[0], /rutin K vitamini önerilmez/);
  assert.match(run("2-3", 10).uyarilar[0], /rutin K vitamini önerilmez/);
  assert.match(run("2-3", 10.1).uyarilar[0], /oral K vitamini önerilir/);
  assert.equal(run("2-3", 6).satir.atla, "inr-aralikta");
});

test("Kanama: doz hesabı yapılmaz, acil uyarısı verilir", () => {
  const o = run("2-3", 2.5, { kanama: true });
  assert.equal(o.kanama, true); assert.equal(o.plan, undefined);
  assert.match(o.uyarilar[0], /acil/);
});

test("Eksik veri: INR yoksa sonuç yok; tablet çizelgesi boşsa yalnızca önerilen %", () => {
  assert.equal(run("2-3", NaN), null);
  const o = run("2-3", 1.7, { ceyrekler: [0, 0, 0, 0, 0, 0, 0] });
  assert.equal(o.onerilen, 10); assert.equal(o.plan, undefined);
});

test("Her algoritma satırı doğrulama durumu taşır", () => {
  for (const h of Object.values(ALG.hedefler)) for (const s of h.satirlar) assert.ok(s.dogrulama);
});
