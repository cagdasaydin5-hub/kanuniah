<?php
// Haftalık güncelleme görevinin veri dosyalarını doğrudan siteye yazdığı uç nokta.
//   GET  /admin/guncelle.php            → anahtarla: dosyaların tarihi ve özetleri (durum)
//   POST /admin/guncelle.php            → anahtarla: {"dosyalar": {"makaleler": {...}, "meta": {...}}, "not": "...", "deneme": false}
// Yalnızca data/rehberler.json, makaleler.json, etkinlikler.json, meta.json yazılabilir.
// Gönderilmeyen dosyalar sunucudaki hâliyle denetlenir (makale → rehber bağlantıları gibi).
// "deneme": true → yalnızca denetler, hiçbir şey yazmaz.
require __DIR__ . '/ortak-api.php';

if (api_kilitli()) api_yanit(429, ['tamam' => false, 'hata' => 'Çok fazla yanlış anahtar denemesi; bir saat sonra tekrar deneyin.']);
$ozet = api_anahtar_ozeti();
if (!$ozet) api_yanit(503, ['tamam' => false, 'hata' => 'Anahtar henüz oluşturulmadı (Eğitim › API anahtarı).']);
$gelen = api_gelen_anahtar();
if ($gelen === '' || !hash_equals($ozet, hash('sha256', $gelen))) {
    api_hatali_say(); api_kayit('RED yanlis-anahtar'); usleep(800000);
    api_yanit(401, ['tamam' => false, 'hata' => 'Anahtar geçersiz.']);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $d = [];
    foreach (API_DOSYALAR as $ad) {
        $p = API_KOK . "/data/$ad.json";
        $d[$ad] = is_file($p) ? ['boyut' => filesize($p), 'sha256' => hash_file('sha256', $p), 'degisme' => date('Y-m-d H:i:s', filemtime($p))] : null;
    }
    $m = api_oku('meta');
    api_yanit(200, ['tamam' => true, 'checked' => $m['checked'] ?? null, 'dosyalar' => $d]);
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') api_yanit(405, ['tamam' => false, 'hata' => 'Yalnızca GET ya da POST.']);

$govde = file_get_contents('php://input', false, null, 0, API_SINIR + 1);
if ($govde === false || strlen($govde) > API_SINIR) api_yanit(413, ['tamam' => false, 'hata' => 'Gövde 5 MB sınırını aşıyor.']);
$istek = json_decode($govde, true);
if (!is_array($istek) || !is_array($istek['dosyalar'] ?? null) || !$istek['dosyalar']) api_yanit(400, ['tamam' => false, 'hata' => "Gövde {\"dosyalar\": {...}} biçiminde JSON olmalı."]);
$bilinmeyen = array_diff(array_keys($istek['dosyalar']), API_DOSYALAR);
if ($bilinmeyen) api_yanit(400, ['tamam' => false, 'hata' => 'Yazılamayan dosya: ' . implode(', ', $bilinmeyen) . '. İzinli: ' . implode(', ', API_DOSYALAR)]);

$hepsi = [];
foreach (API_DOSYALAR as $ad) $hepsi[$ad] = array_key_exists($ad, $istek['dosyalar']) ? $istek['dosyalar'][$ad] : api_oku($ad);
$hatalar = api_denetle($hepsi);
if ($hatalar) { api_kayit('RED denetim ' . count($hatalar)); api_yanit(422, ['tamam' => false, 'hata' => 'Denetim geçmedi; hiçbir dosya yazılmadı.', 'hatalar' => $hatalar]); }
if (!empty($istek['deneme'])) api_yanit(200, ['tamam' => true, 'deneme' => true, 'mesaj' => 'Denetim geçti; deneme olduğu için yazılmadı.']);

$damga = date('Ymd-His'); $yazilan = []; $sayfalar = [];
foreach ($istek['dosyalar'] as $ad => $veri) {
    $sha = api_yaz($ad, $veri, $damga);
    if ($sha === false) { api_kayit("HATA yazilamadi $ad"); api_yanit(500, ['tamam' => false, 'hata' => "$ad.json yazılamadı.", 'yazilan' => $yazilan]); }
    $yazilan[$ad] = $sha;
    $sayfalar = array_merge($sayfalar, API_SAYFA[$ad]);
}
$sm = api_sitemap($sayfalar, $hepsi['meta']['checked'] ?? '');
$not = mb_substr(preg_replace('/\s+/u', ' ', (string)($istek['not'] ?? '')), 0, 120);
api_kayit('YAZILDI ' . implode(',', array_keys($yazilan)) . ($not !== '' ? " | $not" : ''));
api_yanit(200, ['tamam' => true, 'yazilan' => $yazilan, 'sitemap_guncellenen' => $sm, 'yedek' => $damga]);
