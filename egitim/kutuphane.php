<?php
// Materyal kütüphanesi: asistan seminerleri, makale ve olgu sunumları, hoca sunumları; konuya göre.
//   kutuphane.php          → arama sayfası (giriş gerekli)
//   kutuphane.php?veri=1   → dizin (JSON; giriş gerekli)
// Dosyalar egitim/arsiv/Kütüphane/<Tür>/ altında durur ve dosyalar.php?d=… ile verilir.
// Dizin sunum dosyalarıyla birlikte sunucudadır: egitim/arsiv/Kütüphane/.kutuphane.json (noktalı ad: klasör listesinde görünmez; depoda değil).
require __DIR__ . '/ortak.php';
giris_sart();

if (isset($_GET['veri'])) {
    $j = ARSIV . '/Kütüphane/.kutuphane.json';
    if (!is_file($j)) { http_response_code(404); exit('{"hata":"dizin yok"}'); }
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: private, no-store');
    readfile($j);
    exit;
}

sayfa('Materyal kütüphanesi', '
  <div class="page-head">
    <div class="eyebrow"><a href="./">Eğitim</a> › Materyal kütüphanesi</div>
    <h1>Materyal kütüphanesi</h1>
    <p class="lede">Kliniğimizde bugüne kadar sunulmuş seminerler, makale ve olgu sunumları, hoca sunumları; konuya göre. Bir konu yazın, o konuda yapılmış her şeyi görün.</p>
  </div>
  <div class="bar">
    <label class="search" for="q"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="q" type="search" placeholder="Konu, başlık, sunan kişi ya da slayt içinden bir kelime: ör. hipertansiyon, aşı, Vatansever" autocomplete="off" autofocus></label>
    <div class="chips" id="tur" aria-label="Tür"></div>
    <div class="opts"><span class="count" id="count"></span></div>
  </div>
  <div id="kutuphane" class="kutuphane"><p class="empty">Dizin yükleniyor…</p></div>
  <p><a class="chip" href="./">‹ Eğitim</a> <a class="chip" href="dosyalar.php?y=K%C3%BCt%C3%BCphane">Klasörleri gez</a></p>
  <script src="../assets/kutuphane.js" defer></script>');
