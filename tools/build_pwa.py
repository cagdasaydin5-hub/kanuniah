"""Çevrimdışı çalışma ve arama için üretilen dosyalar: python tools/build_pwa.py (repo kökünden).

1. data/araclar.json – ana sayfa araması için araç dizini. assets/araclar.js ve sonradan
   eklenecek assets/arac-*.js dosyalarındaki araç tanımlarından (id, g, t, d, kw alanları)
   okunur; JS dosyalarına dokunulmaz.
2. sw.js – service worker. Önbelleğe alınacak dosya listesi (tüm .html sayfaları, data/*.json,
   assets/* altındaki her şey) ve bu dosyaların içeriğinden hesaplanan sürüm burada yazılır.
   Herhangi bir sayfa, veri ya da varlık değişince sürüm değişir; tarayıcı yeni service worker'ı
   kurar ve eski önbelleği siler.

Yayın akışı bu betiği her yüklemeden önce çalıştırır; yerelde veri düzenledikten sonra
çalıştırmak zorunlu değildir ama repo ile yayındaki sw.js aynı kalsın diye önerilir."""
import glob, hashlib, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

TOOL_FILES = ["assets/araclar.js"] + sorted(glob.glob("assets/arac-*.js"))
STR = r'"((?:[^"\\\n]|\\.)*)"|\'((?:[^\'\\\n]|\\.)*)\''
PAIR = re.compile(r"\b(id|g|t|d|kw)\s*:\s*(?:" + STR + ")")
SPLIT = re.compile(r"\bid\s*:\s*[\"']")
STOP = re.compile(r"\b(?:f\s*:\s*\[|calc\s*:|custom\s*:|src\s*:)")
GROUPS = re.compile(r"\bGROUPS\s*=\s*\[(.*?)\]\s*;", re.S)
GPAIR = re.compile(r"\[\s*(?:" + STR + r")\s*,\s*(?:" + STR + r")\s*\]")


def unjs(s):
    try:
        return json.loads('"' + s.replace('\\\'', "'") + '"')
    except ValueError:
        return s


def extract(src):
    """Araç nesnelerini bulur: 'id:' ile başlayıp ilk f:/calc:/custom:/src: alanına kadar olan
    parçadaki g ve t alanı olan her nesne bir araçtır (form alanlarında g/t yoktur)."""
    tools, starts = [], [m.start() for m in SPLIT.finditer(src)]
    for i, s in enumerate(starts):
        end = starts[i + 1] if i + 1 < len(starts) else len(src)
        seg = src[s:end]
        stop = STOP.search(seg)
        if stop:
            seg = seg[:stop.start()]
        kv = {}
        for m in PAIR.finditer(seg):
            kv.setdefault(m.group(1), unjs(m.group(2) if m.group(2) is not None else m.group(3)))
        if "g" in kv and "t" in kv:
            tools.append({k: kv.get(k, "") for k in ("id", "g", "t", "d", "kw")})
    groups = []
    m = GROUPS.search(src)
    if m:
        for p in GPAIR.finditer(m.group(1)):
            a = p.group(1) if p.group(1) is not None else p.group(2)
            b = p.group(3) if p.group(3) is not None else p.group(4)
            groups.append([unjs(a), unjs(b)])
    return tools, groups


def build_tools():
    tools, groups, seen = [], [], set()
    for f in TOOL_FILES:
        if not os.path.exists(f):
            continue
        t, g = extract(open(f, encoding="utf-8").read())
        for x in t:
            if x["id"] not in seen:
                seen.add(x["id"]); tools.append(x)
        for x in g:
            if x[0] not in [y[0] for y in groups]:
                groups.append(x)
    data = {"_not": "tools/build_pwa.py tarafından üretilir; elle düzenlemeyin.",
            "groups": groups, "tools": tools}
    with open("data/araclar.json", "w", encoding="utf-8", newline="\n") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")
    return len(tools)


