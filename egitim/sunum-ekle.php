<?php
// Sunum ekle: asistanlar kendi seminer, makale ve olgu sunumlarını Materyal kütüphanesine ekler (giriş gerekli).
//   sunum-ekle.php  → form (sunan ve danışman önerileri sayfaya gömülü)
//   POST            → dosya tür klasörüne "Başlık - Sunan (Yıl).uzantı" adıyla yazılır, .kutuphane.json'a kayıt eklenir.
// Tek kontrol: aynı sunum ikinci kez eklenmez (aynı dosya ya da aynı sunan + başlık).
require __DIR__ . '/ortak.php';
require __DIR__ . '/sunum-oku.php';
giris_sart();
arsiv_hazirla();

const KUTUP = ARSIV . '/Kütüphane';
const KUTUP_JSON = KUTUP . '/.kutuphane.json';
const SE_AK_JSON = ARSIV . '/.akademik.json';
const SE_UZ = ['pptx', 'ppsx', 'pdf'];
$KLASOR = ['Seminer' => 'Seminerler', 'Makale Sunumu' => 'Makale Sunumları', 'Olgu Sunumu' => 'Olgu Sunumları',
           'Hoca Sunumu' => 'Hoca Sunumları', 'Rehber' => 'Rehberler'];
$TURLER = rol() === 'yonetici' ? array_keys($KLASOR) : ['Seminer', 'Makale Sunumu', 'Olgu Sunumu'];

$dizin = is_file(KUTUP_JSON) ? (json_decode(file_get_contents(KUTUP_JSON), true) ?: []) : [];
$program = is_file(SE_AK_JSON) ? (json_decode(file_get_contents(SE_AK_JSON), true) ?: []) : []; // yalnızca ad önerileri için

// Akademik programdaki sunumlar: [tür, ad, konu, tarih, danışman]
function program_sunumlari($program) {
    $out = [];
    foreach ($program['haftalar'] ?? [] as $h) {
        foreach ($h['seminer'] ?? [] as $s) if ($s['ad'] !== '') $out[] = ['Seminer', $s['ad'], $s['konu'], $h['tarih'], $h['danisman'] ?? ''];
        foreach ($h['makale'] ?? [] as $a) $out[] = ['Makale Sunumu', $a, '', $h['tarih'], $h['danisman'] ?? ''];
        foreach ($h['olgu'] ?? [] as $a) $out[] = ['Olgu Sunumu', $a, '', $h['tarih'], $h['danisman'] ?? ''];
    }
    return $out;
}
$sunumlar = program_sunumlari($program);
$konular = []; $kisiler = []; $danismanlar = [];
foreach ($dizin as $x) {
    $konular[$x['topic']] = kayit_kategori($x);
    if (!empty($x['presenter'])) $kisiler[] = $x['presenter'];
    if (!empty($x['advisor'])) $danismanlar[] = $x['advisor'];
}
foreach ($sunumlar as $s) { $kisiler[] = $s[1]; if ($s[4] !== '') $danismanlar[] = $s[4]; }
// Öneri listesi: unvan atılır, "Ad Soyad" biçimine getirilir; ad olmayanlar (kurum adı vb.), tek kelimeler
// ve kısaltmalı yazımlar (Burcu A Yurtsever) tam hâli varsa listeden çıkar; büyük/küçük harf farkı tek kayıt olur.
function ad_listesi($ham, $unvanli = false) {
    $tam = []; $unv = [];
    foreach ($ham as $a) {
        [$u, $a] = unvan_ayir($a);
        $a = ad_duzgun(str_replace('.', ' ', $a));
        $w = preg_split('/\s+/u', $a);
        if (count($w) < 2 || count($w) > 4 || preg_match('/[^\p{L}\s\'’]/u', $a)) continue;
        if (preg_match('/\b(hastane|eğitim|araştırma|kliniği|üniversite|aile hekim)/iu', $a)) continue;
        $tam[katla($a)] = $a; if ($u) $unv[katla($a)] = $u;
    }
    foreach ($tam as $k => $a) {
        $w = explode(' ', $k);
        if (!array_filter($w, function ($x) { return strlen($x) === 1; })) continue;
        foreach ($tam as $k2 => $b) {
            $w2 = explode(' ', $k2);
            if ($k2 === $k || count($w2) !== count($w)) continue;
            $uy = true;
            foreach ($w as $i => $x) if (!($x === $w2[$i] || (strlen($x) === 1 && $x === $w2[$i][0] && strlen($w2[$i]) > 1))) { $uy = false; break; }
            if ($uy) { unset($tam[$k]); break; }
        }
    }
    if ($unvanli) foreach ($tam as $k => $a) $tam[$k] = danisman_duzgun(($unv[$k] ?? '') . ' ' . $a);
    return array_fill_keys(array_values($tam), 1);
}
$kisiler = ad_listesi($kisiler);
// Danışman önerileri: yalnızca kliniğin hocaları, unvanlarıyla (ortak.php → HOCALAR)
$danismanlar = []; foreach (HOCALAR as $h => $u) $danismanlar["$u $h"] = 1;

