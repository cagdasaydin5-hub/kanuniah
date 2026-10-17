<?php
// Yönetici paneli: yükle, klasör aç, yeniden adlandır, taşı, çöpe at / geri al, şifre değiştir.
// Dosyalar egitim/arsiv/ altında, yalnızca sunucuda durur (depoya girmez; FTP yüklemesi bunlara dokunmaz).
require __DIR__ . '/ortak.php';
giris_sart(true);
arsiv_hazirla();

function git($rel, $mesaj, $ek = '') {
    $_SESSION['mesaj'] = $mesaj;
    header('Location: yonetim.php?' . ($rel === '' ? '' : 'y=' . rawurlencode($rel)) . $ek);
    exit;
}
// Yüklenen dosya adındaki izin dışı karakterleri tireye çevirir.
function ad_uydur($ad) {
    $ad = preg_replace('/[^\p{L}\p{N} ._\-(),;]+/u', '-', basename((string)$ad));
    $ad = trim(preg_replace('/\s+/u', ' ', $ad), " .-");
    if (mb_strlen($ad) > 120) { $u = uzanti($ad); $ad = mb_substr(pathinfo($ad, PATHINFO_FILENAME), 0, 110) . '.' . $u; }
    return ad_temizle($ad);
}
function bos_ad($klasor, $ad) {
    if (!file_exists("$klasor/$ad")) return $ad;
    $u = uzanti($ad); $k = $u === '' ? $ad : substr($ad, 0, -strlen($u) - 1);
    for ($i = 2; ; $i++) { $y = $u === '' ? "$k ($i)" : "$k ($i).$u"; if (!file_exists("$klasor/$y")) return $y; }
}
function sil_tum($p) {
    if (is_dir($p) && !is_link($p)) { foreach (array_diff(scandir($p), ['.', '..']) as $a) sil_tum("$p/$a"); return @rmdir($p); }
    return @unlink($p);
}
function b64e($s) { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function b64d($s) { return base64_decode(strtr($s, '-_', '+/')); }

$rel = yol_temizle($_GET['y'] ?? $_POST['y'] ?? '');
if ($rel === null || !is_dir(tam_yol($rel))) $rel = '';
$burasi = tam_yol($rel);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (empty($_POST) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) git($rel, 'Yükleme sunucu sınırını aştı (' . ini_get('post_max_size') . '). Daha az ya da daha küçük dosya seçin.');
    csrf_dogrula();
    $is = $_POST['is'] ?? '';
    $hedef = yol_temizle($_POST['h'] ?? '');
    $hp = ($hedef === null || $hedef === '') ? null : tam_yol($hedef);

    if ($is === 'yukle') {
        $f = $_FILES['f'] ?? null; $ok = 0; $red = [];
        if ($f && is_array($f['name'])) foreach ($f['name'] as $i => $ad) {
            if ($f['error'][$i] === UPLOAD_ERR_NO_FILE) continue;
            $temiz = ad_uydur($ad);
            if ($f['error'][$i] !== UPLOAD_ERR_OK) { $red[] = "$ad (boyut sınırı ya da yükleme hatası)"; continue; }
            if (!$temiz || !izinli_dosya($temiz)) { $red[] = "$ad (izin verilmeyen tür)"; continue; }
            if (move_uploaded_file($f['tmp_name'][$i], "$burasi/" . bos_ad($burasi, $temiz))) $ok++; else $red[] = $ad;
        }
        git($rel, "Yüklenen dosya: $ok" . ($red ? '. Yüklenemeyen: ' . implode(', ', $red) : ''));
    }
    if ($is === 'klasor') {
        $ad = ad_temizle($_POST['ad'] ?? '');
        if (!$ad) git($rel, 'Klasör adı geçersiz.');
        if (file_exists("$burasi/$ad")) git($rel, 'Bu adda bir klasör ya da dosya zaten var.');
        git($rel, @mkdir("$burasi/$ad", 0755) ? "Klasör açıldı: $ad" : 'Klasör açılamadı.');
    }
    if (!$hp && in_array($is, ['adlandir', 'tasi', 'sil'], true)) git($rel, 'Öğe bulunamadı.');
    if ($is === 'adlandir') {
        $ad = ad_temizle($_POST['ad'] ?? '');
        if ($ad && is_file($hp) && uzanti($ad) !== uzanti($hp)) $ad = izinli_dosya($ad) ? $ad : $ad . '.' . uzanti($hp);
        if (!$ad || (is_file($hp) && !izinli_dosya($ad))) git($rel, 'Yeni ad geçersiz.');
        $yeni = dirname($hp) . "/$ad";
        if (file_exists($yeni) && strcasecmp($yeni, $hp) !== 0) git($rel, 'Bu adda bir öğe zaten var.');
        git($rel, @rename($hp, $yeni) ? "Yeni ad: $ad" : 'Ad değiştirilemedi.');
    }
    if ($is === 'tasi') {
        $k = yol_temizle($_POST['k'] ?? '');
        if ($k === null || !is_dir(tam_yol($k))) git($rel, 'Hedef klasör bulunamadı.');
        if (is_dir($hp) && ($k === $hedef || strpos("$k/", "$hedef/") === 0)) git($rel, 'Klasör kendi içine taşınamaz.');
        $kp = tam_yol($k); $ad = basename($hp);
        if (dirname($hp) === $kp) git($rel, 'Öğe zaten bu klasörde.');
        git($rel, @rename($hp, "$kp/" . bos_ad($kp, $ad)) ? "Taşındı: $ad → " . ($k === '' ? 'Dosyalar' : $k) : 'Taşınamadı.');
    }
    if ($is === 'sil') {
        $ad = date('Ymd-His') . '.' . b64e($hedef);
        git($rel, @rename($hp, COP . "/$ad") ? 'Çöpe taşındı: ' . basename($hedef) . ' (Çöp kutusundan geri alınabilir.)' : 'Silinemedi.');
    }
    if ($is === 'geri' || $is === 'kalici') {
        $c = basename($_POST['c'] ?? '');
        $cp = COP . "/$c";
        if ($c === '' || $c[0] === '.' || !file_exists($cp)) git('', 'Öğe çöpte bulunamadı.', '&cop=1');
        if ($is === 'kalici') git('', sil_tum($cp) ? 'Kalıcı olarak silindi.' : 'Silinemedi.', '&cop=1');
        $eski = yol_temizle(b64d(substr($c, strpos($c, '.') + 1)));
        $ust = $eski ? dirname($eski) : '.'; $ust = $ust === '.' ? '' : $ust;
        if ($eski === null || $eski === '' || !is_dir(tam_yol($ust))) $ust = '';
        $up = tam_yol($ust);
        $ad = bos_ad($up, $eski ? basename($eski) : $c);
        git($ust, @rename($cp, "$up/$ad") ? "Geri alındı: $ad" : 'Geri alınamadı.');
    }
    if ($is === 'sifre') {
        $yon = hesap_oku(YONETICI_CFG);
        $hangi = ($_POST['hangi'] ?? '') === 'yonetici' ? YONETICI_CFG : ASISTAN_CFG;
        $yeni = $_POST['s'] ?? '';
        if (!password_verify($_POST['m'] ?? '', $yon['hash'])) { sleep(1); git($rel, 'Mevcut yönetici şifresi hatalı.'); }
        if (strlen($yeni) < 8 || $yeni !== ($_POST['s2'] ?? '')) git($rel, 'Yeni şifre en az 8 karakter olmalı ve iki kez aynı yazılmalı.');
        $h = hesap_oku($hangi);
        git($rel, hesap_yaz($hangi, $h['kullanici'], $yeni) ? 'Şifre değişti (' . ($hangi === YONETICI_CFG ? 'yönetici' : 'asistan') . ' hesabı).' : 'Şifre kaydedilemedi.');
    }
    git($rel, 'Bilinmeyen işlem.');
}

