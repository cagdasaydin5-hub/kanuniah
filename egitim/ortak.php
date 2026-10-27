<?php
// Eğitim bölümü ortak işlevleri: oturum, roller, güvenli yol, sayfa çerçevesi.
// Hesaplar yalnızca sunucuda durur (depoda yok):
//   .htsifre.php    → asistan hesabı (görüntüle/indir)
//   .htyonetici.php → yönetici hesabı (hocalar + site sahibi: yükle, klasör, adlandır, taşı, sil)
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'ortak.php') { http_response_code(403); exit; }

date_default_timezone_set('Europe/Istanbul');
// basename/pathinfo yerel ayara bağlıdır; "C" yerelinde Ç, İ, Ü gibi baş harfleri yutar. UTF-8 yereli seç.
setlocale(LC_CTYPE, 'C.UTF-8', 'C.utf8', 'en_US.UTF-8', 'tr_TR.UTF-8');
function son_ad($yol) { $yol = rtrim((string)$yol, '/'); $i = strrpos($yol, '/'); return $i === false ? $yol : substr($yol, $i + 1); }
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
function uzanti($ad) { $ad = son_ad($ad); $i = strrpos($ad, '.'); return $i === false ? '' : strtolower(substr($ad, $i + 1)); }
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

// Materyal kütüphanesi ana kategorileri. Kayıtta "kategori" varsa o kullanılır; yoksa konu, eski grup ve başlıktan
// anahtar kelimeyle bulunur (sıra önemli: ilk eşleşen kazanır). Eşleşmeyen "Diğer"e düşer.
const KATEGORILER = ['Aile Hekimliği ve Birinci Basamak', 'Koruyucu Hekimlik', 'İç Hastalıkları', 'Pediatri',
    'Kadın Hastalıkları ve Doğum', 'Geriatri, Evde Sağlık ve Palyatif Bakım', 'Psikiyatri', 'Nöroloji',
    'Cerrahi ve Acil', 'Deri, KBB ve Göz', 'Diğer'];
