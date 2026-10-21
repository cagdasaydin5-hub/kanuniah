<?php
// Asistan sunum yükleme yardımcıları: dosya türü doğrulama, slayt metni, hasta verisi taraması, PubMed künyesi.
// Yalnızca sunum-ekle.php tarafından kullanılır (.htaccess ile doğrudan erişime kapalı).
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === 'sunum-oku.php') { http_response_code(403); exit; }

// ---------- dosya türü ve metin ----------
// Dönüş: ['tur' => 'pptx'|'pdf', 'slaytlar' => [n => metin], 'sayfa' => n]; geçersizse istisna.
function sunum_oku($dosya, $uz) {
    $bas = (string)@file_get_contents($dosya, false, null, 0, 5);
    if ($uz === 'pdf') {
        if (strpos($bas, '%PDF') !== 0) throw new RuntimeException('Dosya PDF değil (uzantısı .pdf ama içeriği farklı).');
        return pdf_metin($dosya);
    }
    if (substr($bas, 0, 2) !== 'PK' || !class_exists('ZipArchive')) throw new RuntimeException('Dosya PowerPoint değil ya da bozuk.');
    $z = new ZipArchive();
    if ($z->open($dosya) !== true || $z->locateName('ppt/presentation.xml') === false) throw new RuntimeException('Dosya PowerPoint değil ya da bozuk.');
    $sl = [];
    for ($i = 0; $i < $z->numFiles; $i++) {
        if (preg_match('#^ppt/slides/slide(\d+)\.xml$#', $z->getNameIndex($i), $m)) $sl[(int)$m[1]] = $m[0];
    }
    ksort($sl);
    $out = []; $n = 0;
    foreach ($sl as $no => $yol) {
        $n++;
        $metin = xml_metin($z->getFromName($yol));
        // Konuşmacı notları da taranır (hasta bilgisi en çok burada unutulur)
        $rels = $z->getFromName("ppt/slides/_rels/slide$no.xml.rels");
        if ($rels && preg_match('#Target="\.\./notesSlides/(notesSlide\d+\.xml)"#', $rels, $m)) {
            $metin .= ' ' . xml_metin($z->getFromName('ppt/notesSlides/' . $m[1]));
        }
        $out[$n] = trim($metin);
    }
    $z->close();
    return ['tur' => 'pptx', 'slaytlar' => $out, 'sayfa' => count($out)];
}

function xml_metin($x) {
    if (!$x) return '';
    // Her paragraf (a:p) ayrı satır olur
    $satir = [];
    foreach (explode('</a:p>', $x) as $p) {
        preg_match_all('#<a:t(?:\s[^>]*)?>(.*?)</a:t>#s', $p, $t);
        if ($t[1]) $satir[] = html_entity_decode(implode('', $t[1]), ENT_QUOTES | ENT_XML1, 'UTF-8');
    }
    return implode("\n", $satir);
}

// PDF: sıkıştırılmış akışları açıp Tj/TJ metnini toplar. Yazı tipine göre her PDF'te çalışmaz (en iyi çaba).
function pdf_metin($dosya) {
    $ham = (string)file_get_contents($dosya);
    $sayfa = max(1, preg_match_all('#/Type\s*/Page(?![s\w])#', $ham));
    $metin = '';
    if (preg_match_all('#stream\r?\n(.*?)\r?\nendstream#s', $ham, $m)) {
        foreach ($m[1] as $s) {
            $a = @gzuncompress($s);
            if ($a === false) $a = @gzinflate(substr($s, 2));
            if ($a === false) $a = $s;
            if (!preg_match_all('#\((?:\\\\.|[^\\\\)])*\)\s*T[jJ\'"]|\[(.*?)\]\s*TJ#s', $a, $t)) continue;
            foreach ($t[0] as $op) {
                preg_match_all('#\(((?:\\\\.|[^\\\\)])*)\)#s', $op, $q);
                $metin .= implode('', array_map(function ($x) { return stripcslashes($x); }, $q[1])) . "\n";
            }
        }
    }
    if (!mb_check_encoding($metin, 'UTF-8')) $metin = mb_convert_encoding($metin, 'UTF-8', 'Windows-1254');
    return ['tur' => 'pdf', 'slaytlar' => [1 => $metin], 'sayfa' => $sayfa];
}

// Arama anahtarları: 4+ harfli benzersiz kelimeler (kütüphanedeki slayt içi arama için)
function anahtar_kelimeler($slaytlar, $sinir = 6000) {
    $gor = []; $out = '';
    foreach ($slaytlar as $s) {
        foreach (preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower($s, 'UTF-8')) as $w) {
            if (mb_strlen($w) < 4 || isset($gor[$w]) || !preg_match('/\p{L}/u', $w)) continue;
            $gor[$w] = 1;
            if (strlen($out) + strlen($w) + 1 > $sinir) return trim($out);
            $out .= ' ' . $w;
        }
    }
    return trim($out);
}