$hata = []; $v = $_POST;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (empty($_POST) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        $hata[] = 'Dosya sunucu sınırını aştı (' . ini_get('post_max_size') . '). Sunumu küçültün (görselleri sıkıştırın) ya da PDF olarak kaydedin.';
    } else {
        csrf_dogrula();
        $tur = in_array($v['tur'] ?? '', $TURLER, true) ? $v['tur'] : null;
        $sunan = ad_duzgun($v['sunan'] ?? '');
        $danisman = danisman_duzgun($v['danisman'] ?? '');
        $baslik = trim(preg_replace('/\s+/u', ' ', $v['baslik'] ?? ''));
        $tarih = preg_match('/^\d{4}-\d{2}-\d{2}$/', $v['tarih'] ?? '') ? $v['tarih'] : '';
        $kat = in_array($v['kategori'] ?? '', KATEGORILER, true) ? $v['kategori'] : '';

        if (!$tur) $hata[] = 'Sunum türünü seçin.';
        if (!preg_match('/^\p{L}[\p{L}\'’.]*(?: \p{L}[\p{L}\'’.]*){1,3}$/u', $sunan)) $hata[] = 'Sunan kişinin adını ve soyadını yazın (ör. Ayşe Yılmaz).';
        if ($tur !== 'Hoca Sunumu' && $tur !== 'Rehber' && $danisman === '') $hata[] = 'Danışman hocanın adını yazın.';
        if ($kat === '') $hata[] = 'Kategoriyi seçin.';
        if (mb_strlen($baslik) < 3) $hata[] = 'Sunum başlığını yazın.';
        if (!$tarih) $hata[] = 'Sunum tarihini girin.';
        elseif ($tarih > date('Y-m-d', strtotime('+14 days'))) $hata[] = 'Sunum tarihi bugünden en çok iki hafta ileri olabilir.';

        $makale = null;
        if ($tur === 'Makale Sunumu') {
            $kimlik = trim($v['m_kimlik'] ?? '');
            $makale = ['title' => trim($v['m_ad'] ?? ''), 'journal' => trim($v['m_dergi'] ?? ''), 'year' => trim($v['m_yil'] ?? ''),
                       'pmid' => preg_match('/^\d{5,9}$/', $kimlik) ? $kimlik : '',
                       'doi' => preg_match('#(10\.\d{4,9}/\S+)#', $kimlik, $m) ? $m[1] : ''];
            if (mb_strlen($makale['title']) < 10) $hata[] = 'Sunulan makalenin adını yazın.';
        }

        // Dosya
        $f = $_FILES['f'] ?? null; $okunan = null; $uz = '';
        if (!$f || $f['error'] === UPLOAD_ERR_NO_FILE) $hata[] = 'Sunum dosyasını seçin.';
        elseif ($f['error'] !== UPLOAD_ERR_OK) $hata[] = 'Dosya yüklenemedi (en çok ' . ini_get('upload_max_filesize') . '). Görselleri sıkıştırıp tekrar deneyin.';
        else {
            $uz = uzanti($f['name']);
            if (!in_array($uz, SE_UZ, true)) $hata[] = 'Yalnızca PowerPoint (.pptx, .ppsx) ya da PDF yüklenebilir. Eski .ppt dosyasını PowerPoint\'te "Farklı kaydet → .pptx" ile çevirin.';
            else {
                try { $okunan = sunum_oku($f['tmp_name'], $uz); } catch (Throwable $e) { $hata[] = $e->getMessage(); }
            }
        }

        if ($okunan) {
            // Çift kayıt: aynı içerik (önce boyut, eşitse özet karşılaştırılır) ya da aynı sunan + başlık
            $sha = sha1_file($f['tmp_name']); $boy = filesize($f['tmp_name']);
            foreach ($dizin as $x) {
                $p = KUTUP . '/' . $x['path'];
                if (!is_file($p)) continue;
                $ayni = ($x['sha1'] ?? null) ? $x['sha1'] === $sha : (filesize($p) === $boy && sha1_file($p) === $sha);
                if ($ayni) { $hata[] = "Bu dosya kütüphanede zaten var: \"$x[title]\" ($x[topic])."; break; }
                if (katla($x['presenter'] ?? '') === katla($sunan) && katla($x['title']) === katla($baslik)) {
                    $hata[] = "\"$baslik\" başlıklı, $sunan tarafından sunulan bir kayıt zaten var. Yeni sürümü eklemek için yöneticiye yazın."; break;
                }
            }
        }

        if (!$hata) {
            $yil = substr($tarih, 0, 4);
            $govde = mb_substr(ad_parca($baslik), 0, 90) . ' - ' . ad_parca($sunan) . " ($yil)";
            $klasor = KUTUP . '/' . $KLASOR[$tur];
            if (!is_dir($klasor)) @mkdir($klasor, 0755, true);
            $ad = "$govde.$uz";
            for ($i = 2; file_exists("$klasor/$ad"); $i++) $ad = "$govde ($i).$uz";

            $kilit = fopen(KUTUP . '/.kutuphane.lock', 'c');
            flock($kilit, LOCK_EX);
            $dizin = is_file(KUTUP_JSON) ? (json_decode(file_get_contents(KUTUP_JSON), true) ?: []) : [];
            $id = 0; foreach ($dizin as $x) $id = max($id, (int)$x['id']);
            $kayit = [
                'id' => $id + 1, 'type' => $tur, 'topic' => $baslik, 'group' => $kat, 'kategori' => $kat, 'title' => $baslik,
                'presenter' => $sunan, 'advisor' => $danisman, 'year' => $yil, 'date' => $tarih,
                'slides' => $okunan['sayfa'], 'path' => $KLASOR[$tur] . "/$ad", 'orig' => son_ad($f['name']),
                'size' => $boy, 'keywords' => anahtar_kelimeler($okunan['slaytlar']), 'sha1' => $sha,
                'added' => date('c'), 'by' => rol(),
            ];
            if ($makale) $kayit['article'] = $makale;
            $dizin[] = $kayit;
            $yaz = false;
            if (move_uploaded_file($f['tmp_name'], "$klasor/$ad")) {
                @copy(KUTUP_JSON, KUTUP . '/.kutuphane.onceki.json');
                $gec = KUTUP_JSON . '.tmp';
                $yaz = file_put_contents($gec, json_encode($dizin, JSON_UNESCAPED_UNICODE)) !== false && rename($gec, KUTUP_JSON);
                if (!$yaz) @unlink("$klasor/$ad");
            }
            flock($kilit, LOCK_UN); fclose($kilit);

            if ($yaz) {
                $_SESSION['se_tamam'] = ['ad' => $ad, 'path' => $kayit['path'], 'baslik' => $baslik];
                header('Location: sunum-ekle.php?tamam=1');
                exit;
            }
            $hata[] = 'Dosya kaydedilemedi; sunucu yazma iznini kontrol etmesi için yöneticiye haber verin.';
        }
    }
}

