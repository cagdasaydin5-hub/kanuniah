<?php
// Haftalık güncelleme API'sinin ortak işlevleri. Doğrudan açılmaz.
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'ortak-api.php') { http_response_code(403); exit; }
date_default_timezone_set('Europe/Istanbul');

const API_KOK = __DIR__ . '/..';                     // site kökü (public_html)
const API_ANAHTAR = __DIR__ . '/.htanahtar.php';      // anahtarın özeti; yalnızca sunucuda, depoda yok
const API_YEDEK = __DIR__ . '/.yedek';                // eski sürümler
const API_KAYIT = __DIR__ . '/.yedek/kayit.log';      // her istek tek satır
const API_KILIT = __DIR__ . '/.yedek/hatali.json';    // yanlış anahtar sayacı
const API_DOSYALAR = ['rehberler', 'makaleler', 'etkinlikler', 'meta'];
const API_SAYFA = ['rehberler' => ['rehberler.html', 'mevzuat.html'], 'makaleler' => ['haftanin-makaleleri.html', 'makaleler.html'],
                   'etkinlikler' => ['takvim.html'], 'meta' => ['']];
const API_SINIR = 5 * 1024 * 1024;                    // istek gövdesi en çok 5 MB
const API_YEDEK_SAYI = 30;                            // dosya başına saklanan eski sürüm

function api_hazirla() {
    if (!is_dir(API_YEDEK)) @mkdir(API_YEDEK, 0755, true);
    $h = API_YEDEK . '/.htaccess';
    if (!is_file($h)) @file_put_contents($h, "Require all denied\n");
}

function api_kayit($satir) {
    api_hazirla();
    $ip = $_SERVER['REMOTE_ADDR'] ?? '-';
    @file_put_contents(API_KAYIT, date('Y-m-d H:i:s') . " $ip $satir\n", FILE_APPEND | LOCK_EX);
}

function api_anahtar_ozeti() {
    if (!is_file(API_ANAHTAR)) return null;
    $d = require API_ANAHTAR;
    return is_array($d) && !empty($d['ozet']) ? $d['ozet'] : null;
}

// Yeni anahtar üretir, yalnızca özetini (sha256) yazar, düz anahtarı bir kez döndürür.
function api_anahtar_uret() {
    $anahtar = 'kah_' . bin2hex(random_bytes(24));
    $icerik = "<?php\n// Haftalık güncelleme API anahtarının özeti. Düz anahtar burada tutulmaz.\nreturn " .
        var_export(['ozet' => hash('sha256', $anahtar), 'olusturma' => date('Y-m-d H:i:s')], true) . ";\n";
    if (@file_put_contents(API_ANAHTAR, $icerik, LOCK_EX) === false) return null;
    @chmod(API_ANAHTAR, 0600);
    return $anahtar;
}

function api_gelen_anahtar() {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if ($h === '' && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) if (strcasecmp($k, 'Authorization') === 0) $h = $v;
    }
    if (preg_match('/^Bearer\s+(\S+)$/i', $h, $m)) return $m[1];
    return $_SERVER['HTTP_X_ANAHTAR'] ?? '';   // bazı sunucular Authorization başlığını düşürür
}

// Yanlış anahtar: aynı IP'den saatte 10 denemeden sonra o IP 1 saat kilitli (başka IP'leri etkilemez).
function api_hatali_oku() {
    $d = is_file(API_KILIT) ? json_decode((string)@file_get_contents(API_KILIT), true) : [];
    $out = [];
    foreach ((is_array($d) ? $d : []) as $ip => $ts) {
        $ts = array_values(array_filter((array)$ts, function ($t) { return $t > time() - 3600; }));
        if ($ts) $out[$ip] = $ts;
    }
    return $out;
}
function api_kilitli() {
    $d = api_hatali_oku();
    return count($d[$_SERVER['REMOTE_ADDR'] ?? '-'] ?? []) >= 10;
}
function api_hatali_say() {
    api_hazirla();
    $d = api_hatali_oku();
    $d[$_SERVER['REMOTE_ADDR'] ?? '-'][] = time();
    @file_put_contents(API_KILIT, json_encode($d), LOCK_EX);
}