// ---------- hasta verisi taraması ----------
function tc_gecerli($n) {
    if (!preg_match('/^[1-9]\d{10}$/', $n)) return false;
    $d = array_map('intval', str_split($n));
    $tek = $d[0] + $d[2] + $d[4] + $d[6] + $d[8];
    $cift = $d[1] + $d[3] + $d[5] + $d[7];
    if ((($tek * 7 - $cift) % 10 + 10) % 10 !== $d[9]) return false;
    return array_sum(array_slice($d, 0, 10)) % 10 === $d[10];
}

// Dönüş: [['slayt' => n, 'ne' => 'TC kimlik numarası', 'ornek' => '123******01'], ...]
function hasta_verisi_tara($slaytlar) {
    $bul = [];
    $gizle = function ($s) { $s = trim($s); return mb_strlen($s) <= 4 ? '***' : mb_substr($s, 0, 2) . str_repeat('*', max(3, mb_strlen($s) - 4)) . mb_substr($s, -2); };
    foreach ($slaytlar as $no => $s) {
        if (preg_match_all('/(?<!\d)[1-9]\d{10}(?!\d)/', $s, $m)) {
            foreach ($m[0] as $x) if (tc_gecerli($x)) $bul[] = ['slayt' => $no, 'ne' => 'TC kimlik numarası', 'ornek' => $gizle($x)];
        }
        if (preg_match_all('/(?<![\d\/.])(?:\+?90[\s\-]?)?\(?0?5\d{2}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}(?![\d\/.])/u', $s, $m)) {
            foreach ($m[0] as $x) $bul[] = ['slayt' => $no, 'ne' => 'cep telefonu numarası', 'ornek' => $gizle($x)];
        }
        if (preg_match_all('/(T\.?\s?C\.?\s*(?:Kimlik)?\s*(?:No|Numaras[ıi])|Kimlik\s*(?:No|Numaras[ıi])|Protokol\s*(?:No|Numaras[ıi])|Dosya\s*(?:No|Numaras[ıi])|Hasta\s*(?:Ad[ıi]|Ad[ıi]\s*Soyad[ıi]))\s*[:=]\s*([^\n]{2,40})/iu', $s, $m, PREG_SET_ORDER)) {
            foreach ($m as $x) {
                $deger = trim($x[2]);
                if (preg_match('/^[\s.\-_*xX]+$/u', $deger)) continue; // boş/maskeli alan
                $bul[] = ['slayt' => $no, 'ne' => '"' . trim($x[1]) . '" alanı dolu', 'ornek' => $gizle($deger)];
            }
        }
    }
    return $bul;
}

// ---------- makale künyesi ----------
function web_getir($url) {
    if (function_exists('curl_init')) {
        $c = curl_init($url);
        curl_setopt_array($c, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 8, CURLOPT_CONNECTTIMEOUT => 4,
            CURLOPT_FOLLOWLOCATION => true, CURLOPT_USERAGENT => 'kanuniah.tr (mailto:tayfunsurmen@trabzon.edu.tr)']);
        $r = curl_exec($c); $kod = curl_getinfo($c, CURLINFO_HTTP_CODE); curl_close($c);
        if ($r === false || $kod === 0 || $kod >= 500) $GLOBALS['web_hata'] = true;
        return ($r !== false && $kod === 200) ? $r : null;
    }
    $r = @file_get_contents($url, false, stream_context_create(['http' => ['timeout' => 8, 'header' => "User-Agent: kanuniah.tr\r\n"]]));
    if ($r === false && empty($http_response_header)) $GLOBALS['web_hata'] = true;
    return $r === false ? null : $r;
}

const EUTILS = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';

function pubmed_ozet($pmid) {
    $j = json_decode((string)web_getir(EUTILS . 'esummary.fcgi?db=pubmed&retmode=json&tool=kanuniah&id=' . $pmid), true);
    $r = $j['result'][$pmid] ?? null;
    if (!$r || empty($r['title'])) return null;
    $doi = '';
    foreach ($r['articleids'] ?? [] as $a) if (($a['idtype'] ?? '') === 'doi') $doi = $a['value'];
    $yazar = array_column($r['authors'] ?? [], 'name');
    return [
        'title' => rtrim(html_entity_decode(strip_tags($r['title']), ENT_QUOTES, 'UTF-8'), '.'),
        'journal' => $r['fulljournalname'] ?? ($r['source'] ?? ''),
        'year' => preg_match('/\d{4}/', $r['pubdate'] ?? '', $m) ? $m[0] : '',
        'authors' => count($yazar) > 3 ? implode(', ', array_slice($yazar, 0, 3)) . ' ve ark.' : implode(', ', $yazar),
        'pmid' => (string)$pmid, 'doi' => $doi, 'kaynak' => 'PubMed',
    ];
}

