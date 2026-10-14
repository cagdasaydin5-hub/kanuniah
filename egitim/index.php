<?php
require __DIR__ . '/ortak.php';
header('Cache-Control: no-store');
header('Content-Type: text/html; charset=utf-8');

if (!is_file(ASISTAN_CFG)) { header('Location: kurulum.php'); exit; }

if (isset($_GET['cikis'])) {
    $_SESSION = [];
    session_destroy();
    header('Location: ../');
    exit;
}

$hata = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $k = trim($_POST['k'] ?? '');
    $s = $_POST['s'] ?? '';
    $rol = null;
    foreach (['yonetici' => YONETICI_CFG, 'asistan' => ASISTAN_CFG] as $r => $dosya) {
        $c = hesap_oku($dosya);
        if ($c && strcasecmp($c['kullanici'], $k) === 0 && password_verify($s, $c['hash'])) { $rol = $r; break; }
    }
    if ($rol) {
        session_regenerate_id(true);
        $_SESSION['ok'] = 1;
        $_SESSION['rol'] = $rol;
        header('Location: ./');
        exit;
    }
    sleep(1);
    $hata = 'Kullanıcı adı veya şifre hatalı.';
}

if (rol()) {
    $k = $_GET['k'] ?? '';
    $f = (preg_match('/^[a-z0-9-]+$/', $k) && is_file(__DIR__ . "/sayfa-$k.html")) ? "sayfa-$k.html" : 'icerik.html';
    $h = file_get_contents(__DIR__ . '/' . $f);
    $yon = rol() === 'yonetici'
        ? '<a class="tile" href="yonetim.php"><b>Dosya yönetimi</b><span>Yükle, klasör aç, yeniden adlandır, taşı, sil · yalnızca yönetici</span></a>'
        : '';
    echo str_replace('<!--YONETIM-->', $yon, $h);
    exit;
}

$h = file_get_contents(__DIR__ . '/giris.html');
$kutu = $hata ? '<p class="giris-hata" role="alert">' . e($hata) . '</p>' : '';
echo str_replace('<!--HATA-->', $kutu, $h);
