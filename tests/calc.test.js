"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const C = require("../assets/js/calc.js");

test("تبدیل ارز: مقدار × نرخ", () => {
  const r = C.currency(100, 201700);
  assert.equal(r.base, 20170000);
  assert.equal(r.fee, 0);
  assert.equal(r.total, 20170000);
});

test("تبدیل ارز با کارمزد درصدی", () => {
  const r = C.currency(1000, 200000, 1.5);
  assert.equal(r.base, 200000000);
  assert.equal(r.fee, 3000000);
  assert.equal(r.total, 203000000);
});

test("تبدیل ارز با ورودی فارسی و جداکنندهٔ هزارگان", () => {
  assert.equal(C.currency("۱۰۰", "۲۰۱٬۷۰۰").total, 20170000);
});

test("تبدیل ارز با ورودی نامعتبر null می‌دهد", () => {
  assert.equal(C.currency(0, 201700), null);
  assert.equal(C.currency(-5, 201700), null);
  assert.equal(C.currency(100, 0), null);
  assert.equal(C.currency("", 201700), null);
  assert.equal(C.currency(100, null), null);
  assert.equal(C.currency(null, 201700), null);
});

test("محاسبهٔ طلا بر اساس وزن و اجرت", () => {
  // ۴٫۶۰۸ گرم (یک مثقال) با نرخ ۲۲٬۳۵۸٬۸۰۰ و اجرت ۷٪
  const r = C.gold(4.608, 22358800, 7);
  assert.equal(r.material, 103029350);
  assert.equal(r.wages, 7212055);
  assert.equal(r.total, 110241405);
  assert.equal(r.perGram, 22358800);
});

test("محاسبهٔ طلا بدون اجرت", () => {
  const r = C.gold(1, 1000000);
  assert.equal(r.wages, 0);
  assert.equal(r.total, 1000000);
});

test("محاسبهٔ طلا با ورودی نامعتبر", () => {
  assert.equal(C.gold(0, 1000000), null);
  assert.equal(C.gold(5, -1), null);
  assert.equal(C.gold("abc", 1000000), null);
});

test("ارزش‌گذاری طلای دست‌دوم بر اساس عیار", () => {
  // ۱۰ گرم طلای ۱۸ عیار → ۷٫۵ گرم خالص
  const r = C.karatValue(10, 18, 29811700);
  assert.equal(r.pureGram, 7.5);
  assert.equal(r.value, 223587750);
});

test("عیار ۲۴ همان وزن خالص است", () => {
  const r = C.karatValue(2, 24, 1000000);
  assert.equal(r.pureGram, 2);
  assert.equal(r.value, 2000000);
});

test("عیار نامعتبر رد می‌شود", () => {
  assert.equal(C.karatValue(10, 25, 1000000), null);
  assert.equal(C.karatValue(10, 0, 1000000), null);
  assert.equal(C.karatValue(-1, 18, 1000000), null);
});

test("اسپرد خرید و فروش", () => {
  const pct = C.spreadPercent(199900, 201700);
  assert.ok(Math.abs(pct - 0.9) < 0.01, "اسپرد باید حدود ۰٫۹٪ باشد، شد: " + pct);
});

test("اسپرد با ورودی نامعتبر", () => {
  assert.equal(C.spreadPercent(0, 100), null);
  assert.equal(C.spreadPercent(100, 0), null);
  assert.equal(C.spreadPercent(null, 100), null);
});

test("گردکردن", () => {
  assert.equal(C.round(1.2345, 2), 1.23);
  assert.equal(C.round(1.5, 0), 2);
});
