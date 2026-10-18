<?php
// Çalışma listesi: asistanların gün gün çalıştığı birimler (giriş gerekli).
//   calisma.php           → gün, kişi ve birime göre görünüm (veri sayfaya gömülü)
//   calisma.php?indir=1   → son yüklenen özgün Excel
//   POST is=yukle         → yönetici aylık Excel yükler; yeni dosyanın tarihleri eskilerin yerine geçer, diğer günler korunur
// Veri depoda değil, sunucuda durur (egitim/arsiv/.calisma.json ve .calisma.xlsx).
// Adlar, akademik programdaki yazımla eşleştirilir (iki sayfada aynı kişi seçimi geçerli olsun diye).
require __DIR__ . '/ortak.php';
require __DIR__ . '/calisma-oku.php';
giris_sart();
arsiv_hazirla();

const CL_JSON = ARSIV . '/.calisma.json';
const CL_XLSX = ARSIV . '/.calisma.xlsx';
const CL_AK_JSON = ARSIV . '/.akademik.json';

if (isset($_GET['indir'])) {
    if (!is_file(CL_XLSX)) { http_response_code(404); exit('Excel dosyası yok.'); }
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header("Content-Disposition: attachment; filename*=UTF-8''" . rawurlencode('Çalışma Listesi.xlsx'));
    header('Content-Length: ' . filesize(CL_XLSX));
    header('Cache-Control: private, no-store');
    readfile(CL_XLSX);
    exit;
}

$mesaj = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && rol() === 'yonetici' && ($_POST['is'] ?? '') === 'yukle') {
    csrf_dogrula();
    $f = $_FILES['f'] ?? null;
    if (!$f || $f['error'] !== UPLOAD_ERR_OK) $mesaj = 'Dosya alınamadı.';
    elseif (uzanti($f['name']) !== 'xlsx') $mesaj = 'Yalnızca .xlsx dosyası yüklenebilir.';
    else {
        try {
            $yeni = calisma_oku($f['tmp_name']);
            $eski = is_file(CL_JSON) ? json_decode(file_get_contents(CL_JSON), true) : null;
            $d = calisma_birlestir($eski, $yeni);
            $d['guncelleme'] = time();
            if (file_put_contents(CL_JSON, json_encode($d, JSON_UNESCAPED_UNICODE), LOCK_EX) === false || !move_uploaded_file($f['tmp_name'], CL_XLSX)) {
                $mesaj = 'Kaydedilemedi; sunucu yazma iznini kontrol edin.';
            } else {
                $g = array_keys($yeni['gunler']);
                $mesaj = 'Çalışma listesi güncellendi: ' . count($g) . ' gün (' . tarih(strtotime($g[0])) . ' – ' . tarih(strtotime(end($g))) . ').';
            }
        } catch (Throwable $e) {
            $mesaj = 'Excel okunamadı: ' . $e->getMessage();
        }
    }
}

$d = is_file(CL_JSON) ? json_decode(file_get_contents(CL_JSON), true) : null;
$gun = $d['guncelleme'] ?? 0;
if ($d) {
    // Akademik programdaki adlarla eşleştir
    $bilinen = [];
    $ak = is_file(CL_AK_JSON) ? json_decode(file_get_contents(CL_AK_JSON), true) : null;
    foreach ($ak['haftalar'] ?? [] as $h) {
        foreach ($h['seminer'] as $s) if ($s['ad'] !== '') $bilinen[] = $s['ad'];
        $bilinen = array_merge($bilinen, $h['makale'], $h['olgu'], $h['danisman'] !== '' ? [$h['danisman']] : []);
    }
    $esle = cl_ad_eslestir(array_unique($bilinen));
    foreach ($d['gunler'] as &$g) foreach ($g as &$adlar) $adlar = array_values(array_unique(array_map($esle, $adlar)));
    unset($g, $adlar);
    unset($d['guncelleme']);
}
$veri = $d ? json_encode($d, JSON_UNESCAPED_UNICODE) : 'null';

$yon = '';
if (rol() === 'yonetici') {
    $yon = '<div class="yonetim-ust"><form method="post" enctype="multipart/form-data"><input type="hidden" name="t" value="' . csrf() . '">'
        . '<b>Listeyi güncelle</b><input type="file" name="f" accept=".xlsx" required><button class="chip" name="is" value="yukle">Yükle</button>'
        . '<small>Aylık çalışma listesi Excel\'i (.xlsx): üst satırda birimler, A sütununda tarihler. Dosyadaki günler eskisinin yerine geçer, diğer aylar korunur.</small></form></div>';
}
$kutu = $mesaj ? '<p class="callout" role="status">' . e($mesaj) . '</p>' : '';

sayfa('Çalışma listesi', '
  <div class="page-head">
    <div class="eyebrow"><a href="./">Eğitim</a> › Çalışma listesi</div>
    <h1>Çalışma listesi</h1>
    <p class="lede">Asistanların çalıştığı birimler ve tarihleri. Adınızı seçin ya da bir gün seçip o günü görün. Listede adı geçmeyen asistanlar rotasyondadır.</p>
  </div>' . $kutu . '
  <div class="bar">
    <div class="ak-filtre">
      <div class="chips"><button class="chip" type="button" id="cl-onceki" aria-label="Önceki gün">‹</button><select id="cl-gun" class="cl-gun" aria-label="Gün"></select><button class="chip" type="button" id="cl-sonraki" aria-label="Sonraki gün">›</button><button class="chip" type="button" id="cl-bugun">Bugün</button></div>
      <label class="ak-kisi">Kişi <select id="ak-kisi"><option value="">Herkes</option></select></label>
    </div>
  </div>
  <div id="cl-kisi"></div>
  <div id="cl-gunluk" class="ak-tablo"><p class="empty">' . ($veri === 'null' ? 'Liste henüz yüklenmedi.' : 'Yükleniyor…') . '</p></div>
  <div id="cl-not"></div>
  <p class="ak-alt"><a class="chip" href="./">‹ Eğitim</a> <a class="chip" href="akademik.php">Akademik program</a>' . (is_file(CL_XLSX) ? ' <a class="chip" href="calisma.php?indir=1">Excel\'i indir</a>' : '') . ($gun ? ' <span class="muted">Son güncelleme: ' . e(tarih($gun)) . '</span>' : '') . '</p>
  ' . $yon . '
  <script type="application/json" id="cl-veri">' . str_replace('</', '<\/', $veri) . '</script>
  <script src="../assets/calisma.js" defer></script>');
