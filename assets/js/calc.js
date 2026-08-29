/**
 * محاسبات مالی سایت: تبدیل ارز و قیمت طلا بر اساس وزن.
 * توابع خالص (بدون DOM) هستند تا قابل تست باشند.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DG_calc = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function num(v) {
    if (v === null || v === undefined || v === "") return null;
    var n = Number(String(v).replace(/[,٬\s]/g, "").replace(/[۰-۹]/g, function (d) {
      return String("۰۱۲۳۴۵۶۷۸۹".indexOf(d));
    }));
    return isFinite(n) ? n : null;
  }

  function round(v, digits) {
    var f = Math.pow(10, digits === undefined ? 0 : digits);
    return Math.round((v + Number.EPSILON) * f) / f;
  }

  /**
   * تبدیل ارز به تومان.
   * @param {number} amount   مقدار ارز
   * @param {number} rate     نرخ هر واحد ارز به تومان
   * @param {number} [feePercent] کارمزد درصدی (اختیاری)
   * @returns {{total:number, fee:number, base:number}|null}
   */
  function currency(amount, rate, feePercent) {
    var a = num(amount);
    var r = num(rate);
    if (a === null || r === null || a <= 0 || r <= 0) return null;
    var feePct = num(feePercent);
    var base = a * r;
    var fee = feePct && feePct > 0 ? (base * feePct) / 100 : 0;
    return {
      base: round(base, 0),
      fee: round(fee, 0),
      total: round(base + fee, 0),
      rate: r,
    };
  }

  /**
   * قیمت طلا بر اساس وزن.
   * نرخ گرم طلا (۱۸ یا ۲۴ عیار) به تومان + وزن به گرم + اجرت/سود درصدی.
   * @returns {{total:number, material:number, wages:number}|null}
   */
  function gold(weightGram, ratePerGram, extraPercent) {
    var w = num(weightGram);
    var r = num(ratePerGram);
    if (w === null || r === null || w <= 0 || r <= 0) return null;
    var p = num(extraPercent) || 0;
    var material = w * r;
    var wages = (material * p) / 100;
    return {
      material: round(material, 0),
      wages: round(wages, 0),
      total: round(material + wages, 0),
      perGram: round(r, 0),
      extraPercent: p,
    };
  }

  /**
   * ارزش طلای یک قطعه بر اساس عیار.
   * وزن خالص طلا = وزن قطعه × (عیار / ۲۴)
   * سپس با نرخ طلای ۲۴ عیار ارزش‌گذاری می‌شود.
   */
  function karatValue(weightGram, karat, rate24PerGram) {
    var w = num(weightGram);
    var k = num(karat);
    var r = num(rate24PerGram);
    if (w === null || k === null || r === null || w <= 0 || k <= 0 || k > 24 || r <= 0) return null;
    var pure = w * (k / 24);
    return {
      pureGram: round(pure, 3),
      value: round(pure * r, 0),
    };
  }

  /**
   * اختلاف خرید و فروش (اسپرد) به درصد.
   */
  function spreadPercent(buy, sell) {
    var b = num(buy);
    var s = num(sell);
    if (b === null || s === null || b <= 0 || s <= 0) return null;
    return round((Math.abs(s - b) / ((s + b) / 2)) * 100, 2);
  }

  return { currency: currency, gold: gold, karatValue: karatValue, spreadPercent: spreadPercent, round: round };
});