function api_yanit($kod, $veri) {
    http_response_code($kod);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex, nofollow');
    echo json_encode($veri, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT), "\n";
    exit;
}

// ---- Denetim: tools/validate.py'deki kuralların bu dört dosyaya düşen kısmı ----
function tarih_mi($x) { return is_string($x) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $x) && checkdate((int)substr($x, 5, 2), (int)substr($x, 8, 2), (int)substr($x, 0, 4)); }
function https_mi($x) { return is_string($x) && strncmp($x, 'https://', 8) === 0; }
function liste_mi($x) { return is_array($x) && ($x === [] || array_keys($x) === range(0, count($x) - 1)); }

function api_denetle($D) {
    $h = [];
    $R = $D['rehberler']; $M = $D['makaleler']; $E = $D['etkinlikler']; $T = $D['meta'];
    // rehberler
    if (!is_array($R) || !liste_mi($R['categories'] ?? null) || !liste_mi($R['guides'] ?? null)) $h[] = "rehberler: 'categories' ve 'guides' listeleri gerekli";
    else {
        $cats = array_column($R['categories'], 'id'); $ids = [];
        foreach ($R['guides'] as $g) {
            $i = $g['id'] ?? '?';
            foreach (['id','cat','kind','scope','status','aud','title','org','summary','url'] as $k) if (!array_key_exists($k, $g)) $h[] = "rehber $i: '$k' eksik";
            if (isset($ids[$i])) $h[] = "rehber id tekrarı: $i"; $ids[$i] = 1;
            if (!in_array($g['cat'] ?? null, $cats, true)) $h[] = "rehber $i: bilinmeyen kategori " . json_encode($g['cat'] ?? null);
            if (!empty($g['pub']) && !tarih_mi($g['pub'])) $h[] = "rehber $i: pub tarihi YYYY-AA-GG olmalı";
            if (!https_mi($g['url'] ?? '')) $h[] = "rehber $i: url https olmalı";
            if (!in_array($g['status'] ?? null, ['guncel', 'arsiv'], true)) $h[] = "rehber $i: status guncel|arsiv";
        }
    }
    $gids = is_array($R['guides'] ?? null) ? array_flip(array_column($R['guides'], 'id')) : [];
    // makaleler
    if (!is_array($M) || !liste_mi($M['issues'] ?? null)) $h[] = "makaleler: 'issues' listesi gerekli";
    else foreach ($M['issues'] as $iss) {
        if (!liste_mi($iss['items'] ?? null)) { $h[] = 'makaleler: sayı ' . ($iss['id'] ?? '?') . " 'items' listesi gerekli"; continue; }
        foreach ($iss['items'] as $p) {
            $i = $p['id'] ?? '?';
            foreach (['id','pmid','journal','date','title','title_en','design','score','effect','what','practice'] as $k) if (!array_key_exists($k, $p)) $h[] = "makale $i: '$k' eksik";
            $s = $p['score'] ?? [];
            foreach (['kanit' => [1, 3], 'poem' => [0, 1], 'bb' => [0, 2], 'etki' => [0, 2]] as $k => $ab)
                if (!is_int($s[$k] ?? null) || $s[$k] < $ab[0] || $s[$k] > $ab[1]) $h[] = "makale $i: puan $k {$ab[0]}-{$ab[1]} arası olmalı";
            foreach (($p['rel'] ?? []) as $r) if (!isset($gids[$r])) $h[] = "makale $i: ilgili rehber bulunamadı: $r";
        }
    }
    // etkinlikler
    if (!is_array($E) || !liste_mi($E['etkinlikler'] ?? null) || !liste_mi($E['duzeyler'] ?? null)) $h[] = "etkinlikler: 'etkinlikler' ve 'duzeyler' listeleri gerekli";
    else {
        $dz = array_column($E['duzeyler'], 'id'); $ids = [];
        foreach ($E['etkinlikler'] as $e) {
            $i = $e['id'] ?? '';
            if ($i === '' || isset($ids[$i])) $h[] = "etkinlik id eksik ya da tekrar: $i"; $ids[$i] = 1;
            foreach (['ad','tur','duzey','kapsam','dogrulama'] as $k) if (empty($e[$k])) $h[] = "etkinlik $i: '$k' eksik";
            if (!in_array($e['duzey'] ?? null, $dz, true)) $h[] = "etkinlik $i: duzey tanımsız";
            if (!in_array($e['tur'] ?? null, ['kongre','sempozyum','kurs','okul','arastirma','webinar'], true)) $h[] = "etkinlik $i: tur geçersiz";
            if (!in_array($e['kapsam'] ?? null, ['bolgesel','ulusal','uluslararasi'], true)) $h[] = "etkinlik $i: kapsam geçersiz";
            $b = $e['baslangic'] ?? null; $s = $e['bitis'] ?? null;
            if ($b === null && empty($e['yil'])) $h[] = "etkinlik $i: baslangic ya da yil gerekli";
            foreach (array_merge([$b, $s, $e['dogrulama'] ?? null], array_values((array)($e['tarihler'] ?? []))) as $x)
                if ($x !== null && !tarih_mi($x)) $h[] = "etkinlik $i: tarih YYYY-AA-GG olmalı (" . json_encode($x) . ")";
            if ($b && $s && $s < $b) $h[] = "etkinlik $i: bitis başlangıçtan önce";
            $u = $e['url'] ?? null;
            if ($u !== null && !https_mi($u)) $h[] = "etkinlik $i: url https olmalı";
            if (!$u && empty($e['kaynak'])) $h[] = "etkinlik $i: url ya da kaynak gerekli";
        }
    }
    // meta
    if (!is_array($T) || !tarih_mi($T['checked'] ?? null)) $h[] = 'meta.checked tarihi hatalı';
    foreach ((array)($T['log'] ?? []) as $x) {
        if (!tarih_mi($x['date'] ?? null)) $h[] = 'meta.log tarihi hatalı: ' . json_encode($x['date'] ?? null);
        foreach ((array)($x['items'] ?? []) as $it) if (empty($it['ad']) || !is_int($it['n'] ?? null)) $h[] = 'meta.log kalemi hatalı: ' . json_encode($it, JSON_UNESCAPED_UNICODE);
        if (empty($x['items']) && empty($x['text'])) $h[] = 'meta.log kaydı boş: ' . json_encode($x['date'] ?? null);
    }
    return array_slice(array_values(array_unique($h)), 0, 50);
}

