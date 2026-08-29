"use strict";

/**
 * تست یکپارچهٔ رابط کاربری.
 * index.html واقعی را با یک DOM حداقلی بارگذاری می‌کند و app.js واقعی را
 * روی آن اجرا می‌کند تا رندر جدول، وضعیت منبع داده و ماشین‌حساب‌ها آزموده شوند.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const { makeDocument } = require("./_dom.js");
const { makeLocalStorage, jsonResponse } = require("./_helpers.js");
const { PRO_RESPONSE } = require("./fixtures.js");

const ROOT = path.join(__dirname, "..");
const SCRIPTS = ["config.js", "format.js", "normalize.js", "calc.js", "spark.js", "api.js", "app.js"];

function setup({ page = "index.html", apiPayload = null, latest = null } = {}) {
  const html = fs.readFileSync(path.join(ROOT, page), "utf8");
  const storage = makeLocalStorage();
  const calls = [];

  const document = makeDocument(html, null);

  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    setInterval: () => 0,
    clearInterval: () => {},
    Promise,
    Intl,
    AbortController,
    Date,
    JSON,
    Object,
    Array,
    String,
    Number,
    Math,
    Set,
    Map,
    Proxy,
    Error,
    RegExp,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    IntersectionObserver: class {
      constructor(cb) {
        this.cb = cb;
      }
      observe(el) {
        this.cb([{ isIntersecting: true, target: el }], this);
      }
      unobserve() {}
    },
    navigator: { clipboard: { writeText: () => Promise.resolve() } },
    localStorage: storage,
    document,
    fetch: (url) => {
      const u = String(url).split("?")[0];
      calls.push(u);
      if (u.indexOf("api.brsapi.ir") !== -1) {
        if (!apiPayload) return Promise.reject(new TypeError("Failed to fetch"));
        return jsonResponse(apiPayload);
      }
      if (u === "data/latest.json") {
        if (latest) return jsonResponse(latest);
        return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
      }
      if (u === "data/prices.json") {
        return jsonResponse(JSON.parse(fs.readFileSync(path.join(ROOT, "data/prices.json"), "utf8")));
      }
      return Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve({}) });
    },
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;

  const context = vm.createContext(sandbox);
  document._root._owner = sandbox;
  for (const file of SCRIPTS) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, "assets", "js", file), "utf8"), context, { filename: file });
  }
  return { sandbox, document, calls, storage };
}

/** app.js را راه‌اندازی می‌کند و منتظر پایان رندر اول می‌ماند */
async function boot(opts) {
  const env = setup(opts);
  env.sandbox.DG_api.setApiKey("brsapi", "TESTKEY");
  const done = env.sandbox.DG_app.refresh(false);
  await done;
  return env;
}

