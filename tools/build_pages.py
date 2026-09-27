"""Sayfa iskeletlerini üretir: python tools/build_pages.py (repo kökünden).
Ortak üst menü ve alt bilgi tek yerden değişsin diye HTML'ler buradan üretilir.
İçerik (rehberler, makaleler) data/*.json dosyalarındadır; bu betiği yalnızca sayfa yapısı değişince çalıştırın."""
import os, json, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
SITE = "https://kanuniah.tr"
ORG = "Kanuni Eğitim ve Araştırma Hastanesi Aile Hekimliği Kliniği"
TODAY = json.load(open("data/meta.json", encoding="utf-8"))["checked"]

NAV = [("home", "./", "Ana sayfa"), ("rehberler", "rehberler.html", "Rehberler"),
       ("makaleler", "makaleler.html", "Makaleler"), ("araclar", "araclar.html", "Araçlar"),
       ("hakkinda", "hakkinda.html", "Hakkımızda")]


def nav(page):
    out = []
    for p, h, t in NAV:
        cur = ' aria-current="page"' if p == page else ""
        out.append('      <a href="%s"%s>%s</a>' % (h, cur, t))
    return "\n".join(out)


def head(title, desc, path, page):
    return """<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{site}/{path}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Kanuni Aile Hekimliği">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:locale" content="tr_TR">
<meta name="theme-color" content="#0D5A51">
<link rel="icon" href="assets/emblem.svg" type="image/svg+xml">
<link rel="manifest" href="manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&family=Source+Sans+3:wght@400;600;700&family=JetBrains+Mono:wght@500&display=swap">
<link rel="stylesheet" href="assets/site.css">
</head>
<body data-page="{page}">
<a class="skip" href="#icerik">İçeriğe geç</a>
<header class="top">
  <div class="wrap">
    <a class="brand" href="./" aria-label="Ana sayfa">
      <img src="assets/emblem.svg" alt="" width="36" height="36">
      <span><b>Kanuni Aile Hekimliği</b><small>Kanuni EAH · Aile Hekimliği Kliniği</small></span>
    </a>
    <nav class="main" aria-label="Ana menü">
{nav}
    </nav>
  </div>
</header>
<main id="icerik">
""".format(title=title, desc=desc, site=SITE, path=path, page=page, nav=nav(page))


FOOT = """</main>
<footer class="site">
  <div class="wrap">
    <div><b>Kanuni Aile Hekimliği</b>{org} asistanları tarafından hazırlanır ve her hafta güncellenir.</div>
    <div><b>Önemli not</b>Buradaki özetler hızlı başvuru içindir; tanı ve tedavi kararı hekime aittir. Karar vermeden önce kaynağın kendisine bakın.</div>
    <div><b>Kaynak ilkesi</b>Yalnızca resmi kaynaklara bağlantı verilir; belgelerin kopyası barındırılmaz. Sitede hasta verisi bulunmaz.</div>
  </div>
</footer>
<script src="assets/site.js" defer></script>
{extra}</body>
</html>
""".format(org=ORG, extra="{extra}")

ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>'

JSONLD = """<script type="application/ld+json">
{"@context":"https://schema.org","@type":"WebSite","name":"Kanuni Aile Hekimliği","url":"%s/","inLanguage":"tr","description":"Aile hekimliği asistanları için güncel rehber, mevzuat ve makale kaynağı.","publisher":{"@type":"Organization","name":"%s","url":"%s/","logo":"%s/assets/emblem.svg"}}
</script>
""" % (SITE, ORG, SITE, SITE)

BAR_GUIDES = """  <div class="bar">
    <label class="search" for="q">%s<input id="q" type="search" placeholder="Bu sayfada ara" autocomplete="off"></label>
    <div class="chips" id="chips" role="group" aria-label="Kategori"></div>
    <div class="opts">
      <label><input type="checkbox" id="onlyNew"> Son 4 ayda çıkanlar</label>
      <label><input type="checkbox" id="showArch"> Arşivi göster</label>
      <span class="count" id="count"></span>
    </div>
  </div>
  <ul class="list" id="list"></ul>
""" % ICON

PAGES = {}

