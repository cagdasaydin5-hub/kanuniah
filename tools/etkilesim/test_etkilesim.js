/* İlaç etkileşimi aracı testleri: node --test tools/etkilesim/ */
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..", "..");
const E = require(path.join(ROOT, "assets", "arac-etkilesim.js"));
const VERI = path.join(ROOT, "data", "etkilesim");
const liste = JSON.parse(fs.readFileSync(path.join(VERI, "ilaclar.json"), "utf8"));
const ilaclar = liste.ilaclar;
const byId = E.indeksle(ilaclar);
const dosya = (id) => JSON.parse(fs.readFileSync(path.join(VERI, "ilac", id + ".json"), "utf8"));
const dosyalar = {};
for (const d of ilaclar) dosyalar[d.id] = dosya(d.id);
const calis = (...ids) => E.analiz(byId, ids, dosyalar);
const cift = (R, a, b) => {
  for (const lv of ["Major", "Moderate", "Minor", "Unknown", "Not"]) {
    const c = R.ciftler[lv].find((c) => (c.a.id === a && c.b.id === b) || (c.a.id === b && c.b.id === a));
    if (c) return c;
  }
  return null;
};

/* ---------- eşleme doğruluğu ---------- */

test("bilinen Türkçe adlar doğru DDInter adına eşlenir", () => {
  const beklenen = {
    parasetamol: ["Acetaminophen"], asa: ["Acetylsalicylic acid"], ibuprofen: ["Ibuprofen"], varfarin: ["Warfarin"],
    apiksaban: ["Apixaban"], rivaroksaban: ["Rivaroxaban"], edoksaban: ["Edoxaban"], klopidogrel: ["Clopidogrel"],
    klaritromisin: ["Clarithromycin"], simvastatin: ["Simvastatin"], atorvastatin: ["Atorvastatin"],
    sertralin: ["Sertraline"], essitalopram: ["Escitalopram"], tramadol: ["Tramadol"], petidin: ["Meperidine"],
    glibenklamid: ["Glyburide"], rifampisin: ["Rifampicin"], metimazol: ["Methimazole"], lityum: ["Lithium carbonate"],
    "sari-kantaron": ["St. John's Wort"], "tmp-smx": ["Trimethoprim", "Sulfamethoxazole"],
    "amoksisilin-klavulanat": ["Amoxicillin", "Clavulanic acid"], "sakubitril-valsartan": ["Sacubitril", "Valsartan"],
    levotiroksin: ["Levothyroxine"], hiyosin: ["Scopolamine"], sefaleksin: ["Cephalexin"],
  };
  for (const [id, dd] of Object.entries(beklenen)) {
    assert.ok(byId[id], "listede yok: " + id);
    assert.deepEqual(byId[id].dd, dd, id);
  }
});

/* Türkçe yazım ile İngilizce adın ses iskeleti benzer olmalı; yazım hatasını ve yanlış satıra eşlemeyi yakalar. */
function iskelet(s, tr) {
  s = E.fold(s).split(" ")[0];
  if (tr) s = s.replace(/ks/g, "x").replace(/j/g, "g");
  return s.replace(/ph/g, "f").replace(/th/g, "t").replace(/x/g, "ks").replace(/c/g, "k").replace(/y/g, "i")
    .replace(/w/g, "v").replace(/z/g, "s").replace(/e$/, "").replace(/(.)\1/g, "$1");
}
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
test("tüm eşlemelerde Türkçe ad ile DDInter adı ses olarak uyumlu (bilinen istisnalar dışında)", () => {
  const istisna = new Set(["parasetamol", "asa", "petidin", "glibenklamid", "hiyosin", "bizmut", "makrogol", "omega-3",
    "insan-insulini", "fenoksimetilpenisilin", "benzatin-penisilin", "tmp-smx", "sari-kantaron", "valproat", "demir",
    "b12", "magnezyum", "cinko", "etinilestradiol", "kolekalsiferol", "asetilsistein", "kalsiyum-karbonat",
    "aluminyum-hidroksit", "magnezyum-hidroksit", "potasyum-klorur", "folik-asit", "ursodeoksikolik-asit",
    "sakubitril-valsartan", "amoksisilin-klavulanat", "metimazol", "lityum", "alendronat", "risedronat", "kolsisin"]);
  const hatali = [];
  for (const d of ilaclar) {
    if (!d.dd.length || istisna.has(d.id)) continue;
    const a = iskelet(d.ad, true), b = iskelet(d.dd[0], false);
    const oran = lev(a, b) / Math.max(a.length, b.length);
    if (oran > 0.3) hatali.push(`${d.ad} → ${d.dd[0]} (${a} / ${b})`);
  }
  assert.deepEqual(hatali, []);
});

