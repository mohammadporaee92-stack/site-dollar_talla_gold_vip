"use strict";

/**
 * تست یکپارچگی سایت استاتیک:
 * اطمینان از اینکه همهٔ صفحه‌ها ساختار درست دارند، همهٔ ارجاع‌های محلی موجودند
 * و شناسه‌هایی که app.js به آن‌ها تکیه می‌کند در HTML وجود دارند.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { HTMLParser } = require("./_htmlparse.js");

const ROOT = path.join(__dirname, "..");
const PAGES = ["index.html", "prices.html", "calculator.html", "services.html", "faq.html", "contact.html"];

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), "utf8");
}

function localRefs(html) {
  const out = [];
  // فقط href و src واقعی؛ نه data-*-href
  const re = /(?:^|\s)(?:href|src)="([^"#?]+)(?:[#?][^"]*)?"/g;
  let m;
  while ((m = re.exec(html))) {
    const url = m[1].trim();
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(url)) continue;
    out.push(url);
  }
  return out;
}

test("همهٔ صفحه‌ها وجود دارند", () => {
  for (const page of PAGES) {
    assert.ok(fs.existsSync(path.join(ROOT, page)), page + " وجود ندارد");
  }
});

test("هر صفحه head کامل و ساختار RTL دارد", () => {
  for (const page of PAGES) {
    const html = read(page);
    assert.match(html, /^<!doctype html>/i, page + ": doctype");
    assert.match(html, /<html lang="fa" dir="rtl">/, page + ": lang/dir");
    assert.match(html, /<meta charset="utf-8" \/>/, page + ": charset");
    assert.match(html, /name="viewport"/, page + ": viewport");
    assert.match(html, /<title>[^<]{10,}<\/title>/, page + ": عنوان");
    assert.match(html, /name="description" content="[^"]{30,}"/, page + ": توضیحات");
    assert.match(html, /rel="canonical" href="\.\/[^"]+"/, page + ": canonical");
    assert.match(html, /property="og:title"/, page + ": og:title");
    assert.match(html, /class="skip-link"/, page + ": لینک پرش برای دسترسی‌پذیری");
    assert.match(html, /aria-current="page"/, page + ": مشخص‌بودن صفحهٔ فعال در منو");
  }
});

test("ترتیب اسکریپت‌ها درست است (config اول، app آخر)", () => {
  const order = ["config.js", "format.js", "normalize.js", "calc.js", "spark.js", "api.js", "app.js"];
  for (const page of PAGES) {
    const html = read(page);
    const found = [...html.matchAll(/<script src="assets\/js\/([^"]+)"><\/script>/g)].map((m) => m[1]);
    assert.deepEqual(found, order, page + ": ترتیب اسکریپت‌ها");
  }
});

test("همهٔ ارجاع‌های محلی به فایل موجود اشاره می‌کنند", () => {
  const missing = [];
  for (const page of PAGES) {
    for (const ref of localRefs(read(page))) {
      const target = path.join(ROOT, ref);
      if (!fs.existsSync(target)) missing.push(page + " → " + ref);
    }
  }
  assert.deepEqual(missing, [], "ارجاع‌های شکسته: " + missing.join(" | "));
});

test("idها در هر صفحه یکتا هستند", () => {
  for (const page of PAGES) {
    const parsed = new HTMLParser(read(page)).parse();
    const dupes = parsed.duplicateIds;
    assert.deepEqual(dupes, [], page + ": شناسهٔ تکراری " + dupes.join(", "));
  }
});

test("تگ‌ها balanced هستند", () => {
  for (const page of PAGES) {
    const parsed = new HTMLParser(read(page)).parse();
    assert.deepEqual(parsed.unclosed, [], page + ": تگ‌های بسته‌نشده " + parsed.unclosed.join(", "));
    assert.deepEqual(parsed.strayClose, [], page + ": تگ‌های بستهٔ اضافی " + parsed.strayClose.join(", "));
  }
});

test("شناسه‌های لازم برای app.js در صفحهٔ اصلی وجود دارند", () => {
  const parsed = new HTMLParser(read("index.html")).parse();
  const required = [
    "prices-body", "price-search", "data-status", "source-warning", "settings-modal",
    "calc-currency", "calc-amount", "calc-fee", "calc-currency-result", "calc-swap",
    "gold-type", "gold-weight", "gold-extra", "gold-result",
    "settings-save", "settings-test", "settings-close", "key-brsapi", "key-brsapi-free",
    "nav-links", "nav-toggle", "year",
  ];
  const missing = required.filter((id) => !parsed.ids.includes(id));
  assert.deepEqual(missing, [], "index.html — شناسه‌های غایب: " + missing.join(", "));
});

test("صفحهٔ تماس فرم و شناسه‌های لازم را دارد", () => {
  const parsed = new HTMLParser(read("contact.html")).parse();
  for (const id of ["contact-form", "form-status", "f-name", "f-phone", "f-message"]) {
    assert.ok(parsed.ids.includes(id), "contact.html — شناسهٔ " + id + " غایب است");
  }
  assert.match(read("contact.html"), /id="contact-form"/);
});

test("صفحهٔ ماشین حساب ابزارهای عیار و اسپرد را دارد", () => {
  const parsed = new HTMLParser(read("calculator.html")).parse();
  for (const id of ["karat-weight", "karat-value", "karat-result", "spread-buy", "spread-sell", "spread-result"]) {
    assert.ok(parsed.ids.includes(id), "شناسهٔ " + id + " در calculator.html نیست");
  }
});

test("هر صفحه دکمهٔ تنظیمات و به‌روزرسانی دارد", () => {
  for (const page of PAGES) {
    const html = read(page);
    assert.match(html, /data-open-settings/, page + ": دکمهٔ تنظیمات");
    assert.match(html, /js-refresh/, page + ": دکمهٔ به‌روزرسانی");
  }
});

test("data/prices.json ساختار معتبر دارد", () => {
  const snap = JSON.parse(read("data/prices.json"));
  assert.ok(snap.asOf > 1700000000, "asOf باید زمان یونیکس معتبر باشد");
  assert.ok(snap.source, "source باید پر باشد");
  const symbols = Object.keys(snap.items);
  assert.ok(symbols.length >= 10, "حداقل ۱۰ نماد لازم است، هست: " + symbols.length);
  for (const sym of ["USD", "EUR", "IR_GOLD_18K", "IR_GOLD_24K", "XAUUSD", "IR_COIN_EMAMI"]) {
    const it = snap.items[sym];
    assert.ok(it, "نماد " + sym + " باید در اسنپ‌شات باشد");
    assert.ok(it.price > 0, sym + ": قیمت باید مثبت باشد");
    assert.ok(["تومان", "دلار"].includes(it.unit), sym + ": واحد نامعتبر " + it.unit);
    assert.ok(typeof it.changePercent === "number", sym + ": درصد تغییر باید عدد باشد");
  }
});