def precache_list():
    files = sorted(glob.glob("*.html")) + ["manifest.webmanifest"]
    files += sorted(glob.glob("data/*.json"))
    files += sorted(p.replace(os.sep, "/") for p in glob.glob("assets/**/*", recursive=True) if os.path.isfile(p))
    return [f for f in files if os.path.exists(f)]


SW = """/* Trabzon Kanuni EAH Aile Hekimliği – service worker.
   Otomatik üretildi: tools/build_pwa.py. Elle düzenlemeyin; sürüm, dosyaların içeriğinden hesaplanır. */
"use strict";
var VERSION = "%(version)s";
var CACHE = "kanuniah-" + VERSION;
var RUNTIME = "kanuniah-runtime";
var PRECACHE = %(files)s;

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    /* HTTP önbelleğini atla: her sürüm sunucudaki güncel dosyaları alsın */
    return c.addAll(PRECACHE.map(function (u) { return new Request(u, { cache: "reload" }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) {
      return k.indexOf("kanuniah-") === 0 && k !== CACHE && k !== RUNTIME;
    }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function put(cacheName, req, res) {
  if (res && (res.ok || res.type === "opaque")) {
    var copy = res.clone();
    caches.open(cacheName).then(function (c) { c.put(req, copy); });
  }
  return res;
}

/* Sayfalar ve veri: önce ağ (güncel içerik), ağ yoksa önbellek */
function networkFirst(req, fallback) {
  return fetch(req).then(function (res) { return put(CACHE, req, res); }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || (fallback && caches.match(fallback));
    }).then(function (hit) { return hit || Response.error(); });
  });
}

/* Varlıklar (css, js, svg, png): önce önbellek; listede olmayan yeni bir dosya (ör. sonradan
   eklenen assets/arac-*.js) ilk açılışta ağdan alınıp önbelleğe eklenir */
function cacheFirst(req, cacheName) {
  return caches.match(req, { ignoreSearch: true }).then(function (hit) {
    return hit || fetch(req).then(function (res) { return put(cacheName, req, res); });
  });
}

/* Google Fonts: önbellekten hemen ver, arka planda tazele */
function staleWhileRevalidate(req) {
  return caches.open(RUNTIME).then(function (c) {
    return c.match(req).then(function (hit) {
      var net = fetch(req).then(function (res) { return put(RUNTIME, req, res); }).catch(function () { return hit; });
      return hit || net;
    });
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin === self.location.origin) {
    /* şifreli eğitim bölümü: hiçbir zaman önbelleğe alınmaz, doğrudan ağdan gelir */
    if (url.pathname.indexOf("/egitim/") === 0 || url.pathname === "/egitim") return;
    if (req.mode === "navigate") { e.respondWith(networkFirst(req, "index.html")); return; }
    var path = url.pathname.slice(self.registration.scope.length - self.location.origin.length);
    if (/^data\\/.*\\.json$/.test(path) || /\\.(html|webmanifest)$/.test(path)) { e.respondWith(networkFirst(req)); return; }
    if (path === "sw.js") return;
    e.respondWith(cacheFirst(req, CACHE));
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(staleWhileRevalidate(req));
  }
});
"""


def build_sw():
    files = precache_list()
    h = hashlib.sha256()
    for f in files:
        h.update(f.encode()); h.update(b"\0")
        h.update(open(f, "rb").read())
    version = h.hexdigest()[:12]
    body = SW % {"version": version, "files": json.dumps(["./"] + files, ensure_ascii=False, indent=2)}
    with open("sw.js", "w", encoding="utf-8", newline="\n") as f:
        f.write(body)
    return version, len(files)


if __name__ == "__main__":
    n = build_tools()
    v, k = build_sw()
    print("data/araclar.json: %d araç · sw.js sürüm %s, %d dosya önbelleğe alınacak" % (n, v, k))