function kat_katla($s) {
    $s = mb_strtolower(str_replace(['I', 'İ'], ['ı', 'i'], (string)$s), 'UTF-8');
    $s = strtr($s, ['ı' => 'i', 'ş' => 's', 'ğ' => 'g', 'ü' => 'u', 'ö' => 'o', 'ç' => 'c', 'â' => 'a', 'î' => 'i', 'û' => 'u', "\u{307}" => '']);
    return ' ' . trim(preg_replace('/[^a-z0-9]+/', ' ', $s)) . ' ';
}
function kategori_bul($konu, $grup = '', $baslik = '') {
    static $K = [
        'Aile Hekimliği ve Birinci Basamak' => '\b(aile hekim|birinci basamak|wonca|konsultasyon|hekim hasta|iletisim|hasta merkezli|kisi merkezli|biyopsikososyal|etik\b|tibbi hata|kanita dayali|arastirma|istatistik|literatur|makale okuma|surekli bakim|kapsamli bakim|kronik bakim modeli|sevk\b|ekip calismasi|tibbi kayit|soap|icpc|zor hasta|kotu haber)',
        'Koruyucu Hekimlik' => '\b(koruyucu|periyodik|tarama|taramalar|check ?up|izlem|izlemi|izlemleri|asi\b|asilar|asilama|bagisiklama|sigara|tutun|nikotin|obezite|kilo yonetimi|beslenme|diyet|egzersiz|fiziksel aktivite|saglikli yasam|saglik gelistirme|saglik egitimi|risk faktor|kanser tarama|mamografi|smear|kolonoskopi tarama)',
        'Geriatri, Evde Sağlık ve Palyatif Bakım' => '\b(geriatri|yasli|ileri yas|kirilganlik|frailty|polifarmasi|dusme|demans|alzheimer|evde saglik|palyatif|terminal|son donem|basi yara|dekubit|yara bakim|enteral|tup beslenme|bakim veren|agri yonetimi|kanser agri|olum\b|olume)',
        'Pediatri' => '\b(pediatri|cocuk|cocukluk|bebek|yenidogan|neonatal|adolesan|ergen|okul cagi|anne sutu|emzirme|buyume|gelisim|ates nobeti|febril|bronsiolit|krup|otitis media cocuk|infantil|konjenital|kawasaki|rasitizm)',
        'Kadın Hastalıkları ve Doğum' => '\b(gebe|gebelik|dogum|lohusa|postpartum|prenatal|antenatal|preeklampsi|kontrasepsiyon|aile planlamasi|menopoz|menstr|adet\b|amenore|dismenore|polikistik|pkos|vajinit|vajinal|serviks|meme\b|memede|infertil|kadin hastaliklari|jinekoloji|obstetri|ektopik|abortus| ziv |hpv)',
        'Psikiyatri' => '\b(psikiyatri|depresyon|anksiyete|kaygi|panik|bipolar|sizofreni|psikoz|intihar|madde kullan|madde bagim|alkol|bagimlilik|uyku bozuk|insomni|yeme bozuk|dehb|otizm|ruh sagligi|stres\b|tukenmislik|somatizasyon|somatik|obsesif|travma sonrasi|ptsd|antidepresan)',
        'Nöroloji' => '\b(noroloji|basagri|bas agrisi|migren|epilepsi|nobet|inme|serebrovaskuler|parkinson|vertigo|bas donmesi|noropati|multipl skleroz|senkop|periferik sinir|bell\b|tremor)',
        'Cerrahi ve Acil' => '\b(acil|cerrahi|travma|kirik|ortopedi|bel agrisi|boyun agrisi|diz\b|dizde|omuz|kas iskelet|spor yaralan|uroloji|prostat|bph|tas hastaligi|bobrek tasi|hemoroid|fitik|akut karin|apandisit|yanik|zehirlen|resusitasyon|kpr|anafilaksi|sok\b|yara\b|yaralar|sutur|ilk yardim|isirik|cilt kesi|preoperatif|perioperatif|hayvan isirigi)',
        'Deri, KBB ve Göz' => '\b(dermatoloji|deri\b|derisi|cilt|akne|ekzema|egzama|dermatit|psoriazis|sedef|urtiker|kasinti|nevus|mantar|uyuz|kbb|kulak|otit|sinuzit|tonsil|farenjit|burun|epistaksis|isitme|tinnitus|goz\b|gozde|gozun|kirmizi goz|konjonktivit|glokom|katarakt|retinopati|gorme)',
        'İç Hastalıkları' => '\b(dahiliye|ic hastaliklari|hipertansiyon|tansiyon|kan basinci|kardiyo|kalp|koroner|angina|miyokard|aritmi|atriyal|atrial|lipid|dislipidemi|kolesterol|ateroskleroz|diyabet|diabet|insulin|tiroid|hipotiroidi|hipertiroidi|endokrin|adrenal|hipofiz|osteoporoz|vitamin|astim|koah|pnomoni|solunum|oksuruk|tuberkuloz|verem|uyku apne|gastro|reflu|dispepsi|ulser|helikobakter|hepatit|karaciger|siroz|ibs\b|irritabl|inflamatuvar barsak|konstipasyon|diyare|ishal|bobrek|renal|nefro|kby\b|idrar yolu|iye\b|proteinuri|elektrolit|hiponatremi|anemi|demir eksikligi|hematoloji|koagul|antikoagul|varfarin|tromboz|emboli|romatoloji|artrit|gut\b|lupus|fibromiyalji|enfeksiyon|antibiyotik|ates\b|atesli|sepsis|hiv|brusella|kirim kongo|zoonoz|onkoloji|kanser|lenfoma|ilac etkilesim|akilci ilac|laboratuvar|tahlil|hemogram|ekg)',
    ];
    foreach ([$konu, $grup, $baslik] as $s) {
        $s = kat_katla($s);
        if (trim($s) === '') continue;
        foreach ($K as $kat => $re) if (preg_match('/' . $re . '/', $s)) return $kat;
    }
    return 'Diğer';
}
// Kaydın kategorisi: elle verilmişse o, yoksa tahmin.
function kayit_kategori($x) {
    if (!empty($x['kategori']) && in_array($x['kategori'], KATEGORILER, true)) return $x['kategori'];
    if (!empty($x['group']) && in_array($x['group'], KATEGORILER, true)) return $x['group'];
    return kategori_bul($x['topic'] ?? '', $x['group'] ?? '', $x['title'] ?? '');
}