test("بدون API: جدول از دیتای دستی پر می‌شود و منبع اعلام می‌شود", async () => {
  const { document, sandbox } = await boot({ apiPayload: null });
  const snapshot = JSON.parse(fs.readFileSync(path.join(ROOT, "data/prices.json"), "utf8"));

  // تب پیش‌فرض «ارز» است؛ همهٔ نمادها باید بین چهار تب تقسیم شوند
  const counts = {};
  let total = 0;
  for (const tab of ["currency", "gold", "coin", "crypto"]) {
    sandbox.DG_app.state.tab = tab;
    sandbox.DG_app.renderTable();
    counts[tab] = document.querySelectorAll("#prices-body tr").length;
    total += counts[tab];
  }
  // تتر هم در تب «ارز» و هم در تب «رمزارز» نمایش داده می‌شود، پس یک نماد دو بار شمرده می‌شود
  assert.deepEqual(counts, { currency: 4, gold: 4, coin: 5, crypto: 1 });
  assert.equal(total - 1, Object.keys(snapshot.items).length, "همهٔ نمادها باید دیده شوند");

  sandbox.DG_app.state.tab = "currency";
  sandbox.DG_app.renderTable();
  const rows = document.querySelectorAll("#prices-body tr");
  assert.equal(rows.length, 4);

  const tableText = document.querySelector("#prices-body").innerHTML;
  assert.match(tableText, /دلار آمریکا/);
  assert.match(tableText, /۲۰۱٬۷۰۰/, "قیمت دلار باید با ارقام فارسی رندر شود");
  assert.match(tableText, /<svg class="spark"/, "هر ردیف باید نمودار کوچک داشته باشد");

  sandbox.DG_app.state.tab = "gold";
  sandbox.DG_app.renderTable();
  const goldText = document.querySelector("#prices-body").innerHTML;
  assert.match(goldText, /انس جهانی طلا/);
  assert.match(goldText, /۴٬۶۴۰٫۹۷<small>دلار<\/small>/, "انس طلا باید با واحد دلار نمایش داده شود");
  sandbox.DG_app.state.tab = "currency";
  sandbox.DG_app.renderTable();

  const status = document.querySelector("#data-status").textContent;
  assert.match(status, /دیتای دستی/, "وضعیت: " + status);
  assert.match(status, /دقیقه پیش|ساعت پیش|روز پیش/, "زمان آخرین نرخ باید نوشته شود");

  const warning = document.querySelector("#source-warning");
  assert.ok(warning.classList.contains("show"), "هشدار «زنده نیست» باید نمایش داده شود");
  assert.match(warning.innerHTML, /CORS|کلید API|در دسترس نیست/);
});

test("با API زنده: منبع «اتصال زنده» می‌شود و هشدار پنهان است", async () => {
  const { document } = await boot({ apiPayload: PRO_RESPONSE });
  const rows = document.querySelectorAll("#prices-body tr");
  // تب پیش‌فرض «ارز» است: USD، تتر و یورو
  assert.equal(rows.length, 3, "تعداد ردیف‌های تب ارز");
  assert.match(document.querySelector("#prices-body").innerHTML, /دلار تتر/);

  const status = document.querySelector("#data-status").textContent;
  assert.match(status, /اتصال زنده/, "وضعیت: " + status);
  assert.match(status, /BrsApi/);

  const warning = document.querySelector("#source-warning");
  assert.ok(!warning.classList.contains("show"), "در حالت زنده هشداری نباید باشد");
});

test("تب‌ها و جست‌وجو جدول را فیلتر می‌کنند", async () => {
  const { document, sandbox } = await boot({ apiPayload: PRO_RESPONSE });

  const tabs = document.querySelectorAll(".tab");
  assert.equal(tabs.length, 4);
  const coinTab = tabs.filter((t) => t.getAttribute("data-tab") === "coin")[0];
  coinTab.dispatchEvent({ type: "click", target: coinTab });
  assert.equal(document.querySelectorAll("#prices-body tr").length, 2, "سکه امامی و نیم سکه");
  assert.match(document.querySelector("#prices-body").innerHTML, /سکه امامی/);
  assert.equal(coinTab.getAttribute("aria-selected"), "true");

  const goldTab = tabs.filter((t) => t.getAttribute("data-tab") === "gold")[0];
  goldTab.dispatchEvent({ type: "click", target: goldTab });
  assert.equal(document.querySelectorAll("#prices-body tr").length, 3, "انس، ۱۸ و ۲۴ عیار");

  const search = document.querySelector("#price-search");
  search.value = "18";
  search.dispatchEvent({ type: "input", target: search });
  const filtered = document.querySelectorAll("#prices-body tr");
  assert.equal(filtered.length, 1, "فقط طلای ۱۸ عیار");

  search.value = "چیزی‌که‌نیست";
  search.dispatchEvent({ type: "input", target: search });
  assert.match(document.querySelector("#prices-body").innerHTML, /پیدا نشد/);
});

