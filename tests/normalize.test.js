"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const N = require("../assets/js/normalize.js");
const { PRO_RESPONSE, FREE_RESPONSE, RIAL_RESPONSE } = require("./fixtures.js");

test("پاسخ Pro (تو در تو) به درستی پیمایش می‌شود", () => {
  const snap = N.fromBrsApi(PRO_RESPONSE, { source: "BrsApi", sourceId: "brsapi" });

  const expected = [
    "XAUUSD", "IR_GOLD_18K", "IR_GOLD_24K", "IR_COIN_EMAMI", "IR_COIN_HALF",
    "USD", "EUR", "USDT_IRT", "BTC",
  ];
  assert.deepEqual(Object.keys(snap.items).sort(), expected.slice().sort());
  assert.equal(N.count(snap), expected.length);
  assert.equal(snap.source, "BrsApi");
  assert.equal(snap.asOf, 1787991600, "asOf باید تازه‌ترین time_unix باشد");

  const usd = N.get(snap, "USD");
  assert.equal(usd.name, "دلار آمریکا");
  assert.equal(usd.price, 201700);
  assert.equal(usd.changePercent, 0.9);
  assert.equal(usd.group, "currency");
  assert.equal(usd.badge, "USD");
  assert.equal(usd.unit, "تومان");

  assert.equal(N.get(snap, "IR_GOLD_18K").group, "gold");
  assert.equal(N.get(snap, "IR_COIN_EMAMI").group, "coin");
  assert.equal(N.get(snap, "XAUUSD").group, "gold");
  assert.equal(N.get(snap, "BTC").group, "crypto", "بیت‌کوین باید رمزارز باشد");
  assert.equal(N.get(snap, "USDT_IRT").group, "crypto", "تتر باید رمزارز باشد");
});

test("انس طلا با واحد دلار دست‌نخورده می‌ماند", () => {
  const snap = N.fromBrsApi(PRO_RESPONSE, {});
  const ounce = N.get(snap, "XAUUSD");
  assert.equal(ounce.price, 4640.97);
  assert.equal(ounce.unit, "دلار");
});

test("واحد ریال به تومان تبدیل می‌شود", () => {
  const snap = N.fromBrsApi(RIAL_RESPONSE, {});
  const usd = N.get(snap, "USD");
  assert.equal(usd.price, 201700, "۲٬۰۱۷٬۰۰۰ ریال = ۲۰۱٬۷۰۰ تومان");
  assert.equal(usd.unit, "تومان");
});

test("پاسخ نسخهٔ رایگان (آرایهٔ تخت) هم پشتیبانی می‌شود", () => {
  const snap = N.fromBrsApi(FREE_RESPONSE, { source: "رایگان" });
  assert.equal(N.count(snap), 2);
  assert.equal(N.get(snap, "USD").price, 201700);
  assert.equal(N.get(snap, "IR_GOLD_18K").group, "gold");
});

test("درصد تغییر در صورت نبودن، از مقدار تغییر محاسبه می‌شود", () => {
  const payload = {
    currency: {
      free: [
        { symbol: "USD", name: "دلار", price: 201700, change_value: 1800, time_unix: 1, unit: "تومان" },
      ],
    },
  };
  const snap = N.fromBrsApi(payload, {});
  const usd = N.get(snap, "USD");
  assert.ok(Math.abs(usd.changePercent - 0.9) < 0.01, "درصد باید حدود ۰٫۹ باشد، شد: " + usd.changePercent);
});

test("آیتم‌های بدون قیمت یا با قیمت صفر حذف می‌شوند", () => {
  const payload = {
    currency: {
      free: [
        { symbol: "USD", name: "دلار", price: 0, unit: "تومان" },
        { symbol: "EUR", name: "یورو", price: null, unit: "تومان" },
        { name: "بدون نماد", price: 100 },
        { symbol: "GBP", name: "پوند", price: "108,390", time_unix: 5, unit: "تومان" },
      ],
    },
  };
  const snap = N.fromBrsApi(payload, {});
  assert.equal(N.count(snap), 1, "فقط GBP باید بماند");
  assert.equal(N.get(snap, "GBP").price, 108390, "جداکنندهٔ هزارگان باید پاک شود");
});

test("نماد تکراری: تازه‌ترین نگه داشته می‌شود", () => {
  const payload = {
    currency: {
      free: [
        { symbol: "USD", name: "دلار قدیم", price: 100, time_unix: 10, unit: "تومان" },
        { symbol: "USD", name: "دلار تازه", price: 200, time_unix: 20, unit: "تومان" },
      ],
    },
  };
  const snap = N.fromBrsApi(payload, {});
  assert.equal(N.count(snap), 1);
  assert.equal(N.get(snap, "USD").name, "دلار تازه");
  assert.equal(snap.asOf, 20);
});

test("پاسخ خالی هیچ آیتمی نمی‌دهد", () => {
  assert.equal(N.count(N.fromBrsApi({}, {})), 0);
  assert.equal(N.count(N.fromBrsApi({ gold: [] }, {})), 0);
  assert.equal(N.count(null), 0);
});

test("byGroup با ترتیب دلخواه مرتب می‌کند", () => {
  const snap = N.fromBrsApi(PRO_RESPONSE, {});
  const coins = N.byGroup(snap, "coin", ["IR_COIN_HALF", "IR_COIN_EMAMI"]);
  assert.deepEqual(coins.map((c) => c.symbol), ["IR_COIN_HALF", "IR_COIN_EMAMI"]);

  const gold = N.byGroup(snap, "gold");
  assert.equal(gold.length, 3);
  assert.deepEqual(N.byGroup(snap, "other"), []);
});

test("نام فارسی از جدول داخلی گرفته می‌شود وقتی API نام نمی‌دهد", () => {
  const payload = { currency: { free: [{ symbol: "CHF", price: 250000, unit: "تومان", time_unix: 1 }] } };
  const snap = N.fromBrsApi(payload, {});
  assert.equal(N.get(snap, "CHF").name, "فرانک سوئیس");
});
