<?php
// Akademik program Excel'ini (.xlsx) okuyup temizlenmiş program verisine çevirir.
// Yalnızca akademik.php tarafından kullanılır (.htaccess ile doğrudan erişime kapalı).
// Beklenen biçim: bir başlık satırı ("Tarih", "Koordinatör", "Seminer konusu-n", "Makale-n", "Vaka sunumu-n", "Danışman"),
// altında haftada bir satır. Seminer hücresi "Ad SOYAD-Konu" ya da "Konu-Ad SOYAD" olabilir.
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'akademik-oku.php') { http_response_code(403); exit; }

// Kaynak dosyadaki bilinen yazım hataları (yalnızca konu metni; tam eşleşme, büyük/küçük harf duyarsız).
const AK_DUZELT = [
    'kilo atışı/fazlalığı şikayeti ile gelen hastanın yönetimi' => 'Kilo Artışı/Fazlalığı Şikâyeti ile Gelen Hastanın Yönetimi',
    'magnezyum ve çinko minarelleri' => 'Magnezyum ve çinko mineralleri',
    'leimyoma uteri' => 'Leiomyoma uteri',
    'hipotirodi tanı ve tedavisi' => 'Hipotiroidi Tanı ve Tedavisi',
    'diyabetik hastada beslenme ve egersiz tedavisi' => 'Diyabetik Hastada Beslenme ve Egzersiz Tedavisi',
    'getat uygulamarı' => 'GETAT Uygulamaları',
    'hipertansiyon farmokolojik tedavisi' => 'Hipertansiyon Farmakolojik Tedavisi',
    'gebelik 1.trimester yönetim' => 'Gebelik 1. trimester yönetimi',
    'gebelik 2-3.trimester yönetimi' => 'Gebelik 2-3. trimester yönetimi',
    'anaflaksi' => 'Anafilaksi',
    'gut' => 'Gut',
    'tıbbi kayıtların tutulması evde sağlık hizmetleri örneği' => 'Tıbbi Kayıtların Tutulması: Evde Sağlık Hizmetleri Örneği',
    'asistan sınavı' => 'Asistan sınavı',
    'ara' => 'Akut romatizmal ateş',
    'yaşam ölçekler' => 'Sağlıklı Yaş Alma Merkezinde (YAŞAM) kullanılan ölçekler',
    'yaşam ölçekleri' => 'Sağlıklı Yaş Alma Merkezinde (YAŞAM) kullanılan ölçekler',
];
// Aynı kişinin farklı yazılışları (anahtar: küçük harf). Kısaltmalar (M. Emin, Burcu A.) ayrıca kendiliğinden birleşir.
const AK_AYNI_KISI = [
    'saliha altınışık' => 'salihanur altınışık',
];
const AK_UNVAN = '/^(Prof\.?\s*Dr\.?|Do[çc]\.?\s*Dr\.?|Dr\.?\s*Öğr\.?\s*Üyesi|Başasistan\s+Uzm\.?\s*Dr\.?|Uzm\.?\s*Dr\.?|Dr\.)\s*/u';

function tr_alt($s) { return mb_strtolower(str_replace(['İ', 'I'], ['i', 'ı'], $s), 'UTF-8'); }
function tr_ust($s) { return mb_strtoupper(str_replace(['i', 'ı'], ['İ', 'I'], $s), 'UTF-8'); }
function tr_bas($w) { return tr_ust(mb_substr($w, 0, 1)) . tr_alt(mb_substr($w, 1)); }
function ak_bosluk($s) { return trim(preg_replace('/\s+/u', ' ', str_replace("\u{00A0}", ' ', (string)$s))); }

function unvan_duzelt($u) {
    $u = ak_bosluk(preg_replace('/\.(?=\S)/u', '. ', $u));
    return str_replace('Doc.', 'Doç.', $u);
}
// Kişi anahtarı: küçük harf, noktalar boşluk olur, tek boşluk.
function kisi_anahtar($ad) { return ak_bosluk(str_replace('.', ' ', tr_alt(ak_bosluk($ad)))); }