test("eşleme tablosu yapısal olarak tutarlı", () => {
  assert.ok(ilaclar.length >= 280 && ilaclar.length <= 400, "ilaç sayısı " + ilaclar.length);
  const ids = new Set();
  const adlar = new Map();
  for (const d of ilaclar) {
    assert.match(d.id, /^[a-z0-9-]+$/);
    assert.ok(!ids.has(d.id), "id tekrarı " + d.id); ids.add(d.id);
    const f = E.fold(d.ad);
    assert.ok(!adlar.has(f), "Türkçe ad tekrarı " + d.ad); adlar.set(f, d.id);
    assert.equal(d.dd.length, d.ddid.length);
    d.ddid.forEach((x) => assert.match(x, /^DDInter\d+$/));
    if (!d.dd.length) assert.equal(d.k, false);
  }
  // Aynı DDInter adı yalnızca kombinasyon ürününde tekrar edebilir
  const tekli = new Map();
  for (const d of ilaclar) if (d.dd.length === 1) {
    assert.ok(!tekli.has(d.dd[0]), `${d.dd[0]} iki kez: ${tekli.get(d.dd[0])}, ${d.id}`); tekli.set(d.dd[0], d.id);
  }
});

test("ilaç dosyaları simetrik ve geçerli", () => {
  const izinli = new Set(["Major", "Moderate", "Minor", "Unknown"]);
  for (const d of ilaclar) {
    const x = dosyalar[d.id].x;
    assert.equal(dosyalar[d.id].id, d.id);
    for (const [o, lv] of Object.entries(x)) {
      assert.ok(byId[o], `${d.id}: bilinmeyen ilaç ${o}`);
      assert.ok(izinli.has(lv));
      assert.equal(dosyalar[o].x[d.id], lv, `${d.id}–${o} simetrik değil`);
    }
    if (!d.dd.length) assert.deepEqual(x, {});
  }
});

test("yazılan ad Türkçe karakter ve büyük harf farkına bakmadan çözülür", () => {
  const ornek = { "İbuprofen": "ibuprofen", ibuprofen: "ibuprofen", "KLARİTROMİSİN": "klaritromisin", "sari kantaron": "sari-kantaron",
    Warfarin: "varfarin", aspirin: "asa", "asetilsalisilik asit": "asa", "kotrimoksazol": "tmp-smx", "essitalopram": "essitalopram",
    "Sertraline": "sertralin", "tiamazol": "metimazol", "Dabigatran": "dabigatran" };
  for (const [q, id] of Object.entries(ornek)) assert.equal((E.coz(ilaclar, q) || {}).id, id, q);
  assert.equal(E.coz(ilaclar, "olmayanilac"), null);
  assert.equal(E.ara(ilaclar, "klar")[0].id, "klaritromisin");
  assert.equal(E.ara(ilaclar, "varf")[0].id, "varfarin");
});

/* ---------- bilinen etkileşimler ---------- */

test("varfarin + NSAİİ: DDInter'de ciddi, varfarin kutusu ve kanama notu", () => {
  for (const n of ["ibuprofen", "naproksen", "diklofenak", "asa"]) {
    const R = calis("varfarin", n);
    const c = cift(R, "varfarin", n);
    assert.ok(c, n);
    assert.equal(c.lv, "Major", "varfarin + " + n);
    assert.ok(c.not.some((x) => /Antitrombotik/.test(x.m)), "kanama notu " + n);
    assert.ok(R.kutular.some((k) => k.id === "varfarin"));
  }
});

