// node --test tests/  — enteral beslenme araçlarının hesapları, bilinen örneklerle.
const test = require("node:test");
const assert = require("node:assert/strict");
const M = require("../assets/arac-mama.js");

const tool = (id) => M.TOOLS.find((t) => t.id === id);

test("NRS-2002: puan = beslenme + hastalık + yaş (≥70 → +1), eşik 3", () => {
  assert.equal(M.nrs2002({ yas: 69, durum: 1, hastalik: 1, i1: 1 }).score, 2);
  assert.equal(M.nrs2002({ yas: 69, durum: 1, hastalik: 1, i1: 1 }).risk, false);
  const x = M.nrs2002({ yas: 70, durum: 1, hastalik: 1, i2: 1 });
  assert.equal(x.score, 3); assert.equal(x.yasP, 1); assert.equal(x.risk, true);
  assert.equal(M.nrs2002({ yas: 80, durum: 3, hastalik: 3, i4: 1 }).score, 7);
  assert.equal(M.nrs2002({ yas: 50, durum: "", hastalik: 1 }), null);
});

test("NRS-2002: ön tarama negatifse haftalık yeniden tarama", () => {
  const out = tool("nrs2002").calc({ yas: 75, durum: 2, hastalik: 1, i1: 0, i2: 0, i3: 0, i4: 0 });
  assert.match(out.main, /Ön tarama negatif/);
  assert.equal(tool("nrs2002").calc({ yas: 75, durum: 2, hastalik: 1, i1: 1 }).level, "high");
});

test("MNA-SF: 0–7 malnütrisyon, 8–11 risk, 12–14 normal", () => {
  const base = { a: 2, b: 3, c: 2, d: 2, e: 2 };
  assert.deepEqual(M.mnasf({ ...base, f1: 3, f2: "" }), { score: 14, cls: "normal" });
  assert.deepEqual(M.mnasf({ a: 1, b: 2, c: 2, d: 2, e: 2, f1: 3, f2: "" }), { score: 12, cls: "normal" });
  assert.deepEqual(M.mnasf({ a: 1, b: 1, c: 2, d: 2, e: 2, f1: 3, f2: "" }), { score: 11, cls: "risk" });
  assert.deepEqual(M.mnasf({ a: 0, b: 1, c: 1, d: 2, e: 1, f1: 3, f2: "" }), { score: 8, cls: "risk" });
  assert.deepEqual(M.mnasf({ a: 0, b: 1, c: 1, d: 2, e: 1, f1: 2, f2: "" }), { score: 7, cls: "malnutrisyon" });
  assert.deepEqual(M.mnasf({ a: 0, b: 0, c: 0, d: 0, e: 0, f1: 0, f2: "" }), { score: 0, cls: "malnutrisyon" });
});

test("MNA-SF: VKİ yoksa baldır çevresi (0 ya da 3 puan), ikisi de yoksa sonuç yok", () => {
  const base = { a: 2, b: 2, c: 2, d: 2, e: 1 };
  assert.equal(M.mnasf({ ...base, f1: "", f2: 3 }).score, 12);
  assert.equal(M.mnasf({ ...base, f1: "", f2: 0 }).score, 9);
  assert.equal(M.mnasf({ ...base, f1: 1, f2: 3 }).score, 10, "VKİ girildiyse baldır çevresi kullanılmaz");
  assert.equal(M.mnasf({ ...base, f1: "", f2: "" }), null);
  assert.equal(M.mnasf({ ...base, a: "", f1: 3, f2: "" }), null);
});

test("Katalog süzgeci: tür ve Türkçe karakterden bağımsız arama", () => {
  const list = [
    { ad: "Ürün Lifli", uretici: "Nestlé", tur: ["standart", "lifli"] },
    { ad: "Diyabet Ürünü", uretici: "Abbott", tur: ["diyabetik"] },
    { ad: "Peptit Ürün", uretici: "Nutricia", tur: ["peptit"] },
  ];
  assert.equal(M.filterProducts(list, "all", "").length, 3);
  assert.equal(M.filterProducts(list, "lifli", "").length, 1);
  assert.equal(M.filterProducts(list, "all", "nestle").length, 1);
  assert.equal(M.filterProducts(list, "all", "urun").length, 3);
  assert.equal(M.filterProducts(list, "all", "diyabetik").length, 1, "tür adıyla da aranır");
  assert.equal(M.filterProducts(list, "peptit", "abbott").length, 0);
});

test("Araç tanımları: her araçta grup, başlık ve (katalog dışında) kaynak var", () => {
  const ids = new Set();
  for (const t of M.TOOLS) {
    assert.ok(!ids.has(t.id)); ids.add(t.id);
    assert.ok(M.GROUPS.some((g) => g[0] === t.g));
    if (!t.custom) assert.ok(t.src.length && t.src.every((s) => /^https:\/\//.test(s[1])));
  }
});

test("SUT 4.2.8.A (yetişkin): 1 (kilo kaybı ya da VKİ) + 2 + 3 birlikte; koşulsuz gruplar", () => {
  assert.equal(M.sut428({}), null);
  assert.deepEqual(M.sut428({ k1: 1, k3: 1, k4: 1 }), { durum: "karsilaniyor" });
  assert.deepEqual(M.sut428({ k2: 1, k3: 1, k5: 1 }), { durum: "karsilaniyor" });
  assert.deepEqual(M.sut428({ k1: 1, k2: 1, k4: 1, k5: 1 }), { durum: "karsilanmiyor" }, "eşlik eden hastalık yok");
  assert.deepEqual(M.sut428({ k3: 1, k4: 1 }), { durum: "karsilanmiyor" }, "kilo/VKİ ölçütü yok");
  assert.deepEqual(M.sut428({ k1: 1, k3: 1 }), { durum: "karsilanmiyor" }, "alım azalması yok");
  assert.equal(M.sut428({ m2: 1 }).durum, "muaf");
  assert.equal(M.sut428({ m3: 1, k1: 1 }).durum, "muaf");
  const t = M.TOOLS.find((x) => x.id === "sut-enteral");
  assert.match(t.calc({ k1: 1, k3: 1, k4: 1 }).sub, /3 ay .*1200 kcal.*30 günlük/);
  assert.match(t.calc({ m3: 1 }).sub, /6 ay .*nörolojik hastalıklarda 1 yıl/);
});
