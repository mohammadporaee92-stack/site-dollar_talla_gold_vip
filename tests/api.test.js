"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { loadBrowserEnv, jsonResponse } = require("./_helpers.js");
const { PRO_RESPONSE, FREE_RESPONSE } = require("./fixtures.js");

const REPO = path.join(__dirname, "..");

/**
 * محیط تست: منبع اول (BrsApi Pro) پاسخ نمونهٔ Pro را می‌دهد و
 * فایل‌های data/*.json از روی دیسک خوانده می‌شوند.
 */
function env(fetchImpl, config) {
  const e = loadBrowserEnv(["config.js", "normalize.js", "api.js"], {});
  // منبع اول سایت کلید می‌خواهد؛ کلید تستی می‌گذاریم تا مسیر «زنده» واقعی exercised شود.
  e.window.DG_api.setApiKey("brsapi", "TESTKEY");
  if (config) Object.assign(e.window.DG_CONFIG, config);
  const impl = fetchImpl || diskFetch({ "https://api.brsapi.ir": PRO_RESPONSE });
  e.window.fetch = impl;
  return e;
}

/** fetch ساختگی که مسیرهای data/*.json را از روی دیسک می‌خواند */
function diskFetch(map) {
  return (url) => {
    const raw = String(url);
    const clean = raw.split("?")[0];
    const hit = map && (Object.prototype.hasOwnProperty.call(map, clean)
      ? map[clean]
      : Object.keys(map).filter((k) => raw.indexOf(k) === 0).map((k) => map[k])[0]);
    if (hit !== undefined) {
      if (hit instanceof Error) return Promise.reject(hit);
      return jsonResponse(hit);
    }
    const file = path.join(REPO, clean);
    if (clean.startsWith("data/") && fs.existsSync(file)) {
      return jsonResponse(JSON.parse(fs.readFileSync(file, "utf8")));
    }
    return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
  };
}

test("منبع زنده: نتیجه با mode=live و کش‌شدن در localStorage", async () => {
  const e = env();
  const res = await e.window.DG_api.load({});

  assert.equal(res.mode, "live");
  assert.equal(res.sourceId, "brsapi");
  assert.equal(e.window.DG_normalize.count(res.snapshot), 9);
  assert.equal(e.window.DG_normalize.get(res.snapshot, "USD").price, 201700);
  assert.ok(e.window.DG_api.readCache(), "نتیجه باید در localStorage کش شود");
});

test("منبعی که کلید لازم دارد ولی کلید ندارد، رد می‌شود", async () => {
  const e = env();
  e.window.DG_CONFIG.sources = [
    { id: "needkey", label: "کلیددار", url: "https://example.test/api?key={KEY}", format: "brsapi", enabled: true },
  ];
  const res = await e.window.DG_api.load({});
  assert.notEqual(res.mode, "live", "منبع کلیددار نباید استفاده شود");
  const skipped = res.log.filter((l) => l.status === "skipped");
  assert.equal(skipped.length, 1, "لاگ: " + JSON.stringify(res.log));
  assert.equal(skipped[0].label, "کلیددار");
  assert.match(skipped[0].note, /کلید/);
  assert.ok(
    !e.calls.some((c) => String(c.url).indexOf("example.test") !== -1),
    "منبع کلیددار اصلاً نباید صدا زده شود"
  );
});

test("اگر منبع اول رد شد، منبع دوم استفاده می‌شود", async () => {
  const seen = [];
  const e = env((url) => {
    seen.push(String(url));
    if (String(url).indexOf("pro.example") !== -1) return Promise.reject(new TypeError("Failed to fetch"));
    return jsonResponse(FREE_RESPONSE);
  });
  e.window.DG_CONFIG.sources = [
    { id: "a", label: "اول", url: "https://pro.example/api", enabled: true },
    { id: "b", label: "دوم", url: "https://free.example/api", enabled: true },
  ];
  const res = await e.window.DG_api.load({});
  assert.equal(res.mode, "live");
  assert.equal(res.sourceId, "b");
  assert.equal(seen.length, 2, "هر دو منبع باید صدا زده شوند");
});

test("خطای CORS به عنوان «مرورگر اجازه نداد» ثبت می‌شود", async () => {
  const e = env((url) => {
    if (String(url).indexOf("api.") !== -1) return Promise.reject(new TypeError("Failed to fetch"));
    return diskFetch()(url);
  });
  const res = await e.window.DG_api.load({});
  assert.notEqual(res.mode, "live", "باید به دادهٔ محلی برگردد");
  const cors = res.log.filter((l) => /CORS/.test(l.note || ""));
  assert.ok(cors.length >= 1, "لاگ باید دلیل CORS داشته باشد: " + JSON.stringify(res.log));
});

