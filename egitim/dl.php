<?php
// Giriş yapmış kullanıcıya egitim/dosyalar/ içindeki dosyayı verir: dl.php?d=dosya-adi.pdf
session_set_cookie_params(['path' => '/egitim/', 'httponly' => true, 'secure' => !empty($_SERVER['HTTPS']), 'samesite' => 'Lax']);
session_start();
header('X-Robots-Tag: noindex, nofollow');
if (empty($_SESSION['ok'])) { http_response_code(403); exit('Giriş gerekli.'); }
$f = basename($_GET['d'] ?? '');
$p = __DIR__ . '/dosyalar/' . $f;
if ($f === '' || $f[0] === '.' || !is_file($p)) { http_response_code(404); exit('Dosya bulunamadı.'); }
header('Content-Type: ' . (mime_content_type($p) ?: 'application/octet-stream'));
header('Content-Disposition: inline; filename="' . rawurlencode($f) . '"');
header('Content-Length: ' . filesize($p));
header('Cache-Control: private, no-store');
readfile($p);
