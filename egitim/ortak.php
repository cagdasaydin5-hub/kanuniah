<?php
// Eğitim bölümü ortak işlevleri: oturum, roller, güvenli yol, sayfa çerçevesi.
// Hesaplar yalnızca sunucuda durur (depoda yok):
//   .htsifre.php    → asistan hesabı (görüntüle/indir)
//   .htyonetici.php → yönetici hesabı (hocalar + site sahibi: yükle, klasör, adlandır, taşı, sil)
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'ortak.php') { http_response_code(403); exit; }

date_default_timezone_set('Europe/Istanbul');
session_set_cookie_params(['path' => '/egitim/', 'httponly' => true, 'secure' => !empty($_SERVER['HTTPS']), 'samesite' => 'Lax']);
session_start();
header('X-Robots-Tag: noindex, nofollow');
header('X-Content-Type-Options: nosniff');

const ASISTAN_CFG = __DIR__ . '/.htsifre.php';
const YONETICI_CFG = __DIR__ . '/.htyonetici.php';
const ARSIV = __DIR__ . '/arsiv';
const COP = ARSIV . '/.cop';
const IZINLI = ['pdf','doc','docx','ppt','pptx','pps','ppsx','xls','xlsx','odt','odp','ods','rtf','txt','csv',
                'jpg','jpeg','png','gif','webp','mp4','m4v','webm','mp3','m4a','zip'];
const TARAYICIDA = ['pdf','jpg','jpeg','png','gif','webp','mp4','m4v','webm','mp3','m4a','txt'];

function rol() {
    if (empty($_SESSION['ok'])) return null;
    return ($_SESSION['rol'] ?? 'asistan') === 'yonetici' ? 'yonetici' : 'asistan';
}

function giris_sart($yonetici = false) {
    $r = rol();
    if (!$r) { header('Location: ./'); exit; }
    if ($yonetici && $r !== 'yonetici') { http_response_code(403); exit('Bu sayfa yalnızca yönetici hesabına açıktır.'); }
}

function arsiv_hazirla() {
    foreach ([ARSIV, COP] as $d) if (!is_dir($d)) @mkdir($d, 0755, true);
    $h = ARSIV . '/.htaccess';
    if (!is_file($h)) @file_put_contents($h, "Require all denied\n");
}

function csrf() {
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
    return $_SESSION['csrf'];
}
function csrf_dogrula() {
    if (!hash_equals($_SESSION['csrf'] ?? '', $_POST['t'] ?? '')) { http_response_code(400); exit('Oturum süresi doldu; sayfayı yenileyin.'); }
}

function e($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

// Klasör/dosya adı: harf (Türkçe dahil), rakam, boşluk ve . - _ ( ) , ; noktayla başlayamaz.
function ad_temizle($ad) {
    $ad = trim(preg_replace('/\s+/u', ' ', (string)$ad));
    if ($ad === '' || mb_strlen($ad) > 120) return null;
    if (!preg_match('/^[\p{L}\p{N} ._\-(),;]+$/u', $ad)) return null;
    if ($ad[0] === '.' || $ad === '..' || substr($ad, -1) === '.') return null;
    return $ad;
}
function uzanti($ad) { return strtolower(pathinfo($ad, PATHINFO_EXTENSION)); }
function izinli_dosya($ad) { return in_array(uzanti($ad), IZINLI, true); }

// "a/b/c" biçimindeki göreli yolu doğrular; geçersizse null. Boş dize = arşiv kökü.
function yol_temizle($yol) {
    $yol = trim(str_replace('\\', '/', (string)$yol), '/');
    if ($yol === '') return '';
    $parca = [];
    foreach (explode('/', $yol) as $p) {
        $p = ad_temizle($p);
        if ($p === null) return null;
        $parca[] = $p;
    }
    return implode('/', $parca);
}
function tam_yol($rel) { return ARSIV . ($rel === '' ? '' : '/' . $rel); }

function boyut($b) {
    if ($b < 1024) return $b . ' B';
    if ($b < 1048576) return round($b / 1024) . ' KB';
    return number_format($b / 1048576, 1, ',', '.') . ' MB';
}
function tarih($ts) {
    $ay = ['', 'Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
    $gun = ['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
    return date('j', $ts) . ' ' . $ay[(int)date('n', $ts)] . ' ' . date('Y', $ts) . ' ' . $gun[(int)date('w', $ts)];
}

// Klasör içeriği: önce klasörler, sonra dosyalar; Türkçe sıralama. Nokta ile başlayanlar gizli.
function listele($rel) {
    $d = tam_yol($rel);
    $k = []; $f = [];
    foreach (@scandir($d) ?: [] as $ad) {
        if ($ad[0] === '.') continue;
        $p = "$d/$ad";
        if (is_dir($p)) $k[] = $ad; elseif (is_file($p)) $f[] = $ad;
    }
    $sirala = class_exists('Collator') ? [new Collator('tr_TR'), 'compare'] : 'strnatcasecmp';
    usort($k, $sirala); usort($f, $sirala);
    return [$k, $f];
}

function klasor_agaci($rel = '', &$out = []) {
    $out[] = $rel;
    [$k] = listele($rel);
    foreach ($k as $ad) klasor_agaci($rel === '' ? $ad : "$rel/$ad", $out);
    return $out;
}

function kirinti($rel, $sayfa) {
    $h = '<a href="' . $sayfa . '">Dosyalar</a>';
    $acc = '';
    foreach ($rel === '' ? [] : explode('/', $rel) as $p) {
        $acc = $acc === '' ? $p : "$acc/$p";
        $h .= ' › <a href="' . $sayfa . '?y=' . rawurlencode($acc) . '">' . e($p) . '</a>';
    }
    return $h;
}

function sayfa($baslik, $icerik) {
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    $h = file_get_contents(__DIR__ . '/cerceve.html');
    echo str_replace(['%BASLIK%', '<!--ICERIK-->'], [e($baslik), $icerik], $h);
    exit;
}

function hesap_oku($dosya) { return is_file($dosya) ? (require $dosya) : null; }
function hesap_yaz($dosya, $kullanici, $sifre) {
    $d = ['kullanici' => $kullanici, 'hash' => password_hash($sifre, PASSWORD_DEFAULT)];
    $ok = file_put_contents($dosya, "<?php\nreturn " . var_export($d, true) . ";\n", LOCK_EX) !== false;
    if ($ok) { @chmod($dosya, 0600); if (function_exists('opcache_invalidate')) @opcache_invalidate($dosya, true); }
    return $ok;
}
