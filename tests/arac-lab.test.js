const test = require("node:test"), assert = require("node:assert");
const L = require("../assets/arac-lab.js");
const near = (a, b, e) => assert.ok(Math.abs(a - b) <= (e || 0.01), a + " ≈ " + b);

test("formüller", () => {
  near(L.egfr(1.0, 60, false), 86.2, 0.6);
  near(L.fib4(60, 40, 25, 200), 2.4, 0.01);
  near(L.kalsiyumDuzeltilmis(7.6, 2.0), 9.6);
  near(L.sodyumDuzeltilmis(130, 600, 1.6), 138, 0.01);
  near(L.anyonAcigiDuzeltilmis(10, 2.4), 15, 0.01);
  near(L.ldlFriedewald(200, 50, 150), 120);
  near(L.homaIr(90, 10), 2.22, 0.01);
  near(L.ortGlukoz(7), 154.2, 0.01);
});

test("Mentzer örneği ve indeks eşikleri", () => {
  const ind = L.indeksler({ hb: 10, rbc: 4.59, mcv: 77, mch: 22, rdw: 17 });
  const m = ind.find(x => x.ad === "Mentzer");
  near(m.deger, 16.78, 0.01); assert.equal(m.lehine, "de");
});

test("uyarılar hasta bilgisine göre değişir", () => {
  const taban = { yas: 70, cins: "e", kr: 1.8, durum: {}, ilac: {} };
  const a = L.degerlendir(Object.assign({}, taban, { ilac: { metformin: true } }));
  assert.ok(a.dikkat.some(x => /GFH düşük/.test(x.b) && /Metformin/.test(x.m)));
  const b = L.degerlendir(Object.assign({}, taban, { ilac: {} }));
  assert.ok(!b.dikkat.some(x => /Metformin/.test(x.m)));
  const c = L.degerlendir({ yas: 70, cins: "e", ast: 50, alt: 30, plt: 200, durum: {}, ilac: {} });  // FIB-4 = 3,2 (≥65 eşiği 2,0)
  assert.ok(c.dikkat.some(x => /FIB-4/.test(x.b)));
  const d = L.degerlendir({ yas: 70, cins: "e", ast: 25, alt: 30, plt: 250, durum: {}, ilac: {} });  // FIB-4 = 1,4 (<2,0)
  assert.ok(!d.dikkat.some(x => /FIB-4/.test(x.b)));
});

test("her uyarının kaynağı var (MCV makrositoz hariç)", () => {
  const r = L.degerlendir({ yas: 55, cins: "k", hb: 9, rbc: 4.5, mcv: 70, mch: 21, rdw: 18, na: 128, glk: 250, a1c: 7.2, acl: true, kr: 1.5, durum: {}, ilac: { tiyazid: true } });
  r.dikkat.filter(x => !/makrositoz/.test(x.b)).forEach(x => assert.ok(x.k.length, x.b));
});
