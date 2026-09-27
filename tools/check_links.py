"""data/rehberler.json'daki tüm bağlantıları denetler: python tools/check_links.py [--out rapor.md]

Sonuç üç gruba ayrılır:
  kırık          – 404/410 gibi kesin hata ya da alan adı çözülemiyor
  doğrulanamadı  – zaman aşımı, 401/403/429, 5xx, bağlantı ya da TLS hatası. Türk devlet
                   siteleri yurt dışı IP'leri (GitHub Actions) sık sık engellediği için
                   bunlar kırık sayılmaz, ayrı listelenir.
  sağlam         – 2xx/3xx
Kırık varsa çıkış kodu yine 0'dır; iş akışı sayıyı GITHUB_OUTPUT'a yazılan 'broken' değerinden okur.
Harici bağımlılık yoktur."""
import argparse, json, os, socket, ssl, sys, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/126.0 Safari/537.36 kanuniah-link-check")
TIMEOUT = 25
# Engelleme / hız sınırı / geçici sunucu sorunu: kırık sayılmaz.
UNVERIFIABLE_CODES = {401, 403, 407, 408, 425, 429, 451}


def collect():
    R = json.load(open(os.path.join(ROOT, "data", "rehberler.json"), encoding="utf-8"))
    urls = {}
    for g in R["guides"]:
        label = g["title"] + (" (arşiv)" if g.get("status") == "arsiv" else "")
        items = [(g["url"], "ana bağlantı")] + [(a["url"], a.get("label", "ek bağlantı")) for a in g.get("alt", [])]
        for u, what in items:
            urls.setdefault(u, []).append((g["id"], label, what))
    return urls


def fetch(url):
    """(durum, açıklama) döner; durum: ok | broken | unverifiable."""
    req = urllib.request.Request(url, headers={
        "User-Agent": UA, "Accept": "text/html,application/xhtml+xml,application/pdf,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            r.read(1024)
            return "ok", "HTTP %d" % r.status
    except urllib.error.HTTPError as e:
        if e.code in UNVERIFIABLE_CODES or e.code >= 500:
            return "unverifiable", "HTTP %d" % e.code
        return "broken", "HTTP %d" % e.code
    except urllib.error.URLError as e:
        reason = e.reason
        if isinstance(reason, socket.gaierror):
            return "broken", "alan adı çözülemedi"
        if isinstance(reason, (socket.timeout, TimeoutError)):
            return "unverifiable", "zaman aşımı"
        if isinstance(reason, ssl.SSLError):
            return "unverifiable", "TLS hatası: %s" % getattr(reason, "reason", reason)
        return "unverifiable", "bağlantı hatası: %s" % reason
    except (socket.timeout, TimeoutError):
        return "unverifiable", "zaman aşımı"
    except Exception as e:  # bağlantı sıfırlanması vb.
        return "unverifiable", "%s: %s" % (type(e).__name__, e)


def check(url):
    status, why = fetch(url)
    if status != "ok":  # geçici sorunları ayıklamak için bir kez daha dene
        time.sleep(3)
        status2, why2 = fetch(url)
        if status2 == "ok" or status2 == "broken":
            status, why = status2, why2
    return url, status, why


def report(urls, results):
    broken = [r for r in results if r[1] == "broken"]
    unver = [r for r in results if r[1] == "unverifiable"]

    def rows(items):
        out = []
        for url, _, why in sorted(items, key=lambda r: urls[r[0]][0][1]):
            for gid, title, what in urls[url]:
                out.append("- [ ] **%s** (`%s`, %s) – %s  \n  <%s>" % (title, gid, what, why, url))
        return "\n".join(out)

    md = ["<!-- kanuniah-link-check -->",
          "Gece bağlantı denetimi: **%d** bağlantı denendi, **%d** kırık, **%d** doğrulanamadı." % (len(results), len(broken), len(unver)),
          "", "## Kırık bağlantılar", "", rows(broken) or "Yok."]
    md += ["", "## Doğrulanamadı (kırık sayılmadı)", "",
           "Zaman aşımı, 401/403/429, 5xx ya da bağlantı/TLS hatası veren bağlantılar. Türk devlet siteleri "
           "yurt dışı IP'lerini engelleyebildiği için GitHub sunucusundan doğrulanamıyor olabilirler; "
           "gerekirse Türkiye'den elle kontrol edin.", "", rows(unver) or "Yok."]
    md += ["", "_Bu issue `.github/workflows/link-check.yml` tarafından her gece güncellenir; elle düzenlemeyin._"]
    return "\n".join(md) + "\n", len(broken), len(unver)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", help="Markdown raporun yazılacağı dosya")
    ap.add_argument("--limit", type=int, help="yalnızca ilk N bağlantı (deneme için)")
    a = ap.parse_args()
    urls = collect()
    todo = list(urls)[: a.limit] if a.limit else list(urls)
    with ThreadPoolExecutor(max_workers=8) as ex:
        results = list(ex.map(check, todo))
    for url, status, why in results:
        print("%-13s %-28s %s" % (status, why[:28], url))
    md, nb, nu = report(urls, results)
    if a.out:
        open(a.out, "w", encoding="utf-8").write(md)
    gh = os.environ.get("GITHUB_OUTPUT")
    if gh:
        with open(gh, "a") as f:
            f.write("broken=%d\nunverifiable=%d\n" % (nb, nu))
    print("\n%d bağlantı, %d kırık, %d doğrulanamadı." % (len(results), nb, nu))


if __name__ == "__main__":
    sys.exit(main())