$t = csrf();
$mesaj = $_SESSION['mesaj'] ?? ''; unset($_SESSION['mesaj']);
$kutu = $mesaj ? '<p class="callout" role="status">' . e($mesaj) . '</p>' : '';
$gizli = '<input type="hidden" name="t" value="' . $t . '"><input type="hidden" name="y" value="' . e($rel) . '">';

// Çöp kutusu görünümü
if (isset($_GET['cop'])) {
    $satir = '';
    $ogeler = array_values(array_filter(@scandir(COP) ?: [], fn($a) => $a[0] !== '.'));
    rsort($ogeler);
    foreach ($ogeler as $c) {
        $eski = b64d(substr($c, strpos($c, '.') + 1));
        $ts = DateTime::createFromFormat('Ymd-His', substr($c, 0, 15));
        $satir .= '<tr><td>' . e($eski) . (is_dir(COP . "/$c") ? '/' : '') . '</td><td>' . ($ts ? tarih($ts->getTimestamp()) : '') . '</td><td>'
            . '<form method="post" class="satir">' . $gizli . '<input type="hidden" name="c" value="' . e($c) . '"><button class="chip" name="is" value="geri">Geri al</button> '
            . '<button class="chip" name="is" value="kalici" onclick="return confirm(\'Kalıcı olarak silinsin mi? Geri alınamaz.\')">Kalıcı sil</button></form></td></tr>';
    }
    if ($satir === '') $satir = '<tr><td colspan="3">Çöp kutusu boş.</td></tr>';
    sayfa('Çöp kutusu', '
  <div class="page-head"><div class="eyebrow"><a href="./">Eğitim</a> › <a href="yonetim.php">Dosya yönetimi</a> › Çöp kutusu</div><h1>Çöp kutusu</h1>
  <p class="lede">Silinenler burada durur; asistanlar görmez. Geri alınan öğe eski klasörüne döner.</p></div>' . $kutu . '
  <div class="tablewrap"><table class="asi dosya"><thead><tr><th>Eski yer</th><th>Silinme</th><th></th></tr></thead><tbody>' . $satir . '</tbody></table></div>
  <p><a class="chip" href="yonetim.php">‹ Dosya yönetimi</a></p>');
}

[$klasorler, $dosyalar] = listele($rel);
$agac = klasor_agaci();
function islemler($r, $ad, $dosya, $gizli, $agac) {
    $sec = '';
    foreach ($agac as $k) $sec .= '<option value="' . e($k) . '">' . e($k === '' ? 'Dosyalar (kök)' : $k) . '</option>';
    return '<details class="islem"><summary>İşlem</summary>'
        . '<form method="post">' . $gizli . '<input type="hidden" name="h" value="' . e($r) . '"><input name="ad" value="' . e($ad) . '" aria-label="Yeni ad" required> <button class="chip" name="is" value="adlandir">Yeniden adlandır</button></form>'
        . '<form method="post">' . $gizli . '<input type="hidden" name="h" value="' . e($r) . '"><select name="k" aria-label="Hedef klasör">' . $sec . '</select> <button class="chip" name="is" value="tasi">Taşı</button></form>'
        . '<form method="post">' . $gizli . '<input type="hidden" name="h" value="' . e($r) . '"><button class="chip" name="is" value="sil" onclick="return confirm(\'' . e(addslashes($ad)) . ' çöpe taşınsın mı?\')">Çöpe at</button></form>'
        . '</details>';
}
$satir = '';
foreach ($klasorler as $k) {
    $r = $rel === '' ? $k : "$rel/$k";
    $satir .= '<tr><td><a href="?y=' . rawurlencode($r) . '"><b>' . e($k) . '/</b></a></td><td>klasör</td><td>' . islemler($r, $k, false, $gizli, $agac) . '</td></tr>';
}
foreach ($dosyalar as $f) {
    $r = $rel === '' ? $f : "$rel/$f";
    $p = tam_yol($r);
    $satir .= '<tr><td><a href="dosyalar.php?d=' . rawurlencode($r) . '">' . e($f) . '</a><br><small>' . tarih(filemtime($p)) . '</small></td><td class="mono">' . boyut(filesize($p)) . '</td><td>' . islemler($r, $f, true, $gizli, $agac) . '</td></tr>';
}
if ($satir === '') $satir = '<tr><td colspan="3">Bu klasör boş.</td></tr>';

sayfa('Dosya yönetimi', '
  <div class="page-head">
    <div class="eyebrow"><a href="./">Eğitim</a> › Yönetim › ' . kirinti($rel, 'yonetim.php') . '</div>
    <h1>' . e($rel === '' ? 'Dosya yönetimi' : basename($rel)) . '</h1>
    <p class="lede">Sunumları <b>Kütüphane</b> içindeki tür klasörüne (Seminerler, Makale Sunumları, Olgu Sunumları, Hoca Sunumları, Rehberler) yükleyin; <a href="kutuphane.php">Materyal kütüphanesi</a>nde kendiliğinden görünür. Dosya adı biçimi: <code>Konu - Başlık - Sunan (Yıl).pptx</code> — konu mevcut bir konuyla aynı yazılırsa o konunun altına girer. Hasta verisi yüklemeyin.</p>
  </div>' . $kutu . '
  <div class="yonetim-ust">
    <form method="post" enctype="multipart/form-data">' . $gizli . '<b>Dosya yükle</b><input type="file" name="f[]" multiple required><button class="chip" name="is" value="yukle">Yükle</button>
      <small>Tek dosya en çok ' . e(ini_get('upload_max_filesize')) . ', bir seferde toplam ' . e(ini_get('post_max_size')) . '. İzinli türler: ' . implode(', ', IZINLI) . '.</small></form>
    <form method="post">' . $gizli . '<b>Yeni klasör</b><input name="ad" placeholder="Klasör adı" required><button class="chip" name="is" value="klasor">Oluştur</button></form>
  </div>
  <div class="tablewrap"><table class="asi dosya"><thead><tr><th>Ad</th><th>Boyut</th><th></th></tr></thead><tbody>' . $satir . '</tbody></table></div>
  <p><a class="chip" href="./">‹ Eğitim</a> <a class="chip" href="?cop=1">Çöp kutusu</a></p>
  <details class="islem"><summary>Şifre değiştir</summary>
    <form method="post" class="sifre">' . $gizli . '<input type="hidden" name="is" value="sifre">
      <label>Hesap <select name="hangi"><option value="asistan">Asistan hesabı</option><option value="yonetici">Yönetici hesabı</option></select></label>
      <label>Mevcut yönetici şifresi <input type="password" name="m" autocomplete="current-password" required></label>
      <label>Yeni şifre (en az 8 karakter) <input type="password" name="s" autocomplete="new-password" required></label>
      <label>Yeni şifre (tekrar) <input type="password" name="s2" autocomplete="new-password" required></label>
      <button class="chip">Kaydet</button></form>
  </details>');