test("پاسخ ۴۰۳ به «کلید معتبر نیست» ترجمه می‌شود", async () => {
  const e = env((url) => {
    if (String(url).indexOf("api.") !== -1) {
      return Promise.resolve({ ok: false, status: 403, json: () => Promise.resolve({}) });
    }
    return diskFetch()(url);
  });
  const res = await e.window.DG_api.load({});
  const bad = res.log.filter((l) => /کلید API معتبر نیست/.test(l.note || ""));
  assert.ok(bad.length >= 1, "لاگ: " + JSON.stringify(res.log));
});

test("وقتی منبع زنده نیست، data/prices.json خوانده می‌شود", async () => {
  const e = env((url) => {
    const u = String(url).split("?")[0];
    if (u.indexOf("data/latest.json") !== -1) {
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    }
    return diskFetch()(u);
  });
  const res = await e.window.DG_api.load({});
  assert.equal(res.mode, "manual");
  assert.equal(res.sourceId, "repo");
  assert.ok(e.window.DG_normalize.count(res.snapshot) >= 10, "اسنپ‌شات مخزن باید نماد داشته باشد");
});

test("data/latest.json بر prices.json اولویت دارد", async () => {
  const latest = {
    asOf: 1787991600,
    generatedAt: 1787992200,
    source: "کش خودکار",
    items: { USD: { symbol: "USD", name: "دلار", price: 210000, unit: "تومان", group: "currency" } },
  };
  const e = env(diskFetch({ "data/latest.json": latest }));
  const res = await e.window.DG_api.load({});
  assert.equal(res.mode, "auto");
  assert.equal(e.window.DG_normalize.get(res.snapshot, "USD").price, 210000);
  assert.equal(res.snapshot.source, "کش خودکار");
});

test("کش تازه بدون درخواست شبکه استفاده می‌شود", async () => {
  const e = env();
  await e.window.DG_api.load({});
  e.window.fetch = () => Promise.reject(new Error("نباید صدا زده شود"));
  const res = await e.window.DG_api.load({});
  assert.match(res.mode, /^cache/);
  assert.equal(e.window.DG_normalize.get(res.snapshot, "USD").price, 201700);
});

test("force کش را نادیده می‌گیرد", async () => {
  const e = env();
  await e.window.DG_api.load({});
  const res = await e.window.DG_api.load({ force: true });
  assert.equal(res.mode, "live", "با force باید دوباره از منبع بخواند");
});

test("کلید API در localStorage ذخیره و در آدرس جای‌گذاری می‌شود", async () => {
  const e = env();
  e.window.DG_api.setApiKey("brsapi", "KEY123");
  assert.equal(e.window.DG_api.getApiKey("brsapi"), "KEY123");
  const source = e.window.DG_CONFIG.sources[0];
  assert.match(e.window.DG_api.resolveUrl(source), /key=KEY123/);
  assert.ok(!/\{KEY\}/.test(e.window.DG_api.resolveUrl(source)), "جای‌نام {KEY} باید پر شود");

  const seen = [];
  e.window.fetch = (url) => {
    seen.push(String(url));
    return jsonResponse(PRO_RESPONSE);
  };
  await e.window.DG_api.load({ force: true });
  assert.match(seen[0], /key=KEY123/, "کلید باید در درخواست باشد");
});

test("تنظیمات کاربر ذخیره می‌شود", () => {
  const e = env(diskFetch());
  const before = e.window.DG_api.getSettings();
  assert.equal(before.autoRefresh, true);
  e.window.DG_api.setSettings({ autoRefresh: false });
  assert.equal(e.window.DG_api.getSettings().autoRefresh, false);
  assert.equal(e.window.DG_api.getSettings().showSource, true, "بقیهٔ کلیدها باید حفظ شوند");
});

test("اگر هیچ منبعی جواب ندهد، خطا با لاگ کامل پرتاب می‌شود", async () => {
  const e = env((url) => {
    if (String(url).split("?")[0].startsWith("data/")) {
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    }
    return Promise.reject(new TypeError("Failed to fetch"));
  });
  const err = await e.window.DG_api.load({}).then(() => null, (e2) => e2);
  assert.ok(err, "باید خطا پرتاب شود");
  assert.ok(Array.isArray(err.log) && err.log.length >= 3, "لاگ باید همهٔ تلاش‌ها را داشته باشد");
});

test("normalizeAny هم ساختار نرمال و هم پاسخ خام را می‌پذیرد", () => {
  const e = env(diskFetch());
  const fromRaw = e.window.DG_api.normalizeAny(PRO_RESPONSE);
  assert.equal(e.window.DG_normalize.count(fromRaw), 9);

  const preShaped = { asOf: 1, source: "x", items: { USD: { price: 100, unit: "تومان" } } };
  const fromShaped = e.window.DG_api.normalizeAny(preShaped);
  const usd = e.window.DG_normalize.get(fromShaped, "USD");
  assert.equal(usd.price, 100);
  assert.equal(usd.group, "currency", "group باید از نماد استنتاج شود");
  assert.equal(usd.name, "دلار آمریکا", "نام فارسی باید از جدول داخلی بیاید");
});