test("تیکر و کارت هیرو پر می‌شوند", async () => {
  const { document } = await boot({ apiPayload: PRO_RESPONSE });
  const ticker = document.querySelector(".ticker-track").innerHTML;
  assert.match(ticker, /دلار آمریکا/);
  assert.match(ticker, /۲۰۱٬۷۰۰/);

  const hero = document.querySelector(".mini-list").innerHTML;
  assert.match(hero, /دلار آمریکا/);
  assert.match(hero, /طلای 18 عیار/);
  assert.match(hero, /سکه امامی/);

  const usdStat = document.querySelector("#stat-usd").textContent;
  const ounceStat = document.querySelector("#stat-ounce").textContent;
  assert.match(usdStat, /تومان/, "آمار دلار: " + usdStat);
  assert.match(usdStat, /۲۰۱/, "آمار دلار: " + usdStat);
  assert.match(ounceStat, /دلار/, "آمار انس: " + ounceStat);
});

test("ماشین‌حساب ارز با نرخ لحظه‌ای نتیجه می‌دهد", async () => {
  const { document } = await boot({ apiPayload: PRO_RESPONSE });

  const select = document.querySelector("#calc-currency");
  assert.ok(select.children.length >= 3, "لیست ارزها باید پر شود");
  select.value = "USD";

  const amount = document.querySelector("#calc-amount");
  amount.value = "100";
  amount.dispatchEvent({ type: "input", target: amount });

  const result = document.querySelector("#calc-currency-result").textContent;
  assert.match(result, /۲۰٬۱۷۰٬۰۰۰/, "۱۰۰ دلار = ۲۰٬۱۷۰٬۰۰۰ تومان — نتیجه: " + result);
});

test("ماشین‌حساب طلا وزن × نرخ + اجرت را حساب می‌کند", async () => {
  const { document } = await boot({ apiPayload: PRO_RESPONSE });

  const type = document.querySelector("#gold-type");
  type.value = "IR_GOLD_18K";
  const weight = document.querySelector("#gold-weight");
  weight.value = "1";
  const extra = document.querySelector("#gold-extra");
  extra.value = "10";
  extra.dispatchEvent({ type: "input", target: extra });

  const result = document.querySelector("#gold-result").textContent;
  // ۱ گرم × ۲۲٬۳۵۸٬۸۰۰ + ۱۰٪ = ۲۴٬۵۹۴٬۶۸۰
  assert.match(result, /۲۴٬۵۹۴٬۶۸۰/, "نتیجه: " + result);
});

test("دکمهٔ کپی، قیمت را در کلیپ‌بورد می‌گذارد", async () => {
  const { document, sandbox } = await boot({ apiPayload: PRO_RESPONSE });
  let copied = null;
  sandbox.navigator.clipboard.writeText = (t) => {
    copied = t;
    return Promise.resolve();
  };
  const btn = document.querySelector("#prices-body .copy-btn");
  assert.ok(btn, "دکمهٔ کپی باید وجود داشته باشد");
  btn.dispatchEvent({ type: "click", target: btn });
  await new Promise((r) => setTimeout(r, 0));
  assert.match(String(copied), /^201700/, "مقدار کپی‌شده: " + copied);
});

test("صفحهٔ تماس: فرم ناقص خطا و فرم کامل راهنمای ارسال می‌دهد", async () => {
  const { document } = await boot({ page: "contact.html", apiPayload: PRO_RESPONSE });
  const form = document.querySelector("#contact-form");
  assert.ok(form, "فرم تماس باید وجود داشته باشد");

  form.dispatchEvent({ type: "submit", target: form });
  const status = document.querySelector("#form-status");
  assert.ok(status.classList.contains("show"));
  assert.ok(status.classList.contains("err"), "فرم خالی باید خطا بدهد");

  form.querySelector('[name="name"]').value = "علی رضایی";
  form.querySelector('[name="message"]').value = "۱۰۰ دلار نیاز دارم";
  form.dispatchEvent({ type: "submit", target: form });
  assert.ok(status.classList.contains("ok"), "فرم کامل باید تأیید شود");
  assert.match(status.innerHTML, /mailto:/);
});
