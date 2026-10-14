<?php
// Tek kullanımlık kurulum. 1. adım: asistan hesabı (.htsifre.php). 2. adım: yönetici hesabı (.htyonetici.php).
// 2. adım yalnızca giriş yapılmışken açılır; yönetici hesabı oluşunca sayfa kendini kilitler.
require __DIR__ . '/ortak.php';
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');

if (!is_file(ASISTAN_CFG)) { $hedef = ASISTAN_CFG; $ne = 'asistan'; }
elseif (!is_file(YONETICI_CFG)) {
    if (!rol()) { header('Location: ./'); exit; }
    $hedef = YONETICI_CFG; $ne = 'yönetici';
} else { http_response_code(403); exit('Kurulum tamamlandı.'); }

$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $k = trim($_POST['k'] ?? ''); $s = $_POST['s'] ?? ''; $s2 = $_POST['s2'] ?? '';
    $asistan = hesap_oku(ASISTAN_CFG);
    if ($k === '' || strlen($s) < 8) $msg = 'Kullanıcı adı boş olamaz, şifre en az 8 karakter olmalı.';
    elseif ($s !== $s2) $msg = 'Şifreler aynı değil.';
    elseif ($hedef === YONETICI_CFG && strcasecmp($asistan['kullanici'], $k) === 0) $msg = 'Yönetici kullanıcı adı asistan hesabından farklı olmalı.';
    elseif (!hesap_yaz($hedef, $k, $s)) $msg = 'Dosya yazılamadı.';
    else {
        if ($hedef === YONETICI_CFG) { session_regenerate_id(true); $_SESSION['ok'] = 1; $_SESSION['rol'] = 'yonetici'; }
        header('Location: ./'); exit;
    }
}
?><!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Kurulum</title>
<style>body{font:16px system-ui,sans-serif;max-width:360px;margin:48px auto;padding:0 16px}label{display:block;margin:12px 0 4px;font-weight:600}input{width:100%;padding:9px;box-sizing:border-box}button{margin-top:16px;padding:10px 16px}p.e{color:#8a1c10;font-weight:600}</style></head><body>
<h1>Eğitim girişi kurulumu</h1><p><b><?= e(ucfirst($ne)) ?> hesabı</b> için kullanıcı adı ve şifre belirleyin. Bu adım bir kez yapılabilir.</p>
<?php if ($msg) echo '<p class="e">' . e($msg) . '</p>'; ?>
<form method="post"><label>Kullanıcı adı<input name="k" required></label><label>Şifre (en az 8 karakter)<input name="s" type="password" required></label><label>Şifre (tekrar)<input name="s2" type="password" required></label><button>Kaydet</button></form></body></html>