PAGES["index.html"] = head("Kanuni Aile Hekimliği",
    "Kanuni EAH Aile Hekimliği Kliniği'nin güncel rehber, mevzuat, makale ve araç kaynağı: aile hekimliği asistanları için.",
    "", "home") + """<div class="wrap">
  <section class="hero">
    <div class="eyebrow">Kanuni EAH · Aile Hekimliği Kliniği</div>
    <h1>Klinikte ihtiyaç duyulan her şey, tek yerde.</h1>
    <p class="lede">Güncel rehberler, mevzuat, haftanın önemli makaleleri ve klinik hesaplayıcılar. Her pazartesi kontrol edilir; son kontrol <b id="checked"></b>.</p>
    <label class="search" for="q">%s<input id="q" type="search" placeholder="Ne arıyorsunuz? ör. hipertansiyon, ESKOM, basınç yarası, PEG, aşı" autocomplete="off"></label>
    <div class="results" id="results" hidden></div>
    <div class="notice" id="notice" hidden></div>
  </section>

  <div class="grid">
    <a class="tile" href="rehberler.html"><span class="n" id="nGuides">–</span><b>Rehberler</b><span>Türk ve uluslararası klinik rehberler, özetleriyle</span></a>
    <a class="tile" href="makaleler.html"><span class="n" id="nPapers">–</span><b>Haftanın makaleleri</b><span>Birinci basamak için önem sırasıyla, Türkçe özet</span></a>
    <a class="tile" href="araclar.html"><span class="n">20</span><b>Araçlar</b><span>Böbrek, AF, pnömoni, bası yarası, yaşlı değerlendirme, aşı planlayıcı</span></a>
    <a class="tile" href="rehberler.html"><span class="n" id="nLaw">–</span><b>Mevzuat</b><span>Evde sağlık ve palyatif bakım düzenlemeleri</span></a>
  </div>

  <section class="block">
    <h2>Bu haftanın öne çıkan makaleleri</h2>
    <p class="sub">Önem puanına göre ilk üç. <a class="more" href="makaleler.html">Tüm liste →</a></p>
    <div id="topPapers"></div>
  </section>

  <section class="block">
    <h2>Son dört ayda güncellenen rehberler</h2>
    <p class="sub"><a class="more" href="rehberler.html">Tüm rehberler →</a></p>
    <ul class="list" id="freshGuides"></ul>
  </section>

  <section class="block">
    <h2>Güncelleme günlüğü</h2>
    <ol class="log" id="log"></ol>
  </section>
</div>
""" % ICON + JSONLD + FOOT

PAGES["rehberler.html"] = head("Rehberler · Kanuni Aile Hekimliği",
    "Aile hekimliği için güncel Türk ve uluslararası klinik rehberler ve mevzuat; kısa özetler ve resmi kaynak bağlantıları.",
    "rehberler.html", "rehberler") + """<div class="wrap">
  <div class="page-head">
    <div class="eyebrow">Rehberler ve mevzuat</div>
    <h1>Rehberler</h1>
    <p class="lede">Her kayıt resmi kaynağa bağlanır. Yeni sürüm çıktığında kayıt güncellenir, eski sürüm arşive alınır.</p>
  </div>
""" + BAR_GUIDES + "</div>\n" + FOOT

PAGES["makaleler.html"] = head("Haftanın Makaleleri · Kanuni Aile Hekimliği",
    "Birinci basamak için haftanın önemli makaleleri: Türkçe özet, kanıt düzeyi, pratiğe etkisi ve şeffaf önem puanı.",
    "makaleler.html", "makaleler") + """<div class="wrap">
  <div class="page-head">
    <div class="eyebrow">Literatür</div>
    <h1>Haftanın makaleleri</h1>
    <p class="lede">Çekirdek dergilerden (NEJM, Lancet, JAMA, BMJ, Annals of Family Medicine, BJGP, Annals of Internal Medicine) birinci basamağı ilgilendiren randomize çalışmalar ve sistematik derlemeler. Özetler bu sitenin kendi yorumudur; ayrıntı için makalenin kendisine bakın.</p>
  </div>
  <p class="method" id="method"><b>Önem puanı. </b></p>
  <div class="bar">
    <label class="search" for="q">%s<input id="q" type="search" placeholder="Makalelerde ara: ör. AF, gebelik, depresyon" autocomplete="off"></label>
    <div class="opts">
      <label><input type="checkbox" id="byScore" checked> Önem puanına göre sırala</label>
      <span class="count" id="count"></span>
    </div>
  </div>
  <div id="issues"></div>
</div>
""" % ICON + FOOT