// ---------- xlsx okuma (ZipArchive + SimpleXML; ek kütüphane yok) ----------
function xlsx_satirlar($dosya) {
    if (!class_exists('ZipArchive')) throw new RuntimeException('Sunucuda ZipArchive yok; Excel okunamıyor.');
    $z = new ZipArchive();
    if ($z->open($dosya) !== true) throw new RuntimeException('Dosya açılamadı; .xlsx biçiminde olmalı.');
    $ss = [];
    if (($x = $z->getFromName('xl/sharedStrings.xml')) !== false) {
        $sx = simplexml_load_string($x);
        foreach ($sx->si as $si) {
            $t = '';
            if (isset($si->t)) $t = (string)$si->t;
            foreach ($si->r as $r) $t .= (string)$r->t;
            $ss[] = $t;
        }
    }
    // İlk sayfanın yolunu workbook.xml + ilişkilerden bul
    $yol = 'xl/worksheets/sheet1.xml';
    $wb = $z->getFromName('xl/workbook.xml'); $rels = $z->getFromName('xl/_rels/workbook.xml.rels');
    if ($wb && $rels) {
        $w = simplexml_load_string($wb); $w->registerXPathNamespace('m', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');
        $ilk = $w->xpath('//m:sheets/m:sheet')[0] ?? null;
        if ($ilk) {
            $rid = (string)$ilk->attributes('http://schemas.openxmlformats.org/officeDocument/2006/relationships')['id'];
            foreach (simplexml_load_string($rels)->Relationship as $r) {
                if ((string)$r['Id'] === $rid) { $t = ltrim((string)$r['Target'], '/'); $yol = strpos($t, 'xl/') === 0 ? $t : 'xl/' . $t; }
            }
        }
    }
    $x = $z->getFromName($yol);
    $z->close();
    if ($x === false) throw new RuntimeException('Excel içinde sayfa bulunamadı.');
    $sx = simplexml_load_string($x);
    $satirlar = [];
    foreach ($sx->sheetData->row as $row) {
        $s = [];
        foreach ($row->c as $c) {
            $ref = (string)$c['r'];
            $harf = preg_replace('/\d+/', '', $ref); $i = 0;
            foreach (str_split($harf) as $h) $i = $i * 26 + (ord($h) - 64);
            $tip = (string)$c['t'];
            if ($tip === 's') $v = $ss[(int)$c->v] ?? '';
            elseif ($tip === 'inlineStr') { $v = (string)$c->is->t; foreach ($c->is->r as $r) $v .= (string)$r->t; }
            else $v = isset($c->v) ? (string)$c->v : '';
            $s[$i - 1] = ['v' => $v, 'sayi' => $tip === '' || $tip === 'n'];
        }
        $satirlar[] = $s;
    }
    return $satirlar;
}

function ak_tarih($h) {
    if (!$h) return null;
    $v = trim($h['v']);
    if ($h['sayi'] && is_numeric($v) && $v > 20000 && $v < 80000) {
        return gmdate('Y-m-d', (int)round(((float)$v - 25569) * 86400));
    }
    if (preg_match('/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/', $v, $m)) return sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]);
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $v, $m)) return "$m[1]-$m[2]-$m[3]";
    return null;
}

// ---------- temizleme ----------
function konu_duzelt($k) {
    $k = ak_bosluk($k);
    if (preg_match('/^A\.\s*H\.\s*TEMEL YETERLİLİKLERİ\s*-\s*(\d)\s+(.+)$/u', $k, $m)) {
        return 'AH temel yeterlilikleri ' . $m[1] . ': ' . tr_bas($m[2]);
    }
    $k = preg_replace('/(\p{Ll})(\d+\.)(?=\p{L})/u', '$1 $2 ', $k); // "Yüksekliğinin1.Basamakta" → "Yüksekliğinin 1. Basamakta"
    $k = ak_bosluk($k);
    $a = tr_alt($k);
    return AK_DUZELT[$a] ?? $k;
}

function ad_gibi($s) {
    $w = preg_split('/\s+/u', ak_bosluk($s));
    if (count($w) < 2 || count($w) > 4) return false;
    foreach ($w as $x) if (!preg_match('/^(\p{Lu}\.)?\p{Lu}[\p{L}’\']*\.?$/u', $x) || preg_match('/\p{Lu}\.\p{Lu}\./u', $x)) return false;
    return true;
}

// "Ad-Konu" / "Konu-Ad" / "Unvan Ad- Konu" ayrıştırma. $bilinen: yalnız-ad sütunlarından gelen kişi anahtarları.
function seminer_ayir($s, $bilinen) {
    $s = ak_bosluk($s);
    preg_match_all('/\s*[-+–—]\s*/u', $s, $m, PREG_OFFSET_CAPTURE);
    $kes = [];
    foreach ($m[0] as [$ayr, $poz]) $kes[] = [trim(substr($s, 0, $poz)), trim(substr($s, $poz + strlen($ayr)))];
    $sade = function ($x) { return trim(preg_replace(AK_UNVAN, '', $x)); };
    foreach ($kes as [$sol, $sag]) {
        if ($sol !== '' && preg_match(AK_UNVAN, $sol, $u) && ad_gibi($sade($sol))) return ['ad' => $sade($sol), 'unvan' => unvan_duzelt($u[0]), 'konu' => $sag];
    }
    foreach ($kes as [$sol, $sag]) {
        if (isset($bilinen[kisi_anahtar($sol)])) return ['ad' => $sol, 'konu' => $sag];
        if (isset($bilinen[kisi_anahtar($sag)])) return ['ad' => $sag, 'konu' => $sol];
    }
    foreach ($kes as [$sol, $sag]) if (ad_gibi($sol) && $sag !== '') return ['ad' => $sol, 'konu' => $sag, 'tahmin' => true];
    return ['ad' => '', 'konu' => $s];
}

