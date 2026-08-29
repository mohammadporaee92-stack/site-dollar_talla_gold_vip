/**
 * لایهٔ دریافت قیمت‌ها.
 *
 * استراتژی (آبشاری):
 *   ۱) کش مرورگر (اگر تازه‌تر از refreshMinutes باشد)
 *   ۲) منابع API زنده به ترتیب فهرست config.sources
 *   ۳) data/latest.json  (خروجی GitHub Actions)
 *   ۴) data/prices.json  (دیتای دستی داخل مخزن)
 *
 * در همهٔ حالت‌ها یک `log` برمی‌گردانیم تا در رابط کاربری نشان دهیم
 * داده از کجا آمده و چرا منبع بعدی رد شده است.
 */
(function () {
  "use strict";

  var CFG = window.DG_CONFIG || {};
  var N = window.DG_normalize;
  var CACHE_KEY = "dg_prices_cache_v1";
  var KEY_STORE = "dg_source_keys_v1";
  var KEY_SETTING = "dg_settings_v1";

  /* ------------------------------ تنظیمات ------------------------------ */
  function safeGet(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (e) {
      return null;
    }
  }
  function safeSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  /** کلید API ذخیره‌شده برای هر منبع (در localStorage) */
  function getApiKey(sourceId) {
    var all = safeGet(KEY_STORE) || {};
    return all[sourceId] || "";
  }
  function setApiKey(sourceId, key) {
    var all = safeGet(KEY_STORE) || {};
    if (key) all[sourceId] = String(key).trim();
    else delete all[sourceId];
    safeSet(KEY_STORE, all);
  }
  function allKeys() {
    return safeGet(KEY_STORE) || {};
  }
  function getSettings() {
    return safeGet(KEY_SETTING) || { showSource: true, autoRefresh: true };
  }
  function setSettings(patch) {
    var s = Object.assign(getSettings(), patch || {});
    safeSet(KEY_SETTING, s);
    return s;
  }

  /** آدرس نهایی یک منبع با جای‌گذاری {KEY} */
  function resolveUrl(source) {
    var key = getApiKey(source.id) || source.apiKey || "";
    return String(source.url).replace(/\{KEY\}/g, encodeURIComponent(key));
  }

  function hasKey(source) {
    return !/\{KEY\}/.test(source.url) || Boolean(getApiKey(source.id) || source.apiKey);
  }

  /* ------------------------------- شبکه ------------------------------- */
  function fetchWithTimeout(url, ms) {
    var timeout = ms || CFG.requestTimeoutMs || 9000;
    if (typeof AbortController === "function") {
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, timeout);
      return fetch(url, { signal: ctrl.signal, mode: "cors", cache: "no-store" }).finally(function () {
        clearTimeout(timer);
      });
    }
    return fetch(url, { mode: "cors", cache: "no-store" });
  }

  /**
   * تشخیص علت خطا: CORS / timeout / http.
   * دلیلش این است که در مرورگر، درخواست ردشده به خاطر CORS هم TypeError می‌دهد.
   */
  function classifyError(err) {
    var msg = String((err && err.message) || err || "");
    if (/abort/i.test(msg)) return "timeout";
    if (/failed to fetch|networkerror|load failed|cross-origin|blocked/i.test(msg)) return "cors";
    return "network";
  }

  function httpStatusMessage(status) {
    if (status === 401 || status === 403) return "کلید API معتبر نیست (" + status + ")";
    if (status === 429) return "محدودیت تعداد درخواست (" + status + ")";
    return "پاسخ سرور: " + status;
  }

  /* ------------------------------ کش ------------------------------ */
  function readCache() {
    return safeGet(CACHE_KEY);
  }
  function writeCache(snapshot, mode, sourceId) {
    safeSet(CACHE_KEY, {
      snapshot: snapshot,
      mode: mode,
      sourceId: sourceId || null,
      cachedAt: Math.floor(Date.now() / 1000),
    });
  }
  function clearCache() {
    try { localStorage.removeItem(CACHE_KEY); } catch (e) {}
  }
  function cacheIsFresh(cache) {
    if (!cache || !cache.cachedAt || !cache.snapshot) return false;
    var max = (CFG.refreshMinutes || 15) * 60;
    return Math.floor(Date.now() / 1000) - cache.cachedAt < max;
  }

  /* --------------------------- دریافت فایل‌ها --------------------------- */
  function loadJson(path) {
    // افزودن پارامتر نسخه تا کش مرورگر/CDN دادهٔ قدیمی ندهد
    var url = path + (path.indexOf("?") === -1 ? "?" : "&") + "v=" + (CFG.build || Date.now());
    return fetchWithTimeout(url, 8000).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    });
  }

  /* --------------------------- اجرای آبشار --------------------------- */
  /**
   * @param {{force?:boolean}} opts
   * @returns {Promise<{snapshot:object, mode:string, sourceId:string|null, source:string, log:Array}>}
   */
  /**
   * دریافت قیمت‌ها با استراتژی آبشاری.
   *
   * ترتیب تلاش: منابع زنده → data/latest.json → data/prices.json
   * اگر همه شکست بخورند، خطایی پرتاب می‌شود که `log` آن دلیل هر تلاش را دارد.
   *
   * @param {{force?:boolean}} opts
   * @returns {Promise<{snapshot:object, mode:string, sourceId:string|null, source:string, log:Array}>}
   */
  function load(opts) {
    opts = opts || {};
    return loadAsync(opts);
  }

  async function loadAsync(opts) {
    var log = [];

    function result(snapshot, mode, sourceId, sourceLabel) {
      if (!N.count(snapshot)) throw new Error("هیچ دادهٔ قیمتی پیدا نشد");
      if (mode === "live") writeCache(snapshot, mode, sourceId);
      return {
        snapshot: snapshot,
        mode: mode,
        sourceId: sourceId,
        source: sourceLabel,
        log: log,
      };
    }

    // ۱) کش تازهٔ مرورگر
    if (opts.force) {
      clearCache();
    } else {
      var cache = readCache();
      if (cacheIsFresh(cache)) {
        log.push({
          label: "کش مرورگر",
          status: "ok",
          note: "دادهٔ ذخیره‌شدهٔ کمتر از " + (CFG.refreshMinutes || 15) + " دقیقه",
        });
        return result(
          cache.snapshot,
          cache.mode === "live" ? "cache-live" : "cache",
          cache.sourceId,
          cache.snapshot.source
        );
      }
    }

    // ۲) منابع زنده، به ترتیب
    var sources = CFG.sources || [];
    for (var i = 0; i < sources.length; i++) {
      var source = sources[i];
      if (source.enabled === false) continue;
      var label = source.label || source.id;

      if (!hasKey(source)) {
        log.push({ label: label, status: "skipped", note: "کلید API وارد نشده" });
        continue;
      }

      try {
        var res = await fetchWithTimeout(resolveUrl(source));
        if (!res.ok) throw Object.assign(new Error(httpStatusMessage(res.status)), { http: res.status });
        var json = await res.json();
        if (json && json.successful === false) throw new Error(json.message_error || "منبع خطا برگرداند");

        var snapshot = N.fromBrsApi(json, { source: label, sourceId: source.id });
        if (!N.count(snapshot)) throw new Error("پاسخ خالی یا با ساختار ناشناخته");

        log.push({ label: label, status: "ok", note: N.count(snapshot) + " نماد" });
        return result(snapshot, "live", source.id, label);
      } catch (err) {
        log.push({ label: label, status: "error", note: explainError(err) });
      }
    }

    // ۳) کش خودکار مخزن (خروجی GitHub Actions)
    try {
      var latest = normalizeAny(await loadJson(CFG.paths.live));
      log.push({ label: CFG.paths.live, status: "ok", note: "کش خودکار مخزن" });
      return result(latest, "auto", "repo", latest.source || "کش خودکار");
    } catch (err) {
      log.push({ label: CFG.paths.live, status: "error", note: "در دسترس نیست" });
    }

    // ۴) دیتای دستی داخل مخزن
    try {
      var manual = normalizeAny(await loadJson(CFG.paths.snapshot));
      log.push({ label: CFG.paths.snapshot, status: "ok", note: "دیتای دستی داخل مخزن" });
      return result(manual, "manual", "repo", manual.source || "دیتای دستی");
    } catch (err) {
      log.push({ label: CFG.paths.snapshot, status: "error", note: "در دسترس نیست" });
    }

    var failure = new Error("هیچ منبع قیمتی در دسترس نیست");
    failure.log = log;
    throw failure;
  }

  /** توضیح فارسی برای خطای یک منبع */
  function explainError(err) {
    if (err && err.http) return err.message;
    var kind = classifyError(err);
    if (kind === "cors") return "مرورگر اجازهٔ دسترسی مستقیم نداد (CORS)";
    if (kind === "timeout") return "پاسخ به‌موقع نرسید (timeout)";
    return "خطای شبکه: " + ((err && err.message) || "نامشخص");
  }

  /**
   * اگر فایل JSON خودش ساختار نرمال داشت ({asOf, items}) همان را برمی‌گرداند،
   * در غیر این صورت آن را مثل پاسخ API نرمال می‌کند.
   */
  function normalizeAny(json) {
    if (json && json.items && typeof json.items === "object" && !Array.isArray(json.items)) {
      // اطمینان از وجود فیلدهای محاسبه‌شده مثل badge/group
      var items = {};
      Object.keys(json.items).forEach(function (k) {
        var it = json.items[k];
        items[k] = Object.assign({}, it, {
          symbol: it.symbol || k,
          badge: it.badge || N.BADGES[k] || k.slice(0, 5),
          group: it.group || N.groupOf(k),
          name: it.name || N.NAMES_FA[k] || k,
        });
      });
      return Object.assign({}, json, { items: items });
    }
    return N.fromBrsApi(json, { source: (json && json.source) || "فایل مخزن" });
  }

  window.DG_api = {
    load: load,
    normalizeAny: normalizeAny,
    getApiKey: getApiKey,
    setApiKey: setApiKey,
    allKeys: allKeys,
    getSettings: getSettings,
    setSettings: setSettings,
    clearCache: clearCache,
    cacheIsFresh: cacheIsFresh,
    readCache: readCache,
    resolveUrl: resolveUrl,
    classifyError: classifyError,
  };
})();
