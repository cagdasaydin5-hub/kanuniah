<?php
// Sunum ekle: asistanlar kendi seminer, makale ve olgu sunumlarını Materyal kütüphanesine ekler (giriş gerekli).
//   sunum-ekle.php            → form (akademik program, kütüphane konuları ve sunan adları sayfaya gömülü)
//   sunum-ekle.php?kunye=…    → PMID / DOI / makale adı ile künye (JSON; PubMed, PubMed'de yoksa DOI için Crossref)
//   POST                      → kontroller geçerse dosya tür klasörüne "Konu - Başlık - Sunan (Yıl).uzantı" adıyla yazılır,
//                               .kutuphane.json'a kayıt eklenir ve kütüphanede hemen görünür.
// Kontroller: zorunlu alanlar, dosya türü (içerikten), çift kayıt (aynı dosya ya da aynı sunan + başlık),
// slayt metni ve konuşmacı notlarında hasta verisi (TC kimlik no, cep telefonu, dolu "Hasta adı / Protokol no" alanları),
// akademik programla eşleşme (eşleşmezse kayıt işaretlenir, engellenmez), makale künyesi (PubMed).
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

if (isset($_GET['kunye'])) {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: private, no-store');
    $k = makale_kunye(mb_substr((string)$_GET['kunye'], 0, 300));
    echo json_encode($k === false ? ['hata' => 'PubMed\'e şu an ulaşılamıyor; makale bilgilerini elle yazın.']
        : ($k === null ? ['hata' => 'Makale bulunamadı. PMID ya da DOI\'yi kontrol edin.'] : $k), JSON_UNESCAPED_UNICODE);
    exit;
}

$dizin = is_file(KUTUP_JSON) ? (json_decode(file_get_contents(KUTUP_JSON), true) ?: []) : [];
$program = is_file(SE_AK_JSON) ? (json_decode(file_get_contents(SE_AK_JSON), true) ?: []) : [];

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
    $konular[$x['topic']] = $x['group'];
    if (!empty($x['presenter'])) $kisiler[ad_duzgun($x['presenter'])] = 1;
    if (!empty($x['advisor'])) $danismanlar[$x['advisor']] = 1;
}
foreach ($sunumlar as $s) { $kisiler[ad_duzgun($s[1])] = 1; if ($s[4] !== '') $danismanlar[$s[4]] = 1; }
$gruplar = array_values(array_unique(array_values($konular)));

