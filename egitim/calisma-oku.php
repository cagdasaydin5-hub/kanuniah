<?php
// Çalışma listesi Excel'ini (.xlsx) okur: üst satırda birimler, A sütununda tarih, hücrelerde "AD SOYAD-AD SOYAD".
// Tarihsiz yazı satırları not olarak alınır. Yalnızca calisma.php tarafından kullanılır (.htaccess ile kapalı).
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'calisma-oku.php') { http_response_code(403); exit; }
require_once __DIR__ . '/akademik-oku.php';

const CL_KISALT = ['ASM', 'YAŞAM', 'GETAT', 'ESH', 'KETEM', 'SMA'];

// Birim adı: "İNÖNÜ ASM -1" → "İnönü ASM-1", "YAŞAM POL" → "YAŞAM Pol."
function birim_ad($s) {
    $s = ak_bosluk(preg_replace('/\s*-\s*(\d+)$/u', '-$1', ak_bosluk($s)));
    $w = [];
    foreach (explode(' ', $s) as $x) {
        $u = tr_ust($x);
        if (in_array(preg_replace('/-\d+$/', '', $u), CL_KISALT, true)) $w[] = $u;
        elseif ($u === 'POL' || $u === 'POL.') $w[] = 'Pol.';
        else $w[] = tr_bas($x);
    }
    $s = implode(' ', $w);
    return mb_strtoupper(mb_substr($s, 0, 1)) . mb_substr($s, 1);
}

function calisma_oku($dosya) {
    $rows = xlsx_satirlar($dosya);
    $bas = null;
    foreach ($rows as $i => $r) {
        if (ak_tarih($r[0] ?? null)) continue;
        $dolu = 0;
        foreach ($r as $j => $h) if ($j > 0 && ak_bosluk($h['v']) !== '') $dolu++;
        if ($dolu >= 3) { $bas = $i; break; }
    }
    if ($bas === null) throw new RuntimeException('Birim adlarının olduğu başlık satırı bulunamadı.');
    $birim = []; $say = [];
    foreach ($rows[$bas] as $j => $h) {
        if ($j === 0 || ak_bosluk($h['v']) === '') continue;
        $ad = birim_ad($h['v']);
        $say[$ad] = ($say[$ad] ?? 0) + 1;
        $birim[$j] = $ad;
    }
    // Aynı adlı birimleri sırayla numarala (Evde Sağlık Ekip Sorumlusu 1, 2, …)
    $sira = [];
    foreach ($birim as $j => $ad) if ($say[$ad] > 1) { $sira[$ad] = ($sira[$ad] ?? 0) + 1; $birim[$j] = $ad . ' ' . $sira[$ad]; }

    $gunler = []; $not = [];
    foreach (array_slice($rows, $bas + 1) as $r) {
        $t = ak_tarih($r[0] ?? null);
        if (!$t) {
            foreach ($r as $h) { $v = ak_bosluk($h['v']); if ($v !== '' && !is_numeric($v) && !in_array($v, $not, true)) $not[] = $v; }
            continue;
        }
        $g = [];
        foreach ($birim as $j => $ad) {
            if (!isset($r[$j])) continue;
            $adlar = [];
            foreach (preg_split('/\s*[-–+,;\/]\s*|\R/u', $r[$j]['v']) as $p) {
                $p = ak_bosluk($p);
                if ($p !== '' && !in_array($p, $adlar, true)) $adlar[] = $p;
            }
            if ($adlar) $g[$ad] = $adlar;
        }
        $gunler[$t] = $g;
    }
    if (!$gunler) throw new RuntimeException('Tarihli satır bulunamadı.');
    ksort($gunler);
    $tar = array_keys($gunler);
    return ['birimler' => array_values($birim), 'gunler' => $gunler,
            'notlar' => $not ? [['bas' => $tar[0], 'son' => end($tar), 'metin' => implode(' ', $not)]] : []];
}

// Yeni yüklemeyi eskisiyle birleştir: yeni dosyanın tarihleri eskisinin yerine geçer.
function calisma_birlestir($eski, $yeni) {
    if (!$eski) return $yeni;
    $gun = array_merge($eski['gunler'], $yeni['gunler']);
    ksort($gun);
    $birim = $yeni['birimler'];
    foreach ($eski['birimler'] as $b) if (!in_array($b, $birim, true)) $birim[] = $b;
    $notlar = array_values(array_filter($eski['notlar'] ?? [], function ($n) use ($yeni) {
        return $n['son'] < array_key_first($yeni['gunler']) || $n['bas'] > array_key_last($yeni['gunler']);
    }));
    return ['birimler' => $birim, 'gunler' => $gun, 'notlar' => array_merge($notlar, $yeni['notlar'])];
}

// ---------- adları akademik programdaki yazımla eşleştir ----------
function ad_kat($s) {
    return ak_bosluk(strtr(kisi_anahtar($s), ['ç' => 'c', 'ğ' => 'g', 'ı' => 'i', 'ö' => 'o', 'ş' => 's', 'ü' => 'u', 'â' => 'a', 'î' => 'i', 'û' => 'u', "\u{0307}" => '']));
}
// Eşleşme yoksa: tümü büyük harfse ilk ad (baş harfse bir sonraki de) ad, kalanı soyad.
function cl_ad_bicim($s) {
    $s = ak_bosluk(preg_replace('/\.(?=\S)/u', '. ', $s));
    if ($s !== tr_ust($s)) return ad_bicim([$s]);
    $w = explode(' ', $s);
    $n = (count($w) > 2 && preg_match('/^\p{L}\.?$/u', $w[0])) ? 2 : 1;
    if (count($w) <= $n) return ad_bicim([$s]);
    $out = [];
    foreach ($w as $i => $x) $out[] = $i < $n ? (preg_match('/^\p{L}\.?$/u', $x) ? tr_ust(rtrim($x, '.')) . '.' : tr_bas($x)) : tr_ust($x);
    return implode(' ', $out);
}
function cl_ad_eslestir($bilinen) {
    $harita = [];
    foreach ($bilinen as $a) $harita[ad_kat($a)] = $a;
    return function ($ad) use ($harita) {
        $k = ad_kat($ad);
        if (isset($harita[$k])) return $harita[$k];
        $tk = explode(' ', $k);
        $aday = [];
        if (count($tk) >= 2) foreach ($harita as $hk => $hv) {
            $th = explode(' ', $hk);
            if (count($th) < count($tk)) continue;
            $uy = true;
            foreach ($tk as $i => $x) if (!($x === $th[$i] || (mb_strlen($x) === 1 && mb_substr($th[$i], 0, 1) === $x))) { $uy = false; break; }
            if ($uy) $aday[] = $hv;
        }
        return count($aday) === 1 ? $aday[0] : cl_ad_bicim($ad);
    };
}