PAGES["hakkinda.html"] = head("Hakkımızda · Kanuni Aile Hekimliği",
    "Kanuni EAH Aile Hekimliği Kliniği'nin bilgi portalı: amaç, içerik ilkeleri ve güncelleme yöntemi.",
    "hakkinda.html", "hakkinda") + """<div class="wrap">
  <div class="page-head">
    <div class="eyebrow">Hakkımızda</div>
    <h1>Bu site kimin, ne için?</h1>
  </div>
  <div class="prose">
    <p>Bu site, <b>%s</b> tarafından, kliniğin aile hekimliği asistanlarının ihtiyaç duyduğu güncel bilgiye tek yerden ve hızlıca ulaşabilmesi için hazırlanır. İlk olarak evde sağlık biriminin ihtiyaçlarıyla başladı; zamanla kliniğin tüm alanlarını kapsayacak şekilde genişliyor.</p>

    <h2>Neler var?</h2>
    <ul>
      <li><b>Rehberler ve mevzuat:</b> Türk ve uluslararası klinik rehberler; evde sağlık ve palyatif bakım mevzuatı.</li>
      <li><b>Haftanın makaleleri:</b> Birinci basamağı ilgilendiren önemli çalışmalar, Türkçe özet ve şeffaf bir önem puanıyla.</li>
      <li><b>Araçlar:</b> Böbrek fonksiyonu, risk skorları, yaşlı değerlendirme ölçekleri ve aşı planlayıcı gibi klinik hesaplayıcılar.</li>
    </ul>

    <h2>İçerik ilkeleri</h2>
    <ul>
      <li>Yalnızca resmi ve birincil kaynaklara bağlantı verilir; rehberlerin ve makalelerin kopyası barındırılmaz.</li>
      <li>Özetler kaynakların yerine geçmez; hızlı hatırlatma ve yönlendirme içindir.</li>
      <li>Her kayıtta yayın tarihi görünür; sürümü eskiyen kayıt arşive alınır, silinmez.</li>
      <li>Sitede hasta verisi yoktur ve olmayacaktır.</li>
    </ul>

    <h2>Nasıl güncelleniyor?</h2>
    <p>Kaynaklar her pazartesi sabahı taranır: Resmî Gazete ve Sağlık Bakanlığı duyuruları, Türk uzmanlık dernekleri ve uluslararası rehber kuruluşları, çekirdek tıp dergileri. Yeni bir sürüm ya da önemli bir çalışma bulunduğunda site güncellenir ve değişiklik ana sayfadaki günlüğe yazılır. İçerik klinik asistanlarınca gözden geçirilir.</p>

    <h2>Makalelerin önem puanı</h2>
    <p>Her makale dört ölçütle puanlanır: kanıtın gücü, hastanın hissettiği bir sonucu ölçüp ölçmediği, birinci basamağa uygunluğu ve pratiği değiştirme olasılığı. Puanın dökümü her makalenin altında açıkça gösterilir.</p>

    <h2>Sorumluluk</h2>
    <p>Bu sitedeki bilgiler hekim ve sağlık çalışanlarına yöneliktir; tanı ve tedavi kararı, hastayı değerlendiren hekime aittir. Hata ya da eksik fark ederseniz klinik asistanlarına bildirmeniz, sitenin doğruluğunu korumamıza yardım eder.</p>
  </div>
</div>
""" % ORG + FOOT

PAGES["404.html"] = head("Sayfa bulunamadı · Kanuni Aile Hekimliği", "Aradığınız sayfa bulunamadı.", "404.html", "none") + """<div class="wrap">
  <div class="page-head">
    <h1>Bu sayfa bulunamadı</h1>
    <p class="lede">Bağlantı değişmiş olabilir. <a href="./">Ana sayfaya dönün</a> ya da arama kutusunu kullanın.</p>
  </div>
</div>
""" + FOOT

PAGES["araclar.html"] = head("Araçlar · Kanuni Aile Hekimliği",
    "Aile hekimliği ve evde sağlık için klinik hesaplayıcılar: böbrek fonksiyonu, CHA2DS2-VA, HAS-BLED, Wells, CURB-65, FINDRISC, Braden, Barthel, GDS, PHQ-9 ve aşı planlayıcı.",
    "araclar.html", "araclar") + """<div class="wrap">
  <div class="page-head">
    <div class="eyebrow">Klinik araçlar</div>
    <h1>Araçlar</h1>
    <p class="lede">Poliklinikte, serviste ve evde sağlık ziyaretinde en sık gereken hesaplayıcılar. Her aracın altında kaynağı yazar. Hesaplar yalnızca bu cihazda yapılır; girilen değerler hiçbir yere gönderilmez ve kaydedilmez.</p>
  </div>
  <div class="bar">
    <label class="search" for="q">%s<input id="q" type="search" placeholder="Araç ara: ör. böbrek, AF, bası yarası, depresyon, aşı" autocomplete="off"></label>
    <div class="chips" id="chips" role="group" aria-label="Grup"></div>
    <div class="opts"><span class="count" id="count"></span></div>
  </div>
  <div class="tools" id="tools"></div>
  <p class="empty" id="empty" hidden>Bu aramayla eşleşen araç yok.</p>
  <p class="method">Bu araçlar karar desteği içindir; sonuç, hastanın klinik değerlendirmesinin yerine geçmez. İlaç dozu veren araçlar uzman kontrolünden sonra eklenecektir.</p>
</div>
""" % ICON + FOOT.replace("{extra}", '<script src="assets/araclar.js" defer></script>\n')

for name, html in PAGES.items():
    html = html.replace("{extra}", "")
    with open(name, "w", encoding="utf-8", newline="\n") as f:
        f.write(html)

urls = "".join("  <url><loc>%s/%s</loc><lastmod>%s</lastmod></url>\n" % (SITE, p, TODAY)
               for p in ["", "rehberler.html", "makaleler.html", "araclar.html", "hakkinda.html"])
with open("sitemap.xml", "w", encoding="utf-8", newline="\n") as f:
    f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % urls)
print("Sayfalar üretildi:", ", ".join(PAGES))
