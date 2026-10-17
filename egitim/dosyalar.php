<?php
// Giriş yapan herkes (asistan ve yönetici) arşivdeki klasörleri gezer ve dosyaları açar/indirir.
//   dosyalar.php?y=Klasör/Alt   → klasör listesi
//   dosyalar.php?d=Klasör/a.pdf → dosyayı ver
require __DIR__ . '/ortak.php';
giris_sart();
arsiv_hazirla();

if (isset($_GET['d'])) {
    $rel = yol_temizle($_GET['d']);
    $p = $rel === null || $rel === '' ? null : tam_yol($rel);
    if (!$p || !is_file($p) || !izinli_dosya($p)) { http_response_code(404); exit('Dosya bulunamadı.'); }
    $ad = son_ad($p);
    $mod = in_array(uzanti($ad), TARAYICIDA, true) && !isset($_GET['indir']) ? 'inline' : 'attachment';
    header('Content-Type: ' . (uzanti($ad) === 'txt' ? 'text/plain; charset=utf-8' : (mime_content_type($p) ?: 'application/octet-stream')));
    header("Content-Disposition: $mod; filename*=UTF-8''" . rawurlencode($ad));
    header('Content-Length: ' . filesize($p));
    header('Cache-Control: private, no-store');
    readfile($p);
    exit;
}

$rel = yol_temizle($_GET['y'] ?? '');
if ($rel === null || !is_dir(tam_yol($rel))) $rel = '';
[$klasorler, $dosyalar] = listele($rel);

$satir = '';
foreach ($klasorler as $k) {
    $r = $rel === '' ? $k : "$rel/$k";
    $satir .= '<tr><td><a href="?y=' . rawurlencode($r) . '"><b>' . e($k) . '/</b></a></td><td>klasör</td><td></td></tr>';
}
foreach ($dosyalar as $f) {
    $r = $rel === '' ? $f : "$rel/$f";
    $p = tam_yol($r);
    $satir .= '<tr><td><a href="?d=' . rawurlencode($r) . '">' . e($f) . '</a> · <a href="?d=' . rawurlencode($r) . '&amp;indir=1">indir</a></td>'
            . '<td class="mono">' . boyut(filesize($p)) . '</td><td>' . tarih(filemtime($p)) . '</td></tr>';
}
if ($satir === '') $satir = '<tr><td colspan="3">Bu klasör boş.</td></tr>';

$ust = rol() === 'yonetici' ? ' <a class="chip" href="yonetim.php' . ($rel === '' ? '' : '?y=' . rawurlencode($rel)) . '">Bu klasörü yönet</a>' : '';
sayfa('Dosyalar', '
  <div class="page-head">
    <div class="eyebrow"><a href="./">Eğitim</a> › ' . kirinti($rel, 'dosyalar.php') . '</div>
    <h1>' . e($rel === '' ? 'Dosyalar' : son_ad($rel)) . '</h1>
  </div>
  <div class="tablewrap"><table class="asi dosya"><thead><tr><th>Ad</th><th>Boyut</th><th>Tarih</th></tr></thead><tbody>' . $satir . '</tbody></table></div>
  <p><a class="chip" href="./">‹ Eğitim</a>' . $ust . '</p>');