function api_oku($ad) {
    $p = API_KOK . "/data/$ad.json";
    return is_file($p) ? json_decode((string)file_get_contents($p), true) : null;
}

// Önce yedek, sonra geçici dosya + rename (yarım dosya hiç sunulmaz).
function api_yaz($ad, $veri, $damga) {
    api_hazirla();
    $p = API_KOK . "/data/$ad.json";
    if (is_file($p)) {
        @copy($p, API_YEDEK . "/$damga-$ad.json");
        $eski = glob(API_YEDEK . "/*-$ad.json"); sort($eski);
        foreach (array_slice($eski, 0, max(0, count($eski) - API_YEDEK_SAYI)) as $f) @unlink($f);
    }
    $metin = json_encode($veri, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT) . "\n";
    $tmp = $p . '.yeni';
    if (@file_put_contents($tmp, $metin, LOCK_EX) === false || !@rename($tmp, $p)) { @unlink($tmp); return false; }
    return hash('sha256', $metin);
}

// sitemap.xml'de değişen sayfaların lastmod'unu meta.checked'e çeker.
function api_sitemap($sayfalar, $tarih) {
    $p = API_KOK . '/sitemap.xml';
    if (!is_file($p) || !tarih_mi($tarih)) return 0;
    $x = (string)file_get_contents($p); $n = 0;
    foreach (array_unique($sayfalar) as $s) {
        $loc = preg_quote('https://kanuniah.tr/' . $s, '#');
        $x = preg_replace("#(<loc>$loc</loc><lastmod>)\d{4}-\d{2}-\d{2}(</lastmod>)#", '${1}' . $tarih . '${2}', $x, 1, $c); $n += $c;
    }
    if ($n) @file_put_contents($p . '.yeni', $x, LOCK_EX) !== false && @rename($p . '.yeni', $p);
    return $n;
}
