<?php
// Haftalık güncelleme API anahtarı (yalnızca yönetici). Anahtar bir kez gösterilir; sunucuda yalnızca özeti durur.
require __DIR__ . '/ortak.php';
require __DIR__ . '/../admin/ortak-api.php';
giris_sart(true);

$yeni = null; $msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_dogrula();
    $yeni = api_anahtar_uret();
    if (!$yeni) $msg = 'Anahtar dosyası yazılamadı (admin klasörünün yazma izni).';
    else api_kayit('ANAHTAR yenilendi');
}
$var = is_file(API_ANAHTAR) ? (require API_ANAHTAR) : null;
$durum = is_array($var) ? 'Kayıtlı bir anahtar var (oluşturma: ' . e($var['olusturma'] ?? '?') . '). Yenisini oluşturursanız eskisi hemen geçersiz olur.' : 'Henüz anahtar yok.';
$kutu = $yeni ? '<div class="notice"><p><b>Yeni anahtar (yalnızca şimdi görünür):</b></p><p><code style="user-select:all;word-break:break-all">' . e($yeni) . '</code></p><p>Kopyalayıp yalnızca haftalık güncelleme görevinin istemine yapıştırın. Sohbete yazmayın; kaybolursa yenisini oluşturun.</p></div>' : '';
sayfa('API anahtarı', '
  <div class="page-head"><div class="eyebrow"><a href="./">Eğitim</a> › API anahtarı</div><h1>Haftalık güncelleme anahtarı</h1>
  <p class="lede">Haftalık güncelleme görevi rehber, makale, etkinlik ve meta dosyalarını bu anahtarla <code>/admin/guncelle.php</code> adresine gönderir; değişiklik hemen sitede görünür.</p></div>
  ' . ($msg ? '<p class="giris-hata" role="alert">' . e($msg) . '</p>' : '') . $kutu . '
  <p>' . $durum . '</p>
  <form method="post"><input type="hidden" name="t" value="' . e(csrf()) . '"><button>' . (is_array($var) ? 'Yeni anahtar oluştur' : 'Anahtar oluştur') . '</button></form>');
