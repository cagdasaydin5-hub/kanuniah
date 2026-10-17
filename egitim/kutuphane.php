<?php
// Materyal kütüphanesi: asistan seminerleri, makale ve olgu sunumları, hoca sunumları; konuya göre.
//   kutuphane.php          → arama sayfası (giriş gerekli)
//   kutuphane.php?veri=1   → dizin (JSON; giriş gerekli)
// Dosyalar egitim/arsiv/Kütüphane/<Tür>/ altında durur ve dosyalar.php?d=… ile verilir.
// Dizin sunum dosyalarıyla birlikte sunucudadır; tür klasörüne sonradan konan dosyalar da otomatik listelenir: egitim/arsiv/Kütüphane/.kutuphane.json (noktalı ad: klasör listesinde görünmez; depoda değil).
require __DIR__ . '/ortak.php';
giris_sart();

if (isset($_GET['veri'])) {
    // Dizindeki kayıtlar (dosyası duranlar) + tür klasörlerine sonradan konup dizinde olmayan dosyalar.
    // Yeni dosya adı biçimi: "Konu - Başlık - Sunan (Yıl).pptx"; uymayanlar "Yeni eklenenler" altına düşer.
    $kok = ARSIV . '/Kütüphane';
    $j = "$kok/.kutuphane.json";
    $dizin = is_file($j) ? (json_decode(file_get_contents($j), true) ?: []) : [];
    $nfc = function ($s) { return class_exists('Normalizer') ? Normalizer::normalize($s, Normalizer::FORM_C) : $s; };
    $TUR = ['Seminerler' => 'Seminer', 'Makale Sunumları' => 'Makale Sunumu', 'Olgu Sunumları' => 'Olgu Sunumu', 'Hoca Sunumları' => 'Hoca Sunumu', 'Rehberler' => 'Rehber'];
    $var = []; $grup = []; $cikti = []; $id = 0;
    foreach ($dizin as $x) {
        if (!is_file("$kok/{$x['path']}")) continue;
        $var[$nfc($x['path'])] = true; $grup[$x['topic']] = $x['group']; $id = max($id, (int)$x['id']);
        $cikti[] = $x;
    }
    foreach ($TUR as $klasor => $tur) {
        foreach (glob("$kok/$klasor/*") ?: [] as $p) {
            $ad = son_ad($p);
            if (!is_file($p) || $ad[0] === '.' || !izinli_dosya($p) || isset($var[$nfc("$klasor/$ad")])) continue;
            $govde = preg_replace('/\.[^.]*$/u', '', $ad);
            $yil = preg_match('/\((\d{4})\)(?: \(\d+\))?$/u', $govde, $m) ? $m[1] : date('Y', filemtime($p));
            $par = array_values(array_filter(array_map('trim', explode(' - ', preg_replace('/\s*\(\d{4}\)(?: \(\d+\))?$/u', '', $govde))), 'strlen'));
            $konu = count($par) >= 2 ? $par[0] : 'Yeni eklenenler';
            $cikti[] = [
                'id' => ++$id, 'type' => $tur, 'topic' => $konu, 'group' => $grup[$konu] ?? 'Yeni eklenenler',
                'title' => count($par) >= 3 ? implode(' - ', array_slice($par, 1, -1)) : ($par[1] ?? ($par[0] ?? $govde)),
                'presenter' => count($par) >= 3 ? end($par) : '', 'advisor' => '', 'year' => $yil, 'date' => '',
                'slides' => 0, 'path' => "$klasor/$ad", 'orig' => $ad, 'size' => filesize($p), 'keywords' => '',
            ];
        }
    }
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: private, no-store');
    echo json_encode($cikti, JSON_UNESCAPED_UNICODE);
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
    <div class="opts"><span class="count" id="count"></span> <button class="chip" id="hepsi" type="button">Tümünü kapat</button></div>
  </div>
  <div id="kutuphane" class="kutuphane"><p class="empty">Dizin yükleniyor…</p></div>
  <p><a class="chip" href="./">‹ Eğitim</a>' . (rol() === 'yonetici' ? ' <a class="chip" href="yonetim.php?y=K%C3%BCt%C3%BCphane">Sunum ekle / düzenle</a>' : '') . '</p>
  <script src="../assets/kutuphane.js" defer></script>');
