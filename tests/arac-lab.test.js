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

test("yapıştırılan metin okunur", () => {
  const metin = [
    "Yaş: 55  Cinsiyet: Kadın",
    "HEMOGLOBİN\t10,2\tg/dL\t12-16",
    "Eritrosit (RBC)\t4,59\t10^6/uL",
    "MCV 77 fL  MCH 22 pg  MCHC 31 g/dL  RDW-CV 17,3 %  RDW-SD 48",
    "Trombosit 245.000 /uL",
    "Hemoglobin A1c (HbA1c) 7,2 %",
    "Glukoz (açlık) 126 mg/dL",
    "Sodyum 128 mmol/L  Potasyum 4,1",
    "Kreatinin 1,5  Kreatinin klirensi 45",
    "HDL Kolesterol 40  LDL Kolesterol 120  Total Kolesterol 200  Trigliserid 150",
    "BUN 20"
  ].join("\n");
  const r = L.metinOku(metin), d = r.degerler;
  assert.equal(r.yas, 55); assert.equal(r.cins, "k");
  assert.equal(d.hb, 10.2); assert.equal(d.rbc, 4.59); assert.equal(d.mcv, 77); assert.equal(d.mch, 22);
  assert.equal(d.rdw, 17.3); assert.equal(d.plt, 245); assert.equal(d.a1c, 7.2); assert.equal(d.glk, 126);
  assert.equal(d.na, 128); assert.equal(d.kr, 1.5); assert.equal(d.hdl, 40); assert.equal(d.tk, 200); assert.equal(d.tg, 150);
  assert.equal(d.ure, 42.8);
});

test("ilaç sınıfları ve bağlama göre kaynaklı uyarılar", () => {
  const L = require("../assets/arac-lab.js"), E = require("../assets/arac-etkilesim.js");
  const liste = require("../data/etkilesim/ilaclar.json").ilaclar; E.indeksle(liste);
  const bul = E.metinden(liste, "Glucophage 1000 mg, Coversyl 5 mg, Nexium, Lipitor, Jardiance, Bactrim, Voltaren");
  const r = L.ilacSiniflari(bul.map(d => d.id));
  for (const k of ["metformin", "raas", "ppi", "statin", "sglt2", "tmpsmx", "nsaii"]) assert.ok(r.siniflar[k], k);
  for (const k of Object.keys(L.SINIF)) for (const id of L.SINIF[k]) assert.ok(liste.some(d => d.id === id), id);
  const g = { yas: 70, cins: "e", kr: 1.8, alt: 30, ast: 25, na: 130, ilac: { raas: true, tmpsmx: true, nsaii: true, ssri: true, tiyazid: true, sglt2: true, statin: true }, durum: {} };
  const o = L.degerlendir(g), hepsi = o.dikkat.concat(o.bilgi);
  const baslik = (s) => hepsi.find(x => x.b.indexOf(s) >= 0);
  assert.ok(baslik("TMP-SMX"), "tmp-smx"); assert.ok(baslik("NSAİİ"), "nsaii"); assert.ok(baslik("SGLT2"), "sglt2"); assert.ok(baslik("Statin"), "statin");
  assert.ok(/SSRI/.test(baslik("Sodyum düşük").m));
  hepsi.forEach(x => { if (/^(Metformin|Proton|TMP|ACE|NSA|SGLT2|Statin|AST\/ALT|Çölyak)/.test(x.b)) assert.ok(x.k.length, x.b); });
  const g2 = { hb: 10, cins: "e", ilac: { metformin: true, ppi: true }, durum: { colyak: true } };
  const o2 = L.degerlendir(g2).dikkat.map(x => x.b).join("|");
  assert.ok(/Metformin/.test(o2) && /Proton/.test(o2));
});
