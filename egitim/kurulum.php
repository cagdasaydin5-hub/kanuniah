<?php
// Tek kullanımlık: kullanıcı adı ve şifreyi belirler, .htsifre.php dosyasını oluşturur. Sonra kendini kilitler.
header('X-Robots-Tag: noindex, nofollow');
header('Content-Type: text/html; charset=utf-8');
$cfg = __DIR__ . '/.htsifre.php';
if (is_file($cfg)) { http_response_code(403); exit('Kurulum tamamlandı.'); }
$msg = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $k = trim($_POST['k'] ?? ''); $s = $_POST['s'] ?? ''; $s2 = $_POST['s2'] ?? '';
    if ($k === '' || strlen($s) < 8) $msg = 'Kullanıcı adı boş olamaz, şifre en az 8 karakter olmalı.';
    elseif ($s !== $s2) $msg = 'Şifreler aynı değil.';
    else {
        $d = ['kullanici' => $k, 'hash' => password_hash($s, PASSWORD_DEFAULT)];
        if (file_put_contents($cfg, "<?php\nreturn " . var_export($d, true) . ";\n", LOCK_EX) === false) $msg = 'Dosya yazılamadı.';
        else { @chmod($cfg, 0600); header('Location: ./'); exit; }
    }
}
?><!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Kurulum</title>
<style>body{font:16px system-ui,sans-serif;max-width:360px;margin:48px auto;padding:0 16px}label{display:block;margin:12px 0 4px;font-weight:600}input{width:100%;padding:9px;box-sizing:border-box}button{margin-top:16px;padding:10px 16px}p.e{color:#8a1c10;font-weight:600}</style></head><body>
<h1>Eğitim girişi kurulumu</h1><p>Kullanıcı adı ve şifre belirleyin. Bu sayfa bir kez kullanılabilir.</p>
<?php if ($msg) echo '<p class="e">' . htmlspecialchars($msg) . '</p>'; ?>
<form method="post"><label>Kullanıcı adı<input name="k" required></label><label>Şifre (en az 8 karakter)<input name="s" type="password" required></label><label>Şifre (tekrar)<input name="s2" type="password" required></label><button>Kaydet</button></form></body></html>