$t = csrf();
$kutu = '';
if (isset($_GET['tamam']) && ($s = $_SESSION['se_tamam'] ?? null)) {
    unset($_SESSION['se_tamam']);
    $kutu = '<div class="callout" role="status"><p><b>Sunumunuz kütüphaneye eklendi.</b> '
        . '<a href="dosyalar.php?d=' . rawurlencode('Kütüphane/' . $s['path']) . '" target="_blank" rel="noopener">' . e($s['ad']) . '</a></p>'
        . '<p><a class="chip" href="kutuphane.php">Kütüphanede gör</a> <a class="chip" href="sunum-ekle.php">Bir sunum daha ekle</a></p></div>';
    $v = [];
} elseif ($hata) {
    $kutu = '<div class="callout" role="alert"><p><b>Sunum eklenmedi.</b></p><ul>'
        . implode('', array_map(function ($u) { return '<li>' . e($u) . '</li>'; }, $hata)) . '</ul>'
        . '<p><small>Dosyayı yeniden seçin.</small></p></div>';
}

$sec = function ($ad, $deger) use ($v) { return (($v[$ad] ?? '') === $deger) ? ' selected' : ''; };
$val = function ($ad) use ($v) { return e($v[$ad] ?? ''); };
$turSec = ''; foreach ($TURLER as $x) $turSec .= '<option' . $sec('tur', $x) . '>' . e($x) . '</option>';
$katSec = '<option value="">Kategori seçin</option>'; foreach (KATEGORILER as $g) $katSec .= '<option' . $sec('kategori', $g) . '>' . e($g) . '</option>';
$liste = function ($id, $a) { ksort($a); return '<datalist id="' . $id . '">' . implode('', array_map(function ($x) { return '<option value="' . e($x) . '">'; }, array_keys($a))) . '</datalist>'; };
$veri = json_encode([
    'kayitlar' => array_map(function ($x) { return [$x['presenter'] ?? '', $x['title'], $x['topic']]; }, $dizin)], JSON_UNESCAPED_UNICODE);

