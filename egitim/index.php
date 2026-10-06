<?php
session_set_cookie_params(['path' => '/egitim/', 'httponly' => true, 'secure' => !empty($_SERVER['HTTPS']), 'samesite' => 'Lax']);
session_start();
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('Content-Type: text/html; charset=utf-8');

$cfg = __DIR__ . '/.htsifre.php';
if (!is_file($cfg)) { header('Location: kurulum.php'); exit; }

if (isset($_GET['cikis'])) {
    $_SESSION = [];
    session_destroy();
    header('Location: ../');
    exit;
}

$hata = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $c = require $cfg;
    $k = trim($_POST['k'] ?? '');
    $s = $_POST['s'] ?? '';
    if (strcasecmp($c['kullanici'], $k) === 0 && password_verify($s, $c['hash'])) {
        session_regenerate_id(true);
        $_SESSION['ok'] = 1;
        header('Location: ./');
        exit;
    }
    sleep(1);
    $hata = 'Kullanıcı adı veya şifre hatalı.';
}

if (!empty($_SESSION['ok'])) { readfile(__DIR__ . '/icerik.html'); exit; }

$h = file_get_contents(__DIR__ . '/giris.html');
$kutu = $hata ? '<p class="giris-hata" role="alert">' . htmlspecialchars($hata) . '</p>' : '';
echo str_replace('<!--HATA-->', $kutu, $h);
