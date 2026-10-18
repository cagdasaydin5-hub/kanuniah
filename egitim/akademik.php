<?php
// Akademik program: haftalık seminer, makale ve olgu sunumu takvimi (giriş gerekli).
//   akademik.php           → tablo (veri sayfaya gömülü)
//   akademik.php?indir=1   → yüklenen özgün Excel
//   POST is=yukle          → yönetici yeni Excel yükler; okunur, temizlenir, arsiv/.akademik.json'a yazılır
// Veri depoda değil, yalnızca sunucuda durur (egitim/arsiv/.akademik.json ve .akademik.xlsx).
require __DIR__ . '/ortak.php';
require __DIR__ . '/akademik-oku.php';
giris_sart();
arsiv_hazirla();

const AK_JSON = ARSIV . '/.akademik.json';
const AK_XLSX = ARSIV . '/.akademik.xlsx';

if (isset($_GET['indir'])) {
    if (!is_file(AK_XLSX)) { http_response_code(404); exit('Excel dosyası yok.'); }
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header("Content-Disposition: attachment; filename*=UTF-8''" . rawurlencode('Akademik Program.xlsx'));
    header('Content-Length: ' . filesize(AK_XLSX));
    header('Cache-Control: private, no-store');
    readfile(AK_XLSX);
    exit;
}

$mesaj = ''; $uyari = []; $ul = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && rol() === 'yonetici' && ($_POST['is'] ?? '') === 'yukle') {
    csrf_dogrula();
    $f = $_FILES['f'] ?? null;
    if (!$f || $f['error'] !== UPLOAD_ERR_OK) $mesaj = 'Dosya alınamadı.';
    elseif (uzanti($f['name']) !== 'xlsx') $mesaj = 'Yalnızca .xlsx dosyası yüklenebilir.';
    else {
        try {
            $d = akademik_oku($f['tmp_name']);
            $d['guncelleme'] = time();
            $d['kaynak'] = son_ad($f['name']);
            if (file_put_contents(AK_JSON, json_encode($d, JSON_UNESCAPED_UNICODE), LOCK_EX) === false || !move_uploaded_file($f['tmp_name'], AK_XLSX)) {
                $mesaj = 'Kaydedilemedi; sunucu yazma iznini kontrol edin.';
            } else {
                $mesaj = 'Program güncellendi: ' . count($d['haftalar']) . ' hafta.';
                $uyari = $d['uyari'];
            }
        } catch (Throwable $e) {
            $mesaj = 'Excel okunamadı: ' . $e->getMessage();
        }
    }
}

$veri = is_file(AK_JSON) ? file_get_contents(AK_JSON) : 'null';
$gun = is_file(AK_JSON) ? (json_decode($veri, true)['guncelleme'] ?? 0) : 0;
$yon = '';
if (rol() === 'yonetici') {
    $ul = $uyari ? '<ul>' . implode('', array_map(function ($u) { return '<li>' . e($u) . '</li>'; }, $uyari)) . '</ul><small>Gerekirse Excel\'de düzeltip yeniden yükleyin.</small>' : '';
    $yon = '<div class="yonetim-ust"><form method="post" enctype="multipart/form-data"><input type="hidden" name="t" value="' . csrf() . '">'
        . '<b>Programı güncelle</b><input type="file" name="f" accept=".xlsx" required><button class="chip" name="is" value="yukle">Yükle</button>'
        . '<small>Kliniğin akademik program Excel\'i (.xlsx). Yüklenen dosya mevcut programın yerine geçer; ad yazımları ve bilinen yazım hataları kendiliğinden düzeltilir.</small></form></div>';
}
$kutu = $mesaj ? '<div class="callout" role="status"><p>' . e($mesaj) . '</p>' . $ul . '</div>' : '';

sayfa('Akademik program', '
  <div class="page-head">
    <div class="eyebrow"><a href="./">Eğitim</a> › Akademik program</div>
    <h1 id="ak-baslik">Akademik program</h1>
    <p class="lede" id="ak-ust"></p>
  </div>' . $kutu . '
  <div id="ak-sira"></div>
  <div class="bar">
    <label class="search" for="q"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input id="q" type="search" placeholder="Konu ya da kişi: ör. diyabet, tiroid, Vatansever" autocomplete="off"></label>
    <div class="ak-filtre">
      <div class="chips" id="ak-donem" aria-label="Dönem"></div>
      <label class="ak-kisi">Kişi <select id="ak-kisi"><option value="">Herkes</option></select></label>
      <span class="count" id="count"></span>
    </div>
  </div>
  <div id="ak-gorev"></div>
  <div id="ak-tablo" class="ak-tablo"><p class="empty">' . ($veri === 'null' ? 'Program henüz yüklenmedi.' : 'Yükleniyor…') . '</p></div>
  <p class="ak-alt"><a class="chip" href="./">‹ Eğitim</a> <a class="chip" href="calisma.php">Çalışma listesi</a>' . (is_file(AK_XLSX) ? ' <a class="chip" href="akademik.php?indir=1">Excel\'i indir</a>' : '') . ($gun ? ' <span class="muted">Son güncelleme: ' . e(tarih($gun)) . '</span>' : '') . '</p>
  ' . $yon . '
  <script type="application/json" id="ak-veri">' . str_replace('</', '<\/', $veri) . '</script>
  <script src="../assets/akademik.js" defer></script>');