// Ad yazımı: soyadı BÜYÜK, ad(lar) Baş harf büyük. Kaynaktaki karışık yazımlı biçim (Ad SOYAD) esas alınır.
function ad_bicim($varyantlar) {
    usort($varyantlar, function ($a, $b) {
        $p = function ($v) { $w = explode(' ', $v); $ust = 0; foreach ($w as $x) if (mb_strlen($x) > 1 && $x === tr_ust($x)) $ust++;
            return ($ust > 0 && $ust < count($w) ? 100 : 0) + mb_strlen($v); };
        return $p($b) <=> $p($a);
    });
    $w = explode(' ', ak_bosluk(preg_replace('/\.(?=\S)/u', '. ', $varyantlar[0])));
    $ust = array_map(function ($x) { return mb_strlen($x) > 1 && $x === tr_ust($x); }, $w);
    $karisik = in_array(true, $ust, true) && in_array(false, $ust, true);
    $out = [];
    foreach ($w as $i => $x) {
        $soyad = $karisik ? $ust[$i] : ($i === count($w) - 1);
        $out[] = $soyad ? tr_ust($x) : (preg_match('/^\p{L}\.$/u', $x) ? tr_ust($x) : tr_bas($x));
    }
    return implode(' ', $out);
}

function akademik_oku($dosya) {
    $rows = xlsx_satirlar($dosya);
    $baslik = ''; $bas = null; $kol = [];
    foreach ($rows as $i => $r) {
        $ilk = ak_bosluk($r[0]['v'] ?? '');
        if (tr_alt($ilk) === 'tarih') { $bas = $i; break; }
        if ($baslik === '' && $ilk !== '') $baslik = $ilk;
    }
    if ($bas === null) throw new RuntimeException('"Tarih" başlıklı sütun satırı bulunamadı.');
    foreach ($rows[$bas] as $j => $h) {
        $a = tr_alt(ak_bosluk($h['v']));
        if (strpos($a, 'tarih') === 0) $kol[$j] = 'tarih';
        elseif (strpos($a, 'koordinat') !== false) $kol[$j] = 'koordinator';
        elseif (strpos($a, 'seminer') !== false) $kol[$j] = 'seminer';
        elseif (strpos($a, 'makale') !== false) $kol[$j] = 'makale';
        elseif (strpos($a, 'vaka') !== false || strpos($a, 'olgu') !== false) $kol[$j] = 'olgu';
        elseif (strpos($a, 'danışman') !== false) $kol[$j] = 'danisman';
    }
    $saat = ''; $ara = '';
    $ham = [];
    foreach (array_slice($rows, $bas + 1) as $r) {
        foreach ($r as $h) {
            if (!$saat && preg_match('/Toplantı Saati\s*:?\s*(\d{1,2}[:.]\d{2}\s*-\s*\d{1,2}[:.]\d{2})/u', $h['v'], $m)) $saat = str_replace(' ', '', $m[1]);
            if (!$ara && preg_match('/^\s*Ara\s*:?\s*(\d{1,2}[:.]\d{2}\s*-\s*\d{1,2}[:.]\d{2})/u', $h['v'], $m)) $ara = str_replace(' ', '', $m[1]);
        }
        $t = null; foreach ($kol as $j => $k) if ($k === 'tarih') $t = ak_tarih($r[$j] ?? null);
        if (!$t) continue;
        $sat = ['tarih' => $t, 'koordinator' => '', 'seminer' => [], 'makale' => [], 'olgu' => [], 'danisman' => ''];
        foreach ($kol as $j => $k) {
            if ($k === 'tarih' || !isset($r[$j])) continue;
            foreach (preg_split('/\R/u', $r[$j]['v']) as $p) {
                $p = ak_bosluk($p);
                if ($p === '') continue;
                if (is_array($sat[$k])) { if (!in_array($p, $sat[$k], true)) $sat[$k][] = $p; }
                elseif ($sat[$k] === '') $sat[$k] = $p;
            }
        }
        $ham[] = $sat;
    }
    if (!$ham) throw new RuntimeException('Tarihli satır bulunamadı.');

    // Kişiler: yalnız-ad sütunları bilinen kişi listesini verir
    $bilinen = [];
    foreach ($ham as $s) { foreach (array_merge($s['makale'], $s['olgu'], [$s['danisman']]) as $a) if ($a !== '') $bilinen[kisi_anahtar($a)] = true; }
    $uyari = []; $varyant = []; $unvan = [];
    $haftalar = [];
    foreach ($ham as $s) {
        $sem = []; $gor = [];
        foreach ($s['seminer'] as $c) {
            $x = seminer_ayir($c, $bilinen);
            if ($x['ad'] === '' && preg_match('/[-+]/u', $c)) $uyari[] = "$s[tarih]: sunan kişi ayrılamadı → \"$c\"";
            if (!empty($x['tahmin']) && !isset(AK_AYNI_KISI[kisi_anahtar($x['ad'])])) $uyari[] = "$s[tarih]: \"$x[ad]\" başka sütunda geçmiyor; ad olarak alındı → \"$c\"";
            $konu = konu_duzelt($x['konu']);
            $anahtar = $konu . '|' . kisi_anahtar($x['ad']);
            if (isset($gor[$anahtar])) continue;
            $gor[$anahtar] = 1;
            $sem[] = ['ad' => $x['ad'], 'konu' => $konu];
            if ($x['ad'] !== '' && !empty($x['unvan'])) $unvan[kisi_anahtar($x['ad'])] = $x['unvan'];
        }
        $h = ['tarih' => $s['tarih'], 'seminer' => $sem, 'makale' => $s['makale'], 'olgu' => $s['olgu'], 'danisman' => $s['danisman'], 'koordinator' => $s['koordinator']];
        foreach (array_merge(array_column($sem, 'ad'), $s['makale'], $s['olgu'], [$s['danisman']]) as $a) {
            if ($a === '') continue;
            $varyant[kisi_anahtar($a)][] = ak_bosluk($a);
        }
        $haftalar[] = $h;
    }

    // Aynı kişiyi birleştir: elle tanımlı eşleşmeler + baş harf kısaltmaları (M. Emin GÖKTEPE = Muhammed Emin Göktepe)
    $esle = AK_AYNI_KISI;
    $anahtarlar = array_keys($varyant);
    foreach ($anahtarlar as $a) {
        $ta = explode(' ', $a);
        if (!array_filter($ta, function ($x) { return mb_strlen($x) === 1; })) continue;
        foreach ($anahtarlar as $b) {
            $tb = explode(' ', $b);
            if ($a === $b || count($ta) !== count($tb)) continue;
            $uy = true;
            foreach ($ta as $i => $x) if (!($x === $tb[$i] || (mb_strlen($x) === 1 && mb_substr($tb[$i], 0, 1) === $x && mb_strlen($tb[$i]) > 1))) { $uy = false; break; }
            if ($uy) $esle[$a] = $b;
        }
    }
    $hedef = function ($a) use ($esle) { $k = kisi_anahtar($a); return $esle[$k] ?? $k; };
    $grup = [];
    foreach ($varyant as $k => $v) { $grup[$esle[$k] ?? $k] = array_merge($grup[$esle[$k] ?? $k] ?? [], $v); }
    $gorunen = [];
    foreach ($grup as $k => $v) {
        // kısaltmasız biçimi tercih et
        $tam = array_values(array_filter($v, function ($x) use ($k) { return kisi_anahtar($x) === $k; }));
        $gorunen[$k] = ad_bicim($tam ?: $v);
    }
    foreach ($unvan as $k => $u) { if (isset($esle[$k])) { $unvan[$esle[$k]] = $u; } }
    $ad = function ($a) use ($hedef, $gorunen) { return $a === '' ? '' : $gorunen[$hedef($a)]; };
    foreach ($haftalar as &$h) {
        foreach ($h['seminer'] as &$x) $x['ad'] = $ad($x['ad']);
        unset($x);
        $h['makale'] = array_values(array_unique(array_map($ad, $h['makale'])));
        $h['olgu'] = array_values(array_unique(array_map($ad, $h['olgu'])));
        $h['danisman'] = $ad($h['danisman']);
        $h['koordinator'] = $h['koordinator'] !== '' ? unvan_duzelt($h['koordinator']) : '';
    }
    unset($h);
    usort($haftalar, function ($a, $b) { return strcmp($a['tarih'], $b['tarih']); });

    // Koordinatör hep aynıysa üst bilgiye taşı
    $koord = array_values(array_unique(array_filter(array_column($haftalar, 'koordinator'))));
    if (count($koord) <= 1) foreach ($haftalar as &$h) unset($h['koordinator']);
    unset($h);
    $unvanlar = [];
    foreach ($unvan as $k => $u) if (isset($gorunen[$k])) $unvanlar[$gorunen[$k]] = $u;

    return [
        'baslik' => $baslik, 'saat' => str_replace('.', ':', $saat), 'ara' => str_replace('.', ':', $ara),
        'koordinator' => count($koord) === 1 ? $koord[0] : '',
        'unvan' => $unvanlar, 'haftalar' => $haftalar, 'uyari' => array_values(array_unique($uyari)),
    ];
}
