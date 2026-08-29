"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const F = require("../assets/js/format.js");

test("money ارقام فارسی و جداکنندهٔ هزارگان می‌دهد", () => {
  assert.equal(F.money(201700), "۲۰۱٬۷۰۰");
  assert.equal(F.money(1000000), "۱٬۰۰۰٬۰۰۰");
  assert.equal(F.money(4640.97, { decimals: 2 }), "۴٬۶۴۰٫۹۷");
});

test("money با ورودی نامعتبر خط تیره می‌دهد", () => {
  assert.equal(F.money(null), "—");
  assert.equal(F.money(undefined), "—");
  assert.equal(F.money(""), "—");
  assert.equal(F.money("abc"), "—");
});

test("price واحد را اضافه می‌کند", () => {
  assert.equal(F.price(201700, "تومان"), "۲۰۱٬۷۰۰ تومان");
  assert.equal(F.price(4640.97, "دلار", { decimals: 2 }), "۴٬۶۴۰٫۹۷ دلار");
  assert.equal(F.price(null), "—");
});

test("compactToman اعداد بزرگ را کوتاه می‌کند", () => {
  assert.equal(F.compactToman(201700), "۲۰۱٫۷ هزار");
  assert.equal(F.compactToman(22358800), "۲۲٫۳۶ میلیون");
  assert.equal(F.compactToman(224040000), "۲۲۴٫۰۴ میلیون");
  assert.equal(F.compactToman(2000000000), "۲ میلیارد");
  assert.equal(F.compactToman("abc"), "—");
});

test("percent علامت و ارقام فارسی دارد", () => {
  assert.equal(F.percent(0.9), "+۰٫۹۰٪");
  assert.equal(F.percent(-1.53), "−۱٫۵۳٪");
  assert.equal(F.percent(0), "۰٫۰۰٪");
  assert.equal(F.percent(null), "—");
  assert.equal(F.percent(2.345, { decimals: 1 }), "+۲٫۳٪");
});

test("deltaClass جهت را درست تشخیص می‌دهد", () => {
  assert.equal(F.deltaClass(1), "up");
  assert.equal(F.deltaClass(-1), "down");
  assert.equal(F.deltaClass(0), "flat");
  assert.equal(F.deltaClass(null), "flat");
});

test("toFa و toEn رفت و برگشت دارند", () => {
  assert.equal(F.toFa("1234"), "۱۲۳۴");
  assert.equal(F.toEn("۱۲۳۴"), "1234");
  assert.equal(F.toEn(F.toFa("1234")), "1234");
});

test("clock ساعت را فارسی می‌کند", () => {
  const t = Math.floor(new Date("2026-08-29T08:15:00Z").getTime() / 1000);
  const out = F.clock(t);
  assert.match(out, /^[۰-۹]{1,2}:[۰-۹]{2}$/, "خروجی: " + out);
});

test("timeAgo فاصلهٔ زمانی را می‌گوید", () => {
  const now = 1787992200000;
  assert.equal(F.timeAgo(Math.floor((now - 30 * 1000) / 1000), now), "همین حالا");
  assert.equal(F.timeAgo(Math.floor((now - 5 * 60000) / 1000), now), "۵ دقیقه پیش");
  assert.equal(F.timeAgo(Math.floor((now - 3 * 3600000) / 1000), now), "۳ ساعت پیش");
  assert.equal(F.timeAgo(Math.floor((now - 2 * 86400000) / 1000), now), "۲ روز پیش");
  assert.equal(F.timeAgo(null), "نامشخص");
});

test("jalaliDate تاریخ شمسی می‌دهد", () => {
  const out = F.jalaliDate(new Date("2026-08-29T08:00:00Z"));
  assert.ok(out.length > 0, "تاریخ نباید خالی باشد");
  assert.ok(/[۰-۹]/.test(out), "باید ارقام فارسی داشته باشد: " + out);
  assert.ok(/1405|۱۴۰۵/.test(F.toFa(out)), "سال باید ۱۴۰۵ باشد: " + out);
});