test("SSRI + tramadol: serotonerjik uyarı kutusu ve serotonin sendromu notu", () => {
  for (const s of ["sertralin", "essitalopram", "sitalopram", "fluoksetin", "paroksetin"]) {
    const R = calis(s, "tramadol");
    const k = R.kutular.find((k) => k.id === "sero");
    assert.ok(k, s + " + tramadol serotonerjik kutusu");
    assert.equal(k.sev, "high");
    const c = cift(R, s, "tramadol");
    assert.ok(c && c.not.some((x) => /serotonin sendromu/i.test(x.m)), s);
    // DDInter indirme verisi bu çifti içermiyor; kontrol edilemeyen çift olarak gizlenmemeli
    assert.equal(R.kapsamDisi.length, 0);
  }
});

test("klaritromisin + statin: simvastatin ve atorvastatin ciddi, miyopati notu; pravastatin notsuz", () => {
  for (const s of ["simvastatin", "atorvastatin"]) {
    const c = cift(calis("klaritromisin", s), "klaritromisin", s);
    assert.equal(c.lv, "Major", s);
    assert.ok(c.not.some((x) => /miyopati/.test(x.m)), s);
  }
  const p = cift(calis("klaritromisin", "pravastatin"), "klaritromisin", "pravastatin");
  assert.ok(!p || !p.not.some((x) => /miyopati/.test(x.m)));
});

test("QT uzatanlar: sitalopram + klaritromisin QT kutusu açar, tek QT ilacı açmaz", () => {
  assert.ok(calis("sitalopram", "klaritromisin").kutular.some((k) => k.id === "qt"));
  assert.ok(!calis("sitalopram", "metformin").kutular.some((k) => k.id === "qt"));
});

test("DOAK: apiksaban + klaritromisin ve rivaroksaban + klopidogrel yüksek riskli DOAK kutusu", () => {
  for (const [a, b] of [["apiksaban", "klaritromisin"], ["rivaroksaban", "klopidogrel"], ["dabigatran", "ibuprofen"]]) {
    const k = calis(a, b).kutular.find((k) => k.id === "doak");
    assert.ok(k && k.sev === "high", a + " + " + b);
  }
  assert.equal(calis("apiksaban", "parasetamol").kutular.find((k) => k.id === "doak").sev, "mid");
});

test("diğer: aynı etken madde, üçlü darbe, MAO inhibitörü", () => {
  assert.equal(calis("amoksisilin", "amoksisilin-klavulanat").ayniEtken.length, 1);
  assert.ok(calis("ramipril", "hidroklorotiyazid", "ibuprofen").kutular.some((k) => k.id === "ucludarbe"));
  assert.match(calis("moklobemid", "sertralin").kutular.find((k) => k.id === "sero").metin, /MAO/);
});

test("kapsam dışı çiftler ayrı listelenir, etkileşimsiz sayılmaz", () => {
  const R = calis("amlodipin", "metoprolol");
  assert.equal(R.kapsamDisi.length + R.kayitYok.length + Object.values(R.ciftler).flat().length, 1);
  assert.equal(R.kapsamDisi.length, 1);
});

test("en fazla 15 ilaç; 15 ilaçla çözümleme 105 çifti değerlendirir", () => {
  assert.equal(E.EN_COK, 15);
  const ids = ilaclar.slice(0, 15).map((d) => d.id);
  const R = calis(...ids);
  const n = Object.values(R.ciftler).flat().length + R.kayitYok.length + R.kapsamDisi.length;
  const veriYok = new Set(R.veriYok.map((d) => d.id));
  const beklenen = ids.length * (ids.length - 1) / 2;
  assert.ok(n <= beklenen && n >= beklenen - veriYok.size * 14);
});