$hata = []; $uyari = []; $v = $_POST;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (empty($_POST) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        $hata[] = 'Dosya sunucu sınırını aştı (' . ini_get('post_max_size') . '). Sunumu küçültün (görselleri sıkıştırın) ya da PDF olarak kaydedin.';
    } else {
        csrf_dogrula();
        $tur = in_array($v['tur'] ?? '', $TURLER, true) ? $v['tur'] : null;
        $sunan = ad_duzgun($v['sunan'] ?? '');
        $danisman = trim(preg_replace('/\s+/u', ' ', $v['danisman'] ?? ''));
        $konu = trim(preg_replace('/\s+/u', ' ', $v['konu'] ?? ''));
        $baslik = trim(preg_replace('/\s+/u', ' ', $v['baslik'] ?? ''));
        $tarih = preg_match('/^\d{4}-\d{2}-\d{2}$/', $v['tarih'] ?? '') ? $v['tarih'] : '';
        $grup = $konular[$konu] ?? (in_array($v['grup'] ?? '', $gruplar, true) ? $v['grup'] : '');
        // Var olan konunun yazımını aynen kullan (büyük/küçük harf, Türkçe karakter farkı ayrı konu açmasın)
        foreach ($konular as $k => $g) if (katla($k) === katla($konu)) { $konu = $k; $grup = $g; break; }

        if (!$tur) $hata[] = 'Sunum türünü seçin.';
        if (!preg_match('/^\p{L}[\p{L}\'’.]*(?: \p{L}[\p{L}\'’.]*){1,3}$/u', $sunan)) $hata[] = 'Sunan kişinin adını ve soyadını yazın (ör. Ayşe Yılmaz).';
        if ($tur !== 'Hoca Sunumu' && $tur !== 'Rehber' && $danisman === '') $hata[] = 'Danışman hocanın adını yazın.';
        if (mb_strlen($konu) < 3) $hata[] = 'Konuyu yazın ya da listeden seçin.';
        if ($konu !== '' && $grup === '') $hata[] = 'Yeni bir konu yazdınız; hangi gruba girdiğini seçin.';
        if (mb_strlen($baslik) < 3) $hata[] = 'Sunum başlığını yazın.';
        if (!$tarih) $hata[] = 'Sunum tarihini girin.';
        elseif ($tarih > date('Y-m-d', strtotime('+14 days'))) $hata[] = 'Sunum tarihi bugünden en çok iki hafta ileri olabilir.';
        if (empty($v['onay'])) $hata[] = 'Sunumda hasta kimlik bilgisi olmadığını onaylayın.';

        // Makale künyesi
        $makale = null;
        if ($tur === 'Makale Sunumu') {
            $kimlik = trim($v['m_kimlik'] ?? '');
            $k = $kimlik !== '' ? makale_kunye($kimlik) : null;
            if (is_array($k)) {
                $makale = $k; $makale['dogrulandi'] = true;
            } else {
                if ($kimlik !== '' && $k === null) $hata[] = 'Girilen PMID/DOI ile makale bulunamadı; kontrol edin ya da alanı boş bırakıp makale bilgilerini elle yazın.';
                $makale = ['title' => trim($v['m_ad'] ?? ''), 'journal' => trim($v['m_dergi'] ?? ''), 'year' => trim($v['m_yil'] ?? ''),
                           'authors' => '', 'pmid' => '', 'doi' => '', 'kaynak' => '', 'dogrulandi' => false];
                if (mb_strlen($makale['title']) < 10) $hata[] = 'Sunulan makalenin adını yazın (ya da PMID/DOI girip "Getir"e basın).';
                elseif ($k === false) $uyari[] = 'PubMed\'e ulaşılamadı; makale bilgileri yazdığınız gibi kaydedildi.';
            }
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
            // Hasta verisi
            $bulgu = hasta_verisi_tara($okunan['slaytlar']);
            if ($bulgu && !(rol() === 'yonetici' && !empty($v['yoksay']))) {
                $yer = $okunan['tur'] === 'pdf' ? 'dosyada' : 'slayt';
                $hata[] = 'Sunumda hasta verisi olabilecek bilgi bulundu; çıkarıp tekrar yükleyin: '
                    . implode('; ', array_map(function ($b) use ($yer, $okunan) {
                        return ($okunan['tur'] === 'pdf' ? '' : "$b[slayt]. $yer: ") . "$b[ne] ($b[ornek])"; }, array_slice($bulgu, 0, 8)))
                    . (count($bulgu) > 8 ? ' ve ' . (count($bulgu) - 8) . ' yer daha' : '') . '.';
            }
            if ($okunan['tur'] === 'pdf' && mb_strlen(trim($okunan['slaytlar'][1])) < 50) {
                $uyari[] = 'PDF\'in metni okunamadı; hasta verisi taraması yapılamadı ve slayt içi aramada çıkmayacak. Mümkünse .pptx yükleyin.';
            }
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
            // Akademik programla eşleşme (engellemez; kayıtta işaretlenir)
            $eslesen = null;
            foreach ($sunumlar as $s) {
                if ($s[0] !== $tur || katla($s[1]) !== katla($sunan)) continue;
                if (!$eslesen || abs(strtotime($s[3]) - strtotime($tarih)) < abs(strtotime($eslesen[3]) - strtotime($tarih))) $eslesen = $s;
            }
            if (in_array($tur, ['Seminer', 'Makale Sunumu', 'Olgu Sunumu'], true) && $program) {
                if (!$eslesen) $uyari[] = "Akademik programda $sunan adına " . mb_strtolower($tur) . ' bulunamadı; kayıt "programda yok" olarak işaretlendi.';
                elseif ($eslesen[3] !== $tarih) $uyari[] = 'Programda bu sunum ' . tarih(strtotime($eslesen[3])) . ' tarihinde görünüyor; siz ' . tarih(strtotime($tarih)) . ' yazdınız.';
            }

            $yil = substr($tarih, 0, 4);
            $govde = ad_parca($konu) . ' - ' . ad_parca($baslik) . ' - ' . ad_parca($sunan) . " ($yil)";
            if (mb_strlen($govde) > 112) $govde = ad_parca($konu) . ' - ' . mb_substr(ad_parca($baslik), 0, max(10, 112 - mb_strlen(ad_parca($konu) . ad_parca($sunan)) - 13)) . ' - ' . ad_parca($sunan) . " ($yil)";
            $klasor = KUTUP . '/' . $KLASOR[$tur];
            if (!is_dir($klasor)) @mkdir($klasor, 0755, true);
            $ad = "$govde.$uz";
            for ($i = 2; file_exists("$klasor/$ad"); $i++) $ad = "$govde ($i).$uz";

            $kilit = fopen(KUTUP . '/.kutuphane.lock', 'c');
            flock($kilit, LOCK_EX);
            $dizin = is_file(KUTUP_JSON) ? (json_decode(file_get_contents(KUTUP_JSON), true) ?: []) : [];
            $id = 0; foreach ($dizin as $x) $id = max($id, (int)$x['id']);
            $kayit = [
                'id' => $id + 1, 'type' => $tur, 'topic' => $konu, 'group' => $grup, 'title' => $baslik,
                'presenter' => $sunan, 'advisor' => $danisman, 'year' => $yil, 'date' => $tarih,
                'slides' => $okunan['sayfa'], 'path' => $KLASOR[$tur] . "/$ad", 'orig' => son_ad($f['name']),
                'size' => $boy, 'keywords' => anahtar_kelimeler($okunan['slaytlar']), 'sha1' => $sha,
                'added' => date('c'), 'by' => rol(), 'program' => (bool)$eslesen,
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
                $_SESSION['se_tamam'] = ['ad' => $ad, 'path' => $kayit['path'], 'konu' => $konu, 'baslik' => $baslik, 'uyari' => $uyari];
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
        . ($s['uyari'] ? '<ul>' . implode('', array_map(function ($u) { return '<li>' . e($u) . '</li>'; }, $s['uyari'])) . '</ul>' : '')
        . '<p><a class="chip" href="kutuphane.php">Kütüphanede gör</a> <a class="chip" href="sunum-ekle.php">Bir sunum daha ekle</a></p></div>';
    $v = [];
} elseif ($hata || $uyari) {
    $kutu = '<div class="callout" role="alert"><p><b>' . ($hata ? 'Sunum eklenmedi.' : '') . '</b></p><ul>'
        . implode('', array_map(function ($u) { return '<li>' . e($u) . '</li>'; }, array_merge($hata, $uyari))) . '</ul>'
        . ($hata ? '<p><small>Düzeltip dosyayı yeniden seçin (güvenlik nedeniyle dosya seçimi korunmaz).</small></p>' : '') . '</div>';
}

$sec = function ($ad, $deger) use ($v) { return (($v[$ad] ?? '') === $deger) ? ' selected' : ''; };
$val = function ($ad) use ($v) { return e($v[$ad] ?? ''); };
$turSec = ''; foreach ($TURLER as $x) $turSec .= '<option' . $sec('tur', $x) . '>' . e($x) . '</option>';
$grupSec = '<option value="">Grup seçin</option>'; foreach ($gruplar as $g) $grupSec .= '<option' . $sec('grup', $g) . '>' . e($g) . '</option>';
$liste = function ($id, $a) { ksort($a); return '<datalist id="' . $id . '">' . implode('', array_map(function ($x) { return '<option value="' . e($x) . '">'; }, array_keys($a))) . '</datalist>'; };
$veri = json_encode(['program' => $sunumlar, 'konular' => $konular,
    'kayitlar' => array_map(function ($x) { return [$x['presenter'] ?? '', $x['title'], $x['topic']]; }, $dizin)], JSON_UNESCAPED_UNICODE);

sayfa('Sunum ekle', '
  <div class="page-head">
    <div class="eyebrow"><a href="./">Eğitim</a> › <a href="kutuphane.php">Materyal kütüphanesi</a> › Sunum ekle</div>
    <h1>Sunum ekle</h1>
    <p class="lede">Sunduğunuz seminer, makale ya da olgu sunumunu kütüphaneye ekleyin. Site dosyayı kontrol eder; sorun yoksa sunum hemen kütüphanede görünür ve konusuna göre diğer sunumlarla birlikte listelenir.</p>
  </div>' . $kutu . '
  <form method="post" enctype="multipart/form-data" class="sunum-form" id="sf">
    <input type="hidden" name="t" value="' . $t . '">
    <div class="fields">
      <label class="fld">Sunum türü <select name="tur" id="sf-tur" required>' . $turSec . '</select></label>
      <label class="fld">Sunan (ad soyad) <input type="text" name="sunan" id="sf-sunan" list="sf-kisiler" value="' . $val('sunan') . '" autocomplete="off" required></label>
    </div>
    <div id="sf-program" class="hint" aria-live="polite"></div>
    <div class="fields">
      <label class="fld">Sunum tarihi <input type="date" name="tarih" id="sf-tarih" value="' . ($val('tarih') ?: date('Y-m-d')) . '" required></label>
      <label class="fld" id="sf-dan-k">Danışman <input type="text" name="danisman" id="sf-danisman" list="sf-danismanlar" value="' . $val('danisman') . '" autocomplete="off" placeholder="ör. Doç. Dr. Ad Soyad"></label>
    </div>
    <div class="fields">
      <label class="fld">Konu <input type="text" name="konu" id="sf-konu" list="sf-konular" value="' . $val('konu') . '" autocomplete="off" placeholder="Listeden seçin ya da yazın: ör. Hipertansiyon" required></label>
      <label class="fld" id="sf-grup-k" hidden>Grup (yeni konu) <select name="grup" id="sf-grup">' . $grupSec . '</select></label>
    </div>
    <p class="hint" id="sf-konu-not"></p>
    <div class="fields col">
      <label class="fld">Sunum başlığı <input type="text" name="baslik" id="sf-baslik" value="' . $val('baslik') . '" maxlength="150" required></label>
    </div>
    <p class="hint" id="sf-cift" aria-live="polite"></p>
    <fieldset id="sf-makale" class="sunum-makale" hidden>
      <legend>Sunulan makale</legend>
      <div class="fields">
        <label class="fld">PMID ya da DOI <span class="inp"><input type="text" name="m_kimlik" id="sf-kimlik" value="' . $val('m_kimlik') . '" placeholder="ör. 38012345 ya da 10.1186/…" autocomplete="off"><button type="button" class="chip" id="sf-getir">Getir</button></span></label>
      </div>
      <p class="hint" id="sf-kunye" aria-live="polite">Numarayı yazıp "Getir"e basın; makale adı, dergi ve yıl PubMed\'den doldurulur. Numara yoksa makale adını yazıp "Getir"e basabilirsiniz.</p>
      <div class="fields col"><label class="fld">Makale adı <input type="text" name="m_ad" id="sf-mad" value="' . $val('m_ad') . '"></label></div>
      <div class="fields">
        <label class="fld">Dergi <input type="text" name="m_dergi" id="sf-dergi" value="' . $val('m_dergi') . '"></label>
        <label class="fld">Yıl <input type="text" name="m_yil" id="sf-myil" value="' . $val('m_yil') . '" inputmode="numeric" maxlength="4"></label>
      </div>
    </fieldset>
    <div class="fields col">
      <label class="fld">Sunum dosyası <input type="file" name="f" accept=".pptx,.ppsx,.pdf" required>
        <small class="hint">PowerPoint (.pptx) tercih edin; PDF de olur. En çok ' . e(ini_get('upload_max_filesize')) . '.</small></label>
      <label class="fld chk"><input type="checkbox" name="onay" value="1" required><span>Sunumda (notlar ve görseller dahil) hastayı tanıtan bilgi yok: ad soyad, TC kimlik no, protokol/dosya no, telefon, yüzü görünen fotoğraf, görüntüleme üzerindeki ad. <small class="hint">Site slayt metnini ve notları tarar; görsellerin içini okuyamaz.</small></span></label>'
      . (rol() === 'yonetici' ? '<label class="fld chk"><input type="checkbox" name="yoksay" value="1"><span>Hasta verisi uyarısını yok say (yalnızca yönetici; yanlış alarm için)</span></label>' : '') . '
    </div>
    <p><button class="chip" type="submit"><b>Kontrol et ve ekle</b></button></p>
  </form>
  ' . $liste('sf-kisiler', $kisiler) . $liste('sf-danismanlar', $danismanlar) . $liste('sf-konular', $konular) . '
  <p><a class="chip" href="kutuphane.php">‹ Materyal kütüphanesi</a></p>
  <script type="application/json" id="sf-veri">' . str_replace('</', '<\/', $veri) . '</script>
  <script src="../assets/sunum-ekle.js" defer></script>');