sayfa('Sunum ekle', '
  <div class="page-head">
    <div class="eyebrow"><a href="./">Eğitim</a> › <a href="kutuphane.php">Materyal kütüphanesi</a> › Sunum ekle</div>
    <h1>Sunum ekle</h1>
    <p class="lede">Sunduğunuz seminer, makale ya da olgu sunumunu kütüphaneye ekleyin. Sunum hemen kütüphanede, kategorisinin altında görünür.</p>
  </div>' . $kutu . '
  <form method="post" enctype="multipart/form-data" class="sunum-form" id="sf">
    <input type="hidden" name="t" value="' . $t . '">
    <div class="fields">
      <label class="fld">Sunum türü <select name="tur" id="sf-tur" required>' . $turSec . '</select></label>
      <label class="fld">Sunan (ad soyad) <input type="text" name="sunan" id="sf-sunan" list="sf-kisiler" value="' . $val('sunan') . '" autocomplete="off" required></label>
    </div>
    <div class="fields">
      <label class="fld">Sunum tarihi <input type="date" name="tarih" id="sf-tarih" value="' . ($val('tarih') ?: date('Y-m-d')) . '" required></label>
      <label class="fld" id="sf-dan-k">Danışman <input type="text" name="danisman" id="sf-danisman" list="sf-danismanlar" value="' . $val('danisman') . '" autocomplete="off" placeholder="ör. Doç. Dr. Ad Soyad"></label>
    </div>
    <div class="fields">
      <label class="fld">Kategori <select name="kategori" id="sf-kat" required>' . $katSec . '</select></label>
    </div>
    <div class="fields col">
      <label class="fld">Sunum başlığı <input type="text" name="baslik" id="sf-baslik" value="' . $val('baslik') . '" maxlength="150" required></label>
    </div>
    <p class="hint" id="sf-cift" aria-live="polite"></p>
    <fieldset id="sf-makale" class="sunum-makale" hidden>
      <legend>Sunulan makale</legend>
      <div class="fields">
        <label class="fld">PMID ya da DOI (varsa) <input type="text" name="m_kimlik" value="' . $val('m_kimlik') . '" autocomplete="off"></label>
      </div>
      <div class="fields col"><label class="fld">Makale adı <input type="text" name="m_ad" id="sf-mad" value="' . $val('m_ad') . '"></label></div>
      <div class="fields">
        <label class="fld">Dergi <input type="text" name="m_dergi" id="sf-dergi" value="' . $val('m_dergi') . '"></label>
        <label class="fld">Yıl <input type="text" name="m_yil" id="sf-myil" value="' . $val('m_yil') . '" inputmode="numeric" maxlength="4"></label>
      </div>
    </fieldset>
    <div class="fields col">
      <label class="fld">Sunum dosyası <input type="file" name="f" accept=".pptx,.ppsx,.pdf" required>
        <small class="hint">PowerPoint ya da PDF · en çok ' . e(ini_get('upload_max_filesize')) . '</small></label>
    </div>
    <p><button class="chip" type="submit"><b>Ekle</b></button></p>
  </form>
  ' . $liste('sf-kisiler', $kisiler) . $liste('sf-danismanlar', $danismanlar) . '
  <p><a class="chip" href="kutuphane.php">‹ Materyal kütüphanesi</a></p>
  <script type="application/json" id="sf-veri">' . str_replace('</', '<\/', $veri) . '</script>
  <script src="../assets/sunum-ekle.js" defer></script>');