function pubmed_ara($terim) {
    $j = json_decode((string)web_getir(EUTILS . 'esearch.fcgi?db=pubmed&retmode=json&retmax=1&tool=kanuniah&term=' . rawurlencode($terim)), true);
    return $j['esearchresult']['idlist'][0] ?? null;
}

// Girdi: PMID, DOI (ya da doi.org bağlantısı) veya makale adı. Dönüş: künye dizisi | null (bulunamadı) | false (bağlantı yok).
function makale_kunye($girdi) {
    $GLOBALS['web_hata'] = false;
    $k = makale_kunye_bul($girdi);
    return ($k === null && $GLOBALS['web_hata']) ? false : $k;
}
function makale_kunye_bul($girdi) {
    $g = trim((string)$girdi);
    if ($g === '') return null;
    $g = preg_replace('#^https?://(dx\.)?doi\.org/#i', '', $g);
    if (preg_match('#pubmed\.ncbi\.nlm\.nih\.gov/(\d+)#', $g, $m)) $g = $m[1];
    if (preg_match('/^\d{5,9}$/', $g)) return pubmed_ozet($g);
    if (preg_match('#^10\.\d{4,9}/\S+$#', $g)) {
        $id = pubmed_ara($g . '[doi]');
        if ($id) return pubmed_ozet($id);
        // PubMed'de olmayan dergiler (ör. ulusal dergiler): DOI kayıt kuruluşunun (Crossref) künyesi
        $c = json_decode((string)web_getir('https://api.crossref.org/works/' . rawurlencode($g)), true)['message'] ?? null;
        if (!$c || empty($c['title'][0])) return null;
        $yazar = array_map(function ($a) { return trim(($a['family'] ?? '') . ' ' . mb_substr($a['given'] ?? '', 0, 1)); }, $c['author'] ?? []);
        return [
            'title' => rtrim(strip_tags($c['title'][0]), '.'), 'journal' => $c['container-title'][0] ?? '',
            'year' => (string)($c['issued']['date-parts'][0][0] ?? ''), 'pmid' => '', 'doi' => $g, 'kaynak' => 'Crossref (DOI)',
            'authors' => count($yazar) > 3 ? implode(', ', array_slice($yazar, 0, 3)) . ' ve ark.' : implode(', ', $yazar),
        ];
    }
    if (mb_strlen($g) < 15) return null;
    $id = pubmed_ara('"' . str_replace('"', '', $g) . '"[ti]') ?: pubmed_ara($g . '[ti]');
    return $id ? pubmed_ozet($id) : null;
}

// ---------- yardımcılar ----------
function katla($s) {
    $s = mb_strtolower(str_replace(['İ', 'I'], ['i', 'ı'], (string)$s), 'UTF-8');
    $s = strtr($s, ['ı' => 'i', 'ş' => 's', 'ğ' => 'g', 'ü' => 'u', 'ö' => 'o', 'ç' => 'c', 'â' => 'a', 'î' => 'i', 'û' => 'u', "\u{0307}" => '']);
    return trim(preg_replace('/[^a-z0-9]+/', ' ', $s));
}

// "ayşe nur YILMAZ" → "Ayşe Nur Yılmaz"
function ad_duzgun($ad) {
    $w = preg_split('/\s+/u', trim(preg_replace('/\s+/u', ' ', (string)$ad)));
    return implode(' ', array_map(function ($x) {
        $alt = mb_strtolower(str_replace(['İ', 'I'], ['i', 'ı'], $x), 'UTF-8');
        $ilk = mb_substr($alt, 0, 1);
        return mb_strtoupper(str_replace(['i', 'ı'], ['İ', 'I'], $ilk), 'UTF-8') . mb_substr($alt, 1);
    }, $w));
}

// Dosya adı parçası: izinli karakterler dışında kalanlar boşluk olur; parça içindeki " - " ayırıcıyla karışmasın.
function ad_parca($s) {
    $s = preg_replace('/[^\p{L}\p{N} ._\-(),;]+/u', ' ', (string)$s);
    $s = preg_replace('/\s+-\s+/u', ', ', $s);
    return trim(preg_replace('/\s+/u', ' ', $s), ' .-');
}
