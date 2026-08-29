"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const S = require("../assets/js/spark.js");

test("synthSeries نقطهٔ آخر را روی قیمت فعلی می‌گذارد", () => {
  const series = S.synthSeries(201700, 0.9, 12, "USD");
  assert.equal(series.length, 12);
  assert.equal(series[series.length - 1], 201700);
  // نقطهٔ اول باید نزدیک قیمت روز قبل باشد (۲۰۱۷۰۰ ÷ ۱٫۰۰۹)
  assert.ok(Math.abs(series[0] - 199900) < 1, "نقطهٔ اول: " + series[0]);
});

test("synthSeries قطعی است (دو بار صدا زدن، یک نتیجه)", () => {
  const a = S.synthSeries(201700, 0.9, 12, "USD");
  const b = S.synthSeries(201700, 0.9, 12, "USD");
  assert.deepEqual(a, b);
  const c = S.synthSeries(201700, 0.9, 12, "EUR");
  assert.notDeepEqual(a, c, "نماد متفاوت باید شکل متفاوت بدهد");
});

test("build مسیر SVG می‌سازد و جهت را تشخیص می‌دهد", () => {
  const up = S.build([1, 2, 3, 4], { width: 84, height: 30 });
  assert.match(up.path, /^M[\d.]+ [\d.]+ L/);
  assert.equal(up.direction, "up");
  assert.equal(up.points.length, 4);

  const down = S.build([4, 3, 2, 1]);
  assert.equal(down.direction, "down");
});

test("build با دادهٔ کمتر از دو نقطه null می‌دهد", () => {
  assert.equal(S.build([1]), null);
  assert.equal(S.build([]), null);
  assert.equal(S.build(null), null);
});

test("svg خروجی آمادهٔ درج می‌دهد", () => {
  const item = { symbol: "USD", price: 201700, changePercent: 0.9 };
  const html = S.svg(item);
  assert.match(html, /^<svg class="spark"/);
  assert.match(html, /viewBox="0 0 84 30"/);
  assert.match(html, /stroke="#25c98a"/, "روند صعودی باید سبز باشد");
  assert.match(html, /aria-label="روند صعودی"/);
});

test("svg برای روند نزولی قرمز است", () => {
  const html = S.svg({ symbol: "EUR", price: 200000, changePercent: -1.2 });
  assert.match(html, /stroke="#ff5c6c"/);
});

test("اگر تاریخچهٔ واقعی باشد، از همان استفاده می‌شود", () => {
  const html = S.svg({ symbol: "XAU", price: 4640, changePercent: 0.7, history: [10, 20, 15, 30] });
  assert.match(html, /<svg/);
});
